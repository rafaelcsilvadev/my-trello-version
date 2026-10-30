import type { Ref } from 'react';
import {
  TextField as AriaTextField,
  FieldError,
  Label,
  Text,
  TextArea,
} from 'react-aria-components';

import { inputClasses } from './text-field';

// Púrpura .p-textarea overrides on top of .p-input (design/_ds/.../css/components.css:51).
const textAreaClasses = `${inputClasses} h-auto! min-h-24 py-3 leading-normal! resize-y`;

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  counter?: string;
  error?: string;
  isDisabled?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
};

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  counter,
  error,
  isDisabled,
  inputRef,
}: TextAreaFieldProps) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      isInvalid={error !== undefined}
      isDisabled={isDisabled}
      validationBehavior="aria"
      className="flex flex-col gap-2"
    >
      <Label className="text-md font-medium leading-snug text-text-primary">
        {label}
      </Label>
      <TextArea
        ref={inputRef}
        placeholder={placeholder}
        className={textAreaClasses}
      />
      {counter && (
        <Text slot="description" className="text-xs text-text-tertiary">
          {counter}
        </Text>
      )}
      <FieldError className="text-xs text-red-600">{error}</FieldError>
    </AriaTextField>
  );
}
