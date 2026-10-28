import { byPosition } from './columns';
import type { Card, Column, List, MoveCardDto, MoveListDto } from './types';

export type CardSpot = { listId: string; index: number };
export type ColumnSpot = { index: number };
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
export type DropSlot = 'before' | 'after';

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

// The exact midpoint counts as `after`.
export function dropSlot(
  rect: { top: number; height: number },
  clientY: number,
): DropSlot {
  return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

export function columnDropSlot(
  rect: { left: number; width: number },
  clientX: number,
): DropSlot {
  return clientX < rect.left + rect.width / 2 ? 'before' : 'after';
}

// `otherIds` leaves out the moving item; an unknown or missing `hoveredId` means the end.
export function dropIndex(
  otherIds: string[],
  hoveredId: string | null,
  slot: DropSlot,
): number {
  const index = hoveredId === null ? -1 : otherIds.indexOf(hoveredId);
  if (index === -1) return otherIds.length;
  return slot === 'before' ? index : index + 1;
}

// `null` means nothing to send; `listId` only goes out when the card changes column.
export function cardMoveBody(
  origin: CardSpot,
  target: CardSpot,
): MoveCardDto | null {
  if (origin.listId !== target.listId) {
    return { listId: target.listId, position: target.index };
  }
  if (origin.index === target.index) return null;
  return { position: target.index };
}

export function columnMoveBody(
  origin: ColumnSpot,
  target: ColumnSpot,
): MoveListDto | null {
  if (origin.index === target.index) return null;
  return { position: target.index };
}

type Placeable = {
  id: string;
  position: number | null;
  archivedAt: string | null;
};

// Numbers each group 0..n-1 and swaps its items into `items`, keeping their order there.
function renumber<T extends Placeable>(items: T[], groups: T[][]): T[] {
  const placed = new Map(
    groups.flatMap((group) =>
      group.map((item, position) => [item.id, { ...item, position }] as const),
    ),
  );
  return items.map((item) => placed.get(item.id) ?? item);
}

// Archived cards keep their place; only the origin and target lists are renumbered.
export function placeCard(
  cards: Card[],
  id: string,
  listId: string,
  index: number,
): Card[] {
  const moving = cards.find(
    (card) => card.id === id && card.archivedAt === null,
  );
  if (!moving) return cards;

  const othersIn = (groupId: string) =>
    cards
      .filter(
        (card) =>
          card.listId === groupId && card.archivedAt === null && card.id !== id,
      )
      .sort(byPosition);
  const target = othersIn(listId);
  target.splice(index, 0, { ...moving, listId });

  const groups =
    listId === moving.listId ? [target] : [othersIn(moving.listId), target];
  return renumber(cards, groups);
}

export function placeList(lists: List[], id: string, index: number): List[] {
  const moving = lists.find(
    (list) => list.id === id && list.archivedAt === null,
  );
  if (!moving) return lists;

  const group = lists
    .filter((list) => list.archivedAt === null && list.id !== id)
    .sort(byPosition);
  group.splice(index, 0, moving);
  return renumber(lists, [group]);
}
