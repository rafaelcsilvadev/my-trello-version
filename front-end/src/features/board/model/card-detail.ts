import type { Board, Card, List } from './types';

export type CardDetailMode = 'editable' | 'archivedCard' | 'archivedBoard';

// An archived board wins over an archived card (FCD-41).
export function cardDetailMode(card: Card, board: Board): CardDetailMode {
  if (board.archivedAt !== null) return 'archivedBoard';
  return card.archivedAt === null ? 'editable' : 'archivedCard';
}

// `lists` holds both the active and the archived lists of the board; `undefined` means the card is not of this board.
export function findCardList(card: Card, lists: List[]): List | undefined {
  return lists.find((list) => list.id === card.listId);
}
