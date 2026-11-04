import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import { useUpdateLabel } from '@/features/board/api/label-mutations';
import { useLabelsViewModel } from '@/features/board/view-models/use-labels-view-model';
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

afterEach(cleanup);

const baseUrl = 'http://api.test';
const boardUrl = `${baseUrl}/api/v1/boards/${boardId}`;
const listsUrl = `${boardUrl}/lists`;
const cardsUrl = `${boardUrl}/cards`;
const labelsUrl = `${boardUrl}/labels`;
const listCardsUrl = `${baseUrl}/api/v1/lists/:listId/cards`;
const archivedAt = '2026-10-02T12:00:00.000Z';

const bug = labelFixture('lb1', { name: 'Bug' });
const urgent = labelFixture('lb2', { name: 'Urgent' });
const docs = labelFixture('lb3', { name: 'Docs' });

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

// Counts the GETs of one URL, split by the `archived` flag.
function serve(url: string, body: JsonBodyType, archivedBody?: JsonBodyType) {
  const calls = { active: 0, archived: 0 };
  server.use(
    http.get(url, ({ request }) => {
      const archived =
        new URL(request.url).searchParams.get('archived') === 'true';
      calls[archived ? 'archived' : 'active'] += 1;
      return HttpResponse.json(archived ? (archivedBody ?? body) : body);
    }),
  );
  return calls;
}

function givenBoard({
  board = boardFixture(),
  labels = [bug, urgent, docs],
  active = [],
  archived = [],
  archivedLists = [],
}: {
  board?: JsonBodyType;
  labels?: JsonBodyType;
  active?: JsonBodyType;
  archived?: JsonBodyType;
  archivedLists?: JsonBodyType;
} = {}) {
  return {
    board: serve(boardUrl, board),
    labels: serve(labelsUrl, labels),
    cards: serve(cardsUrl, active, archived),
    lists: serve(listsUrl, [], archivedLists),
  };
}

function setup(id = boardId) {
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
  return {
    queryClient,
    ...renderHook(
      () => ({ vm: useLabelsViewModel(id), update: useUpdateLabel(id) }),
      { wrapper },
    ),
  };
}

async function ready(result: {
  current: { vm: { state: { status: string } } };
}) {
  await waitFor(() => expect(result.current.vm.state.status).toBe('ready'));
}

