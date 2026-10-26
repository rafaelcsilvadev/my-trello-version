import type { Board } from '@my-trello/api-contract';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardKeys } from '@/features/boards/api/keys';
import {
  useCreateBoard,
  useUpdateBoard,
} from '@/features/boards/api/mutations';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const boardsUrl = `${baseUrl}/api/v1/boards`;

const created: Board = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  title: 'Roadmap',
  description: 'Q4 plans',
  archivedAt: null,
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
};

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  // Both lists start cached and fresh, so invalidation is visible on their state.
  queryClient.setQueryData(boardKeys.list(false), []);
  queryClient.setQueryData(boardKeys.list(true), []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

const roadmap: Board = { ...created, title: 'Roadmap' };
const backlog: Board = {
  ...created,
  id: '9b2d4a1e-3c5f-4e8a-9d7b-1f6e2c8a4b3d',
  title: 'Backlog',
  description: null,
};

const serverError = () =>
  HttpResponse.json(
    { type: '/problems/500', title: 'Error', status: 500, detail: '' },
    {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );

// Holds a request open until the test releases it, so the cache can be read mid-flight.
function gate() {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release };
}

function boardUrl(id: string) {
  return `${boardsUrl}/${id}`;
}

describe('useCreateBoard', () => {
  it('sends the body as given', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(boardsUrl, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateBoard(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ title: 'Roadmap', description: 'Q4 plans' }),
    );

    expect(bodies).toEqual([{ title: 'Roadmap', description: 'Q4 plans' }]);
  });

  it('returns the created board', async () => {
    server.use(
      http.post(boardsUrl, () => HttpResponse.json(created, { status: 201 })),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateBoard(), { wrapper });

    const board = await act(() =>
      result.current.mutateAsync({ title: 'Roadmap' }),
    );

    expect(board).toEqual(created);
  });

  it('invalidates only the active list on success', async () => {
    server.use(
      http.post(boardsUrl, () => HttpResponse.json(created, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateBoard(), { wrapper });

    await act(() => result.current.mutateAsync({ title: 'Roadmap' }));

    await waitFor(() =>
      expect(
        queryClient.getQueryState(boardKeys.list(false))?.isInvalidated,
      ).toBe(true),
    );
    expect(queryClient.getQueryState(boardKeys.list(true))?.isInvalidated).toBe(
      false,
    );
  });

  it('keeps the active list valid and surfaces an ApiError on failure', async () => {
    server.use(
      http.post(boardsUrl, () =>
        HttpResponse.json(
          { type: '/problems/500', title: 'Error', status: 500, detail: '' },
          {
            status: 500,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateBoard(), { wrapper });

    act(() => result.current.mutate({ title: 'Roadmap' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(500);
    expect(
      queryClient.getQueryState(boardKeys.list(false))?.isInvalidated,
    ).toBe(false);
  });
});

describe('useUpdateBoard', () => {
  it('sends the body to the board path', async () => {
    const requests: { id: unknown; body: unknown }[] = [];
    server.use(
      http.patch(`${boardsUrl}/:id`, async ({ params, request }) => {
        requests.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ ...roadmap, title: 'Plans' });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateBoard(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        board: roadmap,
        body: { title: 'Plans', description: null },
      }),
    );

    expect(requests).toEqual([
      { id: roadmap.id, body: { title: 'Plans', description: null } },
    ]);
  });

  it('shows the new title in the active list before the response', async () => {
    const response = gate();
    server.use(
      http.patch(boardUrl(roadmap.id), async () => {
        await response.opened;
        return HttpResponse.json({ ...roadmap, title: 'Plans' });
      }),
    );
    const { wrapper, queryClient } = setup();
    queryClient.setQueryData(boardKeys.list(false), [roadmap, backlog]);
    const { result } = renderHook(() => useUpdateBoard(), { wrapper });

    act(() =>
      result.current.mutate({
        board: roadmap,
        body: { title: 'Plans', description: 'Q4 plans' },
      }),
    );

    await waitFor(() =>
      expect(queryClient.getQueryData(boardKeys.list(false))).toEqual([
        { ...roadmap, title: 'Plans' },
        backlog,
      ]),
    );
    expect(result.current.isPending).toBe(true);
    response.release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('restores the previous list and surfaces an ApiError on a 500', async () => {
    server.use(http.patch(boardUrl(roadmap.id), serverError));
    const { wrapper, queryClient } = setup();
    queryClient.setQueryData(boardKeys.list(false), [roadmap, backlog]);
    const { result } = renderHook(() => useUpdateBoard(), { wrapper });

    act(() =>
      result.current.mutate({ board: roadmap, body: { title: 'Plans' } }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(500);
    expect(queryClient.getQueryData(boardKeys.list(false))).toEqual([
      roadmap,
      backlog,
    ]);
  });

  it('invalidates both board lists once the change settles', async () => {
    server.use(
      http.patch(boardUrl(roadmap.id), () =>
        HttpResponse.json({ ...roadmap, title: 'Plans' }),
      ),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useUpdateBoard(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ board: roadmap, body: { title: 'Plans' } }),
    );

    await waitFor(() =>
      expect(
        queryClient.getQueryState(boardKeys.list(false))?.isInvalidated,
      ).toBe(true),
    );
    expect(queryClient.getQueryState(boardKeys.list(true))?.isInvalidated).toBe(
      true,
    );
  });

  it('waits for the last pending board change before invalidating', async () => {
    const second = gate();
    server.use(
      http.patch(boardUrl(roadmap.id), () =>
        HttpResponse.json({ ...roadmap, title: 'Plans' }),
      ),
      http.patch(boardUrl(backlog.id), async () => {
        await second.opened;
        return HttpResponse.json({ ...backlog, title: 'Ideas' });
      }),
    );
    const { wrapper, queryClient } = setup();
    queryClient.setQueryData(boardKeys.list(false), [roadmap, backlog]);
    const { result } = renderHook(
      () => ({ first: useUpdateBoard(), second: useUpdateBoard() }),
      { wrapper },
    );

    act(() =>
      result.current.second.mutate({
        board: backlog,
        body: { title: 'Ideas' },
      }),
    );
    await act(() =>
      result.current.first.mutateAsync({
        board: roadmap,
        body: { title: 'Plans' },
      }),
    );

    // A refetch now would overwrite the second change, still in flight.
    expect(
      queryClient.getQueryState(boardKeys.list(false))?.isInvalidated,
    ).toBe(false);
    expect(queryClient.getQueryData(boardKeys.list(false))).toEqual([
      { ...roadmap, title: 'Plans' },
      { ...backlog, title: 'Ideas' },
    ]);

    second.release();
    await waitFor(() =>
      expect(
        queryClient.getQueryState(boardKeys.list(false))?.isInvalidated,
      ).toBe(true),
    );
  });
});
