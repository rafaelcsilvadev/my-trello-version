import { describe, expect, it } from 'vitest';

import { mapBoardServerErrors } from '@/features/boards/model/errors';
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
