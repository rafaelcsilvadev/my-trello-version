import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

// Answers each create with the next queued reply, or with a 201 of the sent text.
function createServer(...replies: (() => Response | Promise<Response>)[]) {
  const bodies: unknown[] = [];
  server.use(
    http.post(itemsUrl, async ({ request }) => {
      const body = (await request.json()) as { text: string };
      bodies.push(body);
      const created = () =>
        HttpResponse.json(
          checklistItem('i4', cardId, { text: body.text, position: 4000 }),
          { status: 201 },
        );
      return (replies.shift() ?? created)();
    }),
  );
  return bodies;
}

const saveFail = 'Não foi possível salvar. Tente novamente.';
const conflict = 'Este item foi arquivado. Recarregue para ver o estado atual.';

// Holds a reply until the test opens it, to see the state before the answer.
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

// Vitest runs without globals, so Testing Library does not unmount by itself;
// a toast left by one test would otherwise answer the next test's query.
afterEach(() => {
  cleanup();
});

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

describe('useCardChecklistViewModel — add', () => {
  it('sends the trimmed text and clears the field on 201', async () => {
    checklistServer();
    const bodies = createServer();
    const { result } = await setupReady();

    act(() => result.current.actions.setNewText('  Comprar pão  '));
    act(() => result.current.actions.add());

    await waitFor(() => expect(result.current.state.newText).toBe(''));
    expect(bodies).toEqual([{ text: 'Comprar pão' }]);
    expect(result.current.state.error).toBeNull();
  });

  it('ignores a second add while the first is in flight', async () => {
    checklistServer();
    const hold = gate();
    const bodies = createServer(async () => {
      await hold.opened;
      return HttpResponse.json(checklistItem('i4', cardId), { status: 201 });
    });
    const { result } = await setupReady();
    act(() => result.current.actions.setNewText('Comprar pão'));
    act(() => result.current.actions.add());
    await waitFor(() => expect(result.current.state.isCreating).toBe(true));

    act(() => result.current.actions.add());

    expect(result.current.state.newText).toBe('Comprar pão');
    hold.open();
    await waitFor(() => expect(result.current.state.isCreating).toBe(false));
    expect(bodies).toHaveLength(1);
  });

  it('keeps text typed while the create was in flight', async () => {
    checklistServer();
    const hold = gate();
    createServer(async () => {
      await hold.opened;
      return HttpResponse.json(checklistItem('i4', cardId), { status: 201 });
    });
    const { result } = await setupReady();
    act(() => result.current.actions.setNewText('Comprar pão'));
    act(() => result.current.actions.add());
    await waitFor(() => expect(result.current.state.isCreating).toBe(true));

    act(() => result.current.actions.setNewText('Comprar leite'));
    hold.open();

    await waitFor(() => expect(result.current.state.isCreating).toBe(false));
    expect(result.current.state.newText).toBe('Comprar leite');
  });

  it.each([
    ['   ', 'checklistItemRequired'],
    ['a'.repeat(201), 'checklistItemTooLong'],
  ])('rejects %j with %s and sends nothing', async (text, code) => {
    checklistServer();
    const bodies = createServer();
    const { result } = await setupReady();

    act(() => result.current.actions.setNewText(text));
    act(() => result.current.actions.add());

    expect(result.current.state.error).toEqual({ target: 'new', code });
    expect(result.current.state.newText).toBe(text);
    expect(result.current.state.isCreating).toBe(false);
    expect(bodies).toEqual([]);
  });

  it('clears the error when the user types', async () => {
    checklistServer();
    const { result } = await setupReady();
    act(() => result.current.actions.add());
    expect(result.current.state.error).not.toBeNull();

    act(() => result.current.actions.setNewText('C'));

    expect(result.current.state.error).toBeNull();
  });

  it('a 5xx keeps the text and Tentar novamente resends it', async () => {
    checklistServer();
    const bodies = createServer(() => problem(500));
    const { result } = await setupReady();
    act(() => result.current.actions.setNewText(' Comprar pão '));
    act(() => result.current.actions.add());

    await screen.findByText(saveFail);
    expect(result.current.state.newText).toBe(' Comprar pão ');
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(result.current.state.newText).toBe(''));
    expect(bodies).toEqual([{ text: 'Comprar pão' }, { text: 'Comprar pão' }]);
  });

  it('a 409 shows the conflict toast with Recarregar', async () => {
    checklistServer();
    createServer(() => problem(409));
    const { result } = await setupReady();
    act(() => result.current.actions.setNewText('Comprar pão'));
    act(() => result.current.actions.add());

    await screen.findByText(conflict);
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' }),
    ).toBeNull();
    expect(result.current.state.newText).toBe('Comprar pão');
  });
});

