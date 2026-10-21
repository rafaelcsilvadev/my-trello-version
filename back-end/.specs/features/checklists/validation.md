# Checklists Validation

**Date**: 2026-10-21
**Spec**: `.specs/features/checklists/spec.md`
**Diff range**: `bfe4446..HEAD` (branch `feat/checklist-items-delete-endpoint`, HEAD `0512b8f`; tasks T1..T12)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict: PASS ✅.** All 25 requirements (CHK-01..CHK-25) and the listed edge cases trace to a test assertion that targets the spec-defined outcome. The build gate is green (unit 359, integration 186, e2e 539, 0 failed, 0 skipped). The sensor killed 8 of 8 behavior-level mutants covering the move clamp, the same-place no-op, gap closing on delete, the shift range on move, the card-archived guard, guard precedence, the checklist counters and owner scoping. Three minor, non-blocking observations and two informational notes are listed under Fix Plans.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | all boxes ticked |
| T2 | ✅ Done | all boxes ticked |
| T3 | ✅ Done | all boxes ticked |
| T4 | ✅ Done | all boxes ticked |
| T5 | ✅ Done | all boxes ticked |
| T6 | ✅ Done | all boxes ticked |
| T7 | ✅ Done | all boxes ticked |
| T8 | ✅ Done | all boxes ticked |
| T9 | ✅ Done | all boxes ticked |
| T10 | ✅ Done | all boxes ticked |
| T11 | ✅ Done | all boxes ticked |
| T12 | ✅ Done | all boxes ticked (63 ticked, 0 unchecked boxes in `tasks.md`) |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`. `e2e/k/` = `test/e2e/checklists/`, `e2e/c/` = `test/e2e/cards/`, `int/` = `test/integration/`, `unit/` = `test/unit/`. File names drop the `-checklist-item(s).e2e-spec.ts` suffix where obvious (`e2e/k/create` = `create-checklist-item.e2e-spec.ts`, `e2e/k/read` = `read-checklist-items.e2e-spec.ts`, and so on).

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| CHK-01 create | `201`, body exactly `{ id, cardId, text, done, position, createdAt, updatedAt }`, `done: false`, `position` = prior count | `e2e/k/create:110-119` - `toBe(201)` + exact `toEqual({ id: UUID, cardId, text: 'Write tests', done: false, position: 0, createdAt: ISO, updatedAt: ISO })`; second item `:139-140` `position toBe(1)`; unit `unit/checklists/checklist-items.service.spec.ts:144-148` `create toHaveBeenCalledWith({ cardId, text, position: 3 })` from `countInCard` 3 | ✅ PASS |
| CHK-02 trimmed text | stored and returned trimmed | `e2e/k/create:126` `text toBe('Write tests')` for `'  Write tests  '`; `:131` row `toEqual({ card_id: cardId, text: 'Write tests' })` | ✅ PASS |
| CHK-03 invalid text on create | `400` + `errors` item `field: 'text'`, no item | `e2e/k/create:143-158` (missing, number, null, whitespace, 201 chars) - `toBe(400)`, `errors toEqual(arrayContaining([{ field: 'text', ... }]))`, `countItems toBe(0)`; boundary 200 → `201` `:160-167` (see Observation 1) | ✅ PASS |
| CHK-04 card foreign/unknown/malformed (POST, GET) | `404` `/problems/card-not-found`, identical in all three, no item | POST `e2e/k/create:191-210` - `toBe(404)`, `type toBe('/problems/card-not-found')`, bodies minus `instance`/`requestId` `toEqual`, `countItems toBe(0)`; GET `e2e/k/read:140-172`; POST body equals GET body `e2e/k/read:174-188` | ✅ PASS |
| CHK-05 list items | `200`, ordered by `position` asc, also when archived, `[]` when none | `e2e/k/read:87` `toEqual([])`; `:96-105` `[['One',0],['Two',1],['Three',2]]`; `:128` same array after card, list and board archived; other card `[]` `:115`; repository order `int/checklists/checklist-items.repository.int-spec.ts:176` | ✅ PASS |
| CHK-06 edit | only given fields, trimmed, `updatedAt` later, `200` + body | `e2e/k/update:135-144` - `toBe(200)`, `toEqual({ ...item, done: true, updatedAt })`, `updatedAt toBeGreaterThan`, persisted `read() toEqual(res.body)`; trimmed `:158` `text toBe('Ship it')`, `done toBe(false)`; both fields `:166`; untick `:175`; unit `unit/checklists/checklist-items.service.spec.ts:283-286` (see Observation 2) | ✅ PASS |
| CHK-07 invalid text on PATCH | `400` `field: 'text'` (null, blank, 201, number), unchanged | `e2e/k/update:178-192` - `toBe(400)`, `arrayContaining([{ field: 'text', ... }])`, `read() toEqual(item)` | ✅ PASS |
| CHK-08 invalid done | `400` `field: 'done'` (null, string, number), unchanged | `e2e/k/update:194-207` - `toBe(400)`, `arrayContaining([{ field: 'done', ... }])`, `read() toEqual(item)` | ✅ PASS |
| CHK-09 empty body | `200`, unchanged, `updatedAt` unchanged | `e2e/k/update:220-225` `toBe(200)`, `toEqual(item)` (includes `updatedAt`); unit `unit/checklists/checklist-items.service.spec.ts:257-265` `save not.toHaveBeenCalled()` | ✅ PASS |
| CHK-10 move | item at `k`, others shifted keeping order, `200` + moved item `position: k` | `e2e/k/move:105-113` - `toBe(200)`, `toEqual({ ...third, position: 0, updatedAt })`, `textsInOrder toEqual(['3','1','2'])` with each `position toBe(i)` `:98`; unit up/down shift ranges `unit/checklists/checklist-items.service.spec.ts:307`, `:319` | ✅ PASS |
| CHK-11 clamp | `position > n-1` → `n-1`, `200` | `e2e/k/move:120-124` - `toBe(200)`, `position toBe(2)` for `99`, order `['3','2','1']`; unit `:325-334` `shift(CARD_ID, 1, 2, -1)`, `save` with `position: 2` | ✅ PASS |
| CHK-12 same place | `200`, item unchanged incl. `updatedAt` | `e2e/k/move:143-146` `toBe(200)`, `toEqual(second)`; clamped back to the same place `:152-155`; unit `:336-350` `result toBe(item)`, `expectNoWrites()` | ✅ PASS |
| CHK-13 `updatedAt` on move | moved item later, shifted items unchanged | `e2e/k/move:132-137` - `updatedAt toBeGreaterThan(third.updatedAt)`, `items[1] toEqual({ ...first, position: 1 })`, `items[2] toEqual({ ...second, position: 2 })`; raw shift keeps `updated_at` `int/checklists/checklist-items.repository.int-spec.ts:231-245` | ✅ PASS |
| CHK-14 invalid position | `400` `field: 'position'` (missing, non-integer, negative), unchanged | `e2e/k/move:158-177` (missing, `-1`, `1.5`, `'0'`, `null`) - `toBe(400)`, `arrayContaining([{ field: 'position', ... }])`, `read() toEqual(items)` | ✅ PASS |
| CHK-15 contiguous `0..n-1`, concurrent | positions `0..n-1` each once after create, move, delete, incl. concurrent | 10 concurrent creates `e2e/k/create:278-287` `positions toEqual([0..9])`; 10 concurrent moves `e2e/k/move:305-319` `positions toEqual([0,1,2,3,4])`, same id set; 3 concurrent deletes `e2e/k/delete:258-271` `[['2',0],['4',1],['6',2]]`; DB backstop `int/checklists/checklist-items-table.int-spec.ts:257-264` `UQ_checklist_items_card_id_position` on COMMIT, `:251-254` `CHK_checklist_items_position` | ✅ PASS |
| CHK-16 delete | `204`, gap closed, absent from later `GET` | `e2e/k/delete:98-102` - `toBe(204)`, `text toBe('')`, `read() toEqual([first, { ...third, position: 1 }])`; last item `:118-120`; second delete `404` `:109-112`; unit `unit/checklists/checklist-items.service.spec.ts:369-370` `shift(CARD_ID, 2, 3, -1)` | ✅ PASS |
| CHK-17 `checklist` on every card route | `{ total, done }` on all 8 card routes; `{ total: 0, done: 0 }` with no items | zero on POST, GET one, list, board, PATCH, move, archive, unarchive `e2e/c/card-checklist.e2e-spec.ts:86-148` `checklist toEqual(NO_ITEMS)`; `{ total: 3, done: 1 }` on GET one / list / board `:161-178`, on PATCH / move / archive / unarchive `:180-199`, archived listing `:201-208`; counts query `int/cards/cards.repository.int-spec.ts` `checklistCountsByCard` (3 tests) `toEqual(new Map([[card, { total: 3, done: 1 }]]))` | ✅ PASS |
| CHK-18 card `updatedAt` kept | unchanged on item create, edit, tick, move, delete | create `e2e/k/create:274-275` (`checklist toEqual({ total: 3, done: 0 })`, `updatedAt toBe(before)`); edit + tick `e2e/k/update:317-325`; move `e2e/k/move:322-331`; delete `e2e/k/delete:133-135`; unit `unit/cards/cards.service.spec.ts:1359` "writes nothing on the card itself" (`writeActiveCard`) | ✅ PASS |
| CHK-19 board archived | `409` `/problems/board-archived` on POST item, PATCH, DELETE, move; list/card active or archived; nothing changes | POST `e2e/k/create:245-263` (`countItems toBe(0)`); PATCH `e2e/k/update:287-305` (`read() toEqual(item)`); move `e2e/k/move:285-302` (`read() toEqual(items)`); DELETE `e2e/k/delete:222-239` | ✅ PASS |
| CHK-20 list archived | `409` `/problems/list-archived`, card active or archived, nothing changes | POST `e2e/k/create:226-243`; PATCH `e2e/k/update:268-285`; move `e2e/k/move:267-283`; DELETE `e2e/k/delete:204-220` | ✅ PASS |
| CHK-21 card archived | `409` `/problems/card-archived`, nothing changes | POST `e2e/k/create:216-224`; PATCH `e2e/k/update:258-266`; move `e2e/k/move:258-265`; DELETE `e2e/k/delete:198-202`; unit `unit/cards/cards.service.spec.ts:1352` `writeActiveCard` "throws CardArchivedError on an archived card" | ✅ PASS |
| CHK-22 404 before 409 | lookup `404` wins over every archived `409` | item route: `e2e/k/update:307-314` unknown id on archived board → `toBe(404)`, `type toBe('/problems/checklist-item-not-found')`; deleted card's item `e2e/k/delete:242-249`; unit `unit/checklists/checklist-items.service.spec.ts:207-213` (unknown/foreign item rejected before `writeActiveCard` runs, for update, move and remove) and `:229-235` (item gone under the lock); `unit/cards/cards.service.spec.ts:1322` `writeActiveCard` "throws the error of before ahead of the board, list and card archived checks" (see Observation 3) | ✅ PASS |
| CHK-23 item foreign/unknown/malformed | `404` `/problems/checklist-item-not-found`, identical, no change | PATCH `e2e/k/update:227-251` (bodies equal, Bob's item unchanged `toEqual([bobsItem])`); move `e2e/k/move:192-238`; DELETE `e2e/k/delete:138-178`; error mapping `unit/checklists/checklists.errors.spec.ts:14` | ✅ PASS |
| CHK-24 token required | `401` on every checklist route | POST `e2e/k/create:181-188`, GET `e2e/k/read:131-137`, PATCH `e2e/k/update:327-334`, move `e2e/k/move:333-342`, DELETE `e2e/k/delete:274-283` - `toBe(401)`, Problem JSON, nothing changed | ✅ PASS |
| CHK-25 delete cascade | card, list, board delete removes items | `int/checklists/checklist-items-table.int-spec.ts:297-305` (card), `:308-316` (list), `:319-329` (board) - `itemCardIds() toEqual([otherCardId])`; through the API `e2e/k/delete:242-254` count `toBe(0)` | ✅ PASS |

**Status**: ✅ All 25 ACs covered with spec-anchored assertions. No spec-precision gaps: every AC names its status code, problem `type`, field or exact value.

---

## Discrimination Sensor

Run in a temporary detached `git worktree` at HEAD (`/tmp/chk-sensor`). `node_modules` (repo root and `back-end/`) were symlinked to the real ones; no `pnpm` command and no install ran in the worktree. Jest was invoked directly (`node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config test/jest-{unit,integration,e2e}.config.ts 'checklist|cards'`), so each layer ran the checklist and card suites (unit 156, integration 85, e2e 264 tests). Each mutant was applied alone by exact string replacement, the three layers ran, and the file was restored with `git checkout`. Afterwards the symlinks were removed, the worktree removed (`git worktree remove --force`, `git worktree prune`), the real tree's `git status --porcelain` matched the pre-sensor baseline (clean before; only this report and the `spec.md` traceability edit are new) and `find back-end/node_modules -maxdepth 2 -xtype l` returned nothing.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/checklists/checklist-items.service.ts:70` | move clamp off by one: `Math.min(position, count)` instead of `count - 1` | ✅ unit 2, e2e 3 |
| M2 | `src/checklists/checklist-items.service.ts:73` | same-place no-op removed (`if (to === from)` → `if (false)`) | ✅ unit 2 (e2e 0, see Observation 4) |
| M3 | `src/checklists/checklist-items.service.ts:95` | delete no longer closes the gap (shift skipped) | ✅ unit 1, e2e 2 |
| M4 | `src/cards/cards.service.ts:315` | `writeActiveCard` drops the `CardArchivedError` guard | ✅ unit 1, e2e 4 |
| M5 | `src/cards/cards.repository.ts:189` | `checklistCountsByCard` counts `NOT "done"` as done | ✅ int 2, e2e 5 |
| M6 | `src/checklists/checklist-items.repository.ts:36` | `findOwned` drops the `board.ownerId` filter | ✅ int 1 (e2e 0, see Observation 5) |
| M7 | `src/checklists/checklist-items.service.ts:80` | move up shifts `[to+1, from-1]` instead of `[to, from-1]` | ✅ unit 2, e2e 4 |
| M8 | `src/cards/cards.service.ts:369` | `before` hook (item re-read) moved after the board-archived guard (precedence) | ✅ unit 3, e2e 2 |

