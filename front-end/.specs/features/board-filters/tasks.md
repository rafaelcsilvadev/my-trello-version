# Board Filters Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/board-filters/spec.md`
**Design**: `front-end/.specs/features/board-filters/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `board.toolbar.*` to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js` and the design's i18n table, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). MSW fixtures extend `front-end/test/support/fixtures/board.ts`. Dates in tests are fixed through the `today` the view model reads (`todayParts`), never the machine clock.

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-011, FE-AD-012, the approved design and the spec; existing tests sampled for style: `test/unit/features/board/model/due-date.spec.ts`, `test/unit/features/board/model/move.spec.ts`, `test/unit/features/board/view-models/use-board-move.spec.tsx`, `test/unit/features/board/view-models/use-board-view-model.spec.tsx`, `test/unit/features/board/components/card-tile.spec.tsx`, `test/unit/features/board/components/board-column.spec.tsx`, `test/unit/shared/ui/button.spec.tsx`, `test/unit/shared/ui/menu.spec.tsx`, `test/e2e/board-dnd.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-007) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `shared/ui` | unit (Testing Library) | Role, accessible name, every variant/option, change callback | `front-end/test/unit/shared/ui/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/model/` | unit | All branches; 1:1 to the filter ACs; every edge (accents, case, spaces only, null description, unknown label id, done vs overdue, today boundary, empty column, no match) | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + MSW) | Every action and derived value; drag gate on and off; filter change cancels a running session; `n` clears first; reset by remount | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; screen with MSW) | Every AC the component owns: roles, names, texts in PT-BR, key handling, callbacks, visibility rules, read-only variant | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Search with accents, label filter, due filter, drag off with "Mover para…" still working, Limpar filtros, reset on reopen, toolbar at 375 px | `front-end/test/e2e/board-filters.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
| Docs | none | Build gate | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Inner TDD loop only | `pnpm --filter front-end test` |
| Build | End of every task (lint and types count) | `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` |
| Full | Tasks that touch e2e | build gate `&& pnpm --filter front-end test:e2e` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. One task per branch/PR (pair-programming flow), each PR reviewed before the next task starts.

### Phase 1: Shared pieces and filter model

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Filter state and drag gate

```
T7 → T8 → T9 → T10 → T11
```

### Phase 3: Toolbar and board views

```
T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 4: Wiring and delivery

```
T20 → T21 → T22 → T23
```

---

## Task Breakdown

### T1: Extract the label chip

**What**: Move `LABEL_CLASSES` and the chip markup from `CardTile` into a `LabelChip({ label })` component; `CardTile` renders it. No behavior change.
**Where**: `front-end/src/features/board/components/label-chip.tsx`
**Depends on**: None
**Reuses**: `card-tile.tsx:21-32`, `:131-143`
**Requirement**: none (enables FBF-09)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`, `safe-refactor`

**Done when**:

- [x] Unit: `LabelChip` renders the name, the chip class and the dot class for each of the 10 colors
- [x] `card-tile.spec.tsx` passes unchanged
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `refactor(front-end): extract the board label chip`

---

### T2: Soft button variant

**What**: `Button` gains `variant="soft"` with the Púrpura `.p-btn--soft` colors.
**Where**: `front-end/src/shared/ui/button.tsx`
**Depends on**: T1
**Reuses**: Existing `variants` map
**Requirement**: none (enables FBF-11)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `soft` renders `bg-(--purple-50)` and `text-purple-700`; other variants unchanged
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the soft button variant`

---

### T3: Native select

**What**: `Select({ label, value, options, onChange })`: a native `<select>` with `aria-label={label}`, styled as Púrpura `.p-select--md`.
**Where**: `front-end/src/shared/ui/select.tsx`
**Depends on**: T2
**Reuses**: `design/_ds/.../css/components.css:50-58`
**Requirement**: none (enables FBF-16)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: combobox named by `label`; renders every option in order; shows `value` as selected; choosing an option calls `onChange` with its value
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add a native select to the shared UI`

---

### T4: Due today rule

