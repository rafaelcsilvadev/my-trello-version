import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useCardDetail } from '@/features/board/api/card-detail-queries';
import { boardViewKeys } from '@/features/board/api/keys';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { boardId, cardFixture } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const cardId = 'c1';
const cardUrl = `${baseUrl}/api/v1/cards/${cardId}`;

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  // Retries run at once so the network error case does not wait on backoff.
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

// Answers with the card under a server-side title, so a seeded value is told apart.
function recordCard(title = 'From the server') {
  const requests: URL[] = [];
  server.use(
    http.get(cardUrl, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json(cardFixture(cardId, 'l1', { title }));
    }),
  );
  return requests;
}

function seed(queryClient: QueryClient, archived: boolean, title: string) {
  queryClient.setQueryData(boardViewKeys.cards(boardId, archived), [
    cardFixture('c0', 'l1'),
    cardFixture(cardId, 'l1', { title }),
  ]);
}

describe('boardViewKeys.card', () => {
  it('nests the card key under the board prefix', () => {
    expect(boardViewKeys.card(boardId, cardId)).toEqual([
      'board',
      boardId,
      'card',
      cardId,
    ]);
  });
});

describe('useCardDetail', () => {
  it('requests the card by id', async () => {
    const requests = recordCard();
    const { wrapper } = setup();

    const { result } = renderHook(() => useCardDetail(boardId, cardId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(result.current.data?.title).toBe('From the server');
  });

  it.each([
    ['active', false],
    ['archived', true],
  ])(
    'returns the card from the %s board list at once and still refetches it',
    async (_name, archived) => {
      const requests = recordCard();
      const { wrapper, queryClient } = setup();
      seed(queryClient, archived, 'From the board');

      const { result } = renderHook(() => useCardDetail(boardId, cardId), {
        wrapper,
      });

      expect(result.current.data?.title).toBe('From the board');
      await waitFor(() =>
        expect(result.current.data?.title).toBe('From the server'),
      );
      expect(requests).toHaveLength(1);
    },
  );

  it('exposes an ApiError with status 404 and does not retry', async () => {
    let calls = 0;
    server.use(
      http.get(cardUrl, () => {
        calls += 1;
        return HttpResponse.json(
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
        );
      }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useCardDetail(boardId, cardId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(404);
    expect(calls).toBe(1);
  });

  it('retries after a network error', async () => {
    let calls = 0;
    server.use(
      http.get(cardUrl, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json(cardFixture(cardId, 'l1'));
      }),
    );
    const { wrapper } = setup();

    const { result } = renderHook(() => useCardDetail(boardId, cardId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toBe(2);
  });

  it('refetches when the whole board is invalidated', async () => {
    const requests = recordCard();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCardDetail(boardId, cardId), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({
      queryKey: boardViewKeys.all(boardId),
    });

    expect(requests).toHaveLength(2);
  });

  it('leaves no cached copy once the detail closes', async () => {
    recordCard();
    const { wrapper, queryClient } = setup();
    const { result, unmount } = renderHook(
      () => useCardDetail(boardId, cardId),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    unmount();

    await waitFor(() =>
      expect(
        queryClient.getQueryCache().find({
          queryKey: boardViewKeys.card(boardId, cardId),
        }),
      ).toBeUndefined(),
    );
  });
});
