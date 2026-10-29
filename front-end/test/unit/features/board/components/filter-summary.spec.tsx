import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FilterSummary } from '@/features/board/components/filter-summary';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderSummary(matchCount: number, language: Language = 'pt-BR') {
  const onClear = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <FilterSummary matchCount={matchCount} onClear={onClear} />
    </I18nextProvider>,
  );
  return { onClear };
}

afterEach(cleanup);

describe('FilterSummary', () => {
  it.each([
    [0, '0 tarefas'],
    [1, '1 tarefa'],
    [3, '3 tarefas'],
  ])('shows %i matches as "%s" in a status element (FBF-24)', (count, text) => {
    renderSummary(count);

    expect(screen.getByRole('status').textContent).toBe(text);
  });

  it('shows the count in English', () => {
    renderSummary(1, 'en');
    expect(screen.getByRole('status').textContent).toBe('1 task');

    cleanup();
    renderSummary(3, 'en');
    expect(screen.getByRole('status').textContent).toBe('3 tasks');
  });

  it('calls onClear from "Limpar filtros" (FBF-25)', () => {
    const { onClear } = renderSummary(2);

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it('renders "Limpar filtros" as a small ghost button', () => {
    renderSummary(2);

    const button = screen.getByRole('button', { name: 'Limpar filtros' });
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('h-(--control-sm)');
  });
});
