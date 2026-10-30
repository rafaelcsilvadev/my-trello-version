import { useApi } from '@/shared/api/api-context';
import { call } from '@/shared/api/api-error';

import type { Card, UpdateCardDto } from '../model/types';
import { boardViewKeys } from './keys';
import { type ItemVariables, useOptimisticBoardViewChange } from './mutations';

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
      const detail = fieldsPatch(body);
      const active = fieldsPatch(body);
      const archived = fieldsPatch(body);
      return [
        { key: boardViewKeys.card(boardId, id), ...detail },
        { key: boardViewKeys.cards(boardId, false), ...inList(id, active) },
        { key: boardViewKeys.cards(boardId, true), ...inList(id, archived) },
      ];
    },
  );
}

type CardPatch = {
  apply: (card: Card) => Card;
  revert: (card: Card) => Card;
};

// Sets the fields of `body` and remembers only their old values, so a failed
// update leaves the fields another pending update changed (FE-AD-010).
function fieldsPatch(body: UpdateCardDto): CardPatch {
  let previous: Partial<Card> | null = null;
  return {
    apply: (card) => {
      previous = Object.fromEntries(
        Object.keys(body).map((field) => [field, card[field as keyof Card]]),
      );
      return { ...card, ...body };
    },
    revert: (card) => (previous ? { ...card, ...previous } : card),
  };
}

function inList(id: string, patch: CardPatch) {
  return {
    apply: (cards: Card[]) =>
      cards.map((card) => (card.id === id ? patch.apply(card) : card)),
    revert: (cards: Card[]) =>
      cards.map((card) => (card.id === id ? patch.revert(card) : card)),
  };
}
