import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Checkbox } from '@/shared/ui/checkbox';

describe('Checkbox', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes a checkbox named by its visually hidden label', () => {
    render(
      <Checkbox
        label="Concluída"
        isSelected={false}
        onChange={vi.fn<(isSelected: boolean) => void>()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Concluída' })).toBeTruthy();
    expect(screen.getByText('Concluída').classList.contains('sr-only')).toBe(
      true,
    );
  });

  it('reflects the isSelected state', () => {
    const { rerender } = render(
      <Checkbox
        label="Concluída"
        isSelected={false}
        onChange={vi.fn<(isSelected: boolean) => void>()}
      />,
    );

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox');
    expect(checkbox.checked).toBe(false);

    rerender(
      <Checkbox
        label="Concluída"
        isSelected
        onChange={vi.fn<(isSelected: boolean) => void>()}
      />,
    );

    expect(checkbox.checked).toBe(true);
  });

  it('calls onChange with true when an unselected checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Checkbox label="Concluída" isSelected={false} onChange={onChange} />,
    );

    await user.click(screen.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('calls onChange with false when a selected checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(<Checkbox label="Concluída" isSelected onChange={onChange} />);

    await user.click(screen.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('calls onChange with the new value when Space is pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Checkbox label="Concluída" isSelected={false} onChange={onChange} />,
    );

    await user.tab();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('blocks click and Space when isDisabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(isSelected: boolean) => void>();
    render(
      <Checkbox
        label="Concluída"
        isSelected={false}
        onChange={onChange}
        isDisabled
      />,
    );

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox');
    await user.click(checkbox);
    checkbox.focus();
    await user.keyboard(' ');

    expect(checkbox.disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
