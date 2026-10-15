import { HttpStatus } from '@nestjs/common';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
} from '../auth/auth.errors';
import type { DomainError } from './domain-error';

export type DomainErrorMapping = {
  error: abstract new (...args: never[]) => DomainError;
  status: number;
  type: string;
};

// The only place where domain errors meet HTTP (BE-AD-007).
export const DOMAIN_ERROR_MAPPINGS: ReadonlyArray<DomainErrorMapping> = [
  {
    error: EmailAlreadyRegisteredError,
    status: HttpStatus.CONFLICT,
    type: '/problems/email-already-registered',
  },
  {
    error: InvalidCredentialsError,
    status: HttpStatus.UNAUTHORIZED,
    type: '/problems/invalid-credentials',
  },
];

export function findDomainErrorMapping(
  error: DomainError,
): DomainErrorMapping | undefined {
  return DOMAIN_ERROR_MAPPINGS.find(
    (mapping) => error instanceof mapping.error,
  );
}
