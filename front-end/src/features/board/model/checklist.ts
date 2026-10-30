import { byPosition } from './columns';
import type { ChecklistItem } from './types';

export type ChecklistProgress = {
  done: number;
  total: number;
  percent: number;
  isComplete: boolean;
};

// Item id → typed text; the add field is not a draft (FCL-29).
export type ItemDrafts = Record<string, string>;

export function checklistProgress(items: ChecklistItem[]): ChecklistProgress {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    isComplete: total > 0 && done === total,
  };
}

export function sortItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort(byPosition);
}

// A draft of an item that is gone has nothing left to lose.
export function isChecklistDirty(
  items: ChecklistItem[],
  drafts: ItemDrafts,
): boolean {
  return items.some((item) => {
    const draft = drafts[item.id];
    return draft !== undefined && draft.trim() !== item.text;
  });
}
