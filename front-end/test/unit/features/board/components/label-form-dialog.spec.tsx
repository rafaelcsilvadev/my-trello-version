import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LabelFormDialog,
  type LabelFormDialogProps,
} from '@/features/board/components/label-form-dialog';
import { createI18n } from '@/shared/i18n/i18n';

function renderDialog(props: Partial<LabelFormDialogProps> = {}) {
  const handlers = {
    onNameChange: vi.fn<(name: string) => void>(),
    onColorChange: vi.fn<(color: LabelFormDialogProps['color']) => void>(),
    onSubmit: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <LabelFormDialog
        mode="create"
        name=""
        color="blue"
        error={null}
        isSubmitting={false}
        {...handlers}
        {...props}
      />
    </I18nextProvider>,
  );
  return handlers;
}

describe('LabelFormDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the create mode with a focused name field, blue selected and Criar etiqueta', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Nova etiqueta' });
    const input = within(dialog).getByRole('textbox', { name: 'Nome' });
    expect(input.getAttribute('placeholder')).toBe('Ex.: Bug');
    expect(document.activeElement).toBe(input);
    expect(
      within(dialog).getByRole<HTMLInputElement>('radio', { name: 'Azul' })
        .checked,
    ).toBe(true);
    expect(within(dialog).getByTestId('label-color-name').textContent).toBe(
      'Azul',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Criar etiqueta' }),
    ).toBeTruthy();
  });

  it('shows the edit mode with the label values and Salvar', () => {
    renderDialog({ mode: 'edit', name: 'Bug', color: 'red' });

    const dialog = screen.getByRole('dialog', { name: 'Editar etiqueta' });
    expect(
      within(dialog).getByRole<HTMLInputElement>('textbox', { name: 'Nome' })
        .value,
    ).toBe('Bug');
    expect(
      within(dialog).getByRole<HTMLInputElement>('radio', { name: 'Vermelho' })
        .checked,
    ).toBe(true);
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeTruthy();
    expect(
      within(dialog).queryByRole('button', { name: 'Criar etiqueta' }),
    ).toBeNull();
  });

  it('previews the typed name and the placeholder while the trimmed name is blank', () => {
    renderDialog({ name: 'Urgente' });
    expect(screen.getByTestId('label-preview').textContent).toBe('Urgente');
    cleanup();

    renderDialog({ name: '   ' });
    expect(screen.getByTestId('label-preview').textContent).toBe('Ex.: Bug');
  });

  it('previews the picked color and shows its name', () => {
    renderDialog({ color: 'green' });

    expect(screen.getByTestId('label-preview').innerHTML).toContain(
      'bg-label-green',
    );
    expect(screen.getByTestId('label-color-name').textContent).toBe('Verde');
  });

  it('calls onColorChange when a color is picked', async () => {
    const { onColorChange } = renderDialog();

    await userEvent.click(screen.getByRole('radio', { name: 'Vermelho' }));

    expect(onColorChange).toHaveBeenCalledWith('red');
  });

  it('shows the error below the field as an alert and marks the field invalid', () => {
    renderDialog({ name: 'x', error: 'labelNameTaken' });

    expect(screen.getByRole('alert').textContent).toBe(
      'Já existe uma etiqueta com esse nome neste quadro',
    );
    expect(
      screen
        .getByRole('textbox', { name: 'Nome' })
        .getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('has no alert and no aria-invalid without an error', () => {
    renderDialog();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen
        .getByRole('textbox', { name: 'Nome' })
        .getAttribute('aria-invalid'),
    ).not.toBe('true');
  });

  it('calls onNameChange when typing', async () => {
    const { onNameChange } = renderDialog();

    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'a');

    expect(onNameChange).toHaveBeenCalledWith('a');
  });

  it('submits on Enter and on the primary button', async () => {
    const { onSubmit } = renderDialog({ name: 'Bug' });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nome' }),
      '{Enter}',
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole('button', { name: 'Criar etiqueta' }),
    );
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('disables the primary button and styles it dimmed while submitting', () => {
    renderDialog({ isSubmitting: true });

    const button = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Criar etiqueta',
    });
    expect(button.disabled).toBe(true);
    expect(button.className).toContain('disabled:opacity-45');
  });

  it('calls onClose once on Cancelar', async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose once on Esc', async () => {
    const { onClose } = renderDialog();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose once on an outside click', async () => {
    const { onClose } = renderDialog();

    await userEvent.click(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
