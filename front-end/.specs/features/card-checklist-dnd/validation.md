# Card Checklist Drag and Drop Validation

**Date**: 2026-11-02
**Spec**: `front-end/.specs/features/card-checklist-dnd/spec.md`
**Diff range**: `c0e4845..69f8350` (`c0e4845` = merge of PR #365, the card-checklist UAT docs; `69f8350` = merge of PR #380, main HEAD). 13 code/test commits (`aec1488` T1 … `fc0f404` T12, including the fix `2321b0b`) plus docs commits; `git diff --shortstat c0e4845..69f8350 -- front-end/src front-end/test` → 17 files, +2364/−43 (`src/` 9 files, `test/` 8 files). Outside `src`/`test`: `ROADMAP.md`, `STATE.md`, `spec.md`, `design.md`, `tasks.md` only. `card-detail.tsx` is not changed: the section composes the move through the checklist view model.
**Verifier**: independent pass (author ≠ verifier), iteration 1

## Validation: Card Checklist Drag and Drop - FAIL ❌ (iteration 1)

**Result (iteration 1)**: FAIL ❌. The build gate is green on `69f8350`: **1770** unit/component tests (1669 + 101), lint, typecheck, build; e2e **35 passed** locally against the running stack and green in CI run `41467667539` (job `front-end (test:e2e)` `125352708675`). 23 of 25 FCLD requirements have full discriminating evidence. The sensor ran 11 behavior-level mutants: **10 killed, 1 survived** (M10). A scratch probe found one behavior gap.

1. **FCLD-21 two moves (code + test)**: no test runs two moves at once; the only overlap test is a move plus a toggle (`mut.spec:725-766`). A scratch probe with two moves in flight (C → 0, then A → 2 on `A, B, C`; the first fails) leaves the cache at **`B, A, C`**: C goes back to index 2, which pushes A off the last spot the user dropped it on. The server holds `B, C, A`. The revert re-places the failed item at its old **index** (`api/checklist-mutations.ts:149`, `:156`), which does not keep the other move when both moves touch the same span. The settle refetch fixes the order once the last change settles, but until then the screen shows an order the user did not make and the server does not hold. The spec also does not say what order the screen must show in that case (⚠️ spec-precision gap).
2. **M10 / FCLD-01 icon (test only)**: the grip can render any icon (`GripVertical` → `X`) and every test passes. No test checks the `grip-vertical` icon. This repeats lesson L-011. Nit, same group: FCLD-07's *purple* outline colour (`focus-visible:outline-border-focus`) is not asserted either; only `focus-visible:outline-2` is (`item.spec:210`).

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-11-02) | `c0e4845..69f8350` | ✅ 1770 unit (local), 35 e2e (local + CI `41467667539`) | 23/25 strong; FCLD-21 gap + spec-precision gap; FCLD-01 weak conjunct (icon) | 10/11 killed, M10 survived; FCLD-21 probe failed | ❌ FAIL, Fixes 1–2 |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T14 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `49`. Each code task has its own commit (`aec1488`..`fc0f404`); T8 has a follow-up fix `2321b0b` (grip keeps focus while its move is in flight: `aria-disabled` instead of `disabled`). T12 (e2e) is backed by CI on the merge of PR #378 and by run `41467667539` on main HEAD. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. Line numbers are read on `69f8350`. Short names: `model.spec` = `unit/features/board/model/checklist.spec.ts`; `mut.spec` = `unit/features/board/api/checklist-mutations.spec.tsx`; `move.spec` = `unit/features/board/view-models/use-checklist-move.spec.tsx` (PT-BR); `vm.spec` = `unit/features/board/view-models/use-card-checklist-view-model.spec.tsx` (PT-BR); `item.spec` = `unit/features/board/components/card-detail-checklist-item.spec.tsx` (PT-BR); `cl.spec` = `unit/features/board/components/card-detail-checklist.spec.tsx` (PT-BR); `cd.spec` = `unit/features/board/components/card-detail.spec.tsx` (EN, composed detail with MSW); `e2e` = `e2e/card-checklist-dnd.e2e-spec.ts` (EN, real API). "Mx" points to a sensor mutant.

