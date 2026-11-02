import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import {
  type ChecklistMoveOptions,
  useChecklistMove,
} from '@/features/board/view-models/use-checklist-move';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import { boardId, checklistItem } from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const moveUrl = `${baseUrl}/api/v1/checklist-items/:id/move`;
const cardId = 'c1';
const checklistKey = boardViewKeys.checklist(boardId, cardId);

const a = checklistItem('a', cardId, { text: 'A', position: 0 });
const b = checklistItem('b', cardId, { text: 'B', position: 1 });
const c = checklistItem('c', cardId, { text: 'C', position: 2 });
const items = [a, b, c];

type MoveRequest = { id: string; body: unknown };

function moveWrites() {
  const moves: MoveRequest[] = [];
  server.use(
    http.post(moveUrl, async ({ params, request }) => {
      moves.push({ id: String(params.id), body: await request.json() });
      return HttpResponse.json({});
    }),
  );
  return moves;
}

function setup(overrides: Partial<ChecklistMoveOptions> = {}) {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(checklistKey, items);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  const initialProps: ChecklistMoveOptions = {
    items,
    canMove: true,
    pendingIds: new Set(),
    reload: vi.fn<() => void>(),
    ...overrides,
  };
  const view = renderHook(
    (props: ChecklistMoveOptions) => useChecklistMove(boardId, cardId, props),
    { wrapper, initialProps },
  );
  return { ...view, queryClient };
}

function savedOrder(queryClient: ReturnType<typeof setup>['queryClient']) {
  return queryClient
    .getQueryData<typeof items>(checklistKey)
    ?.map((item) => `${item.text}:${item.position}`);
}

function order(result: ReturnType<typeof setup>['result']) {
  return result.current.preview.items.map((item) => item.text);
}

afterEach(() => {
  cleanup();
});

describe('useChecklistMove keyboard session', () => {
  it('picks the item, shows the banner and announces its position', () => {
    const { result } = setup();

    act(() => result.current.start('b', 'keyboard'));

    expect(result.current.bannerText).toBe(
      'Movendo “B”: posição 2 de 3. ↑ ↓ movem, Espaço solta, Esc cancela.',
    );
    expect(result.current.announcement).toBe('Item B, posição 2 de 3');
    expect(result.current.keyboardItemId).toBe('b');
    expect(result.current.preview.liftedId).toBe('b');
  });

  it('starts with no banner, no announcement and the saved order', () => {
    const { result } = setup();

    expect(result.current.bannerText).toBeNull();
    expect(result.current.announcement).toBe('');
    expect(result.current.keyboardItemId).toBeNull();
    expect(order(result)).toEqual(['A', 'B', 'C']);
  });

  it('moves the item up and updates the order, the banner and the announcement', () => {
    const { result } = setup();

    act(() => result.current.start('b', 'keyboard'));
    act(() => result.current.step('ArrowUp'));

    expect(order(result)).toEqual(['B', 'A', 'C']);
    expect(result.current.bannerText).toBe(
      'Movendo “B”: posição 1 de 3. ↑ ↓ movem, Espaço solta, Esc cancela.',
    );
    expect(result.current.announcement).toBe('Item B, posição 1 de 3');
  });

  it('moves the item down and updates the order, the banner and the announcement', () => {
    const { result } = setup();

    act(() => result.current.start('b', 'keyboard'));
    act(() => result.current.step('ArrowDown'));

    expect(order(result)).toEqual(['A', 'C', 'B']);
    expect(result.current.bannerText).toBe(
      'Movendo “B”: posição 3 de 3. ↑ ↓ movem, Espaço solta, Esc cancela.',
    );
    expect(result.current.announcement).toBe('Item B, posição 3 de 3');
  });

  it('stops at the first and the last position without wrapping', () => {
    const { result } = setup();

    act(() => result.current.start('a', 'keyboard'));
    act(() => result.current.step('ArrowUp'));

    expect(order(result)).toEqual(['A', 'B', 'C']);
    expect(result.current.announcement).toBe('Item A, posição 1 de 3');

    act(() => result.current.step('ArrowDown'));
    act(() => result.current.step('ArrowDown'));
    act(() => result.current.step('ArrowDown'));

    expect(order(result)).toEqual(['B', 'C', 'A']);
    expect(result.current.announcement).toBe('Item A, posição 3 de 3');
  });

  it('drops the item, announces it, clears the banner and sends the new index', async () => {
    const moves = moveWrites();
    const { result } = setup();

    act(() => result.current.start('b', 'keyboard'));
    act(() => result.current.step('ArrowUp'));
    act(() => result.current.drop());

    expect(result.current.announcement).toBe('Item B solto na posição 1 de 3');
    expect(result.current.bannerText).toBeNull();
    expect(result.current.keyboardItemId).toBeNull();
    await waitFor(() => {
      expect(moves).toEqual([{ id: 'b', body: { position: 0 } }]);
    });
  });

  it('sends nothing when the item is dropped at the index it was picked', async () => {
    const moves = moveWrites();
    const { result, queryClient } = setup();

    act(() => result.current.start('b', 'keyboard'));
    act(() => result.current.step('ArrowUp'));
    act(() => result.current.step('ArrowDown'));
    act(() => result.current.drop());

    expect(result.current.announcement).toBe('Item B solto na posição 2 de 3');
    await act(() => Promise.resolve());
    expect(moves).toEqual([]);
    expect(savedOrder(queryClient)).toEqual(['A:0', 'B:1', 'C:2']);
  });

  it('cancels the move, announces it, restores the order and sends nothing', async () => {
    const moves = moveWrites();
    const { result, queryClient } = setup();

    act(() => result.current.start('b', 'keyboard'));
    act(() => result.current.step('ArrowDown'));
    act(() => result.current.cancel());

    expect(result.current.announcement).toBe('Movimento cancelado');
    expect(result.current.bannerText).toBeNull();
    expect(result.current.preview.liftedId).toBeNull();
    expect(order(result)).toEqual(['A', 'B', 'C']);
    await act(() => Promise.resolve());
    expect(moves).toEqual([]);
    expect(savedOrder(queryClient)).toEqual(['A:0', 'B:1', 'C:2']);
  });

  it('keeps a single item at position 1 of 1 and sends nothing', async () => {
    const moves = moveWrites();
    const { result, queryClient } = setup({ items: [a] });

    act(() => result.current.start('a', 'keyboard'));
    act(() => result.current.step('ArrowUp'));
    act(() => result.current.step('ArrowDown'));

    expect(result.current.announcement).toBe('Item A, posição 1 de 1');

    act(() => result.current.drop());

    await act(() => Promise.resolve());
    expect(moves).toEqual([]);
    expect(savedOrder(queryClient)).toEqual(['A:0', 'B:1', 'C:2']);
  });
});
