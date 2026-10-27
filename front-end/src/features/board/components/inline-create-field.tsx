import { X } from 'lucide-react';
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  TextField as AriaTextField,
  FieldError,
  Input,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { inputClasses } from '@/shared/ui/text-field';

import type { ItemFieldError } from '../model/types';

type InlineCreateFieldProps = {
  label: string;
  placeholder: string;
  isPending: boolean;
  // Resolves the field message or `null` once created; a rejection keeps the text (FBV-56).
  onSubmit: (raw: string) => Promise<ItemFieldError | null>;
  onClose: () => void;
};

// Port of the prototype add-column and add-card fields (design/Task List.dc.html:442-447, 504-508).
export function InlineCreateField({
  label,
  placeholder,
  isPending,
  onSubmit,
  onClose,
}: InlineCreateFieldProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState<ItemFieldError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Opening the field moves focus into it, also for the `n` shortcut (FBV-30).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    // A disabled submit button also blocks Enter, so pending fields never resubmit (FBV-17, FBV-29).
    setIsSubmitting(true);
    try {
      const result = await onSubmit(value);
      setError(result);
      if (result === null) setValue('');
    } catch {
      // The caller already showed the failure toast; keep the text for another try.
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-2"
    >
      <AriaTextField
        value={value}
        onChange={setValue}
        aria-label={placeholder}
        isInvalid={error !== null}
        validationBehavior="aria"
        className="flex flex-col gap-2"
      >
        <Input
          ref={inputRef}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          className={inputClasses}
        />
        <FieldError className="text-xs text-red-600">
          {error === null ? null : t(`board.fieldErrors.${error}`)}
        </FieldError>
      </AriaTextField>
      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" isDisabled={isPending || isSubmitting}>
          {label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('board.field.cancel')}
          onPress={onClose}
        >
          <X size={16} aria-hidden />
        </Button>
      </div>
    </form>
  );
}
