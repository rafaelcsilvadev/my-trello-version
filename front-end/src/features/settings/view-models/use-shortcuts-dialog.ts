import { useState } from 'react';

import { useShortcut } from '@/shared/keyboard/use-shortcut';
import {
  DESKTOP_QUERY,
  useMediaQuery,
} from '@/shared/responsive/use-media-query';

export function useShortcutsDialog(): {
  isDesktop: boolean;
  isOpen: boolean;
  open(): void;
  close(): void;
} {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [isOpen, setIsOpen] = useState(false);

  // Leaving desktop closes the dialog for good: coming back must not reopen it.
  if (!isDesktop && isOpen) setIsOpen(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useShortcut('?', open, { enabled: isDesktop });

  return { isDesktop, isOpen, open, close };
}
