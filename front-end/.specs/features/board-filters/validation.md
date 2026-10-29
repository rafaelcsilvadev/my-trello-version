# Board Filters Validation

**Date**: 2026-10-29
**Spec**: `front-end/.specs/features/board-filters/spec.md`
**Diff range**: `94cda7e..HEAD` (HEAD = `64d842d`). `94cda7e..6545811` is the feature (`94cda7e` = merge of spec PR #272; 47 non-merge commits, T1–T23, PRs up to #295; `src/` 20 files +694/−82, `test/` 20 files +2088/−10). `6545811..64d842d` adds the iteration-1 report (`bd3a18b`, PR #296) and three test-only fix commits: `04115e8` (Fix 1, PR #297), `53d6420` (Fix 2, PR #298), `8c5b66d` (Fix 3, PR #299). `git diff 6545811..HEAD -- front-end/src` is empty.
**Verifier**: independent sub-agent (author ≠ verifier), iteration 2

## Validation: Board Filters - PASS ✅ (iteration 2)

**Result (iteration 2)**: PASS ✅. The three iteration-1 gaps are closed by three new tests, and nothing else changed in `src/` or `test/`. All 42 FBF requirements now have discriminating evidence. The build gate is green on `64d842d`: **1307** unit/component tests (1304 at iteration 1, +3), lint, typecheck and build OK. E2E was not re-run: the fixes are unit tests only and `src/` is byte-identical to the iteration-1 tree, so CI run `40922608069` (20 e2e passed) still stands. The sensor re-applied M31 and M40 and three new mutants (M43, M44 on the label menu outside click, M45 on `clearAll`): **5/5 killed** by the unit suite.

1. **Fix 1 (M40, FBF-28/FBF-25)**: `screen.spec:444-484` reaches "No tasks found" with a search, a checked label and "Overdue", clicks the block's Clear filters, and asserts search `''`, due `'any'`, the button named exactly "Labels", and both cards back. M40 now fails it.
2. **Fix 2 (M31, FBF-08)**: `screen.spec:602-620` picks a card with Space, presses `/`, and asserts focus stays on the card and the move banner is still shown; after Esc, `/` focuses the search field. M31 now fails it.
3. **Fix 3 (FBF-13 outside click)**: `lf.spec:130-141` opens the menu with one label checked, presses on `document.body`, and asserts the menu is gone, `onChange` not called, the button still "Etiquetas · 1". M43 (`isNonModal`) and M44 (`shouldCloseOnInteractOutside={() => false}`) both fail it.

### Iteration 1 verdict (kept for history)

FAIL ❌, two test gaps and one half-asserted AC, no code defect: M40 (no-results Limpar filtros wired to `clearQuery`) and M31 (`/` on during a keyboard move) survived every test, and FBF-13 "click outside" had no test. Fixes 1–3, all test-only.

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-10-29) | `94cda7e..6545811` | ✅ 1304 unit (local), 20 e2e (CI `40922608069`) | 39/42 strong, 3 weak (FBF-08, FBF-13, FBF-28) | 40/42 killed (38 unit + 2 e2e), M31 and M40 survived | ❌ FAIL, Fixes 1–3 |
| 2 (2026-10-29) | `94cda7e..HEAD` (`64d842d`) | ✅ 1307 unit (local); e2e not re-run (test-only fixes, `src/` unchanged) | 42/42 strong | 5/5 killed (M31, M40 re-applied; new M43, M44, M45); 45/45 over both iterations | ✅ PASS, Fixes 1–3 resolved (PRs #297, #298, #299) |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T23 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `53`. T22 "Full gate passes locally and in CI" is checked, and CI run `40922608069` confirms the e2e part. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. Line numbers are re-read on `64d842d`: `screen.spec` moved +1 (import) and +43 after the Fix 1 test, `lf.spec` +13 after the Fix 3 test; every other spec file is unchanged since iteration 1. Short names: `filters.spec` = `unit/features/board/model/filters.spec.ts`; `due.spec` = `unit/features/board/model/due-date.spec.ts`; `bf.spec` = `unit/features/board/view-models/use-board-filters.spec.tsx`; `bm.spec` = `unit/features/board/view-models/use-board-move.spec.tsx`; `vm.spec` = `unit/features/board/view-models/use-board-view-model.spec.tsx`; `search.spec` = `unit/features/board/components/board-search.spec.tsx`; `lf.spec` = `unit/features/board/components/label-filter.spec.tsx`; `tb.spec` = `unit/features/board/components/board-toolbar.spec.tsx`; `sum.spec` = `unit/features/board/components/filter-summary.spec.tsx`; `notice.spec` = `unit/features/board/components/drag-off-notice.spec.tsx`; `nr.spec` = `unit/features/board/components/no-results.spec.tsx`; `tile.spec` = `unit/features/board/components/card-tile.spec.tsx`; `col.spec` = `unit/features/board/components/board-column.spec.tsx`; `cols.spec` = `unit/features/board/components/board-columns.spec.tsx`; `screen.spec` = `unit/features/board/components/board-screen.spec.tsx` (EN); `page.spec` = `unit/pages/board-page.spec.tsx`; `e2e` = `e2e/board-filters.e2e-spec.ts` (EN). "Mx" points to a sensor mutant.

### P1: Search the board

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-01 | Search field, placeholder and name "Buscar no quadro…", first toolbar control | `search.spec:50-60` `placeholder` `toBe('Buscar no quadro…')` (and EN) found by role+name; first in order `tb.spec:73-94` `compareDocumentPosition` chain | ✅ |
| FBF-02 | Only cards whose title or description contains the text, case- and accent-insensitive | `filters.spec:33-46` "LANCAMENTO"/"acao"/"ação"/description-only → `true`; `:69-77` no match → `false` (M1, M2, M4 killed); `vm.spec:1302-1315` columns `[['Doing',['c3']],['Backlog',[]]]`; `e2e:183-195` "ACAO" → `['Planejar ação de lançamento']`, "1 task" | ✅ |
| FBF-03 | Spaces only = every card, as empty | `filters.spec:52-61` `'   '` → `true`; `:211-217` `isFiltering` false with spaces (M3, M13 killed) | ✅ |
| FBF-04 | Clear button "Limpar busca" while the field has text | `search.spec:76-80` none while empty; `:82-94` `getByRole('button',{name:'Limpar busca'})` with text (and EN "Clear search") (M34 killed) | ✅ |
| FBF-05 | Clear empties the search, keeps label and due | `search.spec:82-94` `onClear` called once; `tb.spec:196-212` wired to `onQueryClear`; `bf.spec:70-85` `clearQuery` keeps labels and due (M38 killed) | ✅ |
| FBF-06 | Esc with text empties the field, focus stays | `search.spec:96-106` `onClear` once, `activeElement` `toBe(field)`, parent keydown not called (M32 killed); `:108-114` empty → nothing (M33 killed) | ✅ |
| FBF-07 | `/` moves focus to the search | `search.spec:116-122` `activeElement` `toBe(searchField())` | ✅ |
| FBF-08 | `/` ignored while typing, with a modal, with Ctrl/Meta/Alt, **during a keyboard move** | Typing `search.spec:132-140`; Ctrl `:142-148`; Meta/Alt/modal in the shared hook `unit/shared/keyboard/use-shortcut.spec.tsx:50`, `:82-95`; prop off `search.spec:124-130`; keyboard move on the real screen `screen.spec:611` `document.activeElement` `toBe(card('Write the brief'))` after Space then `/`, `:612` banner `/^Moving “Write the brief”/` still shown, `:617-619` after Esc `/` focuses the "Search this board…" textbox (M31 killed, iteration 2) | ✅ (Fix 2) |

### P1: Filter by label

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-09 | "Etiquetas" button opens a menu, each label a `menuitemcheckbox` with name and color | `lf.spec:55-62` text `toBe('Etiquetas')`; `:73-93` items text `['Bug','Urgente','Docs']`, `aria-checked`, `.bg-label-red` dot (M42 killed) | ✅ |
| FBF-10 | Only cards with at least one checked label | `filters.spec:133-162` one label and OR of two (M5 killed); `lf.spec:95-115` `onChange` `[bug.id, docs.id]`; `e2e:197-211` Docs+Chore → 3 exact titles, "3 tasks" | ✅ |
| FBF-11 | "Etiquetas · {n}", soft variant | `lf.spec:64-71` text `'Etiquetas · 2'`, `bg-(--purple-50)`, `text-purple-700` (M35 killed); `unit/shared/ui/button.spec.tsx:107-119`; `vm.spec:1378-1392` `selectedLabelCount` (M18 killed) | ✅ |
| FBF-12 | Uncheck all → every card, "Etiquetas" | `lf.spec:112-113` uncheck → `[docs.id]`; `:55-62` no selection → "Etiquetas", secondary; empty `labelIds` → `filters.spec:129-131` | ✅ |
| FBF-13 | Esc **or click outside** closes the menu, keeps the checks | Esc: `lf.spec:117-128` menu `null`, `onChange` not called, button still "Etiquetas · 1". Click outside: `lf.spec:135-136` press on `document.body`, `:138` `queryByRole('menu')` `toBeNull()`, `:139` `onChange` `not.toHaveBeenCalled()`, `:140` button "Etiquetas · 1" (M43, M44 killed, iteration 2) | ✅ (Fix 3) |
| FBF-14 | No labels → "Nenhuma etiqueta ainda" | `lf.spec:143-150` menu `textContent` `toBe('Nenhuma etiqueta ainda')`; `:152-164` EN | ✅ |
| FBF-15 | Deleted checked label ignored for filtering and for {n} | `filters.spec:164-177`, `:214` (M6 killed); `vm.spec:1378-1392` count 1 then 0, `isFiltering` false, 3 cards (M18 killed) | ✅ |

### P1: Filter by due date

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-16 | Select "Prazo", five options in order, "Qualquer prazo" on open | `tb.spec:96-132` options `toEqual([...])` PT-BR and EN; `:134-143` `value` `'any'`, option selected; `unit/shared/ui/select.spec.tsx:19-80` | ✅ |
| FBF-17 | Atrasadas: not done, due before today | `filters.spec:115-127` `'overdue'` → `['overdue']` only (not overdueDone, today, tomorrow) (M7 killed); `e2e:214-222` exact titles | ✅ |
| FBF-18 | Vencem hoje: due today, done or not | `due.spec:167-184`; `filters.spec:118` `['today','todayDone']` (M10, M11 killed); `e2e:224-229` `['Write notes','Run tests']`, "2 tasks" | ✅ |
| FBF-19 | Sem prazo: no due date | `filters.spec:119` `['none','doneWithoutDate']` (M8 killed) | ✅ |
| FBF-20 | Concluídas: marked done | `filters.spec:120` `['overdueDone','todayDone','doneWithoutDate']` (M9 killed) | ✅ |
| FBF-21 | Qualquer prazo stops due filtering | `filters.spec:116` `'any'` → every card; `tb.spec:168-177` `onDueChange('any')`; `filters.spec:212` not filtering (M14 killed) | ✅ |

### P1: Filtered board view

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-22 | Search AND label AND due | `filters.spec:179-207` each part breaks the match (M12 killed) | ✅ |
| FBF-23 | Only active cards of active columns; "Arquivadas" and archived section unfiltered | `vm.spec:1356-1376` `matchCount` 0, archived cards `['c8','c7']`, columns `['l4','l3']` | ✅ |
| FBF-24 | "{n} tarefas" / "1 tarefa" in `role="status"` + Limpar filtros, while filtering | `sum.spec:22-30` `'0 tarefas'`, `'1 tarefa'`, `'3 tarefas'` from `getByRole('status')` (M36 killed); `tb.spec:179-194` hidden / shown (M37 killed); `screen.spec:403` "1 task" | ✅ |
| FBF-25 | Limpar filtros empties search, labels, due; keeps "Mostrar arquivadas" | `bf.spec:87-98` (M39 killed); `vm.spec:1317-1334` filters `toEqual({query:'',labelIds:[],due:'any'})`; `tb.spec:186-194` wiring; `e2e:274-298` search `''`, "Labels", due `'any'`, switch still checked (M41 killed by e2e) | ✅ |
| FBF-26 | Column header counts its matching cards | `col.spec:193-197` counter `'2'`; `:179-184` `'0'`; `filters.spec:250-275`; `vm.spec:1302-1315` | ✅ |
| FBF-27 | Empty filtered column: no cards, no "Arraste cards para cá" | `col.spec:179-191`; `cols.spec:267-277` (M27 killed) | ✅ |
| FBF-28 | No match, ≥1 column → columns area (incl. "+ Adicionar coluna", archived views) replaced by "Nenhuma tarefa encontrada" + **Limpar filtros** | `screen.spec:420-442` `:428` `board-columns` testid `null`, `:429` "Add column" `null`, its Clear filters restores; `:486-497` no columns → empty block (M29 killed); `nr.spec:22-49`. Block's button clears all three (FBF-25): `screen.spec:444-484` label "Bug" + "Overdue" + search → block → its Clear filters → `:469` "No tasks found" `null`, `:471-473` both cards back, `:478` search `toBe('')`, `:482` due `toBe('any')`, `:483` button named exactly "Labels" (M40, M45 killed, iteration 2) | ✅ (Fix 1) |
| FBF-29 | Change makes a card match/unmatch → shown/hidden and counts updated at once | `vm.spec:1394-1417` done toggle under Concluídas → `['c3']`, count 1, rollback → `[]`, 0; `:1419-1441` the reverse (live `useMemo` over `preview`, M15, M16 killed) | ✅ |

### P1: Drag off while filtering

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-30 | Notice "Arrastar fica desativado enquanto há filtros" below the toolbar on an active board | `notice.spec:22-35` exact PT-BR/EN `textContent`; `screen.spec:404` shown while filtering, `:415` gone after clear | ✅ |
| FBF-31 | No mouse drag of card or column header | `tile.spec:406-420` `draggable` `'false'`, `onDragStart`/`setData` not called (M24, M25 killed); `cols.spec:366-376` no `[data-column-id]`, no `[draggable="true"]` (M26 killed); `bm.spec:183-197` `start` ignored (M22 killed); `vm.spec:1317-1334` `canDrag` false (M17 killed); `e2e:233-255` drag sends nothing | ✅ |
| FBF-32 | Space on a card or header does not pick | `tile.spec:422-429` `onPick` not called (M23 killed); `cols.spec:366-372` no "Espaço para mover" header; `bm.spec:183-197` keyboard `start` ignored | ✅ |
| FBF-33 | Keyboard help line hidden | `screen.spec:405` `queryByText(keyboardHelp)` `null`, `:416` back after clear (M30 killed) | ✅ |
| FBF-34 | "Mover para…" kept on every active card | `tile.spec:431-439`, `cols.spec:378-385` `onMoveTo('c1')`; `bm.spec:712-729` body `{listId, position: 2}` on the full column; `e2e:257-271` real move, 1 request | ✅ |
| FBF-35 | Clearing brings drag, pick and the help back, hides notice | `screen.spec:412-417` notice `null`, help shown, card `draggable` `'true'`; `vm.spec:1317-1334` `canDrag` true | ✅ |
| FBF-36 | Archived board: filters usable, no notice | `screen.spec:499-513` filtered, "1 task", notice `null` (M28 killed); `vm.spec:1336-1354` | ✅ |

### P1: Reset and shortcut `n`

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-37 | Open (incl. board → board) → empty search, no label, "Qualquer prazo", "Mostrar arquivadas" off | `page.spec:68-86` next board search `''`; `page.spec:52-66` switch off after navigate (pre-existing); `bf.spec:100-112` remount empty; `e2e:300-324` leave and reopen: search `''`, "Labels", `'any'`, summary hidden | ✅ |
| FBF-38 | `n` while filtering clears all, then opens the field in the first active column | `vm.spec:920-940` filters `toEqual(NO_FILTERS)`, `addingCardListId` `doing.id`, first column has its card (M20 killed) | ✅ |
| FBF-39 | "+ Adicionar tarefa" kept in every active column | `screen.spec:407-409` "Add task" in Doing while filtering | ✅ |

### P1: Toolbar layout and accessibility

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBF-40 | Order search, Etiquetas, Prazo, switch, count, Limpar filtros, inside `role="search"` | `tb.spec:73-94` all six inside `<search>`, `DOCUMENT_POSITION_FOLLOWING` chain; `e2e:288-290` `getByRole('search')` in Chromium | ✅ |
| FBF-41 | Below `md`: full-width search, no `/` hint | `search.spec:150-160` `hidden md:inline`, `w-full md:w-65`; `e2e:326-343` at 375 px field width ≈ toolbar, `/` hidden, no overflow | ✅ |
| FBF-42 | Every text from i18n in PT-BR and EN | EN/PT-BR pairs: `search.spec:50-94`, `lf.spec:152-164`, `tb.spec:96-132`, `sum.spec:32-39`, `notice.spec:22-35`, `nr.spec:22-41` | ✅ |

**Status**: ✅ 42/42 strong (iteration 2; iteration 1 had 3 weak: FBF-08, FBF-13, FBF-28). No spec-precision gaps: every FBF text, option, role and rule is precise in the spec.

---

## Discrimination Sensor

**Iteration 1.** Temporary `git worktree` at `<scratchpad>/sensor` on `6545811`, with the root and `front-end` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). Each mutant ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board test/unit/pages/board-page.spec.tsx test/unit/shared/ui` (69 files, 967 tests, all green unmutated), and the file was restored before the next one. Paths are relative to `front-end/src/features/board/`.

| # | File:line | Mutation | Killed? (failing specs) |
| - | --------- | -------- | ----------------------- |
| M1 | `model/filters.ts:25` | accents kept (no mark strip) | ✅ (filters) |
| M2 | `model/filters.ts:26` | case kept (no `toLowerCase`) | ✅ (filters, vm) |
| M3 | `model/filters.ts:33` | query not trimmed | ✅ (filters) |
| M4 | `model/filters.ts:35` | description ignored | ✅ (filters) |
| M5 | `model/filters.ts:86` | labels OR → AND (`some` → `every`) | ✅ (filters) |
| M6 | `model/filters.ts:44` | unknown label ids kept | ✅ (filters, vm) |
| M7 | `model/filters.ts:56` | Atrasadas = any due date not done | ✅ (filters) |
| M8 | `model/filters.ts:60` | Sem prazo excludes done cards | ✅ (filters) |
| M9 | `model/filters.ts:62` | Concluídas requires a due date | ✅ (filters, vm) |
| M10 | `model/due-date.ts:58` | due today `=== 0` → `<= 0` | ✅ (due, filters) |
| M11 | `model/due-date.ts:57` | due today excludes done | ✅ (due, filters) |
| M12 | `model/filters.ts:85` | query AND → OR | ✅ (filters, vm, screen) |
| M13 | `model/filters.ts:71` | spaces-only query counts as filtering | ✅ (filters) |
| M14 | `model/filters.ts:73` | due filter not counted as filtering | ✅ (filters, vm) |
| M15 | `model/filters.ts:103` | `matchCount` counts columns | ✅ (filters, vm, screen) |
| M16 | `model/filters.ts:104` | empty columns dropped | ✅ (filters, vm, screen) |
| M17 | `view-models/use-board-view-model.ts:138` | `canDrag = canMove` (drag on while filtering) | ✅ (vm, screen) |
| M18 | `view-models/use-board-view-model.ts:158` | `selectedLabelCount` counts deleted labels | ✅ (vm) |
| M19 | `view-models/use-board-view-model.ts:166` | filter change keeps the keyboard move | ✅ (vm) |
| M20 | `view-models/use-board-view-model.ts:261` | `n` keeps the filters | ✅ (vm) |
| M21 | `view-models/use-board-view-model.ts:154` | filter uses `today + 1 day`, not the board's `today` | ⚠️ unit survived; ✅ killed by `e2e:214-229` (exact titles for Overdue and Due today), CI `40922608069` |
| M22 | `view-models/use-board-move.ts:153` | `start` ignores `canDrag` | ✅ (bm) |
| M23 | `components/card-tile.tsx:82` | Space picks while drag is off | ✅ (tile) |
| M24 | `components/card-tile.tsx:99` | `dragstart` runs while drag is off | ✅ (tile) |
| M25 | `components/card-tile.tsx:113` | card draggable while drag is off | ✅ (tile, cols, screen) |
| M26 | `components/board-columns.tsx:207` | header handle while drag is off | ✅ (cols, screen) |
| M27 | `components/board-column.tsx:267` | drop hint in a filtered empty column | ✅ (col, cols) |
| M28 | `components/board-screen.tsx:80` | notice on an archived board | ✅ (screen) |
| M29 | `components/board-screen.tsx:44` | no-results on a board without columns | ✅ (screen) |
| M30 | `components/board-screen.tsx:129` | help line shown while filtering | ✅ (screen) |
| M31 | `components/board-screen.tsx:70` | `/` enabled during a keyboard move | ❌ **Survived** → Fix 2 (killed in iteration 2) |
| M32 | `components/board-search.tsx:33` | search Esc bubbles to the board | ✅ (search) |
| M33 | `components/board-search.tsx:32` | Esc clears an empty field | ✅ (search) |
| M34 | `components/board-search.tsx:49` | clear button always shown | ✅ (search) |
| M35 | `components/label-filter.tsx:28` | no soft variant with a selection | ✅ (lf) |
| M36 | `components/filter-summary.tsx:19` | `0` reads "1 tarefa" | ✅ (sum) |
| M37 | `components/board-toolbar.tsx:86` | count and Limpar filtros always shown | ✅ (tb) |
| M38 | `view-models/use-board-filters.ts:27` | `clearQuery` clears all | ✅ (bf) |
| M39 | `view-models/use-board-filters.ts:32` | `clearAll` keeps labels and due | ✅ (bf, vm) |
| M40 | `components/board-screen.tsx:84` | no-results Limpar filtros → `clearQuery` | ❌ **Survived** → Fix 1 (killed in iteration 2) |
| M41 | `view-models/use-board-view-model.ts:350` | Limpar filtros also turns "Mostrar arquivadas" off | ⚠️ unit survived; ✅ killed by `e2e:295` `toBeChecked()` after Clear filters, CI `40922608069` |
| M42 | `components/label-filter.tsx:43` | single-select label menu | ✅ (lf) |

**Sensor depth**: expanded lightweight (UI feature, not P0; 42 mutants over model, view models and components)
**Outcome (iteration 1)**: 40/42 killed (38 by the unit suite, M21 and M41 by the CI e2e by inspection), 2 survived (M31, M40) → ❌
**Isolation (iteration 1)**: real-tree `git status --porcelain` was empty before and after; the worktree held only the two symlinks after the last restore; worktree removed and pruned; `find front-end/node_modules node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → no broken symlinks; `front-end/node_modules/vitest/vitest.mjs` still resolves.

