# Checklists Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/checklists/spec.md`
**Design**: `back-end/.specs/features/checklists/design.md`
**Status**: Approved

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the existing test layout (`test/unit`, `test/integration`, `test/e2e`), the labels feature tests, the approved design and the spec. Guidelines found: `back-end/.specs/STATE.md` (BE-AD-003, BE-AD-010, BE-AD-011), `test/jest-*.config.ts` - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services and error mappings (`ChecklistItemsService`, `CardsService`, `checklists.errors.ts`) | unit | All branches; 1:1 to spec ACs; guard precedence (item: not found > board archived > list archived > card archived; card-not-found from the card write rethrown as item-not-found); `{}` no-op; move clamp and same-place no-op; `checklist` attached on every card-returning method | `test/unit/**/*.spec.ts` | `pnpm test` |
| Persistence (entity, migration, repositories) | integration | Table, `CHK_checklist_items_position`, deferred `UQ_checklist_items_card_id_position`, every FK cascade (card → items, list → cards → items, board → … → items); every repository method incl. owner scoping, ordering by `position`, raw shift keeping `updated_at`, aggregate counters | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (controllers, DTOs, response mappers, module wiring) | e2e | Every route in scope: happy + edge + error paths, incl. foreign/missing/malformed ids, archived card / list / board, invalid `text` / `done` / `position`, concurrent creates and moves; every card route body carries `checklist` | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test` |
| Full | After tasks with integration/e2e tests | `pnpm test && pnpm test:integration && pnpm test:e2e` |
| Build | After each phase and after persistence tasks | `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` |

---

## Execution Plan

### Phase 1: Card side

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Checklist core

```
T5 → T6 → T7 → T8
```

### Phase 3: Checklist endpoints

```
T8 → T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Rename the card view type

**What**: Rename `CardWithLabels` → `CardView` and `withLabelIds` / `withLabelIdsOf` → `withDetails` / `withDetailsOf` in `CardsService`, its callers and its unit spec; no behavior change.
**Where**: `back-end/src/cards/cards.service.ts` (+ references in `src/cards/dto/card-response.dto.ts`, `test/unit/cards/cards.service.spec.ts`)
**Depends on**: None
**Reuses**: `codegraph_explore` blast radius of `CardWithLabels` (14 references)
**Requirement**: none (refactor; design `CardView` rename)

**Tools**:

- MCP: `codegraph`
- Skill: `safe-refactor`

**Done when**:

- [x] No reference to `CardWithLabels`, `withLabelIds` or `withLabelIdsOf` left in `src/` or `test/`
- [x] Existing unit, integration and e2e tests pass with no assertion changed or removed; same test count before and after
- [x] Build gate passes

**Tests**: unit
**Gate**: build

**Commit**: `refactor(cards): rename CardWithLabels to CardView`

---

### T2: Checklist item entity and table migration

**What**: `ChecklistItem` entity and the `CreateChecklistItems` migration per design; `ChecklistsModule` registers the entity with `TypeOrmModule.forFeature` and is imported by `AppModule`.
**Where**: `back-end/src/database/migrations/1792713600000-CreateChecklistItems.ts` (+ `src/checklists/checklist-item.entity.ts`, `src/checklists/checklists.module.ts`, `src/app.module.ts`)
**Depends on**: T1
**Reuses**: `CreateCards` migration, `Card` entity style, `cards-table.int-spec.ts`, `revertAllMigrations`
**Requirement**: CHK-15 (constraint backstop), CHK-25

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration: insert with defaults → `done` `false`, `created_at` = `updated_at`; `text` of 201 chars and `position` `-1` rejected
- [ ] Integration: two items at the same `(card_id, position)` rejected at commit; a swap of two positions inside one transaction commits (deferred)
- [ ] Integration: deleting a card deletes its items; deleting a list and deleting a board delete the items of their cards
- [ ] Integration: migration `down` drops the table and `up` runs again
- [ ] Build gate passes; ≥ 7 new integration tests

**Tests**: integration
**Gate**: build

**Commit**: `feat(checklists): add checklist_items table`

---

### T3: Checklist counters in the cards repository

