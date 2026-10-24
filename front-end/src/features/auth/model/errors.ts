import { type ApiError, isProblemType } from '@/shared/api/api-error';

import type {
  FormAlert,
  SignUpFieldError,
  SignUpFieldErrors,
  SignUpValues,
} from './types';

const EMAIL_TAKEN_TYPE = '/problems/email-already-registered';

// The API only says which field failed, so the message is picked from the value the user sent.
const SERVER_FIELD_ERRORS: Record<
  keyof SignUpValues,
  (values: SignUpValues) => SignUpFieldError
> = {
  name: (values) =>
    values.name.trim().length === 0 ? 'nameRequired' : 'nameTooLong',
  email: () => 'emailInvalid',
  password: () => 'passwordLength',
};

// `null` means no field message applies and the error belongs to the form alert.
export function mapSignUpServerErrors(
  err: ApiError,
  values: SignUpValues,
): SignUpFieldErrors | null {
  if (err.status === 409) {
    return isProblemType(err, EMAIL_TAKEN_TYPE)
      ? { email: 'emailTaken' }
      : null;
  }
  if (err.status !== 400 || !err.errors) {
    return null;
  }
  const errors: SignUpFieldErrors = {};
  for (const { field } of err.errors) {
    if (Object.hasOwn(SERVER_FIELD_ERRORS, field)) {
      const key = field as keyof SignUpValues;
      errors[key] = SERVER_FIELD_ERRORS[key](values);
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

export function formAlertFor(
  err: ApiError,
  form: 'logIn' | 'signUp',
): FormAlert {
  if (err.status === 429) {
    return 'rateLimited';
  }
  if (form === 'logIn' && (err.status === 400 || err.status === 401)) {
    return 'invalidCredentials';
  }
  return 'network';
}
