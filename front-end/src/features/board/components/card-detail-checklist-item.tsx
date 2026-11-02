import { GripVertical, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { TextField as AriaTextField, Input } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';

import type { MoveInput } from '../model/move';
import type { ChecklistItem } from '../model/types';

// Keys a picked grip hands to the move session (FCLD-08, FCLD-11, FCLD-14).
const PICKED_KEYS: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  ' ',
  'Enter',
  'Escape',
]);

// The item's part in a checklist move.
export type ItemMove = {
  // `false` while the item cannot move or another move runs (FCLD-22, FCLD-23).
  canDrag: boolean;
  // Rendered at the keyboard target (FCLD-08).
  isLifted: boolean;
  // This item's keyboard session runs.
  isPicked: boolean;
  onStart: (input: MoveInput) => void;
  onKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

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
  // `null` in the read-only modes: no grip (FCLD-24).
  movable: ItemMove | null;
};

// Port of the prototype checklist row (design/Task List.dc.html:707-713).
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
  movable,
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

  function onGripKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!movable) return;
    if (!movable.isPicked) {
      if (event.key !== ' ' || !movable.canDrag) return;
      event.preventDefault();
      movable.onStart('keyboard');
    } else if (PICKED_KEYS.has(event.key)) {
      event.preventDefault();
      // Esc cancels the move, not the dialog (FCLD-14).
      if (event.key === 'Escape') event.stopPropagation();
      movable.onKey(event);
    }
  }

  return (
    <div
      className={`flex min-h-9.5 items-center gap-2 rounded-sm px-0.5 ${movable?.isLifted ? 'bg-brand-soft' : 'hover:bg-surface-hover'}`}
    >
      {movable ? (
        <button
          type="button"
          data-item-grip-id={item.id}
          aria-label={t('board.cardDetail.checklist.reorderItem', {
            text: item.text,
          })}
          disabled={!movable.canDrag && !movable.isPicked}
          onKeyDown={onGripKeyDown}
          className="inline-flex flex-none cursor-grab rounded-xs text-text-tertiary focus-visible:outline-2 focus-visible:outline-border-focus disabled:cursor-default disabled:text-text-disabled"
        >
          <GripVertical size={14} aria-hidden />
        </button>
      ) : null}
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
