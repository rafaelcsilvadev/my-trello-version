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
    createdAt: '2026-10-24T12:00:00.000Z',
  },
};

const currentUrl = (router: ReturnType<typeof renderApp>['router']) =>
  router.state.location.pathname + router.state.location.search;

function respondSignUp201() {
  server.use(
    http.post(`${apiOrigin}/api/v1/auth/register`, () =>
      HttpResponse.json(authResponse, { status: 201 }),
    ),
  );
}

async function signUp() {
  fireEvent.change(await screen.findByLabelText('Name'), {
    target: { value: 'Ana' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: 'secret-123' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'secret-123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

async function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name });
}

describe('SignupPage', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  it('renders the title and subtitle', async () => {
    renderApp({ route: '/signup' });

    await heading('Create your account');
    expect(
      screen.getByText('Keep all your boards in one place.'),
    ).not.toBeNull();
  });

  it('goes to /boards, shows "Account created" and stores the token after sign up', async () => {
    respondSignUp201();
    const { router, session } = renderApp({ route: '/signup' });

    await signUp();

    await heading('My boards');
    expect(currentUrl(router)).toBe('/boards');
    expect(await screen.findByText('Account created')).not.toBeNull();
    expect(session.getToken()).toBe('new-token');
  });

  it('ignores the redirect param and goes to /boards after sign up', async () => {
    respondSignUp201();
    const { router } = renderApp({ route: '/signup?redirect=%2Fsettings' });

    await signUp();

    await heading('My boards');
    expect(currentUrl(router)).toBe('/boards');
  });

  it('replaces the /signup history entry after sign up', async () => {
    respondSignUp201();
    const { router } = renderApp({ route: '/signup' });

    await signUp();

    await heading('My boards');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('links "Sign in" to /login', async () => {
    renderApp({ route: '/signup' });

    const link = await screen.findByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toBe('/login');
    expect(link.parentElement?.textContent).toBe(
      'Already have an account? Sign in',
    );
  });

  it('renders the Portuguese texts', async () => {
    renderApp({ route: '/signup', prefs: { language: 'pt-BR' } });

    await heading('Crie sua conta');
    expect(
      screen.getByText('Organize seus quadros em um só lugar.'),
    ).not.toBeNull();
    const link = screen.getByRole('link', { name: 'Já tenho conta' });
    expect(link.parentElement?.textContent).toBe(
      'Já tem conta? Já tenho conta',
    );
  });
});
