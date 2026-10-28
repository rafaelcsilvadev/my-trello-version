# Board Drag and Drop Validation

**Date**: 2026-10-28
**Spec**: `front-end/.specs/features/board-dnd/spec.md`
**Diff range**: `0b16971..2bf46ee` (`0b16971` = merge of spec PR #241; 51 non-merge commits, T1–T24, PRs up to #265). Front-end surface: 37 files, +5101/−121 (`src/` 21 files, `test/` 16 files).
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1

## Validation: Board Drag and Drop - FAIL ❌ (iteration 1)

**Result (iteration 1)**: FAIL ❌, one cosmetic test gap. The code meets all 43 FDND requirements. The build gate is green: 1150 unit/component tests (907 before the feature, +243), and 13 e2e passed in CI on `2bf46ee`. The sensor killed 28 of 28 behavior mutants. One spec-precise outcome has no assertion: the drop placeholder must be **dashed** (FDND-02), and no test checks the placeholder's style, only that it is there and where it sits. One test-only fix (Fix 1) closes it.

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-10-28) | `0b16971..2bf46ee` | ✅ 1150 unit, 13 e2e (CI `40756894400`) | 43/43 met, 1 weak (FDND-02 placeholder style) | 28/28 killed | ❌ FAIL, Fix 1 |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T24 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `49`. T23 "Full gate passes locally and in CI" is checked, and CI run `40756894400` confirms the e2e part. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. `board/…` means `unit/features/board/…`. Short names: `move.spec` = `board/model/move.spec.ts`; `mut.spec` = `board/api/mutations.spec.tsx`; `bm.spec` = `board/view-models/use-board-move.spec.tsx`; `vm.spec` = `board/view-models/use-board-view-model.spec.tsx`; `tile.spec` = `board/components/card-tile.spec.tsx`; `col.spec` = `board/components/board-column.spec.tsx`; `cols.spec` = `board/components/board-columns.spec.tsx`; `screen.spec` = `board/components/board-screen.spec.tsx`; `dialog.spec` = `board/components/move-to-dialog.spec.tsx`; `notifier.spec` = `unit/shared/ui/toast/use-save-failure-notifier.spec.tsx`; `e2e` = `e2e/board-dnd.e2e-spec.ts`. `bm.spec` renders PT-BR, and it is where the exact PT-BR texts are asserted. `screen.spec` renders EN. "Mx" points to a sensor mutant (see Discrimination Sensor).

### P1: Move cards with the mouse

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FDND-01 | Every active card of an active column is draggable on an active board | `tile.spec:263-267` `getAttribute('draggable')` `toBe('true')`; `:299-311` `setData('text/plain','c1')`, `effectAllowed` `'move'`, `onDragStart('c1')`; `:275-297` archived / read-only → no `[data-card-id]`, not draggable; `e2e:100-125` real mouse drag | ✅ |
| FDND-02 | Source card dashed + translucent; dashed purple outline on the column under the pointer; **dashed** placeholder where the card lands | Source: `tile.spec:396-402` `border-dashed`, `opacity-45` (M24 sibling). Outline: `col.spec:617-624` `outline-dashed` + `outline-border-focus`, `:626-632` none on the other column (M24 killed). Placeholder spot: `col.spec:634-654` previous/next sibling text, `move.spec:484-559` `placeholder` `{listId, beforeCardId}` (M6 killed). Placeholder **style**: no assertion; `col.spec:521-523` only queries `[data-drop-placeholder]`, so dropping `border-dashed` from `board-column.tsx:160` would pass | ⚠️ Weak → Fix 1 |
| FDND-03 | Drop in another column → placed at the placeholder; `POST /cards/{id}/move` `{listId, position}` = index among the other cards | `bm.spec:261-279` cache `l2:1` and `moves` `toEqual([{path:'/api/v1/cards/c1/move', body:{listId:'l2', position:1}}])`; `screen.spec:468-498` same through DOM drag events; `move.spec:285-290`; `mut.spec:556-603` (M4 killed) | ✅ |
| FDND-04 | Same column, new index → `{position}`, no `listId` | `bm.spec:281-292` `body:{ position: 1 }` (exact `toEqual`, so a `listId` key fails); `move.spec:275-283`; `mut.spec:604-620` | ✅ |
| FDND-05 | Empty column → only card, `position 0` + `listId` | `col.spec:603-615` empty column → `onHover({listId, index:0})`; `move.spec:146-153`, `:263`, `:363-369`, `:526-537`, `:588-596`; `col.spec:656-664` placeholder replaces "Arraste cards para cá" | ✅ |
| FDND-06 | Both header counters update | `screen.spec:468-480` `[counter('Backlog'), counter('Doing')]` `['1','1']` → `['0','2']`; `vm.spec:1182-1214` columns before and after drop; `move.spec:371-377` counts (M5 killed) | ✅ |
| FDND-07 | Drop on the start spot or outside every column → nothing moves, no request | `bm.spec:318-359` (no target / card origin / column origin / after cancel) → `moves` `toEqual([])` and cache spots unchanged; `move.spec:269-273` `null`; outside = `dragend` → `cancel` (`tile.spec:313-319`, `cols.spec` wiring `board-columns.tsx:237`) (M3 killed) | ✅ |

