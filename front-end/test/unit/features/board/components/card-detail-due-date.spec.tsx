import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardDetailDueDate } from '@/features/board/components/card-detail-due-date';
import { createI18n } from '@/shared/i18n/i18n';

afterEach(cleanup);

type Props = ComponentProps<typeof CardDetailDueDate>;

function renderDueDate(overrides: Partial<Props> = {}) {
  const props: Props = {
    dueDate: '2026-11-05',
    isDisabled: false,
    onChange: vi.fn<(value: string) => void>(),
    onRemove: vi.fn<() => void>(),
    ...overrides,
  };
  render(
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <CardDetailDueDate {...props} />
    </I18nextProvider>,
  );
  return { props };
}

function dateInput() {
  return screen.getByLabelText<HTMLInputElement>('Prazo');
}

describe('CardDetailDueDate', () => {
  it('shows the current due date in the input labelled "Prazo"', () => {
    renderDueDate();

    expect(dateInput().type).toBe('date');
    expect(dateInput().value).toBe('2026-11-05');
  });

  it('shows an empty input when there is no due date', () => {
    renderDueDate({ dueDate: null });

    expect(dateInput().value).toBe('');
  });

  it('calls onChange with the new date', () => {
    const { props } = renderDueDate();

    fireEvent.change(dateInput(), { target: { value: '2026-12-01' } });

    expect(props.onChange).toHaveBeenCalledExactlyOnceWith('2026-12-01');
  });

  it('does not call onChange when the native input is cleared', () => {
    const { props } = renderDueDate();

    fireEvent.change(dateInput(), { target: { value: '' } });

    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('removes the due date through "Remover prazo"', async () => {
    const { props } = renderDueDate();

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Remover prazo' }));

    expect(props.onRemove).toHaveBeenCalledOnce();
  });

  it('hides "Remover prazo" without a due date', () => {
    renderDueDate({ dueDate: null });

    expect(screen.queryByRole('button', { name: 'Remover prazo' })).toBeNull();
  });

  it('disables the input and "Remover prazo" when disabled', () => {
    renderDueDate({ isDisabled: true });

    expect(dateInput().disabled).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Remover prazo' })
        .disabled,
    ).toBe(true);
  });
});
