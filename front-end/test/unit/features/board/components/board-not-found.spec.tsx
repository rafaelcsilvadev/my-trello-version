import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { BoardNotFound } from '@/features/board/components/board-not-found';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderNotFound(language: Language) {
  const router = createMemoryRouter(
    [{ path: '/b/:boardId', element: <BoardNotFound /> }],
    { initialEntries: ['/b/b-404'] },
  );
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

describe('BoardNotFound', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Quadro não encontrado',
      detail: 'Ele pode ter sido excluído.',
      back: 'Voltar para Meus quadros',
    },
    {
      language: 'en' as const,
      title: 'Board not found',
      detail: 'It may have been deleted.',
      back: 'Back to My boards',
    },
  ])(
    'shows the title, detail and a link back to /boards in an alert ($language)',
    ({ language, title, detail, back }) => {
      renderNotFound(language);

      const alert = screen.getByRole('alert');
      expect(
        screen.getByRole('heading', { level: 2, name: title }),
      ).toBeTruthy();
      expect(alert.textContent).toContain(detail);
      expect(
        screen.getByRole('link', { name: back }).getAttribute('href'),
      ).toBe('/boards');
    },
  );
});
