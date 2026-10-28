import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardScreen } from '@/features/board';
import type { Board, Card, List } from '@/features/board/model/types';
import { apiOrigin } from '@/shared/config';

import {
  boardFixture,
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const boardUrl = `${apiOrigin}/api/v1/boards/${boardId}`;
const archivedStamp = '2026-10-20T12:00:00.000Z';

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

type Seed = { board: Board; lists: List[]; cards: Card[] };

// A small in-memory API for one board: the reads answer from `seed`, and the
// writes the screen sends change it, so a refetch sees them.
function boardApi(board: Board = boardFixture()) {
  const seed: Seed = {
    board,
    lists: [
      listFixture('l1', { title: 'Backlog', position: 0 }),
      listFixture('l2', { title: 'Doing', position: 1 }),
    ],
    cards: [
      cardFixture('c1', 'l1', { title: 'Write the brief' }),
      cardFixture('c2', 'l2', { title: 'Book the venue' }),
    ],
  };
  const archived = (request: Request) =>
    new URL(request.url).searchParams.get('archived') === 'true';
  function setArchived(id: string, archivedAt: string | null) {
    const list = seed.lists.find((l) => l.id === id)!;
    list.archivedAt = archivedAt;
    return HttpResponse.json(list);
  }
  server.use(
    http.get(boardUrl, () => HttpResponse.json(seed.board)),
    http.get(`${boardUrl}/lists`, ({ request }) =>
      HttpResponse.json(
        seed.lists.filter((l) => (l.archivedAt !== null) === archived(request)),
      ),
    ),
    http.get(`${boardUrl}/cards`, ({ request }) =>
      HttpResponse.json(
        seed.cards.filter((c) => (c.archivedAt !== null) === archived(request)),
      ),
    ),
    http.get(`${boardUrl}/labels`, () => HttpResponse.json([])),
    http.get(`${apiOrigin}/api/v1/lists/:id/cards`, ({ params }) =>
      HttpResponse.json(seed.cards.filter((c) => c.listId === params.id)),
    ),
    http.post(`${boardUrl}/lists`, async ({ request }) => {
      const { title } = (await request.json()) as { title: string };
      const list = listFixture('l3', { title, position: 2 });
      seed.lists.push(list);
      return HttpResponse.json(list, { status: 201 });
    }),
    http.post(
      `${apiOrigin}/api/v1/lists/:id/cards`,
      async ({ request, params }) => {
        const { title } = (await request.json()) as { title: string };
        const card = cardFixture('c3', params.id as string, {
          title,
          position: 1,
        });
        seed.cards.push(card);
        return HttpResponse.json(card, { status: 201 });
      },
    ),
    http.post(`${apiOrigin}/api/v1/lists/:id/archive`, ({ params }) =>
      setArchived(params.id as string, archivedStamp),
    ),
    http.post(`${apiOrigin}/api/v1/lists/:id/unarchive`, ({ params }) =>
      setArchived(params.id as string, null),
    ),
    http.post(`${boardUrl}/unarchive`, () => {
      seed.board = { ...seed.board, archivedAt: null };
      return HttpResponse.json(seed.board);
    }),
  );
  return seed;
}

function renderScreen() {
  return renderApp({
    route: `/b/${boardId}`,
    token: 'token',
    routes: [
      { path: '/b/:boardId', element: <BoardScreen boardId={boardId} /> },
    ],
  });
}

function column(name: string) {
  return screen.getByRole('region', { name });
}

describe('BoardScreen', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('shows the skeleton, then the board with its columns and cards in order', async () => {
    boardApi();
    renderScreen();

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Product launch' }),
    ).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    const regions = within(screen.getByTestId('board-columns')).getAllByRole(
      'region',
    );
    expect(regions.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Backlog',
      'Doing',
    ]);
    expect(within(column('Backlog')).getByText('Write the brief')).toBeTruthy();
    expect(within(column('Doing')).getByText('Book the venue')).toBeTruthy();
    expect(screen.queryByText('Board archived · read-only')).toBeNull();
  });

  it('shows the load error after a 500 and loads the board on retry', async () => {
    // 5xx is retried with backoff; fake timers skip the waits.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    boardApi();
    let failing = true;
    server.use(http.get(boardUrl, () => (failing ? problem(500) : undefined)));
    renderScreen();

    await vi.advanceTimersByTimeAsync(10_000);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Couldn’t load')).toBeTruthy();

    failing = false;
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Product launch' }),
    ).toBeTruthy();
  });

  it('shows Board not found on a 404', async () => {
    boardApi();
    server.use(http.get(boardUrl, () => problem(404)));
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Board not found' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Back to My boards' })
        .getAttribute('href'),
    ).toBe('/boards');
  });

  it('creates a column', async () => {
    boardApi();
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Add column' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Column name' }), {
      target: { value: 'Done' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add column' }));

    expect(await screen.findByRole('region', { name: 'Done' })).toBeTruthy();
    expect(await screen.findByText('Column created')).toBeTruthy();
  });

  it('creates a card in a column', async () => {
    boardApi();
    renderScreen();
    await screen.findByRole('region', { name: 'Doing' });
    fireEvent.click(
      within(column('Doing')).getByRole('button', { name: 'Add task' }),
    );

    fireEvent.change(
      within(column('Doing')).getByRole('textbox', { name: 'Task title' }),
      { target: { value: 'Send invites' } },
    );
    fireEvent.click(
      within(column('Doing')).getByRole('button', { name: 'Add' }),
    );

    expect(
      await within(column('Doing')).findByText('Send invites'),
    ).toBeTruthy();
    expect(await screen.findByText('Task created')).toBeTruthy();
  });

  it('archives a column and restores it from Show archived', async () => {
    boardApi();
    renderScreen();
    await screen.findByRole('region', { name: 'Doing' });

    fireEvent.click(
      within(column('Doing')).getByRole('button', { name: 'Column actions' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Doing' })).toBeNull(),
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Show archived' }));
    const section = await screen.findByRole('region', {
      name: 'Archived columns',
    });
    const item = await within(section).findByRole('listitem', {
      name: 'Doing',
    });
    fireEvent.click(within(item).getByRole('button', { name: 'Restore' }));

    expect(await screen.findByText('Column restored')).toBeTruthy();
    expect(
      within(screen.getByTestId('board-columns')).getByRole('region', {
        name: 'Doing',
      }),
    ).toBeTruthy();
  });

  it('opens the delete dialog once the card count loads and deletes the column', async () => {
    const seed = boardApi();
    seed.lists[1].archivedAt = archivedStamp;
    let releaseCounts = () => {};
    const countsLoaded = new Promise<void>((resolve) => {
      releaseCounts = resolve;
    });
    server.use(
      http.get(`${apiOrigin}/api/v1/lists/:id/cards`, async ({ params }) => {
        await countsLoaded;
        return HttpResponse.json(
          seed.cards.filter((c) => c.listId === params.id),
        );
      }),
      http.delete(`${apiOrigin}/api/v1/lists/:id`, ({ params }) => {
        seed.lists = seed.lists.filter((l) => l.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderScreen();
    fireEvent.click(
      await screen.findByRole('switch', { name: 'Show archived' }),
    );
    const item = await screen.findByRole('listitem', { name: 'Doing' });

    fireEvent.click(
      within(item).getByRole('button', { name: 'Delete permanently' }),
    );
    // "No tasks" would be wrong while the count is unknown.
    expect(screen.queryByRole('alertdialog')).toBeNull();

    releaseCounts();
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(
        'This deletes the column and its 1 task. It can’t be undone.',
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Delete permanently' }),
    );

    expect(await screen.findByText('Column permanently deleted')).toBeTruthy();
    expect(screen.queryByRole('listitem', { name: 'Doing' })).toBeNull();
  });

  it('rolls the done checkbox back when the change fails with 500', async () => {
    boardApi();
    server.use(http.patch(`${apiOrigin}/api/v1/cards/:id`, () => problem(500)));
    renderScreen();
    await screen.findByRole('region', { name: 'Backlog' });
    const done = within(column('Backlog')).getByRole('checkbox', {
      name: 'Completed',
    });

    fireEvent.click(done);

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        within(column('Backlog')).getByRole<HTMLInputElement>('checkbox', {
          name: 'Completed',
        }).checked,
      ).toBe(false),
    );
  });

  it('shows the read-only banner on an archived board and restores it', async () => {
    boardApi(boardFixture({ archivedAt: archivedStamp }));
    renderScreen();

    const banner = (
      await screen.findByText('Board archived · read-only')
    ).closest('output')!;
    expect(screen.queryByRole('button', { name: 'Add column' })).toBeNull();

    fireEvent.click(within(banner).getByRole('button', { name: 'Restore' }));

    expect(await screen.findByText('Board restored')).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText('Board archived · read-only')).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Add column' })).toBeTruthy();
  });
});
