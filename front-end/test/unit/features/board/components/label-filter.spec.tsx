import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LabelFilter } from '@/features/board/components/label-filter';
import type { Label } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { labelFixture } from '../../../../support/fixtures/board';

const bug = labelFixture('l-bug', { name: 'Bug', color: 'red' });
const urgent = labelFixture('l-urgent', { name: 'Urgente', color: 'orange' });
const docs = labelFixture('l-docs', { name: 'Docs', color: 'blue' });

type Options = {
  labels?: Label[];
  selectedIds?: string[];
  language?: Language;
};

// Holds the selection like the view model does, so the menu re-renders checked items.
function renderFilter({
  labels = [bug, urgent, docs],
  selectedIds = [],
  language = 'pt-BR',
}: Options = {}) {
  const onChange = vi.fn<(ids: string[]) => void>();
  function Harness() {
    const [ids, setIds] = useState(selectedIds);
    return (
      <LabelFilter
        labels={labels}
        selectedIds={ids}
        selectedCount={ids.length}
        onChange={(next) => {
          onChange(next);
          setIds(next);
        }}
      />
    );
  }
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <Harness />
    </I18nextProvider>,
  );
  return { onChange };
}

afterEach(cleanup);

describe('LabelFilter', () => {
  it('shows "Etiquetas" in the secondary variant with no selection (FBF-09, FBF-12)', () => {
    renderFilter();

    const button = screen.getByRole('button', { name: 'Etiquetas' });
    expect(button.textContent).toBe('Etiquetas');
    expect(button.className).toContain('bg-surface-card');
    expect(button.className).not.toContain('bg-(--purple-50)');
  });

  it('shows "Etiquetas · 2" in the soft variant with two selected (FBF-11)', () => {
    renderFilter({ selectedIds: [bug.id, docs.id] });

    const button = screen.getByRole('button', { name: 'Etiquetas · 2' });
    expect(button.textContent).toBe('Etiquetas · 2');
    expect(button.className).toContain('bg-(--purple-50)');
    expect(button.className).toContain('text-purple-700');
  });

  it('lists every label as a menuitemcheckbox with its name and checked state (FBF-09)', () => {
    renderFilter({ selectedIds: [urgent.id] });

    fireEvent.click(screen.getByRole('button', { name: 'Etiquetas · 1' }));

    // The trigger names the menu.
    expect(screen.getByRole('menu', { name: 'Etiquetas · 1' })).toBeTruthy();
    const items = screen.getAllByRole('menuitemcheckbox');
    expect(items.map((item) => item.textContent)).toEqual([
      'Bug',
      'Urgente',
      'Docs',
    ]);
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    // Each item shows its label chip with the color dot.
    expect(items[0].querySelector('.bg-label-red')).not.toBeNull();
  });

  it('calls onChange with the new id list and keeps the menu open on each click (FBF-10, FBF-12)', () => {
    const { onChange } = renderFilter();

    fireEvent.click(screen.getByRole('button', { name: 'Etiquetas' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Bug' }));

    expect(onChange).toHaveBeenLastCalledWith([bug.id]);
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(
      screen
        .getByRole('menuitemcheckbox', { name: 'Bug' })
        .getAttribute('aria-checked'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Docs' }));
    expect(onChange).toHaveBeenLastCalledWith([bug.id, docs.id]);

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Bug' }));
    expect(onChange).toHaveBeenLastCalledWith([docs.id]);
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('closes the menu on Esc and keeps the checked labels (FBF-13)', () => {
    const { onChange } = renderFilter({ selectedIds: [bug.id] });

    fireEvent.click(screen.getByRole('button', { name: 'Etiquetas · 1' }));
    fireEvent.keyDown(screen.getByRole('menu'), {
      key: 'Escape',
    });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Etiquetas · 1' })).toBeTruthy();
  });

  it('shows "Nenhuma etiqueta ainda" when the board has no labels (FBF-14)', () => {
    renderFilter({ labels: [] });

    fireEvent.click(screen.getByRole('button', { name: 'Etiquetas' }));

    expect(screen.getByRole('menu').textContent).toBe('Nenhuma etiqueta ainda');
    expect(screen.queryByRole('menuitemcheckbox')).toBeNull();
  });

  it('uses the English texts', () => {
    renderFilter({
      labels: [],
      selectedIds: [bug.id, urgent.id],
      language: 'en',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Labels · 2' }));

    expect(screen.getByRole('menu', { name: 'Labels · 2' }).textContent).toBe(
      'No labels yet',
    );
  });
});
