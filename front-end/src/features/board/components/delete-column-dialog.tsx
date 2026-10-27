import type { List } from '@my-trello/api-contract';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

type DeleteColumnDialogProps = {
  list: List;
  cardCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

// Port of the prototype delete-column confirmation (design/Task List.dc.html:759-761, 1139).
// Mounted only while open; closing goes through onCancel.
export function DeleteColumnDialog({
  list,
  cardCount,
  onConfirm,
  onCancel,
}: DeleteColumnDialogProps) {
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
      title={t('board.deleteColumn.title', { name: list.title })}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-md leading-normal text-text-secondary">
          {lossText(t, cardCount)}
        </p>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={onCancel}>
            {t('board.deleteColumn.cancel')}
          </Button>
          <Button variant="danger" onPress={onConfirm}>
            {t('board.deleteColumn.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function lossText(t: TFunction, cardCount: number) {
  if (cardCount === 0) {
    return t('board.deleteColumn.textNoCards');
  }
  if (cardCount === 1) {
    return t('board.deleteColumn.textOneCard');
  }
  return t('board.deleteColumn.textCards', { count: cardCount });
}
