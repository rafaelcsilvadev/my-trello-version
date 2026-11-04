import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LabelColorPicker } from '@/features/board/components/label-color-picker';
import type { Label } from '@/features/board/model/types';
import { createI18n } from '@/shared/i18n/i18n';

type Color = Label['color'];

function renderPicker(value: Color = 'blue') {
  const onChange = vi.fn<(color: Color) => void>();
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <LabelColorPicker value={value} onChange={onChange} ariaLabel="Cor" />
    </I18nextProvider>,
  );
  return onChange;
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

const COLOR_CLASSES = [
  'bg-label-purple',
  'bg-label-blue',
  'bg-label-sky',
  'bg-label-green',
  'bg-label-lime',
  'bg-label-yellow',
  'bg-label-orange',
  'bg-label-red',
  'bg-label-pink',
  'bg-label-black',
];

describe('LabelColorPicker', () => {
  afterEach(cleanup);

  it('renders 10 radios named by color, in order, inside a radiogroup with the given name', () => {
    renderPicker();

    expect(screen.getByRole('radiogroup', { name: 'Cor' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');

    expect(radios).toHaveLength(10);
    COLOR_NAMES.forEach((name, index) => {
      expect(screen.getByRole('radio', { name })).toBe(radios[index]);
    });
  });

  it('checks only the selected color', () => {
    renderPicker('red');

    const checked = screen
      .getAllByRole('radio')
      .filter((radio) => (radio as HTMLInputElement).checked);

    expect(checked).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'Vermelho' })).toHaveProperty(
      'checked',
      true,
    );
  });

  it('calls onChange with the color on click', async () => {
    const onChange = renderPicker('blue');

    await userEvent.click(screen.getByRole('radio', { name: 'Verde' }));

    expect(onChange).toHaveBeenCalledWith('green');
  });

  it('calls onChange with the next color on arrow key', async () => {
    const onChange = renderPicker('blue');

    screen.getByRole('radio', { name: 'Azul' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('sky');
  });

  it('paints each swatch with its color class', () => {
    renderPicker();

    const swatches = screen
      .getAllByRole('radio')
      .map(
        (radio) =>
          radio.closest('label')?.querySelector('span.size-5')?.className,
      );

    COLOR_CLASSES.forEach((cls, index) => {
      expect(swatches[index]).toContain(cls);
    });
  });
});
