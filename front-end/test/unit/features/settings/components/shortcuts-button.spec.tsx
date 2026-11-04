import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiOrigin } from '@/shared/config';

import {
  boardFixture,
  boardId,
  cardFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { mockViewport } from '../../../../support/match-media';
import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const TOKEN = 'token-123';
const boardUrl = `${apiOrigin}/api/v1/boards/${boardId}`;
const backlog = listFixture('l1', { title: 'Backlog' });
const card = cardFixture('c1', backlog.id, { title: 'Write the brief' });

const HINT_PT =
  'Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela';

function boardApi() {
  server.use(
    http.get(boardUrl, () => HttpResponse.json(boardFixture())),
    http.get(`${boardUrl}/lists`, ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('archived') === 'true'
          ? []
          : [backlog],
      ),
    ),
    http.get(`${boardUrl}/cards`, () => HttpResponse.json([card])),
    http.get(`${boardUrl}/labels`, () => HttpResponse.json([])),
    http.get(`${apiOrigin}/api/v1/cards/${card.id}`, () =>
      HttpResponse.json(card),
    ),
    http.get(`${apiOrigin}/api/v1/cards/:id/checklist-items`, () =>
      HttpResponse.json([]),
    ),
  );
}

const topBarButton = () =>
  within(screen.getByRole('banner')).getByRole('button', {
    name: 'Atalhos de teclado',
  });

async function renderBoards(isDesktop = true) {
  const viewport = mockViewport(isDesktop);
  const services = renderApp({
    route: '/boards',
    token: TOKEN,
    prefs: { language: 'pt-BR' },
  });
  await screen.findByRole('heading', { level: 1, name: 'Meus quadros' });
  return { viewport, services };
}

describe('ShortcutsButton in the top bar', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    vi.unstubAllGlobals();
  });

  it.each([
    ['/boards', 'Meus quadros'],
    ['/settings', 'Configurações'],
    [`/b/${boardId}`, 'Product launch'],
  ])(
    'shows the Keyboard icon button on desktop at %s (FSET-14)',
    async (route, title) => {
      mockViewport(true);
      boardApi();
      renderApp({ route, token: TOKEN, prefs: { language: 'pt-BR' } });
      await screen.findByRole('heading', { level: 1, name: title });

      const button = topBarButton();
      expect(button.querySelector('svg.lucide-keyboard')).not.toBeNull();
    },
  );

  it('shows no button on a phone (FSET-15)', async () => {
    await renderBoards(false);

    expect(
      screen.queryByRole('button', { name: 'Atalhos de teclado' }),
    ).toBeNull();
  });

  it('opens a dialog with the five rows and the hint (FSET-16)', async () => {
    await renderBoards();

    fireEvent.click(topBarButton());

    const dialog = await screen.findByRole('dialog', {
      name: 'Atalhos de teclado',
    });
    const view = within(dialog);
    expect(
      Array.from(dialog.querySelectorAll('kbd')).map((k) => k.textContent),
    ).toEqual(['N', '/', 'Esc', 'Espaço', '?']);
    expect(view.getByText('Nova tarefa na primeira coluna')).toBeTruthy();
    expect(view.getByText('Buscar no quadro')).toBeTruthy();
    expect(view.getByText('Fecha a camada mais interna')).toBeTruthy();
    expect(
      view.getByText('Pegar e soltar o card, a coluna ou o item em foco'),
    ).toBeTruthy();
    expect(view.getByText('Mostrar atalhos')).toBeTruthy();
    expect(view.getByText(HINT_PT)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Fechar' })).toBeTruthy();
  });

  it('closes on Esc and returns focus to the button (FSET-21)', async () => {
    await renderBoards();
    const button = topBarButton();
    button.focus();
    fireEvent.click(button);
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it('closes on Fechar and returns focus to the button (FSET-21)', async () => {
    await renderBoards();
    const button = topBarButton();
    button.focus();
    fireEvent.click(button);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it('opens on ? and returns focus to the element that had it (FSET-17, FSET-21)', async () => {
    await renderBoards();
    const link = screen.getByRole('link', { name: 'Configurações' });
    link.focus();

    fireEvent.keyDown(link, { key: '?' });
    const dialog = await screen.findByRole('dialog', {
      name: 'Atalhos de teclado',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(link));
  });

  it('shows the new language when it changes with the dialog open (FSET-23)', async () => {
    const { services } = await renderBoards();
    fireEvent.click(topBarButton());
    await screen.findByRole('dialog', { name: 'Atalhos de teclado' });

    act(() => services.preferences.setLanguage('en'));

    const dialog = await screen.findByRole('dialog', {
      name: 'Keyboard shortcuts',
    });
    const view = within(dialog);
    expect(view.getByText('Show shortcuts')).toBeTruthy();
    expect(view.getByText(/^Keyboard: Space picks up/)).toBeTruthy();
    expect(view.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(
      Array.from(dialog.querySelectorAll('kbd')).map((k) => k.textContent),
    ).toContain('Space');
  });

  it('opens nothing on ? while the card detail is open (FSET-25)', async () => {
    mockViewport(true);
    boardApi();
    renderApp({
      route: `/b/${boardId}/t/${card.id}`,
      token: TOKEN,
      prefs: { language: 'pt-BR' },
    });
    await screen.findByRole('dialog', { name: 'Write the brief' });

    fireEvent.keyDown(document, { key: '?' });

    expect(
      screen.queryByRole('dialog', { name: 'Atalhos de teclado' }),
    ).toBeNull();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
