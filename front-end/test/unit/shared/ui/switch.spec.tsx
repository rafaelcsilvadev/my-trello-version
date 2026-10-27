import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Switch } from '@/shared/ui/switch';

describe('Switch', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes a switch named by its visible label', () => {
    render(
      <Switch
        label="Mostrar arquivadas"
        isSelected={false}
        onChange={vi.fn<(isSelected: boolean) => void>()}
      />,
    );

    expect(
      screen.getByRole('switch', { name: 'Mostrar arquivadas' }),
    ).toBeTruthy();
    expect(
      screen.getByText('Mostrar arquivadas').classList.contains('sr-only'),
    ).toBe(false);
  });

  it('reflects the isSelected state', () => {
    const { rerender } = render(
      <Switch
        label="Mostrar arquivadas"
        isSelected={false}
        onChange={vi.fn<(isSelected: boolean) => void>()}
      />,
    );

    const toggle = screen.getByRole<HTMLInputElement>('switch');
    expect(toggle.checked).toBe(false);

    rerender(
      <Switch
        label="Mostrar arquivadas"
        isSelected
        onChange={vi.fn<(isSelected: boolean) => void>()}
      />,
    );

    expect(toggle.checked).toBe(true);
  });

  it('calls onChange with true when an off switch is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Switch
        label="Mostrar arquivadas"
        isSelected={false}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('calls onChange with false when an on switch is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Switch label="Mostrar arquivadas" isSelected onChange={onChange} />,
    );

    await user.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('toggles when its label is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Switch
        label="Mostrar arquivadas"
        isSelected={false}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('Mostrar arquivadas'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('calls onChange with the new value when Space is pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Switch label="Mostrar arquivadas" isSelected onChange={onChange} />,
    );

    await user.tab();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });
});
