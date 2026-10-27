import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useArchivedListCounts } from '@/features/board/api/archived-counts';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const archivedCardsUrl = `${baseUrl}/api/v1/boards/${boardId}/cards`;
const archivedAt = '2026-10-02T12:00:00.000Z';
const backlog = listFixture('l1', { archivedAt });
const ideas = listFixture('l2', { archivedAt });

function listCardsUrl(listId: string) {
  return `${baseUrl}/api/v1/lists/${listId}/cards`;
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
  return { wrapper };
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

describe('useArchivedListCounts', () => {
  it('requests the active cards of each archived list once', async () => {
    record(archivedCardsUrl, []);
    const backlogRequests = record(listCardsUrl(backlog.id), []);
    const ideasRequests = record(listCardsUrl(ideas.id), []);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useArchivedListCounts(boardId, [backlog, ideas], true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.get(ideas.id)).toBe(0));
    expect(backlogRequests).toHaveLength(1);
    expect(ideasRequests).toHaveLength(1);
    expect(backlogRequests[0]?.search).toBe('');
  });

  it('counts the active and archived cards of each list', async () => {
    record(archivedCardsUrl, [
      cardFixture('c3', backlog.id, { archivedAt }),
      cardFixture('c4', 'active-list', { archivedAt }),
    ]);
    record(listCardsUrl(backlog.id), [
      cardFixture('c1', backlog.id),
      cardFixture('c2', backlog.id),
    ]);
    record(listCardsUrl(ideas.id), []);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useArchivedListCounts(boardId, [backlog, ideas], true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.get(backlog.id)).toBe(3));
    expect(result.current.get(ideas.id)).toBe(0);
    expect(result.current.size).toBe(2);
  });

  it('leaves a count undefined while one of its requests is pending', async () => {
    record(archivedCardsUrl, []);
    record(listCardsUrl(backlog.id), []);
    server.use(http.get(listCardsUrl(ideas.id), () => delay('infinite')));
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useArchivedListCounts(boardId, [backlog, ideas], true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.get(backlog.id)).toBe(0));
    expect(result.current.has(ideas.id)).toBe(true);
    expect(result.current.get(ideas.id)).toBeUndefined();
  });

  it('leaves every count undefined until the archived cards arrive', async () => {
    server.use(http.get(archivedCardsUrl, () => delay('infinite')));
    const backlogRequests = record(listCardsUrl(backlog.id), []);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useArchivedListCounts(boardId, [backlog], true),
      { wrapper },
    );

    await waitFor(() => expect(backlogRequests).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.get(backlog.id)).toBeUndefined();
  });

  it('sends nothing while disabled', async () => {
    const archivedRequests = record(archivedCardsUrl, []);
    const backlogRequests = record(listCardsUrl(backlog.id), []);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useArchivedListCounts(boardId, [backlog], false),
      { wrapper },
    );

    // Give a request the chance to go out before asserting it never did.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(archivedRequests).toHaveLength(0);
    expect(backlogRequests).toHaveLength(0);
    expect(result.current.get(backlog.id)).toBeUndefined();
  });
});
