import { describe, expect, it } from 'vitest';

import {
  checklistProgress,
  isChecklistDirty,
  sortItems,
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
