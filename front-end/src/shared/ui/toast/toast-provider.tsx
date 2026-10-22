import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  TOAST_MS,
  TOAST_WITH_ACTION_MS,
  type ToastApi,
  ToastContext,
  type ToastInput,
} from '@/shared/ui/toast/use-toast';

type Toast = ToastInput & { id: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const hide = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show(input) {
        const id = nextId.current++;
        const ms = input.action ? TOAST_WITH_ACTION_MS : TOAST_MS;
        timers.current.set(
          id,
          setTimeout(() => hide(id), ms),
        );
        setToasts((current) => [...current, { ...input, id }]);
      },
    }),
    [hide],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <ToastContext value={api}>
      {children}
      {/* Always mounted so screen readers pick up the first notice. */}
      <output
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map(({ id, message, action }) => (
          <div
            key={id}
            className="pointer-events-auto flex w-90 max-w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-card py-3.5 pr-3.5 pl-4 text-sm text-text-primary shadow-lg"
          >
            <span className="flex-1">{message}</span>
            {action && (
              <button
                type="button"
                className="rounded-sm font-medium text-text-link hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                onClick={() => {
                  action.onClick();
                  hide(id);
                }}
              >
                {action.label}
              </button>
            )}
          </div>
        ))}
      </output>
    </ToastContext>
  );
}
