import { useEffect, useRef } from 'react';

const TYPING_TARGET =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (event.target instanceof Element && event.target.closest(TYPING_TARGET)) {
    return true;
  }
  return document.querySelector('[aria-modal="true"]') !== null;
}

// Single-key shortcut on `document` with the FE-AD-011 guards.
export function useShortcut(
  key: string,
  handler: () => void,
  { enabled }: { enabled: boolean },
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key || shouldIgnore(event)) return;
      event.preventDefault();
      handlerRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key, enabled]);
}
