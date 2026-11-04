import { useTranslation } from 'react-i18next';

import type { Theme } from '@/shared/preferences/preferences-store';

import { usePreferencesViewModel } from '../view-models/use-preferences-view-model';
import { PreferencePanel } from './preference-panel';

export function ThemePanel() {
  const { t } = useTranslation();
  const { theme, setTheme } = usePreferencesViewModel();

  return (
    <PreferencePanel
      title={t('settings.theme.title')}
      subtitle={t('settings.theme.subtitle')}
      options={[
        { id: 'light', label: t('settings.theme.options.light') },
        { id: 'dark', label: t('settings.theme.options.dark') },
        { id: 'system', label: t('settings.theme.options.system') },
      ]}
      selected={theme}
      onChange={(id) => setTheme(id as Theme)}
    />
  );
}
