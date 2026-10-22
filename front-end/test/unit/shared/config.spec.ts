import { describe, expect, it } from 'vitest';

import { resolveApiOrigin } from '@/shared/config';

describe('resolveApiOrigin', () => {
  it('defaults to http://localhost:3000 when VITE_API_URL is unset', () => {
    expect(resolveApiOrigin({})).toBe('http://localhost:3000');
  });

  it.each(['', '  '])(
    'defaults to http://localhost:3000 when VITE_API_URL is blank (%j)',
    (value) => {
      expect(resolveApiOrigin({ VITE_API_URL: value })).toBe(
        'http://localhost:3000',
      );
    },
  );

  it('removes a trailing slash', () => {
    expect(resolveApiOrigin({ VITE_API_URL: 'http://api.test/' })).toBe(
      'http://api.test',
    );
  });

  it('removes every trailing slash', () => {
    expect(resolveApiOrigin({ VITE_API_URL: 'http://api.test//' })).toBe(
      'http://api.test',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(resolveApiOrigin({ VITE_API_URL: ' http://api.test ' })).toBe(
      'http://api.test',
    );
  });

  it('removes a trailing slash left after trimming', () => {
    expect(resolveApiOrigin({ VITE_API_URL: ' http://api.test/ ' })).toBe(
      'http://api.test',
    );
  });
});
