import type { TFunction } from 'i18next';

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

// i18n keys instead of Intl: Intl writes "10 de out. de 2026" for pt-BR, not the prototype text.
export function formatShortDate(iso: string, t: TFunction): string {
  const date = new Date(iso);
  return t('dates.short', {
    day: date.getDate(),
    month: t(`dates.months.${MONTH_KEYS[date.getMonth()]}`),
    year: date.getFullYear(),
  });
}

// month is 1-based (calendar month, as in "2026-10-12").
export function formatDayMonth(
  parts: { year: number; month: number; day: number },
  t: TFunction,
  currentYear: number,
): string {
  const values = {
    day: parts.day,
    month: t(`dates.months.${MONTH_KEYS[parts.month - 1]}`),
    year: parts.year,
  };
  return parts.year === currentYear
    ? t('dates.dayMonth', values)
    : t('dates.dayMonthYear', values);
}
