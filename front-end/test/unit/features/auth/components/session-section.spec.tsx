import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authKeys } from '@/features/auth/api/keys';
import { SessionSection } from '@/features/auth/components/session-section';
import type { UserResponse } from '@/features/auth/model/types';
import { apiOrigin } from '@/shared/config';

import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const meUrl = `${apiOrigin}/api/v1/me`;

const user: UserResponse = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Demo',
  email: 'demo@example.com',
  createdAt: '2026-10-23T12:00:00.000Z',
};

function renderSection() {
  return renderApp({
    route: '/settings',
    token: 'token-123',
    prefs: { language: 'pt-BR' },
    routes: [{ path: '/settings', element: <SessionSection /> }],
  });
}

describe('SessionSection', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    localStorage.clear();
  });

  it('shows the signed-in name and e-mail under the "Sessão" heading', async () => {
    server.use(http.get(meUrl, () => HttpResponse.json(user)));
    renderSection();

    expect(
      await screen.findByText('Conectado como Demo · demo@example.com'),
    ).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Sessão' })).not.toBeNull();
  });

  it('keeps "Sair" enabled and shows no account text while /me is pending', async () => {
    server.use(
      http.get(meUrl, async () => {
        await delay('infinite');
        return HttpResponse.json(user);
      }),
    );
    renderSection();

    const signOut = await screen.findByRole('button', { name: 'Sair' });
    expect(signOut.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/Conectado como/)).toBeNull();
  });

  it('keeps "Sair" enabled and shows no account text after /me fails with 500', async () => {
    // 5xx is retried with backoff; fake timers skip the waits.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let calls = 0;
    server.use(
      http.get(meUrl, () => {
        calls += 1;
        return HttpResponse.json(
          { type: '/problems/500', title: 'Error', status: 500, detail: '' },
          {
            status: 500,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        );
      }),
    );
    const { queryClient } = renderSection();

    await screen.findByRole('button', { name: 'Sair' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(queryClient.getQueryState(authKeys.me)?.status).toBe('error');
    expect(calls).toBe(4);
    const signOut = await screen.findByRole('button', { name: 'Sair' });
    expect(signOut.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/Conectado como/)).toBeNull();
  });

  it('signs out on "Sair": token removed and location /login', async () => {
    server.use(http.get(meUrl, () => HttpResponse.json(user)));
    const { router, session } = renderSection();
    await screen.findByText('Conectado como Demo · demo@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(session.getToken()).toBeNull();
  });
});
