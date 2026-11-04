import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UserResponse } from '@/features/auth/model/types';
import { apiOrigin } from '@/shared/config';

import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

// jsdom has no matchMedia; this fake lets a test flip the device setting.
function mockDevice(prefersDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    get matches() {
      return prefersDark;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: 'change', listener: () => void) =>
      void listeners.add(listener),
    removeEventListener: (_: 'change', listener: () => void) =>
      void listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );

  return {
    setDark(next: boolean) {
      prefersDark = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

const meUrl = `${apiOrigin}/api/v1/me`;

const user: UserResponse = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Demo',
  email: 'demo@example.com',
  createdAt: '2026-10-23T12:00:00.000Z',
};

function renderSettings(
  prefs: Parameters<typeof renderApp>[0]['prefs'] = { language: 'pt-BR' },
) {
  server.use(http.get(meUrl, () => HttpResponse.json(user)));
  return renderApp({
    route: '/settings',
    token: 'token-123',
    prefs,
  });
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the "Configurações" heading and the session section', async () => {
    renderSettings();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Sessão' }),
    ).not.toBeNull();
    expect(
      await screen.findByText('Conectado como Demo · demo@example.com'),
    ).not.toBeNull();
  });

  // React Aria builds the tabs after the first render; wait for all five.
  const tabsReady = () =>
    waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(5));

  const selected = (name: string) =>
    screen.getByRole('tab', { name }).getAttribute('aria-selected');

  it('shows the Idioma panel with the current language selected', async () => {
    renderSettings();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Idioma' }),
    ).not.toBeNull();
    await tabsReady();
    expect(screen.getByRole('tablist', { name: 'Idioma' })).not.toBeNull();
    expect(selected('Português (Brasil)')).toBe('true');
    expect(selected('English')).toBe('false');
  });

  it('switches the language at once and stores it', async () => {
    renderSettings();
    await screen.findByRole('heading', { level: 2, name: 'Idioma' });
    await tabsReady();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'English' }));
    fireEvent.click(screen.getByRole('tab', { name: 'English' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Language' }),
    ).not.toBeNull();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('my-trello.language')).toBe('en');
    expect(selected('English')).toBe('true');
  });

  it('shows the Tema panel with options, subtitle and stored choice', async () => {
    renderSettings({ language: 'pt-BR', theme: 'light' });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Tema' }),
    ).not.toBeNull();
    await tabsReady();
    expect(screen.getByRole('tablist', { name: 'Tema' })).not.toBeNull();
    expect(screen.getByText('Sistema segue o aparelho.')).not.toBeNull();
    expect(selected('Claro')).toBe('true');
    expect(selected('Escuro')).toBe('false');
    expect(selected('Sistema')).toBe('false');
  });

  it('shows the theme subtitle in English', async () => {
    renderSettings({ language: 'en' });

    expect(
      await screen.findByText('System follows your device.'),
    ).not.toBeNull();
  });

  it('applies Escuro at once and stores it', async () => {
    renderSettings({ language: 'pt-BR', theme: 'light' });
    await screen.findByRole('heading', { level: 2, name: 'Tema' });
    await tabsReady();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Escuro' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('my-trello.theme')).toBe('dark');
    expect(selected('Escuro')).toBe('true');
  });

  it('follows the device while the theme is Sistema', async () => {
    const device = mockDevice(true);
    renderSettings({ language: 'pt-BR', theme: 'system' });
    await screen.findByRole('heading', { level: 2, name: 'Tema' });
    await tabsReady();

    expect(document.documentElement.dataset.theme).toBe('dark');
    act(() => device.setDark(false));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('selects the next option with ArrowRight and applies it', async () => {
    renderSettings({ language: 'pt-BR', theme: 'light' });
    await screen.findByRole('heading', { level: 2, name: 'Tema' });
    await tabsReady();

    const claro = screen.getByRole('tab', { name: 'Claro' });
    claro.focus();
    fireEvent.keyDown(claro, { key: 'ArrowRight' });

    expect(selected('Escuro')).toBe('true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('still applies a choice when localStorage throws on write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    renderSettings({ language: 'pt-BR', theme: 'light' });
    await screen.findByRole('heading', { level: 2, name: 'Tema' });
    await tabsReady();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Escuro' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(selected('Escuro')).toBe('true');
  });

  it('falls back to English and System for unknown stored values', async () => {
    localStorage.setItem('my-trello.language', 'xx');
    localStorage.setItem('my-trello.theme', 'blue');
    renderSettings({});

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Language' }),
    ).not.toBeNull();
    await tabsReady();
    expect(selected('English')).toBe('true');
    expect(selected('System')).toBe('true');
  });

  it('signs out on "Sair", then guards /boards behind /login', async () => {
    const { router } = renderSettings();
    await screen.findByText('Conectado como Demo · demo@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));

    await router.navigate('/boards');
    await waitFor(() =>
      expect(
        router.state.location.pathname + router.state.location.search,
      ).toBe('/login?redirect=%2Fboards'),
    );
  });
});
