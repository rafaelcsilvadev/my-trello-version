import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  useArchiveCard,
  useRestoreCard,
  useUpdateCard,
} from '@/features/board/api/card-mutations';
import { boardViewKeys } from '@/features/board/api/keys';
import type { Card } from '@/features/board/model/types';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { boardId, cardFixture } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const cardUrl = `${baseUrl}/api/v1/cards/:id`;
const cardsKey = boardViewKeys.cards(boardId, false);
const archivedCardsKey = boardViewKeys.cards(boardId, true);
const archivedAt = '2026-10-20T12:00:00.000Z';
const card = cardFixture('c1', 'l1', { title: 'Write spec' });
const neighbor = cardFixture('c2', 'l1', { position: 1 });
const archivedCard = cardFixture('c3', 'l1', { archivedAt });
const cardKey = boardViewKeys.card(boardId, card.id);

const serverError = {
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'boom',
};

function setup(detail: Card = card) {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(cardsKey, [card, neighbor]);
  queryClient.setQueryData(archivedCardsKey, [archivedCard]);
  queryClient.setQueryData(boardViewKeys.card(boardId, detail.id), detail);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

type TestQueryClient = ReturnType<typeof setup>['queryClient'];

function cached(queryClient: TestQueryClient, key = cardsKey, id = card.id) {
  return queryClient.getQueryData<Card[]>(key)?.find((item) => item.id === id);
}

describe('useUpdateCard', () => {
  it('patches the card with the changed fields', async () => {
    const requests: { id: unknown; body: unknown }[] = [];
    server.use(
      http.patch(cardUrl, async ({ params, request }) => {
        requests.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ ...card, title: 'Ship it' });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateCard(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: card.id,
        body: { title: 'Ship it', dueDate: '2026-11-01' },
      }),
    );

    expect(requests).toEqual([
      { id: card.id, body: { title: 'Ship it', dueDate: '2026-11-01' } },
    ]);
  });

  it('shows the new values on the detail and the board before the response', async () => {
    server.use(http.patch(cardUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useUpdateCard(boardId), { wrapper });

    act(() =>
      result.current.mutate({
        id: card.id,
        body: { title: 'Ship it', description: 'Notes' },
      }),
    );

    await waitFor(() =>
      expect(queryClient.getQueryData<Card>(cardKey)).toMatchObject({
        title: 'Ship it',
        description: 'Notes',
      }),
    );
    expect(cached(queryClient)).toMatchObject({
      title: 'Ship it',
      description: 'Notes',
    });
    expect(cached(queryClient, cardsKey, neighbor.id)).toEqual(neighbor);
  });

  it('patches an archived card in the archived list', async () => {
    server.use(http.patch(cardUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup(archivedCard);
    const { result } = renderHook(() => useUpdateCard(boardId), { wrapper });

    act(() =>
      result.current.mutate({ id: archivedCard.id, body: { done: true } }),
    );

    await waitFor(() =>
      expect(cached(queryClient, archivedCardsKey, archivedCard.id)?.done).toBe(
        true,
      ),
    );
    expect(
      queryClient.getQueryData<Card>(
        boardViewKeys.card(boardId, archivedCard.id),
      )?.done,
    ).toBe(true);
  });

  it('puts back the old values on failure', async () => {
    server.use(
      http.patch(cardUrl, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useUpdateCard(boardId), { wrapper });

    await act(() =>
      expect(
        result.current.mutateAsync({
          id: card.id,
          body: { title: 'Ship it', dueDate: '2026-11-01' },
        }),
      ).rejects.toThrow(ApiError),
    );

    expect(queryClient.getQueryData<Card>(cardKey)).toEqual(card);
    expect(cached(queryClient)).toEqual(card);
  });

  it('keeps a later change of another field when the first one fails', async () => {
    let failFirst: (() => void) | undefined;
    server.use(
      http.patch(cardUrl, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        if ('done' in body) return delay('infinite');
        await new Promise<void>((resolve) => (failFirst = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({ first: useUpdateCard(boardId), second: useUpdateCard(boardId) }),
      { wrapper },
    );

    act(() =>
      result.current.first.mutate({ id: card.id, body: { title: 'Ship it' } }),
    );
    await waitFor(() => expect(cached(queryClient)?.title).toBe('Ship it'));
    act(() =>
      result.current.second.mutate({ id: card.id, body: { done: true } }),
    );
    await waitFor(() => expect(cached(queryClient)?.done).toBe(true));
    await waitFor(() => expect(failFirst).toBeDefined());
    act(() => failFirst?.());

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    expect(cached(queryClient)).toMatchObject({
      title: 'Write spec',
      done: true,
    });
    expect(queryClient.getQueryData<Card>(cardKey)).toMatchObject({
      title: 'Write spec',
      done: true,
    });
  });

  it('refetches the board once, after the last pending change settles', async () => {
    let releaseSecond: (() => void) | undefined;
    server.use(
      http.patch(cardUrl, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        if ('done' in body) {
          await new Promise<void>((resolve) => (releaseSecond = resolve));
        }
        return HttpResponse.json(card);
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({ first: useUpdateCard(boardId), second: useUpdateCard(boardId) }),
      { wrapper },
    );

    act(() =>
      result.current.second.mutate({ id: card.id, body: { done: true } }),
    );
    await act(() =>
      result.current.first.mutateAsync({
        id: card.id,
        body: { title: 'Ship it' },
      }),
    );
    await waitFor(() => expect(releaseSecond).toBeDefined());
    expect(queryClient.getQueryState(cardKey)?.isInvalidated).toBe(false);

    act(() => releaseSecond?.());

    await waitFor(() =>
      expect(queryClient.getQueryState(cardKey)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(cardsKey)?.isInvalidated).toBe(true);
  });
});

function ids(queryClient: TestQueryClient, key: typeof cardsKey) {
  return queryClient.getQueryData<Card[]>(key)?.map(({ id }) => id);
}

describe('useArchiveCard', () => {
  it('posts to the archive path of the card', async () => {
    const paths: unknown[] = [];
    server.use(
      http.post(`${cardUrl}/archive`, ({ params }) => {
        paths.push(params.id);
        return HttpResponse.json({ ...card, archivedAt });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useArchiveCard(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ id: card.id }));

    expect(paths).toEqual([card.id]);
  });

  it('moves the card to the top of the archived list before the response', async () => {
    server.use(http.post(`${cardUrl}/archive`, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useArchiveCard(boardId), { wrapper });

    act(() => result.current.mutate({ id: card.id }));

    await waitFor(() => expect(ids(queryClient, cardsKey)).toEqual(['c2']));
    expect(ids(queryClient, archivedCardsKey)).toEqual(['c1', 'c3']);
    expect(cached(queryClient, archivedCardsKey)?.archivedAt).toEqual(
      expect.any(String),
    );
    expect(queryClient.getQueryData<Card>(cardKey)?.archivedAt).toEqual(
      expect.any(String),
    );
  });

  it('leaves the archived list unloaded when it was not fetched', async () => {
    server.use(http.post(`${cardUrl}/archive`, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    queryClient.removeQueries({ queryKey: archivedCardsKey });
    const { result } = renderHook(() => useArchiveCard(boardId), { wrapper });

    act(() => result.current.mutate({ id: card.id }));

    await waitFor(() => expect(ids(queryClient, cardsKey)).toEqual(['c2']));
    expect(queryClient.getQueryData(archivedCardsKey)).toBeUndefined();
  });

  it('puts the card back at its index on failure', async () => {
    server.use(
      http.post(`${cardUrl}/archive`, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useArchiveCard(boardId), { wrapper });

    await act(() =>
      expect(result.current.mutateAsync({ id: card.id })).rejects.toThrow(
        ApiError,
      ),
    );

    expect(queryClient.getQueryData(cardsKey)).toEqual([card, neighbor]);
    expect(queryClient.getQueryData(archivedCardsKey)).toEqual([archivedCard]);
    expect(queryClient.getQueryData<Card>(cardKey)).toEqual(card);
  });

  it('keeps another archived card when only the first archive fails', async () => {
    let failFirst: (() => void) | undefined;
    server.use(
      http.post(`${cardUrl}/archive`, async ({ params }) => {
        if (params.id !== card.id) return delay('infinite');
        await new Promise<void>((resolve) => (failFirst = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({
        first: useArchiveCard(boardId),
        second: useArchiveCard(boardId),
      }),
      { wrapper },
    );

    act(() => result.current.first.mutate({ id: card.id }));
    await waitFor(() => expect(failFirst).toBeDefined());
    act(() => result.current.second.mutate({ id: neighbor.id }));
    await waitFor(() => expect(ids(queryClient, cardsKey)).toEqual([]));
    act(() => failFirst?.());

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    expect(ids(queryClient, cardsKey)).toEqual(['c1']);
    expect(ids(queryClient, archivedCardsKey)).toEqual(['c2', 'c3']);
  });
});

describe('useRestoreCard', () => {
  const restoredKey = boardViewKeys.card(boardId, archivedCard.id);

  it('posts to the unarchive path of the card', async () => {
    const paths: unknown[] = [];
    server.use(
      http.post(`${cardUrl}/unarchive`, ({ params }) => {
        paths.push(params.id);
        return HttpResponse.json({ ...archivedCard, archivedAt: null });
      }),
    );
    const { wrapper } = setup(archivedCard);
    const { result } = renderHook(() => useRestoreCard(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ id: archivedCard.id }));

    expect(paths).toEqual([archivedCard.id]);
  });

  it('moves the card to the end of its column before the response', async () => {
    server.use(http.post(`${cardUrl}/unarchive`, () => delay('infinite')));
    const { wrapper, queryClient } = setup(archivedCard);
    const { result } = renderHook(() => useRestoreCard(boardId), { wrapper });

    act(() => result.current.mutate({ id: archivedCard.id }));

    await waitFor(() => expect(ids(queryClient, archivedCardsKey)).toEqual([]));
    expect(ids(queryClient, cardsKey)).toEqual(['c1', 'c2', 'c3']);
    expect(cached(queryClient, cardsKey, archivedCard.id)).toMatchObject({
      archivedAt: null,
      position: 2,
    });
    expect(queryClient.getQueryData<Card>(restoredKey)?.archivedAt).toBeNull();
  });

  it('puts the card back at its index on failure', async () => {
    server.use(
      http.post(`${cardUrl}/unarchive`, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setup(archivedCard);
    const { result } = renderHook(() => useRestoreCard(boardId), { wrapper });

    await act(() =>
      expect(
        result.current.mutateAsync({ id: archivedCard.id }),
      ).rejects.toThrow(ApiError),
    );

    expect(queryClient.getQueryData(archivedCardsKey)).toEqual([archivedCard]);
    expect(queryClient.getQueryData(cardsKey)).toEqual([card, neighbor]);
    expect(queryClient.getQueryData<Card>(restoredKey)).toEqual(archivedCard);
  });
});
