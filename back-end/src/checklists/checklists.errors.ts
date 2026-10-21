import { DomainError } from '../errors/domain-error';

export class ChecklistItemNotFoundError extends DomainError {
  constructor() {
    super('Checklist item not found.');
  }
}
