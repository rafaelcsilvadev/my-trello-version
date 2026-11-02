import { describe, expect, it } from 'vitest';

import {
  checklistProgress,
  isChecklistDirty,
  itemMoveBody,
  placeItem,
  previewItems,
  replayItemMoves,
  sortItems,
  stepItem,
} from '@/features/board/model/checklist';
import type { ItemMoveSession } from '@/features/board/model/checklist';
import type { ChecklistItem } from '@/features/board/model/types';

function item(
  id: string,
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id,
    cardId: 'c1',
    text: `Item ${id}`,
    done: false,
    position: 0,
    createdAt: '2026-10-24T12:00:00.000Z',
    updatedAt: '2026-10-24T12:00:00.000Z',
    ...overrides,
  };
}

describe('checklistProgress', () => {
  it('is zero and not complete for an empty checklist', () => {
    expect(checklistProgress([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
      isComplete: false,
    });
  });

  it('rounds one of three done to 33 percent', () => {
    const items = [item('a', { done: true }), item('b'), item('c')];

    expect(checklistProgress(items)).toEqual({
      done: 1,
      total: 3,
      percent: 33,
      isComplete: false,
    });
  });

  it('rounds two of three done to 67 percent', () => {
    const items = [
      item('a', { done: true }),
      item('b', { done: true }),
      item('c'),
    ];

    expect(checklistProgress(items)).toEqual({
      done: 2,
      total: 3,
      percent: 67,
      isComplete: false,
    });
  });

  it('is complete at 100 percent when every item is done', () => {
    const items = ['a', 'b', 'c'].map((id) => item(id, { done: true }));

    expect(checklistProgress(items)).toEqual({
      done: 3,
      total: 3,
      percent: 100,
      isComplete: true,
    });
  });
});

describe('sortItems', () => {
  it('orders the items by position', () => {
    const items = [
      item('c', { position: 2 }),
      item('a', { position: 0 }),
      item('b', { position: 1 }),
    ];

    expect(sortItems(items).map((each) => each.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves the given list untouched', () => {
    const items = [item('b', { position: 1 }), item('a', { position: 0 })];

    sortItems(items);

    expect(items.map((each) => each.id)).toEqual(['b', 'a']);
  });
});

describe('isChecklistDirty', () => {
  const items = [item('a', { text: 'Write tests' }), item('b')];

  it('is not dirty without drafts', () => {
    expect(isChecklistDirty(items, {})).toBe(false);
  });

  it('is dirty when a draft differs from its item text', () => {
    expect(isChecklistDirty(items, { a: 'Ship it' })).toBe(true);
  });

  it('is not dirty when a draft equals its item text after trim', () => {
    expect(isChecklistDirty(items, { a: '  Write tests  ' })).toBe(false);
  });

  it('is dirty when one of several drafts differs', () => {
    expect(
      isChecklistDirty(items, { a: 'Write tests', b: 'Something else' }),
    ).toBe(true);
  });

  it('is not dirty for a draft of an unknown item', () => {
    expect(isChecklistDirty(items, { gone: 'Ship it' })).toBe(false);
  });
});

describe('stepItem', () => {
  it('moves one position up on ArrowUp', () => {
    expect(stepItem(3, 1, 'ArrowUp')).toBe(0);
  });

  it('moves one position down on ArrowDown', () => {
    expect(stepItem(3, 1, 'ArrowDown')).toBe(2);
  });

  it('stays at the first position on ArrowUp', () => {
    expect(stepItem(3, 0, 'ArrowUp')).toBe(0);
  });

  it('stays at the last position on ArrowDown', () => {
    expect(stepItem(3, 2, 'ArrowDown')).toBe(2);
  });

  it('keeps a single item at the first position both ways', () => {
    expect(stepItem(1, 0, 'ArrowUp')).toBe(0);
    expect(stepItem(1, 0, 'ArrowDown')).toBe(0);
  });
});

describe('itemMoveBody', () => {
  it('sends nothing before a target exists', () => {
    expect(itemMoveBody(1, null)).toBeNull();
  });

  it('sends nothing when the target is the starting index', () => {
    expect(itemMoveBody(1, 1)).toBeNull();
  });

  it('sends the target as position', () => {
    expect(itemMoveBody(0, 2)).toEqual({ position: 2 });
  });

  it('sends position 0 for a move to the top', () => {
    expect(itemMoveBody(2, 0)).toEqual({ position: 0 });
  });
});

describe('placeItem', () => {
  const items = () => [
    item('a', { position: 0 }),
    item('b', { position: 1 }),
    item('c', { position: 2 }),
  ];
  const order = (list: ChecklistItem[]) =>
    list.map((entry) => [entry.id, entry.position]);

  it('moves the last item to the top and renumbers', () => {
    expect(order(placeItem(items(), 'c', 0))).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('moves the first item to the end and renumbers', () => {
    expect(order(placeItem(items(), 'a', 2))).toEqual([
      ['b', 0],
      ['c', 1],
      ['a', 2],
    ]);
  });

  it('sorts an input given out of position order first', () => {
    const shuffled = [
      item('c', { position: 2 }),
      item('a', { position: 0 }),
      item('b', { position: 1 }),
    ];

    expect(order(placeItem(shuffled, 'b', 0))).toEqual([
      ['b', 0],
      ['a', 1],
      ['c', 2],
    ]);
  });

  it('does not mutate the input array or its items', () => {
    const input = items();
    const snapshot = structuredClone(input);

    placeItem(input, 'c', 0);

    expect(input).toEqual(snapshot);
  });

  it('returns the input unchanged for an unknown id', () => {
    const input = items();

    expect(placeItem(input, 'missing', 0)).toBe(input);
  });

  it('places the item last for an index beyond the end', () => {
    expect(order(placeItem(items(), 'a', 9))).toEqual([
      ['b', 0],
      ['c', 1],
      ['a', 2],
    ]);
  });
});

describe('replayItemMoves', () => {
  const order = (list: ChecklistItem[]) =>
    list.map((entry) => [entry.id, entry.position]);
  // Cache after C → 0 then A → 2 on A, B, C.
  const moved = () => [
    item('c', { position: 0 }),
    item('b', { position: 1 }),
    item('a', { position: 2 }),
  ];

  it('replays the later moves on the base order (FCLD-21)', () => {
    expect(
      order(
        replayItemMoves(moved(), ['a', 'b', 'c'], [{ id: 'a', position: 2 }]),
      ),
    ).toEqual([
      ['b', 0],
      ['c', 1],
      ['a', 2],
    ]);
  });

  it('replays several later moves in the order they were made', () => {
    // A, B, C: C → 0 fails; then A → 2 and B → 2 hold.
    // In order: B, C, A then C, A, B. Newest first would give C, B, A.
    const current = [
      item('c', { position: 0 }),
      item('a', { position: 1 }),
      item('b', { position: 2 }),
    ];

    expect(
      order(
        replayItemMoves(
          current,
          ['a', 'b', 'c'],
          [
            { id: 'a', position: 2 },
            { id: 'b', position: 2 },
          ],
        ),
      ),
    ).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('restores the base order when no move came later', () => {
    expect(order(replayItemMoves(moved(), ['a', 'b', 'c'], []))).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
  });

  it('keeps the current fields of each item', () => {
    const current = [
      item('c', { position: 0 }),
      item('a', { position: 1, done: true }),
      item('b', { position: 2 }),
    ];

    const result = replayItemMoves(current, ['a', 'b', 'c'], []);

    expect(result.find((entry) => entry.id === 'a')?.done).toBe(true);
  });

  it('drops ids that left the cache and appends items the base did not know', () => {
    const current = [
      item('d', { position: 0 }),
      item('c', { position: 1 }),
      item('a', { position: 2 }),
    ];

    expect(order(replayItemMoves(current, ['a', 'b', 'c'], []))).toEqual([
      ['a', 0],
      ['c', 1],
      ['d', 2],
    ]);
  });

  it('skips a later move of an item that left the cache', () => {
    const current = [item('a', { position: 0 }), item('c', { position: 1 })];

    expect(
      order(
        replayItemMoves(current, ['c', 'b', 'a'], [{ id: 'b', position: 0 }]),
      ),
    ).toEqual([
      ['c', 0],
      ['a', 1],
    ]);
  });

  it('does not mutate the input array or its items', () => {
    const input = moved();
    const snapshot = structuredClone(input);

    replayItemMoves(input, ['a', 'b', 'c'], [{ id: 'a', position: 2 }]);

    expect(input).toEqual(snapshot);
  });
});

describe('previewItems', () => {
  const items = () => [
    item('a', { position: 0 }),
    item('b', { position: 1 }),
    item('c', { position: 2 }),
  ];
  const ids = (list: ChecklistItem[]) => list.map((entry) => entry.id);
  const session = (
    overrides: Partial<ItemMoveSession> = {},
  ): ItemMoveSession => ({
    id: 'b',
    input: 'mouse',
    origin: 1,
    target: null,
    ...overrides,
  });

  it('returns the items unchanged with every marker null without a session', () => {
    const input = items();

    expect(previewItems(input, null)).toEqual({
      items: input,
      sourceId: null,
      placeholderIndex: null,
      liftedId: null,
    });
    expect(previewItems(input, null).items).toBe(input);
  });

  it('keeps the items and marks the source with no placeholder before the first hover', () => {
    const input = items();
    const preview = previewItems(input, session());

    expect(preview.items).toBe(input);
    expect(preview).toMatchObject({
      sourceId: 'b',
      placeholderIndex: null,
      liftedId: null,
    });
  });

  it('puts the placeholder at the mouse target and leaves the items in place', () => {
    const input = items();
    const preview = previewItems(input, session({ target: 3 }));

    expect(preview.items).toBe(input);
    expect(preview).toMatchObject({
      sourceId: 'b',
      placeholderIndex: 3,
      liftedId: null,
    });
  });

  it('renders the keyboard-picked item at its target and lifts it', () => {
    const preview = previewItems(
      items(),
      session({ input: 'keyboard', target: 0 }),
    );

    expect(ids(preview.items)).toEqual(['b', 'a', 'c']);
    expect(preview).toMatchObject({
      sourceId: null,
      placeholderIndex: null,
      liftedId: 'b',
    });
  });

  it('renders the keyboard-picked item at its origin before the first step', () => {
    const preview = previewItems(
      items(),
      session({ input: 'keyboard', target: null }),
    );

    expect(ids(preview.items)).toEqual(['a', 'b', 'c']);
    expect(preview.liftedId).toBe('b');
  });
});
