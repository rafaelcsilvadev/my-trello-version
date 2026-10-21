// Types of the back-end HTTP API. schema.d.ts is generated from openapi.json
// by `pnpm run generate`; never edit either file by hand.
import type { components } from './schema.js';

export type { components, operations, paths } from './schema.js';

export type Schemas = components['schemas'];

export type User = Schemas['UserResponseDto'];
export type AuthResponse = Schemas['AuthResponseDto'];
export type Board = Schemas['BoardResponseDto'];
export type List = Schemas['ListResponseDto'];
export type Card = Schemas['CardResponseDto'];
export type Label = Schemas['LabelResponseDto'];
export type ChecklistItem = Schemas['ChecklistItemResponseDto'];
export type ChecklistProgress = Schemas['ChecklistProgressDto'];
