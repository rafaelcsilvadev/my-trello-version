import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardToolbar } from '@/features/board/components/board-toolbar';
import {
  type BoardFilters,
  type DueFilter,
  NO_FILTERS,
} from '@/features/board/model/filters';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { labelFixture } from '../../../../support/fixtures/board';

const bug = labelFixture('l-bug', { name: 'Bug', color: 'red' });

type Options = {
  filters?: BoardFilters;
  isFiltering?: boolean;
  matchCount?: number;
  showArchived?: boolean;
  language?: Language;
};

function renderToolbar({
  filters = NO_FILTERS,
  isFiltering = false,
  matchCount = 0,
  showArchived = false,
  language = 'pt-BR',
}: Options = {}) {
  const callbacks = {
    onQueryChange: vi.fn<(query: string) => void>(),
    onQueryClear: vi.fn<() => void>(),
    onLabelIdsChange: vi.fn<(ids: string[]) => void>(),
    onDueChange: vi.fn<(due: DueFilter) => void>(),
    onClearAll: vi.fn<() => void>(),
    onShowArchivedChange: vi.fn<(showArchived: boolean) => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <BoardToolbar
        filters={filters}
        labels={[bug]}
        selectedLabelCount={filters.labelIds.length}
        isFiltering={isFiltering}
        matchCount={matchCount}
        isSearchShortcutEnabled
        showArchived={showArchived}
        {...callbacks}
      />
    </I18nextProvider>,
  );
  return callbacks;
}

function dueSelect() {
  return screen.getByRole<HTMLSelectElement>('combobox', { name: 'Prazo' });
}

describe('BoardToolbar', () => {
  afterEach(() => {
    cleanup();
  });

  it('holds the controls inside role="search" in the spec order (FBF-40)', () => {
    renderToolbar({ isFiltering: true, matchCount: 2 });

    // jsdom's role table lacks <search>; browsers map it to role="search".
    const search = document.querySelector('search');
    if (search === null) throw new Error('no <search> landmark');
    const ordered = [
      within(search).getByRole('textbox', { name: 'Buscar no quadro…' }),
      within(search).getByRole('button', { name: 'Etiquetas' }),
      within(search).getByRole('combobox', { name: 'Prazo' }),
      within(search).getByRole('switch', { name: 'Mostrar arquivadas' }),
      within(search).getByRole('status'),
      within(search).getByRole('button', { name: 'Limpar filtros' }),
    ];

    for (let i = 1; i < ordered.length; i++) {
      expect(
        ordered[i - 1].compareDocumentPosition(ordered[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it.each([
    {
      language: 'pt-BR' as const,
      name: 'Prazo',
      options: [
        'Qualquer prazo',
        'Atrasadas',
        'Vencem hoje',
        'Sem prazo',
        'Concluídas',
      ],
    },
    {
      language: 'en' as const,
      name: 'Due date',
      options: [
        'Any due date',
        'Overdue',
        'Due today',
        'No due date',
        'Completed',
      ],
    },
  ])(
    'lists the five due options ($language) (FBF-16)',
    ({ language, name, options }) => {
      renderToolbar({ language });

      const select = screen.getByRole('combobox', { name });

      expect(
        within(select)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(options);
    },
  );

  it('selects "Qualquer prazo" with no filters (FBF-16)', () => {
    renderToolbar();

    expect(dueSelect().value).toBe('any');
    expect(
      within(dueSelect()).getByRole<HTMLOptionElement>('option', {
        name: 'Qualquer prazo',
      }).selected,
    ).toBe(true);
  });

  it('selects the current due filter', () => {
    renderToolbar({ filters: { ...NO_FILTERS, due: 'today' } });

    expect(
      within(dueSelect()).getByRole<HTMLOptionElement>('option', {
        name: 'Vencem hoje',
      }).selected,
    ).toBe(true);
  });

  it.each<{ name: string; due: DueFilter }>([
    { name: 'Atrasadas', due: 'overdue' },
    { name: 'Vencem hoje', due: 'today' },
    { name: 'Sem prazo', due: 'none' },
    { name: 'Concluídas', due: 'done' },
  ])('calls onDueChange($due) when "$name" is chosen', ({ due }) => {
    const { onDueChange } = renderToolbar();

    fireEvent.change(dueSelect(), { target: { value: due } });

    expect(onDueChange).toHaveBeenCalledExactlyOnceWith(due);
  });

  it('calls onDueChange("any") when "Qualquer prazo" is chosen back (FBF-21)', () => {
    const { onDueChange } = renderToolbar({
      filters: { ...NO_FILTERS, due: 'overdue' },
      isFiltering: true,
    });

    fireEvent.change(dueSelect(), { target: { value: 'any' } });

    expect(onDueChange).toHaveBeenCalledExactlyOnceWith('any');
  });

  it('hides the count and Limpar filtros while not filtering (FBF-24)', () => {
    renderToolbar({ isFiltering: false, matchCount: 3 });

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('shows the count and Limpar filtros while filtering (FBF-24)', () => {
    const { onClearAll } = renderToolbar({ isFiltering: true, matchCount: 3 });

    expect(screen.getByRole('status').textContent).toBe('3 tarefas');

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it('passes the search value and its callbacks to the field', () => {
    const { onQueryChange, onQueryClear } = renderToolbar({
      filters: { ...NO_FILTERS, query: 'bug' },
      isFiltering: true,
    });

    const field = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Buscar no quadro…',
    });
    expect(field.value).toBe('bug');

    fireEvent.change(field, { target: { value: 'bugs' } });
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith('bugs');

    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(onQueryClear).toHaveBeenCalledOnce();
  });

  it('shows the selected label count on Etiquetas', () => {
    renderToolbar({
      filters: { ...NO_FILTERS, labelIds: [bug.id] },
      isFiltering: true,
    });

    expect(screen.getByRole('button', { name: 'Etiquetas · 1' })).toBeTruthy();
  });

  it.each([
    { language: 'pt-BR' as const, label: 'Mostrar arquivadas' },
    { language: 'en' as const, label: 'Show archived' },
  ])('labels the switch ($language)', ({ language, label }) => {
    renderToolbar({ language });

    expect(screen.getByRole('switch', { name: label })).toBeTruthy();
  });

  it.each([false, true])(
    'reflects showArchived=%s in the switch',
    (showArchived) => {
      renderToolbar({ showArchived });

      const toggle = screen.getByRole<HTMLInputElement>('switch', {
        name: 'Mostrar arquivadas',
      });

      expect(toggle.checked).toBe(showArchived);
    },
  );

  it.each([
    { showArchived: false, next: true },
    { showArchived: true, next: false },
  ])(
    'calls onShowArchivedChange($next) when toggled',
    ({ showArchived, next }) => {
      const { onShowArchivedChange } = renderToolbar({ showArchived });

      fireEvent.click(
        screen.getByRole('switch', { name: 'Mostrar arquivadas' }),
      );

      expect(onShowArchivedChange).toHaveBeenCalledExactlyOnceWith(next);
    },
  );
});
