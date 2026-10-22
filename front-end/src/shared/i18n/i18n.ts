import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { Language } from '@/shared/preferences/preferences-store';

import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';

export const resources = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
} as const;

export function createI18n(language: Language): i18n {
  const instance = i18next.createInstance();
  // Resources are bundled, so init runs synchronously and the first render is translated.
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return instance;
}
