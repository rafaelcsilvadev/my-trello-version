# Lists Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/lists/spec.md`
**Design**: `back-end/.specs/features/lists/design.md`
**Status**: Approved

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the existing test layout (`test/unit`, `test/integration`, `test/e2e`), the approved design and the spec. Guidelines found: `back-end/.specs/STATE.md` (BE-AD-003, BE-AD-009), `test/jest-*.config.ts` - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services and error mappings (`ListsService`, `lists.errors.ts`) | unit | All branches; 1:1 to spec ACs; guard precedence; every position-arithmetic case (create, move up/down/same/clamp, archive, unarchive) | `test/unit/**/*.spec.ts` | `pnpm test` |
| Persistence (entity, migration, repository) | integration | Table, FK cascade, deferred unique and check constraints; every repository method incl. owner scoping, row lock and `shift` keeping `updated_at` | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (controller, DTOs, response mapper, module wiring) | e2e | Every route in scope: happy + edge + error paths, incl. foreign/missing/malformed id, archived list, archived board, concurrent position writes | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |

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

### Phase 2: List rules

```
T2 → T3 → T4
```

### Phase 3: HTTP endpoints

```
T4 → T5 → T6 → T7 → T8 → T9 → T10
```

---

## Task Breakdown

### T1: List entity and lists table migration

**What**: `List` entity, `CreateLists` migration (design SQL: FK cascade, `UQ_lists_board_id_position` deferred, `CHK_lists_position_archived`) and `ListsModule` with `TypeOrmModule.forFeature([List])`, imported by `AppModule`.
**Where**: `back-end/src/database/migrations/<ts>-CreateLists.ts` (+ `src/lists/list.entity.ts`, `src/lists/lists.module.ts`, `src/app.module.ts`)
**Depends on**: None
**Reuses**: `CreateBoards` migration style, `Board` entity style, `bootWithDatabase`, `revertAllMigrations`
**Requirement**: LST-19 (database safety net), LST-29

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration test: table `lists` has columns `id`, `board_id`, `title`, `position`, `archived_at`, `created_at`, `updated_at` with the design types and nullability
- [x] Integration test: inserting a list with an unknown `board_id` fails on `FK_lists_board_id`; deleting the board deletes its lists (LST-29)
- [x] Integration test: two active lists with the same `board_id` and `position` fail at `COMMIT`; inside one transaction a temporary duplicate that is fixed before `COMMIT` succeeds; several archived lists with `position` `NULL` are allowed
- [x] Integration test: `CHK_lists_position_archived` rejects an active list with `position` `NULL`, an archived list with a position, and a negative position (active or archived)
- [x] Integration test: reverting the migration drops `lists`
- [x] Full gate passes; ≥ 6 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(lists): add lists table and entity`

---

### T2: Owner-scoped lists repository

**What**: `ListsRepository` per design (`transaction`, `lockOwnedBoard`, `findOwned`, `listInBoard`, `countActive`, `create`, `shift`, `save`, `delete`), provided by `ListsModule`.
**Where**: `back-end/src/lists/lists.repository.ts`
**Depends on**: T1
**Reuses**: `BoardsRepository` owner-scoping style, `bootWithDatabase`
**Requirement**: LST-06, LST-07, LST-19, LST-27 (data access)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration tests: `findOwned` returns the list for its board's owner and `null` for another owner and for an unknown id
- [ ] `listInBoard(boardId, false)` returns only active lists by `position` ascending; `listInBoard(boardId, true)` returns only archived lists by `archivedAt` descending
- [ ] `countActive` counts only active lists of that board
- [ ] `shift(boardId, from, to, ±1)` moves exactly the positions in `[from, to]` of that board, leaves other boards untouched, and keeps `updatedAt` of the shifted rows
- [ ] `lockOwnedBoard` returns the board for its owner and `null` for another owner; while one transaction holds the lock, a second `lockOwnedBoard` on the same board waits until the first commits
- [ ] `transaction` rolls back every write when `work` throws
- [ ] Full gate passes; ≥ 10 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `feat(lists): add owner-scoped lists repository`

---

### T3: List domain errors mapped to Problem Details

**What**: `ListNotFoundError`, `ListArchivedError`, `ListNotArchivedError` (design table: status, `type`, `detail`) added to `DOMAIN_ERROR_MAPPINGS`.
**Where**: `back-end/src/lists/lists.errors.ts` (+ `src/errors/domain-error-mappings.ts`)
**Depends on**: T2
**Reuses**: `DomainError`, `DOMAIN_ERROR_MAPPINGS` (BE-AD-007), `boards.errors.spec.ts` style
**Requirement**: LST-13, LST-18, LST-25, LST-27 (error contract)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests: `findDomainErrorMapping` returns `404` `/problems/list-not-found`, `409` `/problems/list-archived`, `409` `/problems/list-not-archived` for the three errors; each error carries the design `detail` message
- [ ] Quick gate passes; ≥ 3 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(lists): add list domain errors`