### P1: Reorder items with the mouse

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLD-01 | Editable mode, items shown → a grip button with the `grip-vertical` icon named "Reordenar o item {text}" at the start of every row | `item.spec:75-77` grip found by role `button` + name `'Reordenar o item Escrever testes'`; `item.spec:204-211` grip present, `data-item-grip-id` `'i1'`; `cl.spec:370-374` a grip on each of the three rows; `e2e:71-76`, `:130-141` grip by name `Reorder the item {text}`. **Icon not asserted**: M10 (`GripVertical` → `X`) survived. "At the start of the row" is not asserted either (the grip is the first child in `card-detail-checklist-item.tsx:132-151`) | ⚠️ weak conjunct (icon) |
| FCLD-02 | A mouse drag started on the grip drags that row | `item.spec:343-352` `draggable` `'true'` only after `pointerDown` on the grip, back after `pointerUp`; `item.spec:381-395` `setData('text/plain','i1')`, `effectAllowed` `'move'`, `onStart` `('mouse')`; `cl.spec:499-517` `start` `('i2','mouse')`; `e2e:135-140` real drag C → top, reload `['C','A','B']` | ✅ |
| FCLD-03 | Press on field, checkbox or delete button starts no drag | `item.spec:354-362` `pointerDown` on textbox, checkbox and delete → `draggable` not `'true'` | ✅ |
| FCLD-04 | Source row dashed and translucent; dashed placeholder at the landing spot | `item.spec:426-435` `border-dashed` + `opacity-50` true for the source, false otherwise; `cl.spec:429-435` source row dashed, no placeholder before the first hover; `cl.spec:437-449` placeholder `border-dashed`, before `Escrever testes` for index 0, after `Publicar` for the end; `cl.spec:451-464` hover above/below the middle → `hover` `[1]`, `[2]`; `item.spec:397-412` `'before'`/`'after'`; `model.spec` `previewItems` (mouse: items unchanged, `placeholderIndex` = target) | ✅ |
| FCLD-05 | Drop at another position → placed at the placeholder spot, `POST /api/v1/checklist-items/{id}/move` with `position` = index among the other items | `move.spec:267-280` `moves` `toEqual([{ id: 'a', body: { position: 2 } }])` (M5 killed); `mut.spec:647-666` `calls` `[{ id: 'c', body: { position: 0 } }]`; `mut.spec:668-685` cache `['c0','a1','b2']` before the response; `model.spec` `placeItem` `[c0,a1,b2]`, `[b0,c1,a2]` (M3 killed); `cl.spec:466-478` end zone → `hover(2)` (two other rows); `e2e:130-141` reload `['C','A','B']` | ✅ |
| FCLD-06 | Drop on the start spot or outside the list → item stays, no request | `move.spec:282-291` drop before any hover → `moves` `[]`; `move.spec:293-305` drop at the start index → `[]`, cache `['A:0','B:1','C:2']`; `move.spec:307-320` cancel (drag end outside) silent, `[]`; `cl.spec:499-517` drag end → `cancel` once; `model.spec:153-155` `itemMoveBody(1,1)` `null` (M2 killed) | ✅ |

