import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import { useUpdateLabel } from '@/features/board/api/label-mutations';
import { useLabelsViewModel } from '@/features/board/view-models/use-labels-view-model';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import {
  boardFixture,
  boardId,
  cardFixture,
  labelFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

afterEach(cleanup);

const baseUrl = 'http://api.test';
const boardUrl = `${baseUrl}/api/v1/boards/${boardId}`;
const listsUrl = `${boardUrl}/lists`;
const cardsUrl = `${boardUrl}/cards`;
const labelsUrl = `${boardUrl}/labels`;
const listCardsUrl = `${baseUrl}/api/v1/lists/:listId/cards`;
const archivedAt = '2026-10-02T12:00:00.000Z';

const bug = labelFixture('lb1', { name: 'Bug' });
const urgent = labelFixture('lb2', { name: 'Urgent' });
const docs = labelFixture('lb3', { name: 'Docs' });

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

// Counts the GETs of one URL, split by the `archived` flag.
function serve(url: string, body: JsonBodyType, archivedBody?: JsonBodyType) {
  const calls = { active: 0, archived: 0 };
  server.use(
    http.get(url, ({ request }) => {
      const archived =
        new URL(request.url).searchParams.get('archived') === 'true';
      calls[archived ? 'archived' : 'active'] += 1;
      return HttpResponse.json(archived ? (archivedBody ?? body) : body);
    }),
  );
  return calls;
}

function givenBoard({
  board = boardFixture(),
  labels = [bug, urgent, docs],
  active = [],
  archived = [],
  archivedLists = [],
}: {
  board?: JsonBodyType;
  labels?: JsonBodyType;
  active?: JsonBodyType;
  archived?: JsonBodyType;
  archivedLists?: JsonBodyType;
} = {}) {
  return {
    board: serve(boardUrl, board),
    labels: serve(labelsUrl, labels),
    cards: serve(cardsUrl, active, archived),
    lists: serve(listsUrl, [], archivedLists),
  };
}

function setup(id = boardId) {
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
  return {
    queryClient,
    ...renderHook(
      () => ({ vm: useLabelsViewModel(id), update: useUpdateLabel(id) }),
      { wrapper },
    ),
  };
}

async function ready(result: {
  current: { vm: { state: { status: string } } };
}) {
  await waitFor(() => expect(result.current.vm.state.status).toBe('ready'));
}

describe('useLabelsViewModel read state', () => {
  it('is loading until the board, labels and every usage source answered', async () => {
    givenBoard();
    server.use(
      http.get(labelsUrl, async () => {
        await delay(60);
        return HttpResponse.json([bug]);
      }),
    );
    const { result } = setup();

    expect(result.current.vm.state.status).toBe('loading');
    await ready(result);
    expect(result.current.vm.state.rows).toHaveLength(1);
  });

  it('stays loading while a usage source is still pending', async () => {
    givenBoard();
    server.use(
      http.get(cardsUrl, async ({ request }) => {
        if (new URL(request.url).searchParams.get('archived') === 'true') {
          await delay(80);
        }
        return HttpResponse.json([]);
      }),
    );
    const { result } = setup();

    await waitFor(() => expect(result.current.vm.state.board).toBeDefined());
    await waitFor(() => expect(result.current.vm.state.board).toBeDefined());
    expect(result.current.vm.state.status).toBe('loading');
    expect(result.current.vm.state.rows).toEqual([]);
    await ready(result);
  });

  it('lists one row per label in board order with the usage kind', async () => {
    const oldBacklog = listFixture('l9', { archivedAt });
    givenBoard({
      active: [
        cardFixture('c1', 'l1', { labelIds: ['lb1', 'lb2'] }),
        cardFixture('c2', 'l1', { labelIds: ['lb2'] }),
      ],
      archived: [cardFixture('c3', 'l1', { labelIds: ['lb2'] })],
      archivedLists: [oldBacklog],
    });
    server.use(
      http.get(listCardsUrl, () =>
        HttpResponse.json([cardFixture('c4', 'l1', { labelIds: ['lb1'] })]),
      ),
    );
    const { result } = setup();
    await ready(result);

    const { rows } = result.current.vm.state;
    expect(rows.map((row) => row.label.id)).toEqual(['lb1', 'lb2', 'lb3']);
    expect(rows.map((row) => row.usage)).toEqual([
      { key: 'many', count: 2 },
      { key: 'many', count: 3 },
      { key: 'unused', count: 0 },
    ]);
  });

  it('maps a single card to the one kind', async () => {
    givenBoard({
      labels: [bug],
      active: [cardFixture('c1', 'l1', { labelIds: ['lb1'] })],
    });
    const { result } = setup();
    await ready(result);

    expect(result.current.vm.state.rows[0].usage).toEqual({
      key: 'one',
      count: 1,
    });
  });

  it('shows a created but unused label as a row', async () => {
    givenBoard({ labels: [bug] });
    const { result } = setup();
    await ready(result);

    expect(result.current.vm.state.rows).toHaveLength(1);
    expect(result.current.vm.state.rows[0].usage.key).toBe('unused');
  });

  it('is ready with no rows for a board without labels', async () => {
    givenBoard({ labels: [] });
    const { result } = setup();
    await ready(result);

    expect(result.current.vm.state.rows).toEqual([]);
  });

  it.each([
    ['the board', boardUrl],
    ['the labels', labelsUrl],
  ])('is error when %s fails and no data exists', async (_name, url) => {
    givenBoard();
    server.use(http.get(url, () => problem(500)));
    const { result } = setup();

    await waitFor(() => expect(result.current.vm.state.status).toBe('error'));
  });

  it('is error when a usage source fails', async () => {
    givenBoard();
    server.use(http.get(cardsUrl, () => problem(500)));
    const { result } = setup();

    await waitFor(() => expect(result.current.vm.state.status).toBe('error'));
  });

  it('stays ready when a refetch fails but data is cached', async () => {
    givenBoard();
    const { result, queryClient } = setup();
    await ready(result);
    server.use(http.get(labelsUrl, () => problem(500)));

    await act(() =>
      queryClient.refetchQueries({ queryKey: boardViewKeys.all(boardId) }),
    );

    expect(result.current.vm.state.status).toBe('ready');
    expect(result.current.vm.state.rows).toHaveLength(3);
  });

  it.each([
    ['the board', boardUrl],
    ['the labels', labelsUrl],
  ])('is notFound when %s answers 404', async (_name, url) => {
    givenBoard();
    server.use(http.get(url, () => problem(404)));
    const { result } = setup();

    await waitFor(() =>
      expect(result.current.vm.state.status).toBe('notFound'),
    );
  });

  it('is notFound for a malformed board id', async () => {
    server.use(http.get(`${baseUrl}/api/v1/boards/*`, () => problem(404)));
    const { result } = setup('not-a-uuid');

    await waitFor(() =>
      expect(result.current.vm.state.status).toBe('notFound'),
    );
  });

  it('retry refetches exactly the failed queries', async () => {
    const calls = givenBoard();
    let failLabels = true;
    server.use(
      http.get(labelsUrl, () => {
        if (failLabels) return problem(500);
        return HttpResponse.json([bug]);
      }),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.vm.state.status).toBe('error'));
    const before = { ...calls, board: calls.board.active };
    failLabels = false;

    act(() => result.current.vm.actions.retry());

    await ready(result);
    expect(calls.board.active).toBe(before.board);
    expect(calls.cards.active).toBe(before.cards.active);
    expect(calls.cards.archived).toBe(before.cards.archived);
    expect(calls.lists.archived).toBe(before.lists.archived);
  });

  describe('readOnly', () => {
    it('is false for an active board', async () => {
      givenBoard();
      const { result } = setup();
      await ready(result);

      expect(result.current.vm.state.readOnly).toBe(false);
    });

    it('is true only when the board has archivedAt', async () => {
      givenBoard({ board: boardFixture({ archivedAt }) });
      const { result } = setup();
      await ready(result);

      expect(result.current.vm.state.readOnly).toBe(true);
    });
  });

  it('flags the row of a label with a change in flight', async () => {
    givenBoard();
    server.use(
      http.patch(`${baseUrl}/api/v1/labels/:id`, async () => {
        await delay(80);
        return HttpResponse.json({ ...urgent, name: 'Renamed' });
      }),
    );
    const { result } = setup();
    await ready(result);
    expect(result.current.vm.state.rows.map((r) => r.pending)).toEqual([
      false,
      false,
      false,
    ]);

    act(() => {
      void result.current.update.mutateAsync({
        id: 'lb2',
        body: { name: 'Renamed' },
      });
    });

    await waitFor(() =>
      expect(result.current.vm.state.rows.map((r) => r.pending)).toEqual([
        false,
        true,
        false,
      ]),
    );
    await waitFor(() =>
      expect(result.current.vm.state.rows.every((r) => !r.pending)).toBe(true),
    );
  });
});

