import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

import type { Label } from '../model/types';

type DeleteLabelDialogProps = {
  label: Label;
  cardCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

// Mounted only while open; closing goes through onCancel.
export function DeleteLabelDialog({
  label,
  cardCount,
  onConfirm,
  onCancel,
}: DeleteLabelDialogProps) {
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
      title={t('board.labelsPage.delete.title', { name: label.name })}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-md leading-normal text-text-secondary">
          {impactText(t, cardCount)}
        </p>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={onCancel}>
            {t('board.labelsPage.delete.cancel')}
          </Button>
          <Button variant="danger" onPress={onConfirm}>
            {t('board.labelsPage.delete.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function impactText(t: TFunction, cardCount: number) {
  if (cardCount === 0) {
    return t('board.labelsPage.delete.textNoCards');
  }
  if (cardCount === 1) {
    return t('board.labelsPage.delete.textOneCard');
  }
  return t('board.labelsPage.delete.textCards', { count: cardCount });
}
