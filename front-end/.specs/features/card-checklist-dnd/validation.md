# Card Checklist Drag and Drop Validation

**Date**: 2026-11-02
**Spec**: `front-end/.specs/features/card-checklist-dnd/spec.md`
**Diff range**: iteration 2 fix surface `69f8350..05234e5` (`69f8350` = merge of PR #380, iteration 1 head; `05234e5` = merge of PR #383, main HEAD). Fix commits: `9c0d6bf` (spec FCLD-21 order), `e03c4ce` (`replayItemMoves`), `003ddcd` (move revert replays later moves), `1027920` (grip icon + outline test); plus the iteration 1 docs `d019354`, `76f2da8`. `git diff --stat 69f8350..05234e5 -- front-end/src front-end/test` → 5 files (`src/` 2, `test/` 3). Whole feature re-checked over `c0e4845..05234e5` for regressions; the e2e, view-model and component specs other than `item.spec` are unchanged since `69f8350`.
**Verifier**: independent pass (author ≠ verifier), iteration 2

## Validation: Card Checklist Drag and Drop - FAIL ❌ (iteration 2)

**Result (iteration 2)**: FAIL ❌. Both iteration 1 fixes landed and hold: the spec now defines the order (FCLD-21, `spec.md:120`), a two-moves test asserts it (`mut.spec:768-794`), and the grip icon and purple outline are asserted (`item.spec:211-218`). The build gate is green on `05234e5`: **1778** unit/component tests (+8), lint, typecheck, build; e2e green in CI run `41475658690` (job `front-end (test:e2e)` `125380414170`). The iteration 1 probe now ends at **`B, C, A`**, the spec order. The sensor ran 9 mutants: **7 killed, 2 survived** (M18, M19). A new probe found one more order gap next to FCLD-21.

1. **Two overlapping moves that both fail (code + test + spec)**: each logged move keeps the order it started from (`api/checklist-mutations.ts:167`), and that base is never rebased when an earlier move is reverted. On `A, B, C` with C → 0 and A → 2 in flight: C fails → `B, C, A` (right); then A fails → **`C, A, B`**: C's failed move comes back. The server holds `A, B, C`. The other order (A fails, then C) ends right (`A, B, C`), but no test runs two failures: M19 (the failed move is never dropped from the log, `:177`) changes that end state to `B, C, A` and every test passes. The settle refetch heals the screen when that failure is the last pending change. FCLD-21's sentence reads two ways here ("the order the server holds without the failed move" → `A, B, C`; "replayed … on the order before the failed move" → `C, A, B`): ⚠️ spec-precision gap. Fix 4.
2. **M18 (test only)**: `replayItemMoves` with the moves replayed in reverse (`reduce` → `reduceRight`, `model/checklist.ts:97`) passes every test. The test `replays several later moves in the order they were made` (`model.spec:252-276`) uses B → 0 and C → 2, which give `B, A, C` in either order. Fix 3.

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-11-02) | `c0e4845..69f8350` | ✅ 1770 unit (local), 35 e2e (local + CI `41467667539`) | 23/25 strong; FCLD-21 gap + spec-precision gap; FCLD-01 weak conjunct (icon) | 10/11 killed, M10 survived; FCLD-21 probe failed | ❌ FAIL, Fixes 1–2 |
| 2 (2026-11-02) | `69f8350..05234e5` (feature `c0e4845..05234e5`) | ✅ 1778 unit (local), e2e CI `41475658690` / `41474644734` | 25/25 evidenced for the cases the ACs name; FCLD-21 consecutive failures: probe fails + spec-precision gap | 7/9 killed, M18 and M19 survived; iteration 1 probe now passes | ❌ FAIL, Fixes 3–4 (Fixes 1–2 closed) |

### Iteration 1 result (history)

