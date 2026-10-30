import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCardDetailViewModel } from '@/features/board/view-models/use-card-detail-view-model';
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
const archivedListsUrl = `${listsUrl}?archived=true`;
const labelsUrl = `${boardUrl}/labels`;
const cardId = 'c1';
const cardUrl = `${baseUrl}/api/v1/cards/${cardId}`;

const stamp = '2026-10-20T12:00:00.000Z';
const backlog = listFixture('l1', { title: 'Backlog' });
const doing = listFixture('l2', { title: 'Doing' });
const ideas = listFixture('l3', { title: 'Ideas', archivedAt: stamp });
const urgent = labelFixture('lb1', { name: 'Urgent', color: 'red' });
const later = labelFixture('lb2', { name: 'Later', color: 'blue' });
const bug = labelFixture('lb3', { name: 'Bug', color: 'orange' });

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

// `undefined` falls back to the seed.
type Reply = () => Response | undefined | Promise<Response | undefined>;

// Each endpoint answers with its seed unless a test overrides it; `requests` counts the hits.
// The archived lists are keyed by their `?archived=true` URL.
function detailServer(overrides: Partial<Record<string, Reply>> = {}) {
  const requests: Record<string, number> = {};
  const seed: Record<string, JsonBodyType> = {
    [cardUrl]: cardFixture(cardId, backlog.id),
    [boardUrl]: boardFixture(),
    [listsUrl]: [backlog, doing],
    [archivedListsUrl]: [ideas],
    [labelsUrl]: [urgent, later, bug],
  };
  async function reply(url: string) {
    requests[url] = (requests[url] ?? 0) + 1;
    return (await overrides[url]?.()) ?? HttpResponse.json(seed[url] ?? null);
  }
  server.use(
    ...[cardUrl, boardUrl, listsUrl, labelsUrl].map((url) =>
      http.get(url, ({ request }) =>
        reply(
          new URL(request.url).searchParams.get('archived') === 'true'
            ? `${url}?archived=true`
            : url,
        ),
      ),
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
  return renderHook(() => useCardDetailViewModel(boardId, cardId), {
    wrapper,
  });
}

async function setupReady() {
  const rendered = setup();
  await waitFor(() =>
    expect(rendered.result.current.state.status).toBe('ready'),
  );
  return rendered;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useCardDetailViewModel', () => {
  describe('load status', () => {
    it('is ready with the card once every query loaded', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.card?.id).toBe(cardId);
    });

    it.each([cardUrl, boardUrl, listsUrl, archivedListsUrl, labelsUrl])(
      'is loading while %s is pending',
      async (url) => {
        let release: () => void = () => undefined;
        const gate = new Promise<undefined>((resolve) => {
          release = () => resolve(undefined);
        });
        const requests = detailServer({ [url]: () => gate });
        const { result } = setup();

        // Every other query has answered; only the gated one is still out.
        await waitFor(() =>
          expect(Object.keys(requests).sort()).toEqual(
            [cardUrl, boardUrl, listsUrl, archivedListsUrl, labelsUrl].sort(),
          ),
        );
        expect(result.current.state.status).toBe('loading');

        release();
        await waitFor(() => expect(result.current.state.status).toBe('ready'));
      },
    );

    it.each([cardUrl, boardUrl])(
      'is notFound when %s answers 404',
      async (url) => {
        detailServer({ [url]: () => problem(404) });
        const { result } = setup();

        await waitFor(() =>
          expect(result.current.state.status).toBe('notFound'),
        );
      },
    );

    it('is notFound when the card belongs to a list of another board', async () => {
      detailServer({
        [cardUrl]: () => HttpResponse.json(cardFixture(cardId, 'l-other')),
      });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('notFound'));
    });

    it('is error when a query keeps failing with 500', async () => {
      detailServer({ [cardUrl]: () => problem(500) });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('error'));
    });

    it('retryLoad refetches only the failed queries and turns ready', async () => {
      let failing = true;
      const requests = detailServer({
        [archivedListsUrl]: () => (failing ? problem(500) : undefined),
      });
      const { result } = setup();
      await waitFor(() => expect(result.current.state.status).toBe('error'));
      const before = { ...requests };

      failing = false;
      act(() => result.current.actions.retryLoad());

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(requests[archivedListsUrl]).toBe(before[archivedListsUrl] + 1);
      expect(requests[cardUrl]).toBe(before[cardUrl]);
      expect(requests[boardUrl]).toBe(before[boardUrl]);
      expect(requests[listsUrl]).toBe(before[listsUrl]);
      expect(requests[labelsUrl]).toBe(before[labelsUrl]);
    });
  });

  describe('mode', () => {
    it('is editable for an active card of an active board', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.mode).toBe('editable');
    });

    it('is archivedCard for an archived card of an active board', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, { archivedAt: stamp }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.mode).toBe('archivedCard');
    });

    it('is archivedBoard when the board is archived, even for an archived card', async () => {
      detailServer({
        [boardUrl]: () =>
          HttpResponse.json(boardFixture({ archivedAt: stamp })),
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, { archivedAt: stamp }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.mode).toBe('archivedBoard');
    });
  });

  describe('column', () => {
    it('resolves an active column', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.list?.title).toBe('Backlog');
      expect(result.current.state.isColumnArchived).toBe(false);
    });

    it('resolves an archived column', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, ideas.id, { archivedAt: stamp }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.list?.title).toBe('Ideas');
      expect(result.current.state.isColumnArchived).toBe(true);
    });

    it('lists only the active columns as move targets', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.activeLists.map((l) => l.id)).toEqual([
        backlog.id,
        doing.id,
      ]);
    });
  });

  describe('labels', () => {
    it('follows the board label order and skips unknown ids', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, {
              labelIds: [bug.id, 'lb-gone', urgent.id],
            }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.labels.map((l) => l.name)).toEqual([
        'Urgent',
        'Bug',
      ]);
    });
  });

  it('treats the local calendar date as today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 1, 23, 30));
    detailServer();
    const { result } = setup();

    expect(result.current.state.today).toEqual({
      year: 2026,
      month: 11,
      day: 1,
    });
  });
});