**What**: `CardsRepository` gains `get manager()` and `checklistCountsByCard(cardIds)` per design.
**Where**: `back-end/src/cards/cards.repository.ts`
**Depends on**: T2
**Reuses**: `labelIdsByCard` (`src/cards/cards.repository.ts:141`), `cards.repository.int-spec.ts`
**Requirement**: CHK-17 (counts)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration: a card with 3 items, 1 done → `{ total: 3, done: 1 }`; a card with no items → `{ total: 0, done: 0 }`; two cards in one call get their own counts
- [ ] Integration: `[]` returns an empty map
- [ ] Integration: `manager` inside `transaction()` is the transaction's manager (a write through it is rolled back with the transaction)
- [ ] Full gate passes; ≥ 5 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(cards): count checklist items per card in the repository`

---

### T4: Card responses carry checklist progress

**What**: `CardView` gains `checklist: ChecklistProgress`; `withDetails` reads `checklistCountsByCard`; `create` returns `{ total: 0, done: 0 }` without a query; `toCardResponse` and `CardResponseDto` expose `checklist`.
**Where**: `back-end/src/cards/cards.service.ts` (+ `src/cards/dto/card-response.dto.ts`, existing card e2e expectations)
**Depends on**: T3
**Reuses**: `withDetails`, `labelIds` wiring of LBL-26, `card-label-ids.e2e-spec.ts`
**Requirement**: CHK-17

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: every card-returning method (`create`, `listInList`, `listInBoard`, `findOwned`, `update`, `move`, `archive`, `unarchive`) returns `checklist` from `checklistCountsByCard`; `create` does not call it and returns `{ total: 0, done: 0 }`
- [ ] e2e: every card route of CHK-17 returns `checklist` `{ total: 0, done: 0 }`; existing full-body expectations updated to include it, no assertion weakened
- [ ] Full gate passes; ≥ 9 new unit tests, ≥ 8 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(cards): show checklist progress on card responses`

---

### T5: Card write hook for card-owned rows

**What**: `CardsService.writeActiveCard(ownerId, cardId, work, before?)` per design and BE-AD-011; `findOwnedCard` becomes public; `CardsModule` exports `CardsService`.
**Where**: `back-end/src/cards/cards.service.ts` (+ `src/cards/cards.module.ts`)
**Depends on**: T4
**Reuses**: `writeLocked` and its `before` hook (`src/cards/cards.service.ts:302`), `writeLabel` tests in `cards.service.spec.ts`
**Requirement**: CHK-19, CHK-20, CHK-21, CHK-22 (card side)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: malformed, unknown or vanished card → `CardNotFoundError` and `work` not called
- [ ] Unit: `before` runs under the lock and its throw wins over archived board, list and card
- [ ] Unit: archived board → `BoardArchivedError`; archived list → `ListArchivedError`; archived card → `CardArchivedError`; precedence board > list > card; `work` not called in any of them
- [ ] Unit: active card → `work(card, manager)` called with the transaction's manager and its result returned
- [ ] Quick gate passes; ≥ 8 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cards): expose a locked write for card-owned rows`

---

### T6: Checklist items repository

**What**: `ChecklistItemsRepository` per design (`bound`, `findOwned`, `findInCard`, `listInCard`, `countInCard`, `create`, `shift`, `save`, `delete`), provided by `ChecklistsModule`.
**Where**: `back-end/src/checklists/checklist-items.repository.ts` (+ `src/checklists/checklists.module.ts`)
**Depends on**: T5
**Reuses**: `CardsRepository.findOwned` joins and `shift`, `cards.repository.int-spec.ts`
**Requirement**: CHK-05 (order), CHK-13 (shift keeps `updated_at`), CHK-23 (owner scope)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration: `findOwned` returns the item for its owner and `null` for another owner and an unknown id
- [ ] Integration: `findInCard` returns `null` for an item of another card
- [ ] Integration: `listInCard` orders by `position`; `countInCard` counts only that card
- [ ] Integration: `shift` moves the range by `±1` and leaves `updated_at` of shifted rows unchanged
- [ ] Integration: `bound(manager)` writes roll back with the transaction
- [ ] Full gate passes; ≥ 8 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(checklists): add owner-scoped checklist items repository`