### P1: Reorder items with the keyboard

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLD-07 | Every grip focusable, visible **purple** focus outline | `item.spec:204-211` `focus-visible:outline-2` true; grip is a `<button>`, not `disabled` (`item.spec:223`); `cd.spec:628-645` reached by Tab. The purple colour (`focus-visible:outline-border-focus`) is not asserted | ⚠️ nit (folded into Fix 2) |
| FCLD-08 | Space picks: row `bg-brand-soft`, banner "Movendo “{text}”: posição {i} de {n}. ↑ ↓ movem, Espaço solta, Esc cancela." between bar and list, live "Item {text}, posição {i} de {n}" | `move.spec:111-122` banner `'Movendo “B”: posição 2 de 3. ↑ ↓ movem, Espaço solta, Esc cancela.'`, announcement `'Item B, posição 2 de 3'`; `item.spec:239-248` Space → `onStart('keyboard')`, default prevented; `item.spec:308-318` lifted row `bg-brand-soft`; `cl.spec:379-394` banner after the progress bar and before the first checkbox; `cl.spec:519-529` Space on grip → `start('i3','keyboard')`; `e2e:144-156` EN banner text visible | ✅ |
| FCLD-09 | ↑/↓ move one position, stop at first/last | `model.spec:125-146` `stepItem` 1→0, 1→2, 0→0, 2→2, single 0→0 (M1 killed); `move.spec:133-157` order `['B','A','C']`, `['A','C','B']`; `move.spec:159-174` no wrap, `'Item A, posição 1 de 3'`, `'… 3 de 3'`; `cl.spec:415-427` rows rendered from the keyboard preview | ✅ |
| FCLD-10 | On each position change, banner updates and live "Item {text}, posição {i} de {n}" | `move.spec:139-143`, `:152-156` banner `'… posição 1 de 3 …'` / `'… 3 de 3 …'` and announcement (M7 killed) | ✅ |
| FCLD-11 | Space or Enter drops: live "Item {text} solto na posição {i} de {n}", banner hidden | `move.spec:176-190` `'Item B solto na posição 1 de 3'`, `bannerText` `null`; `item.spec:261-274` Space and Enter go to `onKey` while picked; `cl.spec:531-545` Enter and Space → `drop` twice; `cd.spec:654-657` live region in the dialog reads `'Item Review solto na posição 1 de 3'`; `e2e:157-159` banner hidden after Space | ✅ |
| FCLD-12 | Keyboard drop at another index → move of FCLD-05 with that index | `move.spec:187-189` `[{ id: 'b', body: { position: 0 } }]`; `vm.spec:894-911` `[{ id: 'i2', body: { position: 0 } }]`; `cd.spec:639-653` `[{ id: 'i2', body: { position: 0 } }]`; `e2e:144-161` reload `['B','C','A']` | ✅ |
| FCLD-13 | Keyboard drop at the picked index → no request | `move.spec:192-205` ↑ then ↓ then drop → `moves` `[]`, `'Item B solto na posição 2 de 3'`; `move.spec:224-239` single item → `[]` (M2 killed) | ✅ |
| FCLD-14 | Esc: back to start, "Movimento cancelado", banner hidden, no request, detail stays open | `move.spec:207-222` `'Movimento cancelado'`, banner `null`, order `['A','B','C']`, `moves` `[]`; `item.spec:286-295` Esc does not reach `document.body` (M9 killed); `cd.spec:669-690` order back, detail open, path still the card, second Esc closes, `moves` `[]`; `e2e:165-182` order and reload `['A','B','C']`, `moves` `0` | ✅ |
| FCLD-15 | Focus on the picked grip while moving, after drop and cancel | `cl.spec:564-586` after each step and after the drop `document.activeElement` is the grip (M11 killed); `cl.spec:588-599` focus moved by the user is left alone; `cd.spec:658`, `:666` grip focused after the drop and after the refetch | ✅ |
| FCLD-16 | Closing the detail while picked cancels, no request | `cd.spec:692-707` pick + ↑, click **Fechar** → path back to the board, `moves` `[]`. Click outside and browser back go through the same unmount (design.md:36), not tested separately | ✅ |
| FCLD-17 | Live region inside the dialog, visually hidden, `role="status"`, `aria-live="assertive"` | `cl.spec:396-407` `tagName` `'OUTPUT'` (implicit status), `aria-live` `'assertive'`, `sr-only`, inside the section; `cl.spec:409-413` mounted while loading; `cd.spec:654-657` found `within(detail())` | ✅ |

