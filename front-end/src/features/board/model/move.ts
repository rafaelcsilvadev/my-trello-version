import type { Column } from './types';

export type CardSpot = { listId: string; index: number };
export type ColumnSpot = { index: number };
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export function cardSpot(columns: Column[], cardId: string): CardSpot | null {
  for (const column of columns) {
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index !== -1) return { listId: column.list.id, index };
  }
  return null;
}

// The last index a card can take in a column: the number of other cards there.
function lastIndex(column: Column, cardId: string) {
  return column.cards.filter((card) => card.id !== cardId).length;
}

// `at` may already sit outside the card's own column while a keyboard session runs.
export function stepCard(
  columns: Column[],
  cardId: string,
  at: CardSpot,
  key: ArrowKey,
): CardSpot {
  const columnIndex = columns.findIndex(
    (column) => column.list.id === at.listId,
  );
  if (columnIndex === -1) return at;

  if (key === 'ArrowUp') return { ...at, index: Math.max(0, at.index - 1) };
  if (key === 'ArrowDown') {
    const last = lastIndex(columns[columnIndex], cardId);
    return { ...at, index: Math.min(last, at.index + 1) };
  }

  const target = columns[columnIndex + (key === 'ArrowLeft' ? -1 : 1)];
  if (!target) return at;
  return {
    listId: target.list.id,
    index: Math.min(at.index, lastIndex(target, cardId)),
  };
}

export function stepColumn(
  count: number,
  at: ColumnSpot,
  key: 'ArrowLeft' | 'ArrowRight',
): ColumnSpot {
  if (key === 'ArrowLeft') return { index: Math.max(0, at.index - 1) };
  return { index: Math.min(count - 1, at.index + 1) };
}
