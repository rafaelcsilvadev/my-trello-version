import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColumnRenameField } from '@/features/board/components/column-rename-field';
import type { ItemFieldError } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

type Submit = (raw: string) => ItemFieldError | null;

type RenderOptions = {
  initial?: string;
  initialError?: ItemFieldError;
  onSubmit?: Submit;
  language?: Language;
};

function renderField({
  initial = 'To do',
  initialError,
  onSubmit = () => null,
  language = 'pt-BR',
}: RenderOptions = {}) {
  const submit = vi.fn<Submit>(onSubmit);
  const onCancel = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <ColumnRenameField
        initial={initial}
        initialError={initialError}
        onSubmit={submit}
        onCancel={onCancel}
      />
      <button type="button">outside</button>
    </I18nextProvider>,
  );
  return { onSubmit: submit, onCancel };
}

function field() {
  return screen.getByRole<HTMLInputElement>('textbox', {
    name: 'Nome da coluna',
  });
}

describe('ColumnRenameField', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens focused with the current name', () => {
    renderField();

    expect(field().value).toBe('To do');
    expect(document.activeElement).toBe(field());
  });

  it('calls onSubmit with the raw text when Enter is pressed', async () => {
    const { onSubmit } = renderField();

    await userEvent.clear(field());
    await userEvent.type(field(), '  Doing  {Enter}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('  Doing  ');
  });

  it('calls onSubmit when the field loses focus', async () => {
    const { onSubmit } = renderField();

    await userEvent.type(field(), '!');
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('To do!');
  });

  it('does not submit again on blur after a successful Enter', async () => {
    const { onSubmit } = renderField();

    await userEvent.type(field(), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('calls onCancel on Esc without submitting, also on the blur after it', async () => {
    const { onSubmit, onCancel } = renderField();

    await userEvent.type(field(), 'x{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    { error: 'columnNameRequired', message: 'Dê um nome à coluna' },
    { error: 'columnNameTooLong', message: 'Use até 100 caracteres' },
  ] as const)(
    'stays open with "$message" for $error',
    async ({ error, message }) => {
      renderField({ onSubmit: () => error });

      await userEvent.clear(field());
      await userEvent.type(field(), '   {Enter}');

      expect(screen.getByText(message)).toBeTruthy();
      expect(field().value).toBe('   ');
      expect(field().getAttribute('aria-invalid')).toBe('true');
    },
  );

  it('submits again on blur after an error', async () => {
    const { onSubmit } = renderField({ onSubmit: () => 'columnNameRequired' });

    await userEvent.clear(field());
    await userEvent.type(field(), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'outside' }));

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('shows the initial error when reopened after a 400', () => {
    renderField({ initial: '  ', initialError: 'columnNameRequired' });

    expect(screen.getByText('Dê um nome à coluna')).toBeTruthy();
    expect(field().value).toBe('  ');
    expect(field().getAttribute('aria-invalid')).toBe('true');
  });

  it('writes the texts in English', async () => {
    renderField({ language: 'en', onSubmit: () => 'columnNameTooLong' });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Column name' }),
      '{Enter}',
    );

    expect(screen.getByText('Use up to 100 characters')).toBeTruthy();
  });
});
