import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { usePreferencesViewModel } from '@/features/settings/view-models/use-preferences-view-model';
import { PreferencesProvider } from '@/shared/preferences/preferences-context';
import { createPreferencesStore } from '@/shared/preferences/preferences-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

function setup() {
  localStorage.clear();
  const store = createPreferencesStore(createSafeStorage());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PreferencesProvider store={store}>{children}</PreferencesProvider>
  );
  return { store, ...renderHook(() => usePreferencesViewModel(), { wrapper }) };
}

describe('usePreferencesViewModel', () => {
  it('starts with the store values', () => {
    const { result } = setup();

    expect(result.current.language).toBe('en');
    expect(result.current.theme).toBe('system');
  });

  it('returns the store value after each change', () => {
    const { result, store } = setup();

    act(() => result.current.setLanguage('pt-BR'));
    expect(result.current.language).toBe('pt-BR');
    expect(store.get().language).toBe('pt-BR');

    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(store.get().theme).toBe('dark');

    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
  });
});
