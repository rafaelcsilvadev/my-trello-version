import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InlineCreateField } from '@/features/board/components/inline-create-field';
import type { ItemFieldError } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

type Submit = (raw: string) => Promise<ItemFieldError | null>;

type RenderOptions = {
  onSubmit?: Submit;
  isPending?: boolean;
  language?: Language;
};

function renderField({
  onSubmit = vi.fn<Submit>().mockResolvedValue(null),
  isPending = false,
  language = 'pt-BR',
}: RenderOptions = {}) {
  const onClose = vi.fn<() => void>();
  const submit = vi.fn<Submit>(onSubmit);
  const props = {
    label: 'Adicionar coluna',
    placeholder: 'Nome da coluna',
    onSubmit: submit,
    onClose,
  };
  const ui = (pending: boolean) => (
    <I18nextProvider i18n={createI18n(language)}>
      <InlineCreateField {...props} isPending={pending} />
    </I18nextProvider>
  );
  const { rerender } = render(ui(isPending));
  return {
    onSubmit: submit,
    onClose,
    setPending: (pending: boolean) => rerender(ui(pending)),
  };
}

function field() {
  return screen.getByRole<HTMLInputElement>('textbox', {
    name: 'Nome da coluna',
  });
}

function submitButton() {
  return screen.getByRole<HTMLButtonElement>('button', {
    name: 'Adicionar coluna',
  });
}

describe('InlineCreateField', () => {
  afterEach(() => {
    cleanup();
  });

  it('focuses the field when it opens', () => {
    renderField();

    expect(document.activeElement).toBe(field());
  });

  it('calls onSubmit with the raw text when Enter is pressed', async () => {
    const { onSubmit } = renderField();

    await userEvent.type(field(), '  To do  {Enter}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('  To do  ');
  });

  it('calls onSubmit when the submit button is clicked', async () => {
    const { onSubmit } = renderField();

    await userEvent.type(field(), 'To do');
    await userEvent.click(submitButton());

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('To do');
  });

  it.each([
    { error: 'columnNameRequired', message: 'Dê um nome à coluna' },
    { error: 'columnNameTooLong', message: 'Use até 100 caracteres' },
    { error: 'cardTitleRequired', message: 'Dê um título à tarefa' },
    { error: 'cardTitleTooLong', message: 'Use até 100 caracteres' },
  ] as const)(
    'shows "$message" for $error and keeps the text',
    async ({ error, message }) => {
      renderField({ onSubmit: () => Promise.resolve(error) });

      await userEvent.type(field(), '   {Enter}');

      expect(await screen.findByText(message)).toBeTruthy();
      expect(field().value).toBe('   ');
      expect(field().getAttribute('aria-invalid')).toBe('true');
    },
  );

  it('clears the text and the error and keeps focus on success', async () => {
    const results: (ItemFieldError | null)[] = ['columnNameRequired', null];
    renderField({ onSubmit: () => Promise.resolve(results.shift() ?? null) });

    await userEvent.type(field(), '{Enter}');
    await screen.findByText('Dê um nome à coluna');
    await userEvent.type(field(), 'To do');
    await userEvent.click(submitButton());

    await waitFor(() => expect(field().value).toBe(''));
    expect(screen.queryByText('Dê um nome à coluna')).toBeNull();
    expect(document.activeElement).toBe(field());
  });

  it('keeps the text and enables submit again when onSubmit rejects', async () => {
    const { onSubmit } = renderField({
      onSubmit: () => Promise.reject(new Error('500')),
    });

    await userEvent.type(field(), 'To do{Enter}');

    await waitFor(() => expect(submitButton().disabled).toBe(false));
    expect(field().value).toBe('To do');
    await userEvent.type(field(), '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('disables submit and ignores Enter while pending, keeping the text', async () => {
    const { onSubmit, setPending } = renderField();

    await userEvent.type(field(), 'To do');
    setPending(true);
    await userEvent.type(field(), '{Enter}');

    expect(submitButton().disabled).toBe(true);
    expect(field().value).toBe('To do');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ignores a second Enter while the first submit is in flight', async () => {
    let resolve: (value: ItemFieldError | null) => void = () => undefined;
    const { onSubmit } = renderField({
      onSubmit: () =>
        new Promise((r) => {
          resolve = r;
        }),
    });

    await userEvent.type(field(), 'To do{Enter}{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve(null);
    await waitFor(() => expect(field().value).toBe(''));
  });

  it('calls onClose on Esc without submitting', async () => {
    const { onSubmit, onClose } = renderField();

    await userEvent.type(field(), 'To do{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const { onClose } = renderField();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('writes the texts in English', async () => {
    renderField({
      language: 'en',
      onSubmit: () => Promise.resolve('cardTitleRequired'),
    });

    await userEvent.type(field(), '{Enter}');

    expect(await screen.findByText('Give the task a title')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });
});