**Iteration 2.** Temporary `git worktree` at `/tmp/bf-sensor` on `64d842d` (detached), with the root and `front-end` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). Each mutant was applied to a copy-backed file, ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board test/unit/pages/board-page.spec.tsx test/unit/shared/ui` (69 files, **970** tests, all green unmutated), and the file was restored before the next one.

| # | File:line | Mutation | Killed? (failing tests) |
| - | --------- | -------- | ----------------------- |
| M31 (re-applied) | `components/board-screen.tsx:70` | `isSearchShortcutEnabled={!keyboardSession}` → `{true}` | ✅ 1 failed: `screen.spec` "ignores / during a keyboard move and focuses the search once it ends" |
| M40 (re-applied) | `components/board-screen.tsx:84` | `<NoResults onClear={actions.filters.clearAll} />` → `clearQuery` | ✅ 1 failed: `screen.spec` "resets the search, the labels and the due date from the No tasks found Clear filters" |
| M43 (new) | `components/label-filter.tsx:35` | `isNonModal` on the label menu `Popover` (no underlay, no outside dismiss) | ✅ 1 failed: `lf.spec` "closes the menu on a click outside and keeps the checked labels (FBF-13)"; the Esc test still passes |
| M44 (new) | `components/label-filter.tsx:35` | `shouldCloseOnInteractOutside={() => false}` on the `Popover` | ✅ 1 failed: same `lf.spec` outside-click test |
| M45 (new) | `view-models/use-board-filters.ts:32` | `clearAll` keeps the due filter: `setFilters((current) => ({ ...NO_FILTERS, due: current.due }))` | ✅ 4 failed: `bf.spec` "clears all three filters", `vm.spec` "turns dragging off while filtering and back on after clearAll", `vm.spec` "clears every filter and opens the field in the first active column", `screen.spec` no-results Clear filters test |

**Outcome (iteration 2)**: 5/5 killed by the unit suite → ✅. Over both iterations: 45/45 mutants killed (43 by the unit suite, M21 and M41 by the CI e2e).
**Isolation (iteration 2)**: real-tree `git status --porcelain` was empty before and after (diffed against the saved baseline: identical); the worktree's porcelain after the last restore listed only the two `node_modules` symlinks; `git worktree remove --force /tmp/bf-sensor` and `git worktree prune` ran, `git worktree list` shows only the main tree; `find node_modules front-end/node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → 0 broken links; `front-end/node_modules/vitest/vitest.mjs` still resolves. No `git stash` used.

