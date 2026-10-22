import type { i18n } from 'i18next';
import { useEffect } from 'react';

import {
  type PreferencesStore,
  usePreferences,
} from '@/shared/preferences/preferences-store';

export function LanguageController({
  store,
  i18n,
}: {
  store: PreferencesStore;
  i18n: i18n;
}) {
  const { language } = usePreferences(store);

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [i18n, language]);

  return null;
}
