import { describe, expect, it } from 'vitest';

import {
  cardMoveBody,
  cardSpot,
  columnMoveBody,
  columnDropSlot,
  dropIndex,
  dropSlot,
  placeCard,
  placeList,
  stepCard,
  stepColumn,
} from '@/features/board/model/move';
import { toColumns } from '@/features/board/model/columns';
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

describe('cardMoveBody', () => {
  it('is null on the same spot', () => {
    expect(
      cardMoveBody({ listId: 'l1', index: 2 }, { listId: 'l1', index: 2 }),
    ).toBeNull();
  });

  it('sends only the position within the same column', () => {
    const body = cardMoveBody(
      { listId: 'l1', index: 2 },
      { listId: 'l1', index: 0 },
    );

    expect(body).toStrictEqual({ position: 0 });
    expect(body).not.toHaveProperty('listId');
  });

  it('sends the list and the position to another column', () => {
    expect(
      cardMoveBody({ listId: 'l1', index: 2 }, { listId: 'l2', index: 2 }),
    ).toStrictEqual({ listId: 'l2', position: 2 });
  });
});

describe('columnMoveBody', () => {
  it('is null on the same spot', () => {
    expect(columnMoveBody({ index: 1 }, { index: 1 })).toBeNull();
  });

  it('sends the new position', () => {
    expect(columnMoveBody({ index: 1 }, { index: 3 })).toStrictEqual({
      position: 3,
    });
  });
});

function archived<T extends Card | List>(item: T): T {
  return { ...item, position: null, archivedAt: '2026-10-02T12:00:00.000Z' };
}

// Each column as `id:position` entries, in screen order.
function layoutOf(lists: List[], cards: Card[]) {
  return Object.fromEntries(
    toColumns(lists, cards).map(({ list, cards }) => [
      list.id,
      cards.map((item) => `${item.id}:${item.position}`),
    ]),
  );
}

describe('placeCard', () => {
  const lists = [list('l1', 0), list('l2', 1), list('l3', 2)];
  const cards = [
    card('a', 'l1', 0),
    card('b', 'l1', 1),
    card('c', 'l1', 2),
    card('d', 'l2', 0),
    card('e', 'l2', 1),
  ];

  it('moves a card up within its list', () => {
    expect(layoutOf(lists, placeCard(cards, 'c', 'l1', 0))).toStrictEqual({
      l1: ['c:0', 'a:1', 'b:2'],
      l2: ['d:0', 'e:1'],
      l3: [],
    });
  });

  it('moves a card down within its list', () => {
    expect(layoutOf(lists, placeCard(cards, 'a', 'l1', 1))).toStrictEqual({
      l1: ['b:0', 'a:1', 'c:2'],
      l2: ['d:0', 'e:1'],
      l3: [],
    });
  });

  it('moves a card to the end of its list', () => {
    expect(layoutOf(lists, placeCard(cards, 'a', 'l1', 2))).toStrictEqual({
      l1: ['b:0', 'c:1', 'a:2'],
      l2: ['d:0', 'e:1'],
      l3: [],
    });
  });

  it('moves a card to another list and renumbers both', () => {
    const placed = placeCard(cards, 'b', 'l2', 1);

    expect(layoutOf(lists, placed)).toStrictEqual({
      l1: ['a:0', 'c:1'],
      l2: ['d:0', 'b:1', 'e:2'],
      l3: [],
    });
    expect(placed.find((item) => item.id === 'b')?.listId).toBe('l2');
  });

  it('moves a card into an empty list', () => {
    expect(layoutOf(lists, placeCard(cards, 'e', 'l3', 0))).toStrictEqual({
      l1: ['a:0', 'b:1', 'c:2'],
      l2: ['d:0'],
      l3: ['e:0'],
    });
  });

  it('keeps the counts of every column', () => {
    const counts = toColumns(lists, placeCard(cards, 'a', 'l3', 0)).map(
      (column) => column.cards.length,
    );

    expect(counts).toStrictEqual([2, 2, 1]);
  });

  it('leaves untouched lists and archived cards as they were', () => {
    const old = archived(card('x', 'l1', 0));
    const input = [...cards, old];
    const placed = placeCard(input, 'a', 'l1', 2);

    expect(placed.find((item) => item.id === 'x')).toBe(old);
    expect(placed.find((item) => item.id === 'd')).toBe(input[3]);
    expect(placed.find((item) => item.id === 'e')).toBe(input[4]);
  });

  it('returns the input for an unknown card', () => {
    expect(placeCard(cards, 'nope', 'l2', 0)).toBe(cards);
  });

  it('returns the input for an archived card', () => {
    const input = [...cards, archived(card('x', 'l1', 0))];

    expect(placeCard(input, 'x', 'l2', 0)).toBe(input);
  });
});

describe('placeList', () => {
  const lists = [list('l1', 0), list('l2', 1), list('l3', 2)];

  function order(placed: List[]) {
    return toColumns(placed, []).map(
      ({ list }) => `${list.id}:${list.position}`,
    );
  }

  it('moves a list to the right', () => {
    expect(order(placeList(lists, 'l1', 2))).toStrictEqual([
      'l2:0',
      'l3:1',
      'l1:2',
    ]);
  });

  it('moves a list to the left', () => {
    expect(order(placeList(lists, 'l3', 0))).toStrictEqual([
      'l3:0',
      'l1:1',
      'l2:2',
    ]);
  });

  it('leaves archived lists as they were', () => {
    const old = archived(list('x', 0));
    const placed = placeList([...lists, old], 'l2', 0);

    expect(placed.find((item) => item.id === 'x')).toBe(old);
    expect(
      order(placed.filter((item) => item.archivedAt === null)),
    ).toStrictEqual(['l2:0', 'l1:1', 'l3:2']);
  });

  it('returns the input for an unknown list', () => {
    expect(placeList(lists, 'nope', 0)).toBe(lists);
  });
});
