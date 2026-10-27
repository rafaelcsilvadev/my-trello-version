import type { ApiError } from '@/shared/api/api-error';

import type { ItemFieldError } from './types';

const TITLE_ERRORS: Record<
  'column' | 'card',
  { required: ItemFieldError; tooLong: ItemFieldError }
> = {
  column: { required: 'columnNameRequired', tooLong: 'columnNameTooLong' },
  card: { required: 'cardTitleRequired', tooLong: 'cardTitleTooLong' },
};

// The API only says the title failed, so the message is picked from the text the user sent.
// `null` means no field message applies.
export function mapTitleServerError(
  err: ApiError,
  raw: string,
  kind: 'column' | 'card',
): ItemFieldError | null {
  if (err.status !== 400 || !err.errors?.some((e) => e.field === 'title')) {
    return null;
  }
  const { required, tooLong } = TITLE_ERRORS[kind];
  return raw.trim().length === 0 ? required : tooLong;
}
