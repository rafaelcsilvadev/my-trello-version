# Cards Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/cards/spec.md`
**Design**: `back-end/.specs/features/cards/design.md`
**Status**: Approved

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the existing test layout (`test/unit`, `test/integration`, `test/e2e`), the lists feature tests, the approved design and the spec. Guidelines found: `back-end/.specs/STATE.md` (BE-AD-003, BE-AD-010), `test/jest-*.config.ts` - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services and error mappings (`CardsService`, `cards.errors.ts`) | unit | All branches; 1:1 to spec ACs; guard precedence (board > list > card state; move: card archived > target not found > target archived); every position-arithmetic case (create, same-list move up/down/same/clamp, cross-list move incl. clamp to `m` and empty target, archive, unarchive) | `test/unit/**/*.spec.ts` | `pnpm test` |
| Persistence (entity, migration, repository) | integration | Table, FK cascade list → cards and board → lists → cards, deferred unique and check constraints, `dueDate` round-trip; every repository method incl. owner scoping, row lock, board-query ordering and `shift` keeping `updated_at` | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (controller, DTOs, response mapper, module wiring) | e2e | Every route in scope: happy + edge + error paths, incl. foreign/missing/malformed ids, archived card, archived list, archived board, invalid dates, concurrent position writes | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test` |
| Full | After tasks with integration/e2e tests | `pnpm test && pnpm test:integration && pnpm test:e2e` |
| Build | After each phase | `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` |

---

## Execution Plan

### Phase 1: Persistence

```
T1 → T2
```

### Phase 2: Card rules

```
T2 → T3 → T4 → T5
```

### Phase 3: HTTP endpoints

```
T5 → T6 → T7 → T8 → T9 → T10 → T11
```

---

## Task Breakdown

### T1: Card entity and cards table migration

**What**: `Card` entity, `CreateCards` migration (design SQL: FK cascade to `lists`, `UQ_cards_list_id_position` deferred, `CHK_cards_position_archived`) and `CardsModule` with `TypeOrmModule.forFeature([Card])`, imported by `AppModule`.
**Where**: `back-end/src/database/migrations/1792540800000-CreateCards.ts` (+ `src/cards/card.entity.ts`, `src/cards/cards.module.ts`, `src/app.module.ts`)
**Depends on**: None
**Reuses**: `CreateLists` migration style, `List` entity style, `bootWithDatabase`, `revertAllMigrations`, `lists-table.int-spec.ts`
**Requirement**: CRD-05 (date storage), CRD-28 (database safety net), CRD-40

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration test: table `cards` has columns `id`, `list_id`, `title`, `description`, `due_date`, `done`, `position`, `archived_at`, `created_at`, `updated_at` with the design types, nullability and `done` default `false`
- [x] Integration test: inserting a card with an unknown `list_id` fails on `FK_cards_list_id`; deleting the list deletes its active and archived cards; deleting the board deletes the cards of all its lists (CRD-40)
- [x] Integration test: two active cards with the same `list_id` and `position` fail at `COMMIT`; inside one transaction a temporary duplicate fixed before `COMMIT` succeeds; several archived cards with `position` `NULL` are allowed
- [x] Integration test: `CHK_cards_position_archived` rejects an active card with `position` `NULL`, an archived card with a position, and a negative position
- [x] Integration test: a card saved through the entity with `dueDate` `"2026-11-01"` reads back exactly `"2026-11-01"` (string)
- [x] Integration test: reverting the migration drops `cards`
- [x] Full gate passes; ≥ 8 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(cards): add cards table and entity`

---

### T2: Owner-scoped cards repository

**What**: `CardsRepository` per design (`transaction`, `lockOwnedBoard`, `findOwned`, `findOwnedList`, `findListInBoard`, `listInList`, `listInBoard`, `countActive`, `create`, `shift`, `save`, `delete`), provided by `CardsModule`.
**Where**: `back-end/src/cards/cards.repository.ts`
**Depends on**: T1
**Reuses**: `ListsRepository` (same lock, shift and transaction pattern), `lists.repository.int-spec.ts`
**Requirement**: CRD-07, CRD-08, CRD-09, CRD-10, CRD-25, CRD-28, CRD-38 (data access)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration tests: `findOwned` returns the card for its board's owner and `null` for another owner and for an unknown id; `findOwnedList` same for lists
- [x] `findListInBoard(boardId, listId)` returns the list of that board and `null` for a list of another board (same owner or not)
- [x] `listInList(listId, false)` returns only active cards by `position` ascending; `listInList(listId, true)` returns only archived cards by `archivedAt` descending
- [x] `listInBoard(boardId, false)` returns active cards of active lists only, ordered by list position then card position; `listInBoard(boardId, true)` returns archived cards of active and archived lists by `archivedAt` descending; cards of another board never appear
- [x] `countActive` counts only active cards of that list
- [x] `shift(listId, from, to, ±1)` moves exactly the positions in `[from, to]` of that list, leaves other lists untouched, and keeps `updatedAt` of the shifted rows
- [x] `lockOwnedBoard` returns the board for its owner and `null` for another owner; while one transaction holds the lock, a second one on the same board waits until the first commits
- [x] `transaction` rolls back every write when `work` throws
- [x] Full gate passes; ≥ 14 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `feat(cards): add owner-scoped cards repository`

