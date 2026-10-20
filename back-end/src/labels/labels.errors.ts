import { DomainError } from '../errors/domain-error';

export class LabelNotFoundError extends DomainError {
  constructor() {
    super('Label not found.');
  }
}

export class LabelNameTakenError extends DomainError {
  constructor() {
    super('A label with this name already exists on this board.');
  }
}
