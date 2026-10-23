import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { SessionProvider, useSession } from '@/shared/session/session-context';
import { createSessionStore } from '@/shared/session/session-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

describe('useSession', () => {
  it('returns the store passed to SessionProvider', () => {
    const store = createSessionStore(createSafeStorage());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SessionProvider store={store}>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current).toBe(store);
  });

  it('throws when used outside SessionProvider', () => {
    expect(() => renderHook(() => useSession())).toThrow(
      'useSession must be used inside <SessionProvider>',
    );
  });
});
