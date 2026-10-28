import type { Card, Column, List } from './types';

// The API nulls `position` only on archived items; any that slip through go last.
export function byPosition(
  a: { position: number | null },
  b: { position: number | null },
) {
  return (a.position ?? Infinity) - (b.position ?? Infinity) || 0;
}

export function toColumns(lists: List[], cards: Card[]): Column[] {
  const cardsByList = new Map<string, Card[]>();
  for (const card of [...cards].sort(byPosition)) {
    const group = cardsByList.get(card.listId) ?? [];
    group.push(card);
    cardsByList.set(card.listId, group);
  }

  return [...lists]
    .sort(byPosition)
    .map((list) => ({ list, cards: cardsByList.get(list.id) ?? [] }));
}
