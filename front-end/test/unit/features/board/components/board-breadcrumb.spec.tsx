import { cleanup, screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardBreadcrumb } from '@/features/board';
import { apiOrigin } from '@/shared/config';

import { boardFixture, boardId } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const boardUrl = `${apiOrigin}/api/v1/boards/${boardId}`;

function renderBreadcrumb(language: 'pt-BR' | 'en' = 'pt-BR') {
  return renderApp({
    route: `/b/${boardId}`,
    token: 'token',
    prefs: { language },
    routes: [
      { path: '/b/:boardId', element: <BoardBreadcrumb boardId={boardId} /> },
    ],
  });
}

describe('BoardBreadcrumb', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      nav: 'Trilha de navegação',
      boards: 'Meus quadros',
    },
    { language: 'en' as const, nav: 'Breadcrumb', boards: 'My boards' },
  ])(
    'links My boards to /boards and shows the board title as the current page ($language)',
    async ({ language, nav, boards }) => {
      server.use(http.get(boardUrl, () => HttpResponse.json(boardFixture())));

      renderBreadcrumb(language);

      const crumbs = await screen.findByRole('navigation', { name: nav });
      expect(
        within(crumbs).getByRole('link', { name: boards }).getAttribute('href'),
      ).toBe('/boards');
      const current = within(crumbs).getByText('Product launch');
      expect(current.getAttribute('aria-current')).toBe('page');
      expect(crumbs.className).toContain('hidden');
      expect(crumbs.className).toContain('md:flex');
    },
  );

  it('renders nothing while the board loads', async () => {
    server.use(
      http.get(boardUrl, async () => {
        await delay('infinite');
        return HttpResponse.json(boardFixture());
      }),
    );

    renderBreadcrumb();

    // Give the query a tick to start before checking the empty state.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it.each([404, 500])(
    'renders nothing when the board fails with %i',
    async (status) => {
      let calls = 0;
      server.use(
        http.get(boardUrl, () => {
          calls += 1;
          return HttpResponse.json(
            { type: `/problems/${status}`, title: 'Error', status, detail: '' },
            {
              status,
              headers: { 'Content-Type': 'application/problem+json' },
            },
          );
        }),
      );

      renderBreadcrumb();

      await vi.waitFor(() => expect(calls).toBeGreaterThan(0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.queryByRole('navigation')).toBeNull();
    },
  );
});
