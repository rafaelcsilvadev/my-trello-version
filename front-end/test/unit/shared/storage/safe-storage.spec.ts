import { afterEach, describe, expect, it } from 'vitest';

import { createSafeStorage } from '@/shared/storage/safe-storage';

function throwingBackend(
  method: 'getItem' | 'setItem' | 'removeItem',
): Storage {
  const backend = new Map<string, string>();
  const storage = {
    getItem: (key: string) => backend.get(key) ?? null,
    setItem: (key: string, value: string) => void backend.set(key, value),
    removeItem: (key: string) => void backend.delete(key),
  } as Storage;
  storage[method] = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  return storage;
}

describe('createSafeStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe('with localStorage available', () => {
    it('returns a value after set and keeps it in localStorage', () => {
      const storage = createSafeStorage();

      storage.set('my-trello.theme', 'dark');

      expect(storage.get('my-trello.theme')).toBe('dark');
      expect(localStorage.getItem('my-trello.theme')).toBe('dark');
    });

    it('reads a value stored before it was created', () => {
      localStorage.setItem('my-trello.token', 'jwt');

      expect(createSafeStorage().get('my-trello.token')).toBe('jwt');
    });

    it('removes a value from localStorage', () => {
      const storage = createSafeStorage();
      storage.set('my-trello.token', 'jwt');

      storage.remove('my-trello.token');

      expect(storage.get('my-trello.token')).toBeNull();
      expect(localStorage.getItem('my-trello.token')).toBeNull();
    });

    it('returns null for a missing key', () => {
      expect(createSafeStorage().get('my-trello.missing')).toBeNull();
    });

    it('leaves no probe key behind', () => {
      createSafeStorage();

      expect(localStorage.length).toBe(0);
    });
  });

  describe('with storage unavailable', () => {
    it('works in memory when the backend getter throws', () => {
      const storage = createSafeStorage(() => {
        throw new DOMException('denied', 'SecurityError');
      });

      storage.set('my-trello.token', 'jwt');
      expect(storage.get('my-trello.token')).toBe('jwt');
      storage.remove('my-trello.token');
      expect(storage.get('my-trello.token')).toBeNull();
    });

    it('works in memory when setItem throws', () => {
      const storage = createSafeStorage(() => throwingBackend('setItem'));

      storage.set('my-trello.token', 'jwt');
      expect(storage.get('my-trello.token')).toBe('jwt');
      storage.remove('my-trello.token');
      expect(storage.get('my-trello.token')).toBeNull();
    });

    it('works in memory when removeItem throws', () => {
      const storage = createSafeStorage(() => throwingBackend('removeItem'));

      storage.set('my-trello.token', 'jwt');
      expect(storage.get('my-trello.token')).toBe('jwt');
      storage.remove('my-trello.token');
      expect(storage.get('my-trello.token')).toBeNull();
    });

    it('returns null for a missing key in memory', () => {
      const storage = createSafeStorage(() => throwingBackend('setItem'));

      expect(storage.get('my-trello.missing')).toBeNull();
    });

    it('calls the backend getter only once', () => {
      let calls = 0;
      const storage = createSafeStorage(() => {
        calls += 1;
        throw new DOMException('denied', 'SecurityError');
      });

      storage.set('my-trello.token', 'jwt');
      storage.get('my-trello.token');
      storage.remove('my-trello.token');

      expect(calls).toBe(1);
    });
  });

  describe('when the backend fails after the probe', () => {
    it('keeps a value in memory when setItem starts throwing', () => {
      let full = false;
      const backend = new Map<string, string>();
      const storage = createSafeStorage(
        () =>
          ({
            getItem: (key: string) => backend.get(key) ?? null,
            setItem: (key: string, value: string) => {
              if (full) {
                throw new DOMException('full', 'QuotaExceededError');
              }
              backend.set(key, value);
            },
            removeItem: (key: string) => void backend.delete(key),
          }) as Storage,
      );
      full = true;

      expect(() => storage.set('my-trello.token', 'jwt')).not.toThrow();
      expect(storage.get('my-trello.token')).toBe('jwt');
    });
  });
});
