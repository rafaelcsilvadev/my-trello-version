import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColumnPager } from '@/features/board/components/column-pager';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

const titles = ['A fazer', 'Fazendo', 'Feito'];

function renderPager(
  { pagerTitles = titles, index = 0 } = {},
  language: Language = 'pt-BR',
) {
  const onSelect = vi.fn<(index: number) => void>();
  const view = render(
    <I18nextProvider i18n={createI18n(language)}>
      <ColumnPager titles={pagerTitles} index={index} onSelect={onSelect} />
    </I18nextProvider>,
  );
  return { ...view, onSelect };
}

describe('ColumnPager', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    { language: 'pt-BR' as const, label: 'Ir para Fazendo' },
    { language: 'en' as const, label: 'Go to Fazendo' },
  ])(
    'renders one labelled dot per title ($language)',
    ({ language, label }) => {
      renderPager({}, language);

      expect(screen.getAllByRole('button')).toHaveLength(3);
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    },
  );

  it('marks only the current dot', () => {
    renderPager({ index: 1 });

    const current = screen
      .getAllByRole('button')
      .map((dot) => dot.getAttribute('aria-current'));

    expect(current).toEqual([null, 'true', null]);
  });

  it.each([
    { language: 'pt-BR' as const, index: 1, text: 'Fazendo · 2 de 3' },
    { language: 'en' as const, index: 2, text: 'Feito · 3 of 3' },
  ])(
    'announces the column in view ($language, index $index)',
    ({ language, index, text }) => {
      renderPager({ index }, language);

      const status = screen.getByText(text);

      expect(status.getAttribute('aria-live')).toBe('polite');
    },
  );

  it('marks no dot and announces nothing for an index out of range', () => {
    renderPager({ index: 3 });

    const current = screen
      .getAllByRole('button')
      .filter((dot) => dot.hasAttribute('aria-current'));

    expect(current).toHaveLength(0);
    expect(screen.queryByText(/ de /)).toBeNull();
  });

  it('calls onSelect with the dot index when a dot is clicked', () => {
    const { onSelect } = renderPager();

    fireEvent.click(screen.getByRole('button', { name: 'Ir para Feito' }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('renders nothing without columns', () => {
    const { container } = renderPager({ pagerTitles: [] });

    expect(container.innerHTML).toBe('');
  });
});