### P1: Move cards with the keyboard

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FDND-08 | Every active card focusable, visible purple focus outline | `tile.spec:252-261` `tabIndex` `0`, name = title, class `focus-visible:outline-border-focus`; `:275-297` archived / read-only not focusable | ✅ |
| FDND-09 | Space picks: lifted card; banner "Movendo “{title}”: {col}, posição {i} de {n}. Setas movem, Espaço solta, Esc cancela."; live "Tarefa {title}, coluna {col}, posição {i} de {n}" | `bm.spec:407-419` announcement `'Tarefa Card c2, coluna Backlog, posição 2 de 2'`, banner `'Movendo “Card c2”: Backlog, posição 2 de 2. Setas movem, Espaço solta, Esc cancela.'`, `liftedId`; `tile.spec:321-327` Space → `onPick('c1')`; `tile.spec:404-410` lifted `shadow-lg` + `border-border-focus`; `screen.spec:391-408` banner above columns, live region (EN) | ✅ |
| FDND-10 | ↑ ↓ one position, stop at first/last | `move.spec:77-100` up/down + both stops (M1 killed); `bm.spec:421-440` ArrowUp → index 0 + text "posição 1 de 2" | ✅ |
| FDND-11 | ← → previous/next column at same index, capped, stop at first/last column | `move.spec:113-180` same index, cap (M2 killed), empty target → 0, first/last column, one column; `bm.spec:442-470` | ✅ |
| FDND-12 | Banner + announcement update on each change | `bm.spec:421-440` both texts after ↑; `:442-455` "coluna Doing, posição 1 de 2" (`{n}` counts the card, M10 killed); `screen.spec:409-422` each step | ✅ |
| FDND-13 | Space/Enter drops: "Tarefa {title} solta em {col}, posição {i} de {n}", banner hidden, move sent when changed | `bm.spec:472-493` text `'Tarefa Card c1 solta em Doing, posição 2 de 2'`, `banner` `null`, body `{listId:'l2', position:1}`; `:495-522` origin → announced, `moves` `[]`; `tile.spec:361-368` Space and Enter → `onDrop` (M23 killed); `e2e:127-149` | ✅ |
| FDND-14 | Esc: back to start, "Movimento cancelado", banner hidden, no request | `bm.spec:524-538` `announcement` `'Movimento cancelado'`, banner `null`, `preview.columns` `toBe(initial)`, `moves` `[]`; `tile.spec:370-376`; `screen.spec:444-466` Esc anywhere on the board (M26 killed) | ✅ |
| FDND-15 | Focus stays on the card while picked, after drop and after cancel | `screen.spec:422` `document.activeElement` is the card mid-move, `:436-439` after drop (in Done); `cols.spec:491-506` across columns, `:508-520` while saved, `:522-540` focus left alone after the user moves it (M20 killed) | ✅ |
| FDND-16 | Space on the done checkbox toggles done, no pick | `tile.spec:378-386` `onToggleDone` called once with the card, `onPick` not called; `:388-394` arrows from the checkbox ignored (M15 killed) | ✅ |
| FDND-17 | Help line, exact text, `md`+, active board, ≥1 active column, no keyboard move | `board/components/keyboard-help.spec.tsx:22-35` exact PT-BR and EN text; `:37-43` `hidden md:flex`; `screen.spec:408` hidden while picked, `:440` back after drop, `:527-535` none with no columns, `:537-549` none on archived board (M19 killed) | ✅ |
| FDND-18 | Phone layout: picked card changing column scrolls it into view | `cols.spec:543-554` `scrollTo` called for the target column; `:556-576` not for a same-column step or a mouse drag; `:578-588` not from `md` up (M18 killed) | ✅ |

