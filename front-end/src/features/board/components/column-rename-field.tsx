import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  TextField as AriaTextField,
  FieldError,
  Input,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { inputClasses } from '@/shared/ui/text-field';

import type { ItemFieldError } from '../model/types';

type ColumnRenameFieldProps = {
  initial: string;
  // Set when the view model reopens the field after a `400` (FBV-21).
  initialError?: ItemFieldError;
  // Returns the field message, or `null` once the caller closes the field.
  onSubmit: (raw: string) => ItemFieldError | null;
  onCancel: () => void;
};

// Port of the prototype column rename input (design/Task List.dc.html:388, 408).
export function ColumnRenameField({
  initial,
  initialError,
  onSubmit,
  onCancel,
}: ColumnRenameFieldProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<ItemFieldError | null>(
    initialError ?? null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  // Enter and Esc close the field; the blur that follows must not act again.
  const closedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    if (closedRef.current) return;
    const result = onSubmit(value);
    setError(result);
    if (result === null) closedRef.current = true;
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape' && !closedRef.current) {
      closedRef.current = true;
      onCancel();
    }
  }

  return (
    <AriaTextField
      value={value}
      onChange={setValue}
      aria-label={t('board.field.columnName')}
      isInvalid={error !== null}
      validationBehavior="aria"
      className="flex min-w-0 flex-1 flex-col gap-1"
    >
      <Input
        ref={inputRef}
        onKeyDown={onKeyDown}
        onBlur={submit}
        className={inputClasses}
      />
      <FieldError className="text-xs text-red-600">
        {error === null ? null : t(`board.fieldErrors.${error}`)}
      </FieldError>
    </AriaTextField>
  );
}
