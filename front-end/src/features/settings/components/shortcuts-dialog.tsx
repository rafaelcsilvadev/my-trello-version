import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

import { ShortcutList } from './shortcut-list';

type ShortcutsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Port of the prototype shortcuts dialog (design/Task List.dc.html:573-578).
export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('settings.shortcuts.title')}
      size="narrow"
      footer={
        <Button variant="secondary" onPress={onClose}>
          {t('settings.shortcuts.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <ShortcutList />
        <p className="m-0 text-sm leading-normal text-text-tertiary">
          {t('settings.shortcuts.hint')}
        </p>
      </div>
    </Dialog>
  );
}
