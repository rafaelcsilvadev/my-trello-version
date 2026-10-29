import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBoardViewModel } from '@/features/board/view-models/use-board-view-model';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import {
  boardFixture,
  boardId,
  cardFixture,
  labelFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const boardUrl = `${baseUrl}/api/v1/boards/${boardId}`;
const listsUrl = `${boardUrl}/lists`;
const cardsUrl = `${boardUrl}/cards`;
const labelsUrl = `${boardUrl}/labels`;

const backlog = listFixture('l1', { title: 'Backlog', position: 1 });
const doing = listFixture('l2', { title: 'Doing', position: 0 });
const urgent = labelFixture('lb1', { name: 'Urgent', color: 'red' });

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

const archivedListsUrl = `${listsUrl}?archived=true`;
const archivedCardsUrl = `${cardsUrl}?archived=true`;
const listCardsUrl = `${baseUrl}/api/v1/lists/:listId/cards`;

const oldStamp = '2026-10-02T12:00:00.000Z';
const newStamp = '2026-10-20T12:00:00.000Z';
const ideas = listFixture('l3', { title: 'Ideas', archivedAt: oldStamp });
const later = listFixture('l4', { title: 'Later', archivedAt: newStamp });

// `undefined` falls back to the seed.
type Reply = () => Response | undefined;

// Each endpoint answers with its seed unless a test overrides it; `requests` counts the hits.
// The archived requests are keyed by their `?archived=true` URL.
function boardServer(overrides: Partial<Record<string, Reply>> = {}) {
  const requests: Record<string, number> = {};
  const seed: Record<string, JsonBodyType> = {
    [boardUrl]: boardFixture(),
    [listsUrl]: [backlog, doing],
    [cardsUrl]: [
      cardFixture('c1', backlog.id, { position: 1 }),
      cardFixture('c2', backlog.id, { position: 0 }),
      cardFixture('c3', doing.id),
    ],
    [labelsUrl]: [urgent],
    [archivedListsUrl]: [ideas, later],
    [archivedCardsUrl]: [
      cardFixture('c7', ideas.id, { archivedAt: oldStamp }),
      cardFixture('c8', backlog.id, { archivedAt: newStamp }),
    ],
  };
  function reply(url: string) {
    requests[url] = (requests[url] ?? 0) + 1;
    return overrides[url]?.() ?? HttpResponse.json(seed[url] ?? null);
  }
  server.use(
    ...[boardUrl, listsUrl, cardsUrl, labelsUrl].map((url) =>
      http.get(url, ({ request }) =>
        reply(
          new URL(request.url).searchParams.get('archived') === 'true'
            ? `${url}?archived=true`
            : url,
        ),
      ),
    ),
    // The active cards of one list, used by the archived column counts.
    http.get(listCardsUrl, ({ params }) => {
      requests[listCardsUrl] = (requests[listCardsUrl] ?? 0) + 1;
      return HttpResponse.json(
        params.listId === ideas.id
          ? [cardFixture('c5', ideas.id), cardFixture('c6', ideas.id)]
          : [],
      );
    }),
  );
  return requests;
}

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  // Keeps the retry policy but skips its backoff, so a 5xx fails fast.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return renderHook(() => useBoardViewModel(boardId), { wrapper });
}

type ChangeRequest = { method: string; path: string; body: unknown };

// Records every column write; each one is answered by the next queued response, or by a success one.
function columnWrites(...responses: (() => Response | Promise<Response>)[]) {
  const changes: ChangeRequest[] = [];
  async function answer(request: Request, success: () => Response) {
    const text = await request.text();
    changes.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: text ? JSON.parse(text) : undefined,
    });
    return (responses.shift() ?? success)();
  }
  server.use(
    http.post(listsUrl, ({ request }) =>
      answer(request, () =>
        HttpResponse.json(listFixture('l3', { title: 'To do', position: 2 }), {
          status: 201,
        }),
      ),
    ),
    http.patch(`${baseUrl}/api/v1/lists/:id`, ({ request }) =>
      answer(request, () => HttpResponse.json(backlog)),
    ),
    http.post(`${baseUrl}/api/v1/lists/:id/archive`, ({ request }) =>
      answer(request, () => HttpResponse.json(backlog)),
    ),
    http.post(`${baseUrl}/api/v1/lists/:id/unarchive`, ({ request }) =>
      answer(request, () => HttpResponse.json(ideas)),
    ),
    http.delete(`${baseUrl}/api/v1/lists/:id`, ({ request }) =>
      answer(request, () => new HttpResponse(null, { status: 204 })),
    ),
    http.post(`${boardUrl}/unarchive`, ({ request }) =>
      answer(request, () => HttpResponse.json(boardFixture())),
    ),
  );
  return changes;
}