describe('useLabelsViewModel create flow', () => {
  const created = labelFixture('lb9', { name: 'Chore', color: 'blue' });

  function problemOfType(status: number, type: string) {
    return HttpResponse.json(
      { type, title: 'Error', status, detail: '' },
      { status, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }

  // Records each create body; answers with the next queued reply, or 201.
  function createServer(...replies: (() => Response | Promise<Response>)[]) {
    const bodies: unknown[] = [];
    let saved = false;
    server.use(
      http.post(labelsUrl, async ({ request }) => {
        bodies.push(await request.json());
        const reply = replies.shift();
        if (reply) return reply();
        saved = true;
        return HttpResponse.json(created, { status: 201 });
      }),
      // The settle refetch must see the label the API now holds.
      http.get(labelsUrl, () =>
        HttpResponse.json(
          saved ? [bug, urgent, docs, created] : [bug, urgent, docs],
        ),
      ),
    );
    return bodies;
  }

  async function open() {
    givenBoard();
    const hook = setup();
    await ready(hook.result);
    act(() => hook.result.current.vm.actions.openCreate());
    return hook;
  }

  function type(
    result: Awaited<ReturnType<typeof open>>['result'],
    name: string,
  ) {
    act(() => result.current.vm.actions.setName(name));
  }

  it('openCreate opens a form with an empty name and blue', async () => {
    const { result } = await open();

    expect(result.current.vm.state.form).toEqual({
      mode: 'create',
      name: '',
      color: 'blue',
      error: null,
      isSubmitting: false,
    });
  });

  it.each([
    ['empty', '   ', 'labelNameRequired'],
    ['51 chars', 'a'.repeat(51), 'labelNameTooLong'],
    ['clashing in another case', 'bUg', 'labelNameTaken'],
  ])('%s name sets the error and sends nothing', async (_case, name, error) => {
    const { result } = await open();
    const bodies = createServer();
    type(result, name);

    act(() => result.current.vm.actions.submit());

    expect(result.current.vm.state.form?.error).toBe(error);
    expect(result.current.vm.state.form?.name).toBe(name);
    expect(bodies).toEqual([]);
  });

  it('typing clears the error', async () => {
    const { result } = await open();
    type(result, '');
    act(() => result.current.vm.actions.submit());
    expect(result.current.vm.state.form?.error).toBe('labelNameRequired');

    type(result, 'C');

    expect(result.current.vm.state.form?.error).toBeNull();
  });

  it.each([
    ['50 chars', 'a'.repeat(50), 'a'.repeat(50)],
    ['50 chars with outer spaces', `  ${'a'.repeat(50)}  `, 'a'.repeat(50)],
  ])('%s is sent trimmed with the picked color', async (_case, name, sent) => {
    const { result } = await open();
    const bodies = createServer();
    type(result, name);
    act(() => result.current.vm.actions.setColor('green'));

    act(() => result.current.vm.actions.submit());

    await waitFor(() =>
      expect(bodies).toEqual([{ name: sent, color: 'green' }]),
    );
  });

  it('a second submit in flight sends nothing and isSubmitting is true meanwhile', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const { result } = await open();
    const bodies = createServer(async () => {
      await held;
      return HttpResponse.json(created, { status: 201 });
    });
    type(result, 'Chore');

    act(() => result.current.vm.actions.submit());
    act(() => result.current.vm.actions.submit());

    await waitFor(() =>
      expect(result.current.vm.state.form?.isSubmitting).toBe(true),
    );
    release();
    await waitFor(() => expect(result.current.vm.state.form).toBeNull());
    expect(bodies).toHaveLength(1);
  });

  it('201 closes the form, adds the label last as unused and toasts', async () => {
    const { result } = await open();
    createServer();
    type(result, 'Chore');

    act(() => result.current.vm.actions.submit());

    await screen.findByText('Etiqueta criada');
    expect(result.current.vm.state.form).toBeNull();
    await waitFor(() =>
      expect(result.current.vm.state.rows.map((row) => row.label.id)).toEqual([
        'lb1',
        'lb2',
        'lb3',
        'lb9',
      ]),
    );
    expect(result.current.vm.state.rows[3].usage).toEqual({
      key: 'unused',
      count: 0,
    });
  });

  it('closeForm drops the text and sends nothing', async () => {
    const { result } = await open();
    const bodies = createServer();
    type(result, 'Chore');

    act(() => result.current.vm.actions.closeForm());

    expect(result.current.vm.state.form).toBeNull();
    act(() => result.current.vm.actions.openCreate());
    expect(result.current.vm.state.form?.name).toBe('');
    expect(bodies).toEqual([]);
  });

  it('a 5xx keeps the form and Tentar novamente repeats the same create', async () => {
    const { result } = await open();
    const bodies = createServer(() => problem(500));
    type(result, 'Chore');
    act(() => result.current.vm.actions.setColor('green'));

    act(() => result.current.vm.actions.submit());

    await screen.findByText('Não foi possível salvar. Tente novamente.');
    expect(result.current.vm.state.form).toMatchObject({
      name: 'Chore',
      color: 'green',
      isSubmitting: false,
    });
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ name: 'Chore', color: 'green' });
  });

  it('a 409 label-name-taken keeps the form, sets the error and refetches the labels', async () => {
    const { result, queryClient } = await open();
    createServer(() => problemOfType(409, '/problems/label-name-taken'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    type(result, 'Chore');

    act(() => result.current.vm.actions.submit());

    await waitFor(() =>
      expect(result.current.vm.state.form).toMatchObject({
        name: 'Chore',
        error: 'labelNameTaken',
        isSubmitting: false,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.labels(boardId),
    });
    expect(
      screen.queryByText('Não foi possível salvar. Tente novamente.'),
    ).toBeNull();
  });

  it('a 409 board-archived keeps the form, shows the conflict toast and Recarregar refetches the board view', async () => {
    const { result, queryClient } = await open();
    createServer(() => problemOfType(409, '/problems/board-archived'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    type(result, 'Chore');

    act(() => result.current.vm.actions.submit());

    await screen.findByText(
      'Este item foi arquivado. Recarregue para ver o estado atual.',
    );
    expect(result.current.vm.state.form?.name).toBe('Chore');
    invalidate.mockClear();
    act(() => screen.getByRole('button', { name: 'Recarregar' }).click());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });
});

describe('useLabelsViewModel edit flow', () => {
  function problemOfType(status: number, type: string) {
    return HttpResponse.json(
      { type, title: 'Error', status, detail: '' },
      { status, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }

  // Records each PATCH body; answers with the next queued reply, or the patched label.
  function patchServer(...replies: (() => Response | Promise<Response>)[]) {
    const bodies: unknown[] = [];
    server.use(
      http.patch(
        `${baseUrl}/api/v1/labels/:id`,
        async ({ request, params }) => {
          const body = (await request.json()) as Partial<typeof bug>;
          bodies.push(body);
          const reply = replies.shift();
          if (reply) return reply();
          return HttpResponse.json({ ...bug, id: params.id, ...body });
        },
      ),
    );
    return bodies;
  }

  async function open(id = 'lb1') {
    givenBoard();
    const hook = setup();
    await ready(hook.result);
    act(() => hook.result.current.vm.actions.openEdit(id));
    return hook;
  }

  type Hook = Awaited<ReturnType<typeof open>>['result'];

  function type(result: Hook, name: string) {
    act(() => result.current.vm.actions.setName(name));
  }

  function row(result: Hook, id: string) {
    return result.current.vm.state.rows.find((r) => r.label.id === id);
  }

  it('openEdit fills the name and color of the label', async () => {
    const { result } = await open('lb2');

    expect(result.current.vm.state.form).toEqual({
      mode: 'edit',
      id: 'lb2',
      name: 'Urgent',
      color: 'green',
      error: null,
      isSubmitting: false,
    });
  });

  it('renaming to the own name in another case is valid and sent', async () => {
    const { result } = await open();
    const bodies = patchServer();
    type(result, 'bUg');

    act(() => result.current.vm.actions.submit());

    await waitFor(() => expect(bodies).toEqual([{ name: 'bUg' }]));
    expect(result.current.vm.state.form).toBeNull();
  });

  it('renaming to another label name in any case sets labelNameTaken and sends nothing', async () => {
    const { result } = await open();
    const bodies = patchServer();
    type(result, 'uRgEnT');

    act(() => result.current.vm.actions.submit());

    expect(result.current.vm.state.form?.error).toBe('labelNameTaken');
    expect(result.current.vm.state.form?.name).toBe('uRgEnT');
    expect(bodies).toEqual([]);
  });

  it.each([
    ['empty', '   ', 'labelNameRequired'],
    ['51 chars', 'a'.repeat(51), 'labelNameTooLong'],
  ])('%s name sets the error and sends nothing', async (_case, name, error) => {
    const { result } = await open();
    const bodies = patchServer();
    type(result, name);

    act(() => result.current.vm.actions.submit());

    expect(result.current.vm.state.form?.error).toBe(error);
    expect(bodies).toEqual([]);
  });

  it('unchanged name and color closes the form with no request and no toast', async () => {
    const { result } = await open();
    const bodies = patchServer();
    type(result, '  Bug  ');

    act(() => result.current.vm.actions.submit());

    expect(result.current.vm.state.form).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(bodies).toEqual([]);
    expect(screen.queryByText('Etiqueta salva')).toBeNull();
  });

  it.each([
    ['name', 'Defect', undefined, { name: 'Defect' }],
    ['color', undefined, 'orange', { color: 'orange' }],
    [
      'name and color',
      '  Defect  ',
      'orange',
      { name: 'Defect', color: 'orange' },
    ],
  ] as const)(
    'a changed %s closes the form at once, shows the row changed, toasts and sends only the changes',
    async (_case, name, color, expected) => {
      const { result } = await open();
      const bodies = patchServer(async () => {
        await delay(80);
        return HttpResponse.json({ ...bug, ...expected });
      });
      if (name !== undefined) type(result, name);
      if (color !== undefined)
        act(() => result.current.vm.actions.setColor(color));

      act(() => result.current.vm.actions.submit());

      expect(result.current.vm.state.form).toBeNull();
      await waitFor(() =>
        expect(row(result, 'lb1')?.label).toMatchObject(expected),
      );
      await screen.findByText('Etiqueta salva');
      expect(bodies).toEqual([expected]);
    },
  );

  it('flags only the edited row as pending while the change is in flight', async () => {
    const { result } = await open();
    patchServer(async () => {
      await delay(80);
      return HttpResponse.json({ ...bug, name: 'Defect' });
    });
    type(result, 'Defect');

    act(() => result.current.vm.actions.submit());

    await waitFor(() =>
      expect(result.current.vm.state.rows.map((r) => r.pending)).toEqual([
        true,
        false,
        false,
      ]),
    );
    await waitFor(() =>
      expect(result.current.vm.state.rows.every((r) => !r.pending)).toBe(true),
    );
  });

  it('a 5xx reverts the row and Tentar novamente repeats the same PATCH', async () => {
    const { result } = await open();
    const bodies = patchServer(() => problem(500));
    type(result, 'Defect');

    act(() => result.current.vm.actions.submit());

    await screen.findByText('Não foi possível salvar. Tente novamente.');
    expect(row(result, 'lb1')?.label.name).toBe('Bug');
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ name: 'Defect' });
    await screen.findByText('Etiqueta salva');
  });

  it('a 409 label-name-taken reverts the row, reopens the form with the text and refetches the labels', async () => {
    const { result, queryClient } = await open();
    patchServer(() => problemOfType(409, '/problems/label-name-taken'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    type(result, 'Defect');
    act(() => result.current.vm.actions.setColor('orange'));

    act(() => result.current.vm.actions.submit());

    await waitFor(() =>
      expect(result.current.vm.state.form).toMatchObject({
        mode: 'edit',
        id: 'lb1',
        name: 'Defect',
        color: 'orange',
        error: 'labelNameTaken',
        isSubmitting: false,
      }),
    );
    expect(row(result, 'lb1')?.label).toMatchObject({
      name: 'Bug',
      color: 'green',
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.labels(boardId),
    });
    expect(screen.queryByText('Etiqueta salva')).toBeNull();
    expect(
      screen.queryByText('Não foi possível salvar. Tente novamente.'),
    ).toBeNull();
  });

  it('a 409 board-archived reverts the row, shows the conflict toast and Recarregar refetches the board view', async () => {
    const { result, queryClient } = await open();
    patchServer(() => problemOfType(409, '/problems/board-archived'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    type(result, 'Defect');

    act(() => result.current.vm.actions.submit());

    await screen.findByText(
      'Este item foi arquivado. Recarregue para ver o estado atual.',
    );
    expect(row(result, 'lb1')?.label.name).toBe('Bug');
    invalidate.mockClear();
    act(() => screen.getByRole('button', { name: 'Recarregar' }).click());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });

  it('a 404 reverts the row, toasts the save failure and refetches the board view', async () => {
    const { result, queryClient } = await open();
    patchServer(() => problem(404));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    type(result, 'Defect');

    act(() => result.current.vm.actions.submit());

    await screen.findByText('Não foi possível salvar. Tente novamente.');
    expect(row(result, 'lb1')?.label.name).toBe('Bug');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });
});

describe('useLabelsViewModel delete flow', () => {
  function problemOfType(status: number, type: string) {
    return HttpResponse.json(
      { type, title: 'Error', status, detail: '' },
      { status, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }

  // Records each deleted id; answers with the next queued reply, or 204.
  function deleteServer(...replies: (() => Response | Promise<Response>)[]) {
    const ids: unknown[] = [];
    server.use(
      http.delete(`${baseUrl}/api/v1/labels/:id`, ({ params }) => {
        ids.push(params.id);
        const reply = replies.shift();
        return reply ? reply() : new HttpResponse(null, { status: 204 });
      }),
    );
    return ids;
  }

  async function open(id = 'lb1', cards: JsonBodyType = []) {
    givenBoard({ labels: [bug, urgent, docs], active: cards });
    const hook = setup();
    await ready(hook.result);
    act(() => hook.result.current.vm.actions.openDelete(id));
    return hook;
  }

  type Hook = Awaited<ReturnType<typeof open>>['result'];

  const ids = (result: Hook) =>
    result.current.vm.state.rows.map((r) => r.label.id);

  it.each([
    ['no card', [], 0],
    ['one card', [cardFixture('c1', 'l1', { labelIds: ['lb1'] })], 1],
    [
      'several cards',
      [
        cardFixture('c1', 'l1', { labelIds: ['lb1'] }),
        cardFixture('c2', 'l1', { labelIds: ['lb1', 'lb2'] }),
        cardFixture('c3', 'l1', { labelIds: ['lb1'] }),
      ],
      3,
    ],
  ])(
    'openDelete sets confirmDelete with the label and its count for %s',
    async (_case, cards, count) => {
      const { result } = await open('lb1', cards);

      expect(result.current.vm.state.confirmDelete).toEqual({
        label: bug,
        count,
      });
    },
  );

  it('openDelete ignores an unknown id', async () => {
    const { result } = await open('nope');

    expect(result.current.vm.state.confirmDelete).toBeNull();
  });

  it('keeps the count captured when the dialog opened', async () => {
    const { result, queryClient } = await open('lb1', [
      cardFixture('c1', 'l1', { labelIds: ['lb1'] }),
    ]);

    act(() => {
      queryClient.setQueryData(boardViewKeys.cards(boardId, false), []);
    });

    await waitFor(() =>
      expect(result.current.vm.state.rows[0]?.usage.count).toBe(0),
    );
    expect(result.current.vm.state.confirmDelete?.count).toBe(1);
  });

  it('closeDelete closes the dialog and sends nothing', async () => {
    const { result } = await open();
    const deleted = deleteServer();

    act(() => result.current.vm.actions.closeDelete());

    expect(result.current.vm.state.confirmDelete).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(deleted).toEqual([]);
    expect(ids(result)).toEqual(['lb1', 'lb2', 'lb3']);
  });

  it('confirmDelete closes the dialog, removes the row at once, toasts and sends DELETE', async () => {
    const { result } = await open();
    const deleted = deleteServer(async () => {
      await delay(80);
      return new HttpResponse(null, { status: 204 });
    });

    act(() => result.current.vm.actions.confirmDelete());

    expect(result.current.vm.state.confirmDelete).toBeNull();
    await waitFor(() => expect(ids(result)).toEqual(['lb2', 'lb3']));
    await screen.findByText('Etiqueta excluída');
    expect(deleted).toEqual(['lb1']);
  });

  it('confirmDelete does nothing without an open dialog', async () => {
    givenBoard();
    const { result } = setup();
    await ready(result);
    const deleted = deleteServer();

    act(() => result.current.vm.actions.confirmDelete());

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(deleted).toEqual([]);
  });

  it('deleting the last label leaves zero rows', async () => {
    givenBoard({ labels: [bug] });
    const { result } = setup();
    await ready(result);
    deleteServer();
    act(() => result.current.vm.actions.openDelete('lb1'));

    act(() => result.current.vm.actions.confirmDelete());

    await waitFor(() => expect(result.current.vm.state.rows).toEqual([]));
    expect(result.current.vm.state.status).toBe('ready');
  });

  it('a 5xx puts the row back at its index and Tentar novamente repeats the DELETE', async () => {
    const { result } = await open('lb2');
    const deleted = deleteServer(() => problem(500));

    act(() => result.current.vm.actions.confirmDelete());

    await screen.findByText('Não foi possível salvar. Tente novamente.');
    expect(ids(result)).toEqual(['lb1', 'lb2', 'lb3']);
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(deleted).toEqual(['lb2', 'lb2']));
    await screen.findByText('Etiqueta excluída');
  });

  it('a 409 board-archived puts the row back, shows the conflict toast and Recarregar refetches the board view', async () => {
    const { result, queryClient } = await open();
    deleteServer(() => problemOfType(409, '/problems/board-archived'));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => result.current.vm.actions.confirmDelete());

    await screen.findByText(
      'Este item foi arquivado. Recarregue para ver o estado atual.',
    );
    expect(ids(result)).toEqual(['lb1', 'lb2', 'lb3']);
    invalidate.mockClear();
    act(() => screen.getByRole('button', { name: 'Recarregar' }).click());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });

  it('a 404 puts the row back, toasts the save failure and refetches the labels and the cards', async () => {
    const { result, queryClient } = await open();
    deleteServer(() => problem(404));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => result.current.vm.actions.confirmDelete());

    await screen.findByText('Não foi possível salvar. Tente novamente.');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
    await waitFor(() => expect(ids(result)).toEqual(['lb1', 'lb2', 'lb3']));
  });
});