### P1: Failed and blocked moves

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLD-18 | Network/5xx → item back at its old index, toast "Não foi possível salvar. Tente novamente." + **Tentar novamente** resending the same move | `mut.spec:687-706` cache `[itemA,itemB,itemC]` after `500` (M4 killed); `move.spec:378-390` toast text, click **Tentar novamente** → `moves[1]` `toEqual(moves[0])` (M8 killed); `cd.spec:724-748` composed: toast, `moves` `[{ id:'i2', body:{ position:0 } }]`, order `['Draft','Review','Send']`, **Tentar novamente** present | ✅ |
| FCLD-19 | `409` → back, "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar** | `move.spec:392-404` conflict text, `reload` not called before, called once after **Recarregar**; revert is status-independent (`mut.spec:687-706`). `reload` is the view model's `invalidateQueries(boardViewKeys.all)` (`use-card-checklist-view-model.ts:41-44`), the same reload card-checklist verified for FCL-35 (L-017) | ✅ |
| FCLD-20 | `404` → back, save-fail toast without a button, refetch | `move.spec:406-417` save-fail text, `queryByRole('button')` `null`, `reload` called once | ✅ |
| FCLD-21 | Two moves in flight, one fails → only the failed item goes back, the other move stays on screen | **No test with two moves.** `mut.spec:725-766` covers a move plus a toggle of another item (edge case 3). Scratch probe (two `useMoveChecklistItem`, C → 0 then A → 2 on `A,B,C`, first fails) → cache `"bac"`; A no longer at the spot it was dropped on; server order `B,C,A`. Spec does not define the expected order | ❌ GAP + ⚠️ spec-precision gap |
| FCLD-22 | Request in flight → grip disabled, no drag | `mut.spec:768-786` move id in `usePendingItemIds`; `vm.spec:873-892` toggle in flight → `canDrag('i2')` `false`, `canDrag('i3')` `true`, back to `true`; `move.spec:365-374` pending start ignored; `item.spec:219-237` `aria-disabled` `'true'`, Space ignored; `item.spec:364-370` not draggable; `cl.spec:547-559` | ✅ |
| FCLD-23 | While picked: Space on other grips ignored, no mouse drag | `move.spec:351-363` `canDrag` false for every id during a session, second `start('b')` ignored, `keyboardItemId` stays `'a'` (M6 killed); `item.spec:219-232` Space with `canDrag:false` → no `onStart`; `item.spec:364-370` no drag | ✅ |
| FCLD-24 | Archived-card / archived-board mode → no grip, no draggable row | `item.spec:213-217` `movable: null` → no grip; `cl.spec:601-607` `isDisabled` → no grip; `cd.spec:709-722` archived card: no grip, no `[data-item-grip-id]`, no `[draggable]`; `e2e:185-198` archived card, count `0`. The archived-board mode reaches the same `isDisabled` (FCL-32, verified in card-checklist) | ✅ |
| FCLD-25 | Loading or load error → no grip | `cl.spec:609-620` loading and error → `[]`; `vm.spec:841-863` `canDrag` false while loading and on error | ✅ |

### Edge cases

- [x] One item: Space picks, ↑ ↓ keep "posição 1 de 1", drop sends nothing: `move.spec:224-239`
- [ ] Item with an unsaved text draft moved keeps its draft and still counts as dirty: no dnd test. By construction drafts are keyed by item id (`use-card-checklist-view-model.ts`), so a reorder does not touch them; not asserted (minor, not a requirement)
- [x] Move plus a toggle of another item; failure undoes only the move: `mut.spec:725-766`
- [x] Card archived elsewhere → `409` path: `move.spec:392-404`
- [x] Item deleted elsewhere → `404` path: `move.spec:406-417`
- [ ] `401` on a move goes through FND-16, no move toast: no dnd test; `runChange` is the shared notifier already covered for the other checklist changes
- [x] Settle refetch once after the last pending change: `mut.spec:788-820`

