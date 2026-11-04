import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiOrigin } from '@/shared/config';

import { mockViewport } from '../../../../support/match-media';
import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

function renderSettings(
  isDesktop: boolean,
  language: 'pt-BR' | 'en' = 'pt-BR',
) {
  const viewport = mockViewport(isDesktop);
  server.use(
    http.get(`${apiOrigin}/api/v1/me`, () =>
      HttpResponse.json({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        name: 'Demo',
        email: 'demo@example.com',
        createdAt: '2026-10-23T12:00:00.000Z',
      }),
    ),
  );
  renderApp({ route: '/settings', token: 'token-123', prefs: { language } });
  return viewport;
}

const h2s = () =>
  screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

describe('ShortcutsPanel on /settings', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('shows five kbd rows with PT-BR descriptions on desktop', async () => {
    renderSettings(true);

    const heading = await screen.findByRole('heading', {
      level: 2,
      name: 'Atalhos de teclado',
    });
    const panel = heading.closest('section') as HTMLElement;
    const keys = Array.from(panel.querySelectorAll('kbd')).map(
      (k) => k.textContent,
    );
    expect(keys).toEqual(['N', '/', 'Esc', 'Espaço', '?']);
    const rows = Array.from(panel.querySelectorAll('kbd')).map(
      (k) => k.nextElementSibling?.textContent,
    );
    expect(rows).toEqual([
      'Nova tarefa na primeira coluna',
      'Buscar no quadro',
      'Fecha a camada mais interna',
      'Pegar e soltar o card, a coluna ou o item em foco',
      'Mostrar atalhos',
    ]);
  });

  it('does not render the panel on a phone', async () => {
    renderSettings(false);

    await screen.findByRole('heading', { level: 2, name: 'Sessão' });
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Atalhos de teclado' }),
    ).toBeNull();
    expect(document.querySelector('kbd')).toBeNull();
  });

  it('switches to the English descriptions and Space at once', async () => {
    renderSettings(true);
    await screen.findByRole('heading', {
      level: 2,
      name: 'Atalhos de teclado',
    });
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(5));

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'English' }));
    fireEvent.click(screen.getByRole('tab', { name: 'English' }));

    const heading = await screen.findByRole('heading', {
      level: 2,
      name: 'Keyboard shortcuts',
    });
    const panel = heading.closest('section') as HTMLElement;
    const kbds = Array.from(panel.querySelectorAll('kbd'));
    expect(kbds.map((k) => k.textContent)).toEqual([
      'N',
      '/',
      'Esc',
      'Space',
      '?',
    ]);
    expect(kbds.map((k) => k.nextElementSibling?.textContent)).toEqual([
      'New task in the first column',
      'Search this board',
      'Close the innermost layer',
      'Pick up and drop the focused card, column or item',
      'Show shortcuts',
    ]);
  });

  it('orders the panels Idioma, Tema, Atalhos, Sessão on desktop', async () => {
    renderSettings(true);

    await screen.findByRole('heading', { level: 2, name: 'Sessão' });
    expect(h2s()).toEqual(['Idioma', 'Tema', 'Atalhos de teclado', 'Sessão']);
  });

  it('orders the panels Idioma, Tema, Sessão on a phone', async () => {
    renderSettings(false);

    await screen.findByRole('heading', { level: 2, name: 'Sessão' });
    expect(h2s()).toEqual(['Idioma', 'Tema', 'Sessão']);
  });
});
