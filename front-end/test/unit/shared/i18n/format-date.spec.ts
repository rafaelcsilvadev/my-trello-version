import { describe, expect, it } from 'vitest';

import { formatShortDate } from '@/shared/i18n/format-date';
import { createI18n } from '@/shared/i18n/i18n';

// Local noon keeps the calendar date stable in any time zone within ±11 h.
function localNoon(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
}

describe('formatShortDate', () => {
  const ptT = createI18n('pt-BR').t;
  const enT = createI18n('en').t;

  it('formats as day month, year in pt-BR', () => {
    expect(formatShortDate(localNoon(2026, 9, 10), ptT)).toBe('10 out, 2026');
  });

  it('formats as month day, year in en', () => {
    expect(formatShortDate(localNoon(2026, 9, 10), enT)).toBe('Oct 10, 2026');
  });

  it.each([
    ['pt-BR', ptT, '15 jan, 2027'],
    ['en', enT, 'Jan 15, 2027'],
  ])('formats January in %s', (_, t, expected) => {
    expect(formatShortDate(localNoon(2027, 0, 15), t)).toBe(expected);
  });

  it.each([
    ['pt-BR', ptT, '31 dez, 2025'],
    ['en', enT, 'Dec 31, 2025'],
  ])('formats December in %s', (_, t, expected) => {
    expect(formatShortDate(localNoon(2025, 11, 31), t)).toBe(expected);
  });

  it.each([
    ['pt-BR', ptT, '3 mar, 2026'],
    ['en', enT, 'Mar 3, 2026'],
  ])(
    'writes a single-digit day without a leading zero in %s',
    (_, t, expected) => {
      expect(formatShortDate(localNoon(2026, 2, 3), t)).toBe(expected);
    },
  );

  it('uses the local calendar date, not the UTC one', () => {
    const lateEvening = new Date(2026, 9, 10, 23, 30).toISOString();

    expect(formatShortDate(lateEvening, enT)).toBe('Oct 10, 2026');
  });
});
