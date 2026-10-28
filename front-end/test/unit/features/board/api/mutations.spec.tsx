import { type QueryKey, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import {
  useArchiveList,
  useDeleteList,
  useMoveCard,
  useMoveList,
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

const moveCardUrl = `${baseUrl}/api/v1/cards/:id/move`;
const doingCard = cardFixture('c6', doing.id);

function setupMoveCards() {
  const context = setup();
  context.queryClient.setQueryData(cardsKey, [todoCard, doneCard, doingCard]);
  return context;
}

// `listId:position` per card id, so a test reads where every card sits.
function cardSpots(queryClient: TestQueryClient) {
  return Object.fromEntries(
    queryClient
      .getQueryData<Card[]>(cardsKey)
      ?.map((card) => [card.id, `${card.listId}:${card.position}`]) ?? [],
  );
}

describe('useMoveCard', () => {
  it('posts the exact body to the move path of the card', async () => {
    const requests: { id: unknown; body: unknown }[] = [];
    server.use(
      http.post(moveCardUrl, async ({ params, request }) => {
        requests.push({ id: params.id, body: await request.json() });
        return HttpResponse.json(todoCard);
      }),
    );
    const { wrapper } = setupMoveCards();
    const { result } = renderHook(() => useMoveCard(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: todoCard.id,
        body: { listId: doing.id, position: 1 },
      }),
    );
    await act(() =>
      result.current.mutateAsync({ id: doneCard.id, body: { position: 0 } }),
    );

    expect(requests).toEqual([
      { id: todoCard.id, body: { listId: doing.id, position: 1 } },
      { id: doneCard.id, body: { position: 0 } },
    ]);
  });

  it('places the card in the other column before the response arrives', async () => {
    server.use(http.post(moveCardUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setupMoveCards();
    const { result } = renderHook(() => useMoveCard(boardId), { wrapper });

    act(() =>
      result.current.mutate({
        id: todoCard.id,
        body: { listId: doing.id, position: 0 },
      }),
    );

    await waitFor(() =>
      expect(cardSpots(queryClient)).toEqual({
        c4: 'l2:0',
        c5: 'l1:0',
        c6: 'l2:1',
      }),
    );
  });

  it('places the card at the new index of its own column without a listId', async () => {
    server.use(http.post(moveCardUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setupMoveCards();
    const { result } = renderHook(() => useMoveCard(boardId), { wrapper });

    act(() =>
      result.current.mutate({ id: todoCard.id, body: { position: 1 } }),
    );

    await waitFor(() =>
      expect(cardSpots(queryClient)).toEqual({
        c4: 'l1:1',
        c5: 'l1:0',
        c6: 'l2:0',
      }),
    );
  });

  it('puts back only the failed card while another move is pending', async () => {
    let failFirst: (() => void) | undefined;
    server.use(
      http.post(moveCardUrl, async ({ params }) => {
        if (params.id === doingCard.id) return delay('infinite');
        await new Promise<void>((resolve) => (failFirst = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setupMoveCards();
    const { result } = renderHook(
      () => ({ first: useMoveCard(boardId), second: useMoveCard(boardId) }),
      { wrapper },
    );

    act(() =>
      result.current.first.mutate({
        id: todoCard.id,
        body: { listId: doing.id, position: 1 },
      }),
    );
    act(() =>
      result.current.second.mutate({
        id: doingCard.id,
        body: { listId: backlog.id, position: 0 },
      }),
    );
    await waitFor(() =>
      expect(cardSpots(queryClient)).toEqual({
        c4: 'l2:0',
        c5: 'l1:1',
        c6: 'l1:0',
      }),
    );
    await waitFor(() => expect(failFirst).toBeDefined());
    act(() => failFirst?.());

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    expect(cardSpots(queryClient)).toEqual({
      c4: 'l1:0',
      c5: 'l1:2',
      c6: 'l1:1',
    });
  });

  it('marks the card pending while the move is in flight', async () => {
    let release: (() => void) | undefined;
    server.use(
      http.post(moveCardUrl, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json(todoCard);
      }),
    );
    const { wrapper } = setupMoveCards();
    const { result } = renderHook(
      () => ({ move: useMoveCard(boardId), pending: usePendingItemIds() }),
      { wrapper },
    );

    act(() =>
      result.current.move.mutate({ id: todoCard.id, body: { position: 1 } }),
    );

    await waitFor(() =>
      expect(result.current.pending).toEqual(new Set([todoCard.id])),
    );
    await waitFor(() => expect(release).toBeDefined());
    act(() => release?.());
    await waitFor(() => expect(result.current.pending).toEqual(new Set()));
  });

  it('invalidates the board once, after the last move settles', async () => {
    let releaseSecond: (() => void) | undefined;
    server.use(
      http.post(moveCardUrl, async ({ params }) => {
        if (params.id === doingCard.id) {
          await new Promise<void>((resolve) => (releaseSecond = resolve));
        }
        return HttpResponse.json(todoCard);
      }),
    );
    const { wrapper, queryClient } = setupMoveCards();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => ({ first: useMoveCard(boardId), second: useMoveCard(boardId) }),
      { wrapper },
    );

    act(() =>
      result.current.second.mutate({
        id: doingCard.id,
        body: { listId: backlog.id, position: 0 },
      }),
    );
    await act(() =>
      result.current.first.mutateAsync({
        id: todoCard.id,
        body: { position: 1 },
      }),
    );
    await waitFor(() => expect(releaseSecond).toBeDefined());
    expect(invalidate).not.toHaveBeenCalled();

    act(() => releaseSecond?.());

    await waitFor(() => expect(result.current.second.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe('useMoveList', () => {
  it('posts the position to the move path of the list', async () => {
    const requests: { id: unknown; body: unknown }[] = [];
    server.use(
      http.post(moveListUrl, async ({ params, request }) => {
        requests.push({ id: params.id, body: await request.json() });
        return HttpResponse.json(backlog);
      }),
    );
    const { wrapper } = setupMoveLists();
    const { result } = renderHook(() => useMoveList(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({ id: backlog.id, body: { position: 2 } }),
    );

    expect(requests).toEqual([{ id: backlog.id, body: { position: 2 } }]);
  });

  it('places the list at the new index before the response arrives', async () => {
    server.use(http.post(moveListUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setupMoveLists();
    const { result } = renderHook(() => useMoveList(boardId), { wrapper });

    act(() => result.current.mutate({ id: backlog.id, body: { position: 2 } }));

    await waitFor(() =>
      expect(listSpots(queryClient)).toEqual({ l1: 2, l2: 0, l5: 1 }),
    );
  });

  it('puts back only the failed list while another move is pending', async () => {
    let failFirst: (() => void) | undefined;
    server.use(
      http.post(moveListUrl, async ({ params }) => {
        if (params.id === finished.id) return delay('infinite');
        await new Promise<void>((resolve) => (failFirst = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setupMoveLists();
    const { result } = renderHook(
      () => ({ first: useMoveList(boardId), second: useMoveList(boardId) }),
      { wrapper },
    );

    act(() =>
      result.current.first.mutate({ id: backlog.id, body: { position: 2 } }),
    );
    act(() =>
      result.current.second.mutate({ id: finished.id, body: { position: 0 } }),
    );
    await waitFor(() =>
      expect(listSpots(queryClient)).toEqual({ l1: 2, l2: 1, l5: 0 }),
    );
    await waitFor(() => expect(failFirst).toBeDefined());
    act(() => failFirst?.());

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    expect(listSpots(queryClient)).toEqual({ l1: 0, l2: 2, l5: 1 });
  });

  it('marks the list pending while the move is in flight', async () => {
    let release: (() => void) | undefined;
    server.use(
      http.post(moveListUrl, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json(backlog);
      }),
    );
    const { wrapper } = setupMoveLists();
    const { result } = renderHook(
      () => ({ move: useMoveList(boardId), pending: usePendingItemIds() }),
      { wrapper },
    );

    act(() =>
      result.current.move.mutate({ id: backlog.id, body: { position: 1 } }),
    );

    await waitFor(() =>
      expect(result.current.pending).toEqual(new Set([backlog.id])),
    );
    await waitFor(() => expect(release).toBeDefined());
    act(() => release?.());
    await waitFor(() => expect(result.current.pending).toEqual(new Set()));
  });
});

const moveListUrl = `${baseUrl}/api/v1/lists/:id/move`;
const finished = listFixture('l5', { title: 'Done', position: 2 });

function setupMoveLists() {
  const context = setup();
  context.queryClient.setQueryData(listsKey, [backlog, doing, finished]);
  return context;
}

// Position per list id, so a test reads where every column sits.
function listSpots(queryClient: TestQueryClient) {
  return Object.fromEntries(
    queryClient
      .getQueryData<List[]>(listsKey)
      ?.map((list) => [list.id, list.position]) ?? [],
  );
}

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
