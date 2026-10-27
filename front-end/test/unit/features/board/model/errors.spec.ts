import { describe, expect, it } from 'vitest';

import { mapTitleServerError } from '@/features/board/model/errors';
import { ApiError, type FieldError } from '@/shared/api/api-error';

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

describe.each([
  ['column', 'columnNameRequired', 'columnNameTooLong'],
  ['card', 'cardTitleRequired', 'cardTitleTooLong'],
] as const)('mapTitleServerError for a %s', (kind, required, tooLong) => {
  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('maps a 400 title error to required when the text is %s', (_case, raw) => {
    expect(mapTitleServerError(validationError('title'), raw, kind)).toBe(
      required,
    );
  });

  it('maps a 400 title error to too long when the text is filled', () => {
    expect(mapTitleServerError(validationError('title'), 'Doing', kind)).toBe(
      tooLong,
    );
  });

  it('finds the title entry among other fields', () => {
    expect(
      mapTitleServerError(validationError('listId', 'title'), 'Doing', kind),
    ).toBe(tooLong);
  });

  it('returns null when a 400 has no title entry', () => {
    expect(
      mapTitleServerError(validationError('dueDate'), 'Doing', kind),
    ).toBeNull();
  });

  it('returns null when a 400 has no errors list', () => {
    expect(mapTitleServerError(apiError(400), 'Doing', kind)).toBeNull();
  });

  it.each([0, 401, 404, 409, 500])('returns null for status %i', (status) => {
    expect(
      mapTitleServerError(
        apiError(status, [{ field: 'title', message: 'x' }]),
        'Doing',
        kind,
      ),
    ).toBeNull();
  });
});
