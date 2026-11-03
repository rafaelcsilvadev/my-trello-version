import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetail } from '@/features/board';
import type { Board, Card, ChecklistItem } from '@/features/board/model/types';
import { apiOrigin } from '@/shared/config';

import {
  boardFixture,
  boardId,
  cardFixture,
  checklistItem,
  labelFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const boardUrl = `${apiOrigin}/api/v1/boards/${boardId}`;
const cardId = 'c1';
const cardUrl = `${apiOrigin}/api/v1/cards/${cardId}`;
const boardPath = `/b/${boardId}`;
const stamp = '2026-10-20T12:00:00.000Z';

const backlog = listFixture('l1', { title: 'Backlog', position: 0 });
const doing = listFixture('l2', { title: 'Doing', position: 1 });
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

type Seed = {
  card: Card;
  board: Board;
  items: ChecklistItem[];
  // The board tiles, only drawn by `renderDetail({ withBoard: true })`.
  tiles: Card[];
};

// The reads of the detail answer from `seed`; `writes` records every card change.
function detailApi(overrides: Partial<Seed> = {}) {
  const seed: Seed = {
    // Labels out of board order, so the chips prove the order they get.
    card: cardFixture(cardId, backlog.id, {
      title: 'Write the brief',
      labelIds: ['lb3', 'lb1'],
    }),
    board: boardFixture(),
    items: [],
    tiles: [],
    ...overrides,
  };
  const writes: { method: string; path: string; body: unknown }[] = [];
  const reply = (body: JsonBodyType) => () => HttpResponse.json(body);
  server.use(
    http.get(cardUrl, () => HttpResponse.json(seed.card)),
    http.get(boardUrl, () => HttpResponse.json(seed.board)),
    http.get(`${boardUrl}/lists`, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('archived') === 'true'
          ? []
          : [backlog, doing],
      ),
    ),
    http.get(`${boardUrl}/labels`, reply([urgent, later, bug])),
    http.get(`${boardUrl}/cards`, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('archived') === 'true'
          ? []
          : seed.tiles,
      ),
    ),
    http.get(`${cardUrl}/checklist-items`, () => HttpResponse.json(seed.items)),
    http.patch(
      `${apiOrigin}/api/v1/checklist-items/:id`,
      async ({ params, request }) => {
        const item = seed.items.find(({ id }) => id === params.id)!;
        return HttpResponse.json({
          ...item,
          ...((await request.json()) as Partial<ChecklistItem>),
        });
      },
    ),
    http.all(`${apiOrigin}/api/v1/cards/:id*`, async ({ request }) => {
      if (request.method === 'GET') return undefined;
      writes.push({
        method: request.method,
        path: new URL(request.url).pathname,
        body: await request.json().catch(() => null),
      });
      return HttpResponse.json(seed.card);
    }),
  );
  return { seed, writes };
}

function renderDetail({ withBoard = false } = {}) {
  return renderApp({
    route: `${boardPath}/t/${cardId}`,
    token: 'token',
    prefs: { language: 'pt-BR' },
    // With the board, the app's own routes open the detail over the tiles.
    routes: withBoard
      ? []
      : [
          { path: '/b/:boardId', element: <p>Quadro</p> },
          {
            path: '/b/:boardId/t/:cardId',
            element: <CardDetail boardId={boardId} cardId={cardId} />,
          },
        ],
  });
}

async function renderReady(options?: Parameters<typeof renderDetail>[0]) {
  const services = renderDetail(options);
  await screen.findByRole('textbox', { name: 'Título' });
  return services;
}

function detail() {
  return screen.getByRole('dialog', { name: 'Write the brief' });
}

