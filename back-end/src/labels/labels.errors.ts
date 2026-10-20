import { DomainError } from '../errors/domain-error';

export class LabelNameTakenError extends DomainError {
  constructor() {
    super('A label with this name already exists on this board.');
  }
}
