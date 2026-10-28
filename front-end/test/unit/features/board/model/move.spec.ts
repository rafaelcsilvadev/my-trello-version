import { describe, expect, it } from 'vitest';

import {
  cardSpot,
  columnDropSlot,
  dropIndex,
  dropSlot,
  stepCard,
  stepColumn,
} from '@/features/board/model/move';
import type { Card, Column, List } from '@/features/board/model/types';

function list(id: string, position: number): List {
  return {
    id,
    boardId: 'board-1',
    title: `List ${id}`,
    position,
    archivedAt: null,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  };
}

function card(id: string, listId: string, position: number): Card {
  return {
    id,
    listId,
    title: `Card ${id}`,
    description: null,
    dueDate: null,
    done: false,
    position,
    archivedAt: null,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    labelIds: [],
    checklist: { done: 0, total: 0 },
  };
}

// One column per entry; each entry lists the card ids in order.
function board(layout: Record<string, string[]>): Column[] {
  return Object.entries(layout).map(([listId, cardIds], listIndex) => ({
    list: list(listId, listIndex),
    cards: cardIds.map((cardId, index) => card(cardId, listId, index)),
  }));
}

describe('cardSpot', () => {
  const columns = board({ todo: ['t1', 't2'], doing: ['d1'] });

  it('finds the column and index of a card', () => {
    expect(cardSpot(columns, 't2')).toEqual({ listId: 'todo', index: 1 });
    expect(cardSpot(columns, 'd1')).toEqual({ listId: 'doing', index: 0 });
  });

  it('returns null for a card that is not on the board', () => {
    expect(cardSpot(columns, 'unknown')).toBeNull();
  });
});

describe('stepCard', () => {
  const columns = board({
    todo: ['t1', 't2', 't3'],
    doing: ['d1'],
    done: [],
  });

  it('moves one position up and down within the column', () => {
    const at = { listId: 'todo', index: 1 };

    expect(stepCard(columns, 't2', at, 'ArrowUp')).toEqual({
      listId: 'todo',
      index: 0,
    });
    expect(stepCard(columns, 't2', at, 'ArrowDown')).toEqual({
      listId: 'todo',
      index: 2,
    });
  });

  it('stays at the first position on up', () => {
    const at = { listId: 'todo', index: 0 };

    expect(stepCard(columns, 't1', at, 'ArrowUp')).toEqual(at);
  });

  it('stays at the last position on down', () => {
    const at = { listId: 'todo', index: 2 };

    expect(stepCard(columns, 't3', at, 'ArrowDown')).toEqual(at);
  });

  it('counts the last position of a column the card moved into', () => {
    // t1 already previewed at the end of "doing": positions 0 and 1 there.
    const at = { listId: 'doing', index: 1 };

    expect(stepCard(columns, 't1', at, 'ArrowDown')).toEqual(at);
    expect(stepCard(columns, 't1', at, 'ArrowUp')).toEqual({
      listId: 'doing',
      index: 0,
    });
  });

  it('moves to the next and previous column at the same index', () => {
    const wide = board({ a: ['a1', 'a2'], b: ['b1', 'b2'], c: ['c1', 'c2'] });
    const at = { listId: 'b', index: 1 };

    expect(stepCard(wide, 'b2', at, 'ArrowRight')).toEqual({
      listId: 'c',
      index: 1,
    });
    expect(stepCard(wide, 'b2', at, 'ArrowLeft')).toEqual({
      listId: 'a',
      index: 1,
    });
  });

  it('caps the index at the number of cards in the target column', () => {
    const at = { listId: 'todo', index: 2 };

    expect(stepCard(columns, 't3', at, 'ArrowRight')).toEqual({
      listId: 'doing',
      index: 1,
    });
  });

  it('does not count the moved card when it comes back to its column', () => {
    // t3 previewed in "doing"; "todo" has two other cards, so index 2 is the end.
    const at = { listId: 'doing', index: 1 };

    expect(stepCard(columns, 't3', at, 'ArrowLeft')).toEqual({
      listId: 'todo',
      index: 1,
    });
  });

  it('moves into an empty column at index 0', () => {
    const at = { listId: 'doing', index: 0 };

    expect(stepCard(columns, 'd1', at, 'ArrowRight')).toEqual({
      listId: 'done',
      index: 0,
    });
  });

  it('stays on the first column on left', () => {
    const at = { listId: 'todo', index: 1 };

    expect(stepCard(columns, 't2', at, 'ArrowLeft')).toEqual(at);
  });

  it('stays on the last column on right', () => {
    const at = { listId: 'done', index: 0 };

    expect(stepCard(columns, 'd1', at, 'ArrowRight')).toEqual(at);
  });

  it('stays in place on left and right on a one-column board', () => {
    const single = board({ todo: ['t1', 't2'] });
    const at = { listId: 'todo', index: 1 };

    expect(stepCard(single, 't2', at, 'ArrowLeft')).toEqual(at);
    expect(stepCard(single, 't2', at, 'ArrowRight')).toEqual(at);
  });

  it('stays in place when the spot names a column that is not on the board', () => {
    const at = { listId: 'gone', index: 0 };

    expect(stepCard(columns, 't1', at, 'ArrowDown')).toEqual(at);
    expect(stepCard(columns, 't1', at, 'ArrowRight')).toEqual(at);
  });
});