---

### T7: Checklist item domain error mapped to Problem Details

**What**: `ChecklistItemNotFoundError` in `checklists.errors.ts` and its entry in `DOMAIN_ERROR_MAPPINGS` (`404` `/problems/checklist-item-not-found`).
**Where**: `back-end/src/errors/domain-error-mappings.ts` (+ `src/checklists/checklists.errors.ts`)
**Depends on**: T6
**Reuses**: `labels.errors.ts`, `labels.errors.spec.ts`
**Requirement**: CHK-23

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: the error is a `DomainError` and maps to `404` `/problems/checklist-item-not-found`
- [ ] Quick gate passes; ≥ 2 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(checklists): map checklist item errors to problem details`

---

### T8: Checklist items service

**What**: `ChecklistItemsService` per design (`create`, `listInCard`, `update`, `move`, `remove`, private `writeItem`), provided by `ChecklistsModule`, which imports `CardsModule`.
**Where**: `back-end/src/checklists/checklist-items.service.ts` (+ `src/checklists/checklists.module.ts`)
**Depends on**: T7
**Reuses**: `CardsService.writeActiveCard`, `CardsService.findOwnedCard`, `CardsService.move` same-list branch, `labels.service.spec.ts` mocking style
**Requirement**: CHK-01, CHK-04, CHK-05, CHK-06, CHK-09, CHK-10, CHK-11, CHK-12, CHK-13, CHK-15, CHK-16, CHK-22, CHK-23

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit `create`: goes through `writeActiveCard(ownerId, cardId)`; `create({ cardId, text, position: countInCard })`; errors from `writeActiveCard` propagate
- [ ] Unit `listInCard`: calls `findOwnedCard` then `listInCard(cardId)`; propagates `CardNotFoundError`
- [ ] Unit item writes: malformed or unknown id → `ChecklistItemNotFoundError` without calling `writeActiveCard`; item gone at the `before` re-read → `ChecklistItemNotFoundError`; `CardNotFoundError` from `writeActiveCard` → `ChecklistItemNotFoundError`; archived errors propagate unchanged
- [ ] Unit `update`: `{}` returns the item without `save`; given fields assigned and `save` called
- [ ] Unit `move`: up and down shift the right range then save at `k`; `position > n-1` clamps to `n-1`; same place returns the item without `shift` or `save`
- [ ] Unit `remove`: deletes and shifts `position+1..n-1` by `-1`; last item shifts nothing
- [ ] Quick gate passes; ≥ 18 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(checklists): add checklist items service`

---

### T9: Create and list checklist item endpoints

