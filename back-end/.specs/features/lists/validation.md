# Lists Validation

**Date**: 2026-10-19
**Spec**: `.specs/features/lists/spec.md`
**Diff range**: `e6e964b^..HEAD` (branch `feat/lists-delete-endpoint`, HEAD `08875fb`; code commits `97ff057`..`8d409d6`, T1..T10)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict: PASS ✅.** All 29 requirements (LST-01..LST-29) and the 4 listed edge cases trace to a test assertion that targets the spec-defined outcome. The build gate is green (unit 173, integration 61, e2e 204). The sensor killed 25 of 25 behavior-level mutants, including guard precedence, owner scoping, position arithmetic and the board row lock. Four minor observations remain (see Fix Plans); none blocks the feature.

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
| T10 | ✅ Done | all boxes ticked (0 unchecked boxes in `tasks.md`) |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`. `e2e/` = `test/e2e/lists/`, `int/` = `test/integration/lists/`, `unit/` = `test/unit/lists/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| LST-01 create at end | `201`, body exactly `{ id, boardId, title, position, archivedAt: null, createdAt, updatedAt }`, `position` = active count before | `e2e/create-list.e2e-spec.ts:83-92` - `toBe(201)` + exact `toEqual({ id: UUID, boardId, title, position: 0, archivedAt: null, createdAt: ISO, updatedAt: ISO })`; second list `:112-113` `position toBe(1)`; unit `unit/lists.service.spec.ts:124-128` `create toHaveBeenCalledWith({ ..., position: 3 })` with `countActive` 3; `int/lists.repository.int-spec.ts:193-201` `countActive toBe(2)` ignores archived and foreign lists | ✅ PASS |
| LST-02 title trimmed | stored and returned trimmed | `e2e/create-list.e2e-spec.ts:99` `title toBe('To do')` for `'  To do  '`; row `:104` `toEqual({ board_id: boardId, title: 'To do' })` | ✅ PASS |
| LST-03 invalid title | `400` + `errors` item `field: 'title'`, no list | `e2e/create-list.e2e-spec.ts:116-124` (missing, number, null, blank, 101 chars) via `expectTitleError` `:72` `toBe(400)`, `:74-76` `arrayContaining([{ field: 'title', ... }])`, `:77` `countLists toBe(0)`; boundary 100 → 201 `:126-133` | ✅ PASS |
| LST-04 board foreign / unknown / malformed | `404` `/problems/board-not-found`, identical, no list | POST `e2e/create-list.e2e-spec.ts:162-171` - `toBe(404)`, `type toBe('/problems/board-not-found')`, bodies minus `instance`/`requestId` `toEqual` across the three, `countLists toBe(0)`; GET `e2e/read-lists.e2e-spec.ts:193-204` via `expectSameNotFound` `:82-92` | ✅ PASS |
| LST-05 create on archived board | `409` `/problems/board-archived`, no list | `e2e/create-list.e2e-spec.ts:182-185` - `toBe(409)`, `type toBe('/problems/board-archived')`, `countLists toBe(0)`; unit `unit/lists.service.spec.ts:165-168` | ✅ PASS |
| LST-06 active lists by position | `200`, `archivedAt` null only, `position` asc, archived board too | `e2e/read-lists.e2e-spec.ts:128-133` - `toBe(200)`, titles `toEqual(['To do','Doing','Done'])`, positions `[0,1,2]` (archived and other-board list excluded); `archived=false` `:144-146` equals no filter; archived board `:156-157`; empty `:113-114` `toEqual([])` | ✅ PASS |
| LST-07 `archived=true` | `200`, archived only, `position` null, `archivedAt` desc | `e2e/read-lists.e2e-spec.ts:169-178` - `toBe(200)`, titles `['Newer','Older']`, positions `[null,null]`, `archivedAt` values desc; tie-break `int/lists.repository.int-spec.ts:178-188` | ✅ PASS |
| LST-08 bad `archived` | `400` + `errors` item `field: 'archived'` | `e2e/read-lists.e2e-spec.ts:184-190` - `toBe(400)` + `arrayContaining([{ field: 'archived', ... }])` (value `yes`) | ✅ PASS (see Fix 2) |
| LST-09 read one list | `200`, archived or not, board archived or not | `e2e/read-lists.e2e-spec.ts:222-223` active `toEqual(list)`; archived `:232-238` `position: null`, `archivedAt`; archived board `:247-248` | ✅ PASS |
| LST-10 rename | `200`, updated list, later `updatedAt` | `e2e/update-list.e2e-spec.ts:96-105` - `toBe(200)`, `toEqual({ ...created, title: 'Backlog' })`, `updatedAt toBeGreaterThan(created)`, persisted `read toEqual(res.body)` | ✅ PASS |
| LST-11 invalid PATCH title | `400` `field: 'title'`, list unchanged | `e2e/update-list.e2e-spec.ts:127-144` (null, empty, blank, number, 101) - `toBe(400)`, `arrayContaining([{ field: 'title' }])`, `read toEqual(created)` | ✅ PASS |
| LST-12 PATCH `{}` | `200`, unchanged incl. `updatedAt` | `e2e/update-list.e2e-spec.ts:122-124` - `toBe(200)`, `toEqual(created)` (incl. `updatedAt`); unit `unit/lists.service.spec.ts:321-322` `save not.toHaveBeenCalled()` | ✅ PASS |
| LST-13 PATCH archived list | `409` `/problems/list-archived`, unchanged | `e2e/update-list.e2e-spec.ts:163-166` - `toBe(409)`, `type toBe('/problems/list-archived')`, `read toEqual(before)` | ✅ PASS |
| LST-14 move to `k` | `200`, moved list `position: k`, others shift keeping order | `e2e/move-list.e2e-spec.ts:115-130` - `toBe(200)`, `toEqual({ ...c, position: 0 })`, order `['C','A','B','D']`, positions `[0..3]`; shifted lists keep `updatedAt` `:132-134`; down `:142-159`; unit shift ranges `unit/lists.service.spec.ts:353`, `:365` | ✅ PASS |
| LST-15 `k > n-1` | moved to `n-1`, `200` | `e2e/move-list.e2e-spec.ts:167-169` - `toBe(200)`, `position toBe(2)`, order `['B','C','A']`; only list `:187-188`; unit clamp `unit/lists.service.spec.ts:384-385` | ✅ PASS |
| LST-16 same position | `200`, unchanged incl. `updatedAt` | `e2e/move-list.e2e-spec.ts:177-179` - `toBe(200)`, `toEqual(b)`, `read toEqual(b)`; unit no writes `unit/lists.service.spec.ts:403-404` | ✅ PASS |
| LST-17 invalid position | `400` `field: 'position'`, nothing changes | `e2e/move-list.e2e-spec.ts:191-210` (missing, -1, 1.5, `'2'`, null) - `toBe(400)`, `arrayContaining([{ field: 'position' }])`, order unchanged | ✅ PASS |
| LST-18 move archived list | `409` `/problems/list-archived`, nothing changes | `e2e/move-list.e2e-spec.ts:233-237` - `toBe(409)`, `type toBe('/problems/list-archived')`, list and order unchanged | ✅ PASS |
| LST-19 positions `0..n-1` always, also concurrent | contiguous, unique positions after every write | 10 concurrent creates `e2e/create-list.e2e-spec.ts:193-200` `toEqual([0..9])`; 10 concurrent moves `e2e/move-list.e2e-spec.ts:296-301` `toEqual([0,1,2,3,4])`; lifecycle create→move→archive→delete `e2e/delete-list.e2e-spec.ts:236-264`; archive/unarchive `e2e/archive-list.e2e-spec.ts:121-129`, `:157-162`; lock serializes `int/lists.repository.int-spec.ts:333`, `:338`; deferred unique rejects duplicate at COMMIT `int/lists-table.int-spec.ts:226-227`; rollback `int/lists.repository.int-spec.ts:353-355` | ✅ PASS (see Fix 3) |
| LST-20 archive | `200`, `archivedAt` = now, `position` null, gap closed | `e2e/archive-list.e2e-spec.ts:110-130` - `toBe(200)`, `toEqual({ ...a, position: null, archivedAt: ISO })`, `start ≤ archivedAt ≤ end`, remaining `[['B',0],['C',1]]`, listed in `?archived=true` | ✅ PASS |
| LST-21 archive twice | `200`, original `archivedAt` | `e2e/archive-list.e2e-spec.ts:139-141` - `toBe(200)`, `toEqual(archived)`; unit `unit/lists.service.spec.ts:460-461` no writes | ✅ PASS |
| LST-22 unarchive | `200`, `archivedAt` null, `position` = active count before | `e2e/archive-list.e2e-spec.ts:150-163` - `toBe(200)`, `toEqual({ ...archived, position: 2, archivedAt: null })`, order `['B','C','A']`, archive list empty; unit `unit/lists.service.spec.ts:472-474` | ✅ PASS |
| LST-23 unarchive active | `200`, unchanged | `e2e/archive-list.e2e-spec.ts:171-173` - `toBe(200)`, `toEqual(b)`, `read toEqual(b)` | ✅ PASS |
| LST-24 delete archived | `204`, no body, list gone | `e2e/delete-list.e2e-spec.ts:151-160` - `toBe(204)`, `text toBe('')`, follow-up GET `404` `list-not-found`, active `[['A',0],['C',1]]`, archive empty | ✅ PASS |
| LST-25 delete active | `409` `/problems/list-not-archived`, not deleted | `e2e/delete-list.e2e-spec.ts:139-142` - `toBe(409)`, `type toBe('/problems/list-not-archived')`, `read toEqual(a)` | ✅ PASS |
| LST-26 archived board freezes lists | every item write → `409` `/problems/board-archived`, list archived or not, nothing changes | unit, 5 writes × {active, archived list}: `unit/lists.service.spec.ts:282-298` `rejects.toBeInstanceOf(BoardArchivedError)` + `expectNoWrites()`; e2e: PATCH active `e2e/update-list.e2e-spec.ts:175-178`, PATCH archived (precedence) `:189-191`; move `e2e/move-list.e2e-spec.ts:246-249`; archive (active) / unarchive (archived) `e2e/archive-list.e2e-spec.ts:188-191`; DELETE archived (precedence) `e2e/delete-list.e2e-spec.ts:170-173` - each `toBe(409)`, `type toBe('/problems/board-archived')`, list unchanged | ✅ PASS (see Fix 1) |
| LST-27 list foreign / unknown / malformed | `404` `/problems/list-not-found`, identical, nothing changes | GET `e2e/read-lists.e2e-spec.ts:251-262`; PATCH `e2e/update-list.e2e-spec.ts:204-213`; move `e2e/move-list.e2e-spec.ts:263-273`; archive/unarchive `e2e/archive-list.e2e-spec.ts:205-218`; DELETE `e2e/delete-list.e2e-spec.ts:185-196` - each `toBe(404)`, `type toBe('/problems/list-not-found')`, bodies `toEqual` across the three, foreign list `toEqual` before; every route as Bob `e2e/delete-list.e2e-spec.ts:212-221`; repo `int/lists.repository.int-spec.ts:135`; mapping `unit/lists.errors.spec.ts:37` | ✅ PASS |
| LST-28 token required | `401` on every list route | all 8 routes `e2e/delete-list.e2e-spec.ts:227-233` - `[method, path, status] toEqual([..., 401])`, lists unchanged; per-route with `problem+json` `e2e/create-list.e2e-spec.ts:148`, `e2e/read-lists.e2e-spec.ts:211`, `:271`, `e2e/update-list.e2e-spec.ts:223`, `e2e/move-list.e2e-spec.ts:283`, `e2e/archive-list.e2e-spec.ts:231` | ✅ PASS |
| LST-29 board delete cascades | lists of the deleted board removed, others kept | `int/lists-table.int-spec.ts:210-217` - after `DELETE FROM boards`, `SELECT board_id FROM lists toEqual([{ board_id: otherBoardId }])` (active and archived list removed) | ✅ PASS |

