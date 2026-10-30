import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import type { ChecklistItem } from '@/features/board/model/types';
import { useCardChecklistViewModel } from '@/features/board/view-models/use-card-checklist-view-model';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import { boardId, checklistItem } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const cardId = 'c1';
const cardUrl = `${baseUrl}/api/v1/cards/${cardId}`;
const itemsUrl = `${cardUrl}/checklist-items`;

// Out of order, so the view model has to show them sorted.
const seed = [
  checklistItem('i2', cardId, { position: 2000 }),
  checklistItem('i1', cardId, { position: 1000, done: true }),
  checklistItem('i3', cardId, { position: 3000 }),
];

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

// Answers each items request with the next queued reply, or with the seed.
// The card endpoint only counts hits, to prove a retry leaves it alone.
function checklistServer(...replies: (() => Response | Promise<Response>)[]) {
  const requests = { items: 0, card: 0 };
  server.use(
    http.get(itemsUrl, () => {
      requests.items += 1;
      return (replies.shift() ?? (() => HttpResponse.json(seed)))();
    }),
    http.get(cardUrl, () => {
      requests.card += 1;
      return HttpResponse.json(null);
    }),
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
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  const rendered = renderHook(
    () => useCardChecklistViewModel(boardId, cardId),
    { wrapper },
  );
  return { ...rendered, queryClient };
}

async function setupReady() {
  const rendered = setup();
  await waitFor(() =>
    expect(rendered.result.current.state.status).toBe('ready'),
  );
  return rendered;
}

// Holds a reply until the test opens it, to see the state before the answer.
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

describe('useCardChecklistViewModel — load', () => {
  it('is loading until the items arrive', async () => {
    const hold = gate();
    checklistServer(async () => {
      await hold.opened;
      return HttpResponse.json(seed);
    });

    const { result } = setup();

    expect(result.current.state.status).toBe('loading');
    expect(result.current.state.items).toEqual([]);
    hold.open();
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('shows the items sorted by position with their progress', async () => {
    checklistServer();

    const { result } = await setupReady();

    expect(result.current.state.items.map((item) => item.id)).toEqual([
      'i1',
      'i2',
      'i3',
    ]);
    expect(result.current.state.progress).toEqual({
      done: 1,
      total: 3,
      percent: 33,
      isComplete: false,
    });
  });

  it('shows an empty checklist with no progress', async () => {
    checklistServer(() => HttpResponse.json([]));

    const { result } = await setupReady();

    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.progress).toEqual({
      done: 0,
      total: 0,
      percent: 0,
      isComplete: false,
    });
  });

  it('is an error when the items fail with a 5xx', async () => {
    checklistServer(...Array.from({ length: 4 }, () => () => problem(500)));

    const { result } = setup();

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.query.error?.status).toBe(500);
  });

  it('retryLoad refetches only the checklist and reaches ready', async () => {
    const requests = checklistServer(
      ...Array.from({ length: 4 }, () => () => problem(500)),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    const failed = requests.items;

    act(() => result.current.actions.retryLoad());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(requests.items).toBe(failed + 1);
    expect(requests.card).toBe(0);
    expect(result.current.state.items).toHaveLength(3);
  });

  it('keeps the items shown when a refetch fails', async () => {
    const requests = checklistServer();
    const { result, queryClient } = await setupReady();
    server.use(http.get(itemsUrl, () => problem(500)));

    await act(() =>
      queryClient.refetchQueries({
        queryKey: boardViewKeys.checklist(boardId, cardId),
      }),
    );

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(requests.items).toBe(1);
    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.items).toHaveLength(3);
  });
});

describe('useCardChecklistViewModel — progress', () => {
  it('follows the cache when an item is ticked', async () => {
    checklistServer();
    const { result, queryClient } = await setupReady();

    act(() =>
      queryClient.setQueryData<ChecklistItem[]>(
        boardViewKeys.checklist(boardId, cardId),
        (items) =>
          items?.map((item) =>
            item.id === 'i2' ? { ...item, done: true } : item,
          ),
      ),
    );

    await waitFor(() =>
      expect(result.current.state.progress).toEqual({
        done: 2,
        total: 3,
        percent: 67,
        isComplete: false,
      }),
    );
  });

  it('is complete once every item is done', async () => {
    checklistServer();
    const { result, queryClient } = await setupReady();

    act(() =>
      queryClient.setQueryData<ChecklistItem[]>(
        boardViewKeys.checklist(boardId, cardId),
        (items) => items?.map((item) => ({ ...item, done: true })),
      ),
    );

    await waitFor(() =>
      expect(result.current.state.progress).toEqual({
        done: 3,
        total: 3,
        percent: 100,
        isComplete: true,
      }),
    );
  });
});
