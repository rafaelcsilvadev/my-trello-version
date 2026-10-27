import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBoardViewModel } from '@/features/board/view-models/use-board-view-model';
import { ApiProvider } from '@/shared/api/api-context';
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
const listsUrl = `${boardUrl}/lists`;
const cardsUrl = `${boardUrl}/cards`;
const labelsUrl = `${boardUrl}/labels`;

const backlog = listFixture('l1', { title: 'Backlog', position: 1 });
const doing = listFixture('l2', { title: 'Doing', position: 0 });
const urgent = labelFixture('lb1', { name: 'Urgent', color: 'red' });

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

type Reply = () => Response;

// Each endpoint answers with its seed unless a test overrides it; `requests` counts the hits.
function boardServer(overrides: Partial<Record<string, Reply>> = {}) {
  const requests: Record<string, number> = {};
  const seed: Record<string, JsonBodyType> = {
    [boardUrl]: boardFixture(),
    [listsUrl]: [backlog, doing],
    [cardsUrl]: [
      cardFixture('c1', backlog.id, { position: 1 }),
      cardFixture('c2', backlog.id, { position: 0 }),
      cardFixture('c3', doing.id),
    ],
    [labelsUrl]: [urgent],
  };
  server.use(
    ...Object.entries(seed).map(([url, body]) =>
      http.get(url, () => {
        requests[url] = (requests[url] ?? 0) + 1;
        return overrides[url]?.() ?? HttpResponse.json(body);
      }),
    ),
  );
  return requests;
}

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  // Keeps the retry policy but skips its backoff, so a 5xx fails fast.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useBoardViewModel(boardId), { wrapper });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useBoardViewModel', () => {
  describe('load', () => {
    it('is loading until every board query answers, then ready', async () => {
      boardServer();
      const { result } = setup();

      expect(result.current.state.status).toBe('loading');

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.board?.title).toBe('Product launch');
    });

    it('builds the columns by position with their cards by position', async () => {
      boardServer();
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(
        result.current.state.columns.map(({ list, cards }) => [
          list.title,
          cards.map((card) => card.id),
        ]),
      ).toEqual([
        ['Doing', ['c3']],
        ['Backlog', ['c2', 'c1']],
      ]);
    });

    it('indexes the board labels by id', async () => {
      boardServer();
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.labelsById.get('lb1')).toEqual(urgent);
    });

    it('treats the local calendar date as today', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 1, 23, 30));
      boardServer();
      const { result } = setup();

      expect(result.current.state.today).toEqual({
        year: 2026,
        month: 11,
        day: 1,
      });
    });

    it.each([boardUrl, listsUrl, cardsUrl])(
      'is notFound when %s answers 404',
      async (url) => {
        boardServer({ [url]: () => problem(404) });
        const { result } = setup();

        await waitFor(() =>
          expect(result.current.state.status).toBe('notFound'),
        );
      },
    );

    it('is error when a query keeps failing with 500', async () => {
      boardServer({ [cardsUrl]: () => problem(500) });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('error'));
    });

    it('prefers notFound over error when both happen', async () => {
      boardServer({
        [boardUrl]: () => problem(404),
        [labelsUrl]: () => problem(500),
      });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('notFound'));
    });

    it('retryLoad refetches only the failed queries and turns ready', async () => {
      let failing = true;
      const requests = boardServer({
        [cardsUrl]: () => (failing ? problem(500) : HttpResponse.json([])),
      });
      const { result } = setup();
      await waitFor(() => expect(result.current.state.status).toBe('error'));
      const before = { ...requests };

      failing = false;
      act(() => result.current.actions.retryLoad());

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(requests[cardsUrl]).toBe(before[cardsUrl] + 1);
      expect(requests[boardUrl]).toBe(before[boardUrl]);
      expect(requests[listsUrl]).toBe(before[listsUrl]);
      expect(requests[labelsUrl]).toBe(before[labelsUrl]);
    });
  });

  describe('read-only', () => {
    it('is not read-only for an active board', async () => {
      boardServer();
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.readOnly).toBe(false);
    });

    it('is read-only for an archived board', async () => {
      boardServer({
        [boardUrl]: () =>
          HttpResponse.json(
            boardFixture({ archivedAt: '2026-10-24T12:00:00.000Z' }),
          ),
      });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(result.current.state.readOnly).toBe(true);
    });
  });
});
