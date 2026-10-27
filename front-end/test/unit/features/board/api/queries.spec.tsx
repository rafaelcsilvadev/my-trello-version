import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import {
  useBoard,
  useCards,
  useLabels,
  useLists,
} from '@/features/board/api/queries';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardFixture,
  boardId,
  cardFixture,
  labelFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const boardUrl = `${baseUrl}/api/v1/boards/${boardId}`;

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

function record(url: string, body: JsonBodyType) {
  const requests: URL[] = [];
  server.use(
    http.get(url, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json(body);
    }),
  );
  return requests;
}

describe('boardViewKeys', () => {
  it('nests every key under the board prefix', () => {
    const prefix = boardViewKeys.all(boardId);

    expect(prefix).toEqual(['board', boardId]);
    for (const key of [
      boardViewKeys.detail(boardId),
      boardViewKeys.lists(boardId, false),
      boardViewKeys.cards(boardId, true),
      boardViewKeys.labels(boardId),
      boardViewKeys.listCards(boardId, 'l1'),
    ]) {
      expect(key.slice(0, 2)).toEqual(prefix);
    }
  });
});

describe('useBoard', () => {
  it('requests the board by id', async () => {
    const requests = record(boardUrl, boardFixture());
    const { wrapper } = setup();

    const { result } = renderHook(() => useBoard(boardId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(result.current.data?.title).toBe('Product launch');
  });

  it('exposes an ApiError with status 404 when the board is missing', async () => {
    server.use(
      http.get(boardUrl, () =>
        HttpResponse.json(
          {
            type: '/problems/404',
            title: 'Not Found',
            status: 404,
            detail: '',
          },
          {
            status: 404,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useBoard(boardId), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(404);
  });
});

describe('useLists', () => {
  it('requests the active lists without a query string', async () => {
    const requests = record(`${boardUrl}/lists`, [listFixture('l1')]);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLists(boardId, false), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(requests[0]?.search).toBe('');
    expect(result.current.data?.map((l) => l.id)).toEqual(['l1']);
  });

  it('sends archived=true for the archived lists', async () => {
    const requests = record(`${boardUrl}/lists`, []);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLists(boardId, true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0]?.search).toBe('?archived=true');
  });

  it('sends nothing while disabled', async () => {
    const requests = record(`${boardUrl}/lists`, []);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useLists(boardId, true, { enabled: false }),
      { wrapper },
    );

    // Give a request the chance to go out before asserting it never did.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });
});

describe('useCards', () => {
  it('requests the active cards without a query string', async () => {
    const requests = record(`${boardUrl}/cards`, [cardFixture('c1', 'l1')]);
    const { wrapper } = setup();

    const { result } = renderHook(() => useCards(boardId, false), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0]?.search).toBe('');
    expect(result.current.data?.map((c) => c.id)).toEqual(['c1']);
  });

  it('sends archived=true for the archived cards', async () => {
    const requests = record(`${boardUrl}/cards`, []);
    const { wrapper } = setup();

    const { result } = renderHook(() => useCards(boardId, true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0]?.search).toBe('?archived=true');
  });

  it('sends nothing while disabled', async () => {
    const requests = record(`${boardUrl}/cards`, []);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useCards(boardId, true, { enabled: false }),
      { wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });

  it('caches the active and archived cards separately', async () => {
    server.use(
      http.get(`${boardUrl}/cards`, ({ request }) => {
        const archived = new URL(request.url).searchParams.get('archived');
        return HttpResponse.json(
          archived === 'true'
            ? [
                cardFixture('c2', 'l1', {
                  archivedAt: '2026-10-24T12:00:00.000Z',
                }),
              ]
            : [cardFixture('c1', 'l1')],
        );
      }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(
      () => ({
        active: useCards(boardId, false),
        archived: useCards(boardId, true),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.active.isSuccess).toBe(true);
      expect(result.current.archived.isSuccess).toBe(true);
    });
    expect(result.current.active.data?.map((c) => c.id)).toEqual(['c1']);
    expect(result.current.archived.data?.map((c) => c.id)).toEqual(['c2']);
  });
});

describe('useLabels', () => {
  it('requests the labels of the board', async () => {
    const requests = record(`${boardUrl}/labels`, [labelFixture('lb1')]);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLabels(boardId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(result.current.data?.map((l) => l.id)).toEqual(['lb1']);
  });
});
