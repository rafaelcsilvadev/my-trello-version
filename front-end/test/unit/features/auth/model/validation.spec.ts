import { describe, expect, it } from 'vitest';

import type { SignUpFormValues } from '@/features/auth/model/types';
import {
  firstInvalidField,
  validateSignUp,
} from '@/features/auth/model/validation';

const VALID: SignUpFormValues = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

// The confirmation follows the password unless the case sets it.
function errorsFor(values: Partial<SignUpFormValues>) {
  const confirmPassword = values.password ?? VALID.password;
  return validateSignUp({ ...VALID, confirmPassword, ...values });
}

describe('validateSignUp', () => {
  it('returns no errors when every field is valid', () => {
    expect(validateSignUp(VALID)).toEqual({});
  });

  describe('name', () => {
    it.each([
      ['empty', ''],
      ['blank', '   '],
    ])('is required when %s', (_case, name) => {
      expect(errorsFor({ name })).toEqual({ name: 'nameRequired' });
    });

    it.each([
      ['1 char', 'A'],
      ['100 chars', 'A'.repeat(100)],
      ['100 chars after trimming', `  ${'A'.repeat(100)}  `],
    ])('accepts %s', (_case, name) => {
      expect(errorsFor({ name })).toEqual({});
    });

    it('rejects 101 chars after trimming', () => {
      expect(errorsFor({ name: `  ${'A'.repeat(101)} ` })).toEqual({
        name: 'nameTooLong',
      });
    });
  });

  describe('email', () => {
    it.each([
      ['a plain address', 'ana@example.com'],
      ['an address with surrounding spaces', '  ana@example.com '],
    ])('accepts %s', (_case, email) => {
      expect(errorsFor({ email })).toEqual({});
    });

    it.each(['', 'ana', 'ana@', 'ana@x', 'ana@x.c', 'a b@x.com'])(
      'rejects %j',
      (email) => {
        expect(errorsFor({ email })).toEqual({ email: 'emailInvalid' });
      },
    );
  });

  describe('password', () => {
    it.each([
      ['7 chars', 'a'.repeat(7)],
      ['73 chars', 'a'.repeat(73)],
      [
        '72 chars padded with spaces, since spaces count',
        ` ${'a'.repeat(72)} `,
      ],
    ])('rejects %s', (_case, password) => {
      expect(errorsFor({ password })).toEqual({ password: 'passwordLength' });
    });

    it.each([
      ['8 chars', 'a'.repeat(8)],
      ['72 chars', 'a'.repeat(72)],
      ['8 spaces, since spaces count', ' '.repeat(8)],
    ])('accepts %s', (_case, password) => {
      expect(errorsFor({ password })).toEqual({});
    });
  });

  describe('confirmPassword', () => {
    it.each([
      ['empty', ''],
      ['different', 'password124'],
      ['the password with a trailing space', 'password123 '],
    ])('rejects a confirmation that is %s', (_case, confirmPassword) => {
      expect(errorsFor({ confirmPassword })).toEqual({
        confirmPassword: 'passwordMismatch',
      });
    });

    it('reports the mismatch alongside an invalid password', () => {
      expect(
        errorsFor({ password: 'short', confirmPassword: 'other' }),
      ).toEqual({
        password: 'passwordLength',
        confirmPassword: 'passwordMismatch',
      });
    });
  });

  it('reports every invalid field at once', () => {
    expect(
      validateSignUp({
        name: '',
        email: 'ana',
        password: '',
        confirmPassword: 'x',
      }),
    ).toEqual({
      name: 'nameRequired',
      email: 'emailInvalid',
      password: 'passwordLength',
      confirmPassword: 'passwordMismatch',
    });
  });
});

describe('firstInvalidField', () => {
  it('returns null when there are no errors', () => {
    expect(firstInvalidField({})).toBeNull();
  });

  it.each([
    [
      'name',
      {
        password: 'passwordLength',
        email: 'emailInvalid',
        name: 'nameRequired',
      },
    ],
    ['email', { password: 'passwordLength', email: 'emailTaken' }],
    [
      'password',
      { confirmPassword: 'passwordMismatch', password: 'passwordLength' },
    ],
    ['confirmPassword', { confirmPassword: 'passwordMismatch' }],
  ] as const)(
    'picks %s first in name → email → password → confirmPassword order',
    (field, errors) => {
      expect(firstInvalidField(errors)).toBe(field);
    },
  );
});
