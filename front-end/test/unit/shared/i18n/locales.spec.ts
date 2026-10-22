import { describe, expect, it } from 'vitest';

import { en } from '@/shared/i18n/locales/en';
import { ptBR } from '@/shared/i18n/locales/pt-BR';

type Tree = { readonly [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries[path] = value;
    } else {
      Object.assign(entries, flatten(value, path));
    }
  }
  return entries;
}

describe('locales', () => {
  const enEntries = flatten(en);
  const ptEntries = flatten(ptBR);

  it('has the same keys in en and pt-BR', () => {
    expect(Object.keys(ptEntries).sort()).toEqual(
      Object.keys(enEntries).sort(),
    );
  });

  it.each([
    ['en', enEntries],
    ['pt-BR', ptEntries],
  ])('has no empty value in %s', (_, entries) => {
    const empty = Object.entries(entries)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });
});
