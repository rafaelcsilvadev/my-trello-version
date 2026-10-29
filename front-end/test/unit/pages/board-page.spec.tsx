import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import type { Board } from '@/features/board/model/types';
import { apiOrigin } from '@/shared/config';

import { boardFixture, boardId } from '../../support/fixtures/board';
import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

const otherBoardId = '22222222-2222-4222-8222-222222222222';

// An empty board per id: the page only needs the header and the toolbar.
function respondBoards(boards: Board[]) {
  for (const board of boards) {
    const url = `${apiOrigin}/api/v1/boards/${board.id}`;
    server.use(
      http.get(url, () => HttpResponse.json(board)),
      http.get(`${url}/lists`, () => HttpResponse.json([])),
      http.get(`${url}/cards`, () => HttpResponse.json([])),
      http.get(`${url}/labels`, () => HttpResponse.json([])),
    );
  }
}

async function showArchived() {
  return screen.findByRole<HTMLInputElement>('switch', {
    name: 'Show archived',
  });
}

describe('BoardPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders the board at /b/{id} inside the main landmark', async () => {
    respondBoards([boardFixture()]);
    renderApp({ route: `/b/${boardId}`, token: 'token' });

    const main = await screen.findByRole('main');
    expect(
      await within(main).findByRole('heading', {
        level: 1,
        name: 'Product launch',
      }),
    ).toBeTruthy();
  });

  it('turns Show archived off when moving to another board', async () => {
    respondBoards([
      boardFixture(),
      boardFixture({ id: otherBoardId, title: 'Travel' }),
    ]);
    const { router } = renderApp({ route: `/b/${boardId}`, token: 'token' });

    fireEvent.click(await showArchived());
    expect((await showArchived()).checked).toBe(true);

    await router.navigate(`/b/${otherBoardId}`);

    await screen.findByRole('heading', { level: 1, name: 'Travel' });
    expect((await showArchived()).checked).toBe(false);
  });

  it('starts the next board with an empty search', async () => {
    respondBoards([
      boardFixture(),
      boardFixture({ id: otherBoardId, title: 'Travel' }),
    ]);
    const { router } = renderApp({ route: `/b/${boardId}`, token: 'token' });
    const searchBox = () =>
      screen.findByRole<HTMLInputElement>('textbox', {
        name: 'Search this board…',
      });

    fireEvent.change(await searchBox(), { target: { value: 'brief' } });
    expect((await searchBox()).value).toBe('brief');

    await router.navigate(`/b/${otherBoardId}`);

    await screen.findByRole('heading', { level: 1, name: 'Travel' });
    expect((await searchBox()).value).toBe('');
  });
});
