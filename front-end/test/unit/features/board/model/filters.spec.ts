import { describe, expect, it } from 'vitest';

import {
  type BoardFilters,
  type DueFilter,
  filterColumns,
  isFiltering,
  matchesCard,
  matchesQuery,
  NO_FILTERS,
  normalizeText,
} from '@/features/board/model/filters';
import type { Card, Column, DateParts } from '@/features/board/model/types';

import { cardFixture, listFixture } from '../../../../support/fixtures/board';

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

type MatchableCard = Pick<
  Card,
  'title' | 'description' | 'labelIds' | 'done' | 'dueDate'
>;

const TODAY: DateParts = { year: 2026, month: 11, day: 10 };
const BOARD_LABELS: ReadonlySet<string> = new Set(['red', 'blue', 'green']);

function task(overrides: Partial<MatchableCard> = {}): MatchableCard {
  return {
    title: 'Revisar contrato',
    description: null,
    labelIds: [],
    done: false,
    dueDate: null,
    ...overrides,
  };
}

function filters(overrides: Partial<BoardFilters>): BoardFilters {
  return { ...NO_FILTERS, ...overrides };
}

describe('matchesCard', () => {
  const dueCards = {
    overdue: task({ dueDate: '2026-11-09' }),
    overdueDone: task({ dueDate: '2026-11-09', done: true }),
    today: task({ dueDate: '2026-11-10' }),
    todayDone: task({ dueDate: '2026-11-10', done: true }),
    tomorrow: task({ dueDate: '2026-11-11' }),
    none: task(),
    doneWithoutDate: task({ done: true }),
  };
  type DueCard = keyof typeof dueCards;

  it.each<[DueFilter, DueCard[]]>([
    ['any', Object.keys(dueCards) as DueCard[]],
    ['overdue', ['overdue']],
    ['today', ['today', 'todayDone']],
    ['none', ['none', 'doneWithoutDate']],
    ['done', ['overdueDone', 'todayDone', 'doneWithoutDate']],
  ])('with due "%s" matches only %j', (due, expected) => {
    const matched = (Object.keys(dueCards) as DueCard[]).filter((name) =>
      matchesCard(dueCards[name], filters({ due }), BOARD_LABELS, TODAY),
    );

    expect(matched).toEqual(expected);
  });

  it('matches every card when no filter is set', () => {
    expect(matchesCard(task(), NO_FILTERS, BOARD_LABELS, TODAY)).toBe(true);
  });

  it('matches a card that carries the checked label', () => {
    const active = filters({ labelIds: ['red'] });

    expect(
      matchesCard(task({ labelIds: ['red'] }), active, BOARD_LABELS, TODAY),
    ).toBe(true);
    expect(
      matchesCard(task({ labelIds: ['blue'] }), active, BOARD_LABELS, TODAY),
    ).toBe(false);
    expect(matchesCard(task(), active, BOARD_LABELS, TODAY)).toBe(false);
  });

  it('matches a card that carries any of two checked labels', () => {
    const active = filters({ labelIds: ['red', 'blue'] });

    expect(
      matchesCard(task({ labelIds: ['blue'] }), active, BOARD_LABELS, TODAY),
    ).toBe(true);
    expect(
      matchesCard(
        task({ labelIds: ['green', 'red'] }),
        active,
        BOARD_LABELS,
        TODAY,
      ),
    ).toBe(true);
    expect(
      matchesCard(task({ labelIds: ['green'] }), active, BOARD_LABELS, TODAY),
    ).toBe(false);
  });

  it('ignores a checked label that is not on the board', () => {
    const onlyUnknown = filters({ labelIds: ['deleted'] });
    const withKnown = filters({ labelIds: ['deleted', 'red'] });

    expect(matchesCard(task(), onlyUnknown, BOARD_LABELS, TODAY)).toBe(true);
    expect(
      matchesCard(
        task({ labelIds: ['deleted'] }),
        withKnown,
        BOARD_LABELS,
        TODAY,
      ),
    ).toBe(false);
  });

  it('requires the search, the labels and the due date together', () => {
    const active = filters({
      query: 'contrato',
      labelIds: ['red'],
      due: 'today',
    });
    const target = task({ labelIds: ['red'], dueDate: '2026-11-10' });

    expect(matchesCard(target, active, BOARD_LABELS, TODAY)).toBe(true);
    expect(
      matchesCard({ ...target, title: 'Outro' }, active, BOARD_LABELS, TODAY),
    ).toBe(false);
    expect(
      matchesCard(
        { ...target, labelIds: ['blue'] },
        active,
        BOARD_LABELS,
        TODAY,
      ),
    ).toBe(false);
    expect(
      matchesCard(
        { ...target, dueDate: '2026-11-11' },
        active,
        BOARD_LABELS,
        TODAY,
      ),
    ).toBe(false);
  });
});

