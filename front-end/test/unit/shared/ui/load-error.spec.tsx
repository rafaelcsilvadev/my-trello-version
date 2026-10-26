import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';
import { LoadError } from '@/shared/ui/load-error';

function renderLoadError(language: Language) {
  const onRetry = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <LoadError onRetry={onRetry} />
    </I18nextProvider>,
  );
  return { onRetry };
}

describe('LoadError', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Não foi possível carregar',
      detail: 'Verifique sua conexão e tente de novo.',
      retry: 'Tentar novamente',
    },
    {
      language: 'en' as const,
      title: 'Couldn’t load',
      detail: 'Check your connection and try again.',
      retry: 'Try again',
    },
  ])(
    'shows the title, detail and retry button in an alert ($language)',
    ({ language, title, detail, retry }) => {
      renderLoadError(language);

      const alert = screen.getByRole('alert');
      expect(
        screen.getByRole('heading', { level: 2, name: title }),
      ).toBeTruthy();
      expect(alert.textContent).toContain(detail);
      expect(screen.getByRole('button', { name: retry })).toBeTruthy();
    },
  );

  it('calls onRetry once when the retry button is pressed', () => {
    const { onRetry } = renderLoadError('pt-BR');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
