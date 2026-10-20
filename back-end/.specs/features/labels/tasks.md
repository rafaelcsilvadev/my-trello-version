# Labels Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/labels/spec.md`
**Design**: `back-end/.specs/features/labels/design.md`
**Status**: Approved

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the existing test layout (`test/unit`, `test/integration`, `test/e2e`), the cards feature tests, the approved design and the spec. Guidelines found: `back-end/.specs/STATE.md` (BE-AD-003, BE-AD-010), `test/jest-*.config.ts` - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services and error mappings (`LabelsService`, `CardsService`, `labels.errors.ts`) | unit | All branches; 1:1 to spec ACs; guard precedence (label: not found > board archived; apply/remove: card not found > label not found > board archived > list archived > card archived); `{}` no-op; `labelIds` attached on every card-returning method | `test/unit/**/*.spec.ts` | `pnpm test` |
| Persistence (entity, migration, repositories, shared lock) | integration | Tables, `CHK_labels_color`, `UQ_labels_board_id_name` (case-insensitive, per board), `PK_card_labels`, every FK cascade (board → labels, label → links, card → links, list → cards → links, board → … → links); every repository method incl. owner scoping, row lock, ordering by `created_at, id`, `23505` mapping, idempotent link | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (controllers, DTOs, response mappers, module wiring) | e2e | Every route in scope: happy + edge + error paths, incl. foreign/missing/malformed ids, label of another board, archived card / list / board, invalid names and colors, concurrent duplicate names, concurrent double apply; every card route body carries `labelIds` | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test` |
| Full | After tasks with integration/e2e tests | `pnpm test && pnpm test:integration && pnpm test:e2e` |
| Build | After each phase and after persistence tasks | `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` |

---

## Execution Plan

### Phase 1: Persistence and errors

```
T1 → T2 → T3 → T4
```

### Phase 2: Label CRUD

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: Labels on cards

```
T8 → T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Shared board row lock

**What**: Extract the board row lock into `lockOwnedBoard(manager, ownerId, boardId)` in `src/boards/board-lock.ts`; `ListsRepository.lockOwnedBoard` and `CardsRepository.lockOwnedBoard` delegate to it with no signature change.
**Where**: `back-end/src/boards/board-lock.ts` (+ delegation in `src/lists/lists.repository.ts`, `src/cards/cards.repository.ts`)
**Depends on**: None
**Reuses**: body of `ListsRepository.lockOwnedBoard` (`src/lists/lists.repository.ts:31`), `lists.repository.int-spec.ts` lock tests
**Requirement**: none (refactor; design Risks: third copy of the lock)

**Tools**:

- MCP: `codegraph`
- Skill: `safe-refactor`

**Done when**:

- [x] Integration tests for `lockOwnedBoard`: returns the board for its owner, `null` for another owner and for an unknown id; while one transaction holds the lock, a second one on the same board waits until the first commits
- [x] Existing list and card lock and concurrency tests pass unchanged (no test edited or removed)
- [x] Build gate passes; ≥ 3 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `refactor(boards): share the board row lock across repositories`

---

### T2: Label entity and labels tables migration

**What**: `LABEL_COLORS` + `LabelColor`, `Label` entity, `CreateLabels` migration (design SQL: `labels` with `FK_labels_board_id` cascade, `CHK_labels_color`, `UQ_labels_board_id_name` on `(board_id, lower(name))`; `card_labels` with `PK_card_labels`, both FKs cascade, `IDX_card_labels_label_id`) and `LabelsModule` with `TypeOrmModule.forFeature([Label])`, imported by `AppModule`.
**Where**: `back-end/src/database/migrations/1792627200000-CreateLabels.ts` (+ `src/labels/label-colors.ts`, `src/labels/label.entity.ts`, `src/labels/labels.module.ts`, `src/app.module.ts`)
**Depends on**: T1
**Reuses**: `CreateCards` migration style, `List` entity style, `bootWithDatabase`, `revertAllMigrations`, `cards-table.int-spec.ts`
**Requirement**: LBL-04 (database check), LBL-31 (database safety net), LBL-32 (database safety net), LBL-33

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration: a label row round-trips `name`, `color`, `createdAt`, `updatedAt`; a `color` outside the palette (incl. `"Green"`) is rejected by `CHK_labels_color`
- [x] Integration: `"Bug"` then `"bug"` on the same board fails with `23505` and `constraint` `UQ_labels_board_id_name`; `"Bug"` on two boards succeeds
- [x] Integration: inserting the same `(card_id, label_id)` twice fails on `PK_card_labels`
- [x] Integration: deleting a label deletes its links; deleting a card deletes its links; deleting a list deletes its cards' links; deleting a board deletes its labels and every link
- [x] Integration: `down` drops both tables and `up` re-applies cleanly
- [x] Build gate passes; ≥ 9 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `feat(labels): add labels and card_labels tables`

