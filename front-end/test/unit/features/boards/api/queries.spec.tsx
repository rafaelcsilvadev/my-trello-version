import type { Board } from '@my-trello/api-contract';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardKeys } from '@/features/boards/api/keys';
import { useBoards } from '@/features/boards/api/queries';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const boardsUrl = `${baseUrl}/api/v1/boards`;

function board(
  id: string,
  title: string,
  archivedAt: string | null = null,
): Board {
  return {
    id,
    title,
    description: null,
    archivedAt,
    createdAt: '2026-10-23T12:00:00.000Z',
    updatedAt: '2026-10-23T12:00:00.000Z',
  };
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

describe('useBoards', () => {
  it('requests the active list without a query string', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(boardsUrl, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json([]);
      }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useBoards(false), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(requests[0]?.search).toBe('');
  });

  it('sends archived=true for the archived list', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(boardsUrl, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json([]);
      }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useBoards(true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(requests[0]?.search).toBe('?archived=true');
  });

  it('keeps the order the API returns', async () => {
    const boards = [
      board('b2', 'Zeta'),
      board('b1', 'Alpha'),
      board('b3', 'Mid'),
    ];
    server.use(http.get(boardsUrl, () => HttpResponse.json(boards)));
    const { wrapper } = setup();

    const { result } = renderHook(() => useBoards(false), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((b) => b.id)).toEqual(['b2', 'b1', 'b3']);
  });

  it('caches the active and archived lists separately', async () => {
    server.use(
      http.get(boardsUrl, ({ request }) => {
        const archived = new URL(request.url).searchParams.get('archived');
        return HttpResponse.json(
          archived === 'true'
            ? [board('a1', 'Old', '2026-10-24T12:00:00.000Z')]
            : [board('b1', 'Current')],
        );
      }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(
      () => ({ active: useBoards(false), archived: useBoards(true) }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.active.isSuccess).toBe(true);
      expect(result.current.archived.isSuccess).toBe(true);
    });
    expect(result.current.active.data?.map((b) => b.id)).toEqual(['b1']);
    expect(result.current.archived.data?.map((b) => b.id)).toEqual(['a1']);
  });

  it('exposes an ApiError when the API answers 500', async () => {
    server.use(
      http.get(boardsUrl, () =>
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
    // A 5xx is retried with backoff; skip it so the test sees the first failure.
    queryClient.setQueryDefaults(boardKeys.all, { retry: false });

    const { result } = renderHook(() => useBoards(false), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(500);
  });
});
