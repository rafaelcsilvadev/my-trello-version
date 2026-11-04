import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LabelsScreen } from '@/features/board';
import type { Board, Card, Label } from '@/features/board/model/types';
import { apiOrigin } from '@/shared/config';

import {
  boardFixture,
  boardId,
  cardFixture,
  labelFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const boardUrl = `${apiOrigin}/api/v1/boards/${boardId}`;

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

type Seed = { board: Board; labels: Label[]; cards: Card[] };

// A small in-memory API for the board's labels: reads answer from `seed` and
// the writes the screen sends change it, so a refetch sees them.
function labelsApi(overrides: Partial<Seed> = {}) {
  const seed: Seed = {
    board: boardFixture(),
    labels: [
      labelFixture('l1', { name: 'Urgent', color: 'red' }),
      labelFixture('l2', { name: 'Bug', color: 'blue' }),
    ],
    cards: [
      cardFixture('c1', 'list-1', { labelIds: ['l1'] }),
      cardFixture('c2', 'list-1', { labelIds: ['l1'] }),
    ],
    ...overrides,
  };
  const archived = (request: Request) =>
    new URL(request.url).searchParams.get('archived') === 'true';
  server.use(
    http.get(boardUrl, () => HttpResponse.json(seed.board)),
    http.get(`${boardUrl}/labels`, () => HttpResponse.json(seed.labels)),
    http.get(`${boardUrl}/cards`, ({ request }) =>
      HttpResponse.json(archived(request) ? [] : seed.cards),
    ),
    http.get(`${boardUrl}/lists`, () => HttpResponse.json([])),
    http.post(`${boardUrl}/labels`, async ({ request }) => {
      const body = (await request.json()) as Pick<Label, 'name' | 'color'>;
      const label = labelFixture('l3', body);
      seed.labels.push(label);
      return HttpResponse.json(label, { status: 201 });
    }),
    http.patch(
      `${apiOrigin}/api/v1/labels/:id`,
      async ({ request, params }) => {
        const body = (await request.json()) as Partial<Label>;
        const label = seed.labels.find((l) => l.id === params.id)!;
        Object.assign(label, body);
        return HttpResponse.json(label);
      },
    ),
    http.delete(`${apiOrigin}/api/v1/labels/:id`, ({ params }) => {
      seed.labels = seed.labels.filter((l) => l.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return seed;
}

function renderScreen(prefs?: Parameters<typeof renderApp>[0]['prefs']) {
  return renderApp({
    route: `/b/${boardId}/labels`,
    token: 'token',
    prefs,
    routes: [
      {
        path: '/b/:boardId/labels',
        element: <LabelsScreen boardId={boardId} />,
      },
      { path: '/b/:boardId', element: <p>Board stub</p> },
    ],
  });
}

function rowNames() {
  return screen
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent);
}

async function newLabelButton() {
  return screen.findByRole('button', { name: 'New label' });
}

describe('LabelsScreen', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('shows the heading, the subtitle, the rows and the create button', async () => {
    labelsApi();
    renderScreen();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Labels' }),
    ).toBeTruthy();
    expect(
      await screen.findByText('Product launch · Apply to this board only.'),
    ).toBeTruthy();
    expect(await screen.findByText('Urgent')).toBeTruthy();
    expect(screen.getByText('used in 2 tasks')).toBeTruthy();
    expect(screen.getByText('unused')).toBeTruthy();
    expect(await newLabelButton()).toBeTruthy();
  });

  it('shows the Portuguese heading and subtitle', async () => {
    labelsApi();
    renderScreen({ language: 'pt-BR' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Etiquetas' }),
    ).toBeTruthy();
    expect(
      await screen.findByText('Product launch · Valem só para este quadro.'),
    ).toBeTruthy();
  });

  it('shows the Portuguese load error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    labelsApi();
    server.use(http.get(`${boardUrl}/labels`, () => problem(500)));
    renderScreen({ language: 'pt-BR' });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(await screen.findByText('Não foi possível carregar')).toBeTruthy();
  });

  it('shows the skeleton while loading', async () => {
    labelsApi();
    renderScreen();

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await screen.findByText('Urgent');
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('shows the load error and retries the failed request', async () => {
    // 5xx is retried with backoff; fake timers skip the waits.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    labelsApi();
    let failing = true;
    server.use(
      http.get(`${boardUrl}/labels`, () =>
        failing ? problem(500) : HttpResponse.json([labelFixture('l1')]),
      ),
    );
    renderScreen();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(await screen.findByText('Couldn’t load')).toBeTruthy();
    failing = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Label l1')).toBeTruthy();
  });

  it('shows the board-not-found screen for an unknown board', async () => {
    server.use(http.get(boardUrl, () => problem(404)));
    labelsApi();
    server.use(http.get(boardUrl, () => problem(404)));
    renderScreen();

    expect(await screen.findByText('Board not found')).toBeTruthy();
  });

  it('shows the empty state when the board has no labels', async () => {
    labelsApi({ labels: [], cards: [] });
    renderScreen();

    expect(await screen.findByText('No labels yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New label' })).toBeTruthy();
  });

  it('creates a label at the end of the list with a toast', async () => {
    labelsApi();
    renderScreen();
    await userEvent.click(await newLabelButton());

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Docs');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Create label' }),
    );

    expect(await screen.findByText('Label created')).toBeTruthy();
    await waitFor(() => expect(rowNames()).toEqual(['Urgent', 'Bug', 'Docs']));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(await newLabelButton());
  });

  it('edits a label and returns focus to its edit button', async () => {
    labelsApi();
    renderScreen();
    const edit = await screen.findByRole('button', {
      name: 'Edit label Bug',
    });
    await userEvent.click(edit);

    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Defect');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Label saved')).toBeTruthy();
    await waitFor(() => expect(rowNames()).toEqual(['Urgent', 'Defect']));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Edit label Defect' }),
      ),
    );
  });

  it('confirms with the count, deletes the row and focuses the create button', async () => {
    labelsApi();
    renderScreen();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete label Urgent' }),
    );

    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('It will be removed from 2 tasks.'),
    ).toBeTruthy();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => expect(rowNames()).toEqual(['Bug']));
    expect(await screen.findByText('Label deleted')).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'New label' }),
      ),
    );
  });

  it('returns focus to the delete button when the dialog is cancelled', async () => {
    labelsApi();
    renderScreen();
    const remove = await screen.findByRole('button', {
      name: 'Delete label Bug',
    });
    await userEvent.click(remove);
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    );

    await waitFor(() => expect(document.activeElement).toBe(remove));
  });

  it('shows the empty state after the last label is deleted', async () => {
    labelsApi({ labels: [labelFixture('l1', { name: 'Only' })], cards: [] });
    renderScreen();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete label Only' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('No labels yet')).toBeTruthy();
  });

  describe('archived board', () => {
    it('shows the notice and the list without any write control', async () => {
      labelsApi({
        board: boardFixture({ archivedAt: '2026-10-20T12:00:00.000Z' }),
      });
      renderScreen();

      expect(await screen.findByText('Urgent')).toBeTruthy();
      expect(screen.getByText('Archived board · read-only')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'New label' })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Edit label/ })).toBeNull();
      expect(
        screen.queryByRole('button', { name: /^Delete label/ }),
      ).toBeNull();
    });
  });

  describe('Esc key', () => {
    it('returns to the board when no dialog is open', async () => {
      labelsApi();
      renderScreen();
      await screen.findByText('Urgent');

      await userEvent.keyboard('{Escape}');

      expect(await screen.findByText('Board stub')).toBeTruthy();
    });

    it('closes an open dialog and stays on the page', async () => {
      labelsApi();
      renderScreen();
      await userEvent.click(await newLabelButton());
      await screen.findByRole('dialog');

      await userEvent.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.queryByText('Board stub')).toBeNull();
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    });
  });

  it('shows the name-taken message when the server answers 409 label-name-taken', async () => {
    labelsApi();
    server.use(
      http.post(`${boardUrl}/labels`, () =>
        HttpResponse.json(
          {
            type: '/problems/label-name-taken',
            title: 'Conflict',
            status: 409,
            detail: '',
          },
          {
            status: 409,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );
    renderScreen({ language: 'pt-BR' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nova etiqueta' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Docs');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Criar etiqueta' }),
    );

    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'Já existe uma etiqueta com esse nome neste quadro',
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('links the phone back arrow to the board', async () => {
    labelsApi();
    renderScreen();

    const back = await screen.findByRole('link', { name: 'Back to the board' });
    expect(back.getAttribute('href')).toBe(`/b/${boardId}`);
  });
});