**What**: `isDueToday(card, today)` next to `isOverdue`.
**Where**: `front-end/src/features/board/model/due-date.ts`
**Depends on**: T3
**Reuses**: `parseDateOnly`, `daysBetween`
**Requirement**: FBF-18

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: true for today (done or not); false for yesterday, tomorrow, the same day in another month or year, and `null`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): tell whether a card is due today`

---

### T5: Search text matching

**What**: `normalizeText(value)` and the query part of matching: `matchesQuery(card, query)` (trimmed; empty or spaces-only matches every card; title or description; case- and accent-insensitive).
**Where**: `front-end/src/features/board/model/filters.ts`
**Depends on**: T4
**Reuses**: `Card` from `model/types.ts`
**Requirement**: FBF-02, FBF-03

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: "LANCAMENTO" matches "Lançamento"; "acao" matches "Ação"; match in description only; `null` description matches by title only; spaces-only and empty match everything; surrounding spaces ignored; no match returns false
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): match board cards by search text`

---

### T6: Label and due matching

**What**: `BoardFilters`, `DueFilter`, `NO_FILTERS`, `isFiltering(filters, labelIds)` and `matchesCard(card, filters, labelIds, today)` combining query, labels (any of the selected, unknown ids ignored) and due.
**Where**: `front-end/src/features/board/model/filters.ts`
**Depends on**: T5
**Reuses**: `matchesQuery`, `isOverdue`, `isDueToday`
**Requirement**: FBF-10, FBF-15, FBF-17, FBF-18, FBF-19, FBF-20, FBF-21, FBF-22

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: each due option against a card set (overdue not done, overdue done, today done and not, tomorrow, none, done without date); one label and two labels (OR); unknown selected id ignored; all three combined (AND); `isFiltering` false for `NO_FILTERS`, spaces-only query and only unknown label ids, true for each single active filter
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): match board cards by label and due date`

---

### T7: Filter the columns

**What**: `filterColumns(columns, filters, labelIds, today)` returns every column with only its matching cards (order kept) and `matchCount`.
**Where**: `front-end/src/features/board/model/filters.ts`
**Depends on**: T6
**Reuses**: `matchesCard`, `Column`
**Requirement**: FBF-22, FBF-23, FBF-26

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: columns kept in order, empty ones included; cards keep their order; `matchCount` sums all columns; no match → every column empty and `matchCount` 0; no columns → `[]` and 0
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): filter the board columns`

---

### T8: Filter state hook

**What**: `useBoardFilters()` with `filters`, `setQuery`, `setLabelIds`, `setDue`, `clearQuery` and `clearAll`, starting at `NO_FILTERS`.
**Where**: `front-end/src/features/board/view-models/use-board-filters.ts`
**Depends on**: T7
**Reuses**: `NO_FILTERS`
**Requirement**: FBF-05, FBF-25, FBF-37

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: starts empty; each setter changes only its field; `clearQuery` keeps labels and due; `clearAll` resets all three; a remount starts empty again
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): hold the board filter state`

---

### T9: Drag gate in the move hook

**What**: `BoardMoveOptions.canDrag`; `start` does nothing while it is false; `askMoveTo` and `moveTo` keep using `canMove`.
**Where**: `front-end/src/features/board/view-models/use-board-move.ts`
**Depends on**: T8
**Reuses**: Existing guards in `start`
**Requirement**: FBF-31, FBF-32, FBF-34

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: with `canDrag` false a mouse or keyboard `start` leaves `session` null and announces nothing; "Mover para…" still opens and sends the move with the full column length; with `canDrag` true every existing test passes
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): let the board turn dragging off`

---

### T10: Filters in the board view model

**What**: `useBoardViewModel` composes `useBoardFilters`: `isFiltering`, `canDrag = canMove && !isFiltering`, visible columns from `filterColumns(preview.columns)`, `matchCount`, `selectedLabelCount` (existing labels only), the board label list, and filter actions that cancel a running move session first.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T9
**Reuses**: `useBoardFilters`, `filterColumns`, `isFiltering`, `labelsById`, `today`
**Requirement**: FBF-11, FBF-15, FBF-22, FBF-23, FBF-26, FBF-29, FBF-36

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): a query hides non-matching cards and sets `matchCount`; `canDrag` false while filtering and true after `clearAll`; read-only board filters with `canDrag` false; archived cards and columns unaffected; a done toggle under "Concluídas" shows the card at once and the rollback after a failure hides it again; `selectedLabelCount` ignores a deleted label; a filter change during a keyboard session cancels it
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): filter the board view model`

---

### T11: Shortcut `n` clears filters

**What**: The `n` handler calls `clearAll` and opens the field in the first column of the unfiltered columns.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T10
**Reuses**: Existing `useShortcut('n', …)`
**Requirement**: FBF-38

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: with a filter that leaves the first column empty, `n` clears every filter and sets `addingCardListId` to the first active column; without filters behavior unchanged
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): clear board filters on the new card shortcut`

