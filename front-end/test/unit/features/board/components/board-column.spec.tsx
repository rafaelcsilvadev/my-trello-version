import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BoardColumn,
  type ColumnCardDrop,
  type ColumnMove,
} from '@/features/board/components/board-column';
import type { CardMove } from '@/features/board/components/card-tile';
import type { CardSpot } from '@/features/board/model/move';
import type {
  Card,
  Column,
  DateParts,
  ItemFieldError,
  Label,
} from '@/features/board/model/types';
import type { ColumnRename } from '@/features/board/view-models/use-board-view-model';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { cardFixture, listFixture } from '../../../../support/fixtures/board';

const today: DateParts = { year: 2026, month: 10, day: 27 };

const labels = new Map<string, Label>();

const list = listFixture('list-1', { title: 'To do' });

const twoCards: Card[] = [
  cardFixture('c1', 'list-1', { title: 'Write release notes' }),
  cardFixture('c2', 'list-1', { title: 'Review PR' }),
];

type RenderOptions = {
  cards?: Card[];
  isReadOnly?: boolean;
  pendingIds?: string[];
  rename?: ColumnRename | null;
  isAddingCard?: boolean;
  language?: Language;
  move?: Partial<ColumnMove>;
  cardDrop?: Partial<ColumnCardDrop>;
  cardMove?: (cardId: string) => CardMove;
};

function moveProps(overrides: Partial<ColumnMove> = {}): ColumnMove {
  return {
    isSource: false,
    isLifted: false,
    onDragStart: vi.fn<(listId: string) => void>(),
    onDragEnd: vi.fn<() => void>(),
    onPick: vi.fn<(listId: string) => void>(),
    onStep: vi.fn<ColumnMove['onStep']>(),
    onDrop: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    ...overrides,
  };
}

function cardDropProps(
  overrides: Partial<ColumnCardDrop> = {},
): ColumnCardDrop {
  return {
    cardId: 'other',
    targetIndex: null,
    placeholder: null,
    onHover: vi.fn<(spot: CardSpot) => void>(),
    onDrop: vi.fn<() => void>(),
    ...overrides,
  };
}

// jsdom has no DataTransfer.
function dataTransferStub() {
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: vi.fn<(format: string, data: string) => void>(),
    getData: vi.fn<(format: string) => string>(() => ''),
  };
}

function renderColumn({
  cards = twoCards,
  isReadOnly = false,
  pendingIds = [],
  rename = null,
  isAddingCard = false,
  language = 'pt-BR',
  move: moveOverrides,
  cardDrop: cardDropOverrides,
  cardMove,
}: RenderOptions = {}) {
  const move = moveProps(moveOverrides);
  const cardDrop = cardDropOverrides && cardDropProps(cardDropOverrides);
  const column: Column = { list, cards };
  const callbacks = {
    onStartRename: vi.fn<() => void>(),
    onSubmitRename: vi.fn<(raw: string) => ItemFieldError | null>(() => null),
    onCancelRename: vi.fn<() => void>(),
    onArchive: vi.fn<() => void>(),
    onOpenAddCard: vi.fn<() => void>(),
    onCloseAddCard: vi.fn<() => void>(),
    onCreateCard: vi.fn<(raw: string) => Promise<ItemFieldError | null>>(() =>
      Promise.resolve(null),
    ),
    onToggleDone: vi.fn<(card: Card) => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <BoardColumn
        column={column}
        labels={labels}
        today={today}
        isReadOnly={isReadOnly}
        pendingIds={new Set(pendingIds)}
        rename={rename}
        isAddingCard={isAddingCard}
        isCreatingCard={false}
        move={move}
        cardDrop={cardDrop}
        cardMove={cardMove}
        {...callbacks}
      />
    </I18nextProvider>,
  );
  return { ...callbacks, move, cardDrop };
}

function column(name = 'To do') {
  return screen.getByRole('region', { name });
}

