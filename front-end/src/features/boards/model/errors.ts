import type { ApiError } from '@/shared/api/api-error';

import type {
  BoardField,
  BoardFieldError,
  BoardFieldErrors,
  BoardFormValues,
} from './types';

// The API only says which field failed, so the message is picked from the value the user sent.
// Keys are the API field names; `title` is the form's `name`.
const SERVER_FIELD_ERRORS: Record<
  string,
  [BoardField, (values: BoardFormValues) => BoardFieldError]
> = {
  title: [
    'name',
    (values) =>
      values.name.trim().length === 0 ? 'nameRequired' : 'nameTooLong',
  ],
  description: ['description', () => 'descriptionTooLong'],
};

// `null` means no field message applies.
export function mapBoardServerErrors(
  err: ApiError,
  values: BoardFormValues,
): BoardFieldErrors | null {
  if (err.status !== 400 || !err.errors) {
    return null;
  }
  const errors: BoardFieldErrors = {};
  for (const { field } of err.errors) {
    if (Object.hasOwn(SERVER_FIELD_ERRORS, field)) {
      const [key, message] = SERVER_FIELD_ERRORS[field];
      errors[key] = message(values);
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}
