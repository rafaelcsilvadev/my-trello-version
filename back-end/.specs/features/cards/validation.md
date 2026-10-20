# Cards Validation

**Date**: 2026-10-20
**Spec**: `.specs/features/cards/spec.md`
**Diff range**: `0cafa87^..HEAD` (branch `feat/cards-delete-endpoint`, HEAD `cc23765`; code commits T1..T11, last `4b80705`). Fix commits after the report: `6291a57` (traceability), `6717661`, `58b321f`, `2f93372`
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict: PASS ✅.** All 40 requirements (CRD-01..CRD-40) and the 4 listed edge cases trace to a test assertion that targets the spec-defined outcome. The build gate is green (unit 241, integration 101, e2e 337). The sensor killed 36 of 36 behavior-level mutants, covering guard precedence (board > list > card), owner scoping, position arithmetic for create / move / archive / unarchive, the board row lock, the archived filters and the DTO rules. Three minor test-depth observations were found (see Fix Plans) and all are resolved with test-only commits.

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
| T11 | ✅ Done | all boxes ticked (0 unchecked boxes in `tasks.md`) |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`. `e2e/` = `test/e2e/cards/`, `int/` = `test/integration/cards/`, `unit/` = `test/unit/cards/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| CRD-01 create at end | `201`, body exactly `{ id, listId, title, description, dueDate, done: false, position, archivedAt: null, createdAt, updatedAt }`, `position` = active count before | `e2e/create-card.e2e-spec.ts:104-116` - `toBe(201)` + exact `toEqual({ id: UUID, listId, title, description: null, dueDate: null, done: false, position: 0, archivedAt: null, createdAt: ISO, updatedAt: ISO })`; second card `:137` `position toBe(1)`; unit `unit/cards.service.spec.ts:202-208` `create toHaveBeenCalledWith({ listId, title, description, dueDate, position: 3 })` with `countActive` 3; `int/cards.repository.int-spec.ts:334` `countActive toBe(2)` ignores archived and other-list cards | ✅ PASS |
| CRD-02 trimming, blank description → null | `title` trimmed; `description` trimmed, missing/blank → `null` | `e2e/create-card.e2e-spec.ts:123`, `:128` `title toBe('Write spec')` in body and row; `:144`, `:149` `description toBe('notes')`; `:152-166` whitespace / missing / `null` → `description toBeNull()` in body and row | ✅ PASS |
| CRD-03 invalid title | `400` + `errors` item `field: 'title'`, no card | `e2e/create-card.e2e-spec.ts:224-232` (missing, number, null, blank, 101 chars) via `expectFieldError` `:93` `toBe(400)`, `:95-97` `arrayContaining([{ field: 'title', ... }])`, `:98` `countCards toBe(0)`; boundary 100 → `201` `:234-240` | ✅ PASS |
| CRD-04 invalid description | `400` `field: 'description'`, no card | `e2e/create-card.e2e-spec.ts:177-185` (5001 chars, number) via `expectFieldError`; boundary 5000 → `201` `:168-175` | ✅ PASS |
| CRD-05 `dueDate` format and calendar | invalid → `400` `field: 'dueDate'`; missing/`null` → `null`; valid stored as given | `e2e/create-card.e2e-spec.ts:202-212` (`2026-02-30`, `2026-2-1`, date-time, number) via `expectFieldError`; `:187-200` `2026-11-01` and `2028-02-29` → `dueDate toBe(dueDate)` in body and row; `:214-222` missing/`null` → `toBeNull()`; round-trip `int/cards-table.int-spec.ts:263` `dueDate toBe('2026-11-01')` | ✅ PASS |
| CRD-06 list foreign / unknown / malformed | `404` `/problems/list-not-found`, identical, no card (POST and GET) | POST `e2e/create-card.e2e-spec.ts:264-284` - `toBe(404)`, `type toBe('/problems/list-not-found')`, bodies minus `instance`/`requestId` `toEqual` across the three, `countCards toBe(0)`; GET `e2e/read-cards.e2e-spec.ts:208-223` via `expectSameNotFound` `:98-108` | ✅ PASS |
| CRD-07 active cards of a list | `200`, `archivedAt` null only, `position` asc, list/board archived or not | `e2e/read-cards.e2e-spec.ts:134-150` - `toBe(200)`, titles `toEqual(['Write spec','Design','Build'])`, positions `[0,1,2]` (archived and other-list card excluded), `body[0] toEqual(first)`; `archived=false` `:152-163` equals default; archived list `:165-174`; archived board `:176-185`; empty `:127-132` `toEqual([])` | ✅ PASS |
| CRD-08 list `archived=true` | `200`, archived only, `position` null, `archivedAt` desc | `e2e/read-cards.e2e-spec.ts:187-206` - titles `['Newer','Older']` (archived in reverse creation order), positions `[null,null]`, `archivedAt` values desc; tie-break `int/cards.repository.int-spec.ts:249-259` | ✅ PASS |
| CRD-09 board route, active | `200`, active cards of active lists, by list position then card position, board archived or not | `e2e/read-cards.e2e-spec.ts:236-266` - titles `toEqual(['A1','A2','B1','B2'])` (created interleaved), `listId`s, positions `[0,1,0,1]`; archived card, archived-list card and other-board card absent; `archived=false` `:268-279`; archived board `:281-290`; repo `int/cards.repository.int-spec.ts:264-279` | ✅ PASS |
| CRD-10 board route `archived=true` | archived cards of every list (incl. archived list), `archivedAt` desc | `e2e/read-cards.e2e-spec.ts:292-315` - titles `['In old list','In list']`, `archivedAt` desc, other-board archived card absent; repo `int/cards.repository.int-spec.ts:287-304`, tie `:311-321` | ✅ PASS |
| CRD-11 bad `archived` | `400` + `errors` item `field: 'archived'` on both routes | `e2e/read-cards.e2e-spec.ts:344-361` - `describe.each` over both routes × `it.each(['yes','1','TRUE',''])`, `toBe(400)`, `arrayContaining([{ field: 'archived', ... }])` | ✅ PASS |
| CRD-12 board foreign / unknown / malformed | `404` `/problems/board-not-found`, identical | `e2e/read-cards.e2e-spec.ts:317-332` via `expectSameNotFound(..., '/problems/board-not-found')`; unit propagation `unit/cards.service.spec.ts:332-339` | ✅ PASS |
| CRD-13 read one card | `200`, card / list / board archived or not | `e2e/read-cards.e2e-spec.ts:365-372` `toEqual(card)`; archived card `:374-386` `toEqual({ ...card, position: null, archivedAt })`; archived list `:388-396`; archived board `:398-406` | ✅ PASS |
| CRD-14 PATCH subset | `200`, only given fields change, later `updatedAt` | `e2e/update-card.e2e-spec.ts:131-156` - `toBe(200)`, `toEqual({ ...created, done: true, dueDate: '2026-12-24', updatedAt })`, `updatedAt toBeGreaterThan(created)`, persisted; title + description `:158-177`; `done` without `dueDate` `:205-213`; unit `unit/cards.service.spec.ts:450-478` `save toHaveBeenCalledWith(buildCard({ done: true }))` | ✅ PASS |
| CRD-15 invalid PATCH title | `400` `field: 'title'` (incl. `null`), unchanged | `e2e/update-card.e2e-spec.ts:225-254` (null, empty, number, blank, 101) - `toBe(400)`, `arrayContaining([{ field: 'title' }])`, `read toEqual(created)` | ✅ PASS |
| CRD-16 clear / invalid description and dueDate | `null` (or blank description) → stored `null`; invalid → `400` per field, unchanged | `dueDate: null` `e2e/update-card.e2e-spec.ts:150-155` `dueDate toBeNull()`, `done toBe(true)`, persisted; blank description `:179-190` `toBeNull()`; `description: null` `e2e/update-card.e2e-spec.ts:192-203` `toBeNull()`, persisted; unit `unit/cards.service.spec.ts:480-491` `save toHaveBeenCalledWith(buildCard({ description: null, dueDate: null }))`; invalid `dueDate` (off-calendar, not zero-padded, date-time, number) `:233-236`, `description` number `:237`, `description` 5001 `:219-223` in the `it.each` `:212-235` | ✅ PASS |
| CRD-17 invalid `done` | `400` `field: 'done'` (incl. `null`), unchanged | `e2e/update-card.e2e-spec.ts:231-232` (`null`, `'true'`) in `:225-254` - `toBe(400)`, `field: 'done'`, `read toEqual(created)` | ✅ PASS |
| CRD-18 PATCH `{}` | `200`, unchanged incl. `updatedAt` | `e2e/update-card.e2e-spec.ts:215-223` - `toBe(200)`, `toEqual(created)`, `read toEqual(created)`; unit `unit/cards.service.spec.ts:494-501` `expectNoWrites()` | ✅ PASS |
| CRD-19 PATCH archived card | `409` `/problems/card-archived`, unchanged | `e2e/update-card.e2e-spec.ts:267-276` - `toBe(409)`, `type toBe('/problems/card-archived')`, `read toEqual(before)`; unit `unit/cards.service.spec.ts:515-528` (also for `{}`) | ✅ PASS |
| CRD-20 same-list move | `200`, moved card at `k`, others shifted keeping order | `e2e/move-card.e2e-spec.ts:156-176` - `toEqual({ ...three, position: 0 })`, order `['3','1','2']`, positions `[0,1,2]`, shifted cards keep `updatedAt` `:174-175`; down `:178-188`; `listId` = own list `:190-199`; unit ranges `unit/cards.service.spec.ts:542` `shift(LIST_ID, 0, 0, 1)`, `:551` `shift(LIST_ID, 2, 3, -1)` | ✅ PASS |
| CRD-21 cross-list move | `200`, `listId` target, `position` `k`; source gap closed, target opened | `e2e/move-card.e2e-spec.ts:212-231` - `toEqual({ ...one, listId: b, position: 0 })`, A `['2','3']` at `[0,1]`, B `['1','4']` at `[0,1]`, persisted; unit `unit/cards.service.spec.ts:621-626` `shift` nth 1 `(LIST_ID, 2, 3, -1)`, nth 2 `(TARGET_LIST_ID, 1, 2, 1)`, `save(moved)` | ✅ PASS |
| CRD-22 clamp | same list → `n-1`; other list → `m` | same list `e2e/move-card.e2e-spec.ts:201-210` `position toBe(2)`, order `['2','3','1']`; other list `:233-244` `position toBe(2)`, B `['3','4','1']`; empty target `:246-258` `position toBe(0)`; unit `unit/cards.service.spec.ts:555-560`, `:629-657` | ✅ PASS |
| CRD-23 same place | `200`, unchanged incl. `updatedAt` | `e2e/move-card.e2e-spec.ts:260-268` - `toEqual(two)`, `read toEqual(two)`; unit `unit/cards.service.spec.ts:562-583` `expectNoWrites()` (with/without own `listId`, clamped to current) | ✅ PASS |
| CRD-24 invalid move body | `400` `field: 'position'` / `'listId'`, nothing changes | `e2e/move-card.e2e-spec.ts:270-288` (missing, `-1`, `1.5`, `'2'`, `listId: 'abc'`) - `toBe(400)`, `arrayContaining([{ field }])`, order `['1','2','3']`, `read toEqual(three)` | ✅ PASS |
| CRD-25 target unknown / foreign / other board | `404` `/problems/list-not-found`, identical, nothing changes | `e2e/move-card.e2e-spec.ts:307-333` - `toBe(404)`, `type toBe('/problems/list-not-found')`, bodies `toEqual`, source order and card unchanged, Bob's list and other-board list `toEqual([])`; repo `int/cards.repository.int-spec.ts:200-210` | ✅ PASS |
| CRD-26 target archived | `409` `/problems/list-archived`, nothing changes | `e2e/move-card.e2e-spec.ts:335-346` - `toBe(409)`, `type`, order, card and target `toEqual([])`; unit `unit/cards.service.spec.ts:699-720` | ✅ PASS |
| CRD-27 move archived card | `409` `/problems/card-archived`, nothing changes | `e2e/move-card.e2e-spec.ts:348-358` - `toBe(409)`, `type toBe('/problems/card-archived')`, `read toEqual(before)`; precedence before target lookup `unit/cards.service.spec.ts:671-686`, same list `:723-730` | ✅ PASS |
| CRD-28 positions `0..n-1` always, also concurrent | contiguous, unique positions after every write | 10 concurrent creates `e2e/create-card.e2e-spec.ts:319-332` `toEqual([0..9])`; 10 concurrent same/cross-list moves `e2e/move-card.e2e-spec.ts:414-446` (all `200`, both lists `0..n-1`, total 8); mixed concurrent create/move/archive/unarchive/delete `e2e/delete-card.e2e-spec.ts:269-309` (statuses `[201,201,200×8,204]`, both lists `0..n-1`, total 9); lifecycle `:374-410`; archive/unarchive `e2e/archive-card.e2e-spec.ts:152-157`, `:185-191`; lock serializes `int/cards.repository.int-spec.ts:454-480`; deferred unique rejects at COMMIT `int/cards-table.int-spec.ts:303-310`; rollback `int/cards.repository.int-spec.ts:484-503` | ✅ PASS |
| CRD-29 archive | `200`, `archivedAt` = now, `position` null, gap closed | `e2e/archive-card.e2e-spec.ts:135-159` - `toEqual({ ...one, position: null, archivedAt: ISO })`, `start ≤ archivedAt ≤ end`, remaining `[['2',0],['3',1]]`, `?archived=true toEqual([res.body])`; unit `unit/cards.service.spec.ts:733-755` | ✅ PASS |
| CRD-30 archive twice | `200`, original `archivedAt` | `e2e/archive-card.e2e-spec.ts:161-170` - `toEqual(archived)`, `read toEqual(archived)`; unit `unit/cards.service.spec.ts:757-764` no writes | ✅ PASS |
| CRD-31 unarchive | `200`, `archivedAt` null, `position` = active count before | `e2e/archive-card.e2e-spec.ts:172-193` - `toEqual({ ...archived, position: 2, archivedAt: null })`, order `[['2',0],['3',1],['1',2]]`, archive empty; unit `unit/cards.service.spec.ts:768-779` | ✅ PASS |
| CRD-32 unarchive active | `200`, unchanged | `e2e/archive-card.e2e-spec.ts:195-203` - `toEqual(two)`, `read toEqual(two)`; unit `unit/cards.service.spec.ts:781-788` | ✅ PASS |
| CRD-33 delete archived | `204`, no body, card gone | `e2e/delete-card.e2e-spec.ts:169-185` - `toBe(204)`, `text toBe('')`, follow-up GET `404` `card-not-found`, active `[['1',0],['3',1]]`, archive empty | ✅ PASS |
| CRD-34 delete active | `409` `/problems/card-not-archived`, not deleted | `e2e/delete-card.e2e-spec.ts:158-167` - `toBe(409)`, `type`, `read toEqual(one)`; unit `unit/cards.service.spec.ts:800-807` | ✅ PASS |
| CRD-35 archived list freezes cards | every card write → `409` `/problems/list-archived`, card archived or not, nothing changes | create `e2e/create-card.e2e-spec.ts:286-295`; PATCH `e2e/update-card.e2e-spec.ts:278-286`; move `e2e/move-card.e2e-spec.ts:360-368`; archive/unarchive × {active, archived card} `e2e/archive-card.e2e-spec.ts:207-233` (rows 208-211); DELETE `e2e/delete-card.e2e-spec.ts:187-206` - each `toBe(409)`, `type toBe('/problems/list-archived')`, card unchanged; unit before card state `unit/cards.service.spec.ts:435-446`, `:836-841` per action | ✅ PASS |
| CRD-36 archived board freezes cards | every card write → `409` `/problems/board-archived`, list/card archived or not | create (active and archived list) `e2e/create-card.e2e-spec.ts:297-317`; PATCH `e2e/update-card.e2e-spec.ts:288-296`; move `e2e/move-card.e2e-spec.ts:370-378`; archive/unarchive × {active, archived card} `e2e/archive-card.e2e-spec.ts:207-233` (rows 212-215); DELETE `e2e/delete-card.e2e-spec.ts:187-206`; list and board both archived × {active, archived card} on create, PATCH, move, archive, unarchive and DELETE `e2e/delete-card.e2e-spec.ts:208-237` - `[method, path, 409, '/problems/board-archived']`, card unchanged; board > list > card precedence per action `unit/cards.service.spec.ts:265-278`, `:413-433`, `:826-834` - `rejects.toBeInstanceOf(BoardArchivedError)` + `expectNoWrites()` | ✅ PASS |
| CRD-37 list archive leaves cards alone | cards' `position`, `archivedAt`, `updatedAt` unchanged | `e2e/delete-card.e2e-spec.ts:239-250` - after list archive + unarchive, active and archived card lists `toEqual` the full bodies captured before | ✅ PASS |
| CRD-38 card foreign / unknown / malformed | `404` `/problems/card-not-found`, identical, nothing changes | GET `e2e/read-cards.e2e-spec.ts:408-426`; PATCH `e2e/update-card.e2e-spec.ts:298-323`; move `e2e/move-card.e2e-spec.ts:380-401`; archive/unarchive `e2e/archive-card.e2e-spec.ts:235-261`; DELETE `e2e/delete-card.e2e-spec.ts:311-333` - each `toBe(404)`, `type toBe('/problems/card-not-found')`, bodies `toEqual` across the three, foreign card unchanged; every route as Bob `e2e/delete-card.e2e-spec.ts:335-360`; repo `int/cards.repository.int-spec.ts:163-170`; mapping `unit/cards.errors.spec.ts:37` | ✅ PASS |
| CRD-39 token required | `401` on every card route | all 9 routes `e2e/delete-card.e2e-spec.ts:362-372` - `[method, path, status] toEqual([..., 401])`, cards unchanged; per-route with `problem+json` `e2e/create-card.e2e-spec.ts:254-262`, `e2e/read-cards.e2e-spec.ts:225-232`, `:334-341`, `:428-437` | ✅ PASS |
| CRD-40 list / board delete cascades | cards of the deleted list / board removed | `int/cards-table.int-spec.ts:278-286` (list: active + archived), `:289-300` (board) - `cardListIds toEqual([otherListId])`; over HTTP `e2e/delete-card.e2e-spec.ts:252-267` both cards `404` after list delete | ✅ PASS |

