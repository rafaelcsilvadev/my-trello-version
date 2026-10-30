import { useApi } from '@/shared/api/api-context';
import { call } from '@/shared/api/api-error';

import { nextPosition } from '../model/card-detail';
import type { Card, UpdateCardDto } from '../model/types';
import { boardViewKeys } from './keys';
import {
  fieldsPatch,
  inList,
  type ItemVariables,
  removal,
  useOptimisticBoardViewChange,
} from './mutations';

export type UpdateCardVariables = ItemVariables & { body: UpdateCardDto };

export function useUpdateCard(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<UpdateCardVariables>(
    boardId,
    ({ id, body }) =>
      call(
        api.PATCH('/api/v1/cards/{id}', {
          params: { path: { id } },
          body,
        }),
      ),
    ({ id, body }) => {
      const detail = fieldsPatch<Card>(body);
      const active = fieldsPatch<Card>(body);
      const archived = fieldsPatch<Card>(body);
      return [
        { key: boardViewKeys.card(boardId, id), ...detail },
        { key: boardViewKeys.cards(boardId, false), ...inList(id, active) },
        { key: boardViewKeys.cards(boardId, true), ...inList(id, archived) },
      ];
    },
  );
}

export function useArchiveCard(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(
        api.POST('/api/v1/cards/{id}/archive', { params: { path: { id } } }),
      ),
    ({ id }) => {
      const archivedAt = new Date().toISOString();
      const active = removal<Card>((card) => card.id === id);
      return [
        {
          key: boardViewKeys.card(boardId, id),
          ...fieldsPatch<Card>({ archivedAt }),
        },
        { key: boardViewKeys.cards(boardId, false), ...active },
        {
          key: boardViewKeys.cards(boardId, true),
          apply: (cards: Card[]) => {
            const card = active.removed()[0];
            return card ? [{ ...card, archivedAt }, ...cards] : cards;
          },
          revert: (cards: Card[]) => cards.filter((card) => card.id !== id),
        },
      ];
    },
  );
}

export function useRestoreCard(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(
        api.POST('/api/v1/cards/{id}/unarchive', { params: { path: { id } } }),
      ),
    ({ id }) => {
      const archived = removal<Card>((card) => card.id === id);
      return [
        {
          key: boardViewKeys.card(boardId, id),
          ...fieldsPatch<Card>({ archivedAt: null }),
        },
        { key: boardViewKeys.cards(boardId, true), ...archived },
        {
          key: boardViewKeys.cards(boardId, false),
          apply: (cards: Card[]) => {
            const card = archived.removed()[0];
            return card
              ? [
                  ...cards,
                  {
                    ...card,
                    archivedAt: null,
                    position: nextPosition(cards, card.listId),
                  },
                ]
              : cards;
          },
          revert: (cards: Card[]) => cards.filter((card) => card.id !== id),
        },
      ];
    },
  );
}

export function useDeleteCard(boardId: string) {
  const api = useApi();

  return useOptimisticBoardViewChange<ItemVariables>(
    boardId,
    ({ id }) =>
      call(api.DELETE('/api/v1/cards/{id}', { params: { path: { id } } })),
    ({ id }) => [
      {
        key: boardViewKeys.cards(boardId, true),
        ...removal<Card>((card) => card.id === id),
      },
    ],
  );
}