// Answers each item update with the next queued reply, or with a 200 of the sent fields.
function updateServer(...replies: (() => Response | Promise<Response>)[]) {
  const requests: { id: string; body: unknown }[] = [];
  server.use(
    http.patch(
      `${baseUrl}/api/v1/checklist-items/:id`,
      async ({ request, params }) => {
        const id = params.id as string;
        const body = (await request.json()) as Partial<ChecklistItem>;
        requests.push({ id, body });
        const saved = () =>
          HttpResponse.json({
            ...seed.find((item) => item.id === id),
            ...body,
          });
        return (replies.shift() ?? saved)();
      },
    ),
  );
  return requests;
}

function doneOf(items: ChecklistItem[], id: string) {
  return items.find((item) => item.id === id)?.done;
}

describe('useCardChecklistViewModel — toggle', () => {
  it.each([
    ['i2', true],
    ['i1', false],
  ])('sends %s with done %s and saves silently', async (id, done) => {
    checklistServer();
    const requests = updateServer();
    const { result } = await setupReady();

    act(() => result.current.actions.toggle(id));

    await waitFor(() => expect(requests).toEqual([{ id, body: { done } }]));
    await waitFor(() => expect(result.current.state.pendingIds.size).toBe(0));
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('shows the tick at once and keeps the item pending until it settles', async () => {
    checklistServer();
    const hold = gate();
    updateServer(async () => {
      await hold.opened;
      return HttpResponse.json({ ...seed[0], done: true });
    });
    const { result } = await setupReady();

    act(() => result.current.actions.toggle('i2'));

    await waitFor(() =>
      expect(result.current.state.pendingIds.has('i2')).toBe(true),
    );
    expect(doneOf(result.current.state.items, 'i2')).toBe(true);
    expect(result.current.state.pendingIds.has('i3')).toBe(false);
    hold.open();
    await waitFor(() =>
      expect(result.current.state.pendingIds.has('i2')).toBe(false),
    );
  });

  it('a 5xx undoes the tick and Tentar novamente resends it', async () => {
    checklistServer();
    const requests = updateServer(() => problem(500));
    const { result } = await setupReady();
    act(() => result.current.actions.toggle('i2'));

    await screen.findByText(saveFail);
    await waitFor(() =>
      expect(doneOf(result.current.state.items, 'i2')).toBe(false),
    );
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual({ id: 'i2', body: { done: true } });
  });

  it('a 409 undoes the tick and shows the conflict toast with Recarregar', async () => {
    checklistServer();
    updateServer(() => problem(409));
    const { result } = await setupReady();
    act(() => result.current.actions.toggle('i2'));

    await screen.findByText(conflict);
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy();
    await waitFor(() =>
      expect(doneOf(result.current.state.items, 'i2')).toBe(false),
    );
  });

  it('a 404 shows the save-fail toast and refetches the checklist', async () => {
    const requests = checklistServer();
    updateServer(() => problem(404));
    const { result } = await setupReady();
    const loaded = requests.items;
    act(() => result.current.actions.toggle('i2'));

    await screen.findByText(saveFail);
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' }),
    ).toBeNull();
    await waitFor(() => expect(requests.items).toBeGreaterThan(loaded));
  });
});
