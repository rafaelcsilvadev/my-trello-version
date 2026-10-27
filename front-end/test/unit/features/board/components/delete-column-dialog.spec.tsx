import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteColumnDialog } from '@/features/board/components/delete-column-dialog';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { listFixture } from '../../../../support/fixtures/board';

const list = listFixture('list-1', {
  title: 'Done',
  archivedAt: '2026-10-02T12:00:00.000Z',
});

function renderDialog(cardCount = 3, language: Language = 'pt-BR') {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <DeleteColumnDialog
        list={list}
        cardCount={cardCount}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nextProvider>,
  );
  return { onConfirm, onCancel };
}

describe('DeleteColumnDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Excluir a coluna Done definitivamente?',
      cancel: 'Cancelar',
      confirm: 'Excluir definitivamente',
    },
    {
      language: 'en' as const,
      title: 'Delete the column Done permanently?',
      cancel: 'Cancel',
      confirm: 'Delete permanently',
    },
  ])(
    'shows the alert dialog named after the column ($language)',
    ({ language, title, cancel, confirm }) => {
      renderDialog(3, language);

      expect(screen.getByRole('alertdialog', { name: title })).toBeTruthy();
      expect(screen.getByRole('button', { name: cancel })).toBeTruthy();
      expect(screen.getByRole('button', { name: confirm })).toBeTruthy();
    },
  );

  it.each([
    {
      cardCount: 0,
      text: 'Isso apaga a coluna, que não tem tarefas. Não dá para desfazer.',
    },
    {
      cardCount: 1,
      text: 'Isso apaga a coluna e a 1 tarefa dela. Não dá para desfazer.',
    },
    {
      cardCount: 3,
      text: 'Isso apaga a coluna e as 3 tarefas dela, ativas e arquivadas. Não dá para desfazer.',
    },
  ])('explains what is lost with $cardCount cards', ({ cardCount, text }) => {
    renderDialog(cardCount);

    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    {
      cardCount: 0,
      text: 'This deletes the column, which has no tasks. It can’t be undone.',
    },
    {
      cardCount: 1,
      text: 'This deletes the column and its 1 task. It can’t be undone.',
    },
    {
      cardCount: 3,
      text: 'This deletes the column and its 3 tasks, active and archived. It can’t be undone.',
    },
  ])(
    'explains what is lost with $cardCount cards in English',
    ({ cardCount, text }) => {
      renderDialog(cardCount, 'en');

      expect(screen.getByText(text)).toBeTruthy();
    },
  );

  it('calls onConfirm once when Excluir definitivamente is pressed', () => {
    const { onConfirm, onCancel } = renderDialog();

    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir definitivamente' }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming when Cancelar is pressed', () => {
    const { onConfirm, onCancel } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming when Esc is pressed', () => {
    const { onConfirm, onCancel } = renderDialog();

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