---

## Interactive UAT Results

Not performed; the orchestrator decides.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ One pure model file (`filters.ts`, 105 lines), one state hook, one `isDueToday`, six small components, one shared `Select`, one button variant; no request added |
| Surgical changes | ✅ Fix commits touch only `board-screen.spec.tsx` (+63) and `label-filter.spec.tsx` (+13). Outside the feature: `soft` variant (`shared/ui/button.tsx`, one line), new `shared/ui/select.tsx` (design), `LabelChip` extracted from `CardTile` with no behavior change (`label-chip.spec.tsx`, `card-tile.spec.tsx` unchanged) |
| No scope creep | ✅ No URL state, no server search, no sorting, no shortcuts-dialog row (all out of scope) |
| Matches patterns | ✅ `useShortcut` for `/` (FE-AD-011); `useBoardMove` keeps the full columns, so "Mover para…" positions stay right (design risk, `bm.spec:712-729`); texts in both locales (FE-AD-004); tests mirror `src/` (FE-AD-007) |
| Spec-anchored outcome check (asserted values match spec) | ✅ Texts, options, roles, counts and filter sets asserted exactly |
| Per-layer Coverage Expectation met (tasks.md matrix) | ✅ Model 1:1 with every listed edge; view model covers every action; the screen now asserts both derived props that iteration 1 missed (`isSearchShortcutEnabled`, no-results `onClear`) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Spot-checked `filters.spec`, `vm.spec` filters block, `tb.spec`: each test cites an FBF AC, an edge case or a T-task Done-when (e.g. `filters.spec:63-67` inner spaces kept → T5). The three iteration-2 tests map to FBF-28/FBF-25, FBF-08 and FBF-13 |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004, -006, -007, -009, -010, -011, -012) | ✅ |