---

### T12: Search field

**What**: `BoardSearch({ value, isShortcutEnabled, onChange, onClear })`: input with placeholder and name "Buscar no quadro…", clear button "Limpar busca" while it has text, Esc clears, `/` focuses through `useShortcut`, `/` hint from `md`, full width below `md`.
**Where**: `front-end/src/features/board/components/board-search.tsx`
**Depends on**: T11
**Reuses**: `useShortcut`, `lucide-react` `Search`, `X`
**Requirement**: FBF-01, FBF-04, FBF-05, FBF-06, FBF-07, FBF-08, FBF-41

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: name and placeholder; typing calls `onChange`; clear button hidden while empty, shown with text and calls `onClear`; Esc with text calls `onClear`, keeps focus and does not bubble; Esc while empty does nothing; `/` focuses the field; `/` ignored with `isShortcutEnabled` false, inside another input and with Ctrl held; hint has `hidden md:inline`; field has `w-full md:w-65`
- [x] i18n keys `search`, `clearSearch` in both locales
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the board search field`

---

### T13: Label filter menu

**What**: `LabelFilter({ labels, selectedIds, selectedCount, onChange })`: Etiquetas button (soft with a count) and a multi-select React Aria menu of label chips; empty board shows "Nenhuma etiqueta ainda".
**Where**: `front-end/src/features/board/components/label-filter.tsx`
**Depends on**: T12
**Reuses**: `Button` `soft`, `LabelChip`, `Checkbox`, `ActionMenu` popover classes
**Requirement**: FBF-09, FBF-11, FBF-12, FBF-13, FBF-14

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: button "Etiquetas" with no selection, "Etiquetas · 2" with two; menu items are `menuitemcheckbox` with name and `aria-checked`; clicking an item calls `onChange` with the new id list and the menu stays open; Esc closes the menu; no labels → "Nenhuma etiqueta ainda"
- [x] i18n keys `labels`, `labelsCount`, `noLabels` in both locales
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the board label filter`

---

### T14: Result summary

**What**: `FilterSummary({ matchCount, onClear })`: count in `role="status"` and a Limpar filtros ghost button.
**Where**: `front-end/src/features/board/components/filter-summary.tsx`
**Depends on**: T13
**Reuses**: `Button` `ghost` `sm`, `lucide-react` `X`
**Requirement**: FBF-24, FBF-25

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: "0 tarefas", "1 tarefa", "3 tarefas" in a status element; button calls `onClear`
- [x] i18n keys `oneCard`, `cards`, `clearFilters` in both locales
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): show the board filter result count`

---

### T15: Drag-off notice

**What**: `DragOffNotice()`: info icon and "Arrastar fica desativado enquanto há filtros".
**Where**: `front-end/src/features/board/components/drag-off-notice.tsx`
**Depends on**: T14
**Reuses**: `KeyboardHelp` layout classes, `lucide-react` `Info`
**Requirement**: FBF-30

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: renders the text; icon is `aria-hidden`
- [x] i18n key `dragOff` in both locales
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the drag-off notice`

---

### T16: No results block

