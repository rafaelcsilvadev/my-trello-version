import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type BoardColumnsArchived,
  BoardColumns,
} from '@/features/board/components/board-columns';
import type {
  Card,
  Column,
  DateParts,
  ItemFieldError,
  Label,
  List,
} from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';

import { cardFixture, listFixture } from '../../../../support/fixtures/board';

const today: DateParts = { year: 2026, month: 10, day: 27 };

const threeColumns: Column[] = [
  {
    list: listFixture('list-1', { title: 'A fazer', position: 0 }),
    cards: [cardFixture('c1', 'list-1', { title: 'Write release notes' })],
  },
  { list: listFixture('list-2', { title: 'Fazendo', position: 1 }), cards: [] },
  { list: listFixture('list-3', { title: 'Feito', position: 2 }), cards: [] },
];

const archived: BoardColumnsArchived = {
  cards: [],
  columns: [
    {
      list: listFixture('list-9', {
        title: 'Old',
        archivedAt: '2026-10-02T12:00:00.000Z',
      }),
      cardCount: 0,
    },
  ],
  cardsStatus: 'ready',
  columnsStatus: 'ready',
};

type RenderOptions = {
  columns?: Column[];
  isReadOnly?: boolean;
  showArchived?: boolean;
};

function renderColumns({
  columns = threeColumns,
  isReadOnly = false,
  showArchived = false,
}: RenderOptions = {}) {
  const callbacks = {
    onStartRename: vi.fn<(listId: string) => void>(),
    onSubmitRename: vi.fn<(list: List, raw: string) => ItemFieldError | null>(
      () => null,
    ),
    onCancelRename: vi.fn<() => void>(),
    onArchive: vi.fn<(listId: string) => void>(),
    onOpenAddCard: vi.fn<(listId: string) => void>(),
    onCloseAddCard: vi.fn<() => void>(),
    onCreateCard: vi.fn<
      (listId: string, raw: string) => Promise<ItemFieldError | null>
    >(() => Promise.resolve(null)),
    onToggleDone: vi.fn<(card: Card) => void>(),
    onCreateList: vi.fn<(raw: string) => Promise<ItemFieldError | null>>(() =>
      Promise.resolve(null),
    ),
    onRestoreList: vi.fn<(listId: string) => void>(),
    onDeleteList: vi.fn<(listId: string) => void>(),
    onRetryArchived: vi.fn<() => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <BoardColumns
        columns={columns}
        labels={new Map<string, Label>()}
        today={today}
        isReadOnly={isReadOnly}
        pendingIds={new Set<string>()}
        editing={null}
        addingCardListId={null}
        isCreatingList={false}
        isCreatingCard={false}
        showArchived={showArchived}
        archived={archived}
        {...callbacks}
      />
    </I18nextProvider>,
  );
  return callbacks;
}

function regionNames() {
  return screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
}

function scroller() {
  return screen.getByTestId('board-columns');
}

// jsdom has no layout: give the first column a width and the scroller a position.
function mockLayout(scrollLeft: number) {
  const first = screen.getByRole('region', { name: 'A fazer' });
  Object.defineProperty(first, 'clientWidth', {
    configurable: true,
    value: 300,
  });
  Object.defineProperty(scroller(), 'scrollLeft', {
    configurable: true,
    value: scrollLeft,
  });
}

describe('BoardColumns', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the active columns in the given order', () => {
    renderColumns();

    expect(regionNames()).toEqual(['A fazer', 'Fazendo', 'Feito']);
  });

  // jsdom has no layout, so the phone snap is checked on its classes (FBV-48).
  it('snaps the columns one by one on a phone and scrolls freely from md up', () => {
    renderColumns();

    const classes = scroller().classList;
    expect(classes.contains('snap-x')).toBe(true);
    expect(classes.contains('snap-mandatory')).toBe(true);
    expect(classes.contains('md:snap-none')).toBe(true);
  });

  it('shows the archived column and section after the columns only while showArchived is on', () => {
    renderColumns({ showArchived: true });

    expect(regionNames()).toEqual([
      'A fazer',
      'Fazendo',
      'Feito',
      'Arquivadas',
      'Colunas arquivadas',
    ]);
  });

  it('shows the add column last', () => {
    renderColumns();

    const last = scroller().lastElementChild as HTMLElement;
    expect(
      within(last).getByRole('button', { name: 'Adicionar coluna' }),
    ).toBeTruthy();
  });

  it('hides the add column when read-only', () => {
    renderColumns({ isReadOnly: true });

    expect(
      screen.queryByRole('button', { name: 'Adicionar coluna' }),
    ).toBeNull();
  });

  it('shows only the first-column block on an empty board', () => {
    renderColumns({ columns: [] });

    expect(screen.getByText('Adicione a primeira coluna')).toBeTruthy();
    expect(screen.queryByTestId('board-columns')).toBeNull();
    expect(screen.queryAllByRole('region')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Ir para/ })).toBeNull();
  });

  // Otherwise the last column, once archived, could not be restored.
  it('shows the archived items and the add column on a board with no active columns while showArchived is on', () => {
    renderColumns({ columns: [], showArchived: true });

    expect(regionNames()).toEqual(['Arquivadas', 'Colunas arquivadas']);
    expect(
      screen.getByRole('button', { name: 'Adicionar coluna' }),
    ).toBeTruthy();
  });

  it('shows the first column in the pager before any scroll', () => {
    renderColumns();

    expect(screen.getByText('A fazer · 1 de 3')).toBeTruthy();
  });

  it('updates the pager text to the column in view on scroll', () => {
    renderColumns();
    // Column 300 + gap 12: 624 is the third column.
    mockLayout(624);

    fireEvent.scroll(scroller());

    expect(screen.getByText('Feito · 3 de 3')).toBeTruthy();
  });

  it('scrolls to the column of the clicked dot', () => {
    renderColumns();
    mockLayout(0);
    const scrollTo = vi.fn<(options: ScrollToOptions) => void>();
    Object.defineProperty(scroller(), 'scrollTo', { value: scrollTo });

    fireEvent.click(screen.getByRole('button', { name: 'Ir para Fazendo' }));

    expect(scrollTo).toHaveBeenCalledWith({ left: 312, behavior: 'smooth' });
  });

  it('wires each column to its own list id', () => {
    const { onStartRename } = renderColumns();

    fireEvent.click(screen.getByRole('button', { name: 'Fazendo' }));

    expect(onStartRename).toHaveBeenCalledWith('list-2');
  });
});