describe('isFiltering', () => {
  it.each<[string, Partial<BoardFilters>]>([
    ['no filters', {}],
    ['a spaces-only query', { query: '   ' }],
    ['only labels that are not on the board', { labelIds: ['deleted'] }],
  ])('is false with %s', (_case, overrides) => {
    expect(isFiltering(filters(overrides), BOARD_LABELS)).toBe(false);
  });

  it.each<[string, Partial<BoardFilters>]>([
    ['a query', { query: 'contrato' }],
    ['a board label', { labelIds: ['deleted', 'red'] }],
    ['a due filter', { due: 'done' }],
  ])('is true with %s', (_case, overrides) => {
    expect(isFiltering(filters(overrides), BOARD_LABELS)).toBe(true);
  });
});

describe('filterColumns', () => {
  function column(listId: string, titles: string[]): Column {
    return {
      list: listFixture(listId),
      cards: titles.map((title, index) =>
        cardFixture(`${listId}-${index}`, listId, { title }),
      ),
    };
  }

  function titles(columns: Column[]): Record<string, string[]> {
    return Object.fromEntries(
      columns.map(({ list, cards }) => [list.id, cards.map((c) => c.title)]),
    );
  }

  const board = [
    column('todo', ['Revisar contrato', 'Pagar fornecedor', 'Contrato novo']),
    column('doing', []),
    column('done', ['Enviar contrato']),
  ];

  it('keeps every column in order, empty ones included, and the card order', () => {
    const result = filterColumns(
      board,
      filters({ query: 'contrato' }),
      BOARD_LABELS,
      TODAY,
    );

    expect(result.columns.map(({ list }) => list.id)).toEqual([
      'todo',
      'doing',
      'done',
    ]);
    expect(titles(result.columns)).toEqual({
      todo: ['Revisar contrato', 'Contrato novo'],
      doing: [],
      done: ['Enviar contrato'],
    });
  });

  it('counts the matching cards of every column', () => {
    expect(
      filterColumns(board, filters({ query: 'contrato' }), BOARD_LABELS, TODAY)
        .matchCount,
    ).toBe(3);
  });

  it('keeps the list of each column', () => {
    const result = filterColumns(
      board,
      filters({ query: 'contrato' }),
      BOARD_LABELS,
      TODAY,
    );

    expect(result.columns.map(({ list }) => list)).toEqual(
      board.map(({ list }) => list),
    );
  });

  it('empties every column when no card matches', () => {
    const result = filterColumns(
      board,
      filters({ query: 'orçamento' }),
      BOARD_LABELS,
      TODAY,
    );

    expect(titles(result.columns)).toEqual({ todo: [], doing: [], done: [] });
    expect(result.matchCount).toBe(0);
  });

  it('returns no columns and no matches for a board without columns', () => {
    expect(
      filterColumns([], filters({ query: 'contrato' }), BOARD_LABELS, TODAY),
    ).toEqual({ columns: [], matchCount: 0 });
  });
});
