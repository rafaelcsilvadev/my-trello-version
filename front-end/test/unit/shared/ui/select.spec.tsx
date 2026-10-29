import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Select } from '@/shared/ui/select';

const noop = vi.fn<(value: string) => void>();

const options = [
  { value: 'any', label: 'Qualquer prazo' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'today', label: 'Vencem hoje' },
];

describe('Select', () => {
  afterEach(() => {
    cleanup();
  });

  it('is a combobox named by its label', () => {
    render(
      <Select label="Prazo" value="any" options={options} onChange={noop} />,
    );

    expect(screen.getByRole('combobox', { name: 'Prazo' })).toBeTruthy();
  });

  it('renders every option in order', () => {
    render(
      <Select label="Prazo" value="any" options={options} onChange={noop} />,
    );

    const rendered = screen.getAllByRole('option');
    expect(rendered.map((option) => option.textContent)).toEqual([
      'Qualquer prazo',
      'Atrasadas',
      'Vencem hoje',
    ]);
    expect(rendered.map((option) => option.getAttribute('value'))).toEqual([
      'any',
      'overdue',
      'today',
    ]);
  });

  it('shows the value as the selected option', () => {
    render(
      <Select
        label="Prazo"
        value="overdue"
        options={options}
        onChange={noop}
      />,
    );

    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: 'Prazo' }).value,
    ).toBe('overdue');
    expect(
      screen.getByRole<HTMLOptionElement>('option', { name: 'Atrasadas' })
        .selected,
    ).toBe(true);
  });

  it('calls onChange with the chosen option value', () => {
    const onChange = vi.fn<(value: string) => void>();
    render(
      <Select
        label="Prazo"
        value="any"
        options={options}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Prazo' }), {
      target: { value: 'today' },
    });

    expect(onChange).toHaveBeenCalledExactlyOnceWith('today');
  });

  it('applies the Púrpura select md classes', () => {
    render(
      <Select label="Prazo" value="any" options={options} onChange={noop} />,
    );

    const { classList } = screen.getByRole('combobox', { name: 'Prazo' });
    expect(classList.contains('appearance-none')).toBe(true);
    expect(classList.contains('h-(--control-md)')).toBe(true);
    expect(classList.contains('focus:shadow-focus')).toBe(true);
  });
});
