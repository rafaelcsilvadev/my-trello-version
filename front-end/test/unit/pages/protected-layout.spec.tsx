import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderApp } from '../../support/render-app';

const TOKEN = 'token-123';

async function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name });
}

describe('ProtectedLayout', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  it('links the logo to /boards and the Settings icon to /settings', async () => {
    renderApp({ route: '/boards', token: TOKEN, prefs: { language: 'pt-BR' } });

    await heading('Meus quadros');
    const banner = within(screen.getByRole('banner'));
    expect(
      banner
        .getByRole('link', { name: 'My Trello Version' })
        .getAttribute('href'),
    ).toBe('/boards');
    expect(
      banner.getByRole('link', { name: 'Configurações' }).getAttribute('href'),
    ).toBe('/settings');
  });

  it('wraps every protected page in the top bar', async () => {
    renderApp({ route: '/b/x', token: TOKEN });

    await heading('Board');
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
  });

  it.each(['/settings', '/settings/'])(
    'hides the Settings link on %s',
    async (route) => {
      renderApp({ route, token: TOKEN });

      await heading('Settings');
      expect(
        screen.getByRole('link', { name: 'My Trello Version' }),
      ).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    },
  );

  it.each(['/login', '/signup'])('shows no top bar on %s', async (route) => {
    renderApp({ route });

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('banner')).toBeNull();
  });
});
