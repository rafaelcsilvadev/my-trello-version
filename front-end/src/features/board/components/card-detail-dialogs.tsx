import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

type DeleteCardDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

// Port of the prototype delete-task confirmation (design/Task List.dc.html:1141).
// Mounted only while open; closing goes through onCancel.
export function DeleteCardDialog({
  onConfirm,
  onCancel,
}: DeleteCardDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      role="alertdialog"
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      title={t('board.cardDetail.delete.title')}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-md leading-normal text-text-secondary">
          {t('board.cardDetail.delete.description')}
        </p>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={onCancel}>
            {t('board.cardDetail.cancel')}
          </Button>
          <Button variant="danger" onPress={onConfirm}>
            {t('board.cardDetail.deleteForever')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type DiscardChangesDialogProps = {
  onDiscard: () => void;
  onKeepEditing: () => void;
};

// Port of the prototype discard confirmation (design/Task List.dc.html:1140).
// Mounted only while open; closing goes through onKeepEditing.
export function DiscardChangesDialog({
  onDiscard,
  onKeepEditing,
}: DiscardChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      role="alertdialog"
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onKeepEditing();
        }
      }}
      title={t('board.cardDetail.discard.title')}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-md leading-normal text-text-secondary">
          {t('board.cardDetail.discard.description')}
        </p>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={onKeepEditing}>
            {t('board.cardDetail.discard.keepEditing')}
          </Button>
          <Button variant="danger" onPress={onDiscard}>
            {t('board.cardDetail.discard.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
