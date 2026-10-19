import { DomainError } from '../errors/domain-error';

export class BoardNotFoundError extends DomainError {
  constructor() {
    super('Board not found.');
  }
}

export class BoardArchivedError extends DomainError {
  constructor() {
    super('Archived boards cannot be changed.');
  }
}

export class BoardNotArchivedError extends DomainError {
  constructor() {
    super('Only archived boards can be deleted.');
  }
}