Two `// SPEC_DEVIATION` markers, both from the design, not the spec: `label-filter.tsx:39-41` (menu named by its trigger, not `aria-label="Etiquetas"`; the name follows the button, asserted at `lf.spec:79`) and `label-filter.tsx:63-65` (drawn check box instead of the shared `Checkbox`, to avoid a second focusable inside a `menuitemcheckbox`). Both keep every FBF outcome.

---

## Edge Cases

- [x] Board without columns: toolbar usable, empty block instead of no-results: `screen.spec:486-497` (M29 killed)
- [x] "Mostrar arquivadas" on + filter: archived views unfiltered: `vm.spec:1356-1376`; replaced when nothing matches (FBF-28): `screen.spec:428` `board-columns` gone
- [ ] Created card that does not match leaves the view: no direct test; the same live `useMemo` over `preview` is proven by the done toggle (`vm.spec:1394-1441`, M15/M16). Adequate by composition, noted only
- [x] Done toggle fails under "Concluídas" → rollback brings the card back: `vm.spec:1419-1441`
- [x] Labels query fails → board load error (FBV-10): shared path, unchanged
- [x] Checked label deleted elsewhere stops filtering: `vm.spec:1378-1392`, `filters.spec:164-177`
- [x] "acao" matches "Ação": `filters.spec:35`

