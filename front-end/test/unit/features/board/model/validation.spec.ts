import { describe, expect, it } from 'vitest';

import {
  validateCardTitle,
  validateColumnName,
} from '@/features/board/model/validation';

describe.each([
  [
    'validateColumnName',
    validateColumnName,
    'columnNameRequired',
    'columnNameTooLong',
  ],
  [
    'validateCardTitle',
    validateCardTitle,
    'cardTitleRequired',
    'cardTitleTooLong',
  ],
] as const)('%s', (_name, validate, required, tooLong) => {
  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('is required when %s', (_case, raw) => {
    expect(validate(raw)).toBe(required);
  });

  it.each([
    ['1 char', 'A'],
    ['100 chars', 'A'.repeat(100)],
    ['100 chars after trimming', `  ${'A'.repeat(100)}  `],
  ])('accepts %s', (_case, raw) => {
    expect(validate(raw)).toBeNull();
  });

  it('rejects 101 chars after trimming', () => {
    expect(validate(` ${'A'.repeat(101)} `)).toBe(tooLong);
  });
});
