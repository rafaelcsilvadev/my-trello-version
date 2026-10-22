import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderApp } from '../../support/render-app';

const TOKEN = 'token-123';

const currentUrl = (router: ReturnType<typeof renderApp>['router']) =>
  router.state.location.pathname + router.state.location.search;

async function heading(): Promise<string | null> {
  return (await screen.findByRole('heading', { level: 1 })).textContent;
}

describe('routes', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  describe('with a token', () => {
    it.each([
      ['/boards', '/boards', 'My boards'],
      ['/b/x', '/b/x', 'Board'],
      ['/b/x/t/y', '/b/x/t/y', 'Card'],
      ['/b/x/labels', '/b/x/labels', 'Labels'],
      ['/settings', '/settings', 'Settings'],
    ])('opens %s at %s with heading "%s"', async (route, url, title) => {
      const { router } = renderApp({ route, token: TOKEN });

      expect(await heading()).toBe(title);
      expect(currentUrl(router)).toBe(url);
    });

    it.each(['/login', '/signup'])('sends %s to /boards', async (route) => {
      const { router } = renderApp({ route, token: TOKEN });

      expect(await heading()).toBe('My boards');
      expect(currentUrl(router)).toBe('/boards');
    });

    it('sends / to /boards', async () => {
      const { router } = renderApp({ route: '/', token: TOKEN });

      expect(await heading()).toBe('My boards');
      expect(currentUrl(router)).toBe('/boards');
    });
  });

  describe('without a token', () => {
    it.each([
      ['/login', 'Sign in'],
      ['/signup', 'Create account'],
    ])('renders %s with heading "%s"', async (route, title) => {
      const { router } = renderApp({ route });

      expect(await heading()).toBe(title);
      expect(currentUrl(router)).toBe(route);
    });

    it.each([
      ['/boards', 'My boards', '/login?redirect=%2Fboards'],
      ['/b/x', 'Board', '/login?redirect=%2Fb%2Fx'],
      ['/b/x/t/y', 'Card', '/login?redirect=%2Fb%2Fx%2Ft%2Fy'],
      ['/b/x/labels', 'Labels', '/login?redirect=%2Fb%2Fx%2Flabels'],
      ['/settings', 'Settings', '/login?redirect=%2Fsettings'],
      ['/b/x?q=1', 'Board', '/login?redirect=%2Fb%2Fx%3Fq%3D1'],
    ])(
      'sends %s to login without rendering "%s"',
      async (route, protectedTitle, url) => {
        const { router } = renderApp({ route });

        expect(await heading()).toBe('Sign in');
        expect(currentUrl(router)).toBe(url);
        expect(screen.queryByText(protectedTitle)).toBeNull();
      },
    );

    it('sends / to login with redirect to /boards', async () => {
      const { router } = renderApp({ route: '/' });

      expect(await heading()).toBe('Sign in');
      expect(currentUrl(router)).toBe('/login?redirect=%2Fboards');
    });
  });

  describe('unknown route', () => {
    it('renders the not-found view', async () => {
      renderApp({ route: '/nope/deep' });

      expect(await heading()).toBe('Page not found');
    });

    it('links to /boards', async () => {
      renderApp({ route: '/nope/deep', token: TOKEN });

      const link = await screen.findByRole('link', { name: 'Go to My boards' });
      expect(link.getAttribute('href')).toBe('/boards');
    });
  });

  describe('session-expired notice', () => {
    const route = '/login?redirect=%2Fboards&reason=session-expired';

    it('shows the English notice', async () => {
      renderApp({ route, prefs: { language: 'en' } });

      expect(
        await screen.findByText('Your session expired. Log in again.'),
      ).not.toBeNull();
    });

    it('shows the Portuguese notice', async () => {
      renderApp({ route, prefs: { language: 'pt-BR' } });

      expect(
        await screen.findByText('Sua sessão expirou. Entre novamente.'),
      ).not.toBeNull();
    });

    it('is absent on /login without the reason', async () => {
      renderApp({ route: '/login' });

      expect(await heading()).toBe('Sign in');
      expect(
        screen.queryByText('Your session expired. Log in again.'),
      ).toBeNull();
    });

    it('is absent for another reason', async () => {
      renderApp({ route: '/login?reason=other' });

      expect(await heading()).toBe('Sign in');
      expect(
        screen.queryByText('Your session expired. Log in again.'),
      ).toBeNull();
    });
  });
});
