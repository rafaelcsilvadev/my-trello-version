import { useEffect, useRef } from 'react';
import { TextField as AriaTextField, Input } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { inputClasses } from '@/shared/ui/text-field';

import type { ItemFieldError, Label } from '../model/types';
import { LabelChip } from './label-chip';
import { LabelColorPicker } from './label-color-picker';

// Only name and color are drawn by the chip; the rest fills the contract type.
const PREVIEW_BASE = {
  id: 'preview',
  boardId: '',
  createdAt: '',
  updatedAt: '',
};

export type LabelFormDialogProps = {
  mode: 'create' | 'edit';
  name: string;
  color: Label['color'];
  error: ItemFieldError | null;
  isSubmitting: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: Label['color']) => void;
  onSubmit: () => void;
  onClose: () => void;
};

// Create/edit label modal (FLP-10 to FLP-15, FLP-17, FLP-18). Mounted only while open,
// so the typed text is dropped on close; state and validation live in the view-model.
export function LabelFormDialog({
  mode,
  name,
  color,
  error,
  isSubmitting,
  onNameChange,
  onColorChange,
  onSubmit,
  onClose,
}: LabelFormDialogProps) {
  const { t } = useTranslation();
  const errorId = 'label-form-dialog-error';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const placeholder = t('board.labelsPage.form.namePlaceholder');
  const previewName = name.trim() === '' ? placeholder : name.trim();

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={t(
        mode === 'create'
          ? 'board.labelsPage.newLabel'
          : 'board.labelsPage.editLabel',
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <AriaTextField
            value={name}
            onChange={onNameChange}
            aria-label={t('board.labelsPage.form.name')}
            isInvalid={error !== null}
            validationBehavior="aria"
          >
            <Input
              ref={inputRef}
              placeholder={placeholder}
              aria-describedby={error === null ? undefined : errorId}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (!isSubmitting) {
                    onSubmit();
                  }
                }
              }}
              className={inputClasses}
            />
          </AriaTextField>
          {error === null ? null : (
            <p id={errorId} role="alert" className="m-0 text-xs text-red-600">
              {t(`board.fieldErrors.${error}`)}
            </p>
          )}
        </div>
        <LabelColorPicker
          value={color}
          onChange={onColorChange}
          ariaLabel={t('board.labelsPage.form.color')}
        />
        <div className="flex items-center gap-3">
          <span
            data-testid="label-color-name"
            className="text-md text-text-secondary"
          >
            {t(`board.labelColors.${color}`)}
          </span>
          <span data-testid="label-preview">
            <LabelChip label={{ ...PREVIEW_BASE, name: previewName, color }} />
          </span>
        </div>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>
            {t('board.labelsPage.form.cancel')}
          </Button>
          <Button isDisabled={isSubmitting} onPress={onSubmit}>
            {t(
              mode === 'create'
                ? 'board.labelsPage.form.create'
                : 'board.labelsPage.form.save',
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
