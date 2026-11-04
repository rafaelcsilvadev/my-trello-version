import { useTranslation } from 'react-i18next';

import type { Language } from '@/shared/preferences/preferences-store';

import { usePreferencesViewModel } from '../view-models/use-preferences-view-model';
import { PreferencePanel } from './preference-panel';

export function LanguagePanel() {
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferencesViewModel();

  return (
    <PreferencePanel
      title={t('settings.language.title')}
      options={[
        { id: 'pt-BR', label: t('settings.language.options.ptBR') },
        { id: 'en', label: t('settings.language.options.en') },
      ]}
      selected={language}
      onChange={(id) => setLanguage(id as Language)}
    />
  );
}
