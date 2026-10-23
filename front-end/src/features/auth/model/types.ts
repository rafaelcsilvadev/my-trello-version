import type { components } from '@my-trello/api-contract';

export type AuthResponse = components['schemas']['AuthResponseDto'];
export type UserResponse = components['schemas']['UserResponseDto'];

export type LogInValues = { email: string; password: string };
export type SignUpValues = LogInValues & { name: string };

export type SignUpField = 'name' | 'email' | 'password';
// Values are i18n key suffixes: `auth.errors.<value>`.
export type SignUpFieldError =
  | 'nameRequired'
  | 'nameTooLong'
  | 'emailInvalid'
  | 'emailTaken'
  | 'passwordLength';
export type SignUpFieldErrors = Partial<Record<SignUpField, SignUpFieldError>>;

export type FormAlert = 'invalidCredentials' | 'rateLimited' | 'network';
