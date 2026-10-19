import { DomainError } from '../errors/domain-error';

export class ListNotFoundError extends DomainError {
  constructor() {
    super('List not found.');
  }
}

export class ListArchivedError extends DomainError {
  constructor() {
    super('Archived lists cannot be changed.');
  }
}

export class ListNotArchivedError extends DomainError {
  constructor() {
    super('Only archived lists can be deleted.');
  }
}
