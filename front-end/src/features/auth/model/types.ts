import type { components } from '@my-trello/api-contract';

export type AuthResponse = components['schemas']['AuthResponseDto'];
export type UserResponse = components['schemas']['UserResponseDto'];

export type LogInValues = { email: string; password: string };
export type SignUpValues = LogInValues & { name: string };
// The confirmation is checked on the client and never sent to the API.
export type SignUpFormValues = SignUpValues & { confirmPassword: string };

export type SignUpField = keyof SignUpFormValues;
// Values are i18n key suffixes: `auth.errors.<value>`.
export type SignUpFieldError =
  | 'nameRequired'
  | 'nameTooLong'
  | 'emailInvalid'
  | 'emailTaken'
  | 'passwordLength'
  | 'passwordMismatch';
export type SignUpFieldErrors = Partial<Record<SignUpField, SignUpFieldError>>;

export type FormAlert = 'invalidCredentials' | 'rateLimited' | 'network';