### P1: Reorder columns

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FDND-19 | Every active column draggable by its header; shows where it lands | `col.spec:327-339` header `dragstart` → `setData`, `onDragStart`; `cols.spec:383-406` left/right half → hover index; `move.spec:616-638` mouse column preview reorders columns; `col.spec:480-484` translucent source; `move.spec:224-237` `columnDropSlot` | ✅ |
| FDND-20 | Drop at another position → `POST /lists/{id}/move` `{position}` = index among others | `bm.spec:294-305` `{path:'/api/v1/lists/l2/move', body:{position:0}}`; `cols.spec:417-424` drop; `mut.spec:733-761` exact body + cache; `e2e:151-181` | ✅ |
| FDND-21 | Header focusable, name "Coluna {name}. Espaço para mover" | `col.spec:307-317` `getByRole('button', {name:'Coluna To do. Espaço para mover'})`, `tabIndex 0`, focus class; `:319-325` EN | ✅ |
| FDND-22 | Space on header picks; banner "Movendo a coluna “{name}”: posição {i} de {n}. ← → movem, Espaço solta, Esc cancela."; announce "Coluna {name}, posição {i} de {n}" | `bm.spec:540-551` exact announcement `'Coluna Doing, posição 2 de 2'` and banner; `col.spec:372-379` Space → `onPick`; `col.spec:486-492` lifted classes | ✅ |
| FDND-23 | ← → one position, stop at ends, announce | `move.spec:184-200` (M21 killed); `bm.spec:553-578` left twice → index 0, ↑ ↓ ignored, exact texts; last position stays | ✅ |
| FDND-24 | Space/Enter drops: "Coluna {name} solta na posição {i} de {n}", banner hidden, move when changed | `bm.spec:580-597` exact text, `banner` `null`, body `{position:0}`; `col.spec:450-457` Space/Enter → `onDrop`; `e2e:151-181` keyboard half | ✅ |
| FDND-25 | Esc puts back, "Movimento cancelado", no request | `bm.spec:599-611` exact text, `banner` `null`, `moves` `[]`; `col.spec:459-465` | ✅ |
| FDND-26 | Space on the name button renames, no pick | `col.spec:381-389` rename field opens, `onPick` not called | ✅ |
| FDND-27 | Renaming column cannot be dragged or picked | `col.spec:391-399` `draggable` false + Space no pick (M16 killed); `bm.spec:198-212` `start` ignored for that column only | ✅ |
| FDND-28 | Drop on start position → no request | `bm.spec:318-359` "on the column origin" → `moves` `[]`; `move.spec:293-295` `null` | ✅ |

### P1: Move a card with "Mover para…"

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FDND-29 | Every active card: menu button labelled "Mover para…", only item "Mover para…" | `tile.spec:418-426` items `toEqual(['Mover para…'])`; `:485-490` EN; `:470-483` absent on archived / read-only | ✅ |
| FDND-30 | Dialog "Mover para…", card title in quotes as description, one option per active column in board order, current "Atual" + check | `dialog.spec:49-74` `getByRole('dialog', {name:title, description:'“Login”'})`; `:76-84` option order; `:86-95` `aria-current` on current only, one "Atual", `svg.lucide-check`; `unit/shared/ui/dialog.spec.tsx:60-90` `aria-describedby` | ✅ |
| FDND-31 | Other column → close, card at end, `{listId, position: count there}`, toast "Tarefa movida para {col}" | `bm.spec:671-691` `moveToCard` `null`, cache `l1:2`, body `{listId:'l1', position:2}`, `findByText('Tarefa movida para Backlog')` (M12 killed); `screen.spec:500-525`; `e2e:183-205` at 375 px | ✅ |
| FDND-32 | Current column → close, no request | `bm.spec:693-703` `moves` `[]` (M13 killed); `dialog.spec:106-112`, `:132-147` one-column board | ✅ |
| FDND-33 | Esc or close button → close, no move | `dialog.spec:114-130` `onClose` called, `onChoose` not; `bm.spec:705-715` `moves` `[]` | ✅ |
| FDND-34 | Menu use never picks or opens the card | `tile.spec:428-437` `onPick` not called; `:439-462` keys on the menu button reach neither pick, drop nor cancel | ✅ |

