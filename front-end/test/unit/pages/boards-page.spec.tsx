import type { Board } from '@my-trello/api-contract';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { apiOrigin } from '@/shared/config';

import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

const boardsUrl = `${apiOrigin}/api/v1/boards`;

const roadmap: Board = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  title: 'Roadmap',
  description: 'Q4 plans',
  archivedAt: null,
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
};
const created: Board = {
  ...roadmap,
  id: '3f1c2b7a-8d4e-4b6f-a5c9-2e7d1a0b9c8f',
  title: 'Travel',
  description: null,
};

function respondBoards(boards: Board[]) {
  server.use(http.get(boardsUrl, () => HttpResponse.json(boards)));
}

function respondCreate201() {
  server.use(
    http.post(boardsUrl, () => HttpResponse.json(created, { status: 201 })),
  );
}

async function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name });
}

describe('BoardsPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders My boards with the boards list at /boards', async () => {
    respondBoards([roadmap]);
    renderApp({ route: '/boards', token: 'token' });

    await heading('My boards');
    expect(await screen.findByRole('link', { name: /Roadmap/ })).toBeTruthy();
  });

  it('lands on /b/{id} after creating a board', async () => {
    respondBoards([roadmap]);
    respondCreate201();
    const { router } = renderApp({ route: '/boards', token: 'token' });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Create board' }),
    );
    fireEvent.change(await screen.findByLabelText(/^Name/), {
      target: { value: 'Travel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await heading('Board');
    expect(router.state.location.pathname).toBe(`/b/${created.id}`);
  });

  it('lands on /b/{id} when a board card is clicked', async () => {
    respondBoards([roadmap]);
    const { router } = renderApp({ route: '/boards', token: 'token' });

    fireEvent.click(await screen.findByRole('link', { name: /Roadmap/ }));

    await heading('Board');
    expect(router.state.location.pathname).toBe(`/b/${roadmap.id}`);
  });
});
