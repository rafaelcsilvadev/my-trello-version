import { type QueryKey, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import {
  useArchiveList,
  useDeleteList,
  usePendingItemIds,
  useRenameList,
  useRestoreBoard,
  useRestoreList,
  useToggleCardDone,
} from '@/features/board/api/mutations';
import type { Board, Card, List } from '@/features/board/model/types';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardFixture,
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const listUrl = `${baseUrl}/api/v1/lists/:id`;
const backlog = listFixture('l1', { title: 'Backlog' });
const doing = listFixture('l2', { title: 'Doing', position: 1 });
const listsKey = boardViewKeys.lists(boardId, false);
const archivedListsKey = boardViewKeys.lists(boardId, true);
const archivedCardsKey = boardViewKeys.cards(boardId, true);
const archivedAt = '2026-10-20T12:00:00.000Z';
const ideas = listFixture('l3', { title: 'Ideas', archivedAt });
const old = listFixture('l4', { title: 'Old', position: 1, archivedAt });
const ideaCard = cardFixture('c1', ideas.id, { archivedAt });
const oldCard = cardFixture('c2', old.id, { archivedAt });
const otherIdeaCard = cardFixture('c3', ideas.id, { archivedAt });
const cardUrl = `${baseUrl}/api/v1/cards/:id`;
const cardsKey = boardViewKeys.cards(boardId, false);
const todoCard = cardFixture('c4', backlog.id);
const doneCard = cardFixture('c5', backlog.id, { position: 1, done: true });
const boardUrl = `${baseUrl}/api/v1/boards/:id`;
const detailKey = boardViewKeys.detail(boardId);
const archivedBoard = boardFixture({ archivedAt });

const serverError = {
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'boom',
};

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(listsKey, [backlog, doing]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

type TestQueryClient = ReturnType<typeof setup>['queryClient'];

function titles(queryClient: TestQueryClient, key: QueryKey = listsKey) {
  return queryClient.getQueryData<List[]>(key)?.map((list) => list.title);
}

function cardIds(queryClient: TestQueryClient) {
  return queryClient
    .getQueryData<Card[]>(archivedCardsKey)
    ?.map((card) => card.id);
}

function setupArchived() {
  const context = setup();
  context.queryClient.setQueryData(archivedListsKey, [ideas, old]);
  context.queryClient.setQueryData(archivedCardsKey, [
    ideaCard,
    oldCard,
    otherIdeaCard,
  ]);
  return context;
}

describe('useRenameList', () => {
  it('patches the list with the new title', async () => {
    const requests: { id: unknown; body: unknown }[] = [];
    server.use(
      http.patch(listUrl, async ({ params, request }) => {
        requests.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ ...backlog, title: 'Inbox' });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useRenameList(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({ id: backlog.id, title: 'Inbox' }),
    );

    expect(requests).toEqual([{ id: backlog.id, body: { title: 'Inbox' } }]);
  });

  it('shows the new title before the response arrives', async () => {
    server.use(http.patch(listUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useRenameList(boardId), { wrapper });

    act(() => result.current.mutate({ id: backlog.id, title: 'Inbox' }));

    await waitFor(() =>
      expect(titles(queryClient)).toEqual(['Inbox', 'Doing']),
    );
  });

  it('restores only the failed title while a later rename is pending', async () => {
    let failFirst: (() => void) | undefined;
    server.use(
      http.patch(listUrl, async ({ params }) => {
        if (params.id === doing.id) return delay('infinite');
        await new Promise<void>((resolve) => (failFirst = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({ first: useRenameList(boardId), second: useRenameList(boardId) }),
      { wrapper },
    );

    act(() => result.current.first.mutate({ id: backlog.id, title: 'Inbox' }));
    await waitFor(() =>
      expect(titles(queryClient)).toEqual(['Inbox', 'Doing']),
    );
    act(() => result.current.second.mutate({ id: doing.id, title: 'Review' }));
    await waitFor(() =>
      expect(titles(queryClient)).toEqual(['Inbox', 'Review']),
    );
    await waitFor(() => expect(failFirst).toBeDefined());
    act(() => failFirst?.());

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    expect(titles(queryClient)).toEqual(['Backlog', 'Review']);
  });

  it('invalidates the board only after the last pending change settles', async () => {
    let releaseSecond: (() => void) | undefined;
    server.use(
      http.patch(listUrl, async ({ params }) => {
        if (params.id === doing.id) {
          await new Promise<void>((resolve) => (releaseSecond = resolve));
        }
        return HttpResponse.json(backlog);
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({ first: useRenameList(boardId), second: useRenameList(boardId) }),
      { wrapper },
    );

    act(() => result.current.second.mutate({ id: doing.id, title: 'Review' }));
    await act(() =>
      result.current.first.mutateAsync({ id: backlog.id, title: 'Inbox' }),
    );
    await waitFor(() => expect(releaseSecond).toBeDefined());
    expect(queryClient.getQueryState(listsKey)?.isInvalidated).toBe(false);

    act(() => releaseSecond?.());

    await waitFor(() =>
      expect(queryClient.getQueryState(listsKey)?.isInvalidated).toBe(true),
    );
  });

  it('leaves the lists uncached when none were loaded', async () => {
    server.use(
      http.patch(listUrl, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setup();
    queryClient.removeQueries({ queryKey: listsKey });
    const { result } = renderHook(() => useRenameList(boardId), { wrapper });

    await act(() =>
      expect(
        result.current.mutateAsync({ id: backlog.id, title: 'Inbox' }),
      ).rejects.toThrow(ApiError),
    );

    expect(queryClient.getQueryData(listsKey)).toBeUndefined();
  });
});

describe('useArchiveList', () => {
  it('posts to the archive path of the list', async () => {
    const ids: unknown[] = [];
    server.use(
      http.post(`${listUrl}/archive`, ({ params }) => {
        ids.push(params.id);
        return HttpResponse.json({ ...backlog, archivedAt });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useArchiveList(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ id: backlog.id }));

    expect(ids).toEqual([backlog.id]);
  });

  it('moves the list to the front of the archived lists before the response', async () => {
    server.use(http.post(`${listUrl}/archive`, () => delay('infinite')));
    const { wrapper, queryClient } = setupArchived();
    const { result } = renderHook(() => useArchiveList(boardId), { wrapper });

    act(() => result.current.mutate({ id: backlog.id }));

    await waitFor(() => expect(titles(queryClient)).toEqual(['Doing']));
    const archived = queryClient.getQueryData<List[]>(archivedListsKey);
    expect(archived?.map((list) => list.title)).toEqual([
      'Backlog',
      'Ideas',
      'Old',
    ]);
    expect(archived?.[0]?.archivedAt).not.toBeNull();
  });

  it('leaves the archived lists uncached when none were loaded', async () => {
    server.use(http.post(`${listUrl}/archive`, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useArchiveList(boardId), { wrapper });

    act(() => result.current.mutate({ id: backlog.id }));

    await waitFor(() => expect(titles(queryClient)).toEqual(['Doing']));
    expect(queryClient.getQueryData(archivedListsKey)).toBeUndefined();
  });

  it('puts the list back at its old index on failure', async () => {
    server.use(
      http.post(`${listUrl}/archive`, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setupArchived();
    const { result } = renderHook(() => useArchiveList(boardId), { wrapper });

    await act(() =>
      expect(result.current.mutateAsync({ id: backlog.id })).rejects.toThrow(
        ApiError,
      ),
    );

    expect(titles(queryClient)).toEqual(['Backlog', 'Doing']);
    expect(titles(queryClient, archivedListsKey)).toEqual(['Ideas', 'Old']);
  });

  it('does not duplicate a list a refetch already brought back', async () => {
    let fail: (() => void) | undefined;
    server.use(
      http.post(`${listUrl}/archive`, async () => {
        await new Promise<void>((resolve) => (fail = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useArchiveList(boardId), { wrapper });

    act(() => result.current.mutate({ id: backlog.id }));
    await waitFor(() => expect(fail).toBeDefined());
    queryClient.setQueryData(listsKey, [backlog, doing]);
    act(() => fail?.());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(titles(queryClient)).toEqual(['Backlog', 'Doing']);
  });
});

describe('useRestoreList', () => {
  it('posts to the unarchive path of the list', async () => {
    const ids: unknown[] = [];
    server.use(
      http.post(`${listUrl}/unarchive`, ({ params }) => {
        ids.push(params.id);
        return HttpResponse.json({ ...ideas, archivedAt: null });
      }),
    );
    const { wrapper } = setupArchived();
    const { result } = renderHook(() => useRestoreList(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ id: ideas.id }));

    expect(ids).toEqual([ideas.id]);
  });

  it('appends the list to the active lists before the response', async () => {
    server.use(http.post(`${listUrl}/unarchive`, () => delay('infinite')));
    const { wrapper, queryClient } = setupArchived();
    const { result } = renderHook(() => useRestoreList(boardId), { wrapper });

    act(() => result.current.mutate({ id: ideas.id }));

    await waitFor(() =>
      expect(titles(queryClient)).toEqual(['Backlog', 'Doing', 'Ideas']),
    );
    expect(titles(queryClient, archivedListsKey)).toEqual(['Old']);
    expect(queryClient.getQueryData<List[]>(listsKey)?.[2]).toMatchObject({
      position: 2,
      archivedAt: null,
    });
  });

  it('puts the list back at its old index on failure', async () => {
    server.use(
      http.post(`${listUrl}/unarchive`, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setupArchived();
    const { result } = renderHook(() => useRestoreList(boardId), { wrapper });

    await act(() =>
      expect(result.current.mutateAsync({ id: ideas.id })).rejects.toThrow(
        ApiError,
      ),
    );

    expect(titles(queryClient)).toEqual(['Backlog', 'Doing']);
    expect(titles(queryClient, archivedListsKey)).toEqual(['Ideas', 'Old']);
  });
});

describe('useDeleteList', () => {
  it('sends a delete for the list', async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(listUrl, ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { wrapper } = setupArchived();
    const { result } = renderHook(() => useDeleteList(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ id: ideas.id }));

    expect(ids).toEqual([ideas.id]);
  });

  it('drops the list and its archived cards before the response', async () => {
    server.use(http.delete(listUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setupArchived();
    const { result } = renderHook(() => useDeleteList(boardId), { wrapper });

    act(() => result.current.mutate({ id: ideas.id }));

    await waitFor(() =>
      expect(titles(queryClient, archivedListsKey)).toEqual(['Old']),
    );
    expect(cardIds(queryClient)).toEqual([oldCard.id]);
  });

  it('puts the list and its cards back at their old indexes on failure', async () => {
    server.use(
      http.delete(listUrl, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setupArchived();
    const { result } = renderHook(() => useDeleteList(boardId), { wrapper });

    await act(() =>
      expect(result.current.mutateAsync({ id: ideas.id })).rejects.toThrow(
        ApiError,
      ),
    );

    expect(titles(queryClient, archivedListsKey)).toEqual(['Ideas', 'Old']);
    expect(cardIds(queryClient)).toEqual([
      ideaCard.id,
      oldCard.id,
      otherIdeaCard.id,
    ]);
  });
});

function doneFlags(queryClient: TestQueryClient) {
  return queryClient.getQueryData<Card[]>(cardsKey)?.map((card) => card.done);
}

function setupCards() {
  const context = setup();
  context.queryClient.setQueryData(cardsKey, [todoCard, doneCard]);
  return context;
}

function setupArchivedBoard() {
  const context = setup();
  context.queryClient.setQueryData(detailKey, archivedBoard);
  return context;
}

function boardArchivedAt(queryClient: TestQueryClient) {
  return queryClient.getQueryData<Board>(detailKey)?.archivedAt;
}

describe('useToggleCardDone', () => {
  it('patches the card with the done flag', async () => {
    const requests: { id: unknown; body: unknown }[] = [];
    server.use(
      http.patch(cardUrl, async ({ params, request }) => {
        requests.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ ...todoCard, done: true });
      }),
    );
    const { wrapper } = setupCards();
    const { result } = renderHook(() => useToggleCardDone(boardId), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({ id: todoCard.id, done: true }),
    );

    expect(requests).toEqual([{ id: todoCard.id, body: { done: true } }]);
  });

  it('marks the card done before the response arrives', async () => {
    server.use(http.patch(cardUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setupCards();
    const { result } = renderHook(() => useToggleCardDone(boardId), {
      wrapper,
    });

    act(() => result.current.mutate({ id: todoCard.id, done: true }));

    await waitFor(() => expect(doneFlags(queryClient)).toEqual([true, true]));
  });

  it('restores only the failed card while another toggle is pending', async () => {
    let failFirst: (() => void) | undefined;
    server.use(
      http.patch(cardUrl, async ({ params }) => {
        if (params.id === doneCard.id) return delay('infinite');
        await new Promise<void>((resolve) => (failFirst = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setupCards();
    const { result } = renderHook(
      () => ({
        first: useToggleCardDone(boardId),
        second: useToggleCardDone(boardId),
      }),
      { wrapper },
    );

    act(() => result.current.first.mutate({ id: todoCard.id, done: true }));
    act(() => result.current.second.mutate({ id: doneCard.id, done: false }));
    await waitFor(() => expect(doneFlags(queryClient)).toEqual([true, false]));
    await waitFor(() => expect(failFirst).toBeDefined());
    act(() => failFirst?.());

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    expect(doneFlags(queryClient)).toEqual([false, false]);
  });
});

describe('useRestoreBoard', () => {
  it('posts to the unarchive path of the board', async () => {
    const ids: unknown[] = [];
    server.use(
      http.post(`${boardUrl}/unarchive`, ({ params }) => {
        ids.push(params.id);
        return HttpResponse.json({ ...archivedBoard, archivedAt: null });
      }),
    );
    const { wrapper } = setupArchivedBoard();
    const { result } = renderHook(() => useRestoreBoard(boardId), {
      wrapper,
    });

    await act(() => result.current.mutateAsync({ id: boardId }));

    expect(ids).toEqual([boardId]);
  });

  it('clears archivedAt before the response arrives', async () => {
    server.use(http.post(`${boardUrl}/unarchive`, () => delay('infinite')));
    const { wrapper, queryClient } = setupArchivedBoard();
    const { result } = renderHook(() => useRestoreBoard(boardId), {
      wrapper,
    });

    act(() => result.current.mutate({ id: boardId }));

    await waitFor(() => expect(boardArchivedAt(queryClient)).toBeNull());
  });

  it('sets archivedAt back on failure', async () => {
    server.use(
      http.post(`${boardUrl}/unarchive`, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setupArchivedBoard();
    const { result } = renderHook(() => useRestoreBoard(boardId), {
      wrapper,
    });

    await act(() =>
      expect(result.current.mutateAsync({ id: boardId })).rejects.toThrow(
        ApiError,
      ),
    );

    expect(boardArchivedAt(queryClient)).toBe(archivedAt);
  });
});

describe('usePendingItemIds', () => {
  it('lists the ids with a change in flight and drops them once settled', async () => {
    let release: (() => void) | undefined;
    server.use(
      http.patch(listUrl, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json(backlog);
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ rename: useRenameList(boardId), pending: usePendingItemIds() }),
      { wrapper },
    );
    expect(result.current.pending).toEqual(new Set());

    act(() => result.current.rename.mutate({ id: backlog.id, title: 'Inbox' }));

    await waitFor(() =>
      expect(result.current.pending).toEqual(new Set([backlog.id])),
    );
    await waitFor(() => expect(release).toBeDefined());
    act(() => release?.());
    await waitFor(() => expect(result.current.pending).toEqual(new Set()));
  });
});
