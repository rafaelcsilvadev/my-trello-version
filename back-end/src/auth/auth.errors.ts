import { DomainError } from '../errors/domain-error';

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super('Email is already registered.');
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password.');
  }
}
