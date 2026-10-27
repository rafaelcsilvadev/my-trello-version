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

type Reply = () => Response;

// Each endpoint answers with its seed unless a test overrides it; `requests` counts the hits.
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
  };
  server.use(
    ...Object.entries(seed).map(([url, body]) =>
      http.get(url, () => {
        requests[url] = (requests[url] ?? 0) + 1;
        return overrides[url]?.() ?? HttpResponse.json(body);
      }),
    ),
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
  );
  return changes;
}

async function setupReady() {
  const view = setup();
  await waitFor(() => expect(view.result.current.state.status).toBe('ready'));
  return view;
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
      expect(changes).toEqual([]);
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
  });
});
