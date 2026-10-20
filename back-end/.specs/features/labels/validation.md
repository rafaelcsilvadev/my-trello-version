# Labels Validation

**Date**: 2026-10-20
**Spec**: `.specs/features/labels/spec.md`
**Diff range**: `1857c93..HEAD` (branch `feat/cards-label-endpoints`, HEAD `3ed9f62`; tasks T1..T12)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict: PASS ✅.** All 33 requirements (LBL-01..LBL-33) and the listed edge cases trace to a test assertion that targets the spec-defined outcome. The build gate is green (unit 296, integration 154, e2e 437, 0 failed, 0 skipped). The sensor killed 10 of 10 behavior-level mutants covering owner scoping, case-insensitive name uniqueness, the same-board label rule, archive guards, error precedence, the label-delete cascade, `labelIds` order and the PATCH `null` rule. Five minor, non-blocking observations are listed under Fix Plans.

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
| T12 | ✅ Done | all boxes ticked (66 ticked, 0 unchecked boxes in `tasks.md`) |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`. `e2e/l/` = `test/e2e/labels/`, `e2e/c/` = `test/e2e/cards/`, `int/` = `test/integration/`, `unit/` = `test/unit/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| LBL-01 create | `201`, body exactly `{ id, boardId, name, color, createdAt, updatedAt }` | `e2e/l/create-label.e2e-spec.ts:96-104` - `toBe(201)` + exact `toEqual({ id: UUID, boardId, name: 'Bug', color: 'red', createdAt: ISO, updatedAt: ISO })`; unit `unit/labels/labels.service.spec.ts:99` creates under the lock | ✅ PASS |
| LBL-02 trimmed name | stored and returned trimmed | `e2e/l/create-label.e2e-spec.ts:111` `name toBe('Bug')` for `'  Bug  '`; `:116` row `toEqual({ board_id, name: 'Bug', color: 'red' })` | ✅ PASS |
| LBL-03 invalid name | `400` + `errors` item `field: 'name'`, no label | `e2e/l/create-label.e2e-spec.ts:119-127` (missing, number, null, whitespace, 51 chars) via `expectFieldError` `:85` `toBe(400)`, `:87-89` `arrayContaining([{ field: 'name', ... }])`, `:90` `countLabels toBe(0)`; boundary 50 → `201` `:129-136` | ✅ PASS |
| LBL-04 invalid color | `400` + `field: 'color'`, exact lowercase palette only | `e2e/l/create-label.e2e-spec.ts:145-153` (missing, `'Green'`, `'white'`, hex, number) via `expectFieldError`; all 10 palette values `201` `:138-143`; DB check `int/labels/labels-table.int-spec.ts:241-248` `CHK_labels_color` | ✅ PASS |
| LBL-05 name taken (ignore case) | `409` `/problems/label-name-taken`, no label | `e2e/l/create-label.e2e-spec.ts:160-163` - `toBe(409)`, `type toBe('/problems/label-name-taken')`, `countLabels toBe(1)`; `int/labels/labels.repository.int-spec.ts:176` `LabelNameTakenError` | ✅ PASS |
| LBL-06 same name other board | `201` | `e2e/l/create-label.e2e-spec.ts:172-173` `toBe(201)`, `boardId toBe(otherBoardId)`; `int/labels/labels-table.int-spec.ts:266-273` | ✅ PASS |
| LBL-07 archived board create | `409` `/problems/board-archived`, no label | `e2e/l/create-label.e2e-spec.ts:226-229` - `toBe(409)`, `type toBe('/problems/board-archived')`, `countLabels toBe(0)`; unit `unit/labels/labels.service.spec.ts:138` | ✅ PASS |
| LBL-08 board foreign/unknown/malformed | `404` `/problems/board-not-found`, identical, no label (POST and GET) | POST `e2e/l/create-label.e2e-spec.ts:207-215` - `toBe(404)`, `type toBe('/problems/board-not-found')`, bodies minus `instance`/`requestId` `toEqual`, `countLabels toBe(0)`; GET `e2e/l/read-labels.e2e-spec.ts:119-127` (GET bodies also equal POST body) | ✅ PASS |
| LBL-09 list labels | `200`, `createdAt` asc then `id`, also when archived, `[]` when none | `e2e/l/read-labels.e2e-spec.ts:73` `toEqual([bug, idea, chore])`; `:87` same after archive; `:94` `toEqual([])`; tie by id `int/labels/labels.repository.int-spec.ts:130` | ✅ PASS |
| LBL-10 edit | only given fields, trimmed, `updatedAt` later, `200` + body | `e2e/l/update-label.e2e-spec.ts:108-118` - `toBe(200)`, `toEqual({ ...created, name: 'Defect', color: 'orange' })`, `updatedAt toBeGreaterThan`, persisted read equal; name only `:126-128`, color only `:136-138` | ✅ PASS |
| LBL-11 invalid name on PATCH | `400` `field: 'name'` (null, number, blank, 51), unchanged | `e2e/l/update-label.e2e-spec.ts:141-160` - `toBe(400)`, `arrayContaining([{ field, ... }])`, `read toEqual(created)` | ✅ PASS |
| LBL-12 invalid color on PATCH | `400` `field: 'color'` (null, `'Green'`, outside), unchanged | `e2e/l/update-label.e2e-spec.ts:146-148` rows of the same table, asserts `:154-159` | ✅ PASS |
| LBL-13 rename clash | `409` `/problems/label-name-taken`, unchanged | `e2e/l/update-label.e2e-spec.ts:168-171` - `toBe(409)`, `type toBe('/problems/label-name-taken')`, `read toEqual(created)`; `int/labels/labels.repository.int-spec.ts:240` | ✅ PASS |
| LBL-14 own name other case | `200`, new value stored | `e2e/l/update-label.e2e-spec.ts:179-180` `toBe(200)`, `name toBe('DEFECT')`; persisted in `int/labels/labels.repository.int-spec.ts:227` (see Observation 2) | ✅ PASS |
| LBL-15 empty body | `200`, unchanged, `updatedAt` unchanged | `e2e/l/update-label.e2e-spec.ts:188-190` `toBe(200)`, `toEqual(created)` (includes `updatedAt`), persisted read equal; unit `unit/labels/labels.service.spec.ts:265-272` `save not.toHaveBeenCalled()` | ✅ PASS |
| LBL-16 delete | `204`, gone from board list | `e2e/l/delete-label.e2e-spec.ts:105-109` `toBe(204)`, `text toBe('')`, `read toBeUndefined()`, other label kept | ✅ PASS |
| LBL-17 delete removes links, `updatedAt` kept | `labelIds` loses the id on active and archived cards, `updatedAt` unchanged | `e2e/c/card-labels.e2e-spec.ts:343-355` - both cards `toEqual(before.map(card => ({ ...card, labelIds: [] })))`; `int/labels/labels-table.int-spec.ts:299-308` | ✅ PASS |
| LBL-18 apply | `204`, no body | `e2e/c/card-labels.e2e-spec.ts:130-132` `toBe(204)`, `text toBe('')`, `read toEqual({ ...before, labelIds: [bugId] })` | ✅ PASS |
| LBL-19 apply twice | `204`, held once | `e2e/c/card-labels.e2e-spec.ts:140-141` `toBe(204)`, `labelIds toEqual([bugId])`; `int/cards/cards.repository.int-spec.ts:502-510` | ✅ PASS |
| LBL-20 remove / remove not applied | `204`, no body; not applied → `204` no change | `e2e/c/card-labels.e2e-spec.ts:150-152` `toBe(204)`, `text toBe('')`, `labelIds: []`; `:160-161` `toBe(204)`, `read toEqual(before)` | ✅ PASS |
| LBL-21 card `updatedAt` kept | unchanged on apply and remove | `e2e/c/card-labels.e2e-spec.ts:132` and `:152` (whole card body incl. `updatedAt` equal); `int/cards/cards.repository.int-spec.ts:512-523`, `:549-560`; unit `unit/cards/cards.service.spec.ts:1027` `save not.toHaveBeenCalled()` | ✅ PASS |
| LBL-22 label unknown/foreign/other board/malformed | `404` `/problems/label-not-found`, identical in 4 cases, no change (PUT and DELETE) | `e2e/c/card-labels.e2e-spec.ts:178-213` - `toBe(404)`, `type toBe('/problems/label-not-found')`, every body `toEqual(bodies[0])`, `read toEqual(before)`; `int/cards/cards.repository.int-spec.ts:472-498` | ✅ PASS |
| LBL-23 archived card | `409` `/problems/card-archived`, labels kept | `e2e/c/card-labels.e2e-spec.ts:274-278` - `toBe(409)`, `type toBe('/problems/card-archived')`, `labelIds toEqual([bugId])` | ✅ PASS |
| LBL-24 archived list | `409` `/problems/list-archived`, card active or archived, labels kept | `e2e/c/card-labels.e2e-spec.ts:293-299` | ✅ PASS |
| LBL-25 precedence | card-not-found > label-not-found > board > list > card | both fail → `e2e/c/card-labels.e2e-spec.ts:259-260` `type toBe('/problems/card-not-found')`; label 404 before board 409 `:330-331`; unit `unit/cards/cards.service.spec.ts:1050-1105` (card > label > board > list > card) | ✅ PASS |
| LBL-26 `labelIds` on every card route | array in label `createdAt`/`id` order, `[]` when none, new card `[]` | `[]` on POST, GET one, list, board, PATCH, move, archive, unarchive `e2e/c/card-label-ids.e2e-spec.ts:90-102`; order `[bugId, ideaId]` on GET one / list / board `:125`, `:139-142`, `:156-159` and `e2e/c/card-labels.e2e-spec.ts:173-175`; non-empty on write routes unit `unit/cards/cards.service.spec.ts:943` `labelIds toEqual([BUG_LABEL_ID, IDEA_LABEL_ID])` (see Observation 1); existing `e2e/c/create-card.e2e-spec.ts:116` `labelIds: []` | ✅ PASS |
| LBL-27 archived board freezes labels | `409` `/problems/board-archived` for PATCH/DELETE label and PUT/DELETE card label, nothing changes | PATCH `e2e/l/update-label.e2e-spec.ts:235-239`; DELETE `e2e/l/delete-label.e2e-spec.ts:153-157`; card label `e2e/c/card-labels.e2e-spec.ts:316-322` (list and card active or archived, `labelIds` kept after unarchive) | ✅ PASS |
| LBL-28 label foreign/unknown/malformed on PATCH/DELETE | `404` `/problems/label-not-found`, identical, no change | PATCH `e2e/l/update-label.e2e-spec.ts:217-226`; DELETE `e2e/l/delete-label.e2e-spec.ts:135-144` (foreign label kept) | ✅ PASS |
| LBL-29 token required | `401` on every label route | POST `e2e/l/create-label.e2e-spec.ts:192`, GET `e2e/l/read-labels.e2e-spec.ts:102`, PATCH `e2e/l/update-label.e2e-spec.ts:249`, DELETE `e2e/l/delete-label.e2e-spec.ts:167`, PUT/DELETE card label `e2e/c/card-labels.e2e-spec.ts:339` - `toBe(401)` | ✅ PASS |
| LBL-30 card foreign/unknown/malformed | `404` `/problems/card-not-found`, identical, no change | `e2e/c/card-labels.e2e-spec.ts:226-239` (bodies equal); own label on foreign card `:251-253` `type toBe('/problems/card-not-found')`, `labelIds toEqual([])` | ✅ PASS |
| LBL-31 concurrent same name | exactly one wins, others `409` `label-name-taken` | create `e2e/l/create-label.e2e-spec.ts:251-261` `statuses toEqual([201, ...Array(9).fill(409)])`, list length 1; rename `e2e/l/update-label.e2e-spec.ts:265-270`; index `int/labels/labels-table.int-spec.ts:263` `UQ_labels_board_id_name` | ✅ PASS |
| LBL-32 concurrent double apply | all `204`, held once | `e2e/c/card-labels.e2e-spec.ts:362-363` `toEqual(Array(10).fill(204))`, `labelIds toEqual([bugId])`; `int/labels/labels-table.int-spec.ts:281` `PK_card_labels` | ✅ PASS |
| LBL-33 delete cascade | board → labels and links; card, list, board, label → links | `int/labels/labels-table.int-spec.ts:299-351` (label `:307`, card `:318`, list `:332`, board `:347-350`) | ✅ PASS |

