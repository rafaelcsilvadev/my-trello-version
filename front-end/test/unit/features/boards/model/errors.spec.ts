import { describe, expect, it } from 'vitest';

import {
  mapBoardServerErrors,
  saveFailureKind,
} from '@/features/boards/model/errors';
import type { BoardFormValues } from '@/features/boards/model/types';
import { ApiError, type FieldError } from '@/shared/api/api-error';

const VALUES: BoardFormValues = { name: 'Roadmap', description: 'Q4 plans' };

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

describe('mapBoardServerErrors', () => {
  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])(
    'maps a 400 title error to nameRequired when the name is %s',
    (_case, name) => {
      expect(
        mapBoardServerErrors(validationError('title'), { ...VALUES, name }),
      ).toEqual({ name: 'nameRequired' });
    },
  );

  it('maps a 400 title error to nameTooLong when the name is filled', () => {
    expect(mapBoardServerErrors(validationError('title'), VALUES)).toEqual({
      name: 'nameTooLong',
    });
  });

  it('maps a 400 description error to descriptionTooLong', () => {
    expect(
      mapBoardServerErrors(validationError('description'), VALUES),
    ).toEqual({ description: 'descriptionTooLong' });
  });

  it('maps title and description errors together', () => {
    expect(
      mapBoardServerErrors(validationError('title', 'description'), VALUES),
    ).toEqual({ name: 'nameTooLong', description: 'descriptionTooLong' });
  });

  it('ignores unknown fields', () => {
    expect(
      mapBoardServerErrors(validationError('description', 'color'), VALUES),
    ).toEqual({ description: 'descriptionTooLong' });
  });

  it('returns null when a 400 lists only unknown fields', () => {
    expect(mapBoardServerErrors(validationError('color'), VALUES)).toBeNull();
  });

  it('returns null when a 400 has no errors list', () => {
    expect(mapBoardServerErrors(apiError(400), VALUES)).toBeNull();
  });

  it.each([0, 401, 404, 409, 500])('returns null for status %i', (status) => {
    expect(
      mapBoardServerErrors(
        apiError(status, [{ field: 'title', message: 'x' }]),
        VALUES,
      ),
    ).toBeNull();
  });
});

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
