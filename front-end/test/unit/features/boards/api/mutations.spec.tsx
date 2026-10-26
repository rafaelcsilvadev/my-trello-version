import type { Board } from '@my-trello/api-contract';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardKeys } from '@/features/boards/api/keys';
import { useCreateBoard } from '@/features/boards/api/mutations';
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