**Status**: ✅ All 33 ACs covered with spec-anchored assertions. No spec-precision gaps: every AC names its status code, problem `type` or field.

---

## Discrimination Sensor

Run in a temporary detached `git worktree` at HEAD (`/tmp/claude-1000/labels-sensor`). `node_modules` (repo root and `back-end/`) were symlinked to the real ones; no `pnpm` command and no install ran in the worktree. Jest was invoked directly (`node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config test/jest-{unit,integration,e2e}.config.ts <path>`). The unmutated baseline passed unit 296, integration 154, e2e 437. Each mutant was applied alone, the covering layers ran, and the file was restored with `git checkout`. Afterwards the symlinks were removed, the worktree removed (`git worktree remove --force`, `git worktree prune`), the real tree's `git status --porcelain` matched the pre-sensor baseline (clean before; only this report is new) and `find back-end/node_modules -maxdepth 2 -xtype l` returned nothing.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/labels/labels.repository.ts:42` | `findOwned` drops the `board.ownerId` filter | ✅ int 1 (e2e 0: the owner-scoped board lock in `LabelsService.writeLocked` still returns `label-not-found`, defense in depth) |
| M2 | `src/database/migrations/1792627200000-CreateLabels.ts:26` | unique index on `"name"` instead of `lower("name")` | ✅ int 3, e2e 3 |
| M3 | `src/cards/cards.repository.ts:65` | `findLabelInBoard` ignores `boardId` (card takes a label of another board) | ✅ int 2, e2e 2 |
| M4 | `src/cards/cards.service.ts:280` | apply/remove skip the `CardArchivedError` guard | ✅ unit 2, e2e 2 |
| M5 | `src/database/migrations/1792627200000-CreateLabels.ts:37` | `FK_card_labels_label_id` without `ON DELETE CASCADE` | ✅ int 2, e2e 25 |
| M6 | `src/labels/labels.service.ts:113` | label PATCH/DELETE skip the archived-board guard | ✅ unit 2, e2e 2 |
| M7 | `src/cards/cards.service.ts:342` | label lookup moved after the board-archived guard (precedence) | ✅ unit 2, e2e 2 |
| M8 | `src/cards/cards.service.ts:148` | `PATCH /cards/:id` returns `labelIds: []` instead of the read ids | ✅ unit 1 (e2e 0, see Observation 1) |
| M9 | `src/labels/dto/update-label.dto.ts:12` | `ValidateIf` lets `name: null` through | ✅ e2e 1 |
| M10 | `src/cards/cards.repository.ts:154` | `labelIdsByCard` orders by `created_at DESC` | ✅ int 1, e2e 4 |

