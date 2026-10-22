import { useEffect } from 'react';

import {
  type PreferencesStore,
  type Theme,
  usePreferences,
} from '@/shared/preferences/preferences-store';

export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(pref: Theme, prefersDark: boolean): ResolvedTheme {
  if (pref !== 'system') {
    return pref;
  }
  return prefersDark ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function ThemeController({ store }: { store: PreferencesStore }) {
  const { theme } = usePreferences(store);

  useEffect(() => {
    if (theme !== 'system') {
      applyTheme(theme);
      return;
    }

    // Only the system preference depends on the device, so only it listens.
    const media = matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      applyTheme(resolveTheme('system', event.matches));

    applyTheme(resolveTheme('system', media.matches));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return null;
}
