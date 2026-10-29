import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardSearch } from '@/features/board/components/board-search';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

type Options = {
  value?: string;
  isShortcutEnabled?: boolean;
  language?: Language;
};

function renderSearch({
  value = '',
  isShortcutEnabled = true,
  language = 'pt-BR',
}: Options = {}) {
  const onChange = vi.fn<(value: string) => void>();
  const onClear = vi.fn<() => void>();
  const onParentKeyDown = vi.fn<(key: string) => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      {/* Stands in for the board Esc handler that must not see a handled Esc. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div onKeyDown={(event) => onParentKeyDown(event.key)}>
        <BoardSearch
          value={value}
          isShortcutEnabled={isShortcutEnabled}
          onChange={onChange}
          onClear={onClear}
        />
        <input aria-label="Outro campo" />
      </div>
    </I18nextProvider>,
  );
  return { onChange, onClear, onParentKeyDown };
}

function searchField(name = 'Buscar no quadro…') {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

describe('BoardSearch', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    { language: 'pt-BR' as const, name: 'Buscar no quadro…' },
    { language: 'en' as const, name: 'Search this board…' },
  ])(
    'names the field and its placeholder ($language)',
    ({ language, name }) => {
      renderSearch({ language });

      expect(searchField(name).placeholder).toBe(name);
    },
  );

  it('shows the current value', () => {
    renderSearch({ value: 'lançamento' });

    expect(searchField().value).toBe('lançamento');
  });

  it('calls onChange with the typed text', () => {
    const { onChange } = renderSearch();

    fireEvent.change(searchField(), { target: { value: 'acao' } });

    expect(onChange).toHaveBeenCalledExactlyOnceWith('acao');
  });

  it('hides the clear button while the field is empty', () => {
    renderSearch();

    expect(screen.queryByRole('button', { name: 'Limpar busca' })).toBeNull();
  });

  it.each([
    { language: 'pt-BR' as const, name: 'Limpar busca' },
    { language: 'en' as const, name: 'Clear search' },
  ])(
    'clears through the clear button while the field has text ($language)',
    ({ language, name }) => {
      const { onClear } = renderSearch({ value: 'app', language });

      fireEvent.click(screen.getByRole('button', { name }));

      expect(onClear).toHaveBeenCalledOnce();
    },
  );

  it('clears on Esc with text, keeps the focus and stops the key there', () => {
    const { onClear, onParentKeyDown } = renderSearch({ value: 'app' });
    const field = searchField();
    field.focus();

    fireEvent.keyDown(field, { key: 'Escape' });

    expect(onClear).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(field);
    expect(onParentKeyDown).not.toHaveBeenCalled();
  });

  it('does nothing on Esc while the field is empty', () => {
    const { onClear } = renderSearch();

    fireEvent.keyDown(searchField(), { key: 'Escape' });

    expect(onClear).not.toHaveBeenCalled();
  });

  it('moves the focus to the field on /', () => {
    renderSearch();

    fireEvent.keyDown(document.body, { key: '/' });

    expect(document.activeElement).toBe(searchField());
  });

  it('ignores / while the shortcut is off', () => {
    renderSearch({ isShortcutEnabled: false });

    fireEvent.keyDown(document.body, { key: '/' });

    expect(document.activeElement).toBe(document.body);
  });

  it('ignores / typed in another field', () => {
    renderSearch();
    const other = screen.getByRole('textbox', { name: 'Outro campo' });
    other.focus();

    fireEvent.keyDown(other, { key: '/' });

    expect(document.activeElement).toBe(other);
  });

  it('ignores / with Ctrl held', () => {
    renderSearch();

    fireEvent.keyDown(document.body, { key: '/', ctrlKey: true });

    expect(document.activeElement).toBe(document.body);
  });

  it('shows the / hint only from md', () => {
    renderSearch();

    expect(screen.getByText('/').className).toContain('hidden md:inline');
  });

  it('spans the toolbar below md and is 65 wide from md', () => {
    renderSearch();

    expect(searchField().parentElement?.className).toContain('w-full md:w-65');
  });
});
