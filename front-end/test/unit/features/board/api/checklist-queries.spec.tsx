import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useChecklistItems } from '@/features/board/api/checklist-queries';
import { boardViewKeys } from '@/features/board/api/keys';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import { boardId, checklistItem } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const cardId = 'c1';
const itemsUrl = `${baseUrl}/api/v1/cards/${cardId}/checklist-items`;

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

// Answers out of order, so the hook has to sort.
function recordItems() {
  const requests: URL[] = [];
  server.use(
    http.get(itemsUrl, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json([
        checklistItem('i3', cardId, { position: 3000 }),
        checklistItem('i1', cardId, { position: 1000 }),
        checklistItem('i2', cardId, { position: 2000 }),
      ]);
    }),
  );
  return requests;
}

describe('boardViewKeys.checklist', () => {
  it('nests the checklist key under the board prefix, apart from the card key', () => {
    const key = boardViewKeys.checklist(boardId, cardId);

    expect(key).toEqual(['board', boardId, 'checklist', cardId]);
    expect(key.slice(0, 2)).toEqual(boardViewKeys.all(boardId));
    const card = boardViewKeys.card(boardId, cardId);
    expect(key.slice(0, card.length)).not.toEqual(card);
  });
});

describe('useChecklistItems', () => {
  it('requests the items of the card and returns them sorted by position', async () => {
    const requests = recordItems();
    const { wrapper } = setup();

    const { result } = renderHook(() => useChecklistItems(boardId, cardId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toHaveLength(1);
    expect(result.current.data?.map((item) => item.id)).toEqual([
      'i1',
      'i2',
      'i3',
    ]);
  });

  it('exposes an ApiError with status 404 and does not retry', async () => {
    let calls = 0;
    server.use(
      http.get(itemsUrl, () => {
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

    const { result } = renderHook(() => useChecklistItems(boardId, cardId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(404);
    expect(calls).toBe(1);
  });

  it('refetches when the whole board is invalidated', async () => {
    const requests = recordItems();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useChecklistItems(boardId, cardId), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({
      queryKey: boardViewKeys.all(boardId),
    });

    expect(requests).toHaveLength(2);
  });

  it('is not refetched when only the card is invalidated', async () => {
    const requests = recordItems();
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useChecklistItems(boardId, cardId), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({
      queryKey: boardViewKeys.card(boardId, cardId),
    });

    expect(requests).toHaveLength(1);
  });

  it('leaves no cached copy once the detail closes', async () => {
    recordItems();
    const { wrapper, queryClient } = setup();
    const { result, unmount } = renderHook(
      () => useChecklistItems(boardId, cardId),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    unmount();

    await waitFor(() =>
      expect(
        queryClient.getQueryCache().find({
          queryKey: boardViewKeys.checklist(boardId, cardId),
        }),
      ).toBeUndefined(),
    );
  });
});
