import type {
  BoardFieldErrors,
  BoardFormValues,
  CreateBoardDto,
  UpdateBoardDto,
} from './types';

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

// Both fields are checked trimmed, the same values the request bodies send.
export function validateBoardForm(values: BoardFormValues): BoardFieldErrors {
  const errors: BoardFieldErrors = {};
  const name = values.name.trim();
  if (name.length === 0) {
    errors.name = 'nameRequired';
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = 'nameTooLong';
  }
  if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = 'descriptionTooLong';
  }
  return errors;
}

export function toCreateBody(values: BoardFormValues): CreateBoardDto {
  const title = values.name.trim();
  const description = values.description.trim();
  return description.length > 0 ? { title, description } : { title };
}

// An empty description is sent as `null` so the API clears the stored one.
export function toUpdateBody(values: BoardFormValues): UpdateBoardDto {
  const description = values.description.trim();
  return {
    title: values.name.trim(),
    description: description.length > 0 ? description : null,
  };
}

// Exact match: case and spaces count, so the user retypes the title as shown.
export function isDeleteConfirmed(typed: string, title: string): boolean {
  return typed === title;
}
