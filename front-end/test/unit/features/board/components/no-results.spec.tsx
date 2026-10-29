import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NoResults } from '@/features/board/components/no-results';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderNoResults(language: Language = 'pt-BR') {
  const onClear = vi.fn<() => void>();
  const { container } = render(
    <I18nextProvider i18n={createI18n(language)}>
      <NoResults onClear={onClear} />
    </I18nextProvider>,
  );
  return { container, onClear };
}

afterEach(cleanup);

describe('NoResults', () => {
  it.each([
    {
      language: 'pt-BR' as const,
      text: 'Nenhuma tarefa encontrada',
      button: 'Limpar filtros',
    },
    {
      language: 'en' as const,
      text: 'No tasks found',
      button: 'Clear filters',
    },
  ])(
    'shows the $language text and clear button (FBF-28)',
    ({ language, text, button }) => {
      renderNoResults(language);

      expect(screen.getByText(text)).toBeTruthy();
      expect(screen.getByRole('button', { name: button })).toBeTruthy();
    },
  );

  it('calls onClear when Limpar filtros is pressed', () => {
    const { onClear } = renderNoResults();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it('shows the search-x icon hidden from assistive tech', () => {
    const { container } = renderNoResults();

    const icon = container.querySelector('svg.lucide-search-x');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