---

### T3: Card domain errors mapped to Problem Details

**What**: `CardNotFoundError`, `CardArchivedError`, `CardNotArchivedError` (design table: status, `type`, `detail`) added to `DOMAIN_ERROR_MAPPINGS`.
**Where**: `back-end/src/cards/cards.errors.ts` (+ `src/errors/domain-error-mappings.ts`)
**Depends on**: T2
**Reuses**: `DomainError`, `DOMAIN_ERROR_MAPPINGS` (BE-AD-007), `lists.errors.spec.ts` style
**Requirement**: CRD-19, CRD-27, CRD-34, CRD-38 (error contract)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests: `findDomainErrorMapping` returns `404` `/problems/card-not-found`, `409` `/problems/card-archived`, `409` `/problems/card-not-archived` for the three errors; each error carries the design `detail` message
- [ ] Quick gate passes; ≥ 3 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cards): add card domain errors`

---

### T4: Cards service: access, reads, create and edit

**What**: `CardsService` with `create`, `listInList`, `listInBoard`, `findOwned`, `update` and the shared `writeLocked` flow (lookup → board lock → re-read card and list → board archived → list archived), per design.
**Where**: `back-end/src/cards/cards.service.ts`
**Depends on**: T3
**Reuses**: `ListsService.writeLocked` flow, `CardsRepository`, `ListsService` and `BoardsService` (mocked in unit tests; the mocked `transaction` calls `work` with the same mock), `isUUID`
**Requirement**: CRD-01, CRD-06, CRD-07, CRD-08, CRD-09, CRD-10, CRD-12, CRD-13, CRD-14, CRD-16, CRD-18, CRD-19, CRD-35, CRD-36, CRD-38

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests: `findOwned` throws `CardNotFoundError` for a non-UUID id without calling the repository, and for a `null` result
- [ ] `create` throws `ListNotFoundError` for a non-UUID or unknown list, and when the board lock or the re-read list returns `null`; throws `BoardArchivedError` before `ListArchivedError`; never creates on an error; otherwise creates at `position = countActive(listId)` with the given `description` and `dueDate` (`null` when absent)
- [ ] `listInList` calls `ListsService.findOwned` before reading; `listInBoard` calls `BoardsService.findOwned` before reading; both pass `archived` through
- [ ] `writeLocked` (exercised through `update`): `CardNotFoundError` when the lock or a re-read returns `null`; `BoardArchivedError` before `ListArchivedError` before any card-state check; nothing saved on an error
- [ ] `update` saves only the given fields (`title`, `description`, `dueDate`, `done`), including `null` for `description` and `dueDate`; returns the card without saving for `{}`; throws `CardArchivedError` on an archived card
- [ ] Quick gate passes; ≥ 18 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cards): add cards service for access, create and edit`

---

### T5: Cards service: move, archive, unarchive and delete

