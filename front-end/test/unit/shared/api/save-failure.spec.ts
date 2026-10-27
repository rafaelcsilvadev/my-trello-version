import { describe, expect, it } from 'vitest';

import { ApiError, type FieldError } from '@/shared/api/api-error';
import { saveFailureKind } from '@/shared/api/save-failure';

function apiError(status: number, errors?: FieldError[]): ApiError {
  return new ApiError({
    status,
    type: 'about:blank',
    title: 'Error',
    detail: '',
    errors,
  });
}

function validationError(...fields: string[]): ApiError {
  return apiError(
    400,
    fields.map((field) => ({ field, message: 'invalid' })),
  );
}

describe('saveFailureKind', () => {
  it.each([0, 500, 503])('maps status %i to retry', (status) => {
    expect(saveFailureKind(apiError(status))).toBe('retry');
  });

  it('maps 409 to conflict', () => {
    expect(saveFailureKind(apiError(409))).toBe('conflict');
  });

  it('maps 404 to notFound', () => {
    expect(saveFailureKind(apiError(404))).toBe('notFound');
  });

  it('maps 400 with field errors to invalid', () => {
    expect(saveFailureKind(validationError('title'))).toBe('invalid');
  });

  it.each([
    ['no errors list', undefined],
    ['an empty errors list', []],
  ])('maps 400 with %s to retry', (_case, errors) => {
    expect(saveFailureKind(apiError(400, errors))).toBe('retry');
  });

  it('maps 401 to sessionExpired', () => {
    expect(saveFailureKind(apiError(401))).toBe('sessionExpired');
  });

  it.each([403, 422, 429])('maps unexpected status %i to retry', (status) => {
    expect(saveFailureKind(apiError(status))).toBe('retry');
  });
});
