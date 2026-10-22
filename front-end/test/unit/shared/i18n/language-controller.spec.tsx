import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { createI18n } from '@/shared/i18n/i18n';
import { LanguageController } from '@/shared/i18n/language-controller';
import {
  createPreferencesStore,
  type Language,
} from '@/shared/preferences/preferences-store';
import { createSafeStorage } from '@/shared/storage/safe-storage';

function Heading() {
  const { t } = useTranslation();
  return <h1>{t('notFound.title')}</h1>;
}

function renderWithLanguage(language: Language) {
  localStorage.setItem('my-trello.language', language);
  const store = createPreferencesStore(createSafeStorage());
  const i18n = createI18n(store.get().language);
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageController store={store} i18n={i18n} />
      <Heading />
    </I18nextProvider>,
  );
  return store;
}

const htmlLang = () => document.documentElement.lang;

describe('createI18n', () => {
  it('starts in the given language', () => {
    const i18n = createI18n('pt-BR');

    expect(i18n.language).toBe('pt-BR');
    expect(i18n.t('notFound.title')).toBe('Página não encontrada');
  });

  it('types keys against the en locale', () => {
    const i18n = createI18n('en');

    // @ts-expect-error -- unknown keys must fail typecheck
    expect(i18n.t('missing.key')).toBe('missing.key');
  });
});

describe('LanguageController', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  it('sets html lang and renders English for en', () => {
    renderWithLanguage('en');

    expect(htmlLang()).toBe('en');
    expect(screen.getByRole('heading').textContent).toBe('Page not found');
  });

  it('switches to Portuguese without a reload', () => {
    const store = renderWithLanguage('en');

    act(() => store.setLanguage('pt-BR'));

    expect(htmlLang()).toBe('pt-BR');
    expect(screen.getByRole('heading').textContent).toBe(
      'Página não encontrada',
    );
  });

  it('switches back to English', () => {
    const store = renderWithLanguage('pt-BR');

    act(() => store.setLanguage('en'));

    expect(htmlLang()).toBe('en');
    expect(screen.getByRole('heading').textContent).toBe('Page not found');
  });
});
