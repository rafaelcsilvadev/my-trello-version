import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { TextField as AriaTextField, Input } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { inputClasses } from '@/shared/ui/text-field';

import type { ItemFieldError, Label } from '../model/types';
import { LabelColorPicker } from './label-color-picker';

type CardDetailLabelFormProps = {
  name: string;
  color: Label['color'];
  error: ItemFieldError | null;
  isCreating: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: Label['color']) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

// The create-label form shown inside the label popover (FCLB-12, FCLB-13, FCLB-15).
export function CardDetailLabelForm({
  name,
  color,
  error,
  isCreating,
  onNameChange,
  onColorChange,
  onSubmit,
  onCancel,
}: CardDetailLabelFormProps) {
  const { t } = useTranslation();
  const errorId = 'card-detail-label-form-error';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <AriaTextField
        value={name}
        onChange={onNameChange}
        aria-label={t('board.cardDetail.labelPopover.name')}
        isInvalid={error !== null}
        validationBehavior="aria"
        className="flex flex-col gap-1"
      >
        <Input
          ref={inputRef}
          placeholder={t('board.cardDetail.labelPopover.namePlaceholder')}
          aria-describedby={error === null ? undefined : errorId}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          className={inputClasses}
        />
      </AriaTextField>
      {error === null ? null : (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {t(`board.fieldErrors.${error}`)}
        </p>
      )}
      <LabelColorPicker
        value={color}
        onChange={onColorChange}
        ariaLabel={t('board.cardDetail.labelPopover.color')}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" isDisabled={isCreating} onPress={onSubmit}>
          {t('board.cardDetail.labelPopover.submit')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('board.cardDetail.labelPopover.cancel')}
          onPress={onCancel}
        >
          <X size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
