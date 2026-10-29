import { cleanup, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { DragOffNotice } from '@/features/board/components/drag-off-notice';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderNotice(language: Language) {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <DragOffNotice />
    </I18nextProvider>,
  );
}

describe('DragOffNotice', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      text: 'Arrastar fica desativado enquanto há filtros',
    },
    {
      language: 'en' as const,
      text: 'Dragging is off while filters are applied',
    },
  ])('shows the $language notice text (FBF-30)', ({ language, text }) => {
    const { container } = renderNotice(language);

    expect(container.textContent).toBe(text);
  });

  it('shows the info icon hidden from assistive tech', () => {
    const { container } = renderNotice('pt-BR');

    const icon = container.querySelector('svg.lucide-info');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
