import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useArchivedListCounts } from '@/features/board/api/archived-counts';
import { boardViewKeys } from '@/features/board/api/keys';
import { useLabelUsage } from '@/features/board/api/label-usage';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const cardsUrl = `${baseUrl}/api/v1/boards/${boardId}/cards`;
const listsUrl = `${baseUrl}/api/v1/boards/${boardId}/lists`;
const archivedAt = '2026-10-02T12:00:00.000Z';
const backlog = listFixture('l1', { archivedAt });
const ideas = listFixture('l2', { archivedAt });

function listCardsUrl(listId: string) {
  return `${baseUrl}/api/v1/lists/${listId}/cards`;
}

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

// One handler per URL; `archived=true` picks the archived body of a shared path.
function record(url: string, body: JsonBodyType, archivedBody?: JsonBodyType) {
  const requests: URL[] = [];
  server.use(
    http.get(url, ({ request }) => {
      const parsed = new URL(request.url);
      requests.push(parsed);
      const archived = parsed.searchParams.get('archived') === 'true';
      return HttpResponse.json(archived ? (archivedBody ?? body) : body);
    }),
  );
  return requests;
}

function fail(url: string) {
  let calls = 0;
  server.use(
    http.get(url, () => {
      calls += 1;
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }),
  );
  return { calls: () => calls };
}

function givenBoard({
  active = [],
  archived = [],
  archivedLists = [],
  columnCards = {},
}: {
  active?: JsonBodyType;
  archived?: JsonBodyType;
  archivedLists?: JsonBodyType;
  columnCards?: Record<string, JsonBodyType>;
} = {}) {
  const requests = {
    cards: record(cardsUrl, active, archived),
    lists: record(listsUrl, archivedLists),
    columns: new Map<string, URL[]>(),
  };
  for (const [listId, body] of Object.entries(columnCards)) {
    requests.columns.set(listId, record(listCardsUrl(listId), body));
  }
  return requests;
}

describe('useLabelUsage', () => {
  it('counts a label on an active card, an archived card and an active card of an archived column', async () => {
    givenBoard({
      active: [cardFixture('c1', 'l0', { labelIds: ['bug'] })],
      archived: [cardFixture('c2', 'l0', { archivedAt, labelIds: ['bug'] })],
      archivedLists: [backlog],
      columnCards: {
        [backlog.id]: [cardFixture('c3', backlog.id, { labelIds: ['bug'] })],
      },
    });
    const { wrapper } = setup();

    const { result } = renderHook(() => useLabelUsage(boardId), { wrapper });

    await waitFor(() => expect(result.current.counts).toBeDefined());
    expect(result.current.counts?.get('bug')).toBe(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('gives a label carried by no card no entry', async () => {
    givenBoard({
      active: [cardFixture('c1', 'l0', { labelIds: ['bug'] })],
      archived: [cardFixture('c2', 'l0', { archivedAt, labelIds: [] })],
    });
    const { wrapper } = setup();

    const { result } = renderHook(() => useLabelUsage(boardId), { wrapper });

    await waitFor(() => expect(result.current.counts).toBeDefined());
    expect(result.current.counts?.has('idea')).toBe(false);
    expect(result.current.counts?.get('bug')).toBe(1);
    expect(result.current.counts?.size).toBe(1);
  });

  it('sends no per-column request when no column is archived', async () => {
    const requests = givenBoard({
      active: [cardFixture('c1', 'l0', { labelIds: ['bug'] })],
    });
    const columnRequests = record(listCardsUrl('l0'), []);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLabelUsage(boardId), { wrapper });

    await waitFor(() => expect(result.current.counts?.get('bug')).toBe(1));
    expect(columnRequests).toHaveLength(0);
    expect(requests.lists).toHaveLength(1);
    expect(requests.lists[0]?.searchParams.get('archived')).toBe('true');
  });

  it('keeps counts undefined and loading until every source answered', async () => {
    givenBoard({ archivedLists: [backlog] });
    server.use(http.get(listCardsUrl(backlog.id), () => delay('infinite')));
    const { wrapper } = setup();

    const { result } = renderHook(() => useLabelUsage(boardId), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.counts).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('keeps counts undefined and reports an error when one source fails', async () => {
    givenBoard({
      active: [cardFixture('c1', 'l0', { labelIds: ['bug'] })],
      archivedLists: [backlog],
    });
    fail(listCardsUrl(backlog.id));
    const { wrapper } = setup();

    const { result } = renderHook(() => useLabelUsage(boardId), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.counts).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches only the failed sources', async () => {
    const requests = givenBoard({
      active: [cardFixture('c1', 'l0', { labelIds: ['bug'] })],
      archivedLists: [backlog, ideas],
      columnCards: { [ideas.id]: [] },
    });
    const failing = fail(listCardsUrl(backlog.id));
    const { wrapper } = setup();
    const { result } = renderHook(() => useLabelUsage(boardId), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    server.use(
      http.get(listCardsUrl(backlog.id), () =>
        HttpResponse.json([
          cardFixture('c3', backlog.id, { labelIds: ['bug'] }),
        ]),
      ),
    );

    result.current.refetch();

    await waitFor(() => expect(result.current.counts?.get('bug')).toBe(2));
    expect(result.current.isError).toBe(false);
    expect(failing.calls()).toBe(1);
    expect(requests.cards).toHaveLength(2);
    expect(requests.lists).toHaveLength(1);
    expect(requests.columns.get(ideas.id)).toHaveLength(1);
  });

  it('shares the per-column request with the archived list counts', async () => {
    const requests = givenBoard({
      archivedLists: [backlog],
      columnCards: { [backlog.id]: [] },
    });
    const { wrapper, queryClient } = setup();
    // Seeded, so both hooks mount their per-column observer in the same commit.
    queryClient.setQueryData(boardViewKeys.lists(boardId, true), [backlog]);

    const { result } = renderHook(
      () => ({
        usage: useLabelUsage(boardId),
        archived: useArchivedListCounts(boardId, [backlog], true),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.usage.counts).toBeDefined());
    await waitFor(() =>
      expect(result.current.archived.get(backlog.id)).toBe(0),
    );
    expect(requests.columns.get(backlog.id)).toHaveLength(1);
  });
});