// Records every card write, like `columnWrites`.
function cardWrites(...responses: (() => Response | Promise<Response>)[]) {
  const changes: ChangeRequest[] = [];
  async function answer(request: Request, success: () => Response) {
    const text = await request.text();
    changes.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: text ? JSON.parse(text) : undefined,
    });
    return (responses.shift() ?? success)();
  }
  server.use(
    http.post(`${baseUrl}/api/v1/lists/:id/cards`, ({ request }) =>
      answer(request, () =>
        HttpResponse.json(cardFixture('c4', backlog.id, { position: 2 }), {
          status: 201,
        }),
      ),
    ),
    http.patch(`${baseUrl}/api/v1/cards/:id`, ({ request }) =>
      answer(request, () => HttpResponse.json(cardFixture('c3', doing.id))),
    ),
  );
  return changes;
}

async function setupReady() {
  const view = setup();
  await waitFor(() => expect(view.result.current.state.status).toBe('ready'));
  return view;
}

function cardDone(result: ReturnType<typeof setup>['result'], id: string) {
  return result.current.state.columns
    .flatMap(({ cards }) => cards)
    .find((card) => card.id === id)?.done;
}

function pressN() {
  fireEvent.keyDown(document.body, { key: 'n' });
}

function columnTitles(result: ReturnType<typeof setup>['result']) {
  return result.current.state.columns.map(({ list }) => list.title);
}

// Holds a response until `open()`, so a test can look at the board mid-request.
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, wait: () => opened };
}

