import { cleanup, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import type { AuthResponse } from '@/features/auth/model/types';
import { apiOrigin } from '@/shared/config';

import { server } from '../../support/msw/server';
import { renderApp } from '../../support/render-app';

const authResponse: AuthResponse = {
  accessToken: 'new-token',
  user: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: 'Ana',
    email: 'ana@example.com',
    createdAt: '2026-10-23T12:00:00.000Z',
  },
};

const currentUrl = (router: ReturnType<typeof renderApp>['router']) =>
  router.state.location.pathname + router.state.location.search;

function respondLogIn200() {
  server.use(
    http.post(`${apiOrigin}/api/v1/auth/login`, () =>
      HttpResponse.json(authResponse),
    ),
  );
}

async function logIn() {
  fireEvent.change(await screen.findByLabelText('Email'), {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'secret-123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

async function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name });
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  it('renders the title and subtitle', async () => {
    renderApp({ route: '/login' });

    await heading('Good to see you again');
    expect(screen.getByText('Sign in to continue.')).not.toBeNull();
  });

  it('goes to the redirect target after log in', async () => {
    respondLogIn200();
    const { router } = renderApp({ route: '/login?redirect=%2Fsettings' });

    await logIn();

    await heading('Settings');
    expect(currentUrl(router)).toBe('/settings');
  });

  it('goes to /boards after log in without a redirect', async () => {
    respondLogIn200();
    const { router } = renderApp({ route: '/login' });

    await logIn();

    await heading('My boards');
    expect(currentUrl(router)).toBe('/boards');
  });

  it.each(['%2F%2Fevil.com', 'https%3A%2F%2Fevil.com'])(
    'goes to /boards after log in when redirect is %s',
    async (redirect) => {
      respondLogIn200();
      const { router } = renderApp({ route: `/login?redirect=${redirect}` });

      await logIn();

      await heading('My boards');
      expect(currentUrl(router)).toBe('/boards');
    },
  );

  it('replaces the /login history entry after log in', async () => {
    respondLogIn200();
    const { router } = renderApp({ route: '/login?redirect=%2Fsettings' });

    await logIn();

    await heading('Settings');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('shows the session-expired status box for reason=session-expired', async () => {
    renderApp({ route: '/login?reason=session-expired' });

    // The toast region is an `<output>`, so it also has the status role.
    const notice = await screen.findByText(
      'Your session expired. Log in again.',
    );
    expect(notice.closest('[role="status"]')).not.toBeNull();
  });

  it('shows no status box without the reason', async () => {
    renderApp({ route: '/login' });

    await heading('Good to see you again');
    expect(
      screen.queryByText('Your session expired. Log in again.'),
    ).toBeNull();
  });

  it('links "Create account" to /signup', async () => {
    renderApp({ route: '/login' });

    const link = await screen.findByRole('link', { name: 'Create account' });
    expect(link.getAttribute('href')).toBe('/signup');
    expect(link.parentElement?.textContent).toBe(
      'Don’t have an account? Create account',
    );
  });

  it('renders the Portuguese texts', async () => {
    renderApp({ route: '/login', prefs: { language: 'pt-BR' } });

    await heading('Bom te ver de novo');
    expect(screen.getByText('Entre para continuar.')).not.toBeNull();
    const link = screen.getByRole('link', { name: 'Criar conta' });
    expect(link.parentElement?.textContent).toBe(
      'Ainda não tem conta? Criar conta',
    );
  });
});