---

### T3: Owner-scoped labels repository

**What**: `LabelsRepository` per design (`transaction`, `lockOwnedBoard`, `findOwned`, `listInBoard`, `create`, `save`, `delete`), mapping `23505` on `UQ_labels_board_id_name` to `LabelNameTakenError`; provided by `LabelsModule`. `LabelNameTakenError` lands here with a minimal class; T4 adds its mapping.
**Where**: `back-end/src/labels/labels.repository.ts` (+ `src/labels/labels.errors.ts`)
**Depends on**: T2
**Reuses**: `CardsRepository` transaction pattern, shared `lockOwnedBoard` (T1), `UsersRepository` conflict check (`src/users/users.repository.ts:41`), `cards.repository.int-spec.ts`
**Requirement**: LBL-05, LBL-09, LBL-13, LBL-28, LBL-31 (data access)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration: `findOwned` returns the label for its board's owner and `null` for another owner and for an unknown id
- [x] Integration: `listInBoard` returns only that board's labels ordered by `createdAt` ascending, then `id`; `[]` for a board with none
- [x] Integration: `create` and `save` throw `LabelNameTakenError` on a case-insensitive clash in the same board, and rethrow any other database error unchanged
- [x] Integration: `save` with the label's own name in another case succeeds
- [x] Integration: `lockOwnedBoard` delegates (owner → board, other owner → `null`); `transaction` rolls back every write when `work` throws
- [x] Build gate passes; ≥ 9 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `feat(labels): add owner-scoped labels repository`

---

### T4: Label domain errors mapped to Problem Details

**What**: `LabelNotFoundError` and `LabelNameTakenError` in `labels.errors.ts`, mapped in `domain-error-mappings.ts` to `404` `/problems/label-not-found` and `409` `/problems/label-name-taken`.
**Where**: `back-end/src/errors/domain-error-mappings.ts` (+ `src/labels/labels.errors.ts`)
**Depends on**: T3
**Reuses**: `cards.errors.ts`, `cards.errors.spec.ts`
**Requirement**: LBL-05, LBL-13, LBL-22, LBL-28

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: each error extends `DomainError` with its message; `findDomainErrorMapping` returns `404` `/problems/label-not-found` and `409` `/problems/label-name-taken`
- [ ] Quick gate passes; ≥ 4 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(labels): map label domain errors to problem details`

---

### T5: Labels service

**What**: `LabelsService` per design (`create`, `listInBoard`, `update`, `remove`, private `writeLocked`), provided by `LabelsModule`, which imports `BoardsModule`.
**Where**: `back-end/src/labels/labels.service.ts` (+ `src/labels/labels.module.ts`)
**Depends on**: T4
**Reuses**: `ListsService` item-write flow, `BoardsService.findOwned`, `BoardArchivedError`, `BoardNotFoundError`, `cards.service.spec.ts` mocking style
**Requirement**: LBL-01, LBL-05, LBL-07, LBL-08, LBL-09, LBL-10, LBL-13, LBL-15, LBL-16, LBL-27 (label writes), LBL-28

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit `create`: malformed `boardId` → `BoardNotFoundError` without touching the repository; lock returns `null` → `BoardNotFoundError`; archived board → `BoardArchivedError` and no `create`; otherwise `create({ boardId, name, color })` called with those exact arguments and its result returned
- [ ] Unit `listInBoard`: calls `BoardsService.findOwned(ownerId, boardId)` then `listInBoard(boardId)`; works on an archived board; propagates `BoardNotFoundError`
- [ ] Unit `update`: malformed or unknown id → `LabelNotFoundError`; label deleted before the lock re-read → `LabelNotFoundError`; archived board → `BoardArchivedError` and no `save`; `{}` returns the label without `save`; given fields assigned and `save` called with them
- [ ] Unit `remove`: same not-found and archived guards; otherwise `delete(id)` called once
- [ ] Unit: `LabelNameTakenError` from the repository propagates from `create` and `update`
- [ ] Quick gate passes; ≥ 16 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(labels): add labels service`

---

### T6: Create and list label endpoints