**Status (iteration 1)**: ❌ 23/25 fully evidenced; FCLD-21 has no evidence and the probe shows the other move is not kept; FCLD-01 has an unasserted conjunct (icon); 1 spec-precision gap (FCLD-21 expected order). FCLD-07's colour is a nit.

---

## Discrimination Sensor

Temporary `git worktree add --detach` at `<scratchpad>/ccdnd-sensor` on `69f8350`, with the root, `front-end` and `packages/api-contract` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). A script checked that each mutant's old text matched exactly once, applied it, ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board` (73 files, **1328** tests, all green unmutated; the runner root printed the worktree path), then restored the file with `git checkout --` and checked it matched the original before the next mutant. Paths are relative to `front-end/src/features/board/`.

| # | File:line | Mutation | Killed? (failing specs) |
| - | --------- | -------- | ----------------------- |
| M1 | `model/checklist.ts:51` | `Math.min(count - 1, …)` → `Math.min(count, …)` (↓ goes past the end) | ✅ (model, move) |
| M2 | `model/checklist.ts:59` | drop `target === origin` guard (same index sends a request) | ✅ (model, move) |
| M3 | `model/checklist.ts:73` | `splice(index, …)` → `splice(index + 1, …)` (off-by-one placement) | ✅ (model, mut, move, vm, cd) |
| M4 | `api/checklist-mutations.ts:156` | revert returns `items` (no rollback) | ✅ (mut) |
| M5 | `api/checklist-mutations.ts:140` | request body `body` → `{ position: 0 }` (payload) | ✅ (move: `drops the item and sends the hovered index`) |
| M6 | `view-models/use-checklist-move.ts:59` | `canDrag` ignores a running session | ✅ (move: guards) |
| M7 | `view-models/use-checklist-move.ts:45` | `{i}` reads `origin`, not the current target | ✅ (move, cd) |
| M8 | `view-models/use-checklist-move.ts:94` | move sent without `runChange` (no failure toast / retry) | ✅ (move, cd) |
| M9 | `components/card-detail-checklist-item.tsx:95` | Esc on a picked grip propagates to the dialog | ✅ (item, cd) |
| M10 | `components/card-detail-checklist-item.tsx:149` | `<GripVertical …>` → `<X …>` | ❌ Survived → Fix 2 |
| M11 | `components/card-detail-checklist.tsx:66` | refocus effect never refocuses | ✅ (cl: `refocuses the picked grip …`) |

**Probe (not a mutant)**: a throwaway spec in the worktree drove two `useMoveChecklistItem` hooks on one checklist (`A0,B1,C2`): move C → 0 (held, then `500`), move A → 2 (held). After the first failure the cache read `"bac"` (`Expected "PROBE"`, `Received "bac"`). See FCLD-21 and Fix 1. The file was deleted before cleanup.

**Sensor depth**: lightweight-plus (UI feature, not P0; 11 mutants over model, mutation payload/revert, move hook guards/text/failure path, and components)
**Outcome**: 10/11 killed, M10 survived → ❌
**Isolation**: real-tree `git status --porcelain` was empty before and after (diffed against the saved baseline: identical); the worktree's porcelain after the last restore listed only the three `node_modules` symlinks; the symlinks were unlinked, then `git worktree remove --force` and `git worktree prune` ran; `git worktree list` shows only the main tree; `find node_modules front-end/node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → 0 broken links; `front-end/node_modules/vitest/vitest.mjs` still resolves. No `git stash` used.

---

## Interactive UAT Results