**What**: `NoResults({ onClear })`: search-x icon, "Nenhuma tarefa encontrada" and a Limpar filtros secondary button.
**Where**: `front-end/src/features/board/components/no-results.tsx`
**Depends on**: T15
**Reuses**: `Button` `secondary` `sm`, `lucide-react` `SearchX`
**Requirement**: FBF-28

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: renders the text; button "Limpar filtros" calls `onClear`
- [x] i18n key `noResults` in both locales
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the board no-results block`

---

### T17: Board toolbar

**What**: `BoardToolbar` becomes the `role="search"` row: `BoardSearch`, `LabelFilter`, due `Select` "Prazo" with the five options, "Mostrar arquivadas", and `FilterSummary` while filtering.
**Where**: `front-end/src/features/board/components/board-toolbar.tsx`
**Depends on**: T16
**Reuses**: T12-T14 components, `Select`, `Switch`
**Requirement**: FBF-16, FBF-21, FBF-24, FBF-40

**Tools**:

- MCP: NONE
- Skill: `pair-programming`, `react-composition-patterns`

**Done when**:

- [x] Unit: `role="search"` holds the controls in spec order; "Prazo" lists Qualquer prazo, Atrasadas, Vencem hoje, Sem prazo, Concluídas with the current value selected; choosing one calls the due callback; summary shown only while `isFiltering`; switch unchanged
- [x] i18n keys `due`, `dueAny`, `dueOverdue`, `dueToday`, `dueNone`, `dueDone` in both locales
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add search and filters to the board toolbar`

---

### T18: Card drag gate

**What**: `CardMove.canDrag`: while false the card keeps `role`, focus and the "Mover para…" menu, is not `draggable`, ignores `dragstart` and Space does not pick.
**Where**: `front-end/src/features/board/components/card-tile.tsx`
**Depends on**: T17
**Reuses**: Existing `movable` handling
**Requirement**: FBF-31, FBF-32, FBF-34

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: with `canDrag` false: `draggable` false, `dragstart` does not call `onDragStart`, Space does not call `onPick`, card still focusable, menu still offers "Mover para…" and calls `onMoveTo`; with `canDrag` true every existing test passes
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): keep a card menu while its drag is off`

---

### T19: Column under a filter

**What**: `BoardColumn` `isFiltered`: an empty column shows no "Arraste cards para cá"; the counter shows the cards it receives.
**Where**: `front-end/src/features/board/components/board-column.tsx`
**Depends on**: T18
**Reuses**: Existing empty-column branch (`board-column.tsx:263`)
**Requirement**: FBF-26, FBF-27

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: filtered and empty → no drop hint and counter 0; not filtered and empty → hint as before; filtered with two cards → counter 2
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): hide the drop hint in a filtered column`

---

### T20: Columns drag gate

**What**: `BoardColumnsMove.canDrag`: while false no column gets a `ColumnMove` (header not a handle) and each card gets `canDrag` false; `isFiltered` passes down to every `BoardColumn`.
**Where**: `front-end/src/features/board/components/board-columns.tsx`
**Depends on**: T19
**Reuses**: `columnMove`, `cardMove`
**Requirement**: FBF-31, FBF-32, FBF-34

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: with `canDrag` false no header has the "Espaço para mover" name or `draggable`, cards are not draggable and keep "Mover para…"; `isFiltered` hides the hint in an empty column; with `canDrag` true existing tests pass
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): turn off board drag while filtering`

---

### T21: Board screen wiring

**What**: `BoardScreen` passes the toolbar props, shows `DragOffNotice` while filtering on an active board, replaces `BoardColumns` with `NoResults` when filtering finds nothing on a board with columns, hides `KeyboardHelp` while drag is off, and enables `/` only without a keyboard session.
**Where**: `front-end/src/features/board/components/board-screen.tsx`
**Depends on**: T20
**Reuses**: All components above
**Requirement**: FBF-28, FBF-30, FBF-33, FBF-35, FBF-36, FBF-37, FBF-39

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (screen + MSW): typing a search shows only matching cards, the count, the notice, and hides the help line; no match shows "Nenhuma tarefa encontrada" and its Limpar filtros restores the board; board without columns shows the empty-board block, not no-results; archived board filters without the notice; "+ Adicionar tarefa" stays while filtering; remounting the screen (new `boardId` key) starts unfiltered with "Mostrar arquivadas" off; clearing brings back drag and the help line
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): wire search and filters into the board screen`

---

### T22: End-to-end filters

**What**: Playwright journey on the real API: search without accents, label filter with two labels, "Atrasadas" and "Vencem hoje", drag off while "Mover para…" still moves a card, Limpar filtros, reset after leaving and reopening, toolbar at 375 px.
**Where**: `front-end/test/e2e/board-filters.e2e-spec.ts`
**Depends on**: T21
**Reuses**: `test/e2e/board-dnd.e2e-spec.ts` sign-up and board setup
**Requirement**: FBF-02, FBF-10, FBF-17, FBF-18, FBF-25, FBF-31, FBF-34, FBF-37, FBF-41

