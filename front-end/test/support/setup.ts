import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server';

// jsdom has no matchMedia; every rendered app mounts ThemeController.
// A light device by default; theme tests stub their own.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList;
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
