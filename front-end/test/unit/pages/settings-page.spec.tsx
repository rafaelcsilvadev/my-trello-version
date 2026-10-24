import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import type { UserResponse } from '@/features/auth/model/types';
import { apiOrigin } from '@/shared/config';

import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

const meUrl = `${apiOrigin}/api/v1/me`;

const user: UserResponse = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Demo',
  email: 'demo@example.com',
  createdAt: '2026-10-23T12:00:00.000Z',
};

function renderSettings() {
  server.use(http.get(meUrl, () => HttpResponse.json(user)));
  return renderApp({
    route: '/settings',
    token: 'token-123',
    prefs: { language: 'pt-BR' },
  });
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
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
