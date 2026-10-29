import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type BoardColumnsArchived,
  type BoardColumnsMove,
  BoardColumns,
} from '@/features/board/components/board-columns';
import {
  type CardSpot,
  type ColumnSpot,
  type MoveSession,
  previewColumns,
} from '@/features/board/model/move';
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
  archivedItems?: BoardColumnsArchived;
  session?: MoveSession | null;
  canDrag?: boolean;
  isFiltered?: boolean;
};

function moveProps(): BoardColumnsMove {
  return {
    session: null,
    preview: previewColumns([], null),
    canDrag: true,
    onStart: vi.fn<BoardColumnsMove['onStart']>(),
    onHover: vi.fn<BoardColumnsMove['onHover']>(),
    onStep: vi.fn<BoardColumnsMove['onStep']>(),
    onDrop: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    onMoveTo: vi.fn<(cardId: string) => void>(),
  };
}

function renderColumns(options: RenderOptions = {}) {
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
  const move = moveProps();

  // `columns` are the base columns; the session's preview is rendered, as the board screen does.
  function element({
    columns = threeColumns,
    isReadOnly = false,
    showArchived = false,
    archivedItems = archived,
    session = null,
    canDrag = true,
    isFiltered = false,
  }: RenderOptions) {
    const preview = previewColumns(columns, session);
    return (
      <I18nextProvider i18n={createI18n('pt-BR')}>
        <BoardColumns
          columns={preview.columns}
          labels={new Map<string, Label>()}
          today={today}
          isReadOnly={isReadOnly}
          pendingIds={new Set<string>()}
          editing={null}
          addingCardListId={null}
          isCreatingList={false}
          isCreatingCard={false}
          showArchived={showArchived}
          archived={archivedItems}
          isFiltered={isFiltered}
          move={{ ...move, session, preview, canDrag }}
          {...callbacks}
        />
      </I18nextProvider>
    );
  }

  const { rerender } = render(element(options));
  return {
    ...callbacks,
    move,
    rerender: (next: RenderOptions) => rerender(element(next)),
  };
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

  // FBF-27
  it('hides the drop hint in an empty column while filtered', () => {
    renderColumns({ isFiltered: true });

    expect(screen.queryByText('Arraste cards para cá')).toBeNull();
  });

  it('shows the drop hint in an empty column when not filtered', () => {
    renderColumns();

    expect(screen.getAllByText('Arraste cards para cá')).toHaveLength(2);
  });

  it('wires each column to its own list id', () => {
    const { onStartRename } = renderColumns();

    fireEvent.click(screen.getByRole('button', { name: 'Fazendo' }));

    expect(onStartRename).toHaveBeenCalledWith('list-2');
  });
  describe('moving', () => {
    const c1 = threeColumns[0].cards[0];

    // c1 already sits in Fazendo, as after the move is saved.
    const movedColumns: Column[] = [
      { ...threeColumns[0], cards: [] },
      { ...threeColumns[1], cards: [{ ...c1, listId: 'list-2' }] },
      threeColumns[2],
    ];

    const keyboardCard = (target: CardSpot | null = null): MoveSession => ({
      kind: 'card',
      id: 'c1',
      input: 'keyboard',
      origin: { listId: 'list-1', index: 0 },
      target,
    });

    const mouseColumn = (target: ColumnSpot | null = null): MoveSession => ({
      kind: 'column',
      id: 'list-1',
      input: 'mouse',
      origin: { index: 0 },
      target,
    });

    function cardTile(id = 'c1') {
      return document.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
    }

    function header(id: string) {
      return document.querySelector<HTMLElement>(`[data-column-id="${id}"]`);
    }

    // jsdom has no scrollTo; the scrolling tests spy on their own.
    beforeEach(() => {
      Element.prototype.scrollTo = () => {};
    });

    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(Element.prototype, 'scrollTo');
    });

    it('picks a card with Space on it', () => {
      const { move } = renderColumns();

      fireEvent.keyDown(cardTile()!, { key: ' ' });

      expect(move.onStart).toHaveBeenCalledExactlyOnceWith(
        'card',
        'c1',
        'keyboard',
      );
    });

    it('starts a column drag from its header', () => {
      const { move } = renderColumns();

      fireEvent.dragStart(header('list-2')!, {
        dataTransfer: { setData: vi.fn<() => void>() },
      });

      expect(move.onStart).toHaveBeenCalledExactlyOnceWith(
        'column',
        'list-2',
        'mouse',
      );
    });

    it('asks to move a card through its menu', () => {
      const { move } = renderColumns();

      fireEvent.click(screen.getByRole('button', { name: 'Mover para…' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Mover para…' }));

      expect(move.onMoveTo).toHaveBeenCalledExactlyOnceWith('c1');
    });

    // FBF-31, FBF-32, FBF-34
    it('turns off every column and card drag while canDrag is false', () => {
      renderColumns({ canDrag: false });

      expect(
        screen.queryAllByRole('button', { name: /Espaço para mover/ }),
      ).toEqual([]);
      expect(document.querySelectorAll('[data-column-id]')).toHaveLength(0);
      expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0);
      expect(cardTile()?.getAttribute('draggable')).toBe('false');
      screen.getByRole('button', { name: 'Mover para…' });
    });

    it('still moves a card through its menu while canDrag is false', () => {
      const { move } = renderColumns({ canDrag: false });

      fireEvent.click(screen.getByRole('button', { name: 'Mover para…' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Mover para…' }));

      expect(move.onMoveTo).toHaveBeenCalledExactlyOnceWith('c1');
    });

    it('lets a dragged card land on another column', () => {
      const { move } = renderColumns({
        session: { ...keyboardCard(), input: 'mouse' },
      });

      fireEvent.dragOver(screen.getByRole('region', { name: 'Fazendo' }));

      expect(move.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-2',
        index: 0,
      });
    });

    describe('dropping columns', () => {
      // jsdom has no layout: the columns sit side by side, 300px wide.
      beforeEach(() => {
        vi.spyOn(
          HTMLElement.prototype,
          'getBoundingClientRect',
        ).mockImplementation(function (this: HTMLElement) {
          const index = ['A fazer', 'Fazendo', 'Feito'].indexOf(
            this.getAttribute('aria-label') ?? '',
          );
          return DOMRect.fromRect({ x: index * 300, width: 300, height: 500 });
        });
      });

      // jsdom has no DragEvent, so the plain event it builds drops `clientX`.
      function dragOver(region: string, clientX: number) {
        const target = screen.getByRole('region', { name: region });
        const event = createEvent.dragOver(target, {
          dataTransfer: { dropEffect: 'none' },
        });
        Object.defineProperty(event, 'clientX', { value: clientX });
        return !fireEvent(target, event);
      }

      it('targets the slot before a column when the pointer is on its left half', () => {
        const { move } = renderColumns({ session: mouseColumn() });

        const allowed = dragOver('Feito', 700);

        expect(allowed).toBe(true);
        expect(move.onHover).toHaveBeenCalledExactlyOnceWith({ index: 1 });
      });

      it('targets the slot after a column when the pointer is on its right half', () => {
        const { move } = renderColumns({ session: mouseColumn() });

        dragOver('Feito', 800);

        expect(move.onHover).toHaveBeenCalledExactlyOnceWith({ index: 2 });
      });

      it('targets the first slot left of every other column', () => {
        const { move } = renderColumns({ session: mouseColumn({ index: 2 }) });

        dragOver('Fazendo', 10);

        expect(move.onHover).toHaveBeenCalledExactlyOnceWith({ index: 0 });
      });

      it('does not repeat the target it already has', () => {
        const { move } = renderColumns({ session: mouseColumn({ index: 2 }) });

        const allowed = dragOver('A fazer', 800);

        expect(allowed).toBe(true);
        expect(move.onHover).not.toHaveBeenCalled();
      });

      it('drops the column and keeps the browser from opening its text', () => {
        const { move } = renderColumns({ session: mouseColumn({ index: 1 }) });

        const handled = !fireEvent.drop(scroller(), { dataTransfer: {} });

        expect(handled).toBe(true);
        expect(move.onDrop).toHaveBeenCalledOnce();
      });

      it('lets no column land without a column drag', () => {
        const { move } = renderColumns({ session: keyboardCard() });

        const allowed = dragOver('A fazer', 10);
        fireEvent.drop(scroller(), { dataTransfer: {} });

        expect(allowed).toBe(false);
        expect(move.onHover).not.toHaveBeenCalled();
        expect(move.onDrop).not.toHaveBeenCalled();
      });

      // FDND-43
      it('lets no column land on the archived column or section', () => {
        const { move } = renderColumns({
          showArchived: true,
          session: mouseColumn(),
        });

        const allowed = [
          dragOver('Arquivadas', 950),
          dragOver('Colunas arquivadas', 1250),
        ];
        fireEvent.drop(screen.getByRole('region', { name: 'Arquivadas' }), {
          dataTransfer: {},
        });
        fireEvent.drop(
          screen.getByRole('region', { name: 'Colunas arquivadas' }),
          { dataTransfer: {} },
        );

        expect(allowed).toEqual([false, false]);
        expect(move.onHover).not.toHaveBeenCalled();
        expect(move.onDrop).not.toHaveBeenCalled();
      });
    });

    // FDND-43
    it('keeps the archived column and section out of every drag', () => {
      renderColumns({
        showArchived: true,
        archivedItems: {
          ...archived,
          cards: [
            {
              card: cardFixture('c9', 'list-1', {
                title: 'Old card',
                archivedAt: '2026-10-02T12:00:00.000Z',
              }),
              fromTitle: 'A fazer',
            },
          ],
        },
        session: { ...keyboardCard(), input: 'mouse' },
      });

      for (const name of ['Arquivadas', 'Colunas arquivadas']) {
        const region = screen.getByRole('region', { name });
        expect(region.querySelector('[draggable]')).toBeNull();
        expect(region.querySelector('[data-card-id]')).toBeNull();
        expect(region.querySelector('[data-column-id]')).toBeNull();
        expect(fireEvent.dragOver(region)).toBe(true);
      }
    });

    // FDND-15: the card remounts under its new column.
    it('keeps focus on a picked card that moves to another column', () => {
      const { rerender } = renderColumns({ session: keyboardCard() });
      cardTile()!.focus();

      rerender({
        session: keyboardCard({ listId: 'list-2', index: 0 }),
      });

      expect(document.activeElement).toBe(cardTile());
      expect(
        within(screen.getByRole('region', { name: 'Fazendo' })).getByRole(
          'button',
          { name: 'Write release notes' },
        ),
      ).toBe(document.activeElement);
    });

    it('keeps focus on a dropped card while its move is saved', () => {
      const { rerender } = renderColumns({
        session: keyboardCard({ listId: 'list-2', index: 0 }),
      });
      cardTile()!.focus();

      // The preview ends before the optimistic patch lands.
      rerender({ session: null });
      expect(document.activeElement).toBe(cardTile());

      rerender({ columns: movedColumns, session: null });
      expect(document.activeElement).toBe(cardTile());
    });

    it('leaves focus where the user put it after the session', () => {
      const { rerender } = renderColumns({ session: keyboardCard() });
      cardTile()!.focus();
      rerender({ session: null });
      const name = screen.getByRole('button', { name: 'Feito' });
      name.focus();

      rerender({ columns: movedColumns, session: null });

      expect(document.activeElement).toBe(name);
    });

    describe('scrolling on a phone', () => {
      function mockScroll() {
        mockLayout(0);
        const scrollTo = vi.fn<(options: ScrollToOptions) => void>();
        Object.defineProperty(scroller(), 'scrollTo', { value: scrollTo });
        return scrollTo;
      }

      // FDND-18
      it('scrolls the column a picked card moves to into view', () => {
        const { rerender } = renderColumns({ session: keyboardCard() });
        const scrollTo = mockScroll();

        rerender({ session: keyboardCard({ listId: 'list-2', index: 0 }) });
        rerender({ session: keyboardCard({ listId: 'list-1', index: 0 }) });

        expect(scrollTo.mock.calls).toEqual([
          [{ left: 312, behavior: 'smooth' }],
          [{ left: 0, behavior: 'smooth' }],
        ]);
      });

      it('does not scroll while the picked card stays in its column', () => {
        const { rerender } = renderColumns({ session: keyboardCard() });
        const scrollTo = mockScroll();

        rerender({ session: keyboardCard({ listId: 'list-1', index: 0 }) });

        expect(scrollTo).not.toHaveBeenCalled();
      });

      it('does not scroll for a card dragged with the mouse', () => {
        const mouseCard = (target: CardSpot | null): MoveSession => ({
          ...keyboardCard(target),
          input: 'mouse',
        });
        const { rerender } = renderColumns({ session: mouseCard(null) });
        const scrollTo = mockScroll();

        rerender({ session: mouseCard({ listId: 'list-2', index: 0 }) });

        expect(scrollTo).not.toHaveBeenCalled();
      });

      it('does not scroll from md up, where the columns sit side by side', () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
          matches: true,
        } as MediaQueryList);
        const { rerender } = renderColumns({ session: keyboardCard() });
        const scrollTo = mockScroll();

        rerender({ session: keyboardCard({ listId: 'list-2', index: 0 }) });

        expect(scrollTo).not.toHaveBeenCalled();
      });
    });
  });
});
