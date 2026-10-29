import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  dueLabel,
  isDueToday,
  isOverdue,
  parseDateOnly,
  todayParts,
} from '@/features/board/model/due-date';
import type { DateParts } from '@/features/board/model/types';

const today: DateParts = { year: 2026, month: 10, day: 27 };

describe('parseDateOnly', () => {
  it('splits a date-only string into calendar parts', () => {
    expect(parseDateOnly('2026-11-01')).toEqual({
      year: 2026,
      month: 11,
      day: 1,
    });
  });

  describe('under TZ=America/Sao_Paulo', () => {
    const originalTz = process.env.TZ;

    beforeAll(() => {
      process.env.TZ = 'America/Sao_Paulo';
    });

    afterAll(() => {
      // Assigning undefined would store the string "undefined".
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    });

    it('keeps the same day where new Date shifts it back', () => {
      // Guard: proves the zone is active and the UTC shift exists.
      expect(new Date('2026-11-01').getDate()).toBe(31);

      expect(parseDateOnly('2026-11-01')).toEqual({
        year: 2026,
        month: 11,
        day: 1,
      });
    });

    it('reads today from the local calendar, not UTC', () => {
      // 22:30 local is already the next day in UTC.
      const lateEvening = new Date(2026, 9, 27, 22, 30);

      expect(todayParts(lateEvening)).toEqual(today);
    });
  });
});

describe('todayParts', () => {
  it('returns a 1-based month', () => {
    expect(todayParts(new Date(2026, 0, 5, 12))).toEqual({
      year: 2026,
      month: 1,
      day: 5,
    });
  });
});

describe('dueLabel', () => {
  it.each([
    ['today', '2026-10-27'],
    ['tomorrow', '2026-10-28'],
    ['yesterday', '2026-10-26'],
  ] as const)('labels %s', (kind, due) => {
    expect(dueLabel(due, today)).toEqual({ kind });
  });

  it('labels another date of the current year without the year', () => {
    expect(dueLabel('2026-10-12', today)).toEqual({
      kind: 'date',
      day: 12,
      month: 10,
    });
  });

  it('adds the year when it is not the current one', () => {
    expect(dueLabel('2027-10-12', today)).toEqual({
      kind: 'date',
      day: 12,
      month: 10,
      year: 2027,
    });
  });

  it.each([
    [
      'tomorrow across a month end',
      { year: 2026, month: 10, day: 31 },
      '2026-11-01',
      'tomorrow',
    ],
    [
      'yesterday across a month start',
      { year: 2026, month: 11, day: 1 },
      '2026-10-31',
      'yesterday',
    ],
    [
      'tomorrow across a year end',
      { year: 2026, month: 12, day: 31 },
      '2027-01-01',
      'tomorrow',
    ],
    [
      'yesterday across a year start',
      { year: 2027, month: 1, day: 1 },
      '2026-12-31',
      'yesterday',
    ],
    [
      'tomorrow on a leap day',
      { year: 2028, month: 2, day: 28 },
      '2028-02-29',
      'tomorrow',
    ],
  ] as const)('labels %s', (_case, now, due, kind) => {
    expect(dueLabel(due, now)).toEqual({ kind });
  });

  it('does not take the same day of the next month for today', () => {
    expect(dueLabel('2026-11-27', today)).toEqual({
      kind: 'date',
      day: 27,
      month: 11,
    });
  });
});

describe('isOverdue', () => {
  it('is overdue when not done and due before today', () => {
    expect(isOverdue({ done: false, dueDate: '2026-10-26' }, today)).toBe(true);
  });

  it('is overdue when due in an earlier year with a later month', () => {
    expect(isOverdue({ done: false, dueDate: '2025-12-31' }, today)).toBe(true);
  });

  it('is not overdue when due today', () => {
    expect(isOverdue({ done: false, dueDate: '2026-10-27' }, today)).toBe(
      false,
    );
  });

  it('is not overdue when due after today', () => {
    expect(isOverdue({ done: false, dueDate: '2026-10-28' }, today)).toBe(
      false,
    );
  });

  it('is not overdue when done, even if due before today', () => {
    expect(isOverdue({ done: true, dueDate: '2026-10-26' }, today)).toBe(false);
  });

  it('is not overdue without a due date', () => {
    expect(isOverdue({ done: false, dueDate: null }, today)).toBe(false);
  });
});

describe('isDueToday', () => {
  it.each([false, true])('is due today when due today (done: %s)', (done) => {
    const card = { done, dueDate: '2026-10-27' };

    expect(isDueToday(card, today)).toBe(true);
  });

  it.each([
    ['yesterday', '2026-10-26'],
    ['tomorrow', '2026-10-28'],
    ['the same day of another month', '2026-11-27'],
    ['the same day of another year', '2025-10-27'],
  ])('is not due today when due %s', (_case, dueDate) => {
    expect(isDueToday({ dueDate }, today)).toBe(false);
  });

  it('is not due today without a due date', () => {
    expect(isDueToday({ dueDate: null }, today)).toBe(false);
  });
});
