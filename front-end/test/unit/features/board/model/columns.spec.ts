import { describe, expect, it } from 'vitest';

import { toColumns } from '@/features/board/model/columns';
import type { Card, List } from '@/features/board/model/types';

function list(id: string, position: number | null): List {
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

function card(id: string, listId: string, position: number | null): Card {
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

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('toColumns', () => {
  it('orders lists by ascending position', () => {
    const columns = toColumns([list('c', 2), list('a', 0), list('b', 1)], []);

    expect(columns.map((column) => column.list.id)).toEqual(['a', 'b', 'c']);
  });

  it('groups cards by list and orders them by ascending position', () => {
    const columns = toColumns(
      [list('todo', 0), list('done', 1)],
      [
        card('t2', 'todo', 1),
        card('d1', 'done', 0),
        card('t3', 'todo', 2),
        card('t1', 'todo', 0),
      ],
    );

    expect(ids(columns[0].cards)).toEqual(['t1', 't2', 't3']);
    expect(ids(columns[1].cards)).toEqual(['d1']);
  });

  it('gives a list without cards an empty column', () => {
    const columns = toColumns(
      [list('todo', 0), list('empty', 1)],
      [card('t1', 'todo', 0)],
    );

    expect(columns[1]).toEqual({ list: list('empty', 1), cards: [] });
  });

  it('drops cards whose list is not on the board', () => {
    const columns = toColumns(
      [list('todo', 0)],
      [card('t1', 'todo', 0), card('x1', 'unknown', 0)],
    );

    expect(columns.flatMap((column) => ids(column.cards))).toEqual(['t1']);
  });

  it('returns no columns for a board without lists', () => {
    expect(toColumns([], [card('x1', 'unknown', 0)])).toEqual([]);
  });

  it('places items without a position after positioned ones', () => {
    const columns = toColumns(
      [list('b', null), list('a', 0)],
      [card('a2', 'a', null), card('a1', 'a', 0)],
    );

    expect(columns.map((column) => column.list.id)).toEqual(['a', 'b']);
    expect(ids(columns[0].cards)).toEqual(['a1', 'a2']);
  });

  it('leaves the input arrays untouched', () => {
    const lists = [list('b', 1), list('a', 0)];
    const cards = [card('a2', 'a', 1), card('a1', 'a', 0)];

    toColumns(lists, cards);

    expect(ids(lists)).toEqual(['b', 'a']);
    expect(ids(cards)).toEqual(['a2', 'a1']);
  });
});
