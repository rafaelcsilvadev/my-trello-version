import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  progressChange,
  useCreateChecklistItem,
} from '@/features/board/api/checklist-mutations';
import { boardViewKeys } from '@/features/board/api/keys';
import type { CacheChange } from '@/features/board/api/mutations';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardId,
  cardFixture,
  checklistItem,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const card = cardFixture('c1', 'l1', { checklist: { total: 3, done: 1 } });
const other = cardFixture('c2', 'l1', { checklist: { total: 2, done: 0 } });
const archivedCard = cardFixture('c1', 'l1', {
  archivedAt: '2026-10-20T12:00:00.000Z',
  checklist: { total: 3, done: 1 },
});

function changeFor(changes: CacheChange[], key: readonly unknown[]) {
  const change = changes.find(
    (item) => JSON.stringify(item.key) === JSON.stringify(key),
  );
  if (!change) throw new Error(`no change for ${JSON.stringify(key)}`);
  return change as unknown as {
    apply: <T>(data: T) => T;
    revert: <T>(data: T) => T;
  };
}

describe('progressChange', () => {
  const cardKey = boardViewKeys.card(boardId, card.id);
  const activeKey = boardViewKeys.cards(boardId, false);
  const archivedKey = boardViewKeys.cards(boardId, true);

  it('adds the delta to the card query and to the card in both card lists', () => {
    const changes = progressChange(boardId, card.id, () => ({
      total: 1,
      done: 1,
    }));

    expect(changes.map(({ key }) => key)).toEqual([
      cardKey,
      activeKey,
      archivedKey,
    ]);
    expect(changeFor(changes, cardKey).apply(card).checklist).toEqual({
      total: 4,
      done: 2,
    });
    expect(changeFor(changes, activeKey).apply([card, other])).toEqual([
      { ...card, checklist: { total: 4, done: 2 } },
      other,
    ]);
    expect(
      changeFor(changes, archivedKey).apply([other, archivedCard]),
    ).toEqual([other, { ...archivedCard, checklist: { total: 4, done: 2 } }]);
  });

  it('subtracts the applied delta on revert', () => {
    const changes = progressChange(boardId, card.id, () => ({
      total: 0,
      done: -1,
    }));
    const detail = changeFor(changes, cardKey);
    const active = changeFor(changes, activeKey);

    const applied = detail.apply(card);
    const appliedList = active.apply([card, other]);

    expect(applied.checklist).toEqual({ total: 3, done: 0 });
    expect(detail.revert(applied).checklist).toEqual({ total: 3, done: 1 });
    expect(active.revert(appliedList)).toEqual([card, other]);
  });

  it('keeps the other change when two overlapping deltas revert out of order', () => {
    const first = changeFor(
      progressChange(boardId, card.id, () => ({ total: 0, done: 1 })),
      cardKey,
    );
    const second = changeFor(
      progressChange(boardId, card.id, () => ({ total: 1, done: 0 })),
      cardKey,
    );

    const both = second.apply(first.apply(card));
    const firstReverted = first.revert(both);

    expect(firstReverted.checklist).toEqual({ total: 4, done: 1 });
    expect(second.revert(firstReverted).checklist).toEqual({
      total: 3,
      done: 1,
    });
  });

  it('applies and reverts the delta read when the change applies', () => {
    let delta = { total: 5, done: 5 };
    const detail = changeFor(
      progressChange(boardId, card.id, () => delta),
      cardKey,
    );

    delta = { total: -1, done: -1 };
    const applied = detail.apply(card);
    delta = { total: 7, done: 7 };

    expect(applied.checklist).toEqual({ total: 2, done: 0 });
    expect(detail.revert(applied).checklist).toEqual({ total: 3, done: 1 });
  });

  it('reverts nothing in a list that did not hold the card when it applied', () => {
    const active = changeFor(
      progressChange(boardId, card.id, () => ({ total: 1, done: 1 })),
      activeKey,
    );

    expect(active.apply([other])).toEqual([other]);
    expect(active.revert([card, other])).toEqual([card, other]);
  });
});

