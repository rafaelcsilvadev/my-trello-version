// Type-level tests: `pnpm run test` type-checks this file and fails when an
// assertion does not hold. Nothing here runs.
import type {
  AuthResponse,
  Board,
  Card,
  ChecklistItem,
  Label,
  List,
  Schemas,
  User,
  paths,
} from '../src/index.js';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

export type Tests = [
  // Nullable columns keep null in the type, not just an optional key.
  Expect<Equal<Board['description'], string | null>>,
  Expect<Equal<Board['archivedAt'], string | null>>,
  Expect<Equal<Board['id'], string>>,
  Expect<Equal<User, Schemas['UserResponseDto']>>,
  Expect<Equal<AuthResponse, Schemas['AuthResponseDto']>>,
  Expect<Equal<List, Schemas['ListResponseDto']>>,
  Expect<Equal<Card, Schemas['CardResponseDto']>>,
  Expect<Equal<Label, Schemas['LabelResponseDto']>>,
  Expect<Equal<ChecklistItem, Schemas['ChecklistItemResponseDto']>>,
  // Operations carry their request body and response types.
  Expect<
    Equal<
      paths['/api/v1/boards']['post']['requestBody']['content']['application/json'],
      Schemas['CreateBoardDto']
    >
  >,
  Expect<
    Equal<
      paths['/api/v1/boards/{id}']['get']['responses'][200]['content']['application/json'],
      Board
    >
  >,
  Expect<
    Equal<
      paths['/api/v1/boards/{id}']['get']['parameters']['path'],
      { id: string }
    >
  >,
];

// @ts-expect-error A path the API does not serve is a type error.
export type UnknownPath = paths['/api/v1/unknown'];
