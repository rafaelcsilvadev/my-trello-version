import type { Board } from '@my-trello/api-contract';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardCard } from '@/features/boards/components/board-card';
import type { BoardsTab } from '@/features/boards/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

// Local noon keeps the calendar date stable in any time zone within ±11 h.
function localNoon(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
}

const board: Board = {
  id: '3f1c2b4a-8d6e-4f0a-9b7c-1a2b3c4d5e6f',
  title: 'Roadmap',
  description: 'Planejamento do trimestre',
  archivedAt: null,
  createdAt: localNoon(2026, 9, 10),
  updatedAt: localNoon(2026, 9, 10),
};

const archivedBoard: Board = {
  ...board,
  archivedAt: localNoon(2026, 9, 20),
};

type RenderOptions = {
  board?: Board;
  tab?: BoardsTab;
  isPending?: boolean;
  language?: Language;
};

function renderCard({
  board: cardBoard = board,
  tab = 'active',
  isPending = false,
  language = 'pt-BR',
}: RenderOptions = {}) {
  const callbacks = {
    onEdit: vi.fn<(board: Board) => void>(),
    onArchive: vi.fn<(board: Board) => void>(),
    onRestore: vi.fn<(board: Board) => void>(),
    onDelete: vi.fn<(board: Board) => void>(),
  };
  const router = createMemoryRouter(
    [
      {
        path: '/boards',
        element: (
          <BoardCard
            board={cardBoard}
            tab={tab}
            isPending={isPending}
            {...callbacks}
          />
        ),
      },
    ],
    { initialEntries: ['/boards'] },
  );
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  return callbacks;
}

function openMenu(name = 'Ações do quadro') {
  fireEvent.click(screen.getByRole('button', { name }));
}

function menuItemNames() {
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
}

describe('BoardCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('links to the board page with its title and description', () => {
    renderCard();

    const link = screen.getByRole('link', { name: /Roadmap/ });
    expect(link.getAttribute('href')).toBe(`/b/${board.id}`);
    expect(link.textContent).toContain('Planejamento do trimestre');
  });

  it('clamps the description to two lines', () => {
    renderCard();

    expect(
      screen
        .getByText('Planejamento do trimestre')
        .classList.contains('line-clamp-2'),
    ).toBe(true);
  });

  it('hides the description when it is null', () => {
    renderCard({ board: { ...board, description: null } });

    expect(screen.queryByText('Planejamento do trimestre')).toBeNull();
    expect(screen.getByRole('link', { name: /Roadmap/ })).toBeTruthy();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      tab: 'active' as const,
      cardBoard: board,
      date: 'Criado em 10 out, 2026',
    },
    {
      language: 'pt-BR' as const,
      tab: 'archived' as const,
      cardBoard: archivedBoard,
      date: 'Arquivado em 20 out, 2026',
    },
    {
      language: 'en' as const,
      tab: 'active' as const,
      cardBoard: board,
      date: 'Created Oct 10, 2026',
    },
    {
      language: 'en' as const,
      tab: 'archived' as const,
      cardBoard: archivedBoard,
      date: 'Archived Oct 20, 2026',
    },
  ])(
    'shows "$date" on the $tab tab ($language)',
    ({ language, tab, cardBoard, date }) => {
      renderCard({ board: cardBoard, tab, language });

      expect(screen.getByText(date)).toBeTruthy();
    },
  );

  it('falls back to updatedAt on the archived tab when archivedAt is missing', () => {
    renderCard({
      board: { ...board, updatedAt: localNoon(2026, 9, 15) },
      tab: 'archived',
    });

    expect(screen.getByText('Arquivado em 15 out, 2026')).toBeTruthy();
  });

  it('keeps the menu button outside the link', () => {
    renderCard();

    const link = screen.getByRole('link', { name: /Roadmap/ });
    const menuButton = screen.getByRole('button', { name: 'Ações do quadro' });
    expect(link.contains(menuButton)).toBe(false);
  });

  it('offers Editar and Arquivar on the active tab', () => {
    renderCard();

    openMenu();

    expect(menuItemNames()).toEqual(['Editar', 'Arquivar']);
  });

  it('offers Restaurar and Excluir definitivamente on the archived tab', () => {
    renderCard({ board: archivedBoard, tab: 'archived' });

    openMenu();

    expect(menuItemNames()).toEqual(['Restaurar', 'Excluir definitivamente']);
  });

  it.each([
    { tab: 'active' as const, item: 'Editar', callback: 'onEdit' as const },
    {
      tab: 'active' as const,
      item: 'Arquivar',
      callback: 'onArchive' as const,
    },
    {
      tab: 'archived' as const,
      item: 'Restaurar',
      callback: 'onRestore' as const,
    },
    {
      tab: 'archived' as const,
      item: 'Excluir definitivamente',
      callback: 'onDelete' as const,
    },
  ])(
    'calls only $callback with the board when $item is chosen',
    ({ tab, item, callback }) => {
      const cardBoard = tab === 'archived' ? archivedBoard : board;
      const callbacks = renderCard({ board: cardBoard, tab });

      openMenu();
      fireEvent.click(screen.getByRole('menuitem', { name: item }));

      expect(callbacks[callback]).toHaveBeenCalledTimes(1);
      expect(callbacks[callback]).toHaveBeenCalledWith(cardBoard);
      const others = Object.entries(callbacks).filter(
        ([name]) => name !== callback,
      );
      for (const [, fn] of others) expect(fn).not.toHaveBeenCalled();
    },
  );

  it('disables the menu and shows the saving indicator while pending', () => {
    renderCard({ isPending: true });

    const menuButton = screen.getByRole('button', { name: 'Ações do quadro' });
    fireEvent.click(menuButton);

    expect(menuButton.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('Salvando…')).toBeTruthy();
  });

  it('keeps the menu enabled and hides the saving indicator when not pending', () => {
    renderCard();

    expect(
      screen
        .getByRole('button', { name: 'Ações do quadro' })
        .hasAttribute('disabled'),
    ).toBe(false);
    expect(screen.queryByText('Salvando…')).toBeNull();
  });
});
