import type { SignUpField, SignUpFieldErrors, SignUpValues } from './types';

const NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FIELD_ORDER: readonly SignUpField[] = ['name', 'email', 'password'];

// Name and e-mail are checked trimmed; the password is checked as typed because spaces are part of it.
export function validateSignUp(values: SignUpValues): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};
  const name = values.name.trim();
  if (name.length === 0) {
    errors.name = 'nameRequired';
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = 'nameTooLong';
  }
  if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'emailInvalid';
  }
  const { length } = values.password;
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    errors.password = 'passwordLength';
  }
  return errors;
}

export function firstInvalidField(
  errors: SignUpFieldErrors,
): SignUpField | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}
