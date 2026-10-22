export type SafeStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

const PROBE_KEY = 'my-trello.__probe__';

function probe(getBackend: () => Storage): Storage | null {
  try {
    const backend = getBackend();
    backend.setItem(PROBE_KEY, PROBE_KEY);
    backend.removeItem(PROBE_KEY);
    return backend;
  } catch {
    return null;
  }
}

export function createSafeStorage(
  getBackend: () => Storage = () => window.localStorage,
): SafeStorage {
  const memory = new Map<string, string>();
  let backend = probe(getBackend);

  // After the probe the backend can still throw (e.g. quota exceeded);
  // from then on the session keeps working in memory.
  function attempt<T>(onBackend: (b: Storage) => T, onMemory: () => T): T {
    if (backend) {
      try {
        return onBackend(backend);
      } catch {
        backend = null;
      }
    }
    return onMemory();
  }

  return {
    get: (key) =>
      attempt(
        (b) => b.getItem(key),
        () => memory.get(key) ?? null,
      ),
    set: (key, value) =>
      attempt(
        (b) => b.setItem(key, value),
        () => void memory.set(key, value),
      ),
    remove: (key) =>
      attempt(
        (b) => b.removeItem(key),
        () => void memory.delete(key),
      ),
  };
}
