# @my-trello/api-contract

TypeScript types for the back-end HTTP API, generated from its OpenAPI document. Types only: there is no runtime code.

## Usage

Add the package to an app in the workspace:

```bash
pnpm --filter <app> add @my-trello/api-contract@workspace:*
```

```ts
import type { Board, Schemas, paths } from '@my-trello/api-contract';

type CreateBoardBody = Schemas['CreateBoardDto'];
type GetBoardResponse =
  paths['/api/v1/boards/{id}']['get']['responses'][200]['content']['application/json'];
```

`paths` and `operations` also work with typed clients such as `openapi-fetch`.

## Regenerating

After changing a controller or DTO in the back-end:

```bash
pnpm --filter @my-trello/api-contract run generate
```

This writes `openapi.json` (via the back-end `openapi:export` script, which needs no database) and `src/schema.d.ts`. Commit both. CI fails when they are out of date.

Never edit `openapi.json` or `src/schema.d.ts` by hand.

## Tests

```bash
pnpm --filter @my-trello/api-contract run test
```

Type-checks `test/contract.test.ts`, which asserts the shape of the main types.
