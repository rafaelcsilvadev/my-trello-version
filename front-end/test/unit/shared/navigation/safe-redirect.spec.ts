import { describe, expect, it } from 'vitest';

import { safeRedirect } from '@/shared/navigation/safe-redirect';

describe('safeRedirect', () => {
  it('keeps a same-app path with its query', () => {
    expect(safeRedirect('/b/x?q=1')).toBe('/b/x?q=1');
  });

  it.each([
    ['a missing value', null],
    ['an empty value', ''],
    ['a relative path', 'boards'],
    ['a protocol-relative URL', '//evil.com'],
    ['a backslash host', '/\\evil.com'],
    ['an absolute URL', 'https://evil.com'],
    ['a javascript: URL', 'javascript:alert(1)'],
  ])('falls back to /boards for %s', (_case, value) => {
    expect(safeRedirect(value)).toBe('/boards');
  });
});
