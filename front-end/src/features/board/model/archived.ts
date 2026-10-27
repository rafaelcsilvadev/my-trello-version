import type { ArchivedCardItem, ArchivedColumnItem, Card, List } from './types';

// Archived items always carry `archivedAt`; ISO strings compare in time order.
function newestFirst(
  a: { archivedAt: string | null },
  b: { archivedAt: string | null },
) {
  return (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '');
}

// `lists` holds both the active and the archived lists of the board.
export function toArchivedCards(
  cards: Card[],
  lists: List[],
): ArchivedCardItem[] {
  const titles = new Map(lists.map((list) => [list.id, list.title]));

  return [...cards]
    .sort(newestFirst)
    .map((card) => ({ card, fromTitle: titles.get(card.listId) ?? '' }));
}

export function toArchivedColumns(
  lists: List[],
  archivedCards: Card[],
  activeCounts: Map<string, number | undefined>,
): ArchivedColumnItem[] {
  return [...lists].sort(newestFirst).map((list) => {
    const active = activeCounts.get(list.id);
    const archived = archivedCards.filter(
      (card) => card.listId === list.id,
    ).length;

    return {
      list,
      cardCount: active === undefined ? undefined : active + archived,
    };
  });
}

export function deleteMessageKey(count: number): 'many' | 'one' | 'none' {
  if (count === 0) return 'none';
  return count === 1 ? 'one' : 'many';
}
