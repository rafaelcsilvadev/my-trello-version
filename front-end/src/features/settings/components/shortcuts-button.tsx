import { Keyboard } from 'lucide-react';
import { Button } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { useShortcutsDialog } from '../view-models/use-shortcuts-dialog';
import { ShortcutsDialog } from './shortcuts-dialog';

// Same look as the Settings icon link next to it (protected-layout.tsx).
const iconButton =
  'inline-flex size-(--control-md) cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-neutral-100 focus-visible:shadow-focus focus-visible:outline-none';

// Top bar icon button. Phones have no keyboard, so it renders nothing there.
export function ShortcutsButton() {
  const { t } = useTranslation();
  const { isDesktop, isOpen, open, close } = useShortcutsDialog();

  if (!isDesktop) return null;

  return (
    <>
      <Button
        aria-label={t('nav.shortcuts')}
        onPress={open}
        className={iconButton}
      >
        <Keyboard size={18} aria-hidden="true" />
      </Button>
      <ShortcutsDialog isOpen={isOpen} onClose={close} />
    </>
  );
}
