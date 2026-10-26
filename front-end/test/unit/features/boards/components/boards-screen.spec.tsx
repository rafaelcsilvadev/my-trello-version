import type { Board } from '@my-trello/api-contract';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardsScreen } from '@/features/boards';
import { apiOrigin } from '@/shared/config';

import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const boardsUrl = `${apiOrigin}/api/v1/boards`;

const roadmap: Board = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  title: 'Roadmap',
  description: 'Q4 plans',
  archivedAt: null,
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
};
const travel: Board = {
  ...roadmap,
  id: '3f1c2b7a-8d4e-4b6f-a5c9-2e7d1a0b9c8f',
  title: 'Travel',
  description: null,
};
const oldPlans: Board = {
  ...roadmap,
  id: '9b2d4a1e-3c5f-4e8a-9d7b-1f6e2c8a4b3d',
  title: 'Old plans',
  archivedAt: '2026-10-24T12:00:00.000Z',
};

// Answers the active and archived lists apart, so a test can see which one was requested.
function respondLists(active: Board[], archived: Board[]) {
  server.use(
    http.get(boardsUrl, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('archived') === 'true'
          ? archived
          : active,
      ),
    ),
  );
}

function renderScreen(route = '/boards') {
  return renderApp({
    route,
    token: 'token',
    routes: [
      {
        path: '/boards',
        element: <BoardsScreen onCreated={vi.fn<(id: string) => void>()} />,
      },
    ],
  });
}

function problem(
  status: number,
  errors?: { field: string; message: string }[],
) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '', errors },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

