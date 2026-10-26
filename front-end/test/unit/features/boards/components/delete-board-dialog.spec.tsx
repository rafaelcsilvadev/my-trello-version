import type { Board } from '@my-trello/api-contract';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteBoardDialog } from '@/features/boards/components/delete-board-dialog';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

const board: Board = {
  id: '3f1c2b4a-8d6e-4f0a-9b7c-1a2b3c4d5e6f',
  title: 'Roadmap',
  description: null,
  archivedAt: '2026-10-20T12:00:00.000Z',
  createdAt: '2026-10-10T12:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
};

type DialogProps = ComponentProps<typeof DeleteBoardDialog>;

function renderDialog(
  props: Partial<DialogProps> = {},
  language: Language = 'pt-BR',
) {
  const onConfirm = vi.fn<() => void>();
  const onClose = vi.fn<() => void>();
  const i18n = createI18n(language);
  const ui = (overrides: Partial<DialogProps>) => (
    <I18nextProvider i18n={i18n}>
      <DeleteBoardDialog
        board={board}
        isOpen
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
        {...overrides}
      />
    </I18nextProvider>
  );
  const { rerender } = render(ui({}));
  return {
    onConfirm,
    onClose,
    rerender: (overrides: Partial<DialogProps>) => {
      rerender(ui(overrides));
    },
  };
}

function confirmationInput() {
  return screen.getByRole('textbox', {
    name: 'Digite o nome do quadro para confirmar',
  });
}

function deleteButton() {
  return screen.getByRole('button', { name: 'Excluir definitivamente' });
}

function type(value: string) {
  fireEvent.change(confirmationInput(), { target: { value } });
}

describe('DeleteBoardDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Excluir o quadro Roadmap definitivamente?',
      text: 'Isso apaga o quadro com todas as colunas, tarefas e etiquetas. Não dá para desfazer.',
      field: 'Digite o nome do quadro para confirmar',
      cancel: 'Cancelar',
      confirm: 'Excluir definitivamente',
    },
    {
      language: 'en' as const,
      title: 'Delete the board Roadmap permanently?',
      text: 'This deletes the board with all its columns, tasks and labels. It can’t be undone.',
      field: 'Type the board name to confirm',
      cancel: 'Cancel',
      confirm: 'Delete permanently',
    },
  ])(
    'shows the alert dialog named after the board ($language)',
    ({ language, title, text, field, cancel, confirm }) => {
      renderDialog({}, language);

      expect(screen.getByRole('alertdialog', { name: title })).toBeTruthy();
      expect(screen.getByText(text)).toBeTruthy();
      const input = screen.getByRole('textbox', { name: field });
      expect((input as HTMLInputElement).value).toBe('');
      expect(input.getAttribute('placeholder')).toBe('Roadmap');
      expect(screen.getByRole('button', { name: cancel })).toBeTruthy();
      expect(screen.getByRole('button', { name: confirm })).toBeTruthy();
    },
  );

  it.each([
    { label: 'empty', value: '' },
    { label: 'in another case', value: 'roadmap' },
    { label: 'with an extra space', value: 'Roadmap ' },
    { label: 'a prefix of the title', value: 'Road' },
  ])(
    'keeps Excluir definitivamente disabled when the field is $label',
    ({ value }) => {
      const { onConfirm } = renderDialog();
      type(value);

      expect(deleteButton().hasAttribute('disabled')).toBe(true);
      fireEvent.click(deleteButton());
      expect(onConfirm).not.toHaveBeenCalled();
    },
  );

  it('enables Excluir definitivamente on an exact match and confirms once', () => {
    const { onConfirm, onClose } = renderDialog();
    type('Roadmap');

    expect(deleteButton().hasAttribute('disabled')).toBe(false);
    fireEvent.click(deleteButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose without confirming when Cancelar is pressed', () => {
    const { onConfirm, onClose } = renderDialog();
    type('Roadmap');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onClose without confirming when Esc is pressed', () => {
    const { onConfirm, onClose } = renderDialog();

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts with an empty field when reopened', () => {
    const { rerender } = renderDialog();
    type('Roadmap');

    rerender({ isOpen: false });
    rerender({ isOpen: true });

    expect((confirmationInput() as HTMLInputElement).value).toBe('');
    expect(deleteButton().hasAttribute('disabled')).toBe(true);
  });
});
