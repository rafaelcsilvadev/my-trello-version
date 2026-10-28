import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

import type { Card, List } from '../model/types';

type MoveToDialogProps = {
  card: Card;
  // Active columns in board order.
  lists: List[];
  onChoose: (listId: string) => void;
  onClose: () => void;
};

// Port of the prototype "Mover para…" dialog (design/Task List.dc.html:763-770, 1143-1145).
// Native buttons in a list stand in for the prototype's listbox; aria-current marks the card's column.
// Mounted only while open; choosing the current column is the caller's no-op (FDND-32).
export function MoveToDialog({
  card,
  lists,
  onChoose,
  onClose,
}: MoveToDialogProps) {
  const { t } = useTranslation();
  const title = t('board.moveTo.title');

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={title}
      description={`“${card.title}”`}
    >
      <div className="flex flex-col gap-4">
        <ul
          aria-label={title}
          className="m-0 flex list-none flex-col gap-1.5 p-0"
        >
          {lists.map((list) => {
            const current = list.id === card.listId;
            return (
              <li key={list.id} className="flex flex-col">
                <button
                  type="button"
                  aria-current={current ? 'true' : undefined}
                  onClick={() => onChoose(list.id)}
                  className={`flex min-h-11.5 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-border-focus ${current ? 'border-purple-200 bg-surface-selected' : 'border-border-subtle bg-surface-card'}`}
                >
                  <span className="flex-1 font-medium text-md text-text-primary">
                    {list.title}
                  </span>{' '}
                  {current && (
                    <span className="text-xs text-text-tertiary">
                      {t('board.moveTo.current')}
                    </span>
                  )}
                  <span className="flex w-4 text-purple-700">
                    {current && <Check size={16} aria-hidden="true" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end">
          <Button variant="secondary" onPress={onClose}>
            {t('board.moveTo.close')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