Not performed by the Verifier (out of scope for this pass). Recommended: mouse drag in a real browser (placeholder look, text selection still works in the field) and a screen-reader pass of the live region.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Four pure model functions (`stepItem`, `itemMoveBody`, `placeItem`, `previewItems`), one mutation hook on the existing optimistic pipeline, one 120-line move hook, grip/drag props on the row, wiring in the section; reuses `MoveAnnouncer`, `MoveBanner`, `dropSlot`/`dropIndex` from board-dnd |
| Surgical changes | ✅ Outside the new code: `MoveChecklistItemDto` type, the view model extracts `reload` and exposes `move`, five i18n keys per locale. No test removed or weakened: the removed test lines are imports/`render` refactors and one `getByRole('status')` turned into `getAllByRole('status')` because of the second status region (`cd.spec:421-424`, same strength) |
| No scope creep | ✅ No touch drag, no menu, no cross-card move, no shortcuts dialog row |
| Matches patterns | ✅ FE-AD-009/-010 via `useOptimisticBoardViewChange`; `useSaveFailureNotifier`; FE-AD-012 board-dnd shape (session, preview, placeholder); FE-AD-004 EN + PT-BR keys; tests mirror `src/` (FE-AD-007) |
| Would a senior engineer approve? | ⚠️ The index-based revert (`api/checklist-mutations.ts:149-156`) does not keep an overlapping move (Fix 1) |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ Texts, bodies, ids, classes and statuses exact; FCLD-21 not tested; FCLD-01 icon and FCLD-07 colour not asserted |
| Per-layer Coverage Expectation met (tasks.md matrix) | ⚠️ Model, view models, components and e2e met it; the api row's "per-item revert" is shown only for a move + toggle, not for two moves |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Spot-checked `move.spec`, `cl.spec`, `item.spec`: each test cites an FCLD AC, an edge case or a T-task Done-when (e.g. `item.spec:297` "lets ↑ bubble" → T8; `cl.spec:480` no end zone → T10) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004, -007, -009, -010, -012), lessons L-001, L-017, L-018 | ✅ L-001: composed detail tests for keyboard move, Esc, close, archived, failure (`cd.spec:639-748`). L-017: **Recarregar** is clicked (`move.spec:402`). L-018: dashed/translucent/`bg-brand-soft` asserted. L-011 (candidate, not loaded) recurred: M10 |

