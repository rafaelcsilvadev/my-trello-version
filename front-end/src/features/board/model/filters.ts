import type { Card } from './types';

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