---

## Gate Check

**Iteration 2**

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root, on `64d842d`)
- **Result**: exit 0. Lint (`oxlint --deny-warnings` + Prettier "All matched files use Prettier code style!"), `tsc --noEmit` clean, **101 test files, 1307 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 706.22 kB, unchanged)
- **E2E**: not re-run. The fixes add unit tests only and `git diff 6545811..HEAD -- front-end/src` is empty, so the iteration-1 CI result (run `40922608069`, 20 passed) covers the same `src/`
- **Test count before feature**: 1153
- **Test count at iteration 1**: 1304
- **Test count at iteration 2**: 1307
- **Delta**: +154 over the feature (+3 since iteration 1: Fix 1, Fix 2, Fix 3); 0 removed (the fix diffs add lines only)
- **Skipped tests**: none
- **Failures**: none

**Iteration 1**

- **Gate command**: same, on `6545811`
- **Result**: exit 0. Lint, typecheck clean, **101 test files, 1304 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 706 kB, 697 kB after board-dnd, +9 kB)
- **E2E (CI, not run locally)**: run `40922608069` on `2139863` (main, PR #294), conclusion success, all 12 jobs green; job `front-end (test:e2e)` (`123619584851`): "Running 20 tests using 2 workers", **20 passed (1.1m)**. Board-dnd PASS had 13, so +7: the seven `board-filters.e2e-spec.ts` journeys. `2139863..6545811` is docs only
- **Test count before feature**: 1153 (1151 at board-dnd PASS + 2 tests from the refetch fix `9738627`, before `94cda7e`)
- **Delta**: +151 new tests; 0 removed

---

## Observations (non-blocking)

1. M21 (wrong `today` in the view model) is caught only by the e2e, which runs on the real clock. A unit test in `vm.spec` with a due-today card and `due: 'today'` would catch it in the fast loop. Optional follow-up; Fixes 1–3 did not add it.
2. M41 ("Mostrar arquivadas" kept by Limpar filtros) is caught only by the e2e (`e2e:295`). Same note.
3. The board's `today` is read once on open; a board left open past midnight keeps yesterday's "Vencem hoje" (accepted in design, same as due labels).

---

## Fix Plans

All three fixes from iteration 1 are resolved; no new fix is needed.

| Fix | AC | PR / commit | Evidence | Status |
| --- | -- | ----------- | -------- | ------ |
| Fix 1 | FBF-28, FBF-25 (M40) | PR #297, `04115e8` | `screen.spec:444-484`; M40 and M45 killed | ✅ Resolved |
| Fix 2 | FBF-08 (M31) | PR #298, `53d6420` | `screen.spec:602-620`; M31 killed | ✅ Resolved |
| Fix 3 | FBF-13 (outside click) | PR #299, `8c5b66d` | `lf.spec:130-141`; M43 and M44 killed | ✅ Resolved |

### Fix 1: The no-results Limpar filtros clears every filter (FBF-28, FBF-25) - M40 - ✅ Resolved (PR #297)

- **Root cause**: `screen.spec:419-441` reaches "No tasks found" with a search only, so a button wired to `clearQuery` (`board-screen.tsx:84`) behaves the same. The e2e FBF-25 journey clicks the toolbar button (`getByRole('search')`), not the block's.
- **Fix task**:
  - **What**: In the no-results test (or a new one next to it), reach "No tasks found" with a search **and** a label and/or due filter (e.g. pick "Overdue" in the "Due date" select, then search). After the block's Clear filters: search `''`, "Due date" select value `'any'`, "Labels" button without a count, every card back.
  - **Where**: `front-end/test/unit/features/board/components/board-screen.spec.tsx` (`filters` block, near `:419-441`). Test only.
  - **Verify**: In a scratch copy, set `<NoResults onClear={actions.filters.clearQuery} />`; the test fails. Build gate passes.
  - **Done when**: M40 is killed; test count grows by 0 or 1.
- **Priority**: Major (a Limpar filtros that leaves the board filtered breaks FBF-25/28 with no test to catch it)

### Fix 2: `/` does nothing during a keyboard move (FBF-08) - M31 - ✅ Resolved (PR #298)

- **Root cause**: `BoardSearch` is tested with `isShortcutEnabled={false}` (`search.spec:124-130`), but nothing tests that `BoardScreen` passes `!keyboardSession` (`board-screen.tsx:70`).
- **Fix task**:
  - **What**: In `screen.spec`, pick a card with Space (keyboard move), press `/` on `document.body` or the card, and assert focus stays on the card (not the "Search this board…" field) and the move banner is still shown. Then end the move (Esc) and assert `/` focuses the field.
  - **Where**: `front-end/test/unit/features/board/components/board-screen.spec.tsx` (`filters` or `moves` block). Test only.
  - **Verify**: In a scratch copy, set `isSearchShortcutEnabled` always true; the test fails. Build gate passes.
  - **Done when**: M31 is killed; test count grows by 1.
- **Priority**: Minor

### Fix 3: Click outside closes the label menu and keeps the checks (FBF-13) - ✅ Resolved (PR #299)

- **Root cause**: `lf.spec:117-128` covers Esc only; the outside-click half of FBF-13 has no evidence (React Aria behavior, but the AC names it).
- **Fix task**:
  - **What**: Open the menu with one label checked, click outside (e.g. `userEvent.click(document.body)` or an outside element), assert the `menu` is gone, `onChange` not called, and the button still reads "Etiquetas · 1".
  - **Where**: `front-end/test/unit/features/board/components/label-filter.spec.tsx` (next to `:117-128`). Test only.
  - **Verify**: The test passes on the real component; in a scratch copy with `isDismissable={false}` on the `Popover` (or `shouldCloseOnInteractOutside={() => false}`), it fails.
  - **Done when**: FBF-13 has evidence for both halves; test count grows by 1.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Iteration 1 | Iteration 2 |
| ----------- | ----------- | ----------- |
| FBF-01 – FBF-07, FBF-09 – FBF-12, FBF-14 – FBF-27, FBF-29 – FBF-42 | ✅ Verified | ✅ Verified |
| FBF-08 | ❌ Needs Fix (Fix 2) | ✅ Verified |
| FBF-13 | ❌ Needs Fix (Fix 3) | ✅ Verified |
| FBF-28 | ❌ Needs Fix (Fix 1) | ✅ Verified |

The Requirement Traceability table in `spec.md` still reads "Pending" for every FBF; iteration 1 did not change it, and this verifier leaves it to the orchestrator.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 42/42 ACs matched the spec outcome with discriminating assertions; 0 spec-precision gaps
**Sensor**: iteration 2: 5/5 killed (M31, M40, M43, M44, M45); over both iterations 45/45 (43 unit, 2 e2e)
**Gate**: 1307 unit/component passed, 0 failed, 0 skipped (`64d842d`); 20 e2e passed in CI `40922608069` (same `src/`)

**What works**: accent- and case-insensitive search over title and description with trimmed input; OR label filter that ignores deleted labels; five due options on the board's `today`; AND of all three; live filtering over the move preview with counts; drag and pick off while filtering with "Mover para…" kept on full columns; notice, no-results, help line and archived-board rules; reset on open; `n` clears first. Iteration 2 adds proof that the no-results Limpar filtros clears all three filters, that `/` stays off during a keyboard move, and that a click outside closes the label menu and keeps the checks.

**Issues found**: none. Observations 1–3 stay non-blocking (M21 and M41 are caught only by the e2e).

**Next steps**: mark `board-filters` done; optionally set the `spec.md` traceability rows to Verified.
