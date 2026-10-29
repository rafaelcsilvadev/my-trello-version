import type { Card, DateParts } from './types';

export type DueLabel =
  | { kind: 'today' | 'tomorrow' | 'yesterday' }
  | { kind: 'date'; day: number; month: number; year?: number };

const DAY_MS = 24 * 60 * 60 * 1000;

// Split, never `new Date(value)`: that reads "2026-11-01" as UTC midnight,
// which is the previous day west of UTC.
export function parseDateOnly(value: string): DateParts {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function todayParts(now = new Date()): DateParts {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

// UTC on both sides keeps the day count free of DST jumps.
function daysBetween(from: DateParts, to: DateParts): number {
  const toUtc = (p: DateParts) => Date.UTC(p.year, p.month - 1, p.day);
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function dueLabel(due: string, today: DateParts): DueLabel {
  const date = parseDateOnly(due);
  switch (daysBetween(today, date)) {
    case 0:
      return { kind: 'today' };
    case 1:
      return { kind: 'tomorrow' };
    case -1:
      return { kind: 'yesterday' };
  }
  return date.year === today.year
    ? { kind: 'date', day: date.day, month: date.month }
    : { kind: 'date', day: date.day, month: date.month, year: date.year };
}

export function isOverdue(
  card: Pick<Card, 'done' | 'dueDate'>,
  today: DateParts,
): boolean {
  if (card.done || card.dueDate === null) return false;
  return daysBetween(today, parseDateOnly(card.dueDate)) < 0;
}

export function isDueToday(
  card: Pick<Card, 'dueDate'>,
  today: DateParts,
): boolean {
  if (card.dueDate === null) return false;
  return daysBetween(today, parseDateOnly(card.dueDate)) === 0;
}
