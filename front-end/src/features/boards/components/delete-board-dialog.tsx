import type { Board } from '@my-trello/api-contract';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { TextField } from '@/shared/ui/text-field';

import { isDeleteConfirmed } from '../model/validation';

type DeleteBoardDialogProps = {
  board: Board;
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

// Port of the prototype delete-board dialog (design/Task List.dc.html:755-758).
export function DeleteBoardDialog({
  board,
  isOpen,
  onConfirm,
  onClose,
}: DeleteBoardDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      role="alertdialog"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={t('boards.delete.title', { name: board.title })}
    >
      <DeleteBoardForm board={board} onConfirm={onConfirm} onClose={onClose} />
    </Dialog>
  );
}

type DeleteBoardFormProps = Omit<DeleteBoardDialogProps, 'isOpen'>;

// Mounted only while the dialog is open, so each opening starts with an empty field.
function DeleteBoardForm({ board, onConfirm, onClose }: DeleteBoardFormProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const isConfirmed = isDeleteConfirmed(typed, board.title);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isConfirmed) {
      onConfirm();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="m-0 text-md leading-normal text-text-secondary">
        {t('boards.delete.text')}
      </p>
      <TextField
        label={t('boards.delete.typeToConfirm')}
        placeholder={board.title}
        value={typed}
        onChange={setTyped}
      />
      <div className="mt-1 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onPress={onClose}>
          {t('boards.delete.cancel')}
        </Button>
        <Button type="submit" variant="danger" isDisabled={!isConfirmed}>
          {t('boards.delete.confirm')}
        </Button>
      </div>
    </form>
  );
}
