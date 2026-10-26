import type { Ref } from 'react';
import {
  TextField as AriaTextField,
  FieldError,
  Input,
  Label,
  Text,
} from 'react-aria-components';

// Tailwind port of the Púrpura .p-field / .p-input styles (design/_ds/.../css/components.css:46-59).
export const inputClasses =
  'h-(--control-lg) w-full rounded-sm border border-border-subtle bg-surface-card px-3.5 text-[15px] leading-[1.2] text-text-primary shadow-input outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-text-disabled focus:border-border-focus focus:shadow-focus disabled:bg-(--neutral-50) disabled:text-text-disabled data-invalid:border-danger data-invalid:focus:shadow-(--focus-ring-danger)';

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
};

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  hint,
  error,
  inputRef,
}: TextFieldProps) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      type={type}
      autoComplete={autoComplete}
      isInvalid={error !== undefined}
      validationBehavior="aria"
      className="flex flex-col gap-2"
    >
      <Label className="text-md font-medium leading-snug text-text-primary">
        {label}
      </Label>
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className={inputClasses}
      />
      {hint && (
        <Text slot="description" className="text-xs text-text-tertiary">
          {hint}
        </Text>
      )}
      <FieldError className="text-xs text-red-600">{error}</FieldError>
    </AriaTextField>
  );
}
