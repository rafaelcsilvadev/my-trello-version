import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPreferencesStore,
  parseLanguage,
  parseTheme,
  usePreferences,
} from '@/shared/preferences/preferences-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

describe('parseTheme', () => {
  it.each(['light', 'dark', 'system'] as const)('accepts %s', (value) => {
    expect(parseTheme(value)).toBe(value);
  });

  it.each([null, '', 'blue', 'Dark', ' dark'])(
    'falls back to system for %j',
    (value) => {
      expect(parseTheme(value)).toBe('system');
    },
  );
});

describe('parseLanguage', () => {
  it.each(['en', 'pt-BR'] as const)('accepts %s', (value) => {
    expect(parseLanguage(value)).toBe(value);
  });

  it.each([null, '', 'PT-BR', 'pt', 'pt-br', 'en-US'])(
    'falls back to en for %j',
    (value) => {
      expect(parseLanguage(value)).toBe('en');
    },
  );
});

describe('createPreferencesStore', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('uses theme system and language en when storage is empty', () => {
    const preferences = createPreferencesStore(createSafeStorage());

    expect(preferences.get()).toEqual({ theme: 'system', language: 'en' });
  });

  it('ignores navigator.language pt-BR when no language is stored', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'pt-BR' });

    const preferences = createPreferencesStore(createSafeStorage());

    expect(preferences.get().language).toBe('en');
  });

  it('reads back stored dark and pt-BR', () => {
    localStorage.setItem('my-trello.theme', 'dark');
    localStorage.setItem('my-trello.language', 'pt-BR');

    const preferences = createPreferencesStore(createSafeStorage());

    expect(preferences.get()).toEqual({ theme: 'dark', language: 'pt-BR' });
  });

  it.each([
    ['blue', 'PT-BR'],
    ['', 'pt'],
  ])(
    'ignores stored theme %j and language %j and uses the defaults',
    (theme, language) => {
      localStorage.setItem('my-trello.theme', theme);
      localStorage.setItem('my-trello.language', language);

      const preferences = createPreferencesStore(createSafeStorage());

      expect(preferences.get()).toEqual({ theme: 'system', language: 'en' });
    },
  );

  it('persists the theme on setTheme and notifies subscribers', () => {
    const preferences = createPreferencesStore(createSafeStorage());
    const listener = vi.fn<() => void>();
    preferences.subscribe(listener);

    preferences.setTheme('light');

    expect(preferences.get().theme).toBe('light');
    expect(localStorage.getItem('my-trello.theme')).toBe('light');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('persists the language on setLanguage and notifies subscribers', () => {
    const preferences = createPreferencesStore(createSafeStorage());
    const listener = vi.fn<() => void>();
    preferences.subscribe(listener);

    preferences.setLanguage('pt-BR');

    expect(preferences.get().language).toBe('pt-BR');
    expect(localStorage.getItem('my-trello.language')).toBe('pt-BR');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops notifying a subscriber after it unsubscribes', () => {
    const preferences = createPreferencesStore(createSafeStorage());
    const listener = vi.fn<() => void>();
    const unsubscribe = preferences.subscribe(listener);

    unsubscribe();
    preferences.setTheme('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('returns the same snapshot until a preference changes', () => {
    const preferences = createPreferencesStore(createSafeStorage());
    const before = preferences.get();

    expect(preferences.get()).toBe(before);

    preferences.setTheme('dark');
    expect(preferences.get()).not.toBe(before);
  });
});

describe('usePreferences', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('re-renders with the new theme and language', () => {
    const preferences = createPreferencesStore(createSafeStorage());
    const { result } = renderHook(() => usePreferences(preferences));

    expect(result.current).toEqual({ theme: 'system', language: 'en' });

    act(() => preferences.setTheme('dark'));
    expect(result.current).toEqual({ theme: 'dark', language: 'en' });

    act(() => preferences.setLanguage('pt-BR'));
    expect(result.current).toEqual({ theme: 'dark', language: 'pt-BR' });
  });
});
