import type { ProgressDelta } from '../model/checklist';
import type { Card } from '../model/types';
import { boardViewKeys } from './keys';
import { type CacheChange, inList } from './mutations';

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