describe('useLabelsViewModel read state', () => {
  it('is loading until the board, labels and every usage source answered', async () => {
    givenBoard();
    server.use(
      http.get(labelsUrl, async () => {
        await delay(60);
        return HttpResponse.json([bug]);
      }),
    );
    const { result } = setup();

    expect(result.current.vm.state.status).toBe('loading');
    await ready(result);
    expect(result.current.vm.state.rows).toHaveLength(1);
  });

  it('stays loading while a usage source is still pending', async () => {
    givenBoard();
    server.use(
      http.get(cardsUrl, async ({ request }) => {
        if (new URL(request.url).searchParams.get('archived') === 'true') {
          await delay(80);
        }
        return HttpResponse.json([]);
      }),
    );
    const { result } = setup();

    await waitFor(() => expect(result.current.vm.state.board).toBeDefined());
    await waitFor(() => expect(result.current.vm.state.board).toBeDefined());
    expect(result.current.vm.state.status).toBe('loading');
    expect(result.current.vm.state.rows).toEqual([]);
    await ready(result);
  });

  it('lists one row per label in board order with the usage kind', async () => {
    const oldBacklog = listFixture('l9', { archivedAt });
    givenBoard({
      active: [
        cardFixture('c1', 'l1', { labelIds: ['lb1', 'lb2'] }),
        cardFixture('c2', 'l1', { labelIds: ['lb2'] }),
      ],
      archived: [cardFixture('c3', 'l1', { labelIds: ['lb2'] })],
      archivedLists: [oldBacklog],
    });
    server.use(
      http.get(listCardsUrl, () =>
        HttpResponse.json([cardFixture('c4', 'l1', { labelIds: ['lb1'] })]),
      ),
    );
    const { result } = setup();
    await ready(result);

    const { rows } = result.current.vm.state;
    expect(rows.map((row) => row.label.id)).toEqual(['lb1', 'lb2', 'lb3']);
    expect(rows.map((row) => row.usage)).toEqual([
      { key: 'many', count: 2 },
      { key: 'many', count: 3 },
      { key: 'unused', count: 0 },
    ]);
  });

  it('maps a single card to the one kind', async () => {
    givenBoard({
      labels: [bug],
      active: [cardFixture('c1', 'l1', { labelIds: ['lb1'] })],
    });
    const { result } = setup();
    await ready(result);

    expect(result.current.vm.state.rows[0].usage).toEqual({
      key: 'one',
      count: 1,
    });
  });

  it('shows a created but unused label as a row', async () => {
    givenBoard({ labels: [bug] });
    const { result } = setup();
    await ready(result);

    expect(result.current.vm.state.rows).toHaveLength(1);
    expect(result.current.vm.state.rows[0].usage.key).toBe('unused');
  });

  it('is ready with no rows for a board without labels', async () => {
    givenBoard({ labels: [] });
    const { result } = setup();
    await ready(result);

    expect(result.current.vm.state.rows).toEqual([]);
  });

  it.each([
    ['the board', boardUrl],
    ['the labels', labelsUrl],
  ])('is error when %s fails and no data exists', async (_name, url) => {
    givenBoard();
    server.use(http.get(url, () => problem(500)));
    const { result } = setup();

    await waitFor(() => expect(result.current.vm.state.status).toBe('error'));
  });

  it('is error when a usage source fails', async () => {
    givenBoard();
    server.use(http.get(cardsUrl, () => problem(500)));
    const { result } = setup();

    await waitFor(() => expect(result.current.vm.state.status).toBe('error'));
  });

  it('stays ready when a refetch fails but data is cached', async () => {
    givenBoard();
    const { result, queryClient } = setup();
    await ready(result);
    server.use(http.get(labelsUrl, () => problem(500)));

    await act(() =>
      queryClient.refetchQueries({ queryKey: boardViewKeys.all(boardId) }),
    );

    expect(result.current.vm.state.status).toBe('ready');
    expect(result.current.vm.state.rows).toHaveLength(3);
  });

  it.each([
    ['the board', boardUrl],
    ['the labels', labelsUrl],
  ])('is notFound when %s answers 404', async (_name, url) => {
    givenBoard();
    server.use(http.get(url, () => problem(404)));
    const { result } = setup();

    await waitFor(() =>
      expect(result.current.vm.state.status).toBe('notFound'),
    );
  });

  it('is notFound for a malformed board id', async () => {
    server.use(http.get(`${baseUrl}/api/v1/boards/*`, () => problem(404)));
    const { result } = setup('not-a-uuid');

    await waitFor(() =>
      expect(result.current.vm.state.status).toBe('notFound'),
    );
  });

  it('retry refetches exactly the failed queries', async () => {
    const calls = givenBoard();
    let failLabels = true;
    server.use(
      http.get(labelsUrl, () => {
        if (failLabels) return problem(500);
        return HttpResponse.json([bug]);
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.vm.state.status).toBe('error'));
    const before = { ...calls, board: calls.board.active };
    failLabels = false;

    act(() => result.current.vm.actions.retry());

    await ready(result);
    expect(calls.board.active).toBe(before.board);
    expect(calls.cards.active).toBe(before.cards.active);
    expect(calls.cards.archived).toBe(before.cards.archived);
    expect(calls.lists.archived).toBe(before.lists.archived);
  });

  describe('readOnly', () => {
    it('is false for an active board', async () => {
      givenBoard();
      const { result } = setup();
      await ready(result);

      expect(result.current.vm.state.readOnly).toBe(false);
    });

    it('is true only when the board has archivedAt', async () => {
      givenBoard({ board: boardFixture({ archivedAt }) });
      const { result } = setup();
      await ready(result);

      expect(result.current.vm.state.readOnly).toBe(true);
    });
  });

  it('flags the row of a label with a change in flight', async () => {
    givenBoard();
    server.use(
      http.patch(`${baseUrl}/api/v1/labels/:id`, async () => {
        await delay(80);
        return HttpResponse.json({ ...urgent, name: 'Renamed' });
      }),
    );
    const { result } = setup();
    await ready(result);
    expect(result.current.vm.state.rows.map((r) => r.pending)).toEqual([
      false,
      false,
      false,
    ]);

    act(() => {
      void result.current.update.mutateAsync({
        id: 'lb2',
        body: { name: 'Renamed' },
      });
    });

    await waitFor(() =>
      expect(result.current.vm.state.rows.map((r) => r.pending)).toEqual([
        false,
        true,
        false,
      ]),
    );
    await waitFor(() =>
      expect(result.current.vm.state.rows.every((r) => !r.pending)).toBe(true),
    );
  });
});
