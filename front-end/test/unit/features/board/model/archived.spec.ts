import { describe, expect, it } from 'vitest';

import {
  deleteMessageKey,
  toArchivedCards,
  toArchivedColumns,
} from '@/features/board/model/archived';
import type { Card, List } from '@/features/board/model/types';

function list(id: string, archivedAt: string | null = null): List {
  return {
    id,
    boardId: 'board-1',
    title: `List ${id}`,
    position: archivedAt === null ? 0 : null,
    archivedAt,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  };
}

function card(id: string, listId: string, archivedAt: string): Card {
  return {
    id,
    listId,
    title: `Card ${id}`,
    description: null,
    dueDate: null,
    done: false,
    position: null,
    archivedAt,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    labelIds: [],
    checklist: { done: 0, total: 0 },
  };
}

describe('toArchivedCards', () => {
  it('takes the column title from active and archived lists', () => {
    const items = toArchivedCards(
      [
        card('c1', 'active', '2026-10-02T12:00:00.000Z'),
        card('c2', 'gone', '2026-10-01T12:00:00.000Z'),
      ],
      [list('active'), list('gone', '2026-10-01T12:00:00.000Z')],
    );

    expect(items.map((item) => [item.card.id, item.fromTitle])).toEqual([
      ['c1', 'List active'],
      ['c2', 'List gone'],
    ]);
  });

  it('lists the newest archivedAt first', () => {
    const items = toArchivedCards(
      [
        card('old', 'a', '2026-10-01T12:00:00.000Z'),
        card('new', 'a', '2026-10-03T12:00:00.000Z'),
        card('mid', 'a', '2026-10-02T12:00:00.000Z'),
      ],
      [list('a')],
    );

    expect(items.map((item) => item.card.id)).toEqual(['new', 'mid', 'old']);
  });
});

describe('toArchivedColumns', () => {
  it('lists the newest archivedAt first', () => {
    const items = toArchivedColumns(
      [
        list('old', '2026-10-01T12:00:00.000Z'),
        list('new', '2026-10-03T12:00:00.000Z'),
        list('mid', '2026-10-02T12:00:00.000Z'),
      ],
      [],
      new Map([
        ['old', 0],
        ['new', 0],
        ['mid', 0],
      ]),
    );

    expect(items.map((item) => item.list.id)).toEqual(['new', 'mid', 'old']);
  });

  it('counts the active and archived cards of each column', () => {
    const items = toArchivedColumns(
      [
        list('a', '2026-10-02T12:00:00.000Z'),
        list('b', '2026-10-01T12:00:00.000Z'),
      ],
      [
        card('a1', 'a', '2026-10-01T12:00:00.000Z'),
        card('a2', 'a', '2026-10-01T12:00:00.000Z'),
        card('x1', 'other', '2026-10-01T12:00:00.000Z'),
      ],
      new Map([
        ['a', 1],
        ['b', 0],
      ]),
    );

    expect(items.map((item) => [item.list.id, item.cardCount])).toEqual([
      ['a', 3],
      ['b', 0],
    ]);
  });

  it('leaves the count undefined while the active count loads', () => {
    const items = toArchivedColumns(
      [list('a', '2026-10-01T12:00:00.000Z')],
      [card('a1', 'a', '2026-10-01T12:00:00.000Z')],
      new Map([['a', undefined]]),
    );

    expect(items[0]?.cardCount).toBeUndefined();
  });
});

describe('deleteMessageKey', () => {
  it.each([
    [0, 'none'],
    [1, 'one'],
    [2, 'many'],
  ] as const)('maps %i cards to %s', (count, key) => {
    expect(deleteMessageKey(count)).toBe(key);
  });
});
