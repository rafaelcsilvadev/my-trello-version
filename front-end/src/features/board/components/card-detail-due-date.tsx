import { X } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';

type CardDetailDueDateProps = {
  // `YYYY-MM-DD`, the value a native date input reads and writes.
  dueDate: string | null;
  isDisabled: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
};

// Port of the prototype card detail due date (design/Task List.dc.html:645-651).
export function CardDetailDueDate({
  dueDate,
  isDisabled,
  onChange,
  onRemove,
}: CardDetailDueDateProps) {
  const { t } = useTranslation();
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-text-secondary"
      >
        {t('board.cardDetail.due')}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={inputId}
          type="date"
          value={dueDate ?? ''}
          onChange={(event) => {
            // Clearing the native picker gives ''; removal goes through "Remover prazo".
            if (event.target.value !== '') onChange(event.target.value);
          }}
          disabled={isDisabled}
          className="h-8.5 rounded-sm border border-border-subtle bg-surface-card px-2.5 text-md text-text-primary shadow-input outline-0 focus:border-border-focus focus:shadow-focus disabled:bg-(--neutral-50) disabled:text-text-disabled"
        />
        {dueDate === null ? null : (
          <Button
            variant="ghost"
            size="sm"
            onPress={onRemove}
            isDisabled={isDisabled}
          >
            <X size={14} aria-hidden />
            {t('board.cardDetail.removeDue')}
          </Button>
        )}
      </div>
    </div>
  );
}
