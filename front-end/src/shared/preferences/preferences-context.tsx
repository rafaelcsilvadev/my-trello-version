import { createContext, type ReactNode, useContext } from 'react';

import type { PreferencesStore } from '@/shared/preferences/preferences-store';

const PreferencesContext = createContext<PreferencesStore | null>(null);

export function PreferencesProvider({
  store,
  children,
}: {
  store: PreferencesStore;
  children: ReactNode;
}) {
  return <PreferencesContext value={store}>{children}</PreferencesContext>;
}

export function usePreferencesStore(): PreferencesStore {
  const store = useContext(PreferencesContext);
  if (!store) {
    throw new Error(
      'usePreferencesStore must be used inside <PreferencesProvider>',
    );
  }
  return store;
}