async function openEditDialog() {
  await screen.findByRole('link', { name: /Roadmap/ });
  fireEvent.click(screen.getByRole('button', { name: 'Board actions' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
  return screen.findByRole('dialog', { name: 'Edit board' });
}

function textbox(dialog: HTMLElement, name: string) {
  return within(dialog).getByRole<HTMLInputElement>('textbox', { name });
}

function cardTitles() {
  return within(screen.getByRole('list'))
    .getAllByRole('link')
    .map((link) => link.querySelector('span')?.textContent);
}

describe('BoardsScreen', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows the heading and the tabs with Active selected', async () => {
    respondLists([roadmap], []);
    renderScreen();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My boards' }),
    ).toBeTruthy();
    const active = screen.getByRole('tab', { name: 'Active' });
    expect(active.getAttribute('aria-selected')).toBe('true');
    expect(
      screen
        .getByRole('tab', { name: 'Archived' })
        .getAttribute('aria-selected'),
    ).toBe('false');
  });

  it('shows a skeleton while the list is loading', async () => {
    server.use(http.get(boardsUrl, () => delay('infinite')));
    renderScreen();

    await screen.findByRole('heading', { level: 1, name: 'My boards' });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows the active boards in the API order', async () => {
    respondLists([travel, roadmap], [oldPlans]);
    renderScreen();

    await screen.findByRole('link', { name: /Roadmap/ });
    expect(cardTitles()).toEqual(['Travel', 'Roadmap']);
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('shows the archived boards when Archived is selected', async () => {
    respondLists([roadmap], [oldPlans]);
    const { router } = renderScreen();
    await screen.findByRole('link', { name: /Roadmap/ });

    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }));

    await screen.findByRole('link', { name: /Old plans/ });
    expect(cardTitles()).toEqual(['Old plans']);
    expect(router.state.location.search).toBe('?archived=true');
  });

  it('shows the active empty state with a create button', async () => {
    respondLists([], []);
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Create your first board' }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'Create board' }),
    ).toHaveLength(2);
  });

  it('shows the archived empty state', async () => {
    respondLists([roadmap], []);
    renderScreen('/boards?archived=true');

    expect(await screen.findByText('No archived boards')).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Create your first board' }),
    ).toBeNull();
  });

  it.each([
    { route: '/boards', title: 'Roadmap' },
    { route: '/boards?archived=true', title: 'Old plans' },
  ])(
    'shows the load error on $route and Try again requests the list again',
    async ({ route, title }) => {
      let calls = 0;
      server.use(
        http.get(boardsUrl, ({ request }) => {
          calls += 1;
          if (calls === 1) {
            return HttpResponse.json(
              {
                type: '/problems/400',
                title: 'Error',
                status: 400,
                detail: '',
              },
              {
                status: 400,
                headers: { 'Content-Type': 'application/problem+json' },
              },
            );
          }
          return HttpResponse.json(
            new URL(request.url).searchParams.get('archived') === 'true'
              ? [oldPlans]
              : [roadmap],
          );
        }),
      );
      renderScreen(route);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('Couldn’t load');
      fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

      expect(
        await screen.findByRole('link', { name: new RegExp(title) }),
      ).toBeTruthy();
      expect(calls).toBe(2);
    },
  );

  it('shows Create board only on the Active tab', async () => {
    respondLists([roadmap], [oldPlans]);
    renderScreen();
    await screen.findByRole('link', { name: /Roadmap/ });
    expect(screen.getByRole('button', { name: 'Create board' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }));

    await screen.findByRole('link', { name: /Old plans/ });
    expect(screen.queryByRole('button', { name: 'Create board' })).toBeNull();
  });

  it('opens the New board dialog from Create board', async () => {
    respondLists([roadmap], []);
    renderScreen();
    await screen.findByRole('link', { name: /Roadmap/ });

    fireEvent.click(screen.getByRole('button', { name: 'Create board' }));

    expect(
      await screen.findByRole('dialog', { name: 'New board' }),
    ).toBeTruthy();
  });

  it('opens the delete dialog from an archived card menu', async () => {
    respondLists([], [oldPlans]);
    renderScreen('/boards?archived=true');
    await screen.findByRole('link', { name: /Old plans/ });

    fireEvent.click(screen.getByRole('button', { name: 'Board actions' }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete permanently' }),
    );

    expect(
      await screen.findByRole('alertdialog', {
        name: 'Delete the board Old plans permanently?',
      }),
    ).toBeTruthy();
  });

  it('shows the active empty state after archiving the last active board', async () => {
    let active = [roadmap];
    server.use(
      http.get(boardsUrl, ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get('archived') === 'true'
            ? []
            : active,
        ),
      ),
      http.post(`${boardsUrl}/${roadmap.id}/archive`, () => {
        active = [];
        return HttpResponse.json({
          ...roadmap,
          archivedAt: oldPlans.archivedAt,
        });
      }),
    );
    renderScreen();
    await screen.findByRole('link', { name: /Roadmap/ });

    fireEvent.click(screen.getByRole('button', { name: 'Board actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));

    expect(
      await screen.findByRole('heading', { name: 'Create your first board' }),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Roadmap/ })).toBeNull();
  });

  it('opens the edit dialog filled with the board and keeps its description when only the name changes', async () => {
    respondLists([roadmap], []);
    let body: unknown;
    server.use(
      http.patch(`${boardsUrl}/${roadmap.id}`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...roadmap, title: 'Roadmap 2027' });
      }),
    );
    renderScreen();

    const dialog = await openEditDialog();
    expect(textbox(dialog, 'Name').value).toBe('Roadmap');
    expect(textbox(dialog, 'Description (optional)').value).toBe('Q4 plans');
    expect(within(dialog).getByText('8 / 1000')).toBeTruthy();

    fireEvent.change(textbox(dialog, 'Name'), {
      target: { value: 'Roadmap 2027' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await screen.findByText('Board saved');
    expect(body).toEqual({ title: 'Roadmap 2027', description: 'Q4 plans' });
  });

  it('reopens the edit dialog with the submitted values after a 400', async () => {
    respondLists([roadmap], []);
    server.use(
      http.patch(`${boardsUrl}/${roadmap.id}`, () =>
        problem(400, [{ field: 'description', message: 'too long' }]),
      ),
    );
    renderScreen();
    const dialog = await openEditDialog();
    fireEvent.change(textbox(dialog, 'Name'), {
      target: { value: 'Roadmap 2027' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    const reopened = await screen.findByRole('dialog', { name: 'Edit board' });
    expect(
      await within(reopened).findByText('Use up to 1000 characters'),
    ).toBeTruthy();
    expect(textbox(reopened, 'Name').value).toBe('Roadmap 2027');
    expect(textbox(reopened, 'Description (optional)').value).toBe('Q4 plans');
  });

  it('disables the card menu while its change is in flight', async () => {
    respondLists([roadmap], []);
    server.use(
      http.patch(`${boardsUrl}/${roadmap.id}`, () => delay('infinite')),
    );
    renderScreen();
    const dialog = await openEditDialog();
    fireEvent.change(textbox(dialog, 'Name'), {
      target: { value: 'Roadmap 2027' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await screen.findByRole('link', { name: /Roadmap 2027/ });
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Board actions' })
          .hasAttribute('disabled'),
      ).toBe(true),
    );
  });

  it('shows Creating… on a disabled submit button while the create is in flight', async () => {
    respondLists([roadmap], []);
    server.use(http.post(boardsUrl, () => delay('infinite')));
    renderScreen();
    await screen.findByRole('link', { name: /Roadmap/ });
    fireEvent.click(screen.getByRole('button', { name: 'Create board' }));
    const dialog = await screen.findByRole('dialog', { name: 'New board' });
    fireEvent.change(textbox(dialog, 'Name'), { target: { value: 'Travel' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    const button = await within(dialog).findByRole('button', {
      name: 'Creating…',
    });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
