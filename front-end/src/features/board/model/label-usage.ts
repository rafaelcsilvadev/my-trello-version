import type { Card, Label, UpdateLabelDto } from './types';

export type LabelUsage = { key: 'unused' | 'one' | 'many'; count: number };

// Each card counts once per label it carries; a label on no card has no entry.
export function countLabelUsage(sources: Card[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const cards of sources) {
    for (const card of cards) {
      for (const id of card.labelIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

// Values are i18n key suffixes (FLP-03).
export function usageText(count: number): LabelUsage {
  if (count === 0) return { key: 'unused', count };
  return { key: count === 1 ? 'one' : 'many', count };
}

// Only the changed fields, name trimmed; `null` when nothing changed (FLP-21).
export function labelChanges(
  label: Label,
  name: string,
  color: Label['color'],
): UpdateLabelDto | null {
  const trimmed = name.trim();
  const changes: UpdateLabelDto = {};
  if (trimmed !== label.name) changes.name = trimmed;
  if (color !== label.color) changes.color = color;
  return Object.keys(changes).length === 0 ? null : changes;
}

export function withoutLabel(labels: Label[], id: string): Label[] {
  return labels.filter((label) => label.id !== id);
}
