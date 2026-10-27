import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import {
  usePendingItemIds,
  useRenameList,
} from '@/features/board/api/mutations';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { boardId, listFixture } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const listUrl = `${baseUrl}/api/v1/lists/:id`;
const backlog = listFixture('l1', { title: 'Backlog' });
const doing = listFixture('l2', { title: 'Doing', position: 1 });
const listsKey = boardViewKeys.lists(boardId, false);

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

function titles(queryClient: ReturnType<typeof setup>['queryClient']) {
  return queryClient
    .getQueryData<(typeof backlog)[]>(listsKey)
    ?.map((list) => list.title);
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
