import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardFormDialog } from '@/features/boards/components/board-form-dialog';
import type { BoardFormValues } from '@/features/boards/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

type DialogProps = ComponentProps<typeof BoardFormDialog>;

function renderDialog(
  props: Partial<DialogProps> = {},
  language: Language = 'pt-BR',
) {
  const onSubmit = vi.fn<(values: BoardFormValues) => void>();
  const onClose = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <BoardFormDialog
        mode="create"
        isOpen
        isPending={false}
        onSubmit={onSubmit}
        onClose={onClose}
        {...props}
      />
    </I18nextProvider>,
  );
  return { onSubmit, onClose };
}

function nameInput() {
  return screen.getByRole('textbox', { name: 'Nome' });
}

function descriptionInput() {
  return screen.getByRole('textbox', { name: 'Descrição (opcional)' });
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

function submit(name = 'Criar') {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('BoardFormDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Novo quadro',
      name: 'Nome',
      namePlaceholder: 'Ex.: Viagem de férias',
      description: 'Descrição (opcional)',
      descriptionPlaceholder: 'Para que serve este quadro?',
      cancel: 'Cancelar',
      create: 'Criar',
    },
    {
      language: 'en' as const,
      title: 'New board',
      name: 'Name',
      namePlaceholder: 'e.g. Vacation trip',
      description: 'Description (optional)',
      descriptionPlaceholder: 'What is this board for?',
      cancel: 'Cancel',
      create: 'Create',
    },
  ])(
    'shows the empty create form ($language)',
    ({ language, title, ...texts }) => {
      renderDialog({}, language);

      expect(screen.getByRole('dialog', { name: title })).toBeTruthy();
      const name = screen.getByRole('textbox', { name: texts.name });
      expect((name as HTMLInputElement).value).toBe('');
      expect(name.getAttribute('placeholder')).toBe(texts.namePlaceholder);
      const description = screen.getByRole('textbox', {
        name: texts.description,
      });
      expect((description as HTMLTextAreaElement).value).toBe('');
      expect(description.getAttribute('placeholder')).toBe(
        texts.descriptionPlaceholder,
      );
      expect(screen.getByText('0 / 1000')).toBeTruthy();
      expect(screen.getByRole('button', { name: texts.cancel })).toBeTruthy();
      expect(screen.getByRole('button', { name: texts.create })).toBeTruthy();
    },
  );

  it('opens the edit form filled with the board values and their counter', () => {
    renderDialog({
      mode: 'edit',
      initialValues: { name: 'Viagem', description: 'Roteiro' },
    });

    expect(screen.getByRole('dialog', { name: 'Editar quadro' })).toBeTruthy();
    expect((nameInput() as HTMLInputElement).value).toBe('Viagem');
    expect((descriptionInput() as HTMLTextAreaElement).value).toBe('Roteiro');
    expect(screen.getByText('7 / 1000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull();
  });

  it.each([
    { label: 'empty', value: '' },
    { label: 'spaces only', value: '   ' },
  ])(
    'shows "Dê um nome ao quadro" and does not submit when the name is $label',
    ({ value }) => {
      const { onSubmit } = renderDialog();
      type(nameInput(), value);

      submit();

      expect(screen.getByText('Dê um nome ao quadro')).toBeTruthy();
      expect(nameInput().getAttribute('aria-invalid')).toBe('true');
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it('shows "Use até 100 caracteres" and does not submit when the name has 101 characters', () => {
    const { onSubmit } = renderDialog();
    type(nameInput(), 'a'.repeat(101));

    submit();

    expect(screen.getByText('Use até 100 caracteres')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps 1001 description characters, counts them and blocks submit with "Use até 1000 caracteres"', () => {
    const { onSubmit } = renderDialog();
    type(nameInput(), 'Viagem');
    type(descriptionInput(), 'a'.repeat(1001));

    expect(screen.getByText('1001 / 1000')).toBeTruthy();
    submit();

    expect(screen.getByText('Use até 1000 caracteres')).toBeTruthy();
    expect(descriptionInput().getAttribute('aria-invalid')).toBe('true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('focuses the name when both fields are invalid', () => {
    renderDialog();
    type(descriptionInput(), 'a'.repeat(1001));
    descriptionInput().focus();

    submit();

    expect(document.activeElement).toBe(nameInput());
  });

  it('focuses the description when only the description is invalid', () => {
    renderDialog();
    type(nameInput(), 'Viagem');
    type(descriptionInput(), 'a'.repeat(1001));
    nameInput().focus();

    submit();

    expect(document.activeElement).toBe(descriptionInput());
  });

  it('updates the counter as the description is typed', () => {
    renderDialog();

    type(descriptionInput(), 'Roteiro');

    expect(screen.getByText('7 / 1000')).toBeTruthy();
  });

  it('counts the description as typed, spaces included', () => {
    renderDialog();

    type(descriptionInput(), '  ab  ');

    expect(screen.getByText('6 / 1000')).toBeTruthy();
  });

  it('submits the raw values once when they are valid', () => {
    const { onSubmit } = renderDialog();
    type(nameInput(), '  Viagem  ');
    type(descriptionInput(), ' Roteiro ');

    submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: '  Viagem  ',
      description: ' Roteiro ',
    });
  });

  it('submits the edit form with the changed values', () => {
    const { onSubmit } = renderDialog({
      mode: 'edit',
      initialValues: { name: 'Viagem', description: 'Roteiro' },
    });
    type(nameInput(), 'Viagem 2027');
    type(descriptionInput(), '');

    submit('Salvar');

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Viagem 2027',
      description: '',
    });
  });

  it('shows "Criando…" on a disabled submit button while pending', () => {
    const { onSubmit } = renderDialog({
      isPending: true,
      initialValues: { name: 'Viagem', description: '' },
    });

    const button = screen.getByRole('button', { name: 'Criando…' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.submit(nameInput().closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows server errors on their fields', () => {
    renderDialog({
      initialValues: { name: 'Viagem', description: 'Roteiro' },
      serverErrors: { name: 'nameTooLong', description: 'descriptionTooLong' },
    });

    expect(screen.getByText('Use até 100 caracteres')).toBeTruthy();
    expect(screen.getByText('Use até 1000 caracteres')).toBeTruthy();
    expect(nameInput().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('calls onClose without submitting when Cancelar is pressed', () => {
    const { onSubmit, onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onClose without submitting when Esc is pressed', () => {
    const { onSubmit, onClose } = renderDialog();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