// Waits for the detail to close and returns where it went.
async function closedPath(services: ReturnType<typeof renderDetail>) {
  await screen.findByText('Quadro');
  expect(screen.queryByRole('dialog')).toBeNull();
  return services.router.state.location.pathname;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CardDetail', () => {
  it('is a modal dialog with the column name in the header', async () => {
    detailApi();
    await renderReady();

    const dialog = detail();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(within(dialog).getByText('Backlog')).toBeTruthy();
  });

  it('shows the X on desktop and the back arrow on phones', async () => {
    detailApi();
    await renderReady();

    const close = within(detail()).getByRole('button', { name: 'Fechar' });
    const back = within(detail()).getByRole('button', { name: 'Voltar' });
    expect(close.parentElement?.className).toContain('hidden md:flex');
    expect(back.parentElement?.className).toContain('md:hidden');
  });

  it.each(['Fechar', 'Voltar'])(
    'closes to the board with the %s button',
    async (name) => {
      detailApi();
      const services = await renderReady();

      fireEvent.click(within(detail()).getByRole('button', { name }));

      expect(await closedPath(services)).toBe(boardPath);
    },
  );

  it('closes to the board on Esc', async () => {
    detailApi();
    const services = await renderReady();

    fireEvent.keyDown(
      within(detail()).getByRole('button', { name: 'Fechar' }),
      {
        key: 'Escape',
      },
    );

    expect(await closedPath(services)).toBe(boardPath);
  });

  it('closes to the board on a backdrop click', async () => {
    detailApi();
    const services = await renderReady();

    // React Aria dismisses on a press that starts and ends outside the dialog.
    await userEvent.click(screen.getByTestId('card-detail-overlay'));

    expect(await closedPath(services)).toBe(boardPath);
  });

  it('restores the title on Esc in the title and keeps the dialog', async () => {
    detailApi();
    const services = await renderReady();
    const title = screen.getByRole('textbox', { name: 'Título' });

    fireEvent.change(title, { target: { value: 'Draft title' } });
    fireEvent.keyDown(title, { key: 'Escape' });

    expect((title as HTMLInputElement).value).toBe('Write the brief');
    expect(detail()).toBeTruthy();
    expect(services.router.state.location.pathname).toBe(
      `${boardPath}/t/${cardId}`,
    );
  });

  it('closes only the move dialog on Esc', async () => {
    detailApi();
    await renderReady();

    fireEvent.click(screen.getByRole('button', { name: 'Mover para…' }));
    const move = await screen.findByRole('dialog', { name: 'Mover para…' });
    fireEvent.keyDown(within(move).getByRole('button', { name: 'Fechar' }), {
      key: 'Escape',
    });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Mover para…' })).toBeNull(),
    );
    expect(detail()).toBeTruthy();
  });

  it('closes only the delete dialog on Esc', async () => {
    detailApi({
      card: cardFixture(cardId, backlog.id, {
        title: 'Write the brief',
        archivedAt: stamp,
      }),
    });
    await renderReady();

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir definitivamente' }),
    );
    const confirm = await screen.findByRole('alertdialog');
    fireEvent.keyDown(
      within(confirm).getByRole('button', { name: 'Cancelar' }),
      { key: 'Escape' },
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(detail()).toBeTruthy();
  });

  it('asks before closing with a draft and Esc there keeps the draft', async () => {
    detailApi();
    const services = await renderReady();
    const description = screen.getByRole('textbox', { name: 'Descrição' });
    fireEvent.change(description, { target: { value: 'Unsaved notes' } });

    fireEvent.click(within(detail()).getByRole('button', { name: 'Fechar' }));
    const discard = await screen.findByRole('alertdialog', {
      name: 'Descartar alterações?',
    });
    fireEvent.keyDown(
      within(discard).getByRole('button', { name: 'Continuar editando' }),
      { key: 'Escape' },
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(detail()).toBeTruthy();
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Descrição',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('Unsaved notes');
    expect(services.router.state.location.pathname).toBe(
      `${boardPath}/t/${cardId}`,
    );
  });

  it('shows the skeleton while the card loads', async () => {
    detailApi();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(cardUrl, async () => {
        await held;
        return undefined;
      }),
    );
    renderDetail();

    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull(),
    );
    expect(screen.queryByRole('textbox', { name: 'Título' })).toBeNull();

    release();

    expect(await screen.findByRole('textbox', { name: 'Título' })).toBeTruthy();
    expect(detail().querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('shows the load error and loads again on Tentar novamente', async () => {
    // 5xx is retried with backoff; fake timers skip the waits.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    detailApi();
    let failing = true;
    server.use(http.get(cardUrl, () => (failing ? problem(500) : undefined)));
    renderDetail();

    await vi.advanceTimersByTimeAsync(10_000);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Não foi possível carregar')).toBeTruthy();

    failing = false;
    fireEvent.click(
      within(alert).getByRole('button', { name: 'Tentar novamente' }),
    );

    expect(await screen.findByRole('textbox', { name: 'Título' })).toBeTruthy();
  });

  describe('labels', () => {
    const labelUrl = `${cardUrl}/labels/:labelId`;
    const add = () =>
      screen.getByRole('button', { name: 'Adicionar etiqueta' });
    const search = () =>
      screen.getByRole('textbox', { name: 'Buscar etiquetas…' });
    // The open popover hides the detail from the accessibility tree.
    const hiddenDetail = () =>
      screen.getByRole('dialog', { name: 'Write the brief', hidden: true });
    const popover = () => screen.queryByRole('dialog', { name: 'Etiquetas' });

    // Saves each label change into the card, so the refetch after it reads it.
    function labelApi(seed: Seed, fail = false) {
      server.use(
        http.put(labelUrl, ({ params }) => {
          if (fail) return problem(500);
          seed.card.labelIds = [
            ...seed.card.labelIds,
            params.labelId as string,
          ];
          return HttpResponse.json(seed.card);
        }),
        http.delete(labelUrl, ({ params }) => {
          if (fail) return problem(500);
          seed.card.labelIds = seed.card.labelIds.filter(
            (id) => id !== params.labelId,
          );
          return HttpResponse.json(seed.card);
        }),
      );
    }

    async function openPopover() {
      await userEvent.click(add());
      await screen.findByRole('dialog', { name: 'Etiquetas' });
    }

    async function tile() {
      return (
        await screen.findByText('Write the brief', {
          selector: '[data-card-id] *',
        })
      ).closest<HTMLElement>('[data-card-id]')!;
    }

    const chips = (scope: HTMLElement) =>
      within(scope)
        .getAllByRole('listitem', { hidden: true })
        .map((item) => item.textContent);

    it('shows the chips in board order, then the add button', async () => {
      detailApi();
      await renderReady();

      const list = within(hiddenDetail()).getByRole('list', {
        name: 'Etiquetas',
        hidden: true,
      });
      expect(chips(list)).toEqual(['Urgent', 'Bug']);
      expect(
        list.compareDocumentPosition(add()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it.each([
      [
        'an archived card',
        {
          card: cardFixture(cardId, backlog.id, {
            title: 'Write the brief',
            labelIds: ['lb3', 'lb1'],
            archivedAt: stamp,
          }),
        },
      ],
      ['an archived board', { board: boardFixture({ archivedAt: stamp }) }],
    ])('keeps the chips of %s with no add button', async (_, overrides) => {
      detailApi(overrides);
      await renderReady();

      const list = within(hiddenDetail()).getByRole('list', {
        name: 'Etiquetas',
        hidden: true,
      });
      expect(chips(list)).toEqual(['Urgent', 'Bug']);
      expect(
        screen.queryByRole('button', { name: 'Adicionar etiqueta' }),
      ).toBeNull();
    });

    it('applies and removes a label on the detail and on the board tile', async () => {
      const card = cardFixture(cardId, backlog.id, {
        title: 'Write the brief',
        labelIds: ['lb3'],
      });
      const { seed } = detailApi({ card, tiles: [card] });
      labelApi(seed);
      await renderReady({ withBoard: true });
      const tileEl = await tile();
      await waitFor(() => expect(within(tileEl).getByText('Bug')).toBeTruthy());

      await openPopover();
      fireEvent.click(await screen.findByRole('checkbox', { name: 'Urgent' }));

      const list = () =>
        within(hiddenDetail()).getByRole('list', {
          name: 'Etiquetas',
          hidden: true,
        });
      // Board order: Urgent comes before Bug.
      await waitFor(() => expect(chips(list())).toEqual(['Urgent', 'Bug']));
      await waitFor(() =>
        expect(within(tileEl).getByText('Urgent')).toBeTruthy(),
      );
      const tileText = tileEl.textContent!;
      expect(tileText.indexOf('Urgent')).toBeLessThan(tileText.indexOf('Bug'));

      // A pending option ignores toggles until the server answers.
      const urgent = screen.getByRole('checkbox', { name: 'Urgent' });
      await waitFor(() =>
        expect(urgent.closest('label')?.hasAttribute('data-pending')).toBe(
          false,
        ),
      );
      fireEvent.click(urgent);

      await waitFor(() => expect(chips(list())).toEqual(['Bug']));
      await waitFor(() =>
        expect(within(tileEl).queryByText('Urgent')).toBeNull(),
      );
    });

    it('closes only the popover on Esc, then the detail on a second Esc', async () => {
      detailApi();
      const services = await renderReady();
      await openPopover();

      fireEvent.keyDown(search(), { key: 'Escape' });

      await waitFor(() => expect(popover()).toBeNull());
      expect(hiddenDetail()).toBeTruthy();
      fireEvent.keyDown(
        within(hiddenDetail()).getByRole('button', {
          name: 'Fechar',
          hidden: true,
        }),
        {
          key: 'Escape',
        },
      );
      expect(await closedPath(services)).toBe(boardPath);
    });

    it('closes only the popover on Esc inside the create form', async () => {
      detailApi();
      await renderReady();
      await openPopover();
      await userEvent.click(
        screen.getByRole('button', { name: 'Criar etiqueta' }),
      );

      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Nome' }), {
        key: 'Escape',
      });

      await waitFor(() => expect(popover()).toBeNull());
      expect(hiddenDetail()).toBeTruthy();
    });

    it('lets the keyboard reach the retry toast of a failed toggle with the popover open', async () => {
      const { seed } = detailApi();
      labelApi(seed, true);
      await renderReady();
      await openPopover();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Later' }));
      const retry = await screen.findByRole('button', {
        name: 'Tentar novamente',
      });
      await userEvent.keyboard('{F6}');
      await userEvent.tab();

      expect(document.activeElement).toBe(retry);
    });

    it('asks to discard an unsaved title before Gerenciar etiquetas', async () => {
      detailApi();
      const services = await renderReady();
      fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), {
        target: { value: 'Unsaved title' },
      });
      await openPopover();

      await userEvent.click(
        screen.getByRole('link', { name: 'Gerenciar etiquetas' }),
      );
      const dialog = await screen.findByRole('alertdialog', {
        name: 'Descartar alterações?',
      });
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Descartar' }),
      );

      await waitFor(() =>
        expect(services.router.state.location.pathname).toBe(
          `${boardPath}/labels`,
        ),
      );
    });

    it('closes the detail without the dialog when only the search text changed', async () => {
      detailApi();
      const services = await renderReady();
      await openPopover();
      await userEvent.type(search(), 'urg');

      await userEvent.click(
        screen.getByRole('link', { name: 'Gerenciar etiquetas' }),
      );

      await waitFor(() =>
        expect(services.router.state.location.pathname).toBe(
          `${boardPath}/labels`,
        ),
      );
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('lists a created label in the board label filter', async () => {
      const card = cardFixture(cardId, backlog.id, {
        title: 'Write the brief',
      });
      const { seed } = detailApi({ card, tiles: [card] });
      labelApi(seed);
      const errands = labelFixture('lb4', { name: 'Errands', color: 'orange' });
      let created = false;
      server.use(
        http.get(`${boardUrl}/labels`, () =>
          HttpResponse.json(
            created ? [urgent, later, bug, errands] : [urgent, later, bug],
          ),
        ),
        http.post(`${boardUrl}/labels`, () => {
          created = true;
          return HttpResponse.json(errands, { status: 201 });
        }),
      );
      await renderReady({ withBoard: true });
      await tile();

      await openPopover();
      await userEvent.click(
        screen.getByRole('button', { name: 'Criar etiqueta' }),
      );
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Nome' }),
        'Errands',
      );
      await userEvent.click(screen.getByRole('button', { name: 'Criar' }));
      await waitFor(() =>
        expect(
          (
            screen.getByRole('checkbox', {
              name: 'Errands',
            }) as HTMLInputElement
          ).checked,
        ).toBe(true),
      );
      fireEvent.keyDown(search(), { key: 'Escape' });
      await waitFor(() => expect(popover()).toBeNull());
      fireEvent.keyDown(
        within(hiddenDetail()).getByRole('button', {
          name: 'Fechar',
          hidden: true,
        }),
        {
          key: 'Escape',
        },
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      await userEvent.click(
        await screen.findByRole('button', { name: 'Etiquetas' }),
      );

      expect(
        await screen.findByRole('menuitemcheckbox', { name: 'Errands' }),
      ).toBeTruthy();
    });
  });

  it('wires the editable fields to the card and its changes', async () => {
    const { writes } = detailApi({
      card: cardFixture(cardId, backlog.id, {
        title: 'Write the brief',
        dueDate: '2026-11-05',
        description: 'Saved notes',
      }),
    });
    await renderReady();

    const title = screen.getByRole('textbox', { name: 'Título' });
    const done = screen.getByRole('checkbox', { name: 'Concluída' });
    const due = screen.getByLabelText('Prazo');
    const description = screen.getByRole('textbox', { name: 'Descrição' });
    for (const field of [title, done, due, description]) {
      expect(field).toHaveProperty('disabled', false);
    }
    expect((due as HTMLInputElement).value).toBe('2026-11-05');
    expect((description as HTMLTextAreaElement).value).toBe('Saved notes');

    // Drafts and errors flow back from the view model.
    fireEvent.change(title, { target: { value: '  ' } });
    fireEvent.keyDown(title, { key: 'Enter' });
    expect((title as HTMLInputElement).value).toBe('  ');
    expect(screen.getByText('Dê um título à tarefa')).toBeTruthy();
    fireEvent.keyDown(title, { key: 'Escape' });

    fireEvent.change(description, { target: { value: 'x'.repeat(5001) } });
    expect(screen.getByText('Use até 5000 caracteres')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect((description as HTMLTextAreaElement).value).toBe('Saved notes');

    // One at a time, so the requests arrive in this order.
    fireEvent.click(done);
    await waitFor(() => expect(writes).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Remover prazo/ }));
    await waitFor(() => expect(writes).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Arquivar' }));
    await waitFor(() => expect(writes).toHaveLength(3));
    expect(writes).toEqual([
      {
        method: 'PATCH',
        path: `/api/v1/cards/${cardId}`,
        body: { done: true },
      },
      {
        method: 'PATCH',
        path: `/api/v1/cards/${cardId}`,
        body: { dueDate: null },
      },
      { method: 'POST', path: `/api/v1/cards/${cardId}/archive`, body: null },
    ]);
  });

  it.each([
    [
      'an archived card',
      { card: cardFixture(cardId, backlog.id, { archivedAt: stamp }) },
      'Tarefa arquivada · somente leitura',
    ],
    [
      'an archived board',
      { board: boardFixture({ archivedAt: stamp }) },
      'Quadro arquivado · somente leitura',
    ],
  ])('disables every field of %s', async (_, overrides, notice) => {
    detailApi(overrides);
    await renderReady();

    // The checklist move live region is a second status (FCLD-17).
    expect(
      screen.getAllByRole('status').map((region) => region.textContent),
    ).toContainEqual(expect.stringContaining(notice));
    for (const field of [
      screen.getByRole('textbox', { name: 'Título' }),
      screen.getByRole('checkbox', { name: 'Concluída' }),
      screen.getByLabelText('Prazo'),
      screen.getByRole('textbox', { name: 'Descrição' }),
    ]) {
      expect(field).toHaveProperty('disabled', true);
    }
    expect(screen.queryByRole('button', { name: 'Mover para…' })).toBeNull();
  });

  describe('checklist', () => {
    const items = [
      checklistItem('i1', cardId, { text: 'Draft', done: true, position: 0 }),
      checklistItem('i2', cardId, { text: 'Review', position: 1 }),
      checklistItem('i3', cardId, { text: 'Send', position: 2 }),
    ];
    const withItems = {
      card: cardFixture(cardId, backlog.id, {
        title: 'Write the brief',
        checklist: { total: 3, done: 1 },
      }),
      items,
    };

    function checklist() {
      return screen
        .getByRole('heading', { name: 'Checklist' })
        .closest('section')!;
    }

    it('shows the items in order and the progress below the description', async () => {
      detailApi(withItems);
      await renderReady();

      const section = await waitFor(() => {
        const found = checklist();
        expect(within(found).getAllByRole('checkbox')).toHaveLength(3);
        return found;
      });
      expect(
        within(section)
          .getAllByRole('checkbox')
          .map((box) => (box as HTMLInputElement).checked),
      ).toEqual([true, false, false]);
      expect(
        within(section)
          .getAllByRole('textbox')
          .map((field) => (field as HTMLInputElement).value),
      ).toEqual(['Draft', 'Review', 'Send', '']);
      expect(within(section).getByText('1/3')).toBeTruthy();
      const description = screen.getByRole('textbox', { name: 'Descrição' });
      expect(
        description.compareDocumentPosition(section) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('updates the count and the board tile badge on a tick', async () => {
      detailApi({ ...withItems, tiles: [withItems.card] });
      await renderReady({ withBoard: true });
      const tile = (
        await screen.findByText('Write the brief', {
          selector: '[data-card-id] *',
        })
      ).closest<HTMLElement>('[data-card-id]')!;
      await waitFor(() => expect(within(tile).getByText('1/3')).toBeTruthy());

      const box = await screen.findByRole('checkbox', { name: 'Review' });

      fireEvent.click(box);

      await waitFor(() =>
        expect(within(checklist()).getByText('2/3')).toBeTruthy(),
      );
      expect(within(tile).getByText('2/3')).toBeTruthy();
      // The item stays disabled while the tick is in flight; ending before it
      // settles would leave it running into the next test.
      await waitFor(() => expect(box).toHaveProperty('disabled', false));
    });

    it.each([
      [
        'an archived card',
        {
          ...withItems,
          card: { ...withItems.card, archivedAt: stamp },
        },
      ],
      [
        'an archived board',
        { ...withItems, board: boardFixture({ archivedAt: stamp }) },
      ],
    ])('locks the items of %s', async (_, overrides) => {
      detailApi(overrides);
      await renderReady();

      const section = await waitFor(() => {
        const found = checklist();
        expect(within(found).getAllByRole('checkbox')).toHaveLength(3);
        return found;
      });
      for (const field of [
        ...within(section).getAllByRole('checkbox'),
        ...within(section).getAllByRole('textbox'),
      ]) {
        expect(field).toHaveProperty('disabled', true);
      }
      expect(within(section).queryAllByRole('button')).toHaveLength(0);
      expect(
        within(section).queryByRole('textbox', {
          name: 'Adicionar item e apertar Enter',
        }),
      ).toBeNull();
      expect(within(section).getByText('1/3')).toBeTruthy();
    });

    it('shows the card as gone on a checklist 404', async () => {
      detailApi(withItems);
      server.use(http.get(`${cardUrl}/checklist-items`, () => problem(404)));
      renderDetail();

      expect(
        await screen.findByText('Esta tarefa não existe mais'),
      ).toBeTruthy();
    });

    it('shows the error in the section on a checklist 5xx, with the title editable', async () => {
      // 5xx is retried with backoff; fake timers skip the waits.
      vi.useFakeTimers({ shouldAdvanceTime: true });
      detailApi(withItems);
      server.use(http.get(`${cardUrl}/checklist-items`, () => problem(500)));
      await renderReady();

      await vi.advanceTimersByTimeAsync(10_000);
      const alert = await within(checklist()).findByRole('alert');
      expect(within(alert).getByText('Não foi possível carregar')).toBeTruthy();
      expect(screen.getByRole('textbox', { name: 'Título' })).toHaveProperty(
        'disabled',
        false,
      );
    });

    it('asks before closing with an item edit', async () => {
      detailApi(withItems);
      await renderReady();
      const review = await screen.findByRole('textbox', {
        name: 'Editar item “Review”',
      });
      fireEvent.change(review, { target: { value: 'Review twice' } });

      fireEvent.keyDown(detail(), { key: 'Escape' });

      expect(
        await screen.findByRole('alertdialog', {
          name: 'Descartar alterações?',
        }),
      ).toBeTruthy();
    });

    describe('reorder', () => {
      const moveUrl = `${apiOrigin}/api/v1/checklist-items/:id/move`;

      // Records each move body and saves it into `seed.items`, so the refetch
      // after the move reads the new order.
      function moveApi(seed: Seed, fail = false) {
        const moves: { id: string; body: unknown }[] = [];
        server.use(
          http.post(moveUrl, async ({ params, request }) => {
            const body = (await request.json()) as { position: number };
            moves.push({ id: params.id as string, body });
            if (fail) return problem(500);
            const moved = seed.items.find(({ id }) => id === params.id)!;
            const rest = seed.items.filter((item) => item !== moved);
            rest.splice(body.position, 0, moved);
            seed.items = rest.map((item, position) => ({ ...item, position }));
            return HttpResponse.json(seed.items[body.position]);
          }),
        );
        return moves;
      }

      async function readyItems() {
        return waitFor(() => {
          const found = checklist();
          expect(within(found).getAllByRole('checkbox')).toHaveLength(3);
          return found;
        });
      }

      function order() {
        return within(checklist())
          .getAllByRole('textbox', { name: /^Editar item/ })
          .map((field) => (field as HTMLInputElement).value);
      }

      function grip(text: string) {
        return within(checklist()).getByRole('button', {
          name: `Reordenar o item ${text}`,
        });
      }

      async function tabTo(target: HTMLElement) {
        for (
          let tab = 0;
          tab < 40 && document.activeElement !== target;
          tab++
        ) {
          await userEvent.tab();
        }
        expect(document.activeElement).toBe(target);
      }

      it('moves an item with the keyboard and keeps focus on its grip', async () => {
        const { seed } = detailApi(withItems);
        const moves = moveApi(seed);
        await renderReady();
        await readyItems();

        await tabTo(grip('Review'));
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{ArrowUp}');
        await userEvent.keyboard(' ');

        expect(order()).toEqual(['Review', 'Draft', 'Send']);
        await waitFor(() =>
          expect(moves).toEqual([{ id: 'i2', body: { position: 0 } }]),
        );
        const live = within(detail())
          .getAllByRole('status')
          .find((region) => region.getAttribute('aria-live') === 'assertive')!;
        expect(live.textContent).toBe('Item Review solto na posição 1 de 3');
        expect(document.activeElement).toBe(grip('Review'));
        // The optimistic reorder and the refetch move the row again.
        await waitFor(() =>
          expect(
            within(checklist()).getByRole('checkbox', { name: 'Review' }),
          ).toHaveProperty('disabled', false),
        );
        expect(order()).toEqual(['Review', 'Draft', 'Send']);
        expect(document.activeElement).toBe(grip('Review'));
      });

      it('cancels the move on Esc and closes the detail on a second Esc', async () => {
        const { seed } = detailApi(withItems);
        const moves = moveApi(seed);
        const services = await renderReady();
        await readyItems();

        await tabTo(grip('Review'));
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{ArrowUp}');
        await userEvent.keyboard('{Escape}');

        expect(order()).toEqual(['Draft', 'Review', 'Send']);
        expect(detail()).toBeTruthy();
        expect(services.router.state.location.pathname).toBe(
          `${boardPath}/t/${cardId}`,
        );

        await userEvent.keyboard('{Escape}');

        expect(await closedPath(services)).toBe(boardPath);
        expect(moves).toEqual([]);
      });

      it('sends no move when the detail closes with an item picked', async () => {
        const { seed } = detailApi(withItems);
        const moves = moveApi(seed);
        const services = await renderReady();
        await readyItems();

        await tabTo(grip('Review'));
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{ArrowUp}');
        fireEvent.click(
          within(detail()).getByRole('button', { name: 'Fechar' }),
        );

        expect(await closedPath(services)).toBe(boardPath);
        expect(moves).toEqual([]);
      });

      it('shows no grip and no draggable row on an archived card', async () => {
        detailApi({
          ...withItems,
          card: { ...withItems.card, archivedAt: stamp },
        });
        await renderReady();
        const section = await readyItems();

        expect(
          within(section).queryAllByRole('button', { name: /^Reordenar/ }),
        ).toHaveLength(0);
        expect(section.querySelector('[data-item-grip-id]')).toBeNull();
        expect(section.querySelector('[draggable]')).toBeNull();
      });

      it('puts the item back and offers a retry when the move fails', async () => {
        const { seed } = detailApi(withItems);
        const moves = moveApi(seed, true);
        await renderReady();
        await readyItems();

        await tabTo(grip('Review'));
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{ArrowUp}');
        await userEvent.keyboard(' ');

        const toast = await screen.findByText(
          'Não foi possível salvar. Tente novamente.',
        );
        expect(moves).toEqual([{ id: 'i2', body: { position: 0 } }]);
        expect(order()).toEqual(['Draft', 'Review', 'Send']);
        const region = toast.closest<HTMLElement>('output')!;
        expect(
          within(region).getByRole('button', { name: 'Tentar novamente' }),
        ).toBeTruthy();
      });

      it('keeps the detail open when the retry toast is clicked', async () => {
        const { seed } = detailApi(withItems);
        moveApi(seed, true);
        await renderReady();
        await readyItems();

        await tabTo(grip('Review'));
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{ArrowUp}');
        await userEvent.keyboard(' ');
        await userEvent.click(
          await screen.findByRole('button', { name: 'Tentar novamente' }),
        );

        expect(screen.getByRole('dialog')).toBeTruthy();
      });

      it('lets the keyboard reach the retry toast from inside the open detail', async () => {
        const { seed } = detailApi(withItems);
        moveApi(seed, true);
        await renderReady();
        await readyItems();

        await tabTo(grip('Review'));
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{ArrowUp}');
        await userEvent.keyboard(' ');
        const retry = await screen.findByRole('button', {
          name: 'Tentar novamente',
        });

        await userEvent.keyboard('{F6}');
        await userEvent.tab();

        expect(document.activeElement).toBe(retry);
      });
    });
  });
});
