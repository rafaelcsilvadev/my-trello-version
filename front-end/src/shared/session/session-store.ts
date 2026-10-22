import { useSyncExternalStore } from 'react';

import type { SafeStorage } from '@/shared/storage/safe-storage';

export type SessionStore = {
  getToken(): string | null;
  setToken(token: string): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
};

const TOKEN_KEY = 'my-trello.token';

export function createSessionStore(storage: SafeStorage): SessionStore {
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getToken: () => storage.get(TOKEN_KEY),
    setToken: (token) => {
      storage.set(TOKEN_KEY, token);
      notify();
    },
    clear: () => {
      storage.remove(TOKEN_KEY);
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

export function useHasSession(store: SessionStore): boolean {
  return useSyncExternalStore(store.subscribe, () => store.getToken() !== null);
}
