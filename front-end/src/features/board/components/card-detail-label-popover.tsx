import { Check, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  Checkbox,
  Dialog,
  DialogTrigger,
  TextField as AriaTextField,
  Input,
  Popover,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { inputClasses } from '@/shared/ui/text-field';

import type { Label } from '../model/types';
import { LabelChip } from './label-chip';

export type LabelOption = {
  label: Label;
  isChecked: boolean;
  // A change of this label is in flight (FCLB-06).
  isPending: boolean;
};

type CardDetailLabelPopoverProps = {
  isOpen: boolean;
  query: string;
  options: LabelOption[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onToggle: (label: Label) => void;
};

// The "+" trigger and the popover with the search field and the label checkboxes
// (FCLB-01, FCLB-02, FCLB-03, FCLB-06, FCLB-08, FCLB-09, FCLB-10).
export function CardDetailLabelPopover({
  isOpen,
  query,
  options,
  onOpenChange,
  onQueryChange,
  onToggle,
}: CardDetailLabelPopoverProps) {
  const { t } = useTranslation();

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        size="sm"
        variant={isOpen ? 'soft' : 'ghost'}
        aria-label={t('board.cardDetail.labelPopover.add')}
      >
        <Plus size={16} aria-hidden />
      </Button>
      <Popover
        placement="bottom start"
        className="w-64 rounded-lg border border-border-subtle bg-surface-card p-2 shadow-lg"
      >
        <Dialog
          aria-label={t('board.cardDetail.labelPopover.dialog')}
          className="flex flex-col gap-2 outline-none"
        >
          <SearchField value={query} onChange={onQueryChange} />
          {options.length === 0 ? (
            <p className="p-3 text-sm text-text-tertiary">
              {t('board.cardDetail.labelPopover.noResults')}
            </p>
          ) : (
            <ul className="flex max-h-60 flex-col gap-0.5 overflow-auto">
              {options.map(({ label, isChecked, isPending }) => (
                <li key={label.id}>
                  <Checkbox
                    isSelected={isChecked}
                    isDisabled={isPending}
                    onChange={() => onToggle(label)}
                    className="group relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2 hover:bg-neutral-100 data-disabled:cursor-not-allowed data-disabled:opacity-45 data-focus-visible:outline-2 data-focus-visible:outline-border-focus"
                  >
                    <span
                      aria-hidden
                      className="grid size-5 flex-none place-content-center rounded-[5px] border border-border-default bg-surface-card group-data-selected:border-purple-200 group-data-selected:bg-(--purple-50)"
                    >
                      <Check
                        className="hidden size-3 text-(--purple-600) group-data-selected:block"
                        strokeWidth={3}
                      />
                    </span>
                    <LabelChip label={label} />
                  </Checkbox>
                </li>
              ))}
            </ul>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

// Mounts with the dialog, so focusing on mount puts the cursor in the field (FCLB-02).
function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      aria-label={t('board.cardDetail.labelPopover.search')}
    >
      <Input
        ref={inputRef}
        placeholder={t('board.cardDetail.labelPopover.search')}
        className={inputClasses}
      />
    </AriaTextField>
  );
}
