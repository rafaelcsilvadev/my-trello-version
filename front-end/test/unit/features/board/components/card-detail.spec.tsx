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

  it('shows the label chips in board order, with no control', async () => {
    detailApi();
    await renderReady();

    const labels = within(detail()).getByRole('list', { name: 'Etiquetas' });
    expect(
      within(labels)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Urgent', 'Bug']);
    // No "+" or remove control: labels change in a later feature.
    const block = labels.parentElement!;
    expect(within(block).queryAllByRole('button')).toHaveLength(0);
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

    expect(screen.getByRole('status').textContent).toContain(notice);
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

      fireEvent.click(await screen.findByRole('checkbox', { name: 'Review' }));

      await waitFor(() =>
        expect(within(checklist()).getByText('2/3')).toBeTruthy(),
      );
      expect(within(tile).getByText('2/3')).toBeTruthy();
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
  });
});