**What**: `LabelsController` (no prefix) with `POST /boards/:boardId/labels` and `GET /boards/:boardId/labels`, `CreateLabelDto`, `LabelResponseDto` + `toLabelResponse`; `LabelsModule` provides repository, service and controller.
**Where**: `back-end/src/labels/labels.controller.ts` (+ `src/labels/dto/create-label.dto.ts`, `src/labels/dto/label-response.dto.ts`, `src/labels/labels.module.ts`)
**Depends on**: T5
**Reuses**: `trim` from `create-board.dto.ts`, `toCardResponse` pattern, `@CurrentUser()`, `createTestApp`, `create-card.e2e-spec.ts`, `read-cards.e2e-spec.ts`
**Requirement**: LBL-01, LBL-02, LBL-03, LBL-04, LBL-05, LBL-06, LBL-07, LBL-08, LBL-09, LBL-29, LBL-31 (concurrent creates)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: valid body → `201` with exactly `{ id, boardId, name, color, createdAt, updatedAt }`; `"  Bug  "` stored and returned as `"Bug"`
- [ ] e2e: `name` missing, non-string, `null`, `"   "`, 51 chars → `400` field `name` and no row; 50 chars → `201`
- [ ] e2e: each of the 10 palette colors → `201`; `color` missing, `"Green"`, `"white"`, `"#ff0000"`, a number → `400` field `color` and no row
- [ ] e2e: `"bug"` after `"Bug"` on the same board → `409` `/problems/label-name-taken`; `"Bug"` on another board → `201`
- [ ] e2e: unknown properties (`boardId`, `id`) → `400`; no token → `401` on both routes
- [ ] e2e: unknown, foreign and malformed `boardId` → `404` `/problems/board-not-found` with identical bodies on `POST` and `GET`; archived board → `POST` `409` `/problems/board-archived` and no row
- [ ] e2e: `GET` returns labels created as `"Bug"`, `"Idea"`, `"Chore"` in that order; same array after the board is archived; `[]` for a new board
- [ ] e2e: 10 concurrent creates of `"Bug"`, `"BUG"`, `"bug"`, … on one board → exactly one `201`, nine `409` `/problems/label-name-taken`, and `GET` returns one label
- [ ] Full gate passes; ≥ 18 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(labels): add create and list label endpoints`

---

### T7: Edit label endpoint

**What**: `PATCH /labels/:id` with `UpdateLabelDto` (`ValidateIf(value !== undefined)` on `name` and `color`).
**Where**: `back-end/src/labels/labels.controller.ts` (+ `src/labels/dto/update-label.dto.ts`)
**Depends on**: T6
**Reuses**: `UpdateCardDto` null handling, `update-card.e2e-spec.ts`
**Requirement**: LBL-10, LBL-11, LBL-12, LBL-13, LBL-14, LBL-15, LBL-27 (`PATCH`), LBL-28 (`PATCH`), LBL-31 (concurrent renames)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: `{ name: "  Defect  ", color: "orange" }` → `200` with `name` `"Defect"`, `color` `"orange"` and a later `updatedAt`; `name` alone leaves `color` unchanged and vice versa
- [ ] e2e: `name` `null`, non-string, `"   "`, 51 chars → `400` field `name`; `color` `null`, `"Green"`, `"white"` → `400` field `color`; label unchanged in every case
- [ ] e2e: renaming to another label's name in any case → `409` `/problems/label-name-taken`, label unchanged; `"Defect"` → `"DEFECT"` → `200` with `"DEFECT"`
- [ ] e2e: `{}` → `200` with the unchanged body and the same `updatedAt`; unknown property → `400`
- [ ] e2e: unknown, foreign and malformed id → `404` `/problems/label-not-found` with identical bodies; archived board → `409` `/problems/board-archived`, label unchanged after unarchive; no token → `401`
- [ ] e2e: 10 concurrent renames of 10 different labels to `"Same"` → exactly one `200`, nine `409`
- [ ] Full gate passes; ≥ 12 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(labels): add edit label endpoint`

---

### T8: Delete label endpoint

