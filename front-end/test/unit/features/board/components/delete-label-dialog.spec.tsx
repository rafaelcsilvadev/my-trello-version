import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteLabelDialog } from '@/features/board/components/delete-label-dialog';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

import { labelFixture } from '../../../../support/fixtures/board';

const label = labelFixture('label-1', { name: 'Bug' });

function renderDialog(cardCount = 3, language: Language = 'pt-BR') {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <DeleteLabelDialog
        label={label}
        cardCount={cardCount}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nextProvider>,
  );
  return { onConfirm, onCancel };
}

describe('DeleteLabelDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      language: 'pt-BR' as const,
      title: 'Excluir a etiqueta Bug?',
      cancel: 'Cancelar',
      confirm: 'Excluir',
    },
    {
      language: 'en' as const,
      title: 'Delete the label Bug?',
      cancel: 'Cancel',
      confirm: 'Delete',
    },
  ])(
    'shows the alert dialog named after the label ($language)',
    ({ language, title, cancel, confirm }) => {
      renderDialog(3, language);

      expect(screen.getByRole('alertdialog', { name: title })).toBeTruthy();
      expect(screen.getByRole('button', { name: cancel })).toBeTruthy();
      expect(screen.getByRole('button', { name: confirm })).toBeTruthy();
    },
  );

  it.each([
    { cardCount: 0, text: 'Nenhuma tarefa usa esta etiqueta.' },
    { cardCount: 1, text: 'Ela será removida de 1 tarefa.' },
    { cardCount: 3, text: 'Ela será removida de 3 tarefas.' },
  ])('explains the impact with $cardCount cards', ({ cardCount, text }) => {
    renderDialog(cardCount);

    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    { cardCount: 0, text: 'No task uses this label.' },
    { cardCount: 1, text: 'It will be removed from 1 task.' },
    { cardCount: 3, text: 'It will be removed from 3 tasks.' },
  ])(
    'explains the impact with $cardCount cards in English',
    ({ cardCount, text }) => {
      renderDialog(cardCount, 'en');

      expect(screen.getByText(text)).toBeTruthy();
    },
  );

  it('styles Excluir as the danger button', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Excluir' }).className).toContain(
      'bg-danger',
    );
  });

  it('calls onConfirm once when Excluir is pressed', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming when Cancelar is pressed', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming when Esc is pressed', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel without confirming on an outside click', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(document.body);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
