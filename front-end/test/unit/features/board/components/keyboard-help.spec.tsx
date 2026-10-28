import { cleanup, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { KeyboardHelp } from '@/features/board/components/keyboard-help';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderHelp(language: Language) {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <KeyboardHelp />
    </I18nextProvider>,
  );
}

describe('KeyboardHelp', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      text: 'Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela',
    },
    {
      language: 'en' as const,
      text: 'Keyboard: Space picks up the focused card, column or item · arrows move · Space drops · Esc cancels',
    },
  ])('shows the $language help text', ({ language, text }) => {
    const { container } = renderHelp(language);

    expect(container.textContent).toBe(text);
  });

  it('shows only from the md breakpoint up', () => {
    const { container } = renderHelp('pt-BR');

    const line = container.firstElementChild;
    expect(line?.classList.contains('hidden')).toBe(true);
    expect(line?.classList.contains('md:flex')).toBe(true);
  });

  it('shows the keyboard icon hidden from assistive tech', () => {
    const { container } = renderHelp('pt-BR');

    const icon = container.querySelector('svg.lucide-keyboard');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
