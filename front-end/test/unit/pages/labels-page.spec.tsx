import { cleanup, fireEvent, screen } from '@testing-library/react';
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

const otherBoardId = '22222222-2222-4222-8222-222222222222';
const backlog = listFixture('l1', { title: 'Backlog' });
const card = cardFixture('c1', backlog.id, { title: 'Write the brief' });

function respondBoard(id: string, title: string) {
  const url = `${apiOrigin}/api/v1/boards/${id}`;
  server.use(
    http.get(url, () => HttpResponse.json(boardFixture({ id, title }))),
    http.get(`${url}/lists`, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('archived') === 'true'
          ? []
          : [backlog],
      ),
    ),
    http.get(`${url}/cards`, () => HttpResponse.json([card])),
    http.get(`${url}/labels`, () => HttpResponse.json([])),
    http.get(`${apiOrigin}/api/v1/cards/${card.id}`, () =>
      HttpResponse.json(card),
    ),
    http.get(`${apiOrigin}/api/v1/cards/:id/checklist-items`, () =>
      HttpResponse.json([]),
    ),
  );
}

// The placeholder is a bare heading; the real screen also has the subtitle.
async function labelsSubtitle(board: string) {
  await screen.findByRole('heading', { level: 1, name: 'Labels' });
  return screen.findByText(`${board} · Apply to this board only.`);
}

describe('LabelsPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders the labels screen at /b/{id}/labels', async () => {
    respondBoard(boardId, 'Product launch');
    renderApp({ route: `/b/${boardId}/labels`, token: 'token' });

    expect(await labelsSubtitle('Product launch')).toBeTruthy();
  });

  it('opens from the board menu entry Board labels', async () => {
    respondBoard(boardId, 'Product launch');
    renderApp({ route: `/b/${boardId}`, token: 'token' });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Board actions' }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Board labels' }),
    );

    expect(await labelsSubtitle('Product launch')).toBeTruthy();
  });

  it('opens from the Manage labels link of the card label popover', async () => {
    respondBoard(boardId, 'Product launch');
    renderApp({ route: `/b/${boardId}/t/${card.id}`, token: 'token' });

    fireEvent.click(await screen.findByRole('button', { name: 'Add label' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Manage labels' }));

    expect(await labelsSubtitle('Product launch')).toBeTruthy();
  });

  it('resets the screen state when moving to another board', async () => {
    respondBoard(boardId, 'Product launch');
    respondBoard(otherBoardId, 'Travel');
    const { router } = renderApp({
      route: `/b/${boardId}/labels`,
      token: 'token',
    });

    fireEvent.click(await screen.findByRole('button', { name: 'New label' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    await router.navigate(`/b/${otherBoardId}/labels`);

    expect(await labelsSubtitle('Travel')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
