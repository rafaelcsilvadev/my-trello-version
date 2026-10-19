# Boards Validation

**Date**: 2026-10-19
**Spec**: `.specs/features/boards/spec.md`
**Diff range**: `d0a23b2^..HEAD` (branch `feat/boards-delete-endpoint`, HEAD `6894385`; code commits `afe4aa6`..`7759fef`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict: PASS ✅.** All 23 requirements (BRD-01..BRD-23) and the 3 listed edge cases trace to a test assertion that targets the spec-defined outcome. The build gate is green (unit 109, integration 32, e2e 130). The sensor killed 19 of 19 behavior-level mutants. Three minor observations remain (see Fix Plans); none blocks the feature.

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

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| BRD-01 create valid board | `201`, body exactly `{ id, title, description, archivedAt: null, createdAt, updatedAt }`, owned by caller | `test/e2e/boards/create-board.e2e-spec.ts:69` - `toBe(201)`; `:70-77` - exact `toEqual({ id: UUID, title, description, archivedAt: null, createdAt: ISO, updatedAt: ISO })`; owner `:85-89` - join on `owner_id` → `toEqual({ title: 'Roadmap', email: 'ana@example.com' })` | ✅ PASS |
| BRD-02 trim title/description; blank → `null` | stored and returned trimmed; missing/empty/blank/null description → `null` | `create-board.e2e-spec.ts:84` `title toBe('Roadmap')` + row `:89`; `:96` `description toBe('Q4')`; `:99-114` four cases → `res.body.description toBeNull()` and `row.description toBeNull()` | ✅ PASS |
| BRD-03 invalid title | `400` + `errors` item `field: 'title'` | `create-board.e2e-spec.ts:116-125` (missing, number, null, empty, blank, 101 chars) via `expectFieldError` `:58` `toBe(400)` + `:60-62` `arrayContaining([{ field: 'title', ... }])` + `:63` no row; boundary 100 after trim → 201 `:127-134` | ✅ PASS |
| BRD-04 invalid description | `400` + `errors` item `field: 'description'`; `null` allowed | `create-board.e2e-spec.ts:136-144` (number, 1001 chars) via `expectFieldError`; `null` accepted `:103`; boundary 1000 after trim → 201 `:146-156` | ✅ PASS |
| BRD-05 default / `archived=false` list | `200`, caller's active boards, `createdAt` desc | `test/e2e/boards/read-boards.e2e-spec.ts:85-86` - `toBe(200)`, `titles toEqual(['Ana 2', 'Ana 1'])` (archived and Bob's excluded); `:104-107` `archived=false` same; empty `:70-71` `toEqual([])`; tie-break `test/integration/boards/boards.repository.int-spec.ts:165` | ✅ PASS |
| BRD-06 `archived=true` list | `200`, caller's archived boards, `createdAt` desc | `read-boards.e2e-spec.ts:119-121` - `toBe(200)`, `toEqual(['Ana archived 2', 'Ana archived 1'])`, `archivedAt not.toBeNull()` | ✅ PASS |
| BRD-07 bad `archived` value | `400` + `errors` item `field: 'archived'` | `read-boards.e2e-spec.ts:124-137` (`yes`, `1`, `TRUE`, empty) - `toBe(400)` + `arrayContaining([{ field: 'archived', ... }])` | ✅ PASS |
| BRD-08 read own board | `200`, archived or not | `read-boards.e2e-spec.ts:153-154` - `toBe(200)`, `toEqual(created)`; archived `:163-165` | ✅ PASS |
| BRD-09 no foreign boards in lists | lists contain only caller's boards | `read-boards.e2e-spec.ts:86-87` (Ana/Bob interleaved); archived list excludes Bob's `:120`; repo `boards.repository.int-spec.ts:126`, `:145`, `:171` | ✅ PASS |
| BRD-10 PATCH fields present | `200`, only present fields change, later `updatedAt` | `test/e2e/boards/update-board.e2e-spec.ts:79-87` - `toBe(200)`, `toEqual({ ...created, title: 'Launch', updatedAt })`, `updatedAt toBeGreaterThan(created)`; persisted `:88`; unit `test/unit/boards/boards.service.spec.ts:116-122` | ✅ PASS |
| BRD-11 PATCH `description: null` | stored `null` | `update-board.e2e-spec.ts:96-98` - `description toBeNull()`, title kept; unit `boards.service.spec.ts:146-149` (`save` called with `description: null`) | ✅ PASS |
| BRD-12 invalid PATCH | `400`, error item per invalid field, board unchanged | `update-board.e2e-spec.ts:120-143` (7 cases incl. `title: null`) - `toBe(400)`, `arrayContaining([{ field }])`, `read toEqual(created)`; both fields `:153-155` | ✅ PASS |
| BRD-13 PATCH `{}` | `200`, board unchanged incl. `updatedAt` | `update-board.e2e-spec.ts:174-175` - `toBe(200)`, `toEqual(created)`; unit `boards.service.spec.ts:158-159` `save not.toHaveBeenCalled()` | ✅ PASS |
| BRD-14 PATCH archived board | `409`, `type` `/problems/board-archived`, unchanged | `update-board.e2e-spec.ts:185-188` - `toBe(409)`, `type toBe('/problems/board-archived')`, `read toEqual(before)` | ✅ PASS |
| BRD-15 archive active | `200`, `archivedAt` = current time | `test/e2e/boards/archive-board.e2e-spec.ts:77-82` - `toBe(200)`, `toEqual({ ...created, archivedAt: ISO, updatedAt })`; moves lists `:83-84`; current time `boards.service.spec.ts:190-192` (`before ≤ archivedAt ≤ now`) | ✅ PASS |
| BRD-16 archive twice | `200`, original `archivedAt` unchanged | `archive-board.e2e-spec.ts:93-94` - `toBe(200)`, `toEqual(first.body)`; unit `boards.service.spec.ts:205-206` | ✅ PASS |
| BRD-17 unarchive archived | `200`, `archivedAt` `null` | `archive-board.e2e-spec.ts:103-106` - `toBe(200)`, `archivedAt toBeNull()`, back in active list, gone from archived list | ✅ PASS |
| BRD-18 unarchive active | `200`, board unchanged | `archive-board.e2e-spec.ts:114-115` - `toBe(200)`, `toEqual(created)`; unit `boards.service.spec.ts:229-230` | ✅ PASS |
| BRD-19 delete archived | `204`, no body, board gone | `test/e2e/boards/delete-board.e2e-spec.ts:94-98` - `toBe(204)`, `res.text toBe('')`, follow-up GET `toBe(404)` + `board-not-found` | ✅ PASS |
| BRD-20 delete active | `409`, `type` `/problems/board-not-archived`, not deleted | `delete-board.e2e-spec.ts:81-85` - `toBe(409)`, `type toBe('/problems/board-not-archived')`, `read toEqual(created)` | ✅ PASS |
| BRD-21 foreign / unknown / malformed id | `404`, `/problems/board-not-found`, identical, nothing changed | GET `read-boards.e2e-spec.ts:178-189` (bodies minus `instance`/`requestId` `toEqual`); PATCH `update-board.e2e-spec.ts:200-205`; archive/unarchive `archive-board.e2e-spec.ts:133-138`; DELETE `delete-board.e2e-spec.ts:111-117` - each `toBe(404)` + `type toBe('/problems/board-not-found')` + foreign board `toEqual(before)`; mapping `test/unit/boards/boards.errors.spec.ts:37` | ✅ PASS (minor: full-body identity asserted only on GET, see Fix 1) |
| BRD-22 token required on every route | `401` without token | create `create-board.e2e-spec.ts:174`; list `read-boards.e2e-spec.ts:142`; read `:199`; PATCH `update-board.e2e-spec.ts:215-216`; archive/unarchive `archive-board.e2e-spec.ts:151-152`; DELETE `delete-board.e2e-spec.ts:128-130` - `toBe(401)` (+ board unchanged on writes) | ✅ PASS |
| BRD-23 owner deletion cascades | user's boards deleted, others kept | `test/integration/boards/boards-table.int-spec.ts:167` - `toEqual([{ owner_id: otherId }])` | ✅ PASS |

