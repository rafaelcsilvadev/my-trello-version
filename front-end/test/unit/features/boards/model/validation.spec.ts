import { describe, expect, it } from 'vitest';

import type { BoardFormValues } from '@/features/boards/model/types';
import {
  isDeleteConfirmed,
  toCreateBody,
  toUpdateBody,
  validateBoardForm,
} from '@/features/boards/model/validation';

const VALID: BoardFormValues = { name: 'Roadmap', description: '' };

function errorsFor(values: Partial<BoardFormValues>) {
  return validateBoardForm({ ...VALID, ...values });
}

describe('validateBoardForm', () => {
  it('returns no errors when every field is valid', () => {
    expect(validateBoardForm(VALID)).toEqual({});
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
      expect(errorsFor({ name: ` ${'A'.repeat(101)} ` })).toEqual({
        name: 'nameTooLong',
      });
    });
  });

  describe('description', () => {
    it.each([
      ['empty', ''],
      ['blank', '   '],
      ['1000 chars', 'D'.repeat(1000)],
      ['1000 chars after trimming', `  ${'D'.repeat(1000)}  `],
    ])('accepts %s', (_case, description) => {
      expect(errorsFor({ description })).toEqual({});
    });

    it('rejects 1001 chars after trimming', () => {
      expect(errorsFor({ description: ` ${'D'.repeat(1001)} ` })).toEqual({
        description: 'descriptionTooLong',
      });
    });
  });

  it('reports both fields at once', () => {
    expect(
      validateBoardForm({ name: ' ', description: 'D'.repeat(1001) }),
    ).toEqual({ name: 'nameRequired', description: 'descriptionTooLong' });
  });
});

describe('toCreateBody', () => {
  it('sends the trimmed name and description', () => {
    expect(
      toCreateBody({ name: '  Roadmap  ', description: '  Q4 plan  ' }),
    ).toEqual({ title: 'Roadmap', description: 'Q4 plan' });
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('omits the description when it is %s', (_case, description) => {
    const body = toCreateBody({ name: 'Roadmap', description });
    expect(body).toEqual({ title: 'Roadmap' });
    expect(body).not.toHaveProperty('description');
  });
});

describe('toUpdateBody', () => {
  it('sends the trimmed name and description', () => {
    expect(
      toUpdateBody({ name: '  Roadmap  ', description: '  Q4 plan  ' }),
    ).toEqual({ title: 'Roadmap', description: 'Q4 plan' });
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('clears the description with null when it is %s', (_case, description) => {
    expect(toUpdateBody({ name: 'Roadmap', description })).toEqual({
      title: 'Roadmap',
      description: null,
    });
  });
});

describe('isDeleteConfirmed', () => {
  it('confirms when the typed text equals the title', () => {
    expect(isDeleteConfirmed('Roadmap', 'Roadmap')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['different case', 'roadmap'],
    ['leading space', ' Roadmap'],
    ['trailing space', 'Roadmap '],
    ['prefix only', 'Road'],
  ])('does not confirm when the typed text is %s', (_case, typed) => {
    expect(isDeleteConfirmed(typed, 'Roadmap')).toBe(false);
  });
});
