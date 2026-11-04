import { renderHook, screen } from '@testing-library/react';
import { type ReactNode, useEffect } from 'react';
import { describe, expect, it } from 'vitest';

import {
  PreferencesProvider,
  usePreferencesStore,
} from '@/shared/preferences/preferences-context';
import { createPreferencesStore } from '@/shared/preferences/preferences-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

import { renderApp } from '../../../support/render-app';

describe('usePreferencesStore', () => {
  it('returns the store passed to PreferencesProvider', () => {
    const store = createPreferencesStore(createSafeStorage());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreferencesProvider store={store}>{children}</PreferencesProvider>
    );

    const { result } = renderHook(() => usePreferencesStore(), { wrapper });

    expect(result.current).toBe(store);
  });

  it('throws when used outside PreferencesProvider', () => {
    expect(() => renderHook(() => usePreferencesStore())).toThrow(
      'usePreferencesStore must be used inside <PreferencesProvider>',
    );
  });

  it('gives components inside the app the same store as the services', () => {
    const seen: unknown[] = [];
    function Probe() {
      const store = usePreferencesStore();
      useEffect(() => {
        seen.push(store);
      }, [store]);
      return <p>probe</p>;
    }

    const services = renderApp({
      route: '/probe',
      routes: [{ path: '/probe', element: <Probe /> }],
    });

    expect(screen.getByText('probe')).toBeTruthy();
    expect(seen).toEqual([services.preferences]);
    expect(seen[0]).toBe(services.preferences);
  });
});