function openMenu(name = 'Ações da coluna') {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('BoardColumn', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows its cards in a region named after the column, with their count in the header', () => {
    renderColumn();

    expect(column().textContent).toContain('Write release notes');
    expect(column().textContent).toContain('Review PR');
    expect(screen.getByText('2')).toBeTruthy();
  });

  // The 11/12 width leaves a peek of the next column on a phone (FBV-48).
  it('snaps to its start and leaves room to peek the next column on a phone', () => {
    renderColumn();

    expect(column().classList.contains('snap-start')).toBe(true);
    expect(column().classList.contains('w-11/12')).toBe(true);
  });

  it('shows "Arraste cards para cá" and a zero counter when it has no cards', () => {
    renderColumn({ cards: [] });

    expect(screen.getByText('Arraste cards para cá')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('asks to rename when the name is clicked', () => {
    const { onStartRename } = renderColumn();

    fireEvent.click(screen.getByRole('button', { name: 'To do' }));

    expect(onStartRename).toHaveBeenCalledOnce();
  });

  it('offers exactly Renomear and Arquivar in the menu', () => {
    renderColumn();

    openMenu();

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Renomear', 'Arquivar']);
  });

  it('asks to rename from the menu', () => {
    const { onStartRename } = renderColumn();

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Renomear' }));

    expect(onStartRename).toHaveBeenCalledOnce();
  });

  it('asks to archive from the menu', () => {
    const { onArchive } = renderColumn();

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Arquivar' }));

    expect(onArchive).toHaveBeenCalledOnce();
  });

  it('turns the name into a field with the current name while renaming', () => {
    renderColumn({ rename: { listId: 'list-1' } });

    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Nome da coluna' })
        .value,
    ).toBe('To do');
    expect(screen.queryByRole('button', { name: 'To do' })).toBeNull();
  });

  it('reopens the field with the sent text and its error', () => {
    renderColumn({
      rename: { listId: 'list-1', value: '', error: 'columnNameRequired' },
    });

    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: 'Nome da coluna' })
        .value,
    ).toBe('');
    expect(screen.getByText('Dê um nome à coluna')).toBeTruthy();
  });

  it('asks to open the card field from "Adicionar tarefa"', () => {
    const { onOpenAddCard } = renderColumn();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }));

    expect(onOpenAddCard).toHaveBeenCalledOnce();
  });

  it('shows the card field instead of "Adicionar tarefa" while adding', () => {
    renderColumn({ isAddingCard: true });

    expect(
      screen.getByRole('textbox', { name: 'Título da tarefa' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Adicionar tarefa' }),
    ).toBeNull();
  });

  it('hides the menu and "Adicionar tarefa" and keeps the name plain text when read-only', () => {
    renderColumn({ isReadOnly: true });

    expect(
      screen.queryByRole('button', { name: 'Ações da coluna' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Adicionar tarefa' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'To do' })).toBeNull();
    expect(column().textContent).toContain('To do');
  });

  it('says "Nenhuma tarefa" in an empty read-only column', () => {
    renderColumn({ cards: [], isReadOnly: true });

    expect(screen.getByText('Nenhuma tarefa')).toBeTruthy();
    expect(screen.queryByText('Arraste cards para cá')).toBeNull();
  });

  it('disables the menu while a change to the column is in flight', () => {
    renderColumn({ pendingIds: ['list-1'] });

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Ações da coluna' })
        .disabled,
    ).toBe(true);
  });

  it('marks only the cards with a change in flight as pending', () => {
    renderColumn({ pendingIds: ['c2'] });

    expect(screen.getAllByText('Salvando…')).toHaveLength(1);
    const [first, second] = screen.getAllByRole<HTMLInputElement>('checkbox', {
      name: 'Concluída',
    });
    expect(first.disabled).toBe(false);
    expect(second.disabled).toBe(true);
  });

  it('uses English labels', () => {
    renderColumn({ cards: [], language: 'en' });

    expect(screen.getByText('Drag cards here')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Column actions' })).toBeTruthy();
  });

  describe('moving', () => {
    function handle() {
      return screen.getByRole('button', {
        name: 'Coluna To do. Espaço para mover',
      });
    }

    it('makes the header a focusable handle named after the column with its id', () => {
      renderColumn();

      const header = handle();
      expect(header.tabIndex).toBe(0);
      expect(header.dataset.columnId).toBe('list-1');
      expect(header.getAttribute('draggable')).toBe('true');
      expect(
        header.classList.contains('focus-visible:outline-border-focus'),
      ).toBe(true);
    });

    it('names the handle in English', () => {
      renderColumn({ language: 'en' });

      expect(
        screen.getByRole('button', { name: 'Column To do. Space to move' }),
      ).toBeTruthy();
    });

    it('sets the column id as text data and starts a mouse move on dragstart', () => {
      const { move } = renderColumn();
      const dataTransfer = dataTransferStub();

      fireEvent.dragStart(handle(), { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledExactlyOnceWith(
        'text/plain',
        'list-1',
      );
      expect(dataTransfer.effectAllowed).toBe('move');
      expect(move.onDragStart).toHaveBeenCalledExactlyOnceWith('list-1');
    });

    it('gives each card its own move', () => {
      const onPick = vi.fn<(cardId: string) => void>();
      const cardMove = vi.fn<(cardId: string) => CardMove>((cardId) => ({
        isSource: false,
        isLifted: cardId === 'c2',
        onDragStart: vi.fn<(id: string) => void>(),
        onDragEnd: vi.fn<() => void>(),
        onPick,
        onStep: vi.fn<CardMove['onStep']>(),
        onDrop: vi.fn<() => void>(),
        onCancel: vi.fn<() => void>(),
        onMoveTo: vi.fn<(id: string) => void>(),
      }));
      renderColumn({ cardMove });

      const card = screen.getByRole('button', { name: 'Write release notes' });
      fireEvent.keyDown(card, { key: ' ' });

      expect(card.dataset.cardId).toBe('c1');
      expect(onPick).toHaveBeenCalledExactlyOnceWith('c1');
      expect(cardMove).toHaveBeenCalledWith('c2');
    });

    it('ends the mouse move on dragend', () => {
      const { move } = renderColumn();

      fireEvent.dragEnd(handle());

      expect(move.onDragEnd).toHaveBeenCalledOnce();
    });

    it('picks the column on Space on the header', () => {
      const { move } = renderColumn();

      const notPrevented = fireEvent.keyDown(handle(), { key: ' ' });

      expect(move.onPick).toHaveBeenCalledExactlyOnceWith('list-1');
      expect(notPrevented).toBe(false);
    });

    it('starts the rename and does not pick on Space on the name button', async () => {
      const { move, onStartRename } = renderColumn();

      screen.getByRole('button', { name: 'To do' }).focus();
      await userEvent.keyboard(' ');

      expect(onStartRename).toHaveBeenCalledOnce();
      expect(move.onPick).not.toHaveBeenCalled();
    });

    it('is neither draggable nor pickable while its name is a field', () => {
      const { move } = renderColumn({ rename: { listId: 'list-1' } });

      expect(handle().getAttribute('draggable')).toBe('false');
      fireEvent.keyDown(handle(), { key: ' ' });
      fireEvent.dragStart(handle(), { dataTransfer: dataTransferStub() });
      expect(move.onPick).not.toHaveBeenCalled();
      expect(move.onDragStart).not.toHaveBeenCalled();
    });

    it('is neither draggable nor pickable while its change is pending', () => {
      const { move } = renderColumn({ pendingIds: ['list-1'] });

      expect(handle().getAttribute('draggable')).toBe('false');
      fireEvent.keyDown(handle(), { key: ' ' });
      fireEvent.dragStart(handle(), { dataTransfer: dataTransferStub() });
      expect(move.onPick).not.toHaveBeenCalled();
      expect(move.onDragStart).not.toHaveBeenCalled();
    });

    it('has no handle on a read-only board', () => {
      const { move } = renderColumn({ isReadOnly: true });

      expect(
        screen.queryByRole('button', {
          name: 'Coluna To do. Espaço para mover',
        }),
      ).toBeNull();
      expect(document.querySelector('[draggable]')).toBeNull();
      expect(document.querySelector('[data-column-id]')).toBeNull();
      expect(document.querySelector('[tabindex="0"]')).toBeNull();
      fireEvent.keyDown(screen.getByText('To do'), { key: ' ' });
      expect(move.onPick).not.toHaveBeenCalled();
    });

    it('ignores arrows, Enter and Esc while it is not picked', () => {
      const { move } = renderColumn();

      for (const key of ['ArrowRight', 'Enter', 'Escape']) {
        fireEvent.keyDown(handle(), { key });
      }

      expect(move.onStep).not.toHaveBeenCalled();
      expect(move.onDrop).not.toHaveBeenCalled();
      expect(move.onCancel).not.toHaveBeenCalled();
    });

    it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const)(
      'steps with %s while picked',
      (key) => {
        const { move } = renderColumn({ move: { isLifted: true } });

        const notPrevented = fireEvent.keyDown(handle(), { key });

        expect(move.onStep).toHaveBeenCalledExactlyOnceWith(key);
        expect(notPrevented).toBe(false);
      },
    );

    it.each([' ', 'Enter'])('drops with "%s" while picked', (key) => {
      const { move } = renderColumn({ move: { isLifted: true } });

      fireEvent.keyDown(handle(), { key });

      expect(move.onDrop).toHaveBeenCalledOnce();
      expect(move.onPick).not.toHaveBeenCalled();
    });

    it('cancels with Esc while picked', () => {
      const { move } = renderColumn({ move: { isLifted: true } });

      fireEvent.keyDown(handle(), { key: 'Escape' });

      expect(move.onCancel).toHaveBeenCalledOnce();
    });

    it('ignores keys pressed on the menu button while picked', () => {
      const { move } = renderColumn({ move: { isLifted: true } });

      fireEvent.keyDown(
        screen.getByRole('button', { name: 'Ações da coluna' }),
        {
          key: 'ArrowRight',
        },
      );

      expect(move.onStep).not.toHaveBeenCalled();
    });

    it('shows a translucent drag source', () => {
      renderColumn({ move: { isSource: true } });

      expect(column().classList.contains('opacity-50')).toBe(true);
    });

    it('shows a lifted column', () => {
      renderColumn({ move: { isLifted: true } });

      const classes = column().classList;
      expect(classes.contains('shadow-lg')).toBe(true);
      expect(classes.contains('outline-border-focus')).toBe(true);
    });
  });
  describe('dropping cards', () => {
    // jsdom has no layout: each card tile is 100px tall, stacked from the top.
    beforeEach(() => {
      vi.spyOn(
        HTMLElement.prototype,
        'getBoundingClientRect',
      ).mockImplementation(function (this: HTMLElement) {
        const index = ['Write release notes', 'Review PR'].findIndex((title) =>
          this.textContent?.includes(title),
        );
        return DOMRect.fromRect({ y: index * 100, height: 100, width: 280 });
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // jsdom has no DragEvent, so the plain event it builds drops `clientY`.
    function dragOver(clientY: number) {
      const event = createEvent.dragOver(column(), {
        dataTransfer: dataTransferStub(),
      });
      Object.defineProperty(event, 'clientY', { value: clientY });
      return fireEvent(column(), event);
    }

    function placeholder() {
      return column().querySelector('[data-drop-placeholder]');
    }

    it('targets the slot before a card when the pointer is above its middle', () => {
      const { cardDrop } = renderColumn({ cardDrop: {} });

      const allowed = !dragOver(140);

      expect(allowed).toBe(true);
      expect(cardDrop?.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-1',
        index: 1,
      });
    });

    it('targets the slot after a card when the pointer is below its middle', () => {
      const { cardDrop } = renderColumn({ cardDrop: {} });

      dragOver(60);

      expect(cardDrop?.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-1',
        index: 1,
      });
    });

    it('targets the first slot above the first card', () => {
      const { cardDrop } = renderColumn({ cardDrop: {} });

      dragOver(10);

      expect(cardDrop?.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-1',
        index: 0,
      });
    });

    it('targets the end over the empty space below the cards', () => {
      const { cardDrop } = renderColumn({ cardDrop: {} });

      dragOver(450);

      expect(cardDrop?.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-1',
        index: 2,
      });
    });

    // The index counts only the other cards (FDND-04).
    it('leaves the dragged card out of the slot count in its own column', () => {
      const { cardDrop } = renderColumn({ cardDrop: { cardId: 'c1' } });

      dragOver(450);

      expect(cardDrop?.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-1',
        index: 1,
      });
    });

    it('does not repeat the target it already has', () => {
      const { cardDrop } = renderColumn({ cardDrop: { targetIndex: 2 } });

      const allowed = !dragOver(450);

      expect(allowed).toBe(true);
      expect(cardDrop?.onHover).not.toHaveBeenCalled();
    });

    it('drops the card and keeps the browser from opening its text', () => {
      const { cardDrop } = renderColumn({ cardDrop: { targetIndex: 1 } });

      const handled = !fireEvent.drop(column(), {
        dataTransfer: dataTransferStub(),
      });

      expect(handled).toBe(true);
      expect(cardDrop?.onDrop).toHaveBeenCalledOnce();
    });

    // FDND-05
    it('accepts a card on an empty column at its first slot', () => {
      const { cardDrop } = renderColumn({ cards: [], cardDrop: {} });

      const allowed = !dragOver(40);
      fireEvent.drop(column(), { dataTransfer: dataTransferStub() });

      expect(allowed).toBe(true);
      expect(cardDrop?.onHover).toHaveBeenCalledExactlyOnceWith({
        listId: 'list-1',
        index: 0,
      });
      expect(cardDrop?.onDrop).toHaveBeenCalledOnce();
    });

    it('shows the dashed purple outline only while it is the target', () => {
      renderColumn({ cardDrop: { targetIndex: 0 } });

      const classes = column().classList;
      expect(classes.contains('outline-dashed')).toBe(true);
      expect(classes.contains('outline-border-focus')).toBe(true);
      expect(classes.contains('bg-surface-selected')).toBe(true);
    });

    it('has no outline while the card is over another column', () => {
      renderColumn({ cardDrop: { targetIndex: null } });

      const classes = column().classList;
      expect(classes.contains('outline-dashed')).toBe(false);
      expect(classes.contains('bg-surface-selected')).toBe(false);
    });

    it('shows the placeholder before the card it precedes', () => {
      renderColumn({
        cardDrop: { targetIndex: 1, placeholder: { beforeCardId: 'c2' } },
      });

      const gap = placeholder();
      expect(gap?.previousElementSibling?.textContent).toContain(
        'Write release notes',
      );
      expect(gap?.nextElementSibling?.textContent).toContain('Review PR');
    });

    it('shows the placeholder at the end', () => {
      renderColumn({
        cardDrop: { targetIndex: 2, placeholder: { beforeCardId: null } },
      });

      const gap = placeholder();
      expect(gap?.previousElementSibling?.textContent).toContain('Review PR');
      expect(gap?.nextElementSibling).toBeNull();
    });

    it('swaps "Arraste cards para cá" for the placeholder on an empty column', () => {
      renderColumn({
        cards: [],
        cardDrop: { targetIndex: 0, placeholder: { beforeCardId: null } },
      });

      expect(placeholder()).not.toBeNull();
      expect(screen.queryByText('Arraste cards para cá')).toBeNull();
    });

    it('lets no card land when no card is dragged', () => {
      renderColumn();

      const allowed = !dragOver(40);

      expect(allowed).toBe(false);
    });

    it('lets no card land on a read-only board', () => {
      const { cardDrop } = renderColumn({ isReadOnly: true, cardDrop: {} });

      const allowed = !dragOver(40);

      expect(allowed).toBe(false);
      expect(cardDrop?.onHover).not.toHaveBeenCalled();
    });
  });
});