**Sensor depth**: P0-style (≥5 manual mutants; ordering invariant, ownership and guard precedence)
**Result**: 8/8 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`CardWithLabels` → `CardView` rename (T1) and `findOwnedCard` made public, `CardsService` exported, `CardsRepository.manager` getter; all required by the design; no unrelated edits) |
| No scope creep | ✅ (no `GET /checklist-items/:id`, no item archive, no cross-card move, no item limit) |
| Matches patterns | ✅ (nested collection / flat item routes, owner-scoped `findOwned`, board row lock via `writeLocked`, deferred unique position constraint as for cards, domain error mapping, `toXResponse` mapper, `ValidateIf(!== undefined)` for non-nullable PATCH fields as in labels) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `tasks.md` Test Coverage Matrix; `.specs/STATE.md` BE-AD-003, BE-AD-008, BE-AD-010, BE-AD-011 (new, records the `writeActiveCard` hook); no other guideline file - strong defaults applied | ✅ |

Lint passes with 0 oxlint diagnostics and Prettier clean.

---

## Edge Cases

- [x] Undeclared property on create (`done`, `position`, `cardId`), PATCH (`position`, `cardId`) and move (`cardId`, `text`) → `400`, nothing changed: `e2e/k/create:169-179`, `e2e/k/update:209-218`, `e2e/k/move:179-190`
- [x] Concurrent creates on one card → distinct positions `0..9` (CHK-15): `e2e/k/create:278-287`
- [x] Single item moved to any position → `200`, `position` `0`, unchanged: `e2e/k/move:149-156`
- [x] Card, list or board delete cascades to items (CHK-25): `int/checklists/checklist-items-table.int-spec.ts:297-329`
- [x] Item deleted twice → second call `404` `checklist-item-not-found`: `e2e/k/delete:105-113`

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`, real tree)
- **Result**: every step exit 0. Build ok; lint ok (oxlint 0 diagnostics; Prettier "All matched files use Prettier code style!"); unit 359 passed (21 suites); integration 186 passed (15 suites); e2e 539 passed (38 suites). 0 failed, 0 skipped. Integration and e2e start PostgreSQL through Testcontainers (`test/support/postgres.global-setup.ts`); no `docker compose` service was needed. The integration log's `password authentication failed for user "test"` line comes from an existing negative database-connection test, not a failure.
- **Test count before feature**: unit 296, integration 154, e2e 442 (892) - measured by running the three Jest configs directly in a detached worktree at `bfe4446` (node_modules symlinked, no `pnpm` run there)
- **Test count after feature**: unit 359, integration 186, e2e 539 (1084)
- **Delta**: +192 tests (unit +63, integration +32, e2e +97). No test deleted. The only edit to a pre-existing e2e test is one added `checklist: { total: 0, done: 0 }` expectation at `test/e2e/cards/create-card.e2e-spec.ts:117`. `test/unit/cards/cards.service.spec.ts` (+273/-12) renames `CardWithLabels`/`withLabels` to the new view type and replaces the `labelIds on write results` block with a `details on write results` block that checks both `labelIds` and `checklist` (equally strict or stricter).
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

None blocking. Three minor observations (optional test-only follow-ups) and two informational notes:

### Observation 1: no "200 characters after trim" boundary with surrounding spaces

- **Root cause**: CHK-03/CHK-07 bound the length "after trim"; tests use 200/201 characters with no whitespace (`e2e/k/create:148`, `:160`; `e2e/k/update:181`), so trim-then-length order is not pinned. Same pattern as labels Observation 3 (fixed there in `4afc13e`).
- **Fix task**: add a create and a PATCH case `'  ' + 'a'.repeat(200) + '  '` → accepted with `text` of length 200; `'  ' + 'a'.repeat(201) + '  '` → `400` `field: 'text'`.
- **Priority**: Minor
- **Status**: ✅ Resolved in `19fb924`

### Observation 2: CHK-06 rename checks the response, not the stored text

- **Root cause**: `e2e/k/update:154-160` asserts `res.body.text` only; the persisted value is covered for `done` (`:144`) and at the repository level (`int/checklists/checklist-items.repository.int-spec.ts:249`), not for a trimmed rename through the API.
- **Fix task**: add `expect(await read()).toEqual(res.body)` after `:159`.
- **Priority**: Minor
- **Status**: ✅ Resolved in `19fb924`

### Observation 3: CHK-22 on the nested create route is guarded by structure, not a dedicated test

- **Root cause**: no test sends `POST /cards/:cardId/checklist-items` with a foreign or unknown card id while the caller's own board is archived. The order is structural (`CardsService.writeLocked` runs `findOwnedCard` before the transaction and the archived guards), and the item routes have an explicit e2e (`e2e/k/update:307-314`).
- **Fix task**: optional e2e: archive Ana's board, then `POST` items on `UNKNOWN_ID` → `404` `/problems/card-not-found`.
- **Priority**: Minor
- **Status**: ✅ Resolved in `19fb924`

### Observation 4: same-place move no-op is only discriminated at unit level

- **Root cause**: M2 (no early return on a same-place move) survives e2e because the following `save()` of an unchanged entity issues no `UPDATE` in TypeORM, so `updatedAt` stays the same and the HTTP result is identical. `unit/checklists/checklist-items.service.spec.ts:336-350` (`expectNoWrites()`) kills it. Behavior per CHK-12 holds either way.
- **Fix task**: none.
- **Priority**: Info

### Observation 5: owner filter in `ChecklistItemsRepository.findOwned` is shielded at the HTTP layer

- **Root cause**: M6 survives e2e because `CardsService.writeLocked` re-checks the card through the owner-scoped `findOwnedCard`, whose `CardNotFoundError` is rethrown as `checklist-item-not-found` (defense in depth). `int/checklists/checklist-items.repository.int-spec.ts:147` kills it. Layering information only, same as labels Observation 5.
- **Fix task**: none.
- **Priority**: Info

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CHK-01 .. CHK-25 (all 25) | Pending | ✅ Verified |

**Status**: ✅ Applied to `spec.md` by the Verifier (traceability table and `**Coverage:**` line).

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 25/25 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 8/8 mutations killed
**Gate**: 1084 passed (359 unit + 186 integration + 539 e2e), 0 failed, 0 skipped

**What works**: checklist item CRUD with trimmed text (1-200), `done` defaulting to `false`, contiguous `0..n-1` positions kept by the board row lock and a deferred unique constraint (also under 10-way concurrent creates and moves and concurrent deletes); move clamp and same-place no-op; shifted items keep `updatedAt`; owner scoping with identical `404` bodies for foreign, unknown and malformed ids; archive guards board > list > card with lookup `404` first; `checklist { total, done }` on every card route from one aggregate query; card `updatedAt` untouched by item writes; cascades from card, list and board.

**Issues found**: none blocking; Observations 1-3 (optional test hardening) resolved in `19fb924`.

**Next steps**: open the PR.
