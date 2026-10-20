import {
  CardArchivedError,
  CardNotArchivedError,
  CardNotFoundError,
} from '../../../src/cards/cards.errors';
import type { DomainError } from '../../../src/errors/domain-error';
import { findDomainErrorMapping } from '../../../src/errors/domain-error-mappings';

describe('card domain errors', () => {
  it.each<[string, number, string, string, DomainError]>([
    [
      'CardNotFoundError',
      404,
      '/problems/card-not-found',
      'Card not found.',
      new CardNotFoundError(),
    ],
    [
      'CardArchivedError',
      409,
      '/problems/card-archived',
      'Archived cards cannot be changed.',
      new CardArchivedError(),
    ],
    [
      'CardNotArchivedError',
      409,
      '/problems/card-not-archived',
      'Only archived cards can be deleted.',
      new CardNotArchivedError(),
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
