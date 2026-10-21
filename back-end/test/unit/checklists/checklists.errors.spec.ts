import { ChecklistItemNotFoundError } from '../../../src/checklists/checklists.errors';
import { DomainError } from '../../../src/errors/domain-error';
import { findDomainErrorMapping } from '../../../src/errors/domain-error-mappings';

describe('checklist domain errors', () => {
  it('ChecklistItemNotFoundError is a domain error with its detail message', () => {
    const error = new ChecklistItemNotFoundError();

    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe('ChecklistItemNotFoundError');
    expect(error.message).toBe('Checklist item not found.');
  });

  it('ChecklistItemNotFoundError maps to 404 /problems/checklist-item-not-found', () => {
    expect(
      findDomainErrorMapping(new ChecklistItemNotFoundError()),
    ).toMatchObject({
      status: 404,
      type: '/problems/checklist-item-not-found',
    });
  });
});