**Status**: ✅ All 40 requirements covered with spec-anchored assertions. No spec-precision gaps: the spec fixes every status code, problem `type`, field name, ordering, position value and boundary. Payload rule applied: response bodies are asserted on exact values (`toEqual` on the full card object or on the field), and unit write calls are asserted with their arguments (`shift(LIST_ID, 2, 3, -1)`, `create({ listId, title, description, dueDate, position })`, `save(buildCard({ ... }))`), not only that a call occurred.

---

## Discrimination Sensor

Run in a temporary detached `git worktree` at HEAD (`/tmp/claude-1000/cards-sensor`). `node_modules` (repo root and `back-end/`) were symlinked to the real ones; no `pnpm` command and no install ran in the worktree. Jest was invoked directly (`node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config test/jest-{unit,integration,e2e}.config.ts test/<layer>/cards`). The unmutated baseline passed unit 68, integration 40, e2e 126. Each mutant was applied alone, the covering layers ran (service and mapping: unit + e2e; repository: integration + e2e; controller and DTOs: e2e), and the file was restored with `git checkout`. Afterwards the symlinks were removed, the worktree removed (`git worktree remove --force`, `git worktree prune`), the real tree's `git status --porcelain` matched the pre-sensor baseline (clean; only this report is new) and `find back-end/node_modules -maxdepth 2 -xtype l` returned nothing.