---

### T4: Lists service with position and archive rules

**What**: `ListsService` (`create`, `listInBoard`, `findOwned`, `update`, `move`, `archive`, `unarchive`, `remove`) per design: write flow under the board lock, guard precedence, position arithmetic, no `save` when nothing changes.
**Where**: `back-end/src/lists/lists.service.ts`
**Depends on**: T3
**Reuses**: `ListsRepository` and `BoardsService` (mocked in unit tests; the mocked `transaction` calls `work` with the same mock), `isUUID` from `class-validator`, `BoardsService` no-op pattern
**Requirement**: LST-01, LST-04, LST-05, LST-09, LST-10, LST-12, LST-13, LST-14, LST-15, LST-16, LST-18, LST-20, LST-21, LST-22, LST-23, LST-24, LST-25, LST-26, LST-27

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests: `findOwned` throws `ListNotFoundError` for a non-UUID id without calling the repository, and for a `null` result; every write throws `ListNotFoundError` when `lockOwnedBoard` returns `null`
- [ ] `create` throws `BoardNotFoundError` for an unknown board and `BoardArchivedError` for an archived board without creating; otherwise creates at `position = countActive`
- [ ] Every item write (`update`, `move`, `archive`, `unarchive`, `remove`) throws `BoardArchivedError` when the locked board is archived, before any list-state check and without writing
- [ ] `update` saves a new title; returns the list without saving for `{}`; throws `ListArchivedError` on an archived list
- [ ] `move`: `k < i` shifts `[k, i-1]` by `+1`; `k > i` shifts `[i+1, k]` by `-1`; `k > n-1` clamps to `n-1`; `k === i` returns without shift or save; archived list → `ListArchivedError`
- [ ] `archive` shifts `[i+1, n-1]` by `-1`, sets `position` `null` and `archivedAt`; already archived → returned without save; `unarchive` sets `position = countActive` and `archivedAt` `null`; already active → returned without save
- [ ] `remove` throws `ListNotArchivedError` on an active list without deleting; deletes an archived list
- [ ] Quick gate passes; ≥ 20 new unit tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(lists): add lists service with position rules`

---

### T5: Create list endpoint

**What**: `ListsController` (no prefix) with `POST /boards/:boardId/lists`, `CreateListDto`, `ListResponseDto` + `toListResponse`; `ListsModule` imports `BoardsModule` and provides service and controller.
**Where**: `back-end/src/lists/lists.controller.ts` (+ `src/lists/dto/create-list.dto.ts`, `src/lists/dto/list-response.dto.ts`, `src/lists/lists.module.ts`)
**Depends on**: T4
**Reuses**: `trim` from `create-board.dto.ts`, `toBoardResponse` pattern, `@CurrentUser()`, `createTestApp`
**Requirement**: LST-01, LST-02, LST-03, LST-04, LST-05, LST-19 (concurrent creates), LST-28

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: valid body → `201` with exactly `{ id, boardId, title, position, archivedAt: null, createdAt, updatedAt }`; `"  To do  "` stored as `"To do"`; second list gets `position` `1`
- [ ] e2e: `title` missing, non-string, `null`, `"   "`, 101 chars → `400` with `errors` item `field` `title` and no row; 100 chars → `201`
- [ ] e2e: unknown property (`position`) → `400`; no token → `401`
- [ ] e2e: unknown, foreign and malformed `boardId` → `404` `/problems/board-not-found` with identical bodies; archived board → `409` `/problems/board-archived`, no row
- [ ] e2e: 10 concurrent creates on one board all return `201` and the board's active lists hold positions `0..9` exactly once
- [ ] Full gate passes; ≥ 12 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(lists): add create list endpoint`

