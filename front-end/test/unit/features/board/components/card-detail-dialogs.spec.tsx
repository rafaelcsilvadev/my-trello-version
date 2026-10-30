import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DeleteCardDialog,
  DiscardChangesDialog,
} from '@/features/board/components/card-detail-dialogs';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

function renderDeleteDialog(language: Language = 'pt-BR') {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <DeleteCardDialog onConfirm={onConfirm} onCancel={onCancel} />
    </I18nextProvider>,
  );
  return { onConfirm, onCancel };
}

function renderDiscardDialog(language: Language = 'pt-BR') {
  const onDiscard = vi.fn<() => void>();
  const onKeepEditing = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <DiscardChangesDialog
        onDiscard={onDiscard}
        onKeepEditing={onKeepEditing}
      />
    </I18nextProvider>,
  );
  return { onDiscard, onKeepEditing };
}

describe('DeleteCardDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Excluir a tarefa definitivamente?',
      text: 'Isso apaga a tarefa e o checklist. Não dá para desfazer.',
      cancel: 'Cancelar',
      confirm: 'Excluir definitivamente',
    },
    {
      language: 'en' as const,
      title: 'Delete this task permanently?',
      text: 'This deletes the task and its checklist. It can’t be undone.',
      cancel: 'Cancel',
      confirm: 'Delete permanently',
    },
  ])(
    'shows the alert dialog with its text and buttons ($language)',
    ({ language, title, text, cancel, confirm }) => {
      renderDeleteDialog(language);

      expect(screen.getByRole('alertdialog', { name: title })).toBeTruthy();
      expect(screen.getByText(text)).toBeTruthy();
      expect(screen.getByRole('button', { name: cancel })).toBeTruthy();
      expect(screen.getByRole('button', { name: confirm })).toBeTruthy();
    },
  );

  it('calls onConfirm once when Excluir definitivamente is pressed', () => {
    const { onConfirm, onCancel } = renderDeleteDialog();

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir definitivamente' }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming when Cancelar is pressed', () => {
    const { onConfirm, onCancel } = renderDeleteDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming when Esc is pressed', () => {
    const { onConfirm, onCancel } = renderDeleteDialog();

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('DiscardChangesDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Descartar alterações?',
      text: 'Você tem edições não salvas.',
      keepEditing: 'Continuar editando',
      discard: 'Descartar',
    },
    {
      language: 'en' as const,
      title: 'Discard changes?',
      text: 'You have unsaved edits.',
      keepEditing: 'Keep editing',
      discard: 'Discard',
    },
  ])(
    'shows the alert dialog with its text and buttons ($language)',
    ({ language, title, text, keepEditing, discard }) => {
      renderDiscardDialog(language);

      expect(screen.getByRole('alertdialog', { name: title })).toBeTruthy();
      expect(screen.getByText(text)).toBeTruthy();
      expect(screen.getByRole('button', { name: keepEditing })).toBeTruthy();
      expect(screen.getByRole('button', { name: discard })).toBeTruthy();
    },
  );

  it('calls onDiscard once when Descartar is pressed', () => {
    const { onDiscard, onKeepEditing } = renderDiscardDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onKeepEditing).not.toHaveBeenCalled();
  });

  it('calls onKeepEditing without discarding when Continuar editando is pressed', () => {
    const { onDiscard, onKeepEditing } = renderDiscardDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));

    expect(onKeepEditing).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('calls onKeepEditing without discarding when Esc is pressed', () => {
    const { onDiscard, onKeepEditing } = renderDiscardDialog();

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onKeepEditing).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