**Status**: ✅ All 23 requirements covered with spec-anchored assertions. No spec-precision gaps: the spec fixes every status code, problem `type`, field name, ordering and boundary.

---

## Discrimination Sensor

Run in a temporary `git worktree` at HEAD (scratchpad, `node_modules` symlinked), each mutant applied alone, the relevant boards suites run, the file restored with `git checkout`. The worktree was removed afterwards and the real tree's `git status --porcelain` matched the pre-sensor baseline (clean).

| Mutation | File | Description | Killed? (by) |
| -------- | ---- | ----------- | ------------ |
| M1 | `src/boards/boards.service.ts:95` | Drop archived check on delete | ✅ unit 1, e2e 1 |
| M2 | `src/boards/boards.repository.ts:21` | `findOwned` drops owner filter | ✅ int 1, e2e 5 |
| M3 | `src/boards/boards.repository.ts:26` | `listOwned` drops owner filter | ✅ int 3, e2e 2 |
| M4 | `src/boards/boards.repository.ts:37` | `deleteOwned` drops owner filter | ✅ int 1 |
| M5 | `src/boards/boards.repository.ts:27` | List order `createdAt ASC` | ✅ int 2, e2e 3 |
| M6 | `src/boards/boards.service.ts:73` | Archive not idempotent (always resets `archivedAt`) | ✅ unit 1, e2e 1 |
| M7 | `src/boards/boards.service.ts:77` | Archive sets `new Date(0)` | ✅ unit 1 |
| M8 | `src/boards/boards.service.ts:84` | Unarchive on active board saves anyway | ✅ unit 1 |
| M9 | `src/boards/boards.service.ts:51` | PATCH allowed on archived board | ✅ unit 1, e2e 1 |
| M10 | `src/boards/boards.service.ts:61` | Empty PATCH saves | ✅ unit 1 |
| M11 | `src/errors/domain-error-mappings.ts` | `BoardNotArchivedError` → `400` | ✅ unit 1, e2e 1 |
| M12 | `src/errors/domain-error-mappings.ts` | `BoardNotFoundError` → `403` | ✅ unit 1, e2e 7 |
| M13 | `src/boards/dto/create-board.dto.ts:17` | Title max length 101 | ✅ e2e 1 |
| M14 | `src/boards/dto/update-board.dto.ts:17` | PATCH title accepts `null` | ✅ e2e 2 |
| M15 | `src/boards/dto/create-board.dto.ts:11` | Blank description not turned into `null` | ✅ e2e 3 |
| M16 | `src/boards/boards.controller.ts:62` | `archived=true` ignored | ✅ e2e 4 |
| M17 | `src/boards/boards.service.ts:33` | Malformed id reaches the database | ✅ unit 1, e2e 5 |
| M18 | `src/boards/boards.controller.ts:95` | Archive returns `201` | ✅ e2e 8 |
| M19 | `src/boards/dto/create-board.dto.ts:6` | Title not trimmed | ✅ e2e 5 |