### P1: Failed and blocked moves

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FDND-35 | Card move network/5xx → back to old column and index, "Não foi possível mover a tarefa" + Tentar novamente resends | `bm.spec:732-743` cache back to `l1:0`, text `moveFailed`, retry `moves[1]` `toEqual(moves[0])` (M8, M11 killed); `bm.spec:717-729` same for "Mover para…"; `notifier.spec:149-164`, `:229-250` retry keeps the message (M14 killed); network branch `notifier.spec:67-75` | ✅ |
| FDND-36 | Column move network/5xx → old index, "Não foi possível salvar. Tente novamente." + Tentar novamente | `bm.spec:745-755` exact default text + identical retry body; revert `mut.spec:763-792` (M25 killed) | ✅ |
| FDND-37 | `409` → put back, conflict text + Recarregar refetches every board query | `bm.spec:757-765` exact conflict text + Recarregar button; reload on click `notifier.spec:77-92`; VM reload = `invalidateQueries({queryKey: boardViewKeys.all})` (`bm.spec:767-777`); revert error-agnostic `mut.spec:622-665` | ✅ |
| FDND-38 | `404` → put back, saveFail without button, refetch | `bm.spec:767-777` text + `invalidate` `toHaveBeenLastCalledWith({queryKey: boardViewKeys.all(boardId)})`, 2 calls; no button `notifier.spec:94-104` | ✅ |
| FDND-39 | Two moves in flight, one fails → only that item reverts | `mut.spec:622-665` failed card back (`c4 l1:0`), other card keeps `l1:…` spot; `mut.spec:763-792` lists | ✅ |
| FDND-40 | Item with request in flight cannot be dragged, picked, or moved via menu | `bm.spec:180-187` `start` ignored for pending card and column (M9 killed); `bm.spec:657-669` `askMoveTo` ignored (M27 killed); `tile.spec:269-273` `draggable` `'false'` (M28 killed), `:329-335` no pick, `:464-468` menu disabled; `col.spec:401-409`; `mut.spec:667-691`, `:794-` pending ids | ✅ |
| FDND-41 | While picked, Space on any other card or header ignored | `bm.spec:613-624` second card and column pick ignored, announcement unchanged; `bm.spec:189-196` | ✅ |
| FDND-42 | Archived board: no draggable card/column, no header handle, no card menu, no help line | `screen.spec:537-549` no help, no "Move to…", `[draggable="true"]` `null`; `col.spec:411-424` no handle; `tile.spec:479-483`; `vm.spec:1153-1166` `canMove` false, pick starts nothing | ✅ |
| FDND-43 | Virtual column, its cards, archived section: not draggable/pickable, no drop | `cols.spec:463-489` no `[draggable]`, `[data-card-id]`, `[data-column-id]` in "Arquivadas" / "Colunas arquivadas", `dragOver` not prevented; `cols.spec:438-461` no column drop there (M17 killed); `tile.spec:275-297` archived mode | ✅ |

**Status**: ❌ 42/43 strong, 1 weak (FDND-02 placeholder style). No spec-precision gaps: every FDND text, attribute and body is precise in the spec and asserted exactly.

---

## Discrimination Sensor

Temporary `git worktree` at `<job>/tmp/dnd-sensor` on `2bf46ee`, with `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). Each mutant ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board test/unit/shared/ui/toast` (742 tests, all green unmutated). Paths are relative to `front-end/src/`.

