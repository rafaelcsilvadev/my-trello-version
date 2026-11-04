import { vi } from 'vitest';

// jsdom has no matchMedia; this fake answers every query with the viewport
// state, so a test can flip between desktop and phone.
export function mockViewport(isDesktop: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    get matches() {
      return isDesktop;
    },
    media: '',
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
    setDesktop(next: boolean) {
      isDesktop = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}