---

### T6: List and read list endpoints

**What**: `GET /boards/:boardId/lists` with `ListListsQueryDto` (`archived` `IsIn(['true','false'])`) and `GET /lists/:id`.
**Where**: `back-end/src/lists/lists.controller.ts` (+ `src/lists/dto/list-lists-query.dto.ts`)
**Depends on**: T5
**Reuses**: `ListBoardsQueryDto` pattern, `createTestApp`
**Requirement**: LST-04 (GET), LST-06, LST-07, LST-08, LST-09, LST-27 (GET)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: board without lists → `[]`; active lists by `position` ascending; `archived=false` same as default; works on an archived board
- [ ] e2e: `archived=true` → only archived lists, `position` `null`, newest `archivedAt` first
- [ ] e2e: `archived=yes` → `400` field `archived`
- [ ] e2e: unknown / foreign / malformed `boardId` → `404` `/problems/board-not-found`
- [ ] e2e: `GET /lists/:id` → `200` for an active list, an archived list and a list of an archived board; unknown / foreign / malformed id → `404` `/problems/list-not-found` with identical bodies
- [ ] Full gate passes; ≥ 10 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(lists): add list and read list endpoints`

---

### T7: Rename list endpoint

**What**: `PATCH /lists/:id` with `UpdateListDto` (`title` via `ValidateIf`, `null` rejected).
**Where**: `back-end/src/lists/lists.controller.ts` (+ `src/lists/dto/update-list.dto.ts`)
**Depends on**: T6
**Reuses**: `UpdateBoardDto` pattern, `createTestApp`
**Requirement**: LST-10, LST-11, LST-12, LST-13, LST-26 (PATCH), LST-27 (PATCH)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: new title → `200`, trimmed title, later `updatedAt`; `{}` → `200` with identical body including `updatedAt`
- [ ] e2e: `title` `null`, `""`, 101 chars → `400` field `title`, list unchanged; unknown property (`position`) → `400`
- [ ] e2e: archived list → `409` `/problems/list-archived`; list of an archived board → `409` `/problems/board-archived`; both unchanged
- [ ] e2e: unknown / foreign / malformed id → `404` `/problems/list-not-found` with identical bodies; foreign list unchanged
- [ ] Full gate passes; ≥ 8 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(lists): add rename list endpoint`

---

### T8: Move list endpoint

**What**: `POST /lists/:id/move` with `MoveListDto` (`position` `@IsInt`, `@Min(0)`), `@HttpCode(200)`.
**Where**: `back-end/src/lists/lists.controller.ts` (+ `src/lists/dto/move-list.dto.ts`)
**Depends on**: T7
**Reuses**: `createTestApp`
**Requirement**: LST-14, LST-15, LST-16, LST-17, LST-18, LST-19 (concurrent moves), LST-26 (move), LST-27 (move)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: A, B, C, D; move C to `0` → `200` with `position` `0`, collection `[C, A, B, D]`; move A to `3` → `[B, C, D, A]` (both directions); shifted lists keep `updatedAt`
- [ ] e2e: `position` `99` → moved to the end; same position → `200` with identical body including `updatedAt`; only list moved to `5` → `position` `0`
- [ ] e2e: `position` missing, `-1`, `1.5`, `"2"` → `400` field `position`, order unchanged
- [ ] e2e: archived list → `409` `/problems/list-archived`; list of an archived board → `409` `/problems/board-archived`; order unchanged
- [ ] e2e: unknown / foreign / malformed id → `404` `/problems/list-not-found`
- [ ] e2e: 10 concurrent moves on one board of 5 lists all return `200` and the board's active lists hold positions `0..4` exactly once
- [ ] Full gate passes; ≥ 10 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(lists): add move list endpoint`

---

### T9: Archive and unarchive list endpoints

**What**: `POST /lists/:id/archive` and `POST /lists/:id/unarchive`, both `@HttpCode(200)`.
**Where**: `back-end/src/lists/lists.controller.ts`
**Depends on**: T8
**Reuses**: `createTestApp`, `archive-board.e2e-spec.ts` style
**Requirement**: LST-20, LST-21, LST-22, LST-23, LST-26 (archive, unarchive), LST-27 (archive, unarchive)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: archive the first of three lists → `200`, `position` `null`, `archivedAt` between request start and end; the others move to `0` and `1`; it appears in `?archived=true`
- [ ] e2e: archive again → `200` with the original `archivedAt`
- [ ] e2e: unarchive → `200`, `archivedAt` `null`, `position` `2` (end); unarchive an active list → `200` with identical body including `updatedAt`
- [ ] e2e: both actions on a list of an archived board → `409` `/problems/board-archived`, list unchanged
- [ ] e2e: unknown / foreign / malformed id → `404` `/problems/list-not-found` on both routes
- [ ] Full gate passes; ≥ 8 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(lists): add archive and unarchive list endpoints`