**What**: `CardsService.move` (same-list and cross-list), `archive`, `unarchive` and `remove` on top of `writeLocked`, with the design position arithmetic and move precedence.
**Where**: `back-end/src/cards/cards.service.ts` (modify)
**Depends on**: T4
**Reuses**: `ListsService.move` / `archive` / `unarchive` / `remove` arithmetic, `writeLocked` from T4
**Requirement**: CRD-20, CRD-21, CRD-22, CRD-23, CRD-25, CRD-26, CRD-27, CRD-29, CRD-30, CRD-31, CRD-32, CRD-33, CRD-34, CRD-35, CRD-36

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests, same-list move: `k < i` shifts `[k, i-1]` by `+1`; `k > i` shifts `[i+1, k]` by `-1`; `k > n-1` clamps to `n-1`; `k === i` (with or without `listId` equal to the card's list) returns without shift or save
- [ ] Unit tests, cross-list move: shifts the source `[i+1, n-1]` by `-1` and the target `[k, m-1]` by `+1`, saves `listId = target`, `position = k`; `k > m` clamps to `m`; empty target → `position` `0` with no target shift
- [ ] Move precedence: archived card → `CardArchivedError` before the target lookup; target not in the board → `ListNotFoundError`; archived target → `ListArchivedError`; nothing shifted or saved on any error
- [ ] `archive` shifts `[i+1, n-1]` by `-1`, sets `position` `null` and `archivedAt`; already archived → returned without save; `unarchive` sets `position = countActive` and `archivedAt` `null`; already active → returned without save
- [ ] `remove` throws `CardNotArchivedError` on an active card without deleting; deletes an archived card
- [ ] Every action of this task inherits the `writeLocked` guards: `BoardArchivedError` and `ListArchivedError` before card-state checks (one test per action)
- [ ] Quick gate passes; ≥ 20 new unit tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(cards): add card move and archive rules`

---

### T6: Create card endpoint

**What**: `CardsController` (no prefix) with `POST /lists/:listId/cards`, `CreateCardDto`, `CardResponseDto` + `toCardResponse`; `ListsModule` exports `ListsService`; `CardsModule` imports `ListsModule` and `BoardsModule` and provides service and controller.
**Where**: `back-end/src/cards/cards.controller.ts` (+ `src/cards/dto/create-card.dto.ts`, `src/cards/dto/card-response.dto.ts`, `src/cards/cards.module.ts`, `src/lists/lists.module.ts`)
**Depends on**: T5
**Reuses**: `trim`, `trimToNull` from `create-board.dto.ts`, `toListResponse` pattern, `@CurrentUser()`, `createTestApp`, `create-list.e2e-spec.ts`
**Requirement**: CRD-01, CRD-02, CRD-03, CRD-04, CRD-05, CRD-06, CRD-28 (concurrent creates), CRD-35 (create), CRD-36 (create), CRD-39

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: valid body → `201` with exactly `{ id, listId, title, description, dueDate, done: false, position, archivedAt: null, createdAt, updatedAt }`; `"  Write spec  "` stored as `"Write spec"`; second card gets `position` `1`
- [ ] e2e: `description` `"  notes  "` → `"notes"`; `"   "`, missing or `null` → `null`; 5000 chars → `201`; 5001 chars or a number → `400` field `description`
- [ ] e2e: `dueDate` `"2026-11-01"` → `"2026-11-01"`; `"2028-02-29"` → `201`; `"2026-02-30"`, `"2026-2-1"`, `"2026-11-01T10:00:00Z"`, `20261101` → `400` field `dueDate`; missing or `null` → `null`
- [ ] e2e: `title` missing, non-string, `null`, `"   "`, 101 chars → `400` field `title` and no row; 100 chars → `201`
- [ ] e2e: unknown properties (`done`, `position`) → `400`; no token → `401`
- [ ] e2e: unknown, foreign and malformed `listId` → `404` `/problems/list-not-found` with identical bodies; archived list → `409` `/problems/list-archived`; list of an archived board → `409` `/problems/board-archived` (also when the list is archived); no row in any case
- [ ] e2e: 10 concurrent creates on one list all return `201` and the list's active cards hold positions `0..9` exactly once
- [ ] Full gate passes; ≥ 16 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): add create card endpoint`

---

### T7: List and read card endpoints

**What**: `GET /lists/:listId/cards` and `GET /boards/:boardId/cards` with `ListCardsQueryDto` (`archived` `IsIn(['true','false'])`), and `GET /cards/:id`.
**Where**: `back-end/src/cards/cards.controller.ts` (+ `src/cards/dto/list-cards-query.dto.ts`)
**Depends on**: T6
**Reuses**: `ListListsQueryDto` pattern, `read-lists.e2e-spec.ts`, `createTestApp`
**Requirement**: CRD-06 (GET), CRD-07, CRD-08, CRD-09, CRD-10, CRD-11, CRD-12, CRD-13, CRD-38 (GET)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: list without cards → `[]`; active cards by `position` ascending; `archived=false` same as default; works on an archived list and on a list of an archived board
- [ ] e2e: list `archived=true` → only archived cards, `position` `null`, newest `archivedAt` first
- [ ] e2e: board route with lists A (pos 0) and B (pos 1) → A's active cards then B's; cards of an archived list absent; works on an archived board
- [ ] e2e: board `archived=true` → archived cards of every list (incl. an archived list), newest `archivedAt` first
- [ ] e2e: `archived=yes` → `400` field `archived` on both collection routes
- [ ] e2e: unknown / foreign / malformed `listId` → `404` `/problems/list-not-found`; unknown / foreign / malformed `boardId` → `404` `/problems/board-not-found`
- [ ] e2e: `GET /cards/:id` → `200` for an active card, an archived card, a card of an archived list and of an archived board; unknown / foreign / malformed id → `404` `/problems/card-not-found` with identical bodies
- [ ] Full gate passes; ≥ 14 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): add list and read card endpoints`

---

### T8: Edit card endpoint

**What**: `PATCH /cards/:id` with `UpdateCardDto` (`title` and `done` via `ValidateIf` so `null` is rejected; `description` and `dueDate` nullable).
**Where**: `back-end/src/cards/cards.controller.ts` (+ `src/cards/dto/update-card.dto.ts`)
**Depends on**: T7
**Reuses**: `UpdateListDto` pattern, `update-list.e2e-spec.ts`, `createTestApp`
**Requirement**: CRD-14, CRD-15, CRD-16, CRD-17, CRD-18, CRD-19, CRD-35 (PATCH), CRD-36 (PATCH), CRD-38 (PATCH)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: `{ done: true, dueDate: "2026-12-24" }` → `200`, both set, later `updatedAt`; then `{ dueDate: null }` → `dueDate` `null`, `done` still `true`; `{ description: "  " }` → `null`; `done` can be `true` without `dueDate`
- [ ] e2e: `{}` → `200` with identical body including `updatedAt`
- [ ] e2e: `title` `null` / `""` / 101 chars → `400` field `title`; `done` `null` / `"true"` → `400` field `done`; `dueDate` `"2026-02-30"` → `400` field `dueDate`; `description` 5001 chars → `400` field `description`; unknown property (`listId`) → `400`; card unchanged in every case
- [ ] e2e: archived card → `409` `/problems/card-archived`; card of an archived list → `409` `/problems/list-archived`; card of an archived board → `409` `/problems/board-archived`; all unchanged
- [ ] e2e: unknown / foreign / malformed id → `404` `/problems/card-not-found` with identical bodies; foreign card unchanged
- [ ] Full gate passes; ≥ 12 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): add edit card endpoint`

