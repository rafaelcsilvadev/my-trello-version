import {
  type Language,
  type Theme,
  usePreferences,
} from '@/shared/preferences/preferences-store';
import { usePreferencesStore } from '@/shared/preferences/preferences-context';

export function usePreferencesViewModel(): {
  language: Language;
  theme: Theme;
  setLanguage(language: Language): void;
  setTheme(theme: Theme): void;
} {
  const store = usePreferencesStore();
  const { language, theme } = usePreferences(store);

  return {
    language,
    theme,
    setLanguage: store.setLanguage,
    setTheme: store.setTheme,
  };
}