No `// SPEC_DEVIATION` markers in this feature.

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root, on `69f8350`)
- **Result**: exit 0. Lint (`oxlint --deny-warnings` + Prettier "All matched files use Prettier code style!"), `tsc --noEmit` clean, **121 test files, 1770 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 743.01 kB; 737.31 kB after card-checklist, +5.7 kB)
- **E2E**: `pnpm --filter front-end test:e2e` run locally against the running Docker stack: **35 passed (7.4s)**, exit 0 (31 after card-checklist + the 4 `card-checklist-dnd.e2e-spec.ts` journeys). CI run `41467667539` on `69f8350` (main, PR #380): all 12 jobs green, including `front-end (test:e2e)` (`125352708675`)
- **Test count before feature**: 1669 (card-checklist iteration 2 on `a1ae7c1`; `a1ae7c1..c0e4845` changes no `src`/`test` file)
- **Test count after feature**: 1770
- **Delta**: +101 new tests; no test removed or weakened
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

| Fix | AC | Kind | Priority |
| --- | -- | ---- | -------- |
| Fix 1 | FCLD-21 two moves (probe) + spec-precision gap | spec decision + code + test | Minor (the settle refetch heals the order) |
| Fix 2 | FCLD-01 icon (M10), FCLD-07 colour (nit) | test only | Cosmetic |

### Fix 1: A failed move keeps an overlapping move on screen (FCLD-21)

- **Root cause**: `apply` records the failed item's old **index** (`api/checklist-mutations.ts:149`) and `revert` re-inserts it at that index (`:156`). When a second move shifted the same span, putting the item back at its old index moves the other item away from its drop spot (`A,B,C`: C → 0 fails, A → 2 succeeds → screen `B,A,C`, server `B,C,A`). No test runs two moves at once; `mut.spec:725-766` overlaps a move with a toggle, which does not touch positions.
- **Fix task**:
  - **What**: (a) Spec: state the expected screen order in FCLD-21, e.g. "the order the server holds after the other moves" (`B,C,A` in the example). (b) Code: make the revert keep the other moves, e.g. record the failed item's old neighbour (the id that followed it) and re-insert it before that neighbour, or rebuild the order by replaying the still-applied moves on the pre-move order. (c) Test: in `mut.spec` (`useMoveChecklistItem`), add "reverts only the failed move and keeps an overlapping move of another item": seed `A0,B1,C2`, hold move C → 0, then hold move A → 2, fail the first, assert the cache order equals the spec value (`['b0','c1','a2']` with the rule above) before the second move settles.
  - **Where**: `front-end/.specs/features/card-checklist-dnd/spec.md` (FCLD-21), `front-end/src/features/board/api/checklist-mutations.ts`, `front-end/test/unit/features/board/api/checklist-mutations.spec.tsx`.
  - **Verify**: the new test fails on `69f8350` (cache `b,a,c`), passes after the fix; `mut.spec:725-766` and `:687-706` stay green; build gate passes.
  - **Done when**: FCLD-21 has a two-moves test asserting the spec order; test count +1.

### Fix 2: Assert the grip icon and the purple outline (FCLD-01, FCLD-07) - M10

- **Root cause**: `item.spec:204-211` finds the grip by name and checks `focus-visible:outline-2`, but not the icon or the outline colour.
- **Fix task**:
  - **What**: In `item.spec` (`names the grip by the item text …`), assert `grip()!.querySelector('svg')!.classList.contains('lucide-grip-vertical')` is `true` and `grip()!.classList.contains('focus-visible:outline-border-focus')` is `true`.
  - **Where**: `front-end/test/unit/features/board/components/card-detail-checklist-item.spec.tsx`. Test only.
  - **Verify**: in a scratch copy, replace `<GripVertical size={14} aria-hidden />` with `<X size={14} aria-hidden />` at `card-detail-checklist-item.tsx:149`; the test fails. Build gate passes.
  - **Done when**: M10 is killed; test count +0.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FCLD-01 | Pending | ❌ Needs Fix (Fix 2, test only) |
| FCLD-02..FCLD-20 | Pending | ✅ Verified (FCLD-07 colour nit folded into Fix 2) |
| FCLD-21 | Pending | ❌ Needs Fix (Fix 1) |
| FCLD-22..FCLD-25 | Pending | ✅ Verified |

The Verifier reports only; `spec.md` traceability is left for the author to update.

---

## Summary

**Overall**: ❌ Not Ready (1 small behavior gap + 1 cosmetic test gap)

**Spec-anchored check**: 23/25 ACs fully evidenced; FCLD-21 no evidence (probe fails); FCLD-01 icon unasserted; 1 spec-precision gap (FCLD-21 expected order)
**Sensor**: 10/11 killed (M10 survived); FCLD-21 probe failed
**Gate**: 1770 unit/component passed, 0 failed, 0 skipped (`69f8350`); 35 e2e passed locally and in CI `41467667539`

**What works**: grip per row with the right name, only the grip arms the drag, field/checkbox/delete never start one; dashed source and placeholder at the index among the other rows; the mouse and keyboard send `{ position }` with the right index and nothing on the start spot or outside; keyboard pick/step/drop/cancel with exact PT-BR banner and announcements, no wrap, focus kept on the grip, Esc stays inside the detail, closing mid-move sends nothing; live region assertive inside the dialog; 5xx/409/404 toasts with retry, Recarregar and reload; pending and picked items lock the grips; read-only and loading states show no grip; real-API e2e persists the order across a reload.

**Next steps**: Fix 1 (spec decision first, then one code + test PR), Fix 2 (one small test PR), then re-verify (iteration 2).

**Lessons**: L-011 (icon identity) recurred with M10; new candidate for FCLD-21 (test the exact concurrent scenario an AC names) and its spec-precision gap.