| Mutation | File:line | Description | Killed? (failing tests) |
| -------- | --------- | ----------- | ----------------------- |
| M01 | `src/cards/cards.service.ts:64` | Create appends at `n + 1` | ✅ unit 2, e2e 18 |
| M02 | `src/cards/cards.service.ts:141` | Same-list move clamps to `n` instead of `n - 1` | ✅ unit 2, e2e 1 |
| M03 | `src/cards/cards.service.ts:144` | Same-place move is no longer a no-op | ✅ unit 3 |
| M04 | `src/cards/cards.service.ts:151` | Move up shifts `[k, i-2]` (one card too few) | ✅ unit 1, e2e 3 |
| M05 | `src/cards/cards.service.ts:153` | Move down shifts by `+1` instead of `-1` | ✅ unit 2, e2e 4 |
| M06 | `src/cards/cards.service.ts:174-176` | Cross-list move does not close the source gap | ✅ unit 3, e2e 5 |
| M07 | `src/cards/cards.service.ts:179` | Cross-list clamp to `m - 1` instead of `m` | ✅ unit 2, e2e 2 |
| M08 | `src/cards/cards.service.ts:181-183` | Cross-list move does not open the target slot | ✅ unit 2, e2e 4 |
| M09 | `src/cards/cards.service.ts:161` | Target looked up by owner (`findOwnedList`) instead of within the locked board | ✅ unit 6, e2e 1 |
| M10 | `src/cards/cards.service.ts:170` | Move into an archived target allowed | ✅ unit 1, e2e 1 |
| M11 | `src/cards/cards.service.ts:133` | Move allowed on an archived card | ✅ unit 2, e2e 1 |
| M12 | `src/cards/cards.service.ts:199` | Archive does not close the gap | ✅ unit 1, e2e 5 |
| M13 | `src/cards/cards.service.ts:193` | Archive not idempotent (re-stamps `archivedAt`) | ✅ unit 1, e2e 1 |
| M14 | `src/cards/cards.service.ts:215` | Unarchive puts the card at `n + 1` | ✅ unit 1, e2e 2 |
| M15 | `src/cards/cards.service.ts:211` | Unarchive of an active card moves it to the end | ✅ unit 1, e2e 1 |
| M16 | `src/cards/cards.service.ts:224` | Delete guard flipped (deletes active, rejects archived) | ✅ unit 2, e2e 4 |
| M17 | `src/cards/cards.service.ts:271-277` | Item-write precedence swapped: list-archived checked before board-archived | ✅ unit 5, e2e 2 (after Fix 2) |
| M18 | `src/cards/cards.service.ts:271` | Item writes skip the board-archived guard | ✅ unit 6, e2e 7 |
| M19 | `src/cards/cards.service.ts:112` | PATCH allowed on an archived card | ✅ unit 2, e2e 1 |
| M20 | `src/cards/cards.service.ts:122` | PATCH `{}` saves the card | ✅ unit 2 |
| M21 | `src/cards/cards.service.ts:56` | Create skips the board-archived guard | ✅ unit 2, e2e 2 |
| M22 | `src/cards/cards.service.ts:95` | Malformed card id reaches the database | ✅ unit 2, e2e 6 |
| M23 | `src/cards/cards.repository.ts:47` | `findOwned` drops the owner filter | ✅ int 1, e2e 2 |
| M24 | `src/cards/cards.repository.ts:37` | Board row not locked (`pessimistic_write` removed) | ✅ int 15, e2e 4 (all three concurrency e2e tests) |
| M25 | `src/cards/cards.repository.ts:91` | Board route shows active cards of archived lists | ✅ int 1, e2e 1 |
| M26 | `src/cards/cards.repository.ts:85` | Board archived cards ordered oldest first | ✅ int 1, e2e 1 |
| M27 | `src/cards/cards.repository.ts:69` | List archived cards ordered oldest first | ✅ int 1, e2e 1 |
| M28 | `src/cards/cards.repository.ts:115` | `shift` ignores the upper bound of the range | ✅ int 1, e2e 2 |
| M29 | `src/cards/cards.repository.ts:98` | `countActive` counts archived cards too | ✅ int 1, e2e 2 |
| M30 | `src/cards/cards.controller.ts:76` | Missing `archived` on the list route treated as `true` | ✅ e2e 25 |
| M31 | `src/cards/dto/create-card.dto.ts:37` | Create drops the strict calendar check (`2026-02-30` passes the pattern) | ✅ e2e 1 |
| M32 | `src/cards/dto/update-card.dto.ts:47` | PATCH accepts `done: null` (`@IsOptional`) | ✅ e2e 1 |
| M33 | `src/cards/dto/move-card.dto.ts:14` | Move accepts a negative position (`@Min(0)` removed) | ✅ e2e 1 |
| M34 | `src/cards/dto/create-card.dto.ts:21` | Create no longer trims description / blank → `null` | ✅ e2e 2 |
| M35 | `src/errors/domain-error-mappings.ts:83` | `CardNotArchivedError` mapped to `400` | ✅ unit 1, e2e 1 |
| M36 | `src/cards/dto/card-response.dto.ts:44` | Response always returns `done: false` | ✅ e2e 2 |