const baseUrl = 'http://api.test';
const itemsUrl = `${baseUrl}/api/v1/cards/${card.id}/checklist-items`;
const firstItem = checklistItem('i1', card.id);
const created = checklistItem('i2', card.id, { text: 'Ship', position: 1 });

const archivedConflict = {
  type: '/problems/card-archived',
  title: 'Conflict',
  status: 409,
  detail: 'Card is archived',
  instance: `/api/v1/cards/${card.id}/checklist-items`,
  requestId: 'req-1',
};

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(boardViewKeys.checklist(boardId, card.id), [
    firstItem,
  ]);
  queryClient.setQueryData(boardViewKeys.card(boardId, card.id), card);
  queryClient.setQueryData(boardViewKeys.cards(boardId, false), [card, other]);
  queryClient.setQueryData(boardViewKeys.cards(boardId, true), [archivedCard]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

function snapshot(queryClient: ReturnType<typeof createQueryClient>) {
  return {
    items: queryClient.getQueryData(boardViewKeys.checklist(boardId, card.id)),
    card: queryClient.getQueryData(boardViewKeys.card(boardId, card.id)),
    active: queryClient.getQueryData(boardViewKeys.cards(boardId, false)),
    archived: queryClient.getQueryData(boardViewKeys.cards(boardId, true)),
  };
}

const untouched = {
  items: [firstItem],
  card,
  active: [card, other],
  archived: [archivedCard],
};

describe('useCreateChecklistItem', () => {
  it('posts the text to the checklist items of the card', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(itemsUrl, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useCreateChecklistItem(boardId, card.id),
      { wrapper },
    );

    await act(() => result.current.mutateAsync({ text: 'Ship' }));

    expect(bodies).toEqual([{ text: 'Ship' }]);
  });

  it('changes no cache while the request is in flight', async () => {
    server.use(http.post(itemsUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => useCreateChecklistItem(boardId, card.id),
      { wrapper },
    );

    act(() => result.current.mutate({ text: 'Ship' }));

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(snapshot(queryClient)).toEqual(untouched);
  });

  it('appends the created item last and invalidates the checklist', async () => {
    server.use(
      http.post(itemsUrl, () => HttpResponse.json(created, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => useCreateChecklistItem(boardId, card.id),
      { wrapper },
    );

    await act(() => result.current.mutateAsync({ text: 'Ship' }));

    const key = boardViewKeys.checklist(boardId, card.id);
    expect(queryClient.getQueryData(key)).toEqual([firstItem, created]);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it('adds one to the card total in the card query and both card lists', async () => {
    server.use(
      http.post(itemsUrl, () => HttpResponse.json(created, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => useCreateChecklistItem(boardId, card.id),
      { wrapper },
    );

    await act(() => result.current.mutateAsync({ text: 'Ship' }));

    const grown = { total: 4, done: 1 };
    expect(snapshot(queryClient)).toMatchObject({
      card: { checklist: grown },
      active: [{ id: card.id, checklist: grown }, other],
      archived: [{ id: card.id, checklist: grown }],
    });
  });

  it.each([
    ['409', 409, archivedConflict],
    ['5xx', 500, {}],
  ])(
    'changes no cache and rejects with an ApiError on %s',
    async (_name, status, body) => {
      server.use(
        http.post(itemsUrl, () => HttpResponse.json(body, { status })),
      );
      const { wrapper, queryClient } = setup();
      const { result } = renderHook(
        () => useCreateChecklistItem(boardId, card.id),
        { wrapper },
      );

      await act(() =>
        expect(result.current.mutateAsync({ text: 'Ship' })).rejects.toThrow(
          ApiError,
        ),
      );

      expect(snapshot(queryClient)).toEqual(untouched);
      expect(
        queryClient.getQueryState(boardViewKeys.checklist(boardId, card.id))
          ?.isInvalidated,
      ).toBe(false);
    },
  );
});
