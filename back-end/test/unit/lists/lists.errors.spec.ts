import type { DomainError } from '../../../src/errors/domain-error';
import { findDomainErrorMapping } from '../../../src/errors/domain-error-mappings';
import {
  ListArchivedError,
  ListNotArchivedError,
  ListNotFoundError,
} from '../../../src/lists/lists.errors';

describe('list domain errors', () => {
  it.each<[string, number, string, string, DomainError]>([
    [
      'ListNotFoundError',
      404,
      '/problems/list-not-found',
      'List not found.',
      new ListNotFoundError(),
    ],
    [
      'ListArchivedError',
      409,
      '/problems/list-archived',
      'Archived lists cannot be changed.',
      new ListArchivedError(),
    ],
    [
      'ListNotArchivedError',
      409,
      '/problems/list-not-archived',
      'Only archived lists can be deleted.',
      new ListNotArchivedError(),
    ],
  ])(
    '%s maps to %i %s with its detail message',
    (name, status, type, detail, error) => {
      expect(error.name).toBe(name);
      expect(error.message).toBe(detail);
      expect(findDomainErrorMapping(error)).toMatchObject({ status, type });
    },
  );
});