**Sensor depth**: expanded (≥5; position integrity under concurrency, guard precedence and owner scoping are data-integrity paths)
**Result**: 36/36 killed - PASS ✅

Note: M3 and M20 are killed only at the unit level. Over HTTP they are not observable: the shift range is empty or no column changed, so TypeORM skips the `UPDATE` and `updatedAt` stays; the unit tests (`unit/cards.service.spec.ts:562-583`, `:494-501` `expectNoWrites()`) guard the intent. Same pattern as lists M3. M17 was killed only at the unit level in the first run; after Fix 2 it also fails `e2e/delete-card.e2e-spec.ts:208-237` (2 cases).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes (cards module, `CreateCards` migration, three error mappings, `AppModule` import, `ListsModule` exports `ListsService`; no lists or boards behavior changed) | ✅ |
| No scope creep | ✅ |
| Matches patterns (lists: owner-scoped repository, board row lock, raw-SQL `shift` keeping `updated_at`, `writeLocked`, domain errors + mapping table, DTO `trim`/`trimToNull`, response mapper, `isUUID` guard) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (service 1:1 to ACs incl. guard precedence and every position case in unit; table, constraints, cascade, every repository method, lock, ordering and `updated_at` on shift in integration; every route happy + edge + error + concurrency in e2e) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `.specs/features/cards/tasks.md` (Test Coverage Matrix), `.specs/STATE.md` (BE-AD-003, BE-AD-008, BE-AD-010) | ✅ |

