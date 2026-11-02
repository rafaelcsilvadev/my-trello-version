import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import {
  type ItemMove,
  placeItem,
  type ProgressDelta,
  replayItemMoves,
  sortItems,
} from '../model/checklist';
import type {
  Card,
  ChecklistItem,
  CreateChecklistItemDto,
  MoveChecklistItemDto,
  UpdateChecklistItemDto,
} from '../model/types';
import { appendThenInvalidate } from './create-mutations';
import { boardViewKeys } from './keys';
import {
  BOARD_VIEW_CHANGE_KEY,
  type CacheChange,
  fieldsPatch,
  inList,
  type ItemVariables,
  removal,
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

export function useDeleteChecklistItem(boardId: string, cardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(
        api.DELETE('/api/v1/checklist-items/{id}', {
          params: { path: { id } },
        }),
      ),
    ({ id }) => {
      const items = removal<ChecklistItem>((item) => item.id === id);
      // Read once the item left the cache, so an item already gone counts
      // nothing.
      const removed = () => {
        const [item] = items.removed();
        return item
          ? { total: -1, done: -Number(item.done) }
          : { total: 0, done: 0 };
      };
      return [
        { key: boardViewKeys.checklist(boardId, cardId), ...items },
        ...progressChange(boardId, cardId, removed),
      ];
    },
  );
}

export type MoveChecklistItemVariables = ItemVariables & {
  body: MoveChecklistItemDto;
};

// One logged move: where it puts the item, and the order it started from.
type LoggedMove = ItemMove & { base: string[] };

// Only the checklist cache changes: a move leaves `card.checklist` alone.
export function useMoveChecklistItem(boardId: string, cardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  // Moves applied since no board change was pending, oldest first (FCLD-21).
  const log = useRef<LoggedMove[]>([]);

  return useOptimisticBoardViewChange<MoveChecklistItemVariables>(
    boardId,
    ({ id, body }) =>
      call(
        api.POST('/api/v1/checklist-items/{id}/move', {
          params: { path: { id } },
          body,
        }),
      ),
    ({ id, body }) => {
      // This move already counts as pending, so 1 means no other change is.
      if (queryClient.isMutating({ mutationKey: BOARD_VIEW_CHANGE_KEY }) <= 1) {
        log.current = [];
      }
      const entry: LoggedMove = { id, position: body.position, base: [] };
      return [
        {
          key: boardViewKeys.checklist(boardId, cardId),
          apply: (items: ChecklistItem[]) => {
            entry.base = sortItems(items).map((item) => item.id);
            log.current.push(entry);
            return placeItem(items, id, body.position);
          },
          // Replays the later moves on the order before this one, so they stay
          // where the user dropped them (FCLD-21).
          revert: (items: ChecklistItem[]) => {
            const index = log.current.indexOf(entry);
            if (index < 0) return items;
            const later = log.current.slice(index + 1);
            log.current.splice(index, 1);
            return replayItemMoves(items, entry.base, later);
          },
        },
      ];
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