FAIL ❌. Gate green on `69f8350` (1770 unit/component, 35 e2e). 23 of 25 FCLD requirements had full discriminating evidence. Sensor: 10/11 killed, M10 (`GripVertical` → `X`) survived. A scratch probe with two moves in flight (C → 0 fails, A → 2 holds on `A, B, C`) left the cache at `B, A, C`, because the revert put the failed item back at its old **index**. Fix 1 (FCLD-21: spec order + revert keeps the other move + two-moves test) and Fix 2 (assert the grip icon and the purple outline) were raised; both are closed in iteration 2 (see Fix Plans).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T14 | ✅ Done | `tasks.md`: every box ticked. Each code task has its own commit (`aec1488`..`fc0f404`); T8 has a follow-up fix `2321b0b`. T12 (e2e) is backed by CI on main. |
| Fix 1 | ✅ Done | PR #382: `9c0d6bf` spec, `e03c4ce` model `replayItemMoves` + 7 tests, `003ddcd` revert replays later moves + the two-moves test |
| Fix 2 | ✅ Done | PR #383: `1027920` two assertions in `item.spec` |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. Line numbers are read on `05234e5` (iteration 2; `item.spec` lines after 211 moved by +8 and `mut.spec` lines after 766 by +28 since iteration 1). Short names: `model.spec` = `unit/features/board/model/checklist.spec.ts`; `mut.spec` = `unit/features/board/api/checklist-mutations.spec.tsx`; `move.spec` = `unit/features/board/view-models/use-checklist-move.spec.tsx` (PT-BR); `vm.spec` = `unit/features/board/view-models/use-card-checklist-view-model.spec.tsx` (PT-BR); `item.spec` = `unit/features/board/components/card-detail-checklist-item.spec.tsx` (PT-BR); `cl.spec` = `unit/features/board/components/card-detail-checklist.spec.tsx` (PT-BR); `cd.spec` = `unit/features/board/components/card-detail.spec.tsx` (EN, composed detail with MSW); `e2e` = `e2e/card-checklist-dnd.e2e-spec.ts` (EN, real API). "Mx" points to a sensor mutant.

### P1: Reorder items with the mouse

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLD-01 | Editable mode, items shown → a grip button with the `grip-vertical` icon named "Reordenar o item {text}" at the start of every row | `item.spec:75-77` grip found by role `button` + name `'Reordenar o item Escrever testes'`; `item.spec:204-218` grip present, `data-item-grip-id` `'i1'`, `grip()!.querySelector('svg')!.classList.contains('lucide-grip-vertical')` `true` (`:214-218`, M10 killed in iteration 2); `cl.spec:370-374` a grip on each of the three rows; `e2e:71-76`, `:130-141` grip by name `Reorder the item {text}`. "At the start of the row" is by construction (the grip is the first child, `card-detail-checklist-item.tsx:132-151`) | ✅ |
| FCLD-02 | A mouse drag started on the grip drags that row | `item.spec:351-360` `draggable` `'true'` only after `pointerDown` on the grip, back after `pointerUp`; `item.spec:389-403` `setData('text/plain','i1')`, `effectAllowed` `'move'`, `onStart` `('mouse')`; `cl.spec:499-517` `start` `('i2','mouse')`; `e2e:135-140` real drag C → top, reload `['C','A','B']` | ✅ |
| FCLD-03 | Press on field, checkbox or delete button starts no drag | `item.spec:362-370` `pointerDown` on textbox, checkbox and delete → `draggable` not `'true'` | ✅ |
| FCLD-04 | Source row dashed and translucent; dashed placeholder at the landing spot | `item.spec:434-443` `border-dashed` + `opacity-50` true for the source, false otherwise; `cl.spec:429-435`; `cl.spec:437-449` placeholder `border-dashed` before `Escrever testes` for index 0, after `Publicar` for the end; `cl.spec:451-464` hover above/below the middle → `hover` `[1]`, `[2]`; `item.spec:405-420` `'before'`/`'after'`; `model.spec` `previewItems` (`:376-386`) | ✅ |
| FCLD-05 | Drop at another position → placed at the placeholder spot, `POST /api/v1/checklist-items/{id}/move` with `position` = index among the other items | `move.spec:267-280` `moves` `toEqual([{ id: 'a', body: { position: 2 } }])`; `mut.spec:647-666` `calls` `[{ id: 'c', body: { position: 0 } }]`; `mut.spec:668-685` cache `['c0','a1','b2']` before the response; `model.spec:176-190` `placeItem`; `cl.spec:466-478` end zone → `hover(2)`; `e2e:130-141` reload `['C','A','B']` | ✅ |
| FCLD-06 | Drop on the start spot or outside the list → item stays, no request | `move.spec:282-291`, `:293-305`, `:307-320` → `moves` `[]`; `cl.spec:499-517` drag end → `cancel` once; `model.spec:153-155` `itemMoveBody(1,1)` `null` | ✅ |