**Status**: ✅ All 29 requirements covered with spec-anchored assertions. No spec-precision gaps: the spec fixes every status code, problem `type`, field name, ordering, position value and boundary. Payload/conjunction rule applied: response bodies are asserted on exact values (`toEqual` on the full list object or on the field), and unit write calls are asserted with their arguments (`shift(BOARD_ID, 0, 2, 1)`, `create({ boardId, title, position })`, `save(objectContaining({ position, archivedAt }))`), not only that a call occurred.

---

## Discrimination Sensor

Run in a temporary detached `git worktree` at HEAD under the session scratchpad. `node_modules` (repo root and `back-end/`) were symlinked to the real ones; no install was run. Jest was invoked directly (`node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ...`) because `pnpm test` in the worktree triggers pnpm's dependency check, which tried to run `pnpm install` (aborted by pnpm with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, nothing changed). Each mutant was applied alone, the lists unit (64), integration (29) and e2e (74) suites were run, and the file was restored with `git checkout`. The worktree was then removed (`git worktree remove --force`, `git worktree prune`); the real tree's `git status --porcelain` matched the pre-sensor baseline (clean) and `find back-end/node_modules -maxdepth 2 -xtype l` returned nothing.

| Mutation | File:line | Description | Killed? (failing tests) |
| -------- | --------- | ----------- | ----------------------- |
| M1 | `src/lists/lists.service.ts:45` | Create appends at `n + 1` | ✅ unit 2, e2e 13 |
| M2 | `src/lists/lists.service.ts:102` | Move clamps to `n` instead of `n - 1` | ✅ unit 3, e2e 2 |
| M3 | `src/lists/lists.service.ts:105` | Move to the same position is no longer a no-op | ✅ unit 3 |
| M4 | `src/lists/lists.service.ts:112` | Move up shifts `[k, i-2]` (one list too few) | ✅ unit 1, e2e 3 |
| M5 | `src/lists/lists.service.ts:114` | Move down shifts by `+1` instead of `-1` | ✅ unit 2, e2e 3 |
| M6 | `src/lists/lists.service.ts:131` | Archive does not close the gap | ✅ unit 1, e2e 4 |
| M7 | `src/lists/lists.service.ts:146` | Unarchive puts the list at `n + 1` | ✅ unit 1, e2e 1 |
| M8 | `src/lists/lists.service.ts:182` | Item writes skip the board-archived guard | ✅ unit 10, e2e 6 |
| M9 | `src/lists/lists.service.ts:182` | Precedence: archived list on archived board falls through to the list-state guard | ✅ unit 5, e2e 3 |
| M10 | `src/lists/lists.service.ts:155` | Delete guard flipped (deletes active, rejects archived) | ✅ unit 2, e2e 3 |
| M11 | `src/lists/lists.service.ts:124` | Archive not idempotent | ✅ unit 1, e2e 1 |
| M12 | `src/lists/lists.service.ts:95` | Move allowed on an archived list | ✅ unit 1, e2e 1 |
| M13 | `src/lists/lists.service.ts:78` | PATCH allowed on an archived list | ✅ unit 1, e2e 1 |
| M14 | `src/lists/lists.service.ts:142` | Unarchive of an active list moves it to the end | ✅ unit 1, e2e 1 |
| M15 | `src/lists/lists.service.ts:41` | Create allowed on an archived board | ✅ unit 1, e2e 1 |
| M16 | `src/lists/lists.repository.ts:43` | `findOwned` drops the owner filter | ✅ int 1, e2e 2 |
| M17 | `src/lists/lists.repository.ts:33` | `lockOwnedBoard` drops the owner filter | ✅ int 1, e2e 2 |
| M18 | `src/lists/lists.repository.ts:34` | Board row not locked (`FOR UPDATE` removed) | ✅ int 13, e2e 2 (both concurrency e2e tests) |
| M19 | `src/lists/lists.repository.ts:51` | Archived lists ordered oldest first | ✅ int 1, e2e 1 |
| M20 | `src/lists/lists.controller.ts:71` | Missing `archived` treated as `true` | ✅ e2e 21 |
| M21 | `src/lists/lists.service.ts:60` | Malformed list id reaches the database | ✅ unit 6, e2e 6 |
| M22 | `src/errors/domain-error-mappings.ts:57` | `ListArchivedError` mapped to `400` | ✅ unit 1, e2e 2 |
| M23 | `src/lists/dto/update-list.dto.ts:11` | PATCH accepts `title: null` | ✅ e2e 1 |
| M24 | `src/lists/dto/move-list.dto.ts:8` | Move accepts a negative position (`@Min(0)` removed) | ✅ e2e 1 |
| M25 | `src/lists/lists.service.ts:130` | Archive of the second-to-last list leaves a gap | ✅ e2e 2 |