**What**: `DELETE /labels/:id` returning `204`.
**Where**: `back-end/src/labels/labels.controller.ts`
**Depends on**: T7
**Reuses**: `delete-card.e2e-spec.ts`
**Requirement**: LBL-16, LBL-27 (`DELETE`), LBL-28 (`DELETE`)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: `DELETE` → `204` with no body; `GET /boards/:boardId/labels` no longer lists it; a second `DELETE` → `404` `/problems/label-not-found`
- [ ] e2e: unknown, foreign and malformed id → `404` `/problems/label-not-found` with identical bodies; the foreign label still exists for its owner
- [ ] e2e: archived board → `409` `/problems/board-archived`, label still listed after unarchive; no token → `401`
- [ ] Full gate passes; ≥ 6 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(labels): add delete label endpoint`

---

### T9: Card label links in the cards repository

**What**: `CardsRepository.findLabelInBoard`, `linkLabel` (`ON CONFLICT DO NOTHING`), `unlinkLabel`, `labelIdsByCard`; `CardsModule` registers `Label` in `TypeOrmModule.forFeature`.
**Where**: `back-end/src/cards/cards.repository.ts` (+ `src/cards/cards.module.ts`)
**Depends on**: T8
**Reuses**: `CardsRepository.shift` raw-SQL style, `cards.repository.int-spec.ts`
**Requirement**: LBL-19, LBL-20, LBL-21, LBL-22, LBL-26, LBL-32 (data access)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration: `findLabelInBoard` returns the label of that board and `null` for a label of another board (same owner or not) and for an unknown id
- [ ] Integration: `linkLabel` twice leaves one row and does not throw; `unlinkLabel` removes the row and is a no-op when absent
- [ ] Integration: `linkLabel` and `unlinkLabel` leave the card's `updated_at` unchanged
- [ ] Integration: `labelIdsByCard([a, b])` returns, per card, label ids ordered by label `created_at` then `id` regardless of link order; a card with no links maps to `[]`; `[]` input returns an empty map without a query
- [ ] Build gate passes; ≥ 8 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `feat(cards): store and read card label links`

---

### T10: Card responses carry labelIds

**What**: `CardWithLabels`; private `CardsService.withLabelIds`; every card-returning service method returns `CardWithLabels` (`create` with `[]`, no query); `CardResponseDto.labelIds` and `toCardResponse` map it; existing card e2e body expectations gain `labelIds: []`.
**Where**: `back-end/src/cards/cards.service.ts` (+ `src/cards/dto/card-response.dto.ts`, existing `test/e2e/cards/*.e2e-spec.ts` expectations)
**Depends on**: T9
**Reuses**: `cards.service.spec.ts`, `read-cards.e2e-spec.ts`
**Requirement**: LBL-26

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: `findOwned`, `listInList`, `listInBoard`, `update`, `move`, `archive`, `unarchive` return each card with the `labelIds` from `labelIdsByCard` (one call per method with all card ids); `create` returns `labelIds` `[]` and never calls `labelIdsByCard`
- [ ] e2e: card bodies from all eight card routes include `labelIds` `[]`; existing full-body assertions updated to include it, none removed or loosened
- [ ] e2e: with labels inserted directly through the repository, `GET /cards/:id`, `GET /lists/:listId/cards` and `GET /boards/:boardId/cards` return `labelIds` in label creation order
- [ ] Full gate passes; ≥ 8 new unit tests, ≥ 3 new e2e tests; existing test count unchanged or higher

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): include labelIds in card responses`

---

### T11: Apply and remove labels in the cards service

**What**: `CardsService.addLabel` and `removeLabel`; `writeLocked` gains the optional `before(board, card, cards)` hook that runs `findLabelInBoard` (with `isUUID` guard) before the board-archived guard.
**Where**: `back-end/src/cards/cards.service.ts`
**Depends on**: T10
**Reuses**: `writeLocked`, `CardArchivedError`, `ListArchivedError`, `BoardArchivedError`, `LabelNotFoundError`
**Requirement**: LBL-18, LBL-19, LBL-20, LBL-22, LBL-23, LBL-24, LBL-25, LBL-27 (apply/remove)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: active card, list and board with a label of the board → `linkLabel(cardId, labelId)` / `unlinkLabel(cardId, labelId)` called with those exact ids
- [ ] Unit: malformed `labelId` → `LabelNotFoundError` without calling `findLabelInBoard`; `findLabelInBoard` `null` → `LabelNotFoundError`
- [ ] Unit precedence: unknown card with a bad label → `CardNotFoundError`; bad label on an archived board → `LabelNotFoundError`; archived board with archived list and card → `BoardArchivedError`; archived list with archived card → `ListArchivedError`; archived card → `CardArchivedError`; no link call in any failing case
- [ ] Unit: existing `update` / `move` / `archive` / `unarchive` / `remove` tests pass unchanged (no hook)
- [ ] Quick gate passes; ≥ 12 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cards): apply and remove labels in the cards service`

---

### T12: Apply and remove label endpoints

**What**: `CardLabelsController` with `PUT /cards/:id/labels/:labelId` and `DELETE /cards/:id/labels/:labelId` (`204`), registered in `CardsModule`.
**Where**: `back-end/src/cards/card-labels.controller.ts` (+ `src/cards/cards.module.ts`)
**Depends on**: T11
**Reuses**: `CardsController` Swagger style, `createTestApp`, `archive-card.e2e-spec.ts`
**Requirement**: LBL-17, LBL-18, LBL-19, LBL-20, LBL-21, LBL-22, LBL-23, LBL-24, LBL-25, LBL-27 (apply/remove), LBL-29, LBL-30, LBL-32

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: `PUT` → `204` with no body and `GET /cards/:id` shows the id; `PUT` again → `204`, `labelIds` holds it once; card `updatedAt` unchanged
- [ ] e2e: `DELETE` → `204` and `labelIds` `[]`; `DELETE` again → `204`; card `updatedAt` unchanged
- [ ] e2e: labels `"Bug"` then `"Idea"` applied as `"Idea"` then `"Bug"` → `labelIds` `["<bug-id>", "<idea-id>"]` on `GET /cards/:id`, `GET /lists/:listId/cards` and `GET /boards/:boardId/cards`
- [ ] e2e: `labelId` unknown, of another user's board, of another board of the same user, malformed → `404` `/problems/label-not-found` with identical bodies; card unchanged
- [ ] e2e: card id unknown, foreign, malformed → `404` `/problems/card-not-found` with identical bodies; user B's own label on user A's card → `404` `/problems/card-not-found`
- [ ] e2e: archived card → `409` `/problems/card-archived`; archived list → `409` `/problems/list-archived` (also with the card archived); archived board → `409` `/problems/board-archived` (also with list and card archived); bad label on an archived board → `404` `/problems/label-not-found`; `labelIds` unchanged after unarchiving
- [ ] e2e: deleting a label applied to an active and an archived card → both return `labelIds` `[]` with `updatedAt` unchanged (LBL-17)
- [ ] e2e: 10 concurrent `PUT` of one label on one card → all `204` and `labelIds` has length 1; no token → `401` on both routes
- [ ] Full gate passes; ≥ 18 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): add apply and remove label endpoints`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12
```

Execution follows the pair-programming flow: one task per branch and PR, review together after each.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Shared board lock | 1 function + 2 one-line delegations | ✅ Granular |
| T2: Entity + migration + module | 2 tables of one migration | ⚠️ Cohesive (the link table only exists with labels; one migration) |
| T3: Labels repository | 1 class | ✅ Granular |
| T4: Label domain errors | 2 errors + mapping entries | ⚠️ Cohesive (one mapping mechanism) |
| T5: Labels service | 1 class | ✅ Granular |
| T6: Create + list endpoints | 2 endpoints + DTOs + wiring | ⚠️ Cohesive (list is the only way to observe create; shared board lookup) |
| T7: Edit endpoint | 1 endpoint + its DTO | ✅ Granular |
| T8: Delete endpoint | 1 endpoint | ✅ Granular |
| T9: Card label links | 4 repository methods on one table | ✅ Granular |
| T10: `labelIds` in card responses | 1 service helper + 1 mapper field | ✅ Granular |
| T11: Apply/remove service | 2 mirror methods + 1 hook | ⚠️ Cohesive (one write flow, both directions) |
| T12: Apply/remove endpoints | 2 mirror endpoints | ⚠️ Cohesive (one relation, both directions) |

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
| T12 | T11 | T11 → T12 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Shared lock (persistence) | integration | integration | ✅ OK |
| T2 | Entity + migration + module (persistence) | integration | integration | ✅ OK |
| T3 | Repository (persistence) | integration | integration | ✅ OK |
| T4 | Error classes + mappings | unit | unit | ✅ OK |
| T5 | Service | unit | unit | ✅ OK |
| T6 | Controller + DTOs + mapper + wiring (HTTP) | e2e | e2e | ✅ OK |
| T7 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T8 | Controller (HTTP) | e2e | e2e | ✅ OK |
| T9 | Repository (persistence) | integration | integration | ✅ OK |
| T10 | Service + response mapper (unit + HTTP) | unit + e2e | e2e (unit tests included in Done when) | ✅ OK |
| T11 | Service | unit | unit | ✅ OK |
| T12 | Controller + wiring (HTTP) | e2e | e2e | ✅ OK |
