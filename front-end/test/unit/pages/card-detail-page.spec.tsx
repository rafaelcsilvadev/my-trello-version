import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { apiOrigin } from '@/shared/config';

import {
  boardFixture,
  boardId,
  cardFixture,
  listFixture,
} from '../../support/fixtures/board';
import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

const boardUrl = `${apiOrigin}/api/v1/boards/${boardId}`;
const boardPath = `/b/${boardId}`;
const backlog = listFixture('l1', { title: 'Backlog' });
const card = cardFixture('c1', backlog.id, { title: 'Write the brief' });

function boardApi() {
  server.use(
    http.get(boardUrl, () => HttpResponse.json(boardFixture())),
    http.get(`${boardUrl}/lists`, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('archived') === 'true'
          ? []
          : [backlog],
      ),
    ),
    http.get(`${boardUrl}/cards`, () => HttpResponse.json([card])),
    http.get(`${boardUrl}/labels`, () => HttpResponse.json([])),
    http.get(`${apiOrigin}/api/v1/cards/${card.id}`, () =>
      HttpResponse.json(card),
    ),
    http.get(`${apiOrigin}/api/v1/cards/gone`, () =>
      HttpResponse.json(
        { type: '/problems/404', title: 'Error', status: 404, detail: '' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    ),
  );
}

function boardHeading() {
  return screen.findByRole('heading', { level: 1, name: 'Product launch' });
}

function searchBox() {
  return screen.findByRole<HTMLInputElement>('textbox', {
    name: 'Search this board…',
  });
}

describe('CardDetailPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows the board behind the card detail at /b/{id}/t/{cardId}', async () => {
    boardApi();
    renderApp({ route: `${boardPath}/t/${card.id}`, token: 'token' });

    expect(
      await screen.findByRole('dialog', { name: 'Write the brief' }),
    ).toBeTruthy();
    // The board is hidden from the accessibility tree while the modal is open.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Product launch',
        hidden: true,
      }),
    ).toBeTruthy();
  });

  it('keeps the board filters after the detail closes', async () => {
    boardApi();
    const { router } = renderApp({ route: boardPath, token: 'token' });

    await boardHeading();
    fireEvent.change(await searchBox(), { target: { value: 'brief' } });

    await router.navigate(`${boardPath}/t/${card.id}`);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Close', hidden: true }),
    );

    await boardHeading();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(router.state.location.pathname).toBe(boardPath);
    expect((await searchBox()).value).toBe('brief');
  });

  it.each([
    ['handles', boardPath, false],
    ['ignores', `${boardPath}/t/${card.id}`, true],
  ])(
    '%s the board shortcuts n and / at %s',
    async (_verb, route, notHandled) => {
      boardApi();
      renderApp({ route, token: 'token' });

      await screen.findByRole('heading', {
        level: 1,
        name: 'Product launch',
        hidden: true,
      });
      await screen.findAllByText('Write the brief');

      expect(fireEvent.keyDown(document.body, { key: '/' })).toBe(notHandled);
      expect(fireEvent.keyDown(document.body, { key: 'n' })).toBe(notHandled);
    },
  );

  it('shows the not-found block over the board for an unknown card', async () => {
    boardApi();
    renderApp({ route: `${boardPath}/t/gone`, token: 'token' });

    expect(await screen.findByText('This task no longer exists')).toBeTruthy();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Product launch',
        hidden: true,
      }),
    ).toBeTruthy();
  });
  it('returns focus to the tile after Esc closes the detail', async () => {
    boardApi();
    const { router } = renderApp({ route: boardPath, token: 'token' });
    const tile = await screen.findByRole('button', { name: card.title });

    tile.focus();
    fireEvent.click(tile);
    const detail = await screen.findByRole('dialog', { name: card.title });
    fireEvent.keyDown(detail, { key: 'Escape' });

    await waitFor(() => expect(router.state.location.pathname).toBe(boardPath));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: card.title }),
      ),
    );
  });

  it('focuses the tile when a detail opened by URL closes', async () => {
    boardApi();
    renderApp({ route: `${boardPath}/t/${card.id}`, token: 'token' });
    await screen.findByRole('dialog', { name: card.title });
    await screen.findByRole('button', { name: card.title, hidden: true });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Close', hidden: true }),
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: card.title }),
      ),
    );
  });
});