**Sensor depth**: P0-style (≥5 manual mutants; ownership and data integrity)
**Result**: 10/10 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`board-lock.ts` extraction reused by lists, cards and labels per T1; no unrelated edits) |
| No scope creep | ✅ (no `GET /labels/:id`, no default labels, no filtering) |
| Matches patterns | ✅ (nested collection / flat item routes, owner-scoped `findOwned`, `writeLocked` flow, domain error mappings, `toXResponse` mappers) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `tasks.md` Test Coverage Matrix; no other project guideline file - strong defaults applied | ✅ |

Lint passes (exit 0) but this diff adds 6 oxlint warnings (Observation 4).

---

## Edge Cases

- [x] Undeclared property (`boardId`, `id`) on create and PATCH → `400`: `e2e/l/create-label.e2e-spec.ts:176-185`, `e2e/l/update-label.e2e-spec.ts:193-201`
- [x] Concurrent create/rename to one name → one wins, rest `409` (LBL-31)
- [x] Concurrent double apply → all `204`, held once (LBL-32)
- [x] Delete cascade of labels and card links (LBL-33)
- [x] Concurrent deletes of one label → one `204`, rest `404`: `e2e/l/delete-label.e2e-spec.ts:179-181`

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`, real tree)
- **Result**: every step exit 0. Build ok; lint ok (oxlint 6 warnings, 0 errors; Prettier "All matched files use Prettier code style!"); unit 296 passed (19 suites); integration 154 passed (13 suites); e2e 437 passed (32 suites). 0 failed, 0 skipped. Integration and e2e start PostgreSQL through Testcontainers (`test/support/postgres.global-setup.ts`). The integration log's `password authentication failed for user "test"` line comes from an existing negative database-connection test, not a failure.
- **Test count before feature**: unit 241, integration 101, e2e 348 (690) - measured by running the three configs in a detached worktree at `1857c93`
- **Test count after feature**: unit 296, integration 154, e2e 437 (887)
- **Delta**: +197 tests (unit +55, integration +53, e2e +89). No test deleted. The only edits to pre-existing tests are `test/unit/cards/cards.service.spec.ts` (identity `toBe(card)` assertions became `toEqual(withLabels(card))`, `save toHaveBeenCalledWith(result)` became `toHaveBeenCalledWith(saved)` without `labelIds`; equally strict) and one added `labelIds: []` in `test/e2e/cards/create-card.e2e-spec.ts:116`.
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

None blocking. Five minor observations, optional test-only or lint-only follow-ups:

### Observation 1: non-empty `labelIds` on card write routes only checked at unit level

- **Root cause**: e2e checks `labelIds` on PATCH, move, archive and unarchive only as `[]` (`e2e/c/card-label-ids.e2e-spec.ts:90-94`). Mutant M8 (PATCH returns `[]`) survived e2e and was killed by `unit/cards/cards.service.spec.ts:943`.
- **Fix task**: in `test/e2e/cards/card-label-ids.e2e-spec.ts` "with labels linked" block, call PATCH, move, archive and unarchive and assert `labelIds toEqual([bugId, ideaId])`.
- **Priority**: Minor
- **Status**: ✅ Fixed in `b30754a`. Breaking `labelIds` on each of the 4 routes fails the new test.

### Observation 2: LBL-14 e2e checks the response but not the stored value

- **Root cause**: `e2e/l/update-label.e2e-spec.ts:179-180` asserts the body only; persistence is covered at `int/labels/labels.repository.int-spec.ts:227`.
- **Fix task**: add `expect(await read(created)).toEqual(res.body)` after `:180`.
- **Priority**: Minor
- **Status**: ✅ Fixed in `0443e33`. A mutant that skips the save on a case-only rename is killed.

### Observation 3: no "50 characters after trim" boundary with surrounding spaces

- **Root cause**: LBL-03/LBL-11 bound the length "after trim"; tests use 50/51 characters with no whitespace, so trim-then-length order is not pinned.
- **Fix task**: add a create case `'  ' + 'a'.repeat(50) + '  '` → `201` with `name` of length 50.
- **Priority**: Minor
- **Status**: ✅ Fixed in `4afc13e`, on create and edit: 50 characters with surrounding spaces → accepted and stored trimmed; 51 with spaces → `400`. Removing `@Transform(trim)` fails them.

### Observation 4: 6 new oxlint warnings

- **Root cause**: `typescript(no-misused-spread)` at `src/cards/cards.service.ts:84`, `:362` and `test/unit/cards/cards.service.spec.ts:124` (spreading a `Card` instance); `typescript(require-array-sort-compare)` at `test/e2e/labels/create-label.e2e-spec.ts:250`, `delete-label.e2e-spec.ts:179`, `update-label.e2e-spec.ts:264` (`statuses.sort()` without comparator; works today because all statuses are 3-digit).
- **Fix task**: use `.sort((a, b) => a - b)`; for the spread, build `CardWithLabels` with `Object.assign(card, { labelIds })` or silence with a justified rule comment.
- **Priority**: Cosmetic
- **Status**: ✅ Fixed in `c36c208` (`Object.assign(new Card(), card, { labelIds })`: a copy that stays a `Card`; mutating the entity in place was rejected because `save()` callers still hold it) and `40374f1` (numeric comparator). Lint now has 0 warnings.

### Observation 5: owner filter in `LabelsRepository.findOwned` is shielded at the HTTP layer

- **Root cause**: M1 survived e2e because the owner-scoped board lock re-check returns `label-not-found` anyway. The integration test `int/labels/labels.repository.int-spec.ts:107` kills it, so the behavior is protected; noted only as layering information.
- **Fix task**: none.
- **Priority**: Info

---

## Requirement Traceability Update

Update spec.md requirement statuses (not edited by the Verifier):

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LBL-01 .. LBL-33 (all 33) | Pending | ✅ Verified |

Also update the spec's `**Coverage:**` line (currently "33 total, 0 mapped to tasks, 33 unmapped").

**Status**: ✅ Applied in `8ec7b88`.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 33/33 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 10/10 mutations killed
**Gate**: 887 passed (296 unit + 154 integration + 437 e2e), 0 failed, 0 skipped

**What works**: label CRUD with trimmed names, exact palette and case-insensitive per-board uniqueness enforced by a unique index (including under 10-way races); owner scoping with identical `404` bodies for foreign, unknown and malformed ids; apply/remove idempotent with `204`, same-board labels only, card `updatedAt` untouched; archive guards with precedence card-not-found > label-not-found > board > list > card; `labelIds` on every card route in label creation order; cascades from board, list, card and label.

**Issues found**: none blocking; Observations 1-4 are optional test/lint hardening.

**Next steps**: none. Traceability and Observations 1-4 are resolved (see each Status line). After the fixes, the Build gate passes with 892 tests (296 unit + 154 integration + 442 e2e) and 0 lint warnings.
