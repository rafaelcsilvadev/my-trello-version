import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import { withLabelId, withoutLabelId } from '../model/labels';
import type {
  Card,
  CreateLabelDto,
  Label,
  UpdateLabelDto,
} from '../model/types';
import { appendThenInvalidate } from './create-mutations';
import { boardViewKeys } from './keys';
import {
  fieldsPatch,
  inList,
  type ItemVariables,
  removal,
  useOptimisticBoardViewChange,
} from './mutations';

// `id` is the label, so only its row shows as pending, not the whole card
// (FCLB-17); `applied` is the state to reach.
export type ToggleCardLabelVariables = ItemVariables & {
  cardId: string;
  applied: boolean;
};

export function useToggleCardLabel(boardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useOptimisticBoardViewChange<ToggleCardLabelVariables>(
    boardId,
    ({ id, cardId, applied }) => {
      const params = { params: { path: { id: cardId, labelId: id } } };
      return call(
        applied
          ? api.PUT('/api/v1/cards/{id}/labels/{labelId}', params)
          : api.DELETE('/api/v1/cards/{id}/labels/{labelId}', params),
      );
    },
    ({ id, cardId, applied }) => {
      // Read when the patch applies, so a label created meanwhile is ranked.
      const labels = () =>
        queryClient.getQueryData<Label[]>(boardViewKeys.labels(boardId)) ?? [];
      const toggle = (ids: string[]) =>
        applied ? withLabelId(ids, id, labels()) : withoutLabelId(ids, id);
      const untoggle = (ids: string[]) =>
        applied ? withoutLabelId(ids, id) : withLabelId(ids, id, labels());
      return [
        {
          key: boardViewKeys.card(boardId, cardId),
          ...labelIdsPatch(id, applied, toggle, untoggle),
        },
        {
          key: boardViewKeys.cards(boardId, false),
          ...inList(cardId, labelIdsPatch(id, applied, toggle, untoggle)),
        },
      ];
    },
  );
}

// Not optimistic: the label has no id until the API answers (FCLB-13).
export function useCreateLabel(boardId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Label, ApiError, CreateLabelDto>({
    mutationFn: (body) =>
      call(
        api.POST('/api/v1/boards/{boardId}/labels', {
          params: { path: { boardId } },
          body,
        }),
      ),
    onSuccess: (label) =>
      appendThenInvalidate(queryClient, boardViewKeys.labels(boardId), label),
  });
}

export type UpdateLabelVariables = ItemVariables & { body: UpdateLabelDto };

// `id` is the label, so only its row shows as pending (FLP-22).
export function useUpdateLabel(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<UpdateLabelVariables>(
    boardId,
    ({ id, body }) =>
      call(
        api.PATCH('/api/v1/labels/{id}', {
          params: { path: { id } },
          body,
        }),
      ),
    ({ id, body }) => [
      {
        key: boardViewKeys.labels(boardId),
        ...inList(id, fieldsPatch<Label>(body)),
      },
    ],
  );
}

// Drops the label from the list and its id from every card of both card
// lists (FLP-24, FLP-25). Each card remembers whether it had the id, so a
// failed delete restores only those and keeps labels added meanwhile.
export function useDeleteLabel(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(api.DELETE('/api/v1/labels/{id}', { params: { path: { id } } })),
    ({ id }) => [
      {
        key: boardViewKeys.labels(boardId),
        ...removal<Label>((label) => label.id === id),
      },
      ...[false, true].map((archived) => ({
        key: boardViewKeys.cards(boardId, archived),
        ...cardsWithoutLabel(id),
      })),
    ],
  );
}

function cardsWithoutLabel(id: string) {
  const indexes = new Map<string, number>();
  return {
    apply: (cards: Card[]) =>
      cards.map((card) => {
        const index = card.labelIds.indexOf(id);
        if (index === -1) return card;
        indexes.set(card.id, index);
        return { ...card, labelIds: withoutLabelId(card.labelIds, id) };
      }),
    revert: (cards: Card[]) =>
      cards.map((card) => {
        const index = indexes.get(card.id);
        if (index === undefined || card.labelIds.includes(id)) return card;
        return { ...card, labelIds: card.labelIds.toSpliced(index, 0, id) };
      }),
  };
}

// Remembers whether the id actually changed, so a failed toggle of a label
// already in that state leaves it alone (FE-AD-010).
function labelIdsPatch(
  id: string,
  applied: boolean,
  toggle: (ids: string[]) => string[],
  untoggle: (ids: string[]) => string[],
) {
  let changed = false;
  return {
    apply: (card: Card) => {
      changed = card.labelIds.includes(id) !== applied;
      return { ...card, labelIds: toggle(card.labelIds) };
    },
    revert: (card: Card) =>
      changed ? { ...card, labelIds: untoggle(card.labelIds) } : card,
  };
}
