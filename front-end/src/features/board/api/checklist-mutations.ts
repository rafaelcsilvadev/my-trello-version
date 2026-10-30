import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { ProgressDelta } from '../model/checklist';
import type {
  Card,
  ChecklistItem,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
} from '../model/types';
import { appendThenInvalidate } from './create-mutations';
import { boardViewKeys } from './keys';
import {
  type CacheChange,
  fieldsPatch,
  inList,
  type ItemVariables,
  useOptimisticBoardViewChange,
} from './mutations';

// Not optimistic: the item has no id until the API answers (FCL-12).
export function useCreateChecklistItem(boardId: string, cardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<ChecklistItem, ApiError, CreateChecklistItemDto>({
    mutationFn: (body) =>
      call(
        api.POST('/api/v1/cards/{cardId}/checklist-items', {
          params: { path: { cardId } },
          body,
        }),
      ),
    onSuccess: (item) => {
      const added = () => ({ total: 1, done: 0 });
      for (const { key, apply } of progressChange(boardId, cardId, added)) {
        queryClient.setQueryData(key, (data: never) => data && apply(data));
      }
      return appendThenInvalidate(
        queryClient,
        boardViewKeys.checklist(boardId, cardId),
        item,
      );
    },
  });
}

export type UpdateChecklistItemVariables = ItemVariables & {
  body: UpdateChecklistItemDto;
};

export function useUpdateChecklistItem(boardId: string, cardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<UpdateChecklistItemVariables>(
    boardId,
    ({ id, body }) =>
      call(
        api.PATCH('/api/v1/checklist-items/{id}', {
          params: { path: { id } },
          body,
        }),
      ),
    ({ id, body }) => {
      const fields = fieldsPatch<ChecklistItem>(body);
      let wasDone: boolean | null = null;
      const item = {
        apply: (current: ChecklistItem) => {
          wasDone = current.done;
          return fields.apply(current);
        },
        revert: fields.revert,
      };
      // Read once the item applied, so a tick of an item already done counts
      // nothing (FCL-18).
      const ticked = () => ({
        total: 0,
        done:
          body.done === undefined || wasDone === null
            ? 0
            : Number(body.done) - Number(wasDone),
      });
      const changes: CacheChange[] = [
        { key: boardViewKeys.checklist(boardId, cardId), ...inList(id, item) },
      ];
      return body.done === undefined
        ? changes
        : [...changes, ...progressChange(boardId, cardId, ticked)];
    },
  );
}

// Keeps the tile badge in step with the items (FCL-39). Each cache adds the
// delta read when it applies and subtracts that same delta on revert, so
// overlapping changes never overwrite each other (FE-AD-010).
export function progressChange(
  boardId: string,
  cardId: string,
  delta: () => ProgressDelta,
): CacheChange[] {
  return [
    { key: boardViewKeys.card(boardId, cardId), ...progressPatch(delta) },
    {
      key: boardViewKeys.cards(boardId, false),
      ...inList(cardId, progressPatch(delta)),
    },
    {
      key: boardViewKeys.cards(boardId, true),
      ...inList(cardId, progressPatch(delta)),
    },
  ];
}

function progressPatch(delta: () => ProgressDelta) {
  let applied: ProgressDelta | null = null;
  return {
    apply: (card: Card) => {
      applied = delta();
      return shift(card, applied, 1);
    },
    revert: (card: Card) => (applied ? shift(card, applied, -1) : card),
  };
}

function shift(card: Card, delta: ProgressDelta, sign: 1 | -1): Card {
  return {
    ...card,
    checklist: {
      total: card.checklist.total + sign * delta.total,
      done: card.checklist.done + sign * delta.done,
    },
  };
}
