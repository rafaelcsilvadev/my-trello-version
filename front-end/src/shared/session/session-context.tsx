import { createContext, type ReactNode, useContext } from 'react';

import type { SessionStore } from '@/shared/session/session-store';

const SessionContext = createContext<SessionStore | null>(null);

export function SessionProvider({
  store,
  children,
}: {
  store: SessionStore;
  children: ReactNode;
}) {
  return <SessionContext value={store}>{children}</SessionContext>;
}

export function useSession(): SessionStore {
  const store = useContext(SessionContext);
  if (!store) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return store;
}
