import { Columns3, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

import type { ItemFieldError } from '../model/types';
import { InlineCreateField } from './inline-create-field';

type AddColumnProps = {
  // A board without active columns shows the first-column block with the field open (FBV-13).
  isEmptyBoard: boolean;
  isPending: boolean;
  onSubmit: (raw: string) => Promise<ItemFieldError | null>;
};

// Port of the prototype add column and empty board (design/Task List.dc.html:359-372, 499-510).
export function AddColumn({
  isEmptyBoard,
  isPending,
  onSubmit,
}: AddColumnProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(isEmptyBoard);
  const [wasEmptyBoard, setWasEmptyBoard] = useState(isEmptyBoard);
  // Archiving the last column opens the field again (FBV-13).
  if (isEmptyBoard !== wasEmptyBoard) {
    setWasEmptyBoard(isEmptyBoard);
    if (isEmptyBoard) setIsOpen(true);
  }

  const field = (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-2">
      <InlineCreateField
        label={t('board.addColumn.label')}
        placeholder={t('board.field.columnName')}
        isPending={isPending}
        onSubmit={onSubmit}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );

  if (isEmptyBoard) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-border-default px-4 py-12 text-center">
        <div className="flex size-13 items-center justify-center rounded-lg bg-brand-soft text-purple-700">
          <Columns3 size={24} aria-hidden />
        </div>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-text-primary">
          {t('board.addColumn.emptyTitle')}
        </h2>
        <p className="max-w-95 text-pretty text-md text-text-secondary">
          {t('board.addColumn.emptyText')}
        </p>
        <div className="mt-2 w-75 max-w-full text-left">
          {isOpen ? (
            field
          ) : (
            <Button fullWidth onPress={() => setIsOpen(true)}>
              <Plus size={16} aria-hidden />
              <span>{t('board.addColumn.label')}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-11/12 flex-none snap-start md:w-71">
      {isOpen ? (
        field
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-11.5 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-default bg-transparent px-3.5 text-md font-medium text-text-secondary hover:border-border-strong hover:bg-surface-card hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <Plus size={16} aria-hidden />
          <span>{t('board.addColumn.label')}</span>
        </button>
      )}
    </div>
  );
}