No `// SPEC_DEVIATION` markers in `src/cards` or `test/*/cards`.

---

## Edge Cases

- [x] Undeclared property → `400`: create `done`, `position` `e2e/create-card.e2e-spec.ts:243-252` (no row); PATCH `listId` `e2e/update-card.e2e-spec.ts:256-265` (unchanged); move `title`, `archivedAt` `e2e/move-card.e2e-spec.ts:290-305` (order unchanged).
- [x] List without cards → `200 []`: `e2e/read-cards.e2e-spec.ts:127-132`
- [x] Move into an empty list with any `position` → `200`, `position` `0`: `e2e/move-card.e2e-spec.ts:246-258`; unit `unit/cards.service.spec.ts:644-657`
- [x] List / board delete cascades (CRD-40): `int/cards-table.int-spec.ts:278-300`, `e2e/delete-card.e2e-spec.ts:252-267`

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`)
- **Result**: every step exit 0. Build ok; lint ok (oxlint clean, Prettier "All matched files use Prettier code style!"); unit 241 passed (17 suites); integration 101 passed (10 suites); e2e 337 passed (26 suites); after the fix commits e2e 348 passed. 0 failed, 0 skipped. (The integration log's `password authentication failed for user "test"` line comes from an existing negative database-connection test, not a failure.)
- **Cards tests added**: unit 68 (`test/unit/cards`), integration 40 (`test/integration/cards`), e2e 126 (`test/e2e/cards`) - counted by running each folder alone in the sensor worktree
- **Test count before feature**: unit 173, integration 61, e2e 211 (gate totals minus the cards suites; unit and integration match the lists validation totals, e2e is higher than lists' 204 because of the lists fix commits merged after that report)
- **Test count after feature**: unit 241, integration 101, e2e 337 (348 after the fix commits)
- **Delta**: +234 tests; no test deleted or weakened (the diff range touches no test file outside `test/*/cards/`)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (minor, non-blocking) - all resolved

### Fix 1: Undeclared property on the move body not exercised

- **Root cause**: the spec edge case names create, `PATCH` and `move` bodies. Create (`done`, `position`) and `PATCH` (`listId`) have e2e tests; `POST /cards/:id/move` with an extra property (e.g. `title` or `archivedAt`) has none. Behavior is right through the global `ValidationPipe` (FND-09).
- **Fix task**: add one e2e case in `move-card.e2e-spec.ts` sending `{ position: 0, title: 'x' }` and asserting `400` and order unchanged.
- **Priority**: Minor
- **Resolved**: `6717661` - e2e sends `title` and `archivedAt` with a valid `position` and asserts `400` and the order unchanged; a `forbidNonWhitelisted: false` mutant now fails both cases.

### Fix 2: CRD-36 precedence with both list and board archived proven over HTTP only for create

- **Root cause**: e2e covers board-archived with an active list on every item route, and board + list archived only on create (`create-card.e2e-spec.ts:308-317`). The item-route precedence (board > list when both are archived) is proven by `unit/cards.service.spec.ts:413-433` and `:826-834`. The shared `writeLocked` guard makes the risk low, and the precedence-swap mutant was killed by the unit layer.
- **Fix task**: optional e2e `it.each` that archives the list and then the board and calls PATCH, move, archive, unarchive and DELETE, asserting `409` `/problems/board-archived`.
- **Priority**: Minor
- **Resolved**: `58b321f` - e2e archives the list and then the board and calls every card write on an active and an archived card, asserting `409` `/problems/board-archived`; the M17 precedence-swap mutant now fails both cases.

### Fix 3: PATCH validation variants thinner than create

- **Root cause**: `UpdateCardDto` repeats the create rules but its e2e only checks `title` null / empty / 101, `dueDate` `2026-02-30` and `description` 5001. `description: null` clearing (CRD-16) is proven only in unit (`unit/cards.service.spec.ts:480-491`); non-string `title`/`description` and `dueDate` format variants (`2026-2-1`, date-time) are not sent to `PATCH`.
- **Fix task**: extend the `update-card.e2e-spec.ts:212` `it.each` with `title: 42`, `title: '   '`, `description: 42`, `dueDate: '2026-2-1'`, and add a `{ description: null }` → `200`, `description` `null` case.
- **Priority**: Minor
- **Resolved**: `2f93372` - PATCH `it.each` adds `title` number and blank, `description` number, `dueDate` not zero-padded, date-time and number, plus a `{ description: null }` → `200` case; dropping `@Matches` on `dueDate` fails 1 case, dropping `@IsOptional` on `description` fails 9.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CRD-01 .. CRD-40 | Implementing | ✅ Verified |

(Not applied by the Verifier; the orchestrator updates `spec.md`.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 40/40 requirements matched spec outcome; 0 spec-precision gaps
**Sensor**: 36/36 mutations killed
**Gate**: 690 passed (241 unit + 101 integration + 348 e2e) after the fix commits, 0 failed

**What works**: create at the end with trimmed title and description, blank description and missing date as `null`, calendar-checked `dueDate`; active cards by position and archived cards newest first, per list and per board (active lists only for active cards, every list for archived); read of own cards in any state; PATCH of any subset with `{}` no-op and `null` clearing; same-list and cross-list move with clamp, same-place no-op and shifted cards keeping `updatedAt`; archive closing the gap and idempotent; unarchive to the end; delete only from the archive; board > list > card guard precedence; identical `404` for foreign/unknown/malformed board, list, card and move target; `401` on every route; contiguous positions under concurrent mixed writes; cascade on list and board delete.

**Issues found**: three minor test-depth items, resolved in `6717661`, `58b321f`, `2f93372`.

**Next steps**: merge.
