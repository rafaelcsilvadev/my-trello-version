import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPreferencesStore,
  type Theme,
} from '@/shared/preferences/preferences-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';
import { resolveTheme, ThemeController } from '@/shared/theme/theme-controller';

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
    listenerCount: () => listeners.size,
    setDark(next: boolean) {
      prefersDark = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

function renderController(theme: Theme) {
  localStorage.setItem('my-trello.theme', theme);
  const store = createPreferencesStore(createSafeStorage());
  render(<ThemeController store={store} />);
  return store;
}

const dataTheme = () => document.documentElement.dataset.theme;

describe('resolveTheme', () => {
  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)('%s with prefersDark=%s → %s', (pref, prefersDark, expected) => {
    expect(resolveTheme(pref, prefersDark)).toBe(expected);
  });
});

describe('ThemeController', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  it('applies light on a dark device', () => {
    mockDevice(true);

    renderController('light');

    expect(dataTheme()).toBe('light');
  });

  it('applies dark on a light device', () => {
    mockDevice(false);

    renderController('dark');

    expect(dataTheme()).toBe('dark');
  });

  it('follows the device when the preference is system', () => {
    mockDevice(true);

    renderController('system');

    expect(dataTheme()).toBe('dark');
  });

  it('switches light to dark on a device change without remount', () => {
    const device = mockDevice(false);
    renderController('system');
    expect(dataTheme()).toBe('light');

    act(() => device.setDark(true));

    expect(dataTheme()).toBe('dark');
  });

  it('ignores device changes after switching from system to light', () => {
    const device = mockDevice(false);
    const store = renderController('system');

    act(() => store.setTheme('light'));
    act(() => device.setDark(true));

    expect(dataTheme()).toBe('light');
    expect(device.listenerCount()).toBe(0);
  });

  it('reads the current device setting when switching back to system', () => {
    const device = mockDevice(false);
    const store = renderController('light');

    act(() => device.setDark(true));
    act(() => store.setTheme('system'));

    expect(dataTheme()).toBe('dark');
  });

  it('stops listening on unmount', () => {
    const device = mockDevice(false);
    renderController('system');

    cleanup();

    expect(device.listenerCount()).toBe(0);
  });
});
