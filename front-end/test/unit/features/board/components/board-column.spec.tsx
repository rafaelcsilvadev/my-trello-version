import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardColumn } from '@/features/board/components/board-column';
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
};

function renderColumn({
  cards = twoCards,
  isReadOnly = false,
  pendingIds = [],
  rename = null,
  isAddingCard = false,
  language = 'pt-BR',
}: RenderOptions = {}) {
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
        {...callbacks}
      />
    </I18nextProvider>,
  );
  return callbacks;
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
  });

  it('uses English labels', () => {
    renderColumn({ cards: [], language: 'en' });

    expect(screen.getByText('Drag cards here')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Column actions' })).toBeTruthy();
  });
});
