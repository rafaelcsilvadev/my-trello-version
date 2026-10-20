import { DomainError } from '../errors/domain-error';

export class CardNotFoundError extends DomainError {
  constructor() {
    super('Card not found.');
  }
}

export class CardArchivedError extends DomainError {
  constructor() {
    super('Archived cards cannot be changed.');
  }
}

export class CardNotArchivedError extends DomainError {
  constructor() {
    super('Only archived cards can be deleted.');
  }
}
