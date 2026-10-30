import type { Board, Card, List } from './types';

export type CardDetailMode = 'editable' | 'archivedCard' | 'archivedBoard';

// `null` shows the saved value.
export type Drafts = { title: string | null; description: string | null };

const MAX_DESCRIPTION_LENGTH = 5000;

// An archived board wins over an archived card (FCD-41).
export function cardDetailMode(card: Card, board: Board): CardDetailMode {
  if (board.archivedAt !== null) return 'archivedBoard';
  return card.archivedAt === null ? 'editable' : 'archivedCard';
}

// `lists` holds both the active and the archived lists of the board; `undefined` means the card is not of this board.
export function findCardList(card: Card, lists: List[]): List | undefined {
  return lists.find((list) => list.id === card.listId);
}

export function isDescriptionTooLong(draft: string): boolean {
  return draft.length > MAX_DESCRIPTION_LENGTH;
}

// Only an empty draft clears the description; any other draft is sent untrimmed (FCD-26).
export function descriptionBody(draft: string): string | null {
  return draft === '' ? null : draft;
}

export function isDirty(card: Card, drafts: Drafts): boolean {
  const titleChanged =
    drafts.title !== null && drafts.title.trim() !== card.title;
  const descriptionChanged =
    drafts.description !== null &&
    drafts.description !== (card.description ?? '');
  return titleChanged || descriptionChanged;
}

// The end of the column's active cards, where a restored card lands (FCD-36).
export function nextPosition(cards: Card[], listId: string): number {
  const positions = cards
    .filter((card) => card.listId === listId && card.archivedAt === null)
    .map((card) => card.position ?? 0);
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}