| # | File:line | Mutation | Killed? (failing specs) |
| - | --------- | -------- | ----------------------- |
| M1 | `features/board/model/move.ts:37` | ArrowDown cap `last` → `last + 1` | ✅ (move) |
| M2 | `features/board/model/move.ts:44` | ← → drops the cap (`at.index`) | ✅ (move) |
| M3 | `features/board/model/move.ts:91` | same-spot `null` guard removed | ✅ (move, bm) |
| M4 | `features/board/model/move.ts:89` | cross-column body omits `listId` | ✅ (move, bm, vm, screen) |
| M5 | `features/board/model/move.ts:142` | origin list not renumbered | ✅ (move, mut) |
| M6 | `features/board/model/move.ts:225` | placeholder shown on the origin spot | ✅ (move) |
| M7 | `features/board/model/move.ts:62` | `dropSlot` before/after flipped | ✅ (move, col) |
| M8 | `features/board/api/mutations.ts:222` | card revert removed | ✅ (mut, bm) |
| M9 | `features/board/view-models/use-board-move.ts:151` | `start` ignores pending ids | ✅ (bm) |
| M10 | `features/board/view-models/use-board-move.ts:102` | `{n}` excludes the moved card | ✅ (bm, screen) |
| M11 | `features/board/view-models/use-board-move.ts:181` | card drop loses its retry message | ✅ (bm) |
| M12 | `features/board/view-models/use-board-move.ts:221` | "Mover para…" position `length - 1` | ✅ (bm, screen) |
| M13 | `features/board/view-models/use-board-move.ts:218` | current column sends a request | ✅ (bm) |
| M14 | `shared/ui/toast/use-save-failure-notifier.ts:57` | retry drops `options` | ✅ (notifier) |
| M15 | `features/board/components/card-tile.tsx:91` | card handles keys from children (checkbox Space picks) | ✅ (tile) |
| M16 | `features/board/components/board-column.tsx:98` | column liftable while renaming | ✅ (col) |
| M17 | `features/board/components/board-columns.tsx:251` | archived column/section accept column drops | ✅ (cols) |
| M18 | `features/board/components/board-columns.tsx:194` | phone scroll removed | ✅ (cols) |
| M19 | `features/board/components/board-screen.tsx:104` | help line shown during a keyboard move | ✅ (screen) |
| M20 | `features/board/components/board-columns.tsx:171` | refocus after re-render removed | ✅ (cols, screen, vm) |
| M21 | `features/board/model/move.ts:54` | `stepColumn` passes the last column | ✅ (move, bm) |
| M22 | `features/board/components/move-announcer.tsx:10` | `aria-live` `assertive` → `polite` | ✅ (announcer) |
| M23 | `features/board/view-models/use-board-move.ts:172` | drop announcement removed | ✅ (bm, screen) |
| M24 | `features/board/components/board-column.tsx:296` | outline on every column during a drag | ✅ (col) |
| M25 | `features/board/api/mutations.ts:256` | column revert removed | ✅ (mut) |
| M26 | `features/board/components/board-screen.tsx:43` | board-level Esc cancel removed | ✅ (screen) |
| M27 | `features/board/view-models/use-board-move.ts:207` | `askMoveTo` ignores pending | ✅ (bm, vm) |
| M28 | `features/board/components/card-tile.tsx:123` | pending card draggable | ✅ (tile) |

Not run as a mutant, found by inspection: removing `border-dashed` from the placeholder (`board-column.tsx:160`) would survive, because no assertion reads the placeholder's classes. See Fix 1.

