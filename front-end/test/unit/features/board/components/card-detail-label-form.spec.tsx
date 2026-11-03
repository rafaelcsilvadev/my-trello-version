import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailLabelForm } from '@/features/board/components/card-detail-label-form';
import type { ItemFieldError, Label } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';

type Color = Label['color'];

type RenderOptions = {
  name?: string;
  color?: Color;
  error?: ItemFieldError | null;
  isCreating?: boolean;
};

function renderForm({
  name = '',
  color = 'blue',
  error = null,
  isCreating = false,
}: RenderOptions = {}) {
  const handlers = {
    onNameChange: vi.fn<(name: string) => void>(),
    onColorChange: vi.fn<(color: Color) => void>(),
    onSubmit: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailLabelForm
        name={name}
        color={color}
        error={error}
        isCreating={isCreating}
        {...handlers}
      />
    </I18nextProvider>,
  );
  return handlers;
}

const COLOR_NAMES = [
  'Roxo',
  'Azul',
  'Céu',
  'Verde',
  'Lima',
  'Amarelo',
  'Laranja',
  'Vermelho',
  'Rosa',
  'Preto',
];

describe('CardDetailLabelForm', () => {
  afterEach(cleanup);

  it('focuses the name field and shows the given name', () => {
    renderForm({ name: 'Bug' });
    const input = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Nome',
    });
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Bug');
    expect(input.getAttribute('placeholder')).toBe('Ex.: Bug');
  });

  it('calls onNameChange while typing', async () => {
    const { onNameChange } = renderForm();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'a');
    expect(onNameChange).toHaveBeenCalledWith('a');
  });

  it('lists the ten colors in doc order with the given one checked', () => {
    renderForm({ color: 'lime' });
    screen.getByRole('radiogroup', { name: 'Cor' });
    const radios = screen.getAllByRole<HTMLInputElement>('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual(
      COLOR_NAMES,
    );
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Lima' }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Azul' }).checked,
    ).toBe(false);
  });

  it('calls onColorChange on click and on arrow keys', async () => {
    const { onColorChange } = renderForm({ color: 'purple' });
    await userEvent.click(screen.getByRole('radio', { name: 'Verde' }));
    expect(onColorChange).toHaveBeenLastCalledWith('green');
    screen.getByRole('radio', { name: 'Roxo' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onColorChange).toHaveBeenLastCalledWith('blue');
  });

  it('submits with Enter in the name and with Criar', async () => {
    const { onSubmit } = renderForm({ name: 'Bug' });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nome' }),
      '{Enter}',
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('disables Criar while creating', () => {
    renderForm({ isCreating: true });
    expect(
      screen.getByRole('button', { name: 'Criar' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('shows the error text as an alert and marks the name invalid', () => {
    renderForm({ error: 'labelNameTaken' });
    expect(screen.getByRole('alert').textContent).toBe(
      'Já existe uma etiqueta com esse nome neste quadro',
    );
    expect(
      screen
        .getByRole('textbox', { name: 'Nome' })
        .getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('has no alert and a valid name without an error', () => {
    renderForm();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen
        .getByRole('textbox', { name: 'Nome' })
        .getAttribute('aria-invalid'),
    ).not.toBe('true');
  });

  it('calls onCancel from the Cancelar icon button', async () => {
    const { onCancel } = renderForm();
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancel.querySelector('svg.lucide-x')).not.toBeNull();
    await userEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
