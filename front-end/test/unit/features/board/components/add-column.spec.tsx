import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddColumn } from '@/features/board/components/add-column';
import type { ItemFieldError } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';
import type { Language } from '@/shared/preferences/preferences-store';

type Submit = (raw: string) => Promise<ItemFieldError | null>;

type RenderOptions = {
  isEmptyBoard?: boolean;
  isPending?: boolean;
  language?: Language;
};

function renderAddColumn({
  isEmptyBoard = false,
  isPending = false,
  language = 'pt-BR',
}: RenderOptions = {}) {
  const onSubmit = vi.fn<Submit>().mockResolvedValue(null);
  const i18n = createI18n(language);
  const ui = (empty: boolean) => (
    <I18nextProvider i18n={i18n}>
      <AddColumn
        isEmptyBoard={empty}
        isPending={isPending}
        onSubmit={onSubmit}
      />
    </I18nextProvider>
  );
  const { rerender } = render(ui(isEmptyBoard));
  return {
    onSubmit,
    setEmptyBoard: (empty: boolean) => rerender(ui(empty)),
  };
}

function field() {
  return screen.queryByRole<HTMLInputElement>('textbox', {
    name: 'Nome da coluna',
  });
}

describe('AddColumn', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens the column name field from the add button', async () => {
    const user = userEvent.setup();
    renderAddColumn();
    expect(field()).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Adicionar coluna' }));

    expect(document.activeElement).toBe(field());
    expect(
      screen.queryByRole('heading', { name: 'Adicione a primeira coluna' }),
    ).toBeNull();
  });

  it('closes the field on Esc and shows the add button again', async () => {
    const user = userEvent.setup();
    renderAddColumn();
    await user.click(screen.getByRole('button', { name: 'Adicionar coluna' }));

    await user.keyboard('{Escape}');

    expect(field()).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Adicionar coluna' }),
    ).toBeTruthy();
  });

  it('forwards the typed text on Enter and keeps the field open', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderAddColumn();
    await user.click(screen.getByRole('button', { name: 'Adicionar coluna' }));

    await user.type(field()!, '  Revisão {Enter}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('  Revisão ');
    await waitFor(() => expect(field()?.value).toBe(''));
  });

  it('shows the empty-board title, text and the open field', () => {
    renderAddColumn({ isEmptyBoard: true });

    expect(
      screen.getByRole('heading', { name: 'Adicione a primeira coluna' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Colunas são as etapas do seu fluxo, como A fazer, Fazendo e Feito.',
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(field());
  });

  it('keeps the empty-board block when its field is closed', async () => {
    const user = userEvent.setup();
    renderAddColumn({ isEmptyBoard: true });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(field()).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Adicione a primeira coluna' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Adicionar coluna' }));
    expect(document.activeElement).toBe(field());
  });

  it('opens the field again when the last column leaves the board', () => {
    const { setEmptyBoard } = renderAddColumn();
    expect(field()).toBeNull();

    setEmptyBoard(true);

    expect(
      screen.getByRole('heading', { name: 'Adicione a primeira coluna' }),
    ).toBeTruthy();
    expect(field()).toBeTruthy();
  });

  it('disables submit while pending', async () => {
    const user = userEvent.setup();
    renderAddColumn({ isPending: true });
    await user.click(screen.getByRole('button', { name: 'Adicionar coluna' }));

    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Adicionar coluna',
      }).disabled,
    ).toBe(true);
  });

  it('uses the English texts', () => {
    renderAddColumn({ isEmptyBoard: true, language: 'en' });

    expect(
      screen.getByRole('heading', { name: 'Add the first column' }),
    ).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Column name' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add column' })).toBeTruthy();
  });
});