### P1: Reorder items with the keyboard

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLD-07 | Every grip focusable, visible **purple** focus outline | `item.spec:210-213` `focus-visible:outline-2` and `focus-visible:outline-border-focus` both `true` (M12 killed); grip is a `<button>`, not `disabled` (`item.spec:231`); `cd.spec:628-645` reached by Tab | ✅ |
| FCLD-08 | Space picks: row `bg-brand-soft`, banner "Movendo “{text}”: posição {i} de {n}. ↑ ↓ movem, Espaço solta, Esc cancela." between bar and list, live "Item {text}, posição {i} de {n}" | `move.spec:111-122` banner `'Movendo “B”: posição 2 de 3. ↑ ↓ movem, Espaço solta, Esc cancela.'`, announcement `'Item B, posição 2 de 3'`; `item.spec:247-256` Space → `onStart('keyboard')`; `item.spec:316-326` lifted row `bg-brand-soft`; `cl.spec:379-394` banner between bar and list; `cl.spec:519-529`; `e2e:144-156` | ✅ |
| FCLD-09 | ↑/↓ move one position, stop at first/last | `model.spec:125-146` `stepItem` 1→0, 1→2, 0→0, 2→2, single 0→0; `move.spec:133-157` order `['B','A','C']`, `['A','C','B']`; `move.spec:159-174` no wrap | ✅ |
| FCLD-10 | On each position change, banner updates and live "Item {text}, posição {i} de {n}" | `move.spec:139-143`, `:152-156` | ✅ |
| FCLD-11 | Space or Enter drops: live "Item {text} solto na posição {i} de {n}", banner hidden | `move.spec:176-190` `'Item B solto na posição 1 de 3'`, `bannerText` `null`; `item.spec:269-282`; `cl.spec:531-545`; `cd.spec:654-657`; `e2e:157-159` | ✅ |
| FCLD-12 | Keyboard drop at another index → move of FCLD-05 with that index | `move.spec:187-189` `[{ id: 'b', body: { position: 0 } }]`; `vm.spec:894-911`; `cd.spec:639-653`; `e2e:144-161` reload `['B','C','A']` | ✅ |
| FCLD-13 | Keyboard drop at the picked index → no request | `move.spec:192-205`, `:224-239` → `moves` `[]` | ✅ |
| FCLD-14 | Esc: back to start, "Movimento cancelado", banner hidden, no request, detail stays open | `move.spec:207-222` `'Movimento cancelado'`, order `['A','B','C']`, `moves` `[]`; `item.spec:294-303` Esc does not reach `document.body`; `cd.spec:669-690`; `e2e:165-182` | ✅ |
| FCLD-15 | Focus on the picked grip while moving, after drop and cancel | `cl.spec:564-586` `document.activeElement` is the grip; `cl.spec:588-599`; `cd.spec:658`, `:666` | ✅ |
| FCLD-16 | Closing the detail while picked cancels, no request | `cd.spec:692-707` click **Fechar** → path back to the board, `moves` `[]` | ✅ |
| FCLD-17 | Live region inside the dialog, visually hidden, `role="status"`, `aria-live="assertive"` | `cl.spec:396-407` `'OUTPUT'`, `aria-live` `'assertive'`, `sr-only`; `cl.spec:409-413`; `cd.spec:654-657` | ✅ |

