import { useSyncExternalStore } from 'react';

import type { SafeStorage } from '@/shared/storage/safe-storage';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'pt-BR';
export type Preferences = { theme: Theme; language: Language };

export type PreferencesStore = {
  get(): Preferences;
  setTheme(theme: Theme): void;
  setLanguage(language: Language): void;
  subscribe(listener: () => void): () => void;
};

const THEME_KEY = 'my-trello.theme';
const LANGUAGE_KEY = 'my-trello.language';

const THEMES: readonly string[] = ['light', 'dark', 'system'];
const LANGUAGES: readonly string[] = ['en', 'pt-BR'];

export function parseTheme(value: string | null): Theme {
  return value !== null && THEMES.includes(value) ? (value as Theme) : 'system';
}

export function parseLanguage(value: string | null): Language {
  return value !== null && LANGUAGES.includes(value)
    ? (value as Language)
    : 'en';
}

export function createPreferencesStore(storage: SafeStorage): PreferencesStore {
  const listeners = new Set<() => void>();
  // One object per change, so useSyncExternalStore sees a stable snapshot.
  let snapshot: Preferences = {
    theme: parseTheme(storage.get(THEME_KEY)),
    language: parseLanguage(storage.get(LANGUAGE_KEY)),
  };

  function update(next: Partial<Preferences>): void {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    get: () => snapshot,
    setTheme: (theme) => {
      storage.set(THEME_KEY, theme);
      update({ theme });
    },
    setLanguage: (language) => {
      storage.set(LANGUAGE_KEY, language);
      update({ language });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export function usePreferences(store: PreferencesStore): Preferences {
  return useSyncExternalStore(store.subscribe, store.get);
}
