import { byPosition } from './columns';
import type { ChecklistItem, MoveChecklistItemDto } from './types';

export type ChecklistProgress = {
  done: number;
  total: number;
  percent: number;
  isComplete: boolean;
};

// Item id → typed text; the add field is not a draft (FCL-29).
export type ItemDrafts = Record<string, string>;

// A change to `Card.checklist` caused by adding, ticking or deleting an item.
export type ProgressDelta = { total: number; done: number };

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

// One position up or down, capped at both ends (FCLD-09).
export function stepItem(
  count: number,
  index: number,
  key: 'ArrowUp' | 'ArrowDown',
): number {
  if (key === 'ArrowUp') return Math.max(0, index - 1);
  return Math.min(count - 1, index + 1);
}

// A drop on the starting index, or before any hover, sends nothing (FCLD-06, FCLD-13).
export function itemMoveBody(
  origin: number,
  target: number | null,
): MoveChecklistItemDto | null {
  if (target === null || target === origin) return null;
  return { position: target };
}

// The server renumbers the same way, so the optimistic order matches (FCLD-05).
export function placeItem(
  items: ChecklistItem[],
  id: string,
  index: number,
): ChecklistItem[] {
  const moving = items.find((entry) => entry.id === id);
  if (!moving) return items;

  const others = sortItems(items).filter((entry) => entry.id !== id);
  others.splice(index, 0, moving);
  return others.map((entry, position) =>
    entry.position === position ? entry : { ...entry, position },
  );
}
