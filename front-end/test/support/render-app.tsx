import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';

import { App } from '@/app/app';
import { createAppServices } from '@/app/app-services';
import {
  createPreferencesStore,
  type Preferences,
} from '@/shared/preferences/preferences-store';
import { createSessionStore } from '@/shared/session/session-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

type RenderAppOptions = {
  route: string;
  token?: string;
  prefs?: Partial<Preferences>;
  // Matched before the app's own routes, e.g. a test page on a real path.
  routes?: RouteObject[];
};

export function renderApp({
  route,
  token,
  prefs,
  routes = [],
}: RenderAppOptions) {
  // Seed storage first: the services read it once, as on a real page load.
  const storage = createSafeStorage();
  const preferences = createPreferencesStore(storage);
  if (token !== undefined) {
    createSessionStore(storage).setToken(token);
  }
  if (prefs?.theme) {
    preferences.setTheme(prefs.theme);
  }
  if (prefs?.language) {
    preferences.setLanguage(prefs.language);
  }

  const services = createAppServices({
    storage,
    createRouter: (appRoutes) =>
      createMemoryRouter([...routes, ...appRoutes], {
        initialEntries: [route],
      }),
  });

  render(<App services={services} />);

  return services;
}
