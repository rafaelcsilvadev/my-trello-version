import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { createRoutes } from '@/app/routes';
import { createI18n } from '@/shared/i18n/i18n';
import { LanguageController } from '@/shared/i18n/language-controller';
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
};

export function renderApp({ route, token, prefs }: RenderAppOptions) {
  const storage = createSafeStorage();
  const session = createSessionStore(storage);
  const preferences = createPreferencesStore(storage);
  if (token !== undefined) {
    session.setToken(token);
  }
  if (prefs?.theme) {
    preferences.setTheme(prefs.theme);
  }
  if (prefs?.language) {
    preferences.setLanguage(prefs.language);
  }

  const i18n = createI18n(preferences.get().language);
  const router = createMemoryRouter(createRoutes({ session }), {
    initialEntries: [route],
  });

  render(
    <I18nextProvider i18n={i18n}>
      <LanguageController store={preferences} i18n={i18n} />
      <RouterProvider router={router} />
    </I18nextProvider>,
  );

  return { router, session };
}
