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
import type { ArrowKey } from '@/features/board/model/move';
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
    canDrag: true,
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

    it.each([
      ['card', first.id, 'mouse'],
      ['card', first.id, 'keyboard'],
      ['column', doing.id, 'mouse'],
      ['column', doing.id, 'keyboard'],
    ] as const)(
      'is ignored for a %s by %s while dragging is off',
      (kind, id, input) => {
        const { result } = setup({ canDrag: false });

        act(() => result.current.actions.start(kind, id, input));

        expect(result.current.state.session).toBeNull();
        expect(result.current.state.announcement).toBe('');
        expect(result.current.state.banner).toBeNull();
      },
    );

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

  describe('keyboard', () => {
    function pick(result: Result, kind: 'card' | 'column', id: string) {
      act(() => result.current.actions.start(kind, id, 'keyboard'));
    }

    function step(result: Result, ...keys: ArrowKey[]) {
      for (const key of keys) act(() => result.current.actions.step(key));
    }

    it('starts with no announcement and no banner', () => {
      const { result } = setup();

      expect(result.current.state.announcement).toBe('');
      expect(result.current.state.banner).toBeNull();
    });

    it('announces a picked card and shows its banner', () => {
      const { result } = setup();

      pick(result, 'card', second.id);

      expect(result.current.state.announcement).toBe(
        'Tarefa Card c2, coluna Backlog, posição 2 de 2',
      );
      expect(result.current.state.banner).toBe(
        'Movendo “Card c2”: Backlog, posição 2 de 2. Setas movem, Espaço solta, Esc cancela.',
      );
      expect(result.current.state.preview.liftedId).toBe(second.id);
    });

    it('moves a picked card up in its column', () => {
      const { result } = setup();

      pick(result, 'card', second.id);
      step(result, 'ArrowUp');

      expect(result.current.state.session?.target).toEqual({
        listId: backlog.id,
        index: 0,
      });
      expect(result.current.state.announcement).toBe(
        'Tarefa Card c2, coluna Backlog, posição 1 de 2',
      );
      expect(result.current.state.banner).toBe(
        'Movendo “Card c2”: Backlog, posição 1 de 2. Setas movem, Espaço solta, Esc cancela.',
      );
      expect(
        result.current.state.preview.columns[0].cards.map((card) => card.id),
      ).toEqual([second.id, first.id]);
    });

    it('counts the moved card in the column it enters', () => {
      const { result } = setup();

      pick(result, 'card', first.id);
      step(result, 'ArrowRight');

      expect(result.current.state.session?.target).toEqual({
        listId: doing.id,
        index: 0,
      });
      expect(result.current.state.announcement).toBe(
        'Tarefa Card c1, coluna Doing, posição 1 de 2',
      );
    });

    it('keeps a card in place at the first column and position', () => {
      const { result } = setup();

      pick(result, 'card', first.id);
      step(result, 'ArrowLeft', 'ArrowUp');

      expect(result.current.state.session?.target).toEqual({
        listId: backlog.id,
        index: 0,
      });
      expect(result.current.state.announcement).toBe(
        'Tarefa Card c1, coluna Backlog, posição 1 de 2',
      );
    });

    it('drops a card, announces its spot and sends the move', async () => {
      const moves = moveWrites();
      const { result } = setup();

      pick(result, 'card', first.id);
      step(result, 'ArrowRight', 'ArrowDown');
      act(() => result.current.actions.drop());

      expect(result.current.state.session).toBeNull();
      expect(result.current.state.banner).toBeNull();
      expect(result.current.state.announcement).toBe(
        'Tarefa Card c1 solta em Doing, posição 2 de 2',
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

    it('announces a drop on the origin but sends nothing', async () => {
      const moves = moveWrites();
      const { result } = setup();

      pick(result, 'card', second.id);
      step(result, 'ArrowUp', 'ArrowDown');
      act(() => result.current.actions.drop());
      await act(() => Promise.resolve());

      expect(result.current.state.announcement).toBe(
        'Tarefa Card c2 solta em Backlog, posição 2 de 2',
      );
      expect(moves).toEqual([]);
    });

    it('announces a drop without a step but sends nothing', async () => {
      const moves = moveWrites();
      const { result } = setup();

      pick(result, 'card', third.id);
      act(() => result.current.actions.drop());
      await act(() => Promise.resolve());

      expect(result.current.state.announcement).toBe(
        'Tarefa Card c3 solta em Doing, posição 1 de 1',
      );
      expect(moves).toEqual([]);
    });

    it('cancels a card move without a request', async () => {
      const moves = moveWrites();
      const { result, initialProps } = setup();

      pick(result, 'card', first.id);
      step(result, 'ArrowRight');
      act(() => result.current.actions.cancel());
      await act(() => Promise.resolve());

      expect(result.current.state.session).toBeNull();
      expect(result.current.state.banner).toBeNull();
      expect(result.current.state.announcement).toBe('Movimento cancelado');
      expect(result.current.state.preview.columns).toBe(initialProps.columns);
      expect(moves).toEqual([]);
    });

    it('announces a picked column and shows its banner', () => {
      const { result } = setup();

      pick(result, 'column', doing.id);

      expect(result.current.state.announcement).toBe(
        'Coluna Doing, posição 2 de 2',
      );
      expect(result.current.state.banner).toBe(
        'Movendo a coluna “Doing”: posição 2 de 2. ← → movem, Espaço solta, Esc cancela.',
      );
    });

    it('moves a picked column left and ignores up and down', () => {
      const { result } = setup();

      pick(result, 'column', doing.id);
      step(result, 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowDown');

      expect(result.current.state.session?.target).toEqual({ index: 0 });
      expect(result.current.state.announcement).toBe(
        'Coluna Doing, posição 1 de 2',
      );
      expect(result.current.state.banner).toBe(
        'Movendo a coluna “Doing”: posição 1 de 2. ← → movem, Espaço solta, Esc cancela.',
      );
      expect(
        result.current.state.preview.columns.map((column) => column.list.id),
      ).toEqual([doing.id, backlog.id]);
    });

    it('keeps a column in place at the last position', () => {
      const { result } = setup();

      pick(result, 'column', doing.id);
      step(result, 'ArrowRight');

      expect(result.current.state.session?.target).toEqual({ index: 1 });
    });

    it('drops a column, announces its spot and sends the move', async () => {
      const moves = moveWrites();
      const { result } = setup();

      pick(result, 'column', doing.id);
      step(result, 'ArrowLeft');
      act(() => result.current.actions.drop());

      expect(result.current.state.banner).toBeNull();
      expect(result.current.state.announcement).toBe(
        'Coluna Doing solta na posição 1 de 2',
      );
      await waitFor(() =>
        expect(moves).toEqual([
          { path: `/api/v1/lists/${doing.id}/move`, body: { position: 0 } },
        ]),
      );
    });

    it('cancels a column move without a request', async () => {
      const moves = moveWrites();
      const { result } = setup();

      pick(result, 'column', doing.id);
      step(result, 'ArrowLeft');
      act(() => result.current.actions.cancel());
      await act(() => Promise.resolve());

      expect(result.current.state.banner).toBeNull();
      expect(result.current.state.announcement).toBe('Movimento cancelado');
      expect(moves).toEqual([]);
    });

    it('ignores a second pick while one runs', () => {
      const { result } = setup();

      pick(result, 'card', first.id);
      pick(result, 'card', third.id);
      pick(result, 'column', doing.id);

      expect(result.current.state.session).toMatchObject({ id: first.id });
      expect(result.current.state.announcement).toBe(
        'Tarefa Card c1, coluna Backlog, posição 1 de 2',
      );
    });

    it('ignores steps without a keyboard session', () => {
      const { result } = setup();

      step(result, 'ArrowDown');
      act(() => result.current.actions.start('card', first.id, 'mouse'));
      step(result, 'ArrowDown');

      expect(result.current.state.session?.target).toBeNull();
    });

    it('keeps a mouse session silent and without a banner', () => {
      const { result } = setup();

      act(() => result.current.actions.start('card', first.id, 'mouse'));
      act(() => result.current.actions.hover({ listId: doing.id, index: 0 }));

      expect(result.current.state.banner).toBeNull();
      act(() => result.current.actions.cancel());
      expect(result.current.state.announcement).toBe('');
    });
  });

  describe('move to', () => {
    it('opens the dialog for a card', () => {
      const { result } = setup();

      act(() => result.current.actions.askMoveTo(second.id));

      expect(result.current.state.moveToCard).toEqual(second);
    });

    it.each([
      [
        'for a card with a change in flight',
        { pendingIds: new Set([first.id]) },
      ],
      ['when the board cannot move', { canMove: false }],
    ])('is ignored %s', (_, overrides) => {
      const { result } = setup(overrides);

      act(() => result.current.actions.askMoveTo(first.id));

      expect(result.current.state.moveToCard).toBeNull();
    });

    it('sends the card to the end of another column and names it in a toast', async () => {
      const moves = moveWrites();
      const { result, queryClient } = setup();

      act(() => result.current.actions.askMoveTo(third.id));
      act(() => result.current.actions.moveTo(backlog.id));

      expect(result.current.state.moveToCard).toBeNull();
      await waitFor(() =>
        expect(cardSpots(queryClient)[third.id]).toBe(`${backlog.id}:2`),
      );
      await waitFor(() =>
        expect(moves).toEqual([
          {
            path: `/api/v1/cards/${third.id}/move`,
            body: { listId: backlog.id, position: 2 },
          },
        ]),
      );
      await screen.findByText('Tarefa movida para Backlog');
    });

    it('still sends the card to the end of the full column while dragging is off', async () => {
      const moves = moveWrites();
      const { result } = setup({ canDrag: false });

      act(() => result.current.actions.askMoveTo(third.id));

      expect(result.current.state.moveToCard).toEqual(third);

      act(() => result.current.actions.moveTo(backlog.id));

      await waitFor(() =>
        expect(moves).toEqual([
          {
            path: `/api/v1/cards/${third.id}/move`,
            body: { listId: backlog.id, position: 2 },
          },
        ]),
      );
    });

    it('closes with no request for the current column', async () => {
      const moves = moveWrites();
      const { result } = setup();

      act(() => result.current.actions.askMoveTo(first.id));
      act(() => result.current.actions.moveTo(backlog.id));
      await act(() => Promise.resolve());

      expect(result.current.state.moveToCard).toBeNull();
      expect(moves).toEqual([]);
    });

    it('closes with no move', async () => {
      const moves = moveWrites();
      const { result } = setup();

      act(() => result.current.actions.askMoveTo(first.id));
      act(() => result.current.actions.closeMoveTo());
      await act(() => Promise.resolve());

      expect(result.current.state.moveToCard).toBeNull();
      expect(moves).toEqual([]);
    });

    it('shows the card failure toast and retries the same body', async () => {
      const moves = moveWrites(() => problem(500));
      const { result } = setup();

      act(() => result.current.actions.askMoveTo(first.id));
      act(() => result.current.actions.moveTo(doing.id));

      await screen.findByText(moveFailed);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      await waitFor(() => expect(moves).toHaveLength(2));
      expect(moves[1]).toEqual(moves[0]);
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
