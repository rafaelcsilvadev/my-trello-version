import { Check, TriangleAlert } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import {
  TextField as AriaTextField,
  FieldError,
  Input,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/shared/ui/checkbox';

import { isOverdue } from '../model/due-date';
import type { Card, DateParts, ItemFieldError } from '../model/types';

type CardDetailTitleProps = {
  card: Card;
  // `null` shows the saved title.
  draft: string | null;
  today: DateParts;
  error: ItemFieldError | null;
  isDisabled: boolean;
  onToggleDone: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

// Port of the prototype card detail title (design/Task List.dc.html:633-644).
export function CardDetailTitle({
  card,
  draft,
  today,
  error,
  isDisabled,
  onToggleDone,
  onChange,
  onSubmit,
  onCancel,
}: CardDetailTitleProps) {
  const { t } = useTranslation();
  const overdue = isOverdue(card, today);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    } else if (event.key === 'Escape') {
      // Keeps the modal open: Esc here only restores the title (FCD-46).
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <span className="flex pt-2">
          <Checkbox
            label={t('board.cardDetail.done')}
            isSelected={card.done}
            onChange={onToggleDone}
            isDisabled={isDisabled}
          />
        </span>
        <AriaTextField
          value={draft ?? card.title}
          onChange={onChange}
          aria-label={t('board.cardDetail.title')}
          isInvalid={error !== null}
          isDisabled={isDisabled}
          validationBehavior="aria"
          className="flex min-w-0 flex-1 flex-col gap-2"
        >
          <Input
            onKeyDown={onKeyDown}
            onBlur={onSubmit}
            className={`-ml-1 min-h-9 rounded-sm border border-transparent bg-transparent px-2 py-1 font-display text-2xl leading-snug font-semibold tracking-tight outline-0 hover:bg-surface-hover focus:border-border-focus focus:bg-surface-card focus:shadow-focus disabled:hover:bg-transparent data-invalid:border-danger ${card.done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}
          />
          <FieldError className="text-xs text-red-600">
            {error === null ? null : t(`board.fieldErrors.${error}`)}
          </FieldError>
        </AriaTextField>
      </div>
      {card.done || overdue ? (
        <div className="flex gap-2">
          {card.done ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-xs bg-green-50 px-2 text-xs font-medium text-green-700">
              <Check size={12} aria-hidden />
              <span>{t('board.cardDetail.doneBadge')}</span>
            </span>
          ) : null}
          {overdue ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-xs bg-red-50 px-2 text-xs font-medium text-red-700">
              <TriangleAlert size={12} aria-hidden />
              <span>{t('board.cardDetail.overdue')}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