### P1: Failed and blocked moves

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLD-18 | Network/5xx → item back at its old index, toast "Não foi possível salvar. Tente novamente." + **Tentar novamente** resending the same move | `mut.spec:687-706` cache `[itemA,itemB,itemC]` after `500` (the new revert keeps this: M14/M15 run it); `move.spec:378-390` toast text, retry `moves[1]` `toEqual(moves[0])`; `cd.spec:724-748` | ✅ |
| FCLD-19 | `409` → back, "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar** | `move.spec:392-404`; revert is status-independent (`mut.spec:687-706`) | ✅ |
| FCLD-20 | `404` → back, save-fail toast without a button, refetch | `move.spec:406-417` `queryByRole('button')` `null`, `reload` called once | ✅ |
| FCLD-21 | Two moves in flight, one fails → only the failed item goes back; the screen shows the server order: the still-applied moves replayed on the order before the failed move (`A, B, C`: C → 0 fails, A → 2 holds → `B, C, A`, `spec.md:120`) | `mut.spec:768-794` one hook, C → 0 held, A → 2 held, cache `['c0','b1','a2']`, C fails → `expect(order(queryClient)).toEqual(['b0', 'c1', 'a2'])` (`:790`) and one move still `pending` (`:791-793`); M13, M14, M15, M16 killed. `model.spec:240-250` `replayItemMoves(moved(), ['a','b','c'], [{ id:'a', position:2 }])` → `[['b',0],['c',1],['a',2]]` (M17 killed by `:298-310`). Iteration 1 probe re-run: `B, C, A`. **Not covered**: the other move failing too (probe → `C, A, B`, server `A, B, C`; M19 survived) - Fix 4; replay order not discriminated (M18) - Fix 3 | ⚠️ the named case passes; consecutive failures → Fix 4 (+ spec-precision gap) |
| FCLD-22 | Request in flight → grip disabled, no drag | `mut.spec:796-814` move id in `usePendingItemIds`; `vm.spec:873-892`; `move.spec:365-374`; `item.spec:227-245` `aria-disabled` `'true'`; `item.spec:372-378`; `cl.spec:547-559` | ✅ |
| FCLD-23 | While picked: Space on other grips ignored, no mouse drag | `move.spec:351-363` second `start('b')` ignored, `keyboardItemId` stays `'a'`; `item.spec:227-240`; `item.spec:372-378` | ✅ |
| FCLD-24 | Archived-card / archived-board mode → no grip, no draggable row | `item.spec:221-225` `movable: null` → no grip; `cl.spec:601-607`; `cd.spec:709-722` no `[data-item-grip-id]`, no `[draggable]`; `e2e:185-198` count `0` | ✅ |
| FCLD-25 | Loading or load error → no grip | `cl.spec:609-620`; `vm.spec:841-863` | ✅ |

### Edge cases

- [x] One item: `move.spec:224-239`
- [ ] Item with an unsaved text draft moved keeps its draft: no dnd test; drafts are keyed by item id (`use-card-checklist-view-model.ts`); not asserted (minor, not a requirement)
- [x] Move plus a toggle of another item; failure undoes only the move: `mut.spec:725-766`
- [x] Two moves, the first fails, the second holds: `mut.spec:768-794` (new in iteration 2)
- [ ] Two moves, both fail: not tested; probe shows `C, A, B` after both fail when the earlier fails first (Fix 4)
- [x] Card archived elsewhere → `409` path: `move.spec:392-404`
- [x] Item deleted elsewhere → `404` path: `move.spec:406-417`; an item gone from the cache is dropped from the replay: `model.spec:298-323`
- [ ] `401` on a move goes through FND-16, no move toast: no dnd test; `runChange` is the shared notifier
- [x] Settle refetch once after the last pending change: `mut.spec:816-848`