**Sensor depth**: expanded (≥5; ownership boundary is a data-integrity path)
**Result**: 19/19 killed - PASS ✅

Note: M7, M8 and M10 are killed only at the unit level. M8 and M10 are not observable over HTTP because TypeORM skips the `UPDATE` when no column changed, so `updatedAt` stays put; the unit tests guard the intent. M7 is observable over HTTP but e2e asserts only the ISO format of `archivedAt` (Fix 2).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes (only boards module, migration, error mapping, test support for migrations) | ✅ |
| No scope creep | ✅ |
| Matches patterns (auth module: domain errors + mapping table, owner-scoped repository, DTO transforms) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (service 1:1 to ACs in unit; repository + migration in integration; every route happy + edge + error in e2e) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `.specs/features/boards/tasks.md` (Test Coverage Matrix) | ✅ |

---

## Edge Cases

- [x] Undeclared property (`archivedAt`) on create → `400`, no row: `create-board.e2e-spec.ts:164-166`; on PATCH → `400`, unchanged: `update-board.e2e-spec.ts:165-166`
- [x] User with no boards → `200 []`: `read-boards.e2e-spec.ts:70-71`
- [x] Account deletion cascades to boards (BRD-23): `boards-table.int-spec.ts:167`

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`)
- **Result**: exit 0. Build ok; lint ok (oxlint clean, Prettier clean); unit 109 passed (13 suites); integration 32 passed (6 suites); e2e 130 passed (14 suites). 0 failed, 0 skipped.
- **Boards tests added**: unit 22 (`test/unit/boards`), integration 17 (`test/integration/boards`), e2e 63 (`test/e2e/boards`)
- **Test count before feature**: unit 87, integration 15, e2e 67 (derived: totals minus boards suites; the users/database integration suites were only edited to revert all migrations)
- **Test count after feature**: unit 109, integration 32, e2e 130
- **Delta**: +102 tests; no test deleted or weakened
- **Skipped tests**: none
- **Failures**: none (the `password authentication failed for user "test"` line in the integration log comes from an existing negative-path database test that passes)

---

## Fix Plans (minor, non-blocking)

### Fix 1: BRD-21 identity asserted on full body only for GET

- **Root cause**: PATCH, archive, unarchive and DELETE 404 tests assert `status` and `type` per case but do not compare the three bodies with each other (`update-board.e2e-spec.ts:200-204`, `archive-board.e2e-spec.ts:133-137`, `delete-board.e2e-spec.ts:111-116`). The implementation shares one error class, so the risk is low.
- **Fix task**: reuse the GET pattern (`read-boards.e2e-spec.ts:177-189`, strip `instance`/`requestId`, `toEqual` across the three cases) in the other `/:id` suites.
- **Priority**: Minor

### Fix 2: BRD-15 "current time" asserted only in unit

- **Root cause**: `archive-board.e2e-spec.ts:80` asserts `archivedAt` matches ISO format only; `new Date(0)` survives e2e (killed by unit `boards.service.spec.ts:191`).
- **Fix task**: in the e2e archive test, assert `archivedAt` falls between timestamps taken before and after the request.
- **Priority**: Minor

### Fix 3: Requirement Traceability still shows "In Tasks"

- **Root cause**: `spec.md` traceability table was not advanced after implementation; the Verifier does not edit `spec.md`.
- **Fix task**: set BRD-01..BRD-23 to `✅ Verified` in a docs commit.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| BRD-01 .. BRD-23 | In Tasks | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 23/23 requirements matched spec outcome; 0 spec-precision gaps
**Sensor**: 19/19 mutations killed
**Gate**: 271 passed (109 unit + 32 integration + 130 e2e), 0 failed

**What works**: create with trim/null rules and field-level `400`s; owner-scoped list with `archived` filter and newest-first order; read of own boards; PATCH with partial update, no-op `{}`, and `409` on archived boards; idempotent archive/unarchive; delete only from the archive; identical `404` for foreign/unknown/malformed ids; `401` on every route; owner cascade.

**Issues found**: three minor items above; none affects behavior.

**Next steps**: optionally apply Fix 1-3, then merge.
