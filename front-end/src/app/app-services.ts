import type { QueryClient } from '@tanstack/react-query';
import type { i18n } from 'i18next';
import type { DataRouter, RouteObject } from 'react-router';

import { type ApiClient, createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { apiOrigin } from '@/shared/config';
import { createI18n } from '@/shared/i18n/i18n';
import {
  createPreferencesStore,
  type PreferencesStore,
} from '@/shared/preferences/preferences-store';
import { createSessionExpiryHandler } from '@/shared/session/session-expiry';
import {
  createSessionStore,
  type SessionStore,
} from '@/shared/session/session-store';
import type { SafeStorage } from '@/shared/storage/safe-storage';

import { createRoutes } from './routes';

export type AppServices = {
  session: SessionStore;
  preferences: PreferencesStore;
  queryClient: QueryClient;
  i18n: i18n;
  router: DataRouter;
  api: ApiClient;
};

type AppServicesOptions = {
  storage: SafeStorage;
  // Browser router in the app, memory router in tests.
  createRouter(routes: RouteObject[]): DataRouter;
};

export function createAppServices({
  storage,
  createRouter,
}: AppServicesOptions): AppServices {
  const session = createSessionStore(storage);
  const preferences = createPreferencesStore(storage);
  const queryClient = createQueryClient();
  const i18n = createI18n(preferences.get().language);
  const router = createRouter(createRoutes({ session }));

  const onSessionExpired = createSessionExpiryHandler({
    session,
    clearCache: () => queryClient.clear(),
    navigate: (to) => void router.navigate(to),
    currentLocation: () => router.state.location,
  });
  const api = createApiClient({
    baseUrl: apiOrigin,
    getToken: session.getToken,
    onSessionExpired,
  });

  return { session, preferences, queryClient, i18n, router, api };
}
