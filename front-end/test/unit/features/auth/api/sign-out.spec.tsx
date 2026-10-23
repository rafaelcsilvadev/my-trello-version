import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { useCurrentUser } from '@/features/auth/api/queries';
import { useSignOut } from '@/features/auth/api/sign-out';
import { apiOrigin } from '@/shared/config';

import { server } from '../../../../support/msw/server';
import { renderApp } from '../../../../support/render-app';

const user = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Ana',
  email: 'ana@example.com',
  createdAt: '2026-10-23T12:00:00.000Z',
};

function countMeRequests() {
  const count = { current: 0 };
  server.use(
    http.get(`${apiOrigin}/api/v1/me`, () => {
      count.current += 1;
      return HttpResponse.json(user);
    }),
  );
  return count;
}

function SettingsProbe() {
  const { data } = useCurrentUser();
  const signOut = useSignOut();
  return (
    <>
      <p>{data?.email}</p>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </>
  );
}

function renderSettings() {
  return renderApp({
    route: '/settings?tab=session',
    token: 'token-123',
    routes: [{ path: '/settings', element: <SettingsProbe /> }],
  });
}

describe('useSignOut', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('clears the token and the cache and lands on /login with no query string', async () => {
    countMeRequests();
    const { router, session, queryClient } = renderSettings();
    await screen.findByText('ana@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('');
    expect(session.getToken()).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('sends no further GET /api/v1/me after signing out', async () => {
    const count = countMeRequests();
    const { router } = renderSettings();
    await screen.findByText('ana@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    // Let a stray refetch reach the handler before counting.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(count.current).toBe(1);
  });
});
