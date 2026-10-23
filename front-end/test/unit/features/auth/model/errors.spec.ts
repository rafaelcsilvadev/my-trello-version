import { describe, expect, it } from 'vitest';

import {
  formAlertFor,
  mapSignUpServerErrors,
} from '@/features/auth/model/errors';
import type { SignUpValues } from '@/features/auth/model/types';
import { ApiError, type FieldError } from '@/shared/api/api-error';

const VALUES: SignUpValues = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'password123',
};

function apiError(
  status: number,
  type = 'about:blank',
  errors?: FieldError[],
): ApiError {
  return new ApiError({ status, type, title: 'Error', detail: '', errors });
}

function validationError(...fields: string[]): ApiError {
  return apiError(
    400,
    '/problems/validation',
    fields.map((field) => ({ field, message: 'invalid' })),
  );
}

describe('mapSignUpServerErrors', () => {
  it('maps 409 email-already-registered to the e-mail field', () => {
    const err = apiError(409, '/problems/email-already-registered');

    expect(mapSignUpServerErrors(err, VALUES)).toEqual({ email: 'emailTaken' });
  });

  it('ignores a 409 with another problem type', () => {
    const err = apiError(409, '/problems/conflict');

    expect(mapSignUpServerErrors(err, VALUES)).toBeNull();
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])(
    'maps a 400 name error to nameRequired when the name is %s',
    (_case, name) => {
      expect(
        mapSignUpServerErrors(validationError('name'), { ...VALUES, name }),
      ).toEqual({ name: 'nameRequired' });
    },
  );

  it('maps a 400 name error to nameTooLong when the name is filled', () => {
    expect(mapSignUpServerErrors(validationError('name'), VALUES)).toEqual({
      name: 'nameTooLong',
    });
  });

  it('maps 400 e-mail and password errors to their field messages', () => {
    expect(
      mapSignUpServerErrors(validationError('email', 'password'), VALUES),
    ).toEqual({ email: 'emailInvalid', password: 'passwordLength' });
  });

  it('ignores unknown fields', () => {
    expect(
      mapSignUpServerErrors(validationError('email', 'nickname'), VALUES),
    ).toEqual({ email: 'emailInvalid' });
  });

  it('returns null when a 400 lists only unknown fields', () => {
    expect(
      mapSignUpServerErrors(validationError('nickname'), VALUES),
    ).toBeNull();
  });

  it('returns null when a 400 has no errors list', () => {
    expect(mapSignUpServerErrors(apiError(400), VALUES)).toBeNull();
  });

  it.each([0, 401, 429, 500])('returns null for status %i', (status) => {
    expect(mapSignUpServerErrors(apiError(status), VALUES)).toBeNull();
  });
});

describe('formAlertFor', () => {
  it.each(['logIn', 'signUp'] as const)(
    'maps 429 to rateLimited on %s',
    (form) => {
      expect(formAlertFor(apiError(429), form)).toBe('rateLimited');
    },
  );

  it.each([0, 500, 503])('maps status %i to network', (status) => {
    expect(formAlertFor(apiError(status), 'logIn')).toBe('network');
    expect(formAlertFor(apiError(status), 'signUp')).toBe('network');
  });

  it.each([400, 401])('maps log in %i to invalidCredentials', (status) => {
    expect(formAlertFor(apiError(status), 'logIn')).toBe('invalidCredentials');
  });

  it.each([400, 401, 409])('maps sign up %i to network', (status) => {
    expect(formAlertFor(apiError(status), 'signUp')).toBe('network');
  });

  it('maps an unexpected log in status to network', () => {
    expect(formAlertFor(apiError(404), 'logIn')).toBe('network');
  });
});
