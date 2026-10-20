import { DomainError } from '../../../src/errors/domain-error';
import { findDomainErrorMapping } from '../../../src/errors/domain-error-mappings';
import {
  LabelNameTakenError,
  LabelNotFoundError,
} from '../../../src/labels/labels.errors';

describe('label domain errors', () => {
  it.each<[string, string, DomainError]>([
    ['LabelNotFoundError', 'Label not found.', new LabelNotFoundError()],
    [
      'LabelNameTakenError',
      'A label with this name already exists on this board.',
      new LabelNameTakenError(),
    ],
  ])('%s is a domain error with its detail message', (name, detail, error) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe(name);
    expect(error.message).toBe(detail);
  });

  it.each<[string, number, string, DomainError]>([
    [
      'LabelNotFoundError',
      404,
      '/problems/label-not-found',
      new LabelNotFoundError(),
    ],
    [
      'LabelNameTakenError',
      409,
      '/problems/label-name-taken',
      new LabelNameTakenError(),
    ],
  ])('%s maps to %i %s', (_name, status, type, error) => {
    expect(findDomainErrorMapping(error)).toMatchObject({ status, type });
  });
});
