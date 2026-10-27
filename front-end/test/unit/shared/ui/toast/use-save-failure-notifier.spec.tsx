import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/api-error';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

function apiError(
  status: number,
  errors?: { field: string; message: string }[],
) {
  return new ApiError({
    status,
    type: `/problems/${status}`,
    title: 'Error',
    detail: '',
    errors,
  });
}

function setup() {
  const reload = vi.fn<() => void>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <ToastProvider>{children}</ToastProvider>
    </I18nextProvider>
  );
  const { result } = renderHook(() => useSaveFailureNotifier(reload), {
    wrapper,
  });
  return { notifier: () => result.current, reload };
}

const region = () => screen.getByRole('status');
const button = (name: string) => within(region()).getByRole('button', { name });

describe('useSaveFailureNotifier', () => {
  afterEach(() => {
    cleanup();
  });

  it('offers Tentar novamente for a server failure and resends on click', () => {
    const { notifier, reload } = setup();
    const retry = vi.fn<() => void>();

    act(() => notifier().notify(apiError(500), retry));

    expect(
      within(region()).getByText('Não foi possível salvar. Tente novamente.'),
    ).toBeTruthy();
    fireEvent.click(button('Tentar novamente'));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('offers Tentar novamente for a network failure', () => {
    const { notifier } = setup();
    const retry = vi.fn<() => void>();

    act(() => notifier().notify(apiError(0), retry));

    fireEvent.click(button('Tentar novamente'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('offers Recarregar for a conflict and reloads only on click', () => {
    const { notifier, reload } = setup();
    const retry = vi.fn<() => void>();

    act(() => notifier().notify(apiError(409), retry));

    expect(
      within(region()).getByText(
        'Este item foi arquivado. Recarregue para ver o estado atual.',
      ),
    ).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(button('Recarregar'));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });

  it('toasts without a button and reloads at once when the item is gone', () => {
    const { notifier, reload } = setup();

    act(() => notifier().notify(apiError(404), vi.fn()));

    expect(
      within(region()).getByText('Não foi possível salvar. Tente novamente.'),
    ).toBeTruthy();
    expect(within(region()).queryByRole('button')).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when the session expired', () => {
    const { notifier, reload } = setup();
    const retry = vi.fn<() => void>();

    act(() => notifier().notify(apiError(401), retry));

    expect(region().textContent).toBe('');
    expect(reload).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });

  it('toasts the success message when the change saves', async () => {
    const { notifier } = setup();
    const mutateAsync = vi
      .fn<(variables: { id: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    act(() => notifier().runChange(mutateAsync, { id: 'a' }, 'Quadro salvo'));

    await waitFor(() =>
      expect(within(region()).getByText('Quadro salvo')).toBeTruthy(),
    );
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'a' });
  });

  it('resends the same variables when Tentar novamente is clicked', async () => {
    const { notifier } = setup();
    const mutateAsync = vi
      .fn<(variables: { id: string }) => Promise<void>>()
      .mockRejectedValueOnce(apiError(500))
      .mockResolvedValue(undefined);

    act(() => notifier().runChange(mutateAsync, { id: 'a' }, 'Quadro salvo'));
    await waitFor(() => button('Tentar novamente'));
    fireEvent.click(button('Tentar novamente'));

    await waitFor(() =>
      expect(within(region()).getByText('Quadro salvo')).toBeTruthy(),
    );
    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync).toHaveBeenNthCalledWith(2, { id: 'a' });
  });
});
