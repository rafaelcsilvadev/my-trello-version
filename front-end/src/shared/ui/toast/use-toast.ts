import { createContext, useContext } from 'react';

export const TOAST_MS = 3000;
export const TOAST_WITH_ACTION_MS = 7000;

export type ToastInput = {
  message: string;
  action?: { label: string; onClick(): void };
};

export type ToastApi = { show(toast: ToastInput): void };

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return api;
}
