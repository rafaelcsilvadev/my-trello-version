import { X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { TextField as AriaTextField, Input } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';

import type { ChecklistItem } from '../model/types';

type CardDetailChecklistItemProps = {
  item: ChecklistItem;
  // `undefined` shows the saved text.
  draft: string | undefined;
  isInvalid: boolean;
  // A change of this item is in flight (FCL-17).
  isPending: boolean;
  // Read-only modes (FCL-31, FCL-32).
  isDisabled: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

// Port of the prototype checklist row (design/Task List.dc.html:707-713),
// without the drag grip, which belongs to the checklist reorder feature.
export function CardDetailChecklistItem({
  item,
  draft,
  isInvalid,
  isPending,
  isDisabled,
  onToggle,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
}: CardDetailChecklistItemProps) {
  const { t } = useTranslation();

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    } else if (event.key === 'Escape') {
      // Keeps the modal open: Esc here only restores the text (FCL-30).
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <div className="flex min-h-9.5 items-center gap-2 rounded-sm px-0.5 hover:bg-surface-hover">
      <Checkbox
        label={item.text}
        isSelected={item.done}
        onChange={onToggle}
        isDisabled={isDisabled || isPending}
      />
      <AriaTextField
        value={draft ?? item.text}
        onChange={onChange}
        aria-label={t('board.cardDetail.checklist.editItem', {
          text: item.text,
        })}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
        validationBehavior="aria"
        className="flex min-w-0 flex-1"
      >
        <Input
          onKeyDown={onKeyDown}
          onBlur={onSubmit}
          className={`h-7.5 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1.5 text-md outline-0 focus:border-border-focus focus:bg-surface-card disabled:text-text-disabled data-invalid:border-danger ${item.done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}
        />
      </AriaTextField>
      {isDisabled ? null : (
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('board.cardDetail.checklist.deleteItem', {
            text: item.text,
          })}
          isDisabled={isPending}
          onPress={onDelete}
        >
          <X size={16} aria-hidden />
        </Button>
      )}
    </div>
  );
}