**What**: `ChecklistItemsController` (no prefix) with `POST /cards/:cardId/checklist-items` and `GET /cards/:cardId/checklist-items`, `CreateChecklistItemDto`, `ChecklistItemResponseDto` + `toChecklistItemResponse`; `ChecklistsModule` registers the controller.
**Where**: `back-end/src/checklists/checklist-items.controller.ts` (+ `src/checklists/dto/create-checklist-item.dto.ts`, `src/checklists/dto/checklist-item-response.dto.ts`, `src/checklists/checklists.module.ts`)
**Depends on**: T8
**Reuses**: `trim`, `LabelsController`, `create-label.e2e-spec.ts`, `read-labels.e2e-spec.ts`, `createTestApp`
**Requirement**: CHK-01, CHK-02, CHK-03, CHK-04, CHK-05, CHK-15 (concurrent creates), CHK-17 (counts), CHK-18 (create), CHK-19, CHK-20, CHK-21, CHK-22, CHK-24

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: valid body → `201` with exactly `{ id, cardId, text, done, position, createdAt, updatedAt }`, `done` `false`; `"  Write tests  "` → `"Write tests"`; second item `position` `1`
- [ ] e2e: `text` missing, non-string, `null`, `"   "`, 201 chars → `400` field `text` and no row; 200 chars → `201`; unknown properties (`done`, `position`, `cardId`) → `400`
- [ ] e2e: unknown, foreign, malformed `cardId` → `404` `/problems/card-not-found` with identical bodies on `POST` and `GET`
- [ ] e2e: `POST` on archived card → `409` `/problems/card-archived`; archived list → `/problems/list-archived` (also with the card archived); archived board → `/problems/board-archived` (also with list and card archived); no row in each case
- [ ] e2e: `GET` returns items at positions `0..2` in creation order; same array after the card, the list and the board are archived; `[]` for a new card
- [ ] e2e: after 3 creates the card's `checklist` is `{ total: 3, done: 0 }` and its `updatedAt` is unchanged
- [ ] e2e: 10 concurrent creates on one card → all `201`, positions exactly `0..9`; no token → `401` on both routes
- [ ] Full gate passes; ≥ 16 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(checklists): add create and list checklist item endpoints`

---

### T10: Edit checklist item endpoint

**What**: `PATCH /checklist-items/:id` with `UpdateChecklistItemDto`.
**Where**: `back-end/src/checklists/checklist-items.controller.ts` (+ `src/checklists/dto/update-checklist-item.dto.ts`)
**Depends on**: T9
**Reuses**: `UpdateCardDto` `ValidateIf` pattern, `update-label.e2e-spec.ts`
**Requirement**: CHK-06, CHK-07, CHK-08, CHK-09, CHK-17 (done count), CHK-18 (edit), CHK-19, CHK-20, CHK-21, CHK-22, CHK-23, CHK-24

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: `done` `true` → `200` with `done` `true` and a later `updatedAt`; card `checklist.done` becomes `1`; `"  Ship it  "` → `"Ship it"`; both fields at once change both
- [ ] e2e: `text` `null`, `"   "`, 201 chars, number → `400` field `text`; `done` `null`, `"yes"`, `1` → `400` field `done`; item unchanged
- [ ] e2e: `{}` → `200` with `updatedAt` unchanged
- [ ] e2e: unknown, foreign, malformed id → `404` `/problems/checklist-item-not-found` with identical bodies
- [ ] e2e: archived card / list / board → `409` `card-archived` / `list-archived` / `board-archived` with board > list > card precedence; unknown id on an archived board → `404`
- [ ] e2e: card `updatedAt` unchanged after the edits; no token → `401`
- [ ] Full gate passes; ≥ 14 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(checklists): add edit checklist item endpoint`

---

### T11: Move checklist item endpoint