**Sensor depth**: expanded lightweight (UI feature, not P0; large surface, so 28 mutants over model, mutations, view model, components)
**Outcome**: 28/28 killed ✅
**Isolation**: real-tree `git status --porcelain` was empty before and after; worktree removed and pruned; `find node_modules front-end/node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → no broken symlinks; `front-end/node_modules/vitest/vitest.mjs` still resolves.

---

## Interactive UAT Results

Not performed; the orchestrator decides.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ One model file (`move.ts`, pure functions), one view-model hook (`use-board-move.ts`), four small components; no drag-and-drop library (native HTML5 DnD, FE-AD-012) |
| Surgical changes | ✅ Outside the feature: `byPosition` exported (`columns.ts`), two DTO aliases (`types.ts`), optional `description` on `shared/ui/dialog.tsx` (needed by FDND-30, tested in `dialog.spec.tsx:60-90`), `retryMessage` / `null` success in the notifier (T1, old callers unchanged), one `exact: true` in `board.e2e-spec.ts` (new "Mover para…" buttons made the old name ambiguous) |
| No scope creep | ✅ No touch drag, no filter guard, no checklist reorder (all out of scope) |
| Matches patterns | ✅ Moves reuse `useOptimisticBoardViewChange` (FE-AD-009/010) and `runChange`; texts in both locales (FE-AD-004); tests mirror `src/` (FE-AD-007) |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ All texts, bodies, roles and names are exact; placeholder style unasserted (Fix 1) |
| Per-layer Coverage Expectation met (tasks.md matrix) | ✅ Model 1:1 with edges; mutations with exact body, optimistic patch, per-item revert, pending id, one invalidation (`mut.spec:693-730`); view model covers every guard, text and failure kind; e2e covers the four journeys with a reload |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Spot-checked `bm.spec`, `cols.spec`, `tile.spec`: each test cites or matches an FDND AC, an edge case, or a T-task Done-when (e.g. `move.spec:175` unknown column → design guard) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004, -005, -007, -009, -010, -012) | ✅ |

---

## Edge Cases

- [x] Empty column accepts a drop and shows "Arraste cards para cá" until it does: `col.spec:603-615`, `:656-664`
- [x] One active column: ← → keep a picked card / column in place: `move.spec:167-173`, `:197-200`
- [x] "Mostrar arquivadas" on: active items still move, virtual column and section stay out: `cols.spec:463-489` (session running with `showArchived: true`)
- [x] One active column in "Mover para…" shows "Atual" and sends nothing: `dialog.spec:132-147`, `bm.spec:693-703`
- [x] Moved then archived elsewhere → `409` → FDND-37: `bm.spec:757-765`
- [x] `401` on a move → session expiry, no move toast: `notifier.spec:106-115` (`sessionExpired` → nothing shown); shared path, unchanged by this feature

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root)
- **Result**: exit 0. Lint (`oxlint --deny-warnings` + Prettier "All matched files use Prettier code style!"), `tsc --noEmit` clean, **92 test files, 1150 passed, 0 failed, 0 skipped**, `vite build` OK
- **E2E (CI, not run locally)**: run `40756894400` on `2bf46ee` (main), conclusion success, all 12 jobs green; job `front-end (test:e2e)` (`123058117765`): "Running 13 tests using 2 workers", **13 passed (1.1m)**. Board PASS had 9 e2e, so +4: the four `board-dnd.e2e-spec.ts` journeys
- **Test count before feature**: 907 (board validation iteration 4; no test or source commit between `45b0664` and `0b16971`)
- **Test count after feature**: 1150
- **Delta**: +243 new tests; 0 removed (`git diff 0b16971..2bf46ee -- front-end/test/unit` has no removed `it(`/`test(` line)
- **Skipped tests**: none
- **Failures**: none

---

## Observations (non-blocking)

1. While a card is dragged, the column outline and placeholder stay on the last column the pointer crossed when the pointer moves off every column; there is no `dragleave`. A release there sends nothing (`dragend` → `cancel`), so FDND-07 holds. The prototype (`design/Task List.dc.html:1083`, `:1098`) behaves the same. Spec-silent beyond FDND-02 "under the pointer".
2. FDND-37 / FDND-38 at the view-model layer assert the toast and refetch but not the cache revert; the revert is error-agnostic in `useOptimisticBoardViewChange` and proven by `mut.spec:622-665` (500) and M8/M25. Adequate by composition.
3. Bundle: main JS chunk 697 kB (681 kB at board PASS, +16 kB). No drag library was added. A code split stays worth doing.
4. After a mouse drop, the card's `dragend` also calls `cancel()` (`board-columns.tsx:237`); it only clears an already-null session and announces nothing for a mouse session. Harmless.

---

## Fix Plans

### Fix 1: Assert the dashed placeholder style (FDND-02)

- **Root cause**: `col.spec:521-523` finds the placeholder by `[data-drop-placeholder]` and checks only where it sits. The spec says the placeholder is dashed, and `board-column.tsx:160` draws it with `border-2 border-dashed border-border-focus`, but nothing asserts that.
- **Fix task**:
  - **What**: In the "shows the placeholder before the card it precedes" test (or a new one next to it), assert the placeholder carries `border-dashed` (and `border-border-focus`, the purple token used by the outline test at `:621-622`).
  - **Where**: `front-end/test/unit/features/board/components/board-column.spec.tsx` (`dropping cards` block, near `:634-654`). Test only; no `src/` change.
  - **Verify**: Mutate `border-dashed` → `border-solid` at `board-column.tsx:160` in a scratch copy; the test fails. Build gate passes.
  - **Done when**: the placeholder's dashed style is asserted, the mutant is killed, and the test count grows by 0 or 1.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FDND-01, FDND-03 – FDND-43 | Pending | ✅ Verified |
| FDND-02 | Pending | ❌ Needs Fix (test gap only: placeholder style, Fix 1) |

---

## Summary

**Overall**: ⚠️ Issues (one cosmetic test gap)

**Spec-anchored check**: 42/43 ACs matched the spec outcome with discriminating assertions; 1 weak (FDND-02); 0 spec-precision gaps
**Sensor**: 28/28 mutations killed
**Gate**: 1150 unit/component passed, 0 failed, 0 skipped; 13 e2e passed in CI `40756894400`

**What works**: mouse card and column drags with the exact `MoveCardDto` / `MoveListDto` bodies; keyboard moves with exact PT-BR banners and live-region texts, focus kept, phone scroll; "Mover para…" dialog and toast; optimistic moves with per-item revert, card-specific retry text, `409` / `404` handling; pending, renaming, archived-board and virtual-column guards.

**Issues found**: FDND-02 placeholder dashed style not asserted → Fix 1 (test only).

**Next steps**: Route Fix 1 to an implementer, then re-verify (iteration 2 of max 3).