**Tools**:

- MCP: `claude-in-chrome` (manual check of the toolbar visuals)
- Skill: `pair-programming`, `playwright-skill`

**Done when**:

- [ ] E2E: each journey passes against the API started by `docker compose`
- [ ] Full gate passes locally and in CI

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover board search and filters end to end`

---

### T23: Docs and roadmap

**What**: README section on searching and filtering a board; ROADMAP marks 3c `board-filters` Done; Handoff updated.
**Where**: `README.md` (+ `front-end/.specs/ROADMAP.md`, `front-end/.specs/STATE.md`)
**Depends on**: T22
**Reuses**: Board docs section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains search, label and due filters, the `/` shortcut and why drag is off
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document board search and filters`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11
Phase 3:  T12 → T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20
Phase 4:  T21 → T22 → T23
```

Execution is strictly sequential. Each task is its own branch and PR (pair-programming), reviewed before the next starts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 component (extracted) | ✅ |
| T2 | 1 variant | ✅ |
| T3 | 1 component | ✅ |
| T4 | 1 function | ✅ |
| T5 | 2 related functions, one file | ⚠️ Cohesive (normalize is only used by the query match) |
| T6 | Types + 2 functions, one file | ⚠️ Cohesive (`isFiltering` and `matchesCard` share the same rules) |
| T7 | 1 function | ✅ |
| T8 | 1 hook | ✅ |
| T9 | 1 option of one hook | ✅ |
| T10 | 1 composition | ✅ |
| T11 | 1 handler | ✅ |
| T12-T16 | 1 component each | ✅ |
| T17 | 1 component composition | ✅ |
| T18 | 1 concern of `CardTile` | ✅ |
| T19 | 1 concern of `BoardColumn` | ✅ |
| T20 | 1 concern of `BoardColumns` | ✅ |
| T21 | 1 screen wiring | ✅ |
| T22 | 1 e2e file | ✅ |
| T23 | Docs | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | Phase 1 → Phase 2 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | Phase 2 → Phase 3 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | Phase 3 → Phase 4 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `features/board/components/` | unit | unit | ✅ |
| T2, T3 | `shared/ui` | unit | unit | ✅ |
| T4-T7 | `features/board/model/` | unit | unit | ✅ |
| T8-T11 | `features/board/view-models/` | unit | unit | ✅ |
| T12-T21 | `features/board/components/` | unit | unit | ✅ |
| T22 | Running app | e2e | e2e | ✅ |
| T23 | Docs | none | none | ✅ |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FBF-01 | T12 |
| FBF-02 | T5, T22 |
| FBF-03 | T5 |
| FBF-04 | T12 |
| FBF-05 | T8, T12 |
| FBF-06 | T12 |
| FBF-07 | T12 |
| FBF-08 | T12 |
| FBF-09 | T13 |
| FBF-10 | T6, T22 |
| FBF-11 | T10, T13 |
| FBF-12 | T13 |
| FBF-13 | T13 |
| FBF-14 | T13 |
| FBF-15 | T6, T10 |
| FBF-16 | T17 |
| FBF-17 | T6, T22 |
| FBF-18 | T4, T6, T22 |
| FBF-19 | T6 |
| FBF-20 | T6 |
| FBF-21 | T6, T17 |
| FBF-22 | T6, T7, T10 |
| FBF-23 | T7, T10 |
| FBF-24 | T14, T17 |
| FBF-25 | T8, T14, T22 |
| FBF-26 | T7, T10, T19 |
| FBF-27 | T19 |
| FBF-28 | T16, T21 |
| FBF-29 | T10 |
| FBF-30 | T15, T21 |
| FBF-31 | T9, T18, T20, T22 |
| FBF-32 | T9, T18, T20 |
| FBF-33 | T21 |
| FBF-34 | T9, T18, T20, T22 |
| FBF-35 | T21 |
| FBF-36 | T10, T21 |
| FBF-37 | T8, T21, T22 |
| FBF-38 | T11 |
| FBF-39 | T21 |
| FBF-40 | T17 |
| FBF-41 | T12, T22 |
| FBF-42 | T12-T17 (keys in both locales per task) |