---

### T9: Move card endpoint

**What**: `POST /cards/:id/move` with `MoveCardDto` (`listId` `@IsOptional` + `@IsUUID`, `position` `@IsInt`, `@Min(0)`), `@HttpCode(200)`.
**Where**: `back-end/src/cards/cards.controller.ts` (+ `src/cards/dto/move-card.dto.ts`)
**Depends on**: T8
**Reuses**: `move-list.e2e-spec.ts`, `createTestApp`
**Requirement**: CRD-20, CRD-21, CRD-22, CRD-23, CRD-24, CRD-25, CRD-26, CRD-27, CRD-28 (concurrent moves), CRD-35 (move), CRD-36 (move), CRD-38 (move)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e, same list: cards 1, 2, 3; move 3 to `0` → `[3, 1, 2]`; move 3 to `2` → `[1, 2, 3]`; shifted cards keep `updatedAt`; `listId` equal to the card's list behaves the same
- [ ] e2e, cross list: A `[1, 2, 3]`, B `[4]`; move 1 to `{ listId: B, position: 0 }` → `200`, `listId` B, A `[2, 3]` at `0..1`, B `[1, 4]` at `0..1`; `position` `99` → end of the target; into an empty list → `position` `0`
- [ ] e2e: same place → `200` with identical body including `updatedAt`
- [ ] e2e: `position` missing, `-1`, `1.5`, `"2"` → `400` field `position`; `listId` `"abc"` → `400` field `listId`; order unchanged
- [ ] e2e: `listId` unknown, of another user's board, of another board of the same user → `404` `/problems/list-not-found` with identical bodies; archived target → `409` `/problems/list-archived`; nothing moved
- [ ] e2e: archived card → `409` `/problems/card-archived`; card of an archived list → `409` `/problems/list-archived`; card of an archived board → `409` `/problems/board-archived`; unknown / foreign / malformed id → `404` `/problems/card-not-found`
- [ ] e2e: 10 concurrent moves (same-list and cross-list) on two lists of one board all return `200` and both lists hold positions `0..n-1` exactly once
- [ ] Full gate passes; ≥ 14 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): add move card endpoint`

---

### T10: Archive and unarchive card endpoints

**What**: `POST /cards/:id/archive` and `POST /cards/:id/unarchive`, both `@HttpCode(200)`.
**Where**: `back-end/src/cards/cards.controller.ts`
**Depends on**: T9
**Reuses**: `archive-list.e2e-spec.ts`, `createTestApp`
**Requirement**: CRD-29, CRD-30, CRD-31, CRD-32, CRD-35 (archive, unarchive), CRD-36 (archive, unarchive), CRD-38 (archive, unarchive)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: archive the first of three cards → `200`, `position` `null`, `archivedAt` between request start and end; the others move to `0` and `1`; it appears in `?archived=true`
- [ ] e2e: archive again → `200` with the original `archivedAt`
- [ ] e2e: unarchive → `200`, `archivedAt` `null`, `position` `2` (end); unarchive an active card → `200` with identical body including `updatedAt`
- [ ] e2e: both actions on a card of an archived list → `409` `/problems/list-archived`; of an archived board → `409` `/problems/board-archived`; card unchanged
- [ ] e2e: unknown / foreign / malformed id → `404` `/problems/card-not-found` on both routes
- [ ] Full gate passes; ≥ 10 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): add archive and unarchive card endpoints`

