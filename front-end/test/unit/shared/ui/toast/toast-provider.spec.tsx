import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/ui/toast/toast-provider';
import { type ToastInput, useToast } from '@/shared/ui/toast/use-toast';

// Exposes show() to the test without a real feature component.
function renderWithToasts() {
  const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });
  return (toast: ToastInput) => act(() => result.current.show(toast));
}

const region = () => screen.getByRole('status');
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('hides a plain toast after 3 seconds', () => {
    const show = renderWithToasts();

    show({ message: 'Card moved' });

    advance(2999);
    expect(within(region()).getByText('Card moved')).toBeTruthy();
    advance(1);
    expect(within(region()).queryByText('Card moved')).toBeNull();
  });

  it('hides a toast with an action after 7 seconds', () => {
    const show = renderWithToasts();

    show({
      message: 'Could not save',
      action: { label: 'Try again', onClick: () => {} },
    });

    advance(6999);
    expect(within(region()).getByText('Could not save')).toBeTruthy();
    advance(1);
    expect(within(region()).queryByText('Could not save')).toBeNull();
  });

  it('runs the action once and hides the toast when its button is clicked', () => {
    const show = renderWithToasts();
    const onClick = vi.fn<() => void>();
    show({
      message: 'Could not save',
      action: { label: 'Try again', onClick },
    });

    fireEvent.click(
      within(region()).getByRole('button', { name: 'Try again' }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(within(region()).queryByText('Could not save')).toBeNull();
  });

  it('keeps two toasts on their own timers', () => {
    const show = renderWithToasts();

    show({ message: 'First' });
    advance(1000);
    show({ message: 'Second' });

    expect(within(region()).getByText('First')).toBeTruthy();
    expect(within(region()).getByText('Second')).toBeTruthy();
    advance(2000);
    expect(within(region()).queryByText('First')).toBeNull();
    expect(within(region()).getByText('Second')).toBeTruthy();
    advance(1000);
    expect(within(region()).queryByText('Second')).toBeNull();
  });
});