---

### T10: Delete list endpoint

**What**: `DELETE /lists/:id` with `@HttpCode(204)`, plus the lifecycle test (create → move → archive → delete) and the cross-user test over every list route from the spec Independent Tests.
**Where**: `back-end/src/lists/lists.controller.ts`
**Depends on**: T9
**Reuses**: `createTestApp`, `delete-board.e2e-spec.ts` style
**Requirement**: LST-24, LST-25, LST-26 (DELETE), LST-27, LST-28

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: active list → `409` `/problems/list-not-archived`, list still readable
- [ ] e2e: archived list → `204` with empty body; `GET /lists/:id` then `404`; remaining active positions unchanged
- [ ] e2e: archived list of an archived board → `409` `/problems/board-archived`, list still exists
- [ ] e2e: user B calls every `/lists/:id` route and both collection routes on user A's data → `404`; user A's lists unchanged; no token → `401` on every list route
- [ ] e2e: lifecycle create → move → archive → delete passes in one test with positions `0..n-1` after each step
- [ ] Full gate passes; ≥ 6 new e2e tests

**Tests**: e2e
**Gate**: build

**Commit**: `feat(lists): add delete list endpoint`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2
Phase 2:  T3 → T4
Phase 3:  T5 → T6 → T7 → T8 → T9 → T10
```

Execution follows the pair-programming flow: one task per branch and PR, stop for review after each.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Entity + migration + module | 1 table | ⚠️ Cohesive (entity, migration and module registration describe the same table) |
| T2: Lists repository | 1 class | ✅ Granular |
| T3: List domain errors | 3 errors + mapping entries | ⚠️ Cohesive (one mapping mechanism) |
| T4: Lists service | 1 class | ✅ Granular |
| T5: Create endpoint | 1 endpoint + its DTOs + module wiring | ✅ Granular |
| T6: List + read endpoints | 2 read endpoints + query DTO | ⚠️ Cohesive (both reads share the not-found contract) |
| T7: Rename endpoint | 1 endpoint + its DTO | ✅ Granular |
| T8: Move endpoint | 1 endpoint + its DTO | ✅ Granular |
| T9: Archive + unarchive | 2 mirror actions | ⚠️ Cohesive (one state transition, both directions) |
| T10: Delete endpoint | 1 endpoint + feature-wide e2e | ✅ Granular |

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

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Entity + migration + module (persistence) | integration | integration | ✅ OK |
| T2 | Repository (persistence) | integration | integration | ✅ OK |
| T3 | Error classes + mappings | unit | unit | ✅ OK |
| T4 | Service | unit | unit | ✅ OK |
| T5 | Controller + DTOs + mapper + wiring (HTTP) | e2e | e2e | ✅ OK |
| T6 | Controller + query DTO (HTTP) | e2e | e2e | ✅ OK |
| T7 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T8 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T9 | Controller (HTTP) | e2e | e2e | ✅ OK |
| T10 | Controller (HTTP) | e2e | e2e | ✅ OK |