---

### T11: Delete card endpoint

**What**: `DELETE /cards/:id` with `@HttpCode(204)`, plus the feature-wide e2e tests: list archive/unarchive leaves cards unchanged, list delete cascades, mixed concurrent writes, cross-user over every card route, lifecycle.
**Where**: `back-end/src/cards/cards.controller.ts`
**Depends on**: T10
**Reuses**: `delete-list.e2e-spec.ts`, `createTestApp`
**Requirement**: CRD-28 (mixed concurrency), CRD-33, CRD-34, CRD-35 (DELETE), CRD-36 (DELETE), CRD-37, CRD-38, CRD-39, CRD-40

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: active card → `409` `/problems/card-not-archived`, card still readable
- [ ] e2e: archived card → `204` with empty body; `GET /cards/:id` then `404`; remaining active positions unchanged
- [ ] e2e: archived card of an archived list → `409` `/problems/list-archived`; of an archived board → `409` `/problems/board-archived`; card still exists
- [ ] e2e: archiving then unarchiving a list leaves its cards' `position`, `archivedAt` and `updatedAt` unchanged (CRD-37); deleting an archived list makes its cards `404` (CRD-40)
- [ ] e2e: concurrent create, same-list move, cross-list move, archive and unarchive on one board in one `Promise.all` → every list holds positions `0..n-1` exactly once
- [ ] e2e: user B calls every `/cards/:id` route and the three collection routes on user A's data → `404`; user A's cards unchanged; no token → `401` on every card route
- [ ] e2e: lifecycle create → move across lists → mark done → archive → delete passes in one test with positions `0..n-1` after each step
- [ ] Full gate passes; ≥ 9 new e2e tests

**Tests**: e2e
**Gate**: build

**Commit**: `feat(cards): add delete card endpoint`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2
Phase 2:  T3 → T4 → T5
Phase 3:  T6 → T7 → T8 → T9 → T10 → T11
```

Execution follows the pair-programming flow: one task per branch and PR, review together after each.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Entity + migration + module | 1 table | ⚠️ Cohesive (entity, migration and module registration describe the same table) |
| T2: Cards repository | 1 class | ✅ Granular |
| T3: Card domain errors | 3 errors + mapping entries | ⚠️ Cohesive (one mapping mechanism) |
| T4: Cards service (access, reads, create, edit) | 1 class, first half | ✅ Granular |
| T5: Cards service (move, archive, delete) | same class, position rules | ✅ Granular |
| T6: Create endpoint | 1 endpoint + its DTOs + module wiring | ✅ Granular |
| T7: List + read endpoints | 3 read endpoints + query DTO | ⚠️ Cohesive (all reads share the not-found and `archived` contracts) |
| T8: Edit endpoint | 1 endpoint + its DTO | ✅ Granular |
| T9: Move endpoint | 1 endpoint + its DTO | ✅ Granular |
| T10: Archive + unarchive | 2 mirror actions | ⚠️ Cohesive (one state transition, both directions) |
| T11: Delete endpoint | 1 endpoint + feature-wide e2e | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Entity + migration + module (persistence) | integration | integration | ✅ OK |
| T2 | Repository (persistence) | integration | integration | ✅ OK |
| T3 | Error classes + mappings | unit | unit | ✅ OK |
| T4 | Service | unit | unit | ✅ OK |
| T5 | Service | unit | unit | ✅ OK |
| T6 | Controller + DTOs + mapper + wiring (HTTP) | e2e | e2e | ✅ OK |
| T7 | Controller + query DTO (HTTP) | e2e | e2e | ✅ OK |
| T8 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T9 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T10 | Controller (HTTP) | e2e | e2e | ✅ OK |
| T11 | Controller (HTTP) | e2e | e2e | ✅ OK |
