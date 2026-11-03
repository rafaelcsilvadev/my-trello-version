import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import {
  useCreateLabel,
  useToggleCardLabel,
} from '@/features/board/api/label-mutations';
import { usePendingItemIds } from '@/features/board/api/mutations';
import type { Card } from '@/features/board/model/types';
import { ApiProvider } from '@/shared/api/api-context';
import { ApiError } from '@/shared/api/api-error';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';

import {
  boardId,
  cardFixture,
  labelFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const labelUrl = `${baseUrl}/api/v1/cards/:id/labels/:labelId`;
const alpha = labelFixture('la', { name: 'Alpha' });
const bravo = labelFixture('lb', { name: 'Bravo' });
const charlie = labelFixture('lc', { name: 'Charlie' });
const card = cardFixture('c1', 'l1', { labelIds: [alpha.id, charlie.id] });
const other = cardFixture('c2', 'l1', { labelIds: [alpha.id] });
const cardKey = boardViewKeys.card(boardId, card.id);
const cardsKey = boardViewKeys.cards(boardId, false);

const serverError = {
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'boom',
};

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(boardViewKeys.labels(boardId), [
    alpha,
    bravo,
    charlie,
  ]);
  queryClient.setQueryData(cardKey, card);
  queryClient.setQueryData(cardsKey, [card, other]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
}

type TestQueryClient = ReturnType<typeof setup>['queryClient'];

function labelIdsOf(queryClient: TestQueryClient) {
  return {
    detail: queryClient.getQueryData<Card>(cardKey)?.labelIds,
    board: queryClient
      .getQueryData<Card[]>(cardsKey)
      ?.find((item) => item.id === card.id)?.labelIds,
  };
}

function bothShow(labelIds: string[]) {
  return { detail: labelIds, board: labelIds };
}

describe('useToggleCardLabel', () => {
  it('sends PUT to apply and DELETE to remove the label', async () => {
    const requests: { method: string; id: unknown; labelId: unknown }[] = [];
    server.use(
      http.put(labelUrl, ({ params }) => {
        requests.push({
          method: 'PUT',
          id: params.id,
          labelId: params.labelId,
        });
        return new HttpResponse(null, { status: 204 });
      }),
      http.delete(labelUrl, ({ params }) => {
        requests.push({
          method: 'DELETE',
          id: params.id,
          labelId: params.labelId,
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useToggleCardLabel(boardId), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({
        id: bravo.id,
        cardId: card.id,
        applied: true,
      }),
    );
    await act(() =>
      result.current.mutateAsync({
        id: alpha.id,
        cardId: card.id,
        applied: false,
      }),
    );

    expect(requests).toEqual([
      { method: 'PUT', id: card.id, labelId: bravo.id },
      { method: 'DELETE', id: card.id, labelId: alpha.id },
    ]);
  });

  it('shows an applied label at once, in board label order, on the detail and the board', async () => {
    server.use(http.put(labelUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useToggleCardLabel(boardId), {
      wrapper,
    });

    act(() =>
      result.current.mutate({ id: bravo.id, cardId: card.id, applied: true }),
    );

    await waitFor(() =>
      expect(labelIdsOf(queryClient)).toEqual(
        bothShow([alpha.id, bravo.id, charlie.id]),
      ),
    );
    expect(
      queryClient
        .getQueryData<Card[]>(cardsKey)
        ?.find((c) => c.id === other.id),
    ).toEqual(other);
  });

  it('hides a removed label at once on the detail and the board', async () => {
    server.use(http.delete(labelUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useToggleCardLabel(boardId), {
      wrapper,
    });

    act(() =>
      result.current.mutate({ id: alpha.id, cardId: card.id, applied: false }),
    );

    await waitFor(() =>
      expect(labelIdsOf(queryClient)).toEqual(bothShow([charlie.id])),
    );
    expect(
      queryClient
        .getQueryData<Card[]>(cardsKey)
        ?.find((c) => c.id === other.id),
    ).toEqual(other);
  });

  it('reverts only the failed label while an overlapping toggle survives', async () => {
    let failApply: (() => void) | undefined;
    server.use(
      http.put(labelUrl, async () => {
        await new Promise<void>((resolve) => (failApply = resolve));
        return HttpResponse.json(serverError, { status: 500 });
      }),
      http.delete(labelUrl, () => new HttpResponse(null, { status: 204 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({
        apply: useToggleCardLabel(boardId),
        remove: useToggleCardLabel(boardId),
      }),
      { wrapper },
    );

    act(() =>
      result.current.apply.mutate({
        id: bravo.id,
        cardId: card.id,
        applied: true,
      }),
    );
    await act(() =>
      result.current.remove.mutateAsync({
        id: alpha.id,
        cardId: card.id,
        applied: false,
      }),
    );
    await waitFor(() => expect(failApply).toBeDefined());
    expect(labelIdsOf(queryClient)).toEqual(bothShow([bravo.id, charlie.id]));

    act(() => failApply?.());

    await waitFor(() =>
      expect(result.current.apply.error).toBeInstanceOf(ApiError),
    );
    expect(labelIdsOf(queryClient)).toEqual(bothShow([charlie.id]));
  });

  it('puts a label back in board label order when removing it fails', async () => {
    server.use(
      http.delete(labelUrl, () =>
        HttpResponse.json(serverError, { status: 500 }),
      ),
    );
    const { wrapper, queryClient } = setup();
    queryClient.setQueryData(cardKey, {
      ...card,
      labelIds: [alpha.id, bravo.id, charlie.id],
    });
    queryClient.setQueryData(cardsKey, [
      { ...card, labelIds: [alpha.id, bravo.id, charlie.id] },
      other,
    ]);
    const { result } = renderHook(() => useToggleCardLabel(boardId), {
      wrapper,
    });

    act(() =>
      result.current.mutate({ id: bravo.id, cardId: card.id, applied: false }),
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError));
    expect(labelIdsOf(queryClient)).toEqual(
      bothShow([alpha.id, bravo.id, charlie.id]),
    );
  });

  it('keeps a label that was already applied when applying it again fails', async () => {
    server.use(
      http.put(labelUrl, () => HttpResponse.json(serverError, { status: 500 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useToggleCardLabel(boardId), {
      wrapper,
    });

    act(() =>
      result.current.mutate({ id: alpha.id, cardId: card.id, applied: true }),
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError));
    expect(labelIdsOf(queryClient)).toEqual(bothShow([alpha.id, charlie.id]));
  });

  it('marks the label id, not the card, as pending while the change is in flight', async () => {
    server.use(http.put(labelUrl, () => delay('infinite')));
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        toggle: useToggleCardLabel(boardId),
        pending: usePendingItemIds(),
      }),
      { wrapper },
    );

    act(() =>
      result.current.toggle.mutate({
        id: bravo.id,
        cardId: card.id,
        applied: true,
      }),
    );

    await waitFor(() =>
      expect(result.current.pending).toEqual(new Set([bravo.id])),
    );
  });

  it('refetches the board once, after the last pending change settles', async () => {
    let releaseApply: (() => void) | undefined;
    server.use(
      http.put(labelUrl, async () => {
        await new Promise<void>((resolve) => (releaseApply = resolve));
        return new HttpResponse(null, { status: 204 });
      }),
      http.delete(labelUrl, () => new HttpResponse(null, { status: 204 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(
      () => ({
        apply: useToggleCardLabel(boardId),
        remove: useToggleCardLabel(boardId),
      }),
      { wrapper },
    );

    act(() =>
      result.current.apply.mutate({
        id: bravo.id,
        cardId: card.id,
        applied: true,
      }),
    );
    await act(() =>
      result.current.remove.mutateAsync({
        id: alpha.id,
        cardId: card.id,
        applied: false,
      }),
    );
    await waitFor(() => expect(releaseApply).toBeDefined());
    expect(queryClient.getQueryState(cardKey)?.isInvalidated).toBe(false);

    act(() => releaseApply?.());

    await waitFor(() =>
      expect(queryClient.getQueryState(cardKey)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(cardsKey)?.isInvalidated).toBe(true);
  });
});

describe('useCreateLabel', () => {
  const labelsUrl = `${baseUrl}/api/v1/boards/${boardId}/labels`;
  const labelsKey = boardViewKeys.labels(boardId);
  const errands = labelFixture('ld', { name: 'Errands', color: 'orange' });

  function problem(status: number, type: string) {
    return HttpResponse.json(
      { type, title: 'Problem', status, detail: '' },
      { status, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }

  it('posts the name and color to the labels of the board', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(labelsUrl, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(errands, { status: 201 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateLabel(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({ name: 'Errands', color: 'orange' }),
    );

    expect(bodies).toEqual([{ name: 'Errands', color: 'orange' }]);
  });

  it('leaves the cached labels untouched until the response arrives', async () => {
    server.use(http.post(labelsUrl, () => delay('infinite')));
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateLabel(boardId), { wrapper });

    act(() => result.current.mutate({ name: 'Errands', color: 'orange' }));

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(queryClient.getQueryData(labelsKey)).toEqual([
      alpha,
      bravo,
      charlie,
    ]);
  });

  it('appends the created label last and invalidates the labels', async () => {
    server.use(
      http.post(labelsUrl, () => HttpResponse.json(errands, { status: 201 })),
    );
    const { wrapper, queryClient } = setup();
    const { result } = renderHook(() => useCreateLabel(boardId), { wrapper });

    await act(() =>
      result.current.mutateAsync({ name: 'Errands', color: 'orange' }),
    );

    expect(queryClient.getQueryData(labelsKey)).toEqual([
      alpha,
      bravo,
      charlie,
      errands,
    ]);
    expect(queryClient.getQueryState(labelsKey)?.isInvalidated).toBe(true);
  });

  it.each([
    [409, '/problems/label-name-taken'],
    [500, '/problems/internal-error'],
  ])(
    'changes no cache and rejects with the ApiError on %i',
    async (status, type) => {
      server.use(http.post(labelsUrl, () => problem(status, type)));
      const { wrapper, queryClient } = setup();
      const { result } = renderHook(() => useCreateLabel(boardId), {
        wrapper,
      });

      const error = await act(() =>
        result.current
          .mutateAsync({ name: 'Alpha', color: 'blue' })
          .catch((err: unknown) => err),
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, type });
      expect(queryClient.getQueryData(labelsKey)).toEqual([
        alpha,
        bravo,
        charlie,
      ]);
      expect(queryClient.getQueryState(labelsKey)?.isInvalidated).toBe(false);
      expect(queryClient.getQueryData(cardKey)).toEqual(card);
      expect(queryClient.getQueryData(cardsKey)).toEqual([card, other]);
    },
  );
});
