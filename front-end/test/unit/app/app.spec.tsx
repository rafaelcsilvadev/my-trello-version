import { useQueries } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { call } from '@/shared/api/api-error';
import { useApi } from '@/shared/api/api-context';
import { apiOrigin } from '@/shared/config';
import { useSession } from '@/shared/session/session-context';
import type { SessionStore } from '@/shared/session/session-store';
import { ActionMenu } from '@/shared/ui/menu';

import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

const TOKEN = 'token-123';

const unauthorized = {
  type: '/problems/unauthorized',
  title: 'Unauthorized',
  status: 401,
  detail: 'Token expired',
};

function respond401(method: 'get' | 'post', path: string) {
  server.use(
    http[method](`${apiOrigin}${path}`, () =>
      HttpResponse.json(unauthorized, {
        status: 401,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ),
  );
}

function BoardsProbe({ queries = 1 }: { queries?: number }) {
  const api = useApi();
  useQueries({
    queries: Array.from({ length: queries }, (_, index) => ({
      queryKey: ['probe', index],
      queryFn: () => call(api.GET('/api/v1/boards')),
    })),
  });
  return <h1>Probe</h1>;
}

const currentUrl = (router: ReturnType<typeof renderApp>['router']) =>
  router.state.location.pathname + router.state.location.search;

describe('App composition root', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('data-theme');
  });

  it('sends a 401 from a /boards query to the login page with the session cleared', async () => {
    respond401('get', '/api/v1/boards');
    const { router, queryClient } = renderApp({
      route: '/boards',
      token: TOKEN,
      routes: [{ path: '/boards', element: <BoardsProbe /> }],
    });

    expect(
      (await screen.findByText('Your session expired. Log in again.'))
        .textContent,
    ).toBe('Your session expired. Log in again.');
    expect(currentUrl(router)).toBe(
      '/login?redirect=%2Fboards&reason=session-expired',
    );
    expect(localStorage.getItem('my-trello.token')).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('navigates once when two parallel queries both answer 401', async () => {
    respond401('get', '/api/v1/boards');
    const { router } = renderApp({
      route: '/boards',
      token: TOKEN,
      routes: [{ path: '/boards', element: <BoardsProbe queries={2} /> }],
    });
    const visited = new Set([router.state.location.key]);
    router.subscribe((state) => visited.add(state.location.key));

    await screen.findByText('Your session expired. Log in again.');
    // Let any second navigation land before counting.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(visited.size).toBe(2);
    expect(currentUrl(router)).toBe(
      '/login?redirect=%2Fboards&reason=session-expired',
    );
  });

  it('keeps the URL and the token when a login request answers 401', async () => {
    respond401('post', '/api/v1/auth/login');
    const { router, session, api } = renderApp({ route: '/login' });
    await screen.findByRole('heading', {
      level: 1,
      name: 'Good to see you again',
    });
    // A token stored after the guard ran makes the request carry Authorization.
    session.setToken(TOKEN);

    const { response } = await api.POST('/api/v1/auth/login', {
      body: { email: 'ana@example.com', password: 'secret-123' },
    });

    expect(response.status).toBe(401);
    expect(currentUrl(router)).toBe('/login');
    expect(localStorage.getItem('my-trello.token')).toBe(TOKEN);
  });

  it('gives components the services session store', async () => {
    let seen: SessionStore | undefined;
    function SessionProbe() {
      const store = useSession();
      useEffect(() => {
        seen = store;
      }, [store]);
      return <h1>Probe</h1>;
    }
    const { session } = renderApp({
      route: '/probe',
      routes: [{ path: '/probe', element: <SessionProbe /> }],
    });

    await screen.findByRole('heading', { level: 1, name: 'Probe' });

    expect(seen).toBe(session);
  });

  it('routes React Aria links through the app router', async () => {
    const { router } = renderApp({
      route: '/probe',
      routes: [
        {
          path: '/probe',
          element: (
            <ActionMenu
              label="Menu"
              items={[{ id: 'go', label: 'Go', icon: Tag, href: '/login' }]}
            />
          ),
        },
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Go' }));

    await waitFor(() => {
      expect(currentUrl(router)).toBe('/login');
    });
  });

  it('applies the stored dark theme and pt-BR language on the first render', async () => {
    renderApp({
      route: '/login',
      prefs: { theme: 'dark', language: 'pt-BR' },
    });

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
      'Bom te ver de novo',
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(document.documentElement.lang).toBe('pt-BR');
    });
  });
});
