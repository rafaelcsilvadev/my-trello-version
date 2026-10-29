import { isDueToday, isOverdue } from './due-date';
import type { Card, DateParts } from './types';

export type DueFilter = 'any' | 'overdue' | 'today' | 'none' | 'done';

export type BoardFilters = {
  // Raw field text; trimmed and normalized only when matching.
  query: string;
  // Checked label ids; ids not on the board are ignored (FBF-15).
  labelIds: string[];
  due: DueFilter;
};

export const NO_FILTERS: BoardFilters = { query: '', labelIds: [], due: 'any' };

type MatchableCard = Pick<
  Card,
  'title' | 'description' | 'labelIds' | 'done' | 'dueDate'
>;

// NFD splits "ç" into "c" plus a combining mark; the range drops the marks.
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function matchesQuery(
  card: Pick<Card, 'title' | 'description'>,
  query: string,
): boolean {
  const needle = normalizeText(query.trim());
  if (needle === '') return true;
  return [card.title, card.description ?? ''].some((text) =>
    normalizeText(text).includes(needle),
  );
}

function checkedBoardLabels(
  filters: BoardFilters,
  boardLabelIds: ReadonlySet<string>,
): string[] {
  return filters.labelIds.filter((id) => boardLabelIds.has(id));
}

function matchesDue(
  card: MatchableCard,
  due: DueFilter,
  today: DateParts,
): boolean {
  switch (due) {
    case 'any':
      return true;
    case 'overdue':
      return isOverdue(card, today);
    case 'today':
      return isDueToday(card, today);
    case 'none':
      return card.dueDate === null;
    case 'done':
      return card.done;
  }
}

export function isFiltering(
  filters: BoardFilters,
  boardLabelIds: ReadonlySet<string>,
): boolean {
  return (
    filters.query.trim() !== '' ||
    checkedBoardLabels(filters, boardLabelIds).length > 0 ||
    filters.due !== 'any'
  );
}

export function matchesCard(
  card: MatchableCard,
  filters: BoardFilters,
  boardLabelIds: ReadonlySet<string>,
  today: DateParts,
): boolean {
  const labels = checkedBoardLabels(filters, boardLabelIds);
  return (
    matchesQuery(card, filters.query) &&
    (labels.length === 0 || labels.some((id) => card.labelIds.includes(id))) &&
    matchesDue(card, filters.due, today)
  );
}
