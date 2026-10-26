import type { Schemas } from '@my-trello/api-contract';

export type CreateBoardDto = Schemas['CreateBoardDto'];
export type UpdateBoardDto = Schemas['UpdateBoardDto'];

// UI form state: raw strings as typed; trimming happens in toCreateBody / toUpdateBody.
// `name` maps to the API `title`.
export type BoardFormValues = { name: string; description: string };
export type BoardField = keyof BoardFormValues;
// Values are i18n key suffixes.
export type BoardFieldError =
  'nameRequired' | 'nameTooLong' | 'descriptionTooLong';
export type BoardFieldErrors = Partial<Record<BoardField, BoardFieldError>>;
