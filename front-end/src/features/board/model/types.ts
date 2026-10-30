import type { Schemas } from '@my-trello/api-contract';

export type Board = Schemas['BoardResponseDto'];
export type List = Schemas['ListResponseDto'];
export type Card = Schemas['CardResponseDto'];
export type Label = Schemas['LabelResponseDto'];
export type CreateListDto = Schemas['CreateListDto'];
export type UpdateListDto = Schemas['UpdateListDto'];
export type CreateCardDto = Schemas['CreateCardDto'];
export type UpdateCardDto = Schemas['UpdateCardDto'];
export type MoveCardDto = Schemas['MoveCardDto'];
export type MoveListDto = Schemas['MoveListDto'];
export type ChecklistItem = Schemas['ChecklistItemResponseDto'];
export type CreateChecklistItemDto = Schemas['CreateChecklistItemDto'];
export type UpdateChecklistItemDto = Schemas['UpdateChecklistItemDto'];

// One active column on screen.
export type Column = { list: List; cards: Card[] };

// A card in the virtual "Arquivadas" column.
export type ArchivedCardItem = { card: Card; fromTitle: string };

// An item of the archived columns section; `cardCount` is `undefined` while loading.
export type ArchivedColumnItem = { list: List; cardCount: number | undefined };

// The calendar date the screen treats as today.
export type DateParts = { year: number; month: number; day: number };

// Values are i18n key suffixes.
export type ItemFieldError =
  | 'columnNameRequired'
  | 'columnNameTooLong'
  | 'cardTitleRequired'
  | 'cardTitleTooLong';
