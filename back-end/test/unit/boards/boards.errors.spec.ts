import {
  BoardArchivedError,
  BoardNotArchivedError,
  BoardNotFoundError,
} from '../../../src/boards/boards.errors';
import type { DomainError } from '../../../src/errors/domain-error';
import { findDomainErrorMapping } from '../../../src/errors/domain-error-mappings';

describe('board domain errors', () => {
  it.each<[string, DomainError, number, string, string]>([
    [
      'BoardNotFoundError',
      new BoardNotFoundError(),
      404,
      '/problems/board-not-found',
      'Board not found.',
    ],
    [
      'BoardArchivedError',
      new BoardArchivedError(),
      409,
      '/problems/board-archived',
      'Archived boards cannot be changed.',
    ],
    [
      'BoardNotArchivedError',
      new BoardNotArchivedError(),
      409,
      '/problems/board-not-archived',
      'Only archived boards can be deleted.',
    ],
  ])(
    '%s maps to %i %s with its detail message',
    (name, error, status, type, detail) => {
      expect(error.name).toBe(name);
      expect(error.message).toBe(detail);
      expect(findDomainErrorMapping(error)).toMatchObject({ status, type });
    },
  );
});
