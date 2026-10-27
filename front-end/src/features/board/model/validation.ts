import type { ItemFieldError } from './types';

const TITLE_MAX_LENGTH = 100;

// Checked trimmed, the same value the request body sends.
function validateTitle(
  raw: string,
  required: ItemFieldError,
  tooLong: ItemFieldError,
): ItemFieldError | null {
  const title = raw.trim();
  if (title.length === 0) return required;
  if (title.length > TITLE_MAX_LENGTH) return tooLong;
  return null;
}

export function validateColumnName(raw: string): ItemFieldError | null {
  return validateTitle(raw, 'columnNameRequired', 'columnNameTooLong');
}

export function validateCardTitle(raw: string): ItemFieldError | null {
  return validateTitle(raw, 'cardTitleRequired', 'cardTitleTooLong');
}