**Status (iteration 2)**: ⚠️ 25/25 ACs evidenced for the cases they name; FCLD-21 has an untested neighbour (both moves fail) with a wrong order and a spec-precision gap. FCLD-01 icon and FCLD-07 colour are now asserted.

---

## Discrimination Sensor

### Iteration 2

Temporary `git worktree add --detach` at `<scratchpad>/verifier-wt` on `05234e5`, with the root, `front-end` and `packages/api-contract` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` command in the worktree). A script checked that each mutant's old text matched exactly once, applied it, ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board` (73 files, **1336** tests, all green unmutated; runner root printed the worktree path), then restored the file with `git checkout --` and checked it matched the original. Paths are relative to `front-end/src/features/board/`.

| # | File:line | Mutation | Killed? (failing tests) |
| - | --------- | -------- | ----------------------- |
| M10 | `components/card-detail-checklist-item.tsx:149` | `<GripVertical …>` → `<X …>` (iteration 1 survivor) | ✅ (`item.spec:204` grip icon and purple outline) |
| M12 | `components/card-detail-checklist-item.tsx:147` | drop `focus-visible:outline-border-focus` | ✅ (`item.spec:204`) |
| M13 | `api/checklist-mutations.ts:178` | replay no later move (`later` → `[]`) | ✅ (`mut.spec:768` FCLD-21) |
| M14 | `api/checklist-mutations.ts:178` | old index revert again: `placeItem(items, id, entry.base.indexOf(id))` | ✅ (`mut.spec:768`) |
| M15 | `api/checklist-mutations.ts:176` | `slice(index + 1)` → `slice(index)` (replays the failed move too) | ✅ (`mut.spec:687`, `:725`, `:768`) |
| M16 | `api/checklist-mutations.ts:159` | log cleared at `<= 2` (another change pending) | ✅ (`mut.spec:768`) |
| M17 | `model/checklist.ts:92` | unknown ids rank `-1` (first) instead of last | ✅ (`model.spec:298`) |
| M18 | `model/checklist.ts:97` | `moves.reduce` → `moves.reduceRight` (later moves replayed newest first) | ❌ Survived → Fix 3 |
| M19 | `api/checklist-mutations.ts:177` | drop `log.current.splice(index, 1)` (a failed move stays in the log) | ❌ Survived → Fix 4 |

**Probes (not mutants)**: throwaway `it` blocks added to the worktree copy of `mut.spec` (deleted with `git checkout --` before cleanup), seed `a0,b1,c2`, C → 0 then A → 2, settle GETs held:

| Probe | Shape | Cache after the failure(s) | Spec / server |
| ----- | ----- | -------------------------- | ------------- |
| P1 | iteration 1 scenario, one hook (production: `use-checklist-move.ts:33` creates one per checklist), C fails | `["b0","c1","a2"]` | `B, C, A` ✅ |
| P2 | both fail, C first then A | `b0,c1,a2` → **`c0,a1,b2`** | server `A, B, C` ❌ (Fix 4) |
| P3 | both fail, A first then C | `c0,a1,b2` → `a0,b1,c2` (with M19: `b0,c1,a2`) | server `A, B, C` ✅ untested |
| P4 | iteration 1 literal shape: two hook instances | `["a0","b1","c2"]` (A's move lost) | the log lives per hook instance (`checklist-mutations.ts:146`); production uses one instance, so this only matters if the section remounts with two moves pending. Note, not a gap |

**Sensor depth**: lightweight-plus (UI feature, not P0; 9 mutants focused on the fix surface: grip icon/outline, the log, the revert, the replay helper)
**Outcome**: 7/9 killed, M18 and M19 survived → ❌
**Isolation**: real-tree `git status --porcelain` empty before and after (diffed against the saved baseline: identical); the worktree's porcelain listed only the three `node_modules` symlinks after each restore; the symlinks were unlinked, then `git worktree remove --force` and `git worktree prune`; `git worktree list` shows only the main tree; `find node_modules front-end/node_modules back-end/node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → 0 broken links; `front-end/node_modules/vitest/vitest.mjs` still resolves. No `git stash`, no `pnpm` in the worktree.

### Iteration 1 (history)

Worktree on `69f8350`, same isolation, 1328 board tests. 10/11 killed.

| # | File:line (on `69f8350`) | Mutation | Killed? |
| - | --------- | -------- | ------- |
| M1 | `model/checklist.ts:51` | `Math.min(count - 1, …)` → `Math.min(count, …)` | ✅ |
| M2 | `model/checklist.ts:59` | drop `target === origin` guard | ✅ |
| M3 | `model/checklist.ts:73` | `splice(index, …)` → `splice(index + 1, …)` | ✅ |
| M4 | `api/checklist-mutations.ts:156` | revert returns `items` (no rollback) | ✅ |
| M5 | `api/checklist-mutations.ts:140` | request body → `{ position: 0 }` | ✅ |
| M6 | `view-models/use-checklist-move.ts:59` | `canDrag` ignores a running session | ✅ |
| M7 | `view-models/use-checklist-move.ts:45` | `{i}` reads `origin` | ✅ |
| M8 | `view-models/use-checklist-move.ts:94` | move sent without `runChange` | ✅ |
| M9 | `components/card-detail-checklist-item.tsx:95` | Esc propagates to the dialog | ✅ |
| M10 | `components/card-detail-checklist-item.tsx:149` | `<GripVertical …>` → `<X …>` | ❌ Survived → Fix 2 (killed in iteration 2) |
| M11 | `components/card-detail-checklist.tsx:66` | refocus effect never refocuses | ✅ |

Probe: two `useMoveChecklistItem` hooks, C → 0 fails, A → 2 held → cache `"bac"`. Fix 1.

---

## Interactive UAT Results

Not performed by the Verifier (out of scope for this pass). Recommended: mouse drag in a real browser and a screen-reader pass of the live region.

---

## Code Quality

Scope: the iteration 2 diff `69f8350..05234e5` (2 `src` files, 3 test files, spec/design).

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ One pure helper `replayItemMoves` (`model/checklist.ts:84-101`, 18 lines) and a per-hook move log (`api/checklist-mutations.ts:146-181`); the old `previous` index is gone |
| Surgical changes | ✅ Only `checklist-mutations.ts` and `model/checklist.ts` in `src`; tests only added (+36 lines in `mut.spec`/`item.spec` assertions, +106 in `model.spec`); the old grip test was renamed and extended, not weakened |
| No scope creep | ✅ Nothing beyond Fixes 1–2 |
| Matches patterns | ✅ Stays inside `useOptimisticBoardViewChange` / `CacheChange` (FE-AD-010); reads `BOARD_VIEW_CHANGE_KEY` with the same "1 means this one" rule as `mutations.ts:412-414`; design.md (`:47`, `:94`, `:169`) updated in the same PR |
| Would a senior engineer approve? | ⚠️ A logged move's `base` (`checklist-mutations.ts:167`) is never rebased after an earlier revert, so a second failure brings a failed move back (Fix 4) |
| Spec-anchored outcome check (asserted values match spec) | ✅ `mut.spec:790` asserts the exact spec order `B, C, A`; `item.spec:211-218` the exact icon and colour classes |
| Per-layer Coverage Expectation met (tasks.md matrix) | ⚠️ model and api rows cover one failure; the replay order and two failures are not discriminated (M18, M19) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ The 7 `replayItemMoves` tests map to FCLD-21 and the design's edge rules (`design.md:94`: dropped ids, unknown items at the end, fields kept, no mutation) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-007, -010), lessons L-011, L-021, L-022 | ✅ L-011: icon identity asserted (`item.spec:214-218`). L-021: the exact two-moves scenario is tested. L-022: the spec states the order. The gap left is the next scenario over (both fail) |

No `// SPEC_DEVIATION` markers in this feature.

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root, branch `test/card-checklist-dnd-grip-icon` = `1027920`, same tree as `05234e5`)
- **Result**: exit 0. Lint (`oxlint --deny-warnings` + "All matched files use Prettier code style!"), `tsc --noEmit` clean, **121 test files, 1778 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 743.44 kB, +0.43 kB vs iteration 1)
- **E2E**: not run locally (stack not started by the Verifier); `e2e/card-checklist-dnd.e2e-spec.ts` is unchanged since `69f8350`. CI on main: run `41474644734` (`7fd5749`, PR #382) job `front-end (test:e2e)` `125376896000` success; run `41475658690` (`05234e5`, PR #383) job `125380414170` success; both runs 12/12 jobs green
- **Test count before feature**: 1669
- **Test count at iteration 1**: 1770
- **Test count after iteration 2**: 1778
- **Delta**: +8 since iteration 1 (7 `replayItemMoves` tests, 1 two-moves test); +109 for the feature; no test removed or weakened
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

| Fix | AC | Kind | Priority | Status |
| --- | -- | ---- | -------- | ------ |
| Fix 1 | FCLD-21 two moves + spec-precision gap | spec + code + test | Minor | ✅ Closed in iteration 2 (`9c0d6bf`, `e03c4ce`, `003ddcd`; `mut.spec:768-794`; M13–M16 killed; probe P1 `B, C, A`) |
| Fix 2 | FCLD-01 icon (M10), FCLD-07 colour | test only | Cosmetic | ✅ Closed in iteration 2 (`1027920`; `item.spec:211-218`; M10, M12 killed) |
| Fix 3 | FCLD-21 replay order (M18) | test only | Cosmetic | ❌ Open |
| Fix 4 | FCLD-21 neighbour: both moves fail (probe P2, M19) + spec-precision gap | spec + code + test | Minor (the settle refetch heals it when the second failure is the last pending change) | ❌ Open |

### Fix 1: A failed move keeps an overlapping move on screen (FCLD-21) - closed

Iteration 1 root cause: the revert re-inserted the failed item at its old index. Landed: the spec defines the order (`spec.md:120`); `apply` logs the move with the order before it, `revert` replays the later moves on that order (`api/checklist-mutations.ts:158-180`, `model/checklist.ts:84-101`); `mut.spec:768-794` asserts `['b0','c1','a2']`.

### Fix 2: Assert the grip icon and the purple outline (FCLD-01, FCLD-07) - closed

Landed: `item.spec:211-218` asserts `focus-visible:outline-border-focus` and `lucide-grip-vertical`. M10 and M12 are killed.

### Fix 3: Make the replay-order test order-sensitive (M18)

- **Root cause**: `model.spec:252-276` replays B → 0 then C → 2 on `A, B, C`; the result `B, A, C` is the same in both orders, so a reversed replay passes.
- **Fix task**:
  - **What**: Change the moves to ones whose order matters, e.g. base `['a','b','c']`, moves `[{ id:'a', position:2 }, { id:'b', position:2 }]` → expect `[['c',0],['a',1],['b',2]]` (reversed gives `c, b, a`).
  - **Where**: `front-end/test/unit/features/board/model/checklist.spec.ts`. Test only.
  - **Verify**: in a scratch copy, `moves.reduce(` → `moves.reduceRight(` at `model/checklist.ts:97`; the test fails. Build gate passes.
  - **Done when**: M18 is killed; test count +0.

### Fix 4: A second failure must not bring back a failed move (FCLD-21 neighbour, M19)

- **Root cause**: each logged move stores `base` once, at apply time (`api/checklist-mutations.ts:167`). When an earlier move fails, its `revert` (`:173-179`) fixes the cache but leaves the later entries' `base` holding the failed move. If a later move then fails, `replayItemMoves(items, entry.base, later)` (`:178`) rebuilds the order from that stale base. Probe P2 (`A, B, C`; C → 0 fails, then A → 2 fails) ends at `C, A, B`; the server holds `A, B, C`. The other order (P3) ends right, but no test runs two failures, so M19 (the failed entry is never removed from the log, `:177`) survives and would give `B, C, A`.
- **Fix task**:
  - **What**: (a) Spec: in FCLD-21, say the screen always shows the order the server holds: after each failure, the order before the oldest logged move with every move still applied replayed in order (both fail → `A, B, C`). (b) Code: in `revert`, after removing the failed entry, rebase the later entries: walk them with `order = entry.base`, set each `later[k].base = order`, then advance `order` by placing `later[k]` on it. (c) Tests in `mut.spec` (`useMoveChecklistItem`): "keeps the server order when both overlapping moves fail", two cases (C fails first, A fails first), settle GET held, each asserting `['a0','b1','c2']` after the second failure.
  - **Where**: `front-end/.specs/features/card-checklist-dnd/spec.md` (FCLD-21), `front-end/src/features/board/api/checklist-mutations.ts`, `front-end/test/unit/features/board/api/checklist-mutations.spec.tsx`.
  - **Verify**: the "C first" test fails on `05234e5` (`c0,a1,b2`); the "A first" test fails with M19 applied; both pass after the fix; `mut.spec:687-706`, `:725-766`, `:768-794` stay green; build gate passes.
  - **Done when**: P2 ends at `A, B, C`; M19 is killed; test count +2.

---

## Requirement Traceability Update

| Requirement | Iteration 1 | Iteration 2 |
| ----------- | ----------- | ----------- |
| FCLD-01 | ❌ Needs Fix (Fix 2) | ✅ Verified |
| FCLD-02..FCLD-06 | ✅ Verified | ✅ Verified |
| FCLD-07 | ✅ Verified (colour nit) | ✅ Verified (colour asserted) |
| FCLD-08..FCLD-20 | ✅ Verified | ✅ Verified |
| FCLD-21 | ❌ Needs Fix (Fix 1) | ❌ Needs Fix (Fixes 3–4; the named one-failure case is verified) |
| FCLD-22..FCLD-25 | ✅ Verified | ✅ Verified |

The Verifier reports only; `spec.md` traceability is left for the author to update.

---

## Summary

**Overall**: ❌ Not Ready (1 small order gap when two overlapping moves both fail + 1 cosmetic test gap). Iteration 2 of 3.

**Spec-anchored check**: 25/25 ACs evidenced for the cases they name; FCLD-01 icon and FCLD-07 colour now asserted; FCLD-21's one-failure order asserted exactly (`B, C, A`); 1 spec-precision gap (FCLD-21 order after a second failure)
**Sensor**: 7/9 killed (M18, M19 survived); probe P1 passes, P2 fails
**Gate**: 1778 unit/component passed, 0 failed, 0 skipped (`05234e5`); e2e green in CI `41474644734` and `41475658690`

**What works**: everything verified in iteration 1, plus: the grip icon and purple outline are pinned by tests; a failed move puts back only its item and keeps a later move where the user dropped it, matching the server order; the replay helper drops deleted items, keeps unknown items last and keeps each item's fields.

**Next steps**: Fix 3 (one small test PR) and Fix 4 (spec decision first, then one code + test PR), then re-verify (iteration 3, the last before escalation).

**Lessons**: iteration 1 candidates L-021 and L-022 were applied and held for the named case. New signal: M18 (test steps whose order does not change the result) and M19/P2 (two failures of overlapping optimistic changes).
