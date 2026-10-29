import { describe, expect, it } from 'vitest';

import { matchesQuery, normalizeText } from '@/features/board/model/filters';
import type { Card } from '@/features/board/model/types';

function card(
  title: string,
  description: string | null = null,
): Pick<Card, 'title' | 'description'> {
  return { title, description };
}

describe('normalizeText', () => {
  it('lower-cases and strips accents', () => {
    expect(normalizeText('Lançamento AÇÃO Écran')).toBe(
      'lancamento acao ecran',
    );
  });
});

describe('matchesQuery', () => {
  it.each([
    ['ignoring case and accents', 'Lançamento da versão', 'LANCAMENTO'],
    ['without the accent the title has', 'Ação de marketing', 'acao'],
    ['with an accent the title lacks', 'Acao de marketing', 'ação'],
    ['by part of a word', 'Revisar contrato', 'trat'],
  ])('matches the title %s', (_case, title, query) => {
    expect(matchesQuery(card(title), query)).toBe(true);
  });

  it('matches by the description only', () => {
    const target = card('Revisar', 'Enviar o orçamento ao cliente');

    expect(matchesQuery(target, 'orcamento')).toBe(true);
  });

  it('matches by the title when the description is null', () => {
    expect(matchesQuery(card('Revisar contrato', null), 'contrato')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['spaces only', '   '],
  ])('matches every card when the query is %s', (_case, query) => {
    expect(matchesQuery(card('Revisar contrato'), query)).toBe(true);
  });

  it('ignores the spaces around the query', () => {
    expect(matchesQuery(card('Revisar contrato'), '  contrato  ')).toBe(true);
  });

  it('keeps the spaces inside the query', () => {
    expect(matchesQuery(card('Revisar contrato'), 'revisar  contrato')).toBe(
      false,
    );
  });

  it('does not match when neither the title nor the description has it', () => {
    const target = card('Revisar contrato', 'Enviar ao cliente');

    expect(matchesQuery(target, 'orçamento')).toBe(false);
  });

  it('does not match a null description by the text "null"', () => {
    expect(matchesQuery(card('Revisar', null), 'null')).toBe(false);
  });
});
