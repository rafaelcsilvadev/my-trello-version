# Boards Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/boards/spec.md`
**Design**: `back-end/.specs/features/boards/design.md`
**Status**: Approved

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the existing test layout (`test/unit`, `test/integration`, `test/e2e`), the approved design and the spec. Guidelines found: `back-end/.specs/STATE.md` (BE-AD-003), `test/jest-*.config.ts` - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services and error mappings (`BoardsService`, `boards.errors.ts`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `test/unit/**/*.spec.ts` | `pnpm test` |
| Persistence (entity, migration, repository, test support for migrations) | integration | Table, FK cascade and index created by migration; every repository method incl. owner scoping | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (controller, DTOs, response mapper, module wiring) | e2e | Every route in scope: happy + edge + error paths, incl. foreign/missing/malformed id | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |

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
T1 → T2 → T3
```

### Phase 2: Board rules

```
T3 → T4 → T5
```

### Phase 3: HTTP endpoints

```
T5 → T6 → T7 → T8 → T9 → T10
```

---

## Task Breakdown

### T1: Revert all migrations in integration suites

**What**: Test helper `revertAllMigrations(dataSource)` that calls `undoLastMigration()` until the `migrations` table is empty; every integration suite that currently calls `undoLastMigration()` once in `afterAll` uses it; the users "dropped when reverted" test no longer assumes `CreateUsers` is the last migration.
**Where**: `back-end/test/support/revert-all-migrations.ts` (+ `test/integration/users/users-table.int-spec.ts`, `test/integration/users/users.repository.int-spec.ts`, `test/integration/database/database.module.int-spec.ts`)
**Depends on**: None
**Reuses**: `bootWithDatabase`
**Requirement**: design Risks & Concerns (migration history)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] No integration suite calls `undoLastMigration()` once to clean up; all use `revertAllMigrations`
- [x] Users "dropped when reverted" test reverts every migration and checks `users` is gone, then re-runs migrations
- [x] Full gate passes; integration test count unchanged (no silent deletions)

**Tests**: integration
**Gate**: full

**Commit**: `test(database): revert all migrations after integration suites`

---

### T2: Board entity and boards table migration

**What**: `Board` entity (design Data Models), hand-written `CreateBoards` migration (design SQL: FK `FK_boards_owner_id` `ON DELETE CASCADE`, index `IDX_boards_owner_id_created_at`), `BoardsModule` registering the entity with `TypeOrmModule.forFeature`.
**Where**: `back-end/src/boards/board.entity.ts` (+ `src/database/migrations/<ts>-CreateBoards.ts`, `src/boards/boards.module.ts`)
**Depends on**: T1
**Reuses**: `CreateUsers` migration style, `DatabaseModule` (`autoLoadEntities`, `migrationsRun`)
**Requirement**: BRD-23, BRD-02 (storage)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration test: table `boards` has columns `id`, `owner_id`, `title`, `description`, `archived_at`, `created_at`, `updated_at` with the designed types and nullability; `id`, `created_at`, `updated_at` get defaults
- [x] Integration test: inserting a board with an unknown `owner_id` fails on `FK_boards_owner_id`; deleting the owner deletes their boards (BRD-23)
- [x] Integration test: index `IDX_boards_owner_id_created_at` exists; reverting the migration drops the table
- [x] Full gate passes; ≥ 4 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(boards): add boards table and entity`

---

### T3: Owner-scoped boards repository

**What**: `BoardsRepository` with `create`, `findOwned`, `listOwned`, `save`, `deleteOwned`, every read and delete filtered by `owner_id` (BE-AD-008); `listOwned` orders by `created_at DESC, id DESC`.
**Where**: `back-end/src/boards/boards.repository.ts`
**Depends on**: T2
**Reuses**: `UsersRepository` structure
**Requirement**: BRD-05, BRD-06, BRD-09, BRD-21 (query scoping)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration tests: `create` returns the stored board with generated `id`, `createdAt`, `updatedAt` and `archivedAt` `null`
- [ ] `findOwned` returns the board for its owner and `null` for another owner and for an unknown id
- [ ] `listOwned(owner, false)` returns only that owner's active boards, newest first; `listOwned(owner, true)` returns only archived ones
- [ ] `save` persists a changed `title` and `archivedAt`; `deleteOwned` removes the owner's board and leaves another owner's board with the same call untouched
- [ ] Full gate passes; ≥ 7 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(boards): add owner-scoped boards repository`

---

### T4: Board domain errors mapped to Problem Details

**What**: `BoardNotFoundError`, `BoardArchivedError`, `BoardNotArchivedError` (design table: status, `type`, `detail`) added to `DOMAIN_ERROR_MAPPINGS`.
**Where**: `back-end/src/boards/boards.errors.ts` (+ `src/errors/domain-error-mappings.ts`)
**Depends on**: T3
**Reuses**: `DomainError`, `DOMAIN_ERROR_MAPPINGS` (BE-AD-007)
**Requirement**: BRD-14, BRD-20, BRD-21 (error contract)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests: `findDomainErrorMapping` returns `404` `/problems/board-not-found`, `409` `/problems/board-archived`, `409` `/problems/board-not-archived` for the three errors; each error carries the design `detail` message
- [ ] Quick gate passes; ≥ 3 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(boards): add board domain errors`

---

### T5: Boards service with archive rules

**What**: `BoardsService` (`create`, `list`, `findOwned`, `update`, `archive`, `unarchive`, `remove`) per design, provided by `BoardsModule`; no `save` when nothing changes.
**Where**: `back-end/src/boards/boards.service.ts`
**Depends on**: T4
**Reuses**: `BoardsRepository` (mocked in unit tests), `isUUID` from `class-validator`
**Requirement**: BRD-10, BRD-11, BRD-13, BRD-14, BRD-15, BRD-16, BRD-17, BRD-18, BRD-19, BRD-20, BRD-21

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests: `findOwned` throws `BoardNotFoundError` for a non-UUID id without calling the repository, and for a `null` repository result
- [ ] `update` applies only present keys, keeps `description: null`, throws `BoardArchivedError` on an archived board without saving, and returns the board without saving for `{}`
- [ ] `archive` sets `archivedAt` and saves on an active board; returns an archived board unchanged without saving; `unarchive` mirrors both cases
- [ ] `remove` throws `BoardNotArchivedError` on an active board without deleting; deletes an archived board through `deleteOwned`
- [ ] Quick gate passes; ≥ 12 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(boards): add boards service with archive rules`

---

### T6: Create board endpoint

**What**: `BoardsController` with `POST /boards`, `CreateBoardDto` (`trim`, `trimToNull`), `BoardResponseDto` + `toBoardResponse`, `BoardsModule` imported by `AppModule`.
**Where**: `back-end/src/boards/boards.controller.ts` (+ `src/boards/dto/create-board.dto.ts`, `src/boards/dto/board-response.dto.ts`, `src/app.module.ts`)
**Depends on**: T5
**Reuses**: `trim` pattern from `RegisterDto`, `toUserResponse` pattern, `@CurrentUser()`, `createTestApp`
**Requirement**: BRD-01, BRD-02, BRD-03, BRD-04, BRD-22

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: valid body → `201` with exactly `{ id, title, description, archivedAt: null, createdAt, updatedAt }` (no `ownerId`); `"  Roadmap  "` stored as `"Roadmap"`; missing, `""` and `"   "` description → `null`
- [ ] e2e: `title` missing, non-string, `"   "`, 101 chars → `400` with `errors` item `field` `title`; 100 chars → `201`
- [ ] e2e: `description` number → `400` field `description`; 1001 chars → `400`; 1000 chars → `201`; `null` → `201` with `null`
- [ ] e2e: unknown property (`archivedAt`) → `400`; no token → `401`
- [ ] Full gate passes; ≥ 10 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(boards): add create board endpoint`

---

### T7: List and read board endpoints

**What**: `GET /boards` with `ListBoardsQueryDto` (`archived` `IsIn(['true','false'])`) and `GET /boards/:id`.
**Where**: `back-end/src/boards/boards.controller.ts` (+ `src/boards/dto/list-boards-query.dto.ts`)
**Depends on**: T6
**Reuses**: `createTestApp`
**Requirement**: BRD-05, BRD-06, BRD-07, BRD-08, BRD-09, BRD-21 (GET)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: no boards → `[]`; two users' boards → each list holds only the caller's active boards, newest first; `archived=false` same as default
- [ ] e2e: `archived=true` → only the caller's archived boards; `archived=yes` → `400` field `archived`
- [ ] e2e: `GET /boards/:id` → `200` for own active and own archived board; another user's id, unknown UUID and `not-a-uuid` → identical `404` `/problems/board-not-found` bodies (except `instance`/`requestId`)
- [ ] Full gate passes; ≥ 8 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(boards): add list and read board endpoints`

---

### T8: Update board endpoint

**What**: `PATCH /boards/:id` with `UpdateBoardDto` (`title` rejects `null`, `description` accepts `null`).
**Where**: `back-end/src/boards/boards.controller.ts` (+ `src/boards/dto/update-board.dto.ts`)
**Depends on**: T7
**Reuses**: `CreateBoardDto` transforms
**Requirement**: BRD-10, BRD-11, BRD-12, BRD-13, BRD-14, BRD-21 (PATCH)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: patch `title` only → `200`, title changed, description kept, `updatedAt` later than before; `description: null` clears it
- [ ] e2e: `title: null`, `title: ""`, 1001-char description → `400` with matching `errors` fields, and `GET` shows the board unchanged
- [ ] e2e: `{}` → `200` with identical body, including `updatedAt`
- [ ] e2e: archived board → `409` `/problems/board-archived`, board unchanged; foreign / unknown / malformed id → `404` `/problems/board-not-found`, foreign board unchanged
- [ ] Full gate passes; ≥ 8 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(boards): add update board endpoint`

---

### T9: Archive and unarchive endpoints

**What**: `POST /boards/:id/archive` and `POST /boards/:id/unarchive`, both `@HttpCode(200)`.
**Where**: `back-end/src/boards/boards.controller.ts`
**Depends on**: T8
**Reuses**: `createTestApp`
**Requirement**: BRD-15, BRD-16, BRD-17, BRD-18, BRD-21 (archive, unarchive)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: archive active board → `200` with `archivedAt` an ISO date; board leaves `GET /boards` and appears in `?archived=true`
- [ ] e2e: archive again → `200` with the same `archivedAt`
- [ ] e2e: unarchive archived board → `200` with `archivedAt` `null`, back in `GET /boards`; unarchive active board → `200` unchanged
- [ ] e2e: both routes on foreign / unknown / malformed id → `404` `/problems/board-not-found`, foreign board unchanged
- [ ] Full gate passes; ≥ 6 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(boards): add archive and unarchive endpoints`

---

### T10: Delete board endpoint

**What**: `DELETE /boards/:id` with `@HttpCode(204)`, plus the end-to-end lifecycle test (create → list → archive → delete) from the spec Success Criteria.
**Where**: `back-end/src/boards/boards.controller.ts`
**Depends on**: T9
**Reuses**: `createTestApp`
**Requirement**: BRD-19, BRD-20, BRD-21 (DELETE)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: active board → `409` `/problems/board-not-archived`, board still readable
- [ ] e2e: archived board → `204` with empty body; `GET /boards/:id` then `404`
- [ ] e2e: foreign / unknown / malformed id → `404` `/problems/board-not-found`, foreign board still exists
- [ ] e2e: lifecycle create → list → archive → delete passes in one test
- [ ] Full gate passes; ≥ 5 new e2e tests

**Tests**: e2e
**Gate**: build

**Commit**: `feat(boards): add delete board endpoint`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3
Phase 2:  T4 → T5
Phase 3:  T6 → T7 → T8 → T9 → T10
```

Execution follows the pair-programming flow: one task per branch and PR, stop for review after each.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Revert-all-migrations helper | 1 helper + its 3 call sites | ⚠️ Cohesive (one test-support concern) |
| T2: Board entity + migration | 1 table | ⚠️ Cohesive (entity, migration and module registration describe the same table) |
| T3: Boards repository | 1 class | ✅ Granular |
| T4: Board domain errors | 3 errors + mapping entries | ⚠️ Cohesive (one mapping mechanism) |
| T5: Boards service | 1 class | ✅ Granular |
| T6: Create endpoint | 1 endpoint + its DTOs + module wiring | ✅ Granular |
| T7: List + read endpoints | 2 read endpoints + query DTO | ⚠️ Cohesive (both reads share the not-found contract) |
| T8: Update endpoint | 1 endpoint + its DTO | ✅ Granular |
| T9: Archive + unarchive | 2 mirror actions | ⚠️ Cohesive (one state transition, both directions) |
| T10: Delete endpoint | 1 endpoint | ✅ Granular |

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
| T1 | Test support for migrations (persistence) | integration | integration | ✅ OK |
| T2 | Entity + migration + module (persistence) | integration | integration | ✅ OK |
| T3 | Repository (persistence) | integration | integration | ✅ OK |
| T4 | Error classes + mappings | unit | unit | ✅ OK |
| T5 | Service | unit | unit | ✅ OK |
| T6 | Controller + DTOs + mapper + wiring (HTTP) | e2e | e2e | ✅ OK |
| T7 | Controller + query DTO (HTTP) | e2e | e2e | ✅ OK |
| T8 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T9 | Controller (HTTP) | e2e | e2e | ✅ OK |
| T10 | Controller (HTTP) | e2e | e2e | ✅ OK |
