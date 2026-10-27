import type { ApiError } from './api-error';

// How a screen reacts to a failed create, edit, archive, restore or delete.
export type SaveFailureKind =
  'retry' | 'conflict' | 'notFound' | 'invalid' | 'sessionExpired';

export function saveFailureKind(err: ApiError): SaveFailureKind {
  switch (err.status) {
    case 401:
      return 'sessionExpired';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 400:
      return err.errors && err.errors.length > 0 ? 'invalid' : 'retry';
    default:
      return 'retry';
  }
}
