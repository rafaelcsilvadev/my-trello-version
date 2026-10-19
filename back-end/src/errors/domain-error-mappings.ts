import { HttpStatus } from '@nestjs/common';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
} from '../auth/auth.errors';
import {
  BoardArchivedError,
  BoardNotArchivedError,
  BoardNotFoundError,
} from '../boards/boards.errors';
import {
  ListArchivedError,
  ListNotArchivedError,
  ListNotFoundError,
} from '../lists/lists.errors';
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
  {
    error: BoardNotFoundError,
    status: HttpStatus.NOT_FOUND,
    type: '/problems/board-not-found',
  },
  {
    error: BoardArchivedError,
    status: HttpStatus.CONFLICT,
    type: '/problems/board-archived',
  },
  {
    error: BoardNotArchivedError,
    status: HttpStatus.CONFLICT,
    type: '/problems/board-not-archived',
  },
  {
    error: ListNotFoundError,
    status: HttpStatus.NOT_FOUND,
    type: '/problems/list-not-found',
  },
  {
    error: ListArchivedError,
    status: HttpStatus.CONFLICT,
    type: '/problems/list-archived',
  },
  {
    error: ListNotArchivedError,
    status: HttpStatus.CONFLICT,
    type: '/problems/list-not-archived',
  },
];

export function findDomainErrorMapping(
  error: DomainError,
): DomainErrorMapping | undefined {
  return DOMAIN_ERROR_MAPPINGS.find(
    (mapping) => error instanceof mapping.error,
  );
}
