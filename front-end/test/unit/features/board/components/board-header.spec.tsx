import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardHeader } from '@/features/board/components/board-header';
import type { Board } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { boardFixture, boardId } from '../../../../support/fixtures/board';

function renderHeader(
  board: Board = boardFixture(),
  language: Language = 'pt-BR',
) {
  const router = createMemoryRouter(
    [{ path: '/b/:boardId', element: <BoardHeader board={board} /> }],
    { initialEntries: [`/b/${board.id}`] },
  );
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

describe('BoardHeader', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the board title as the page heading', () => {
    renderHeader();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Product launch' }),
    ).toBeTruthy();
  });

  it('shows the description when it is not null', () => {
    renderHeader(boardFixture({ description: 'Q4 go-to-market' }));

    expect(screen.getByText('Q4 go-to-market')).toBeTruthy();
  });

  it('renders no description when it is null', () => {
    renderHeader();

    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      menu: 'Ações do quadro',
      labels: 'Etiquetas do quadro',
    },
    { language: 'en' as const, menu: 'Board actions', labels: 'Board labels' },
  ])(
    'offers only the $labels link in the $language board menu',
    ({ language, menu, labels }) => {
      renderHeader(boardFixture(), language);

      fireEvent.click(screen.getByRole('button', { name: menu }));

      const items = screen.getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual([labels]);
      expect(items[0].getAttribute('href')).toBe(`/b/${boardId}/labels`);
    },
  );

  it.each([
    { language: 'pt-BR' as const, back: 'Voltar' },
    { language: 'en' as const, back: 'Back' },
  ])('links the phone back arrow "$back" to /boards', ({ language, back }) => {
    renderHeader(boardFixture(), language);

    const link = screen.getByRole('link', { name: back });
    expect(link.getAttribute('href')).toBe('/boards');
    expect(link.classList.contains('md:hidden')).toBe(true);
  });
});
