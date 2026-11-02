import { describe, expect, it } from 'vitest';

import {
  checklistProgress,
  isChecklistDirty,
  itemMoveBody,
  placeItem,
  sortItems,
  stepItem,
} from '@/features/board/model/checklist';
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