describe('stepColumn', () => {
  it('moves one position left and right', () => {
    expect(stepColumn(3, { index: 1 }, 'ArrowLeft')).toEqual({ index: 0 });
    expect(stepColumn(3, { index: 1 }, 'ArrowRight')).toEqual({ index: 2 });
  });

  it('stays at the first position on left', () => {
    expect(stepColumn(3, { index: 0 }, 'ArrowLeft')).toEqual({ index: 0 });
  });

  it('stays at the last position on right', () => {
    expect(stepColumn(3, { index: 2 }, 'ArrowRight')).toEqual({ index: 2 });
  });

  it('stays in place on a one-column board', () => {
    expect(stepColumn(1, { index: 0 }, 'ArrowLeft')).toEqual({ index: 0 });
    expect(stepColumn(1, { index: 0 }, 'ArrowRight')).toEqual({ index: 0 });
  });
});

describe('dropSlot', () => {
  const rect = { top: 100, height: 40 };

  it('is before when the pointer is above the midpoint', () => {
    expect(dropSlot(rect, 100)).toBe('before');
    expect(dropSlot(rect, 119)).toBe('before');
  });

  it('is after when the pointer is below the midpoint', () => {
    expect(dropSlot(rect, 121)).toBe('after');
    expect(dropSlot(rect, 140)).toBe('after');
  });

  it('is after on the exact midpoint', () => {
    expect(dropSlot(rect, 120)).toBe('after');
  });
});

describe('columnDropSlot', () => {
  const rect = { left: 300, width: 280 };

  it('is before when the pointer is left of the midpoint', () => {
    expect(columnDropSlot(rect, 300)).toBe('before');
    expect(columnDropSlot(rect, 439)).toBe('before');
  });

  it('is after when the pointer is right of the midpoint', () => {
    expect(columnDropSlot(rect, 441)).toBe('after');
    expect(columnDropSlot(rect, 580)).toBe('after');
  });

  it('is after on the exact midpoint', () => {
    expect(columnDropSlot(rect, 440)).toBe('after');
  });
});

describe('dropIndex', () => {
  const otherIds = ['a', 'b', 'c'];

  it('lands before the first item', () => {
    expect(dropIndex(otherIds, 'a', 'before')).toBe(0);
  });

  it('lands between two items from either side', () => {
    expect(dropIndex(otherIds, 'a', 'after')).toBe(1);
    expect(dropIndex(otherIds, 'b', 'before')).toBe(1);
  });

  it('lands after the last item', () => {
    expect(dropIndex(otherIds, 'c', 'after')).toBe(3);
  });

  it('lands at the end when nothing is hovered', () => {
    expect(dropIndex(otherIds, null, 'before')).toBe(3);
  });

  it('lands at the end when the hovered item is not among the others', () => {
    expect(dropIndex(otherIds, 'dragged', 'before')).toBe(3);
  });

  it('lands at 0 in an empty column', () => {
    expect(dropIndex([], null, 'after')).toBe(0);
  });
});
