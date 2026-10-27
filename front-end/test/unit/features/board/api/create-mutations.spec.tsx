import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  useCreateCard,
  useCreateList,
} from '@/features/board/api/create-mutations';
import { boardViewKeys } from '@/features/board/api/keys';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const listsUrl = `${baseUrl}/api/v1/boards/${boardId}/lists`;
const backlog = listFixture('l1');
const doing = listFixture('l2', { position: 1 });
const cardsUrl = `${baseUrl}/api/v1/lists/${backlog.id}/cards`;
const first = cardFixture('c1', backlog.id);
const second = cardFixture('c2', backlog.id, { position: 1 });

const invalidTitle = {
  statusCode: 400,
  error: 'Bad Request',
  message: ['title must be shorter than or equal to 100 characters'],
};

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(boardViewKeys.lists(boardId, false), [backlog]);
  queryClient.setQueryData(boardViewKeys.cards(boardId, false), [first]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useCreateList', () => {
  it('posts the body to the lists of the board', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(listsUrl, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(doing, { status: 201 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateList(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ title: 'Doing' }));

    expect(bodies).toEqual([{ title: 'Doing' }]);
  });

  it('leaves the cached lists untouched until the response arrives', async () => {
    server.use(http.post(listsUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateList(boardId), { wrapper });

    act(() => result.current.mutate({ title: 'Doing' }));

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(
      queryClient.getQueryData(boardViewKeys.lists(boardId, false)),
    ).toEqual([backlog]);
  });

  it('appends the created list at the end and invalidates the active lists', async () => {
    server.use(
      http.post(listsUrl, () => HttpResponse.json(doing, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateList(boardId), { wrapper });

    await act(() => result.current.mutateAsync({ title: 'Doing' }));

    const key = boardViewKeys.lists(boardId, false);
    expect(queryClient.getQueryData(key)).toEqual([backlog, doing]);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('keeps the cached lists as they were when the request fails', async () => {
    server.use(
      http.post(listsUrl, () =>
        HttpResponse.json(invalidTitle, { status: 400 }),
      ),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateList(boardId), { wrapper });

    await act(() =>
      expect(result.current.mutateAsync({ title: 'Doing' })).rejects.toThrow(
        ApiError,
      ),
    );

    const key = boardViewKeys.lists(boardId, false);
    expect(queryClient.getQueryData(key)).toEqual([backlog]);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
  });
});

describe('useCreateCard', () => {
  it('posts the body to the cards of the list', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(cardsUrl, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(second, { status: 201 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateCard(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        listId: backlog.id,
        body: { title: 'Write spec' },
      }),
    );

    expect(bodies).toEqual([{ title: 'Write spec' }]);
  });

  it('leaves the cached cards untouched until the response arrives', async () => {
    server.use(http.post(cardsUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateCard(boardId), { wrapper });

    act(() =>
      result.current.mutate({
        listId: backlog.id,
        body: { title: 'Write spec' },
      }),
    );

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(
      queryClient.getQueryData(boardViewKeys.cards(boardId, false)),
    ).toEqual([first]);
  });

  it('appends the created card at the end and invalidates the active cards', async () => {
    server.use(
      http.post(cardsUrl, () => HttpResponse.json(second, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateCard(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        listId: backlog.id,
        body: { title: 'Write spec' },
      }),
    );

    const key = boardViewKeys.cards(boardId, false);
    expect(queryClient.getQueryData(key)).toEqual([first, second]);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('keeps the cached cards as they were when the request fails', async () => {
    server.use(
      http.post(cardsUrl, () =>
        HttpResponse.json(invalidTitle, { status: 400 }),
      ),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateCard(boardId), { wrapper });

    await act(() =>
      expect(
        result.current.mutateAsync({
          listId: backlog.id,
          body: { title: 'Write spec' },
        }),
      ).rejects.toThrow(ApiError),
    );

    const key = boardViewKeys.cards(boardId, false);
    expect(queryClient.getQueryData(key)).toEqual([first]);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it('does not create the cached cards when none were loaded', async () => {
    server.use(
      http.post(cardsUrl, () => HttpResponse.json(second, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    queryClient.removeQueries({
      queryKey: boardViewKeys.cards(boardId, false),
    });
    const { result } = renderHook(() => useCreateCard(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        listId: backlog.id,
        body: { title: 'Write spec' },
      }),
    );

    expect(
      queryClient.getQueryData(boardViewKeys.cards(boardId, false)),
    ).toBeUndefined();
  });
});
