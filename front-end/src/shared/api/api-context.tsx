import { createContext, type ReactNode, useContext } from 'react';

import type { ApiClient } from '@/shared/api/client';

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  return <ApiContext value={client}>{children}</ApiContext>;
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error('useApi must be used inside <ApiProvider>');
  }
  return client;
}
