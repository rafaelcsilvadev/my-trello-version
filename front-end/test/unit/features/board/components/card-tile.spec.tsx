import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardTile, type CardMove } from '@/features/board/components/card-tile';
import type { Card, DateParts, Label } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { cardFixture, labelFixture } from '../../../../support/fixtures/board';

const today: DateParts = { year: 2026, month: 10, day: 27 };

const labels = new Map<string, Label>([
  ['l1', labelFixture('l1', { name: 'Bug', color: 'red' })],
  ['l2', labelFixture('l2', { name: 'Docs', color: 'sky' })],
]);

// Local noon keeps the calendar date stable in any time zone within ±11 h.
function localNoon(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
}

type RenderOptions = {
  card?: Partial<Card>;
  mode?: 'active' | 'archived';
  fromTitle?: string;
  isPending?: boolean;
  isReadOnly?: boolean;
  language?: Language;
  move?: Partial<CardMove>;
};

function moveProps(overrides: Partial<CardMove> = {}): CardMove {
  return {
    isSource: false,
    isLifted: false,
    onDragStart: vi.fn<(cardId: string) => void>(),
    onDragEnd: vi.fn<() => void>(),
    onPick: vi.fn<(cardId: string) => void>(),
    onStep: vi.fn<CardMove['onStep']>(),
    onDrop: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
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

function renderTile({
  card = {},
  mode = 'active',
  fromTitle,
  isPending = false,
  isReadOnly = false,
  language = 'pt-BR',
  move: moveOverrides,
}: RenderOptions = {}) {
  const move = moveProps(moveOverrides);
  const onToggleDone = vi.fn<(card: Card) => void>();
  const tileCard = cardFixture('c1', 'list-1', {
    title: 'Write release notes',
    ...card,
  });
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <CardTile
        card={tileCard}
        labels={labels}
        today={today}
        mode={mode}
        fromTitle={fromTitle}
        isPending={isPending}
        isReadOnly={isReadOnly}
        onToggleDone={onToggleDone}
        move={move}
      />
    </I18nextProvider>,
  );
  return { onToggleDone, tileCard, move };
}

function doneCheckbox() {
  return screen.getByRole<HTMLInputElement>('checkbox', { name: 'Concluída' });
}

describe('CardTile', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows one chip per known label with its name and color', () => {
    renderTile({ card: { labelIds: ['l2', 'missing', 'l1'] } });

    const docs = screen.getByText('Docs').parentElement as HTMLElement;
    const bug = screen.getByText('Bug').parentElement as HTMLElement;
    expect(docs.querySelector('.bg-label-sky')).toBeTruthy();
    expect(bug.querySelector('.bg-label-red')).toBeTruthy();
    expect(
      docs.compareDocumentPosition(bug) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText(/Label missing/)).toBeNull();
  });

  it.each([
    { dueDate: '2026-10-27', text: 'Hoje' },
    { dueDate: '2026-10-28', text: 'Amanhã' },
    { dueDate: '2026-10-26', text: 'Ontem' },
    { dueDate: '2026-11-12', text: '12 nov' },
    { dueDate: '2027-01-05', text: '5 jan, 2027' },
  ])('shows the due date $dueDate as "$text"', ({ dueDate, text }) => {
    renderTile({ card: { dueDate } });

    expect(screen.getByText(text)).toBeTruthy();
  });

  it('shows an overdue date in the danger color with the "Atrasada" badge', () => {
    renderTile({ card: { dueDate: '2026-10-20' } });

    expect(
      screen
        .getByText('20 out')
        .parentElement?.classList.contains('text-red-600'),
    ).toBe(true);
    expect(screen.getByText('Atrasada')).toBeTruthy();
  });

  it('does not mark a card due today as overdue', () => {
    renderTile({ card: { dueDate: '2026-10-27' } });

    expect(screen.queryByText('Atrasada')).toBeNull();
    expect(
      screen
        .getByText('Hoje')
        .parentElement?.classList.contains('text-text-secondary'),
    ).toBe(true);
  });

  it('mutes a done card and shows its past due date in the success color', () => {
    renderTile({ card: { done: true, dueDate: '2026-10-20' } });

    const title = screen.getByText('Write release notes');
    expect(title.classList.contains('line-through')).toBe(true);
    expect(title.classList.contains('text-text-tertiary')).toBe(true);
    expect(
      screen
        .getByText('20 out')
        .parentElement?.classList.contains('text-green-700'),
    ).toBe(true);
    expect(screen.queryByText('Atrasada')).toBeNull();
    expect(doneCheckbox().checked).toBe(true);
  });

  it.each([
    {
      checklist: { total: 3, done: 2 },
      text: '2/3',
      color: 'text-text-secondary',
    },
    { checklist: { total: 3, done: 3 }, text: '3/3', color: 'text-green-700' },
  ])('shows the checklist as "$text"', ({ checklist, text, color }) => {
    renderTile({ card: { checklist } });

    expect(
      screen.getByText(text).parentElement?.classList.contains(color),
    ).toBe(true);
  });

  it('hides the meta line when there is no due date and no checklist', () => {
    renderTile();

    expect(screen.queryByText('0/0')).toBeNull();
    expect(screen.queryByText('Atrasada')).toBeNull();
  });

  it('calls onToggleDone with the card when the checkbox is toggled', async () => {
    const { onToggleDone, tileCard } = renderTile();

    expect(doneCheckbox().checked).toBe(false);
    await userEvent.click(doneCheckbox());

    expect(onToggleDone).toHaveBeenCalledExactlyOnceWith(tileCard);
  });

  it('disables the checkbox on a read-only board', () => {
    renderTile({ isReadOnly: true });

    expect(doneCheckbox().disabled).toBe(true);
  });

  it('shows the archive date and source column with a disabled checkbox in archived mode', () => {
    renderTile({
      mode: 'archived',
      fromTitle: 'To do',
      card: {
        done: true,
        dueDate: '2026-10-20',
        archivedAt: localNoon(2026, 9, 2),
      },
    });

    expect(
      screen.getByText('Arquivada em 2 out, 2026 · de: To do'),
    ).toBeTruthy();
    expect(doneCheckbox().disabled).toBe(true);
    expect(doneCheckbox().checked).toBe(true);
    expect(screen.queryByText('20 out')).toBeNull();
  });

  it('shows a saving indicator while pending', () => {
    renderTile({ isPending: true });

    expect(screen.getByText('Salvando…')).toBeTruthy();
  });

  it('disables the checkbox while its change is pending', async () => {
    const { onToggleDone } = renderTile({ isPending: true });

    expect(doneCheckbox().disabled).toBe(true);
    await userEvent.click(doneCheckbox());

    expect(onToggleDone).not.toHaveBeenCalled();
  });

  it('writes the texts in English', () => {
    renderTile({
      language: 'en',
      mode: 'archived',
      fromTitle: 'To do',
      card: { archivedAt: localNoon(2026, 9, 2) },
    });

    expect(screen.getByRole('checkbox', { name: 'Completed' })).toBeTruthy();
    expect(screen.getByText('Archived Oct 2, 2026 · from: To do')).toBeTruthy();
  });

  describe('moving', () => {
    function cardButton() {
      return screen.getByRole('button', { name: 'Write release notes' });
    }

    it('is a focusable button named by its title with the card id', () => {
      renderTile();

      const card = cardButton();
      expect(card.tabIndex).toBe(0);
      expect(card.dataset.cardId).toBe('c1');
      expect(
        card.classList.contains('focus-visible:outline-border-focus'),
      ).toBe(true);
    });

    it('is draggable when it can move', () => {
      renderTile();

      expect(cardButton().getAttribute('draggable')).toBe('true');
    });

    it('is not draggable while its change is pending', () => {
      renderTile({ isPending: true });

      expect(cardButton().getAttribute('draggable')).toBe('false');
    });

    it.each([
      { mode: 'archived' as const, isReadOnly: false },
      { mode: 'active' as const, isReadOnly: true },
    ])(
      'is neither focusable nor draggable when $mode and read-only is $isReadOnly',
      ({ mode, isReadOnly }) => {
        const { move } = renderTile({ mode, isReadOnly, fromTitle: 'To do' });

        expect(
          screen.queryByRole('button', { name: 'Write release notes' }),
        ).toBeNull();
        const tile = screen
          .getByText('Write release notes')
          .closest('[draggable]');
        expect(tile).toBeNull();
        expect(document.querySelector('[tabindex="0"]')).toBeNull();
        expect(document.querySelector('[data-card-id]')).toBeNull();
        fireEvent.keyDown(screen.getByText('Write release notes'), {
          key: ' ',
        });
        expect(move.onPick).not.toHaveBeenCalled();
      },
    );

    it('sets the card id as text data and starts a mouse move on dragstart', () => {
      const { move } = renderTile();
      const dataTransfer = dataTransferStub();

      fireEvent.dragStart(cardButton(), { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledExactlyOnceWith(
        'text/plain',
        'c1',
      );
      expect(dataTransfer.effectAllowed).toBe('move');
      expect(move.onDragStart).toHaveBeenCalledExactlyOnceWith('c1');
    });

    it('ends the mouse move on dragend', () => {
      const { move } = renderTile();

      fireEvent.dragEnd(cardButton());

      expect(move.onDragEnd).toHaveBeenCalledOnce();
    });

    it('picks the card on Space', () => {
      const { move } = renderTile();

      fireEvent.keyDown(cardButton(), { key: ' ' });

      expect(move.onPick).toHaveBeenCalledExactlyOnceWith('c1');
    });

    it('does not pick a pending card on Space', () => {
      const { move } = renderTile({ isPending: true });

      fireEvent.keyDown(cardButton(), { key: ' ' });

      expect(move.onPick).not.toHaveBeenCalled();
    });

    it('ignores arrows, Enter and Esc while it is not picked', () => {
      const { move } = renderTile();

      for (const key of ['ArrowDown', 'ArrowRight', 'Enter', 'Escape']) {
        fireEvent.keyDown(cardButton(), { key });
      }

      expect(move.onStep).not.toHaveBeenCalled();
      expect(move.onDrop).not.toHaveBeenCalled();
      expect(move.onCancel).not.toHaveBeenCalled();
    });

    it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const)(
      'steps with %s while picked',
      (key) => {
        const { move } = renderTile({ move: { isLifted: true } });

        const notPrevented = fireEvent.keyDown(cardButton(), { key });

        expect(move.onStep).toHaveBeenCalledExactlyOnceWith(key);
        expect(notPrevented).toBe(false);
      },
    );

    it.each([' ', 'Enter'])('drops with "%s" while picked', (key) => {
      const { move } = renderTile({ move: { isLifted: true } });

      fireEvent.keyDown(cardButton(), { key });

      expect(move.onDrop).toHaveBeenCalledOnce();
      expect(move.onPick).not.toHaveBeenCalled();
    });

    it('cancels with Esc while picked', () => {
      const { move } = renderTile({ move: { isLifted: true } });

      fireEvent.keyDown(cardButton(), { key: 'Escape' });

      expect(move.onCancel).toHaveBeenCalledOnce();
    });

    it('toggles done and does not pick on Space on the checkbox', async () => {
      const { move, onToggleDone, tileCard } = renderTile();

      doneCheckbox().focus();
      await userEvent.keyboard(' ');

      expect(onToggleDone).toHaveBeenCalledExactlyOnceWith(tileCard);
      expect(move.onPick).not.toHaveBeenCalled();
    });

    it('ignores the arrows from the checkbox while picked', () => {
      const { move } = renderTile({ move: { isLifted: true } });

      fireEvent.keyDown(doneCheckbox(), { key: 'ArrowDown' });

      expect(move.onStep).not.toHaveBeenCalled();
    });

    it('shows a dashed, translucent drag source', () => {
      renderTile({ move: { isSource: true } });

      const classes = cardButton().classList;
      expect(classes.contains('border-dashed')).toBe(true);
      expect(classes.contains('opacity-45')).toBe(true);
    });

    it('shows a lifted card', () => {
      renderTile({ move: { isLifted: true } });

      const classes = cardButton().classList;
      expect(classes.contains('shadow-lg')).toBe(true);
      expect(classes.contains('border-border-focus')).toBe(true);
    });
  });
});