**What**: `POST /checklist-items/:id/move` with `MoveChecklistItemDto`.
**Where**: `back-end/src/checklists/checklist-items.controller.ts` (+ `src/checklists/dto/move-checklist-item.dto.ts`)
**Depends on**: T10
**Reuses**: `MoveListDto`, `move-card.e2e-spec.ts`
**Requirement**: CHK-10, CHK-11, CHK-12, CHK-13, CHK-14, CHK-15, CHK-18 (move), CHK-19, CHK-20, CHK-21, CHK-22, CHK-23, CHK-24

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: items 1, 2, 3; move 3 to `0` → `200` and order `[3, 1, 2]` at `0..2`; move 1 to `99` → `[3, 2, 1]`
- [ ] e2e: moved item `updatedAt` changes; shifted items keep theirs; same-place move → `200` with `updatedAt` unchanged; single item moved to `5` → `position` `0`, unchanged
- [ ] e2e: `position` missing, `-1`, `1.5`, `"0"` → `400` field `position`; unknown properties → `400`
- [ ] e2e: unknown, foreign, malformed id → `404` `/problems/checklist-item-not-found` with identical bodies
- [ ] e2e: archived card / list / board → `409` with board > list > card precedence and order unchanged
- [ ] e2e: 10 concurrent moves on one card's items → all `200`, positions exactly `0..n-1`; card `updatedAt` unchanged; no token → `401`
- [ ] Full gate passes; ≥ 14 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(checklists): add move checklist item endpoint`

---

### T12: Delete checklist item endpoint

**What**: `DELETE /checklist-items/:id`.
**Where**: `back-end/src/checklists/checklist-items.controller.ts`
**Depends on**: T11
**Reuses**: `delete-label.e2e-spec.ts`
**Requirement**: CHK-15 (delete), CHK-16, CHK-17 (total), CHK-18 (delete), CHK-19, CHK-20, CHK-21, CHK-22, CHK-23, CHK-24, CHK-25

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: items 1, 2, 3; delete 2 → `204` with no body; `GET` reads `[1, 3]` at `0..1`; deleting the same id again → `404`
- [ ] e2e: card `checklist.total` drops by one and card `updatedAt` is unchanged
- [ ] e2e: unknown, foreign, malformed id → `404` `/problems/checklist-item-not-found` with identical bodies
- [ ] e2e: archived card / list / board → `409` with board > list > card precedence and the item kept
- [ ] e2e: deleting an archived card removes its items (CHK-25 through the API); no token → `401`
- [ ] Full gate passes; ≥ 9 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(checklists): add delete checklist item endpoint`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12
```

Execution follows the pair-programming flow: one task per branch and PR, review together after each.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Rename card view type | 1 type + 2 methods, mechanical | ✅ Granular |
| T2: Entity + migration + module | 1 table | ⚠️ Cohesive (the entity needs a module to load; one migration) |
| T3: Repository counters | 2 members of 1 class | ✅ Granular |
| T4: Card checklist progress | 1 field through service + mapper | ⚠️ Cohesive (the field is observable only through the mapper) |
| T5: Card write hook | 1 method + export | ✅ Granular |
| T6: Checklist items repository | 1 class | ✅ Granular |
| T7: Domain error | 1 error + mapping entry | ✅ Granular |
| T8: Checklist items service | 1 class | ✅ Granular |
| T9: Create + list endpoints | 2 endpoints + DTOs + wiring | ⚠️ Cohesive (list is the only way to observe create) |
| T10: Edit endpoint | 1 endpoint + its DTO | ✅ Granular |
| T11: Move endpoint | 1 endpoint + its DTO | ✅ Granular |
| T12: Delete endpoint | 1 endpoint | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
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
| T1: Rename card view type | Services | unit | unit | ✅ OK |
| T2: Entity + migration | Persistence | integration | integration | ✅ OK |
| T3: Repository counters | Persistence | integration | integration | ✅ OK |
| T4: Card checklist progress | Services + HTTP layer | e2e (highest) | e2e | ✅ OK |
| T5: Card write hook | Services | unit | unit | ✅ OK |
| T6: Checklist items repository | Persistence | integration | integration | ✅ OK |
| T7: Domain error | Error mappings | unit | unit | ✅ OK |
| T8: Checklist items service | Services | unit | unit | ✅ OK |
| T9: Create + list endpoints | HTTP layer | e2e | e2e | ✅ OK |
| T10: Edit endpoint | HTTP layer | e2e | e2e | ✅ OK |
| T11: Move endpoint | HTTP layer | e2e | e2e | ✅ OK |
| T12: Delete endpoint | HTTP layer | e2e | e2e | ✅ OK |

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| CHK-01 | T8, T9 |
| CHK-02 | T9 |
| CHK-03 | T9 |
| CHK-04 | T8, T9 |
| CHK-05 | T6, T8, T9 |
| CHK-06 | T8, T10 |
| CHK-07 | T10 |
| CHK-08 | T10 |
| CHK-09 | T8, T10 |
| CHK-10 | T8, T11 |
| CHK-11 | T8, T11 |
| CHK-12 | T8, T11 |
| CHK-13 | T6, T8, T11 |
| CHK-14 | T11 |
| CHK-15 | T2, T8, T9, T11, T12 |
| CHK-16 | T8, T12 |
| CHK-17 | T3, T4, T9, T10, T12 |
| CHK-18 | T9, T10, T11, T12 |
| CHK-19 | T5, T9, T10, T11, T12 |
| CHK-20 | T5, T9, T10, T11, T12 |
| CHK-21 | T5, T9, T10, T11, T12 |
| CHK-22 | T5, T8, T9, T10, T11, T12 |
| CHK-23 | T6, T7, T8, T10, T11, T12 |
| CHK-24 | T9, T10, T11, T12 |
| CHK-25 | T2, T12 |

**Coverage:** 25 total, 25 mapped to tasks, 0 unmapped