const saveFail = 'Não foi possível salvar. Tente novamente.';
const conflict = 'Este item foi arquivado. Recarregue para ver o estado atual.';
const titleError = [{ field: 'title', message: 'too long' }];

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('useBoardViewModel', () => {
  describe('load', () => {
    it('is loading until every board query answers, then ready', async () => {
      boardServer();
      const { result } = setup();

      expect(result.current.state.status).toBe('loading');

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.board?.title).toBe('Product launch');
    });

    it('builds the columns by position with their cards by position', async () => {
      boardServer();
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(
        result.current.state.columns.map(({ list, cards }) => [
          list.title,
          cards.map((card) => card.id),
        ]),
      ).toEqual([
        ['Doing', ['c3']],
        ['Backlog', ['c2', 'c1']],
      ]);
    });

    it('indexes the board labels by id', async () => {
      boardServer();
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.labelsById.get('lb1')).toEqual(urgent);
    });

    it('treats the local calendar date as today', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 1, 23, 30));
      boardServer();
      const { result } = setup();

      expect(result.current.state.today).toEqual({
        year: 2026,
        month: 11,
        day: 1,
      });
    });

    it.each([boardUrl, listsUrl, cardsUrl])(
      'is notFound when %s answers 404',
      async (url) => {
        boardServer({ [url]: () => problem(404) });
        const { result } = setup();

        await waitFor(() =>
          expect(result.current.state.status).toBe('notFound'),
        );
      },
    );

    it('is error when a query keeps failing with 500', async () => {
      boardServer({ [cardsUrl]: () => problem(500) });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('error'));
    });

    it('prefers notFound over error when both happen', async () => {
      boardServer({
        [boardUrl]: () => problem(404),
        [labelsUrl]: () => problem(500),
      });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('notFound'));
    });

    it('retryLoad refetches only the failed queries and turns ready', async () => {
      let failing = true;
      const requests = boardServer({
        [cardsUrl]: () => (failing ? problem(500) : HttpResponse.json([])),
      });
      const { result } = setup();
      await waitFor(() => expect(result.current.state.status).toBe('error'));
      const before = { ...requests };

      failing = false;
      act(() => result.current.actions.retryLoad());

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(requests[cardsUrl]).toBe(before[cardsUrl] + 1);
      expect(requests[boardUrl]).toBe(before[boardUrl]);
      expect(requests[listsUrl]).toBe(before[listsUrl]);
      expect(requests[labelsUrl]).toBe(before[labelsUrl]);
    });

    it('stays ready with the cached board when a refetch after a failed write fails', async () => {
      let down = false;
      const requests = boardServer({
        [cardsUrl]: () => (down ? problem(500) : undefined),
      });
      cardWrites(() => problem(500));
      const { result } = await setupReady();
      const before = requests[cardsUrl];
      const card = result.current.state.columns[0].cards[0];

      down = true;
      act(() => result.current.actions.toggleDone(card));

      // One refetch plus the three retries of the query client.
      await waitFor(() => expect(requests[cardsUrl]).toBe(before + 4));
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
      expect(cardDone(result, 'c3')).toBe(false);
      expect(result.current.state.status).toBe('ready');
      expect(columnTitles(result)).toEqual(['Doing', 'Backlog']);
    });

    it('is notFound when a refetch after a failed write answers 404', async () => {
      let deleted = false;
      boardServer({ [boardUrl]: () => (deleted ? problem(404) : undefined) });
      cardWrites(() => problem(500));
      const { result } = await setupReady();
      const card = result.current.state.columns[0].cards[0];

      deleted = true;
      act(() => result.current.actions.toggleDone(card));

      await waitFor(() => expect(result.current.state.status).toBe('notFound'));
    });
  });

  describe('read-only', () => {
    it('is not read-only for an active board', async () => {
      boardServer();
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.readOnly).toBe(false);
    });

    it('is read-only for an archived board', async () => {
      boardServer({
        [boardUrl]: () =>
          HttpResponse.json(
            boardFixture({ archivedAt: '2026-10-24T12:00:00.000Z' }),
          ),
      });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.readOnly).toBe(true);
    });
  });

  describe('column actions', () => {
    it('createList sends the trimmed title, toasts and resolves null', async () => {
      boardServer();
      const changes = columnWrites();
      const { result } = await setupReady();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.actions.createList('  To do  ');
      });

      expect(outcome).toBeNull();
      expect(changes).toEqual([
        {
          method: 'POST',
          path: new URL(listsUrl).pathname,
          body: { title: 'To do' },
        },
      ]);
      await screen.findByText('Coluna criada');
    });

    it.each([
      ['   ', 'columnNameRequired'],
      ['x'.repeat(101), 'columnNameTooLong'],
    ])('createList(%j) resolves %s and sends nothing', async (raw, error) => {
      boardServer();
      const changes = columnWrites();
      const { result } = await setupReady();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.actions.createList(raw);
      });

      expect(outcome).toBe(error);
      expect(changes).toEqual([]);
    });

    it('createList resolves the field error of a 400 with no toast', async () => {
      boardServer();
      columnWrites(() => problem(400, titleError));
      const { result } = await setupReady();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.actions.createList('To do');
      });

      expect(outcome).toBe('columnNameTooLong');
      expect(screen.queryByText(saveFail)).toBeNull();
    });

    it('createList rejects on 500 and its retry resends the same title', async () => {
      boardServer();
      const changes = columnWrites(() => problem(500));
      const { result } = await setupReady();

      await act(async () => {
        await expect(
          result.current.actions.createList(' To do '),
        ).rejects.toMatchObject({ status: 500 });
      });
      await screen.findByText(saveFail);

      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      await screen.findByText('Coluna criada');
      expect(changes.map(({ body }) => body)).toEqual([
        { title: 'To do' },
        { title: 'To do' },
      ]);
    });

    it('createList rejects on 409 with the reload toast', async () => {
      boardServer();
      columnWrites(() => problem(409));
      const { result } = await setupReady();

      await act(async () => {
        await expect(
          result.current.actions.createList('To do'),
        ).rejects.toMatchObject({ status: 409 });
      });

      await screen.findByText(conflict);
    });

    it('is creating a list while the create is in flight', async () => {
      boardServer();
      const held = gate();
      columnWrites(async () => {
        await held.wait();
        return HttpResponse.json(listFixture('l3'), { status: 201 });
      });
      const { result } = await setupReady();

      let pending!: Promise<unknown>;
      act(() => {
        pending = result.current.actions.createList('To do');
      });
      await waitFor(() =>
        expect(result.current.state.isCreatingList).toBe(true),
      );

      held.open();
      await act(async () => {
        await pending;
      });
      await waitFor(() =>
        expect(result.current.state.isCreatingList).toBe(false),
      );
    });

    it('startRename opens the rename field and cancelRename closes it', async () => {
      boardServer();
      const { result } = await setupReady();

      act(() => result.current.actions.startRename(backlog.id));
      expect(result.current.state.editing).toEqual({ listId: backlog.id });

      act(() => result.current.actions.cancelRename());
      expect(result.current.state.editing).toBeNull();
    });

    it('submitRename with an unchanged name closes the field and sends nothing', async () => {
      boardServer();
      const changes = columnWrites();
      const { result } = await setupReady();
      act(() => result.current.actions.startRename(backlog.id));

      let outcome: unknown;
      act(() => {
        outcome = result.current.actions.submitRename(backlog, ' Backlog ');
      });

      expect(outcome).toBeNull();
      expect(result.current.state.editing).toBeNull();
      // A later rename flushes a stray request the unchanged one could have sent.
      act(() => {
        result.current.actions.submitRename(doing, 'Done');
      });
      await waitFor(() => expect(changes).toHaveLength(1));
      expect(changes).toEqual([
        {
          method: 'PATCH',
          path: `/api/v1/lists/${doing.id}`,
          body: { title: 'Done' },
        },
      ]);
    });

    it('submitRename with an empty name keeps the field open and sends nothing', async () => {
      boardServer();
      const changes = columnWrites();
      const { result } = await setupReady();
      act(() => result.current.actions.startRename(backlog.id));

      let outcome: unknown;
      act(() => {
        outcome = result.current.actions.submitRename(backlog, '  ');
      });

      expect(outcome).toBe('columnNameRequired');
      expect(result.current.state.editing).toEqual({ listId: backlog.id });
      expect(changes).toEqual([]);
    });

    it('submitRename shows the new name at once, sends it and toasts', async () => {
      boardServer();
      const held = gate();
      const changes = columnWrites(async () => {
        await held.wait();
        return HttpResponse.json(backlog);
      });
      const { result } = await setupReady();
      act(() => result.current.actions.startRename(backlog.id));

      act(() => {
        result.current.actions.submitRename(backlog, ' Ideas ');
      });

      expect(result.current.state.editing).toBeNull();
      await waitFor(() =>
        expect(columnTitles(result)).toEqual(['Doing', 'Ideas']),
      );
      held.open();
      await screen.findByText('Coluna renomeada');
      expect(changes).toEqual([
        {
          method: 'PATCH',
          path: `/api/v1/lists/${backlog.id}`,
          body: { title: 'Ideas' },
        },
      ]);
    });

    it('submitRename reopens the field with the sent text on a 400', async () => {
      boardServer();
      columnWrites(() => problem(400, titleError));
      const { result } = await setupReady();
      act(() => result.current.actions.startRename(backlog.id));

      act(() => {
        result.current.actions.submitRename(backlog, 'Ideas');
      });

      await waitFor(() =>
        expect(result.current.state.editing).toEqual({
          listId: backlog.id,
          value: 'Ideas',
          error: 'columnNameTooLong',
        }),
      );
      expect(screen.queryByText(saveFail)).toBeNull();
    });

    it('archiveList removes the column at once and toasts', async () => {
      boardServer();
      const held = gate();
      const changes = columnWrites(async () => {
        await held.wait();
        return HttpResponse.json(backlog);
      });
      const { result } = await setupReady();

      act(() => result.current.actions.archiveList(backlog.id));

      await waitFor(() => expect(columnTitles(result)).toEqual(['Doing']));
      held.open();
      await screen.findByText('Coluna arquivada');
      expect(changes).toEqual([
        {
          method: 'POST',
          path: `/api/v1/lists/${backlog.id}/archive`,
          body: undefined,
        },
      ]);
    });

    it.each([
      [409, conflict, ['Recarregar']],
      [404, saveFail, []],
      [500, saveFail, ['Tentar novamente']],
    ])(
      'archiveList puts the column back on %i and toasts %j',
      async (status, message, actions) => {
        boardServer();
        columnWrites(() => problem(status));
        const { result } = await setupReady();

        act(() => result.current.actions.archiveList(backlog.id));

        await screen.findByText(message);
        await waitFor(() =>
          expect(columnTitles(result)).toEqual(['Doing', 'Backlog']),
        );
        expect(
          ['Recarregar', 'Tentar novamente'].filter(
            (name) => screen.queryByRole('button', { name }) !== null,
          ),
        ).toEqual(actions);
      },
    );

    // The mutation's own settle refetch finishes before the toast shows, so the
    // reload is the only refetch counted after it.
    it('Recarregar refetches every board query after a 409', async () => {
      const requests = boardServer();
      columnWrites(() => problem(409));
      const { result } = await setupReady();

      act(() => result.current.actions.archiveList(backlog.id));
      await screen.findByText(conflict);
      const before = { ...requests };
      fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));

      for (const url of [boardUrl, listsUrl, cardsUrl, labelsUrl]) {
        await waitFor(() => expect(requests[url]).toBe(before[url] + 1));
      }
    });

    it('refetches every board query on its own after a 404', async () => {
      const requests = boardServer();
      columnWrites(() => problem(404));
      const { result } = await setupReady();
      const loaded = { ...requests };

      act(() => result.current.actions.archiveList(backlog.id));
      await screen.findByText(saveFail);

      // One settle refetch plus the reload.
      for (const url of [boardUrl, listsUrl, cardsUrl, labelsUrl]) {
        await waitFor(() => expect(requests[url]).toBe(loaded[url] + 2));
      }
    });
  });

  describe('card actions', () => {
    it('openAddCard opens the card field in that column and closeAddCard closes it', async () => {
      boardServer();
      const { result } = await setupReady();

      expect(result.current.state.addingCardListId).toBeNull();
      act(() => result.current.actions.openAddCard(backlog.id));
      expect(result.current.state.addingCardListId).toBe(backlog.id);

      act(() => result.current.actions.closeAddCard());
      expect(result.current.state.addingCardListId).toBeNull();
    });

    it('createCard sends the trimmed title, toasts, keeps the field open and resolves null', async () => {
      boardServer();
      const changes = cardWrites();
      const { result } = await setupReady();
      act(() => result.current.actions.openAddCard(backlog.id));

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.actions.createCard(
          backlog.id,
          '  Write tests  ',
        );
      });

      expect(outcome).toBeNull();
      expect(changes).toEqual([
        {
          method: 'POST',
          path: `/api/v1/lists/${backlog.id}/cards`,
          body: { title: 'Write tests' },
        },
      ]);
      await screen.findByText('Tarefa criada');
      expect(result.current.state.addingCardListId).toBe(backlog.id);
    });

    it.each([
      ['   ', 'cardTitleRequired'],
      ['x'.repeat(101), 'cardTitleTooLong'],
    ])('createCard(%j) resolves %s and sends nothing', async (raw, error) => {
      boardServer();
      const changes = cardWrites();
      const { result } = await setupReady();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.actions.createCard(backlog.id, raw);
      });

      expect(outcome).toBe(error);
      expect(changes).toEqual([]);
    });

    it('createCard resolves the field error of a 400 with no toast', async () => {
      boardServer();
      cardWrites(() => problem(400, titleError));
      const { result } = await setupReady();

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.actions.createCard(backlog.id, 'Ship');
      });

      expect(outcome).toBe('cardTitleTooLong');
      expect(screen.queryByText(saveFail)).toBeNull();
    });

    it('createCard rejects on 500 and its retry resends the same title', async () => {
      boardServer();
      const changes = cardWrites(() => problem(500));
      const { result } = await setupReady();

      await act(async () => {
        await expect(
          result.current.actions.createCard(backlog.id, ' Ship '),
        ).rejects.toMatchObject({ status: 500 });
      });
      await screen.findByText(saveFail);

      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      await screen.findByText('Tarefa criada');
      expect(changes.map(({ path, body }) => [path, body])).toEqual([
        [`/api/v1/lists/${backlog.id}/cards`, { title: 'Ship' }],
        [`/api/v1/lists/${backlog.id}/cards`, { title: 'Ship' }],
      ]);
    });

    it('createCard rejects on 409 with the reload toast', async () => {
      boardServer();
      cardWrites(() => problem(409));
      const { result } = await setupReady();

      await act(async () => {
        await expect(
          result.current.actions.createCard(backlog.id, 'Ship'),
        ).rejects.toMatchObject({ status: 409 });
      });

      await screen.findByText(conflict);
    });

    it('is creating a card while the create is in flight', async () => {
      boardServer();
      const held = gate();
      cardWrites(async () => {
        await held.wait();
        return HttpResponse.json(cardFixture('c4', backlog.id), {
          status: 201,
        });
      });
      const { result } = await setupReady();

      let pending!: Promise<unknown>;
      act(() => {
        pending = result.current.actions.createCard(backlog.id, 'Ship');
      });
      await waitFor(() =>
        expect(result.current.state.isCreatingCard).toBe(true),
      );

      held.open();
      await act(async () => {
        await pending;
      });
      await waitFor(() =>
        expect(result.current.state.isCreatingCard).toBe(false),
      );
    });

    it('toggleDone shows the new state at once and sends { done }', async () => {
      boardServer();
      const held = gate();
      const changes = cardWrites(async () => {
        await held.wait();
        return HttpResponse.json(cardFixture('c3', doing.id, { done: true }));
      });
      const { result } = await setupReady();
      const card = result.current.state.columns[0].cards[0];

      act(() => result.current.actions.toggleDone(card));

      await waitFor(() => expect(cardDone(result, 'c3')).toBe(true));
      held.open();
      await waitFor(() =>
        expect(changes).toEqual([
          { method: 'PATCH', path: '/api/v1/cards/c3', body: { done: true } },
        ]),
      );
    });

    it('toggleDone on a done card shows it not done at once and sends { done: false }', async () => {
      boardServer({
        [cardsUrl]: () =>
          HttpResponse.json([cardFixture('c3', doing.id, { done: true })]),
      });
      const held = gate();
      const changes = cardWrites(async () => {
        await held.wait();
        return HttpResponse.json(cardFixture('c3', doing.id));
      });
      const { result } = await setupReady();
      const card = result.current.state.columns[0].cards[0];

      act(() => result.current.actions.toggleDone(card));

      await waitFor(() => expect(cardDone(result, 'c3')).toBe(false));
      held.open();
      await waitFor(() =>
        expect(changes).toEqual([
          { method: 'PATCH', path: '/api/v1/cards/c3', body: { done: false } },
        ]),
      );
    });

    it.each([
      [409, conflict, ['Recarregar']],
      [500, saveFail, ['Tentar novamente']],
    ])(
      'toggleDone puts the card back on %i and toasts %j',
      async (status, message, actions) => {
        boardServer();
        cardWrites(() => problem(status));
        const { result } = await setupReady();
        const card = result.current.state.columns[0].cards[0];

        act(() => result.current.actions.toggleDone(card));

        await screen.findByText(message);
        await waitFor(() => expect(cardDone(result, 'c3')).toBe(false));
        expect(
          ['Recarregar', 'Tentar novamente'].filter(
            (name) => screen.queryByRole('button', { name }) !== null,
          ),
        ).toEqual(actions);
      },
    );

    it('the toggleDone retry resends the same done value', async () => {
      boardServer();
      const changes = cardWrites(() => problem(500));
      const { result } = await setupReady();
      const card = result.current.state.columns[0].cards[0];

      act(() => result.current.actions.toggleDone(card));
      await screen.findByText(saveFail);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      await waitFor(() => expect(changes).toHaveLength(2));
      expect(changes[1].body).toEqual({ done: true });
    });
  });

  describe('n shortcut', () => {
    it('opens the card field in the first column', async () => {
      boardServer();
      const { result } = await setupReady();

      act(() => pressN());

      expect(result.current.state.addingCardListId).toBe(doing.id);
    });

    it('does nothing on an archived board', async () => {
      boardServer({
        [boardUrl]: () =>
          HttpResponse.json(
            boardFixture({ archivedAt: '2026-10-24T12:00:00.000Z' }),
          ),
      });
      const { result } = await setupReady();

      act(() => pressN());

      expect(result.current.state.addingCardListId).toBeNull();
    });

    it('does nothing on a board with no columns', async () => {
      boardServer({ [listsUrl]: () => HttpResponse.json([]) });
      const { result } = await setupReady();

      act(() => pressN());

      expect(result.current.state.addingCardListId).toBeNull();
    });

    it('does nothing while the board is loading', async () => {
      const held = gate();
      boardServer();
      server.use(
        http.get(listsUrl, async () => {
          await held.wait();
          return HttpResponse.json([backlog]);
        }),
      );
      const { result } = setup();

      act(() => pressN());

      expect(result.current.state.addingCardListId).toBeNull();
      held.open();
      await waitFor(() => expect(result.current.state.status).toBe('ready'));
    });
  });

  describe('archived items', () => {
    async function setupShowingArchived() {
      const view = await setupReady();
      act(() => view.result.current.actions.setShowArchived(true));
      await waitFor(() =>
        expect(view.result.current.state.archived.columnsStatus).toBe('ready'),
      );
      return view;
    }

    function archivedTitles(result: ReturnType<typeof setup>['result']) {
      return result.current.state.archived.columns.map(
        ({ list }) => list.title,
      );
    }

    it('starts with archived items hidden and loads none of them', async () => {
      const requests = boardServer();
      const { result } = await setupReady();

      expect(result.current.state.showArchived).toBe(false);
      expect(requests[archivedListsUrl]).toBeUndefined();
      expect(requests[archivedCardsUrl]).toBeUndefined();
      expect(requests[listCardsUrl]).toBeUndefined();
    });

    it('loads the archived cards newest first with their column title once shown', async () => {
      boardServer();
      const { result } = await setupShowingArchived();

      expect(result.current.state.showArchived).toBe(true);
      expect(result.current.state.archived.cardsStatus).toBe('ready');
      expect(
        result.current.state.archived.cards.map(({ card, fromTitle }) => [
          card.id,
          fromTitle,
        ]),
      ).toEqual([
        ['c8', 'Backlog'],
        ['c7', 'Ideas'],
      ]);
    });

    it('loads the archived columns newest first with their active and archived cards counted', async () => {
      boardServer();
      const { result } = await setupShowingArchived();

      await waitFor(() =>
        expect(
          result.current.state.archived.columns.map(({ list, cardCount }) => [
            list.title,
            cardCount,
          ]),
        ).toEqual([
          ['Later', 0],
          ['Ideas', 3],
        ]),
      );
    });

    it('is error for the archived items without failing the board', async () => {
      boardServer({ [archivedListsUrl]: () => problem(500) });
      const { result } = await setupReady();

      act(() => result.current.actions.setShowArchived(true));

      await waitFor(() =>
        expect(result.current.state.archived.columnsStatus).toBe('error'),
      );
      expect(result.current.state.archived.cardsStatus).toBe('error');
      expect(result.current.state.status).toBe('ready');
    });

    it('restoreList moves the column to the end of the active ones and toasts', async () => {
      boardServer();
      const held = gate();
      const changes = columnWrites(async () => {
        await held.wait();
        return HttpResponse.json(ideas);
      });
      const { result } = await setupShowingArchived();

      act(() => result.current.actions.restoreList(ideas.id));

      await waitFor(() =>
        expect(columnTitles(result)).toEqual(['Doing', 'Backlog', 'Ideas']),
      );
      expect(archivedTitles(result)).toEqual(['Later']);
      held.open();
      await screen.findByText('Coluna restaurada');
      expect(changes).toEqual([
        {
          method: 'POST',
          path: `/api/v1/lists/${ideas.id}/unarchive`,
          body: undefined,
        },
      ]);
    });

    it('askDeleteList opens the dialog with the column and its count and sends nothing', async () => {
      boardServer();
      const changes = columnWrites();
      const { result } = await setupShowingArchived();

      act(() => result.current.actions.askDeleteList(ideas.id));

      await waitFor(() =>
        expect(result.current.state.deleteTarget).toEqual({
          list: ideas,
          cardCount: 3,
        }),
      );
      expect(changes).toEqual([]);
    });

    it('cancelDelete closes the dialog and sends nothing', async () => {
      boardServer();
      const changes = columnWrites();
      const { result } = await setupShowingArchived();
      act(() => result.current.actions.askDeleteList(ideas.id));

      act(() => result.current.actions.cancelDelete());

      expect(result.current.state.deleteTarget).toBeNull();
      expect(changes).toEqual([]);
    });

    it('confirmDeleteList closes the dialog, removes the column at once and toasts', async () => {
      boardServer();
      const held = gate();
      const changes = columnWrites(async () => {
        await held.wait();
        return new HttpResponse(null, { status: 204 });
      });
      const { result } = await setupShowingArchived();
      act(() => result.current.actions.askDeleteList(ideas.id));

      act(() => result.current.actions.confirmDeleteList());

      expect(result.current.state.deleteTarget).toBeNull();
      await waitFor(() => expect(archivedTitles(result)).toEqual(['Later']));
      held.open();
      await screen.findByText('Coluna excluída definitivamente');
      expect(changes).toEqual([
        {
          method: 'DELETE',
          path: `/api/v1/lists/${ideas.id}`,
          body: undefined,
        },
      ]);
    });

    it('confirmDeleteList puts the column back and toasts on 500', async () => {
      boardServer();
      columnWrites(() => problem(500));
      const { result } = await setupShowingArchived();
      act(() => result.current.actions.askDeleteList(ideas.id));

      act(() => result.current.actions.confirmDeleteList());

      await screen.findByText(saveFail);
      await waitFor(() =>
        expect(archivedTitles(result)).toEqual(['Later', 'Ideas']),
      );
    });

    it('marks the column with a change in flight as pending', async () => {
      boardServer();
      const held = gate();
      columnWrites(async () => {
        await held.wait();
        return HttpResponse.json(ideas);
      });
      const { result } = await setupShowingArchived();

      act(() => result.current.actions.restoreList(ideas.id));

      await waitFor(() =>
        expect([...result.current.state.pendingIds]).toEqual([ideas.id]),
      );
      held.open();
      await waitFor(() => expect(result.current.state.pendingIds.size).toBe(0));
    });
  });

  describe('board restore', () => {
    it('restoreBoard ends read-only at once, sends the request and toasts', async () => {
      boardServer({
        [boardUrl]: () =>
          HttpResponse.json(
            boardFixture({ archivedAt: '2026-10-24T12:00:00.000Z' }),
          ),
      });
      const changes = columnWrites();
      const { result } = await setupReady();
      expect(result.current.state.readOnly).toBe(true);

      act(() => result.current.actions.restoreBoard());

      await waitFor(() => expect(result.current.state.readOnly).toBe(false));
      await screen.findByText('Quadro restaurado');
      expect(changes).toEqual([
        {
          method: 'POST',
          path: `/api/v1/boards/${boardId}/unarchive`,
          body: undefined,
        },
      ]);
    });
  });

  describe('moves', () => {
    function columnCards(result: ReturnType<typeof setup>['result']) {
      return result.current.state.columns.map(({ list, cards }) => [
        list.title,
        cards.map((card) => card.id),
      ]);
    }

    it('can move on an active board', async () => {
      boardServer();
      const { result } = await setupReady();

      expect(result.current.state.canMove).toBe(true);
    });

    it('cannot move on an archived board, so a pick starts nothing', async () => {
      boardServer({
        [boardUrl]: () =>
          HttpResponse.json(
            boardFixture({ archivedAt: '2026-10-24T12:00:00.000Z' }),
          ),
      });
      const { result } = await setupReady();

      act(() => result.current.actions.move.start('card', 'c3', 'keyboard'));

      expect(result.current.state.canMove).toBe(false);
      expect(result.current.state.move.session).toBeNull();
    });

    it('shows a keyboard session preview in the columns', async () => {
      boardServer();
      const { result } = await setupReady();

      act(() => result.current.actions.move.start('card', 'c2', 'keyboard'));
      act(() => result.current.actions.move.step('ArrowDown'));

      expect(columnCards(result)).toEqual([
        ['Doing', ['c3']],
        ['Backlog', ['c1', 'c2']],
      ]);
      expect(result.current.state.move.banner).not.toBeNull();
    });

    it('moves the card counters with a cross-column move, before and after the drop', async () => {
      boardServer();
      const held = gate();
      server.use(
        http.post(`${baseUrl}/api/v1/cards/:id/move`, async () => {
          await held.wait();
          return HttpResponse.json(
            cardFixture('c3', backlog.id, { position: 0 }),
          );
        }),
      );
      const { result } = await setupReady();

      act(() => result.current.actions.move.start('card', 'c3', 'keyboard'));
      act(() => result.current.actions.move.step('ArrowRight'));

      expect(columnCards(result)).toEqual([
        ['Doing', []],
        ['Backlog', ['c3', 'c2', 'c1']],
      ]);

      act(() => result.current.actions.move.drop());

      expect(result.current.state.move.session).toBeNull();
      await waitFor(() =>
        expect(result.current.state.pendingIds.has('c3')).toBe(true),
      );
      expect(columnCards(result)).toEqual([
        ['Doing', []],
        ['Backlog', ['c3', 'c2', 'c1']],
      ]);
      held.open();
    });
  });
});
