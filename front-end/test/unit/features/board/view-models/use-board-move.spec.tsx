import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import { toColumns } from '@/features/board/model/columns';
import type { Card } from '@/features/board/model/types';
import {
  type BoardMoveOptions,
  useBoardMove,
} from '@/features/board/view-models/use-board-move';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import {
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const moveCardUrl = `${baseUrl}/api/v1/cards/:id/move`;
const moveListUrl = `${baseUrl}/api/v1/lists/:id/move`;
const cardsKey = boardViewKeys.cards(boardId, false);
const listsKey = boardViewKeys.lists(boardId, false);

const backlog = listFixture('l1', { title: 'Backlog', position: 0 });
const doing = listFixture('l2', { title: 'Doing', position: 1 });
const first = cardFixture('c1', backlog.id, { position: 0 });
const second = cardFixture('c2', backlog.id, { position: 1 });
const third = cardFixture('c3', doing.id, { position: 0 });
const lists = [backlog, doing];
const cards = [first, second, third];

const moveFailed = 'Não foi possível mover a tarefa';
const saveFail = 'Não foi possível salvar. Tente novamente.';
const conflict = 'Este item foi arquivado. Recarregue para ver o estado atual.';

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

type MoveRequest = { path: string; body: unknown };

// Records every move; each one is answered by the next queued response, or by a success one.
function moveWrites(...responses: (() => Response)[]) {
  const moves: MoveRequest[] = [];
  async function answer(request: Request) {
    moves.push({
      path: new URL(request.url).pathname,
      body: await request.json(),
    });
    return (responses.shift() ?? (() => HttpResponse.json({})))();
  }
  server.use(
    http.post(moveCardUrl, ({ request }) => answer(request)),
    http.post(moveListUrl, ({ request }) => answer(request)),
  );
  return moves;
}

function setup(overrides: Partial<BoardMoveOptions> = {}) {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(listsKey, lists);
  queryClient.setQueryData(cardsKey, cards);
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  const initialProps: BoardMoveOptions = {
    columns: toColumns(lists, cards),
    canMove: true,
    pendingIds: new Set(),
    renamingListId: null,
    ...overrides,
  };
  const view = renderHook(
    (props: BoardMoveOptions) => useBoardMove(boardId, props),
    { wrapper, initialProps },
  );
  return { ...view, queryClient, invalidate, initialProps };
}

type Result = ReturnType<typeof setup>['result'];

function dragCard(result: Result, id: string, listId: string, index: number) {
  act(() => result.current.actions.start('card', id, 'mouse'));
  act(() => result.current.actions.hover({ listId, index }));
  act(() => result.current.actions.drop());
}

function dragColumn(result: Result, id: string, index: number) {
  act(() => result.current.actions.start('column', id, 'mouse'));
  act(() => result.current.actions.hover({ index }));
  act(() => result.current.actions.drop());
}

function cardSpots(queryClient: ReturnType<typeof setup>['queryClient']) {
  return Object.fromEntries(
    queryClient
      .getQueryData<Card[]>(cardsKey)
      ?.map((card) => [card.id, `${card.listId}:${card.position}`]) ?? [],
  );
}

afterEach(() => {
  cleanup();
});

describe('useBoardMove', () => {
  describe('start', () => {
    it('opens a card session at the card spot', () => {
      const { result } = setup();

      act(() => result.current.actions.start('card', second.id, 'mouse'));

      expect(result.current.state.session).toEqual({
        kind: 'card',
        id: second.id,
        input: 'mouse',
        origin: { listId: backlog.id, index: 1 },
        target: null,
      });
    });

    it('opens a column session at the column index', () => {
      const { result } = setup();

      act(() => result.current.actions.start('column', doing.id, 'mouse'));

      expect(result.current.state.session).toEqual({
        kind: 'column',
        id: doing.id,
        input: 'mouse',
        origin: { index: 1 },
        target: null,
      });
    });

    it('is ignored when the board cannot move', () => {
      const { result } = setup({ canMove: false });

      act(() => result.current.actions.start('card', first.id, 'mouse'));

      expect(result.current.state.session).toBeNull();
    });

    it('is ignored for an item with a change in flight', () => {
      const { result } = setup({ pendingIds: new Set([first.id, doing.id]) });

      act(() => result.current.actions.start('card', first.id, 'mouse'));
      act(() => result.current.actions.start('column', doing.id, 'mouse'));

      expect(result.current.state.session).toBeNull();
    });

    it('is ignored while another session runs', () => {
      const { result } = setup();

      act(() => result.current.actions.start('card', first.id, 'mouse'));
      act(() => result.current.actions.start('column', doing.id, 'mouse'));

      expect(result.current.state.session).toMatchObject({ id: first.id });
    });

    it('is ignored for a column whose name field is open', () => {
      const { result } = setup({ renamingListId: doing.id });

      act(() => result.current.actions.start('column', doing.id, 'mouse'));

      expect(result.current.state.session).toBeNull();
    });

    it('still starts a card of a column whose name field is open', () => {
      const { result } = setup({ renamingListId: doing.id });

      act(() => result.current.actions.start('card', third.id, 'mouse'));

      expect(result.current.state.session).toMatchObject({ id: third.id });
    });

    it('is ignored for an unknown item', () => {
      const { result } = setup();

      act(() => result.current.actions.start('card', 'missing', 'mouse'));
      act(() => result.current.actions.start('column', 'missing', 'mouse'));

      expect(result.current.state.session).toBeNull();
    });
  });

  describe('hover', () => {
    it('sets the target and the preview', () => {
      const { result } = setup();

      act(() => result.current.actions.start('card', first.id, 'mouse'));
      act(() => result.current.actions.hover({ listId: doing.id, index: 0 }));

      expect(result.current.state.session?.target).toEqual({
        listId: doing.id,
        index: 0,
      });
      expect(result.current.state.preview).toMatchObject({
        sourceCardId: first.id,
        placeholder: { listId: doing.id, beforeCardId: third.id },
        targetListId: doing.id,
      });
    });

    it('does nothing without a session', () => {
      const { result } = setup();

      act(() => result.current.actions.hover({ index: 1 }));

      expect(result.current.state.session).toBeNull();
    });

    it('ignores a target of the other kind', () => {
      const { result } = setup();

      act(() => result.current.actions.start('column', backlog.id, 'mouse'));
      act(() => result.current.actions.hover({ listId: doing.id, index: 0 }));

      expect(result.current.state.session?.target).toBeNull();
    });
  });

  describe('drop', () => {
    it('sends listId and position for a card that changes column', async () => {
      const moves = moveWrites();
      const { result, queryClient } = setup();

      dragCard(result, first.id, doing.id, 1);

      expect(result.current.state.session).toBeNull();
      await waitFor(() =>
        expect(cardSpots(queryClient)[first.id]).toBe(`${doing.id}:1`),
      );
      await waitFor(() =>
        expect(moves).toEqual([
          {
            path: `/api/v1/cards/${first.id}/move`,
            body: { listId: doing.id, position: 1 },
          },
        ]),
      );
    });

    it('sends only the position for a card that stays in its column', async () => {
      const moves = moveWrites();
      const { result } = setup();

      dragCard(result, first.id, backlog.id, 1);

      await waitFor(() =>
        expect(moves).toEqual([
          { path: `/api/v1/cards/${first.id}/move`, body: { position: 1 } },
        ]),
      );
    });

    it('sends the position for a column', async () => {
      const moves = moveWrites();
      const { result } = setup();

      dragColumn(result, doing.id, 0);

      await waitFor(() =>
        expect(moves).toEqual([
          { path: `/api/v1/lists/${doing.id}/move`, body: { position: 0 } },
        ]),
      );
    });

    it('shows no toast after a move saves', async () => {
      const moves = moveWrites();
      const { result } = setup();

      dragCard(result, first.id, doing.id, 0);
      await waitFor(() => expect(moves).toHaveLength(1));
      await act(() => Promise.resolve());

      expect(screen.getByRole('status').textContent).toBe('');
    });

    it.each([
      [
        'without a target',
        (result: Result) => {
          act(() => result.current.actions.start('card', first.id, 'mouse'));
          act(() => result.current.actions.drop());
        },
      ],
      [
        'on the card origin',
        (result: Result) => dragCard(result, second.id, backlog.id, 1),
      ],
      [
        'on the column origin',
        (result: Result) => dragColumn(result, backlog.id, 0),
      ],
      [
        'after a cancel',
        (result: Result) => {
          act(() => result.current.actions.start('card', first.id, 'mouse'));
          act(() =>
            result.current.actions.hover({ listId: doing.id, index: 0 }),
          );
          act(() => result.current.actions.cancel());
          act(() => result.current.actions.drop());
        },
      ],
    ])('sends nothing %s', async (_name, run) => {
      const moves = moveWrites();
      const { result, queryClient } = setup();

      run(result);
      await act(() => Promise.resolve());

      expect(result.current.state.session).toBeNull();
      expect(moves).toEqual([]);
      expect(cardSpots(queryClient)).toEqual({
        [first.id]: `${backlog.id}:0`,
        [second.id]: `${backlog.id}:1`,
        [third.id]: `${doing.id}:0`,
      });
    });

    it('does nothing without a session', async () => {
      const moves = moveWrites();
      const { result } = setup();

      act(() => result.current.actions.drop());
      await act(() => Promise.resolve());

      expect(moves).toEqual([]);
    });
  });

  describe('cancel', () => {
    it('closes the session and clears the preview', () => {
      const { result, initialProps } = setup();

      act(() => result.current.actions.start('card', first.id, 'mouse'));
      act(() => result.current.actions.hover({ listId: doing.id, index: 0 }));
      act(() => result.current.actions.cancel());

      expect(result.current.state.session).toBeNull();
      expect(result.current.state.preview).toEqual({
        columns: initialProps.columns,
        sourceCardId: null,
        placeholder: null,
        targetListId: null,
        liftedId: null,
      });
    });
  });

  describe('failures', () => {
    it('puts the card back and offers to send the same move again', async () => {
      const moves = moveWrites(() => problem(500));
      const { result, queryClient } = setup();

      dragCard(result, first.id, doing.id, 1);

      await screen.findByText(moveFailed);
      expect(cardSpots(queryClient)[first.id]).toBe(`${backlog.id}:0`);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      await waitFor(() => expect(moves).toHaveLength(2));
      expect(moves[1]).toEqual(moves[0]);
    });

    it('uses the default retry toast for a column', async () => {
      const moves = moveWrites(() => problem(500));
      const { result } = setup();

      dragColumn(result, doing.id, 0);

      await screen.findByText(saveFail);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      await waitFor(() => expect(moves).toHaveLength(2));
      expect(moves[1]).toEqual(moves[0]);
    });

    it('shows the conflict toast with Recarregar on a 409', async () => {
      moveWrites(() => problem(409));
      const { result } = setup();

      dragCard(result, first.id, doing.id, 0);

      await screen.findByText(conflict);
      expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy();
    });

    it('refetches the board on a 404', async () => {
      moveWrites(() => problem(404));
      const { result, invalidate } = setup();

      dragCard(result, first.id, doing.id, 0);

      await screen.findByText(saveFail);
      // Once when the last change settles, once more from the not-found branch.
      expect(invalidate).toHaveBeenCalledTimes(2);
      expect(invalidate).toHaveBeenLastCalledWith({
        queryKey: boardViewKeys.all(boardId),
      });
    });
  });
});