**Sensor depth**: expanded (≥5; position integrity, guard precedence and owner scoping are core-domain / data-integrity paths)
**Result**: 25/25 killed - PASS ✅

Note: M3 is killed only at the unit level. Over HTTP it is not observable: the shift range is empty and TypeORM skips the `UPDATE` when no column changed, so `updatedAt` stays put; the unit test (`unit/lists.service.spec.ts:404` `expectNoWrites()`) guards the intent. Same pattern as boards M8/M10.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes (lists module, `CreateLists` migration, error mappings, `AppModule` import; no boards code changed) | ✅ |
| No scope creep | ✅ |
| Matches patterns (boards: domain errors + mapping table, owner-scoped repository, DTO `trim`, response mapper, `isUUID` guard) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (service 1:1 to ACs incl. guard precedence and every position case in unit; table, constraints, cascade, every repository method, lock and `updated_at` on shift in integration; every route happy + edge + error + concurrency in e2e) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `.specs/features/lists/tasks.md` (Test Coverage Matrix), `.specs/STATE.md` (BE-AD-003, BE-AD-008, BE-AD-009) | ✅ |

---

## Edge Cases

- [x] Undeclared property → `400`: create `position` `e2e/create-list.e2e-spec.ts:138-140` (no row); PATCH `position` `e2e/update-list.e2e-spec.ts:151-153` (unchanged); move `title` `e2e/move-list.e2e-spec.ts:217-219` (order unchanged)
- [x] Board with no lists → `200 []`: `e2e/read-lists.e2e-spec.ts:113-114`
- [x] Only active list moved anywhere → `200`, `position` `0`: `e2e/move-list.e2e-spec.ts:187-188` (`toEqual(only)`); unit `unit/lists.service.spec.ts:393-395`
- [x] Board deleted → its lists deleted (LST-29): `int/lists-table.int-spec.ts:217`

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`)
- **Result**: every step exit 0. Build ok; lint ok (oxlint clean, Prettier clean); unit 173 passed (15 suites); integration 61 passed (8 suites); e2e 204 passed (20 suites). 0 failed, 0 skipped.
- **Lists tests added**: unit 64 (`test/unit/lists`), integration 29 (`test/integration/lists`), e2e 74 (`test/e2e/lists`)
- **Test count before feature**: unit 109, integration 32, e2e 130 (totals minus lists suites; matches the boards validation totals)
- **Test count after feature**: unit 173, integration 61, e2e 204
- **Delta**: +167 tests; no test deleted or weakened (the diff range touches no test file outside `test/*/lists/`)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (minor, non-blocking)

### Fix 1: LST-26 three state combinations proven only in unit

- **Root cause**: e2e covers board-archived on PATCH (both list states), move (active), archive (active), unarchive (archived) and DELETE (archived). DELETE on an active list, archive on an already archived list and unarchive on an active list of an archived board are proven only by `unit/lists.service.spec.ts:282-298`. These are the precedence cases where the list-state branch would otherwise answer (`list-not-archived`) or no-op (`200`). The shared `writeLocked` guard makes the risk low, and M8/M9 were killed by both layers.
- **Fix task**: add one e2e `it.each` that archives the board and calls DELETE on an active list, archive on an archived list and unarchive on an active list, asserting `409` `/problems/board-archived` and the list unchanged; optionally unarchive the board afterwards and assert the list equals its pre-archive state (spec Independent Test).
- **Priority**: Minor

### Fix 2: LST-08 asserted with one invalid value

- **Root cause**: `e2e/read-lists.e2e-spec.ts:181-191` checks only `archived=yes`; boards checked `yes`, `1`, `TRUE` and empty (`read-boards.e2e-spec.ts:124-137`). The DTO uses the same `@IsIn(['true','false'])`, so behavior is right.
- **Fix task**: turn the test into an `it.each` over `yes`, `1`, `TRUE` and empty.
- **Priority**: Minor

### Fix 3: LST-19 concurrency proven for create and move only

- **Root cause**: concurrent e2e tests fire creates (`create-list.e2e-spec.ts:188`) and moves (`move-list.e2e-spec.ts:287`); concurrent archive / unarchive / mixed writes are not exercised. All writes share the same `writeLocked` lock path, and removing the lock (M18) fails both concurrency tests plus 13 integration tests, so the lock itself is discriminated.
- **Fix task**: optional mixed-concurrency e2e (archive, unarchive, move and create in one `Promise.all`) asserting contiguous active positions.
- **Priority**: Minor

### Fix 4: Requirement Traceability still shows "In Tasks"

- **Root cause**: `spec.md` traceability table was not advanced after implementation; the Verifier does not edit `spec.md`.
- **Fix task**: set LST-01..LST-29 to `✅ Verified` in a docs commit.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LST-01 .. LST-29 | In Tasks | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 29/29 requirements matched spec outcome; 0 spec-precision gaps
**Sensor**: 25/25 mutations killed
**Gate**: 438 passed (173 unit + 61 integration + 204 e2e), 0 failed

**What works**: create at the end with trimmed title under the board lock; active lists by position and archived lists newest first; read of own lists in any state; rename with `{}` no-op; move with clamp, same-position no-op and shifted lists keeping `updatedAt`; archive closing the gap and idempotent; unarchive to the end; delete only from the archive; board-archived guard winning over list-state guards; identical `404` for foreign/unknown/malformed board and list ids; `401` on every route; contiguous positions under concurrent writes; cascade on board delete.

**Issues found**: four minor items above; none affects behavior.

**Next steps**: optionally apply Fix 1-3 as test-only commits and Fix 4 as a docs commit, then merge.
