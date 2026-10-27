# Board Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/board/spec.md`
**Design**: `front-end/.specs/features/board/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js`, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). Optimistic hooks follow FE-AD-009 and FE-AD-010; shortcuts follow FE-AD-011. MSW fixtures for the seed boards (doc §15) live in `front-end/test/support/fixtures/board.ts`, created by the first task that needs them (T14) and extended later.

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-009, FE-AD-010, FE-AD-011, the approved design and the spec; existing tests sampled for style: `test/unit/features/boards/api/mutations.spec.tsx`, `test/unit/features/boards/view-models/use-boards-view-model.spec.tsx`, `test/unit/features/boards/components/boards-screen.spec.tsx`, `test/unit/features/boards/components/board-card.spec.tsx`, `test/unit/features/boards/model/validation.spec.ts`, `test/unit/shared/ui/menu.spec.tsx`, `test/e2e/boards.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005 to FE-AD-011) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `shared/ui`, `shared/keyboard`, `shared/api/save-failure`, `shared/i18n/format-date` | unit (Testing Library, plain props; `renderHook`) | Every prop branch; ARIA roles (`checkbox`, `switch`); keyboard (Space, Esc, Enter); every guard of `useShortcut`; both locales for dates; every failure kind of the notifier | `front-end/test/unit/shared/**/*.spec.ts(x)` | `pnpm --filter front-end test` |
| `features/board/model/` | unit | All branches; 1:1 to spec ACs; boundaries 0/1/100/101 characters; spaces-only; date boundaries and `TZ=America/Sao_Paulo`; counts 0/1/2 | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` hooks | unit (`renderHook` + MSW + `QueryClient` wrapper) | Request path, query and body; cache patched before the response; per-item revert on failure with an overlapping change still pending; invalidation only after the last pending change; pending ids | `front-end/test/unit/features/board/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + MSW) | Every action; every failure kind → toast text and action; retry resends the same variables; status derivation; shortcut enabled/disabled | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; screen with MSW) | Every AC the component owns, happy + error + edge cases | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| `pages/` and route table | unit (`renderApp` + memory router + MSW) | `/b/{id}` renders the screen; breadcrumb only on board routes; state reset between boards | `front-end/test/unit/pages/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | One journey over columns, cards, done, archived items; one phone-width check of the pager | `front-end/test/e2e/board.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Shared groundwork

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Board model

```
T7 → T8 → T9 → T10 → T11 → T12 → T13
```

### Phase 3: Board API

```
T13 → T14 → T15 → T16 → T17 → T18 → T19
```

### Phase 4: Board view model

```
T19 → T20 → T21 → T22 → T23
```

### Phase 5: Card and column views

```
T23 → T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31
```

### Phase 6: Board chrome and states

```
T31 → T32 → T33 → T34 → T35 → T36 → T37
```

### Phase 7: Screen, page and route

```
T37 → T38 → T39 → T40 → T41 → T42
```

### Phase 8: Delivery

```
T42 → T43 → T44
```

---

## Task Breakdown

### T1: Move save-failure mapping to shared

**What**: Move `saveFailureKind` and `SaveFailureKind` from `boards` to `shared/api/save-failure.ts` and repoint `boards`; behavior unchanged.
**Where**: `front-end/src/shared/api/save-failure.ts`
**Depends on**: None
**Reuses**: `src/features/boards/model/errors.ts:43`, `model/types.ts:18`
**Requirement**: none (enables FBV-53–FBV-57)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: the existing `saveFailureKind` cases move to `test/unit/shared/api/save-failure.spec.ts` unchanged (401, 404, 409, 400 with/without `errors`, 0, 5xx)
- [x] `boards` imports the shared module; its tests pass unchanged
- [x] Build gate passes; test count unchanged

**Tests**: unit
**Gate**: build

**Commit**: `refactor(front-end): move save failure mapping to shared`

---

### T2: Extract the save-failure notifier

**What**: `useSaveFailureNotifier(reload)` returning `{ notify(err, retry), runChange(mutateAsync, variables, successMessage) }` with the doc §10 toasts; `useBoardsViewModel` uses it.
**Where**: `front-end/src/shared/ui/toast/use-save-failure-notifier.ts`
**Depends on**: T1
**Reuses**: `use-boards-view-model.ts:100-140`
**Requirement**: none (enables FBV-53–FBV-55)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: each failure kind → toast text and action (Tentar novamente resends, Recarregar calls `reload`, 404 toasts without button and calls `reload`, 401 shows nothing); `runChange` toasts the success message
- [x] `boards` view-model tests pass unchanged
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `refactor(front-end): extract save failure notifier to shared`

---

### T3: Button ghost variant and small size

**What**: Add `variant="ghost"` (prototype `tl-ghost-btn`) and `size="sm"` to `Button`.
**Where**: `front-end/src/shared/ui/button.tsx`
**Depends on**: T2
**Reuses**: Existing `variants`/`sizes` maps; `design/Task List.dc.html` `tl-ghost-btn`
**Requirement**: none (enables FBV-24, FBV-39, FBV-44)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `ghost` and `sm` render their classes; existing variants and sizes unchanged
- [x] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add ghost variant and small size to button`

---

### T4: Checkbox primitive

**What**: `Checkbox({ label, isSelected, onChange, isDisabled })` over RAC `Checkbox`, label visually hidden, Púrpura checkbox look.
**Where**: `front-end/src/shared/ui/checkbox.tsx`
**Depends on**: T3
**Reuses**: RAC `Checkbox`; `design/_ds` checkbox styles
**Requirement**: none (enables FBV-31, FBV-43, FBV-45)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: role `checkbox` with the accessible name; checked state; click and Space call `onChange` with the new value; disabled blocks both
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add checkbox primitive`

---

### T5: Switch primitive

**What**: `Switch({ label, isSelected, onChange })` over RAC `Switch` with a visible label.
**Where**: `front-end/src/shared/ui/switch.tsx`
**Depends on**: T4
**Reuses**: RAC `Switch`; `design/_ds` switch styles
**Requirement**: none (enables FBV-33)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: role `switch` with the label; on/off state; click and Space toggle
- [x] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add switch primitive`

---

### T6: useShortcut hook

**What**: `useShortcut(key, handler, { enabled })` listening on `document` with the FE-AD-011 guards.
**Where**: `front-end/src/shared/keyboard/use-shortcut.ts`
**Depends on**: T5
**Reuses**: FE-AD-011
**Requirement**: none (enables FBV-30, FBV-46)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: the key calls the handler; ignored with Ctrl/Meta/Alt, inside `input`/`textarea`/`select`/`[contenteditable]`, while `[aria-modal="true"]` exists, and when `enabled` is false; the listener is removed on unmount
- [x] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add keyboard shortcut hook`

---

### T7: Day-month date format

**What**: `formatDayMonth(parts, t, currentYear)` → "12 out" / "Oct 12", with ", 2027" when the year differs; keys `dates.dayMonth`, `dates.dayMonthYear`.
**Where**: `front-end/src/shared/i18n/format-date.ts` (+ locales)
**Depends on**: T6
**Reuses**: `formatShortDate`, `dates.months.*`
**Requirement**: none (enables FBV-05)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: both locales, same year and other year, January and December
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add day-month date format`

---

### T8: Board types and field validation

**What**: `model/types.ts` (contract aliases, `Column`, `ArchivedCardItem`, `ArchivedColumnItem`, `DateParts`, `ItemFieldError`) and `validateColumnName` / `validateCardTitle`.
**Where**: `front-end/src/features/board/model/validation.ts` (+ `types.ts`)
**Depends on**: T7
**Reuses**: `features/boards/model/validation.ts` trim rules
**Requirement**: FBV-15, FBV-16, FBV-26, FBV-27

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: 0, 1, 100, 101 characters after trim; spaces-only is required; leading/trailing spaces do not count
- [x] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board field validation`

---

### T9: Title server-error mapping

**What**: `mapTitleServerError(err, raw, kind)` for `400` with an `errors[]` entry on `title`.
**Where**: `front-end/src/features/board/model/errors.ts`
**Depends on**: T8
**Reuses**: `features/boards/model/errors.ts` `mapBoardServerErrors`
**Requirement**: FBV-57

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: column and card kinds; empty trimmed text → required, else too long; no `title` entry, non-400 or no `errors` → `null`
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): map board title server errors`

---

### T10: Due-date rules

**What**: `parseDateOnly`, `todayParts`, `dueLabel`, `isOverdue` (design `model/due-date.ts`).
**Where**: `front-end/src/features/board/model/due-date.ts`
**Depends on**: T9
**Reuses**: Design Risks (UTC shift)
**Requirement**: FBV-05, FBV-06, FBV-08

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: today/tomorrow/yesterday/other date, month and year boundaries; overdue only when not done and before today; due today is not overdue; `parseDateOnly` gives the same day under `TZ=America/Sao_Paulo`
- [x] Build gate passes; ≥ 9 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add card due-date rules`

---

### T11: Active columns mapper

**What**: `toColumns(lists, cards)`: lists by `position`, cards grouped by `listId` and sorted by `position`; empty list for a column without cards.
**Where**: `front-end/src/features/board/model/columns.ts`
**Depends on**: T10
**Reuses**: Seed data doc §15
**Requirement**: FBV-02, FBV-03

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: order of lists and cards from unordered input; cards of unknown lists dropped; empty column
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): map board lists and cards to columns`

---

### T12: Archived items mappers

**What**: `toArchivedCards`, `toArchivedColumns`, `deleteMessageKey` (design `model/columns.ts`, kept in `model/archived.ts`).
**Where**: `front-end/src/features/board/model/archived.ts`
**Depends on**: T11
**Reuses**: Design Data Models
**Requirement**: FBV-35, FBV-37, FBV-40

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `fromTitle` from active and archived lists; newest `archivedAt` first; `cardCount` = active + archived, `undefined` while loading; message key for 0, 1, 2
- [x] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): map archived cards and columns`

---

### T13: Pager index math

**What**: `visibleIndex(scrollLeft, columnWidth, gap, count)` → index of the column in view, clamped to `[0, count-1]`.
**Where**: `front-end/src/features/board/model/pager.ts`
**Depends on**: T12
**Reuses**: none
**Requirement**: FBV-49

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: start, middle, past half a column, end, overscroll, count 0
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): compute visible column index`

---

### T14: Board query keys and queries

**What**: `boardViewKeys` and `useBoard`, `useLists`, `useCards`, `useLabels` with the `archived` flag and `enabled` option.
**Where**: `front-end/src/features/board/api/queries.ts` (+ `keys.ts`)
**Depends on**: T13
**Reuses**: `features/boards/api/queries.ts`
**Requirement**: FBV-01, FBV-02, FBV-03, FBV-35, FBV-37

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): each hook calls its path; `archived: true` sends `?archived=true`, false sends no query; disabled hooks send nothing; `404` surfaces as `ApiError` status 404
- [x] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board view queries`

---

### T15: Archived column counts

**What**: `useArchivedListCounts(boardId, lists, enabled)` with `useQueries` over `GET /lists/{id}/cards`, returning `Map<listId, number | undefined>`.
**Where**: `front-end/src/features/board/api/archived-counts.ts`
**Depends on**: T14
**Reuses**: `useQueries`; `boardViewKeys.listCards`
**Requirement**: FBV-37

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): one request per archived list; counts map; `undefined` while pending; none when disabled
- [x] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): count cards of archived columns`

---

### T16: Create list and card mutations

**What**: `useCreateList(boardId)` and `useCreateCard(boardId)`: not optimistic; on success append the response to `lists(false)` / `cards(false)`, then invalidate.
**Where**: `front-end/src/features/board/api/create-mutations.ts`
**Depends on**: T15
**Reuses**: `useCreateBoard`
**Requirement**: FBV-14, FBV-25

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): request path and body; cache untouched until `201`; item appended at the end after success; failure leaves the cache as it was
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add create list and card mutations`

---

### T17: Optimistic change helper and rename

**What**: `useOptimisticBoardViewChange` (FE-AD-010 apply/revert), `BOARD_VIEW_CHANGE_KEY`, `usePendingItemIds`, and `useRenameList`.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: T16
**Reuses**: `features/boards/api/mutations.ts:120-161`
**Requirement**: FBV-19, FBV-52, FBV-58

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): rename patches the title before the response; failure restores only that list's title while a second pending rename of another list stays; invalidation only after the last pending change; pending ids during flight
- [ ] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add optimistic board change helper and list rename`

---

### T18: Archive, restore and delete list mutations

**What**: `useArchiveList`, `useRestoreList`, `useDeleteList` with the apply/revert pairs of the design table.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: T17
**Reuses**: T17 helper
**Requirement**: FBV-22, FBV-39, FBV-41, FBV-52

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): each request path; archive moves the list to `lists(true)` when cached; restore appends to `lists(false)`; delete drops the list and its archived cards; each revert re-inserts at the old index
- [ ] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add archive, restore and delete list mutations`

---

### T19: Done toggle and board restore mutations

**What**: `useToggleCardDone` (`PATCH /cards/{id}` `{ done }`) and `useRestoreBoard` (`POST /boards/{id}/unarchive`).
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: T18
**Reuses**: T17 helper
**Requirement**: FBV-31, FBV-47, FBV-52

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): body `{ "done": true }`; card patched before the response and reverted on failure; board `archivedAt` set to null and reverted on failure
- [ ] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add card done and board restore mutations`

---

### T20: View model: load status and columns

**What**: `useBoardViewModel(boardId)` state `status`, `board`, `readOnly`, `columns`, `labelsById`, `today`, action `retryLoad`.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T19
**Reuses**: `use-boards-view-model.ts`
**Requirement**: FBV-02, FBV-03, FBV-09, FBV-10, FBV-11, FBV-44

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): `loading` → `ready` with columns; any 404 → `notFound`; 500 → `error` and `retryLoad` refetches only failed queries; archived board → `readOnly`
- [ ] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board view model load state`

---

### T21: View model: column actions

**What**: `createList`, `startRename`, `submitRename`, `cancelRename`, `archiveList`, with toasts and failure notifications.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T20
**Reuses**: T2 notifier; T8, T9
**Requirement**: FBV-14, FBV-15, FBV-16, FBV-19, FBV-20, FBV-21, FBV-22, FBV-53, FBV-54, FBV-55, FBV-56, FBV-57

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): create success toast "Coluna criada" and resolves `null`; invalid name sends nothing; `400` returns the field error with no toast; `500` on create toasts with retry resending the same title; unchanged rename sends nothing; rename/archive success toasts; `409`/`404`/`500` on archive → the three toasts
- [ ] Build gate passes; ≥ 10 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add column actions to board view model`

---

### T22: View model: card actions and shortcut

**What**: `openAddCard`, `closeAddCard`, `createCard`, `toggleDone`, and the `n` shortcut.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T21
**Reuses**: T6 `useShortcut`
**Requirement**: FBV-24, FBV-25, FBV-26, FBV-27, FBV-28, FBV-30, FBV-31, FBV-46, FBV-56

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): create toasts "Tarefa criada"; invalid title sends nothing; toggle sends `{ done }`; `n` opens the first column; `n` ignored on an archived board and on a board with no columns; done failure → notifier
- [ ] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add card actions to board view model`

---

### T23: View model: archived items and board restore

**What**: `setShowArchived`, `archived` state, `restoreList`, `askDeleteList`, `confirmDeleteList`, `cancelDelete`, `restoreBoard`.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T22
**Reuses**: T12, T15, T18, T19
**Requirement**: FBV-33, FBV-35, FBV-37, FBV-39, FBV-40, FBV-41, FBV-42, FBV-47

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): toggle off on mount and archived queries only after it turns on; restore toast "Coluna restaurada"; delete asks first and toasts "Coluna excluída definitivamente"; cancel sends nothing; restore board toast "Quadro restaurado" and `readOnly` false
- [ ] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add archived items to board view model`

---

### T24: Card tile

**What**: `CardTile({ card, labels, today, mode: "active" | "archived", fromTitle?, isPending, isReadOnly, onToggleDone })`.
**Where**: `front-end/src/features/board/components/card-tile.tsx`
**Depends on**: T23
**Reuses**: T4 `Checkbox`, T7, T10; prototype `Task List.dc.html:412-427, 464-473`
**Requirement**: FBV-04, FBV-05, FBV-06, FBV-07, FBV-08, FBV-31, FBV-35, FBV-43, FBV-45

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: label chips with name and `bg-label-{color}`; due label and "Atrasada"; checklist "2/3" in success color when complete; done style; checkbox calls `onToggleDone`; archived mode shows "Arquivada em … · de: …" and a disabled checkbox; read-only disables the checkbox
- [ ] Build gate passes; ≥ 9 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board card tile`

---

### T25: Inline create field

**What**: `InlineCreateField({ label, placeholder, isPending, onSubmit(raw) → Promise<ItemFieldError | null>, onClose })`: Enter submits, Esc closes, error under the field, clears and keeps focus on success.
**Where**: `front-end/src/features/board/components/inline-create-field.tsx`
**Depends on**: T24
**Reuses**: `inputClasses`; prototype `:442-447, 504-508`
**Requirement**: FBV-14, FBV-15, FBV-17, FBV-25, FBV-26, FBV-28, FBV-29, FBV-56

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: Enter calls `onSubmit` with the raw text; error result shows the message and keeps the text; success clears and keeps focus; Esc calls `onClose`; submit disabled and text kept while pending
- [ ] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add inline create field`

---

### T26: Column rename field

**What**: `ColumnRenameField({ initial, onSubmit(raw) → ItemFieldError | null, onCancel })`: Enter and blur submit, Esc cancels, stays open on error.
**Where**: `front-end/src/features/board/components/column-rename-field.tsx`
**Depends on**: T25
**Reuses**: prototype `:388, 408`
**Requirement**: FBV-19, FBV-20, FBV-21

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: Enter and blur submit; Esc cancels without submit; error keeps the field open with the message
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add column rename field`

---

### T27: Board column

**What**: `BoardColumn`: `<section aria-label>`, header (name button or rename field, counter, menu Renomear/Arquivar), cards or "Arraste cards para cá", "+ Adicionar tarefa".
**Where**: `front-end/src/features/board/components/board-column.tsx`
**Depends on**: T26
**Reuses**: T3, T24–T26, `ActionMenu`; prototype `:385-452`
**Requirement**: FBV-03, FBV-18, FBV-22, FBV-23, FBV-24, FBV-32, FBV-45, FBV-58

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: counter equals card count; click on the name and menu Renomear open the field; menu has exactly Renomear and Arquivar; empty text; add-card opens the field; read-only hides menu and add and makes the name plain text; pending disables the menu
- [ ] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board column`

---

### T28: Add column

**What**: `AddColumn({ isEmptyBoard, isPending, onSubmit })`: "+ Adicionar coluna" opening the field; empty-board block "Adicione a primeira coluna" with the field open.
**Where**: `front-end/src/features/board/components/add-column.tsx`
**Depends on**: T27
**Reuses**: T25; prototype `:359-372, 499-510`
**Requirement**: FBV-13, FBV-14

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: button opens the field; empty-board variant shows the title and the open field; submit forwards the text
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add column creation control`

---

### T29: Archived cards column

**What**: `ArchivedCardsColumn({ items, status, onRetry, ... })`: dashed virtual column with archive icon and count, read-only tiles, empty and load-error states.
**Where**: `front-end/src/features/board/components/archived-cards-column.tsx`
**Depends on**: T28
**Reuses**: T24 archived mode; `LoadError`; prototype `:455-477`
**Requirement**: FBV-34, FBV-35, FBV-36, FBV-43

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: title "Arquivadas" with count; tiles in given order with "de: …"; "Nenhuma tarefa arquivada"; no menu or create field; error shows retry
- [ ] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add archived cards column`

---

### T30: Archived columns section

**What**: `ArchivedColumnsSection({ items, status, isReadOnly, pendingIds, onRestore, onDelete, onRetry })`.
**Where**: `front-end/src/features/board/components/archived-columns-section.tsx`
**Depends on**: T29
**Reuses**: T3; prototype `:478-496`
**Requirement**: FBV-37, FBV-38, FBV-39

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: "Arquivada em 2 out, 2026 · 3 tarefas" (and "1 tarefa"); "Nenhuma coluna arquivada"; Restaurar and Excluir definitivamente call back; hidden on a read-only board; pending disables them
- [ ] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add archived columns section`

---

### T31: Delete column dialog

**What**: `DeleteColumnDialog({ list, cardCount, onConfirm, onCancel })` as `alertdialog` with the count-based text.
**Where**: `front-end/src/features/board/components/delete-column-dialog.tsx`
**Depends on**: T30
**Reuses**: `Dialog`, danger `Button`; `delete-board-dialog.tsx`
**Requirement**: FBV-40, FBV-41, FBV-42

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: text for 0, 1 and 3 cards; confirm calls `onConfirm`; cancel and Esc call `onCancel`
- [ ] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add delete column dialog`

---

### T32: Board header

**What**: `BoardHeader({ board })`: title, description, board menu with "Etiquetas do quadro" link; phone back arrow "Voltar".
**Where**: `front-end/src/features/board/components/board-header.tsx`
**Depends on**: T31
**Reuses**: `ActionMenu` (link item); prototype `:300-316`
**Requirement**: FBV-01, FBV-51

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: title; description only when not null; menu item links to `/b/{id}/labels`; back link "Voltar" to `/boards`
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board header`

---

### T33: Archived board banner

**What**: `ArchivedBoardBanner({ isPending, onRestore })`, `role="status"`.
**Where**: `front-end/src/features/board/components/archived-board-banner.tsx`
**Depends on**: T32
**Reuses**: T3; prototype `:317-322`
**Requirement**: FBV-44, FBV-47

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: text "Quadro arquivado · somente leitura"; Restaurar calls back; disabled while pending
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add archived board banner`

---

### T34: Board toolbar

**What**: `BoardToolbar({ showArchived, onShowArchivedChange })` with the **Mostrar arquivadas** switch.
**Where**: `front-end/src/features/board/components/board-toolbar.tsx`
**Depends on**: T33
**Reuses**: T5 `Switch`; prototype `:323-351`
**Requirement**: FBV-33

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: switch reflects the prop and calls back on toggle
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board toolbar`

---

### T35: Column pager

**What**: `ColumnPager({ titles, index, onSelect })`: `md:hidden` dots with "Ir para {title}" and `aria-live` text "{title} · {i} de {n}".
**Where**: `front-end/src/features/board/components/column-pager.tsx`
**Depends on**: T34
**Reuses**: prototype `:513-520`
**Requirement**: FBV-49, FBV-50

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: one dot per title; current dot marked; text for index; click calls `onSelect(i)`; nothing with 0 columns
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add column pager`

---

### T36: Board skeleton

**What**: `BoardSkeleton`: header, three columns, cards; `aria-busy`.
**Where**: `front-end/src/features/board/components/board-skeleton.tsx`
**Depends on**: T35
**Reuses**: `boards-skeleton.tsx`
**Requirement**: FBV-09

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: renders the busy region with three column placeholders
- [ ] Build gate passes; ≥ 1 new test

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board skeleton`

---

### T37: Board not found

**What**: `BoardNotFound`: "Quadro não encontrado", "Ele pode ter sido excluído." and the link to `/boards`.
**Where**: `front-end/src/features/board/components/board-not-found.tsx`
**Depends on**: T36
**Reuses**: prototype `:289-296`
**Requirement**: FBV-11

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: texts and link target
- [ ] Build gate passes; ≥ 1 new test

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board not-found state`

---

### T38: Board columns scroller

**What**: `BoardColumns`: horizontal scroller with snap on phone, renders columns, archived column and section, add column; reports the visible index through `visibleIndex` and scrolls on pager select.
**Where**: `front-end/src/features/board/components/board-columns.tsx`
**Depends on**: T37
**Reuses**: T13, T27–T31, T35
**Requirement**: FBV-02, FBV-13, FBV-34, FBV-37, FBV-48, FBV-49, FBV-50

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: columns in given order; archived column and section only when `showArchived`, after the columns; add column last and hidden when read-only; empty board shows only the empty block; a scroll event updates the pager text (mocked `scrollLeft`/`clientWidth`); pager click calls `scrollTo`
- [ ] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board columns scroller`

---

### T39: Board screen

**What**: `BoardScreen({ boardId })` wiring the view model to header, banner, toolbar, columns, dialog and states; `index.ts` exports it.
**Where**: `front-end/src/features/board/components/board-screen.tsx` (+ `index.ts`)
**Depends on**: T38
**Reuses**: T20–T23, T32–T38; `boards-screen.tsx`
**Requirement**: FBV-01, FBV-09, FBV-10, FBV-11, FBV-14, FBV-22, FBV-25, FBV-31, FBV-33, FBV-39, FBV-41, FBV-44, FBV-47, FBV-52

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW seed): "Product launch" renders its columns and cards; skeleton then board; 500 → error with retry; 404 → not found; creating a column and a card; archive then restore a column with Mostrar arquivadas; done toggle rolls back on 500; archived board banner restore
- [ ] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board screen`

---

### T40: Board breadcrumb

**What**: `BoardBreadcrumb({ boardId })`: "Meus quadros › {title}", `hidden md:flex`; exported from `index.ts`.
**Where**: `front-end/src/features/board/components/board-breadcrumb.tsx`
**Depends on**: T39
**Reuses**: T14 `useBoard`; prototype `:169`
**Requirement**: FBV-12

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): link "Meus quadros" to `/boards` and the board title; nothing while loading or on error
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add board breadcrumb`

---

### T41: Board page and route

**What**: `BoardPage` reads `boardId`, renders `<BoardScreen key={boardId}>`; `routes.tsx` replaces the placeholder.
**Where**: `front-end/src/pages/board-page.tsx` (+ `app/routes.tsx`)
**Depends on**: T40
**Reuses**: `boards-page.tsx`
**Requirement**: FBV-01, FBV-33

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): `/b/{id}` renders the board; navigating to another board resets **Mostrar arquivadas**
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): route board page`

---

### T42: Breadcrumb in the top bar

**What**: `ProtectedLayout` renders `BoardBreadcrumb` when `/b/:boardId/*` matches.
**Where**: `front-end/src/pages/protected-layout.tsx`
**Depends on**: T41
**Reuses**: T40
**Requirement**: FBV-12

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): breadcrumb on `/b/{id}`, absent on `/boards` and `/settings`
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): show board breadcrumb in top bar`

---

### T43: Board e2e journey

**What**: Playwright against the real API: create a board, add a column and two cards, mark one done, rename and archive the column, show archived, restore it, archive another empty column and delete it; at 375 px the pager reads "{title} · 1 de 2".
**Where**: `front-end/test/e2e/board.e2e-spec.ts`
**Depends on**: T42
**Reuses**: `boards.e2e-spec.ts`
**Requirement**: FBV-14, FBV-19, FBV-22, FBV-25, FBV-31, FBV-33, FBV-39, FBV-41, FBV-48, FBV-49

**Tools**:

- MCP: `claude-in-chrome` (optional visual check)
- Skill: `pair-programming`

**Done when**:

- [ ] E2E passes locally against `docker compose`
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the board journey end to end`

---

### T44: Docs and roadmap

**What**: README section on using a board; ROADMAP marks 3a `board` Done; Handoff updated.
**Where**: `README.md` (+ `front-end/.specs/ROADMAP.md`, `front-end/.specs/STATE.md`)
**Depends on**: T43
**Reuses**: Boards docs section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains columns, cards, done, archived items and the read-only archived board
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document using a board`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13
Phase 3:  T14 → T15 → T16 → T17 → T18 → T19
Phase 4:  T20 → T21 → T22 → T23
Phase 5:  T24 → T25 → T26 → T27 → T28 → T29 → T30 → T31
Phase 6:  T32 → T33 → T34 → T35 → T36 → T37
Phase 7:  T38 → T39 → T40 → T41 → T42
Phase 8:  T43 → T44
```

Execution is strictly sequential. Packing at Execute: ~7-task batches on phase boundaries.

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Move save-failure mapping to shared | 1 file | ✅ Granular |
| T2: Extract the save-failure notifier | 1 file | ✅ Granular |
| T3: Button ghost variant and small size | 1 file | ✅ Granular |
| T4: Checkbox primitive | 1 file | ✅ Granular |
| T5: Switch primitive | 1 file | ✅ Granular |
| T6: useShortcut hook | 1 file | ✅ Granular |
| T7: Day-month date format | 1 file + its companion (types / locales / index / route) | ✅ Granular |
| T8: Board types and field validation | 1 file + its companion (types / locales / index / route) | ✅ Granular |
| T9: Title server-error mapping | 1 file | ✅ Granular |
| T10: Due-date rules | 1 file | ✅ Granular |
| T11: Active columns mapper | 1 file | ✅ Granular |
| T12: Archived items mappers | 1 file | ✅ Granular |
| T13: Pager index math | 1 file | ✅ Granular |
| T14: Board query keys and queries | 1 file + its companion (types / locales / index / route) | ✅ Granular |
| T15: Archived column counts | 1 file | ✅ Granular |
| T16: Create list and card mutations | 1 file | ✅ Granular |
| T17: Optimistic change helper and rename | 1 file | ✅ Granular |
| T18: Archive, restore and delete list mutations | 1 file | ✅ Granular |
| T19: Done toggle and board restore mutations | 1 file | ✅ Granular |
| T20: View model: load status and columns | 1 file | ✅ Granular |
| T21: View model: column actions | 1 file | ✅ Granular |
| T22: View model: card actions and shortcut | 1 file | ✅ Granular |
| T23: View model: archived items and board restore | 1 file | ✅ Granular |
| T24: Card tile | 1 file | ✅ Granular |
| T25: Inline create field | 1 file | ✅ Granular |
| T26: Column rename field | 1 file | ✅ Granular |
| T27: Board column | 1 file | ✅ Granular |
| T28: Add column | 1 file | ✅ Granular |
| T29: Archived cards column | 1 file | ✅ Granular |
| T30: Archived columns section | 1 file | ✅ Granular |
| T31: Delete column dialog | 1 file | ✅ Granular |
| T32: Board header | 1 file | ✅ Granular |
| T33: Archived board banner | 1 file | ✅ Granular |
| T34: Board toolbar | 1 file | ✅ Granular |
| T35: Column pager | 1 file | ✅ Granular |
| T36: Board skeleton | 1 file | ✅ Granular |
| T37: Board not found | 1 file | ✅ Granular |
| T38: Board columns scroller | 1 file | ✅ Granular |
| T39: Board screen | 1 file + its companion (types / locales / index / route) | ✅ Granular |
| T40: Board breadcrumb | 1 file | ✅ Granular |
| T41: Board page and route | 1 file + its companion (types / locales / index / route) | ✅ Granular |
| T42: Breadcrumb in the top bar | 1 file | ✅ Granular |
| T43: Board e2e journey | 1 file | ✅ Granular |
| T44: Docs and roadmap | 1 file + its companion (types / locales / index / route) | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | T2 | ✅ Match |
| T4 | T3 | T3 | ✅ Match |
| T5 | T4 | T4 | ✅ Match |
| T6 | T5 | T5 | ✅ Match |
| T7 | T6 | T6 | ✅ Match |
| T8 | T7 | T7 | ✅ Match |
| T9 | T8 | T8 | ✅ Match |
| T10 | T9 | T9 | ✅ Match |
| T11 | T10 | T10 | ✅ Match |
| T12 | T11 | T11 | ✅ Match |
| T13 | T12 | T12 | ✅ Match |
| T14 | T13 | T13 | ✅ Match |
| T15 | T14 | T14 | ✅ Match |
| T16 | T15 | T15 | ✅ Match |
| T17 | T16 | T16 | ✅ Match |
| T18 | T17 | T17 | ✅ Match |
| T19 | T18 | T18 | ✅ Match |
| T20 | T19 | T19 | ✅ Match |
| T21 | T20 | T20 | ✅ Match |
| T22 | T21 | T21 | ✅ Match |
| T23 | T22 | T22 | ✅ Match |
| T24 | T23 | T23 | ✅ Match |
| T25 | T24 | T24 | ✅ Match |
| T26 | T25 | T25 | ✅ Match |
| T27 | T26 | T26 | ✅ Match |
| T28 | T27 | T27 | ✅ Match |
| T29 | T28 | T28 | ✅ Match |
| T30 | T29 | T29 | ✅ Match |
| T31 | T30 | T30 | ✅ Match |
| T32 | T31 | T31 | ✅ Match |
| T33 | T32 | T32 | ✅ Match |
| T34 | T33 | T33 | ✅ Match |
| T35 | T34 | T34 | ✅ Match |
| T36 | T35 | T35 | ✅ Match |
| T37 | T36 | T36 | ✅ Match |
| T38 | T37 | T37 | ✅ Match |
| T39 | T38 | T38 | ✅ Match |
| T40 | T39 | T39 | ✅ Match |
| T41 | T40 | T40 | ✅ Match |
| T42 | T41 | T41 | ✅ Match |
| T43 | T42 | T42 | ✅ Match |
| T44 | T43 | T43 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Move save-failure mapping to shared | shared | unit | unit | ✅ OK |
| T2: Extract the save-failure notifier | shared | unit | unit | ✅ OK |
| T3: Button ghost variant and small size | shared | unit | unit | ✅ OK |
| T4: Checkbox primitive | shared | unit | unit | ✅ OK |
| T5: Switch primitive | shared | unit | unit | ✅ OK |
| T6: useShortcut hook | shared | unit | unit | ✅ OK |
| T7: Day-month date format | shared | unit | unit | ✅ OK |
| T8: Board types and field validation | board model | unit | unit | ✅ OK |
| T9: Title server-error mapping | board model | unit | unit | ✅ OK |
| T10: Due-date rules | board model | unit | unit | ✅ OK |
| T11: Active columns mapper | board model | unit | unit | ✅ OK |
| T12: Archived items mappers | board model | unit | unit | ✅ OK |
| T13: Pager index math | board model | unit | unit | ✅ OK |
| T14: Board query keys and queries | board api | unit | unit | ✅ OK |
| T15: Archived column counts | board api | unit | unit | ✅ OK |
| T16: Create list and card mutations | board api | unit | unit | ✅ OK |
| T17: Optimistic change helper and rename | board api | unit | unit | ✅ OK |
| T18: Archive, restore and delete list mutations | board api | unit | unit | ✅ OK |
| T19: Done toggle and board restore mutations | board api | unit | unit | ✅ OK |
| T20: View model: load status and columns | board view model | unit | unit | ✅ OK |
| T21: View model: column actions | board view model | unit | unit | ✅ OK |
| T22: View model: card actions and shortcut | board view model | unit | unit | ✅ OK |
| T23: View model: archived items and board restore | board view model | unit | unit | ✅ OK |
| T24: Card tile | board components | unit | unit | ✅ OK |
| T25: Inline create field | board components | unit | unit | ✅ OK |
| T26: Column rename field | board components | unit | unit | ✅ OK |
| T27: Board column | board components | unit | unit | ✅ OK |
| T28: Add column | board components | unit | unit | ✅ OK |
| T29: Archived cards column | board components | unit | unit | ✅ OK |
| T30: Archived columns section | board components | unit | unit | ✅ OK |
| T31: Delete column dialog | board components | unit | unit | ✅ OK |
| T32: Board header | board components | unit | unit | ✅ OK |
| T33: Archived board banner | board components | unit | unit | ✅ OK |
| T34: Board toolbar | board components | unit | unit | ✅ OK |
| T35: Column pager | board components | unit | unit | ✅ OK |
| T36: Board skeleton | board components | unit | unit | ✅ OK |
| T37: Board not found | board components | unit | unit | ✅ OK |
| T38: Board columns scroller | board components | unit | unit | ✅ OK |
| T39: Board screen | board components | unit | unit | ✅ OK |
| T40: Board breadcrumb | board components | unit | unit | ✅ OK |
| T41: Board page and route | pages | unit | unit | ✅ OK |
| T42: Breadcrumb in the top bar | pages | unit | unit | ✅ OK |
| T43: Board e2e journey | running app | e2e | e2e | ✅ OK |
| T44: Docs and roadmap | docs | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FBV-01 | T14, T32, T39, T41 |
| FBV-02 | T11, T14, T20, T38 |
| FBV-03 | T11, T14, T20, T27 |
| FBV-04 | T24 |
| FBV-05 | T7, T10, T24 |
| FBV-06 | T10, T24 |
| FBV-07 | T24 |
| FBV-08 | T10, T24 |
| FBV-09 | T20, T36, T39 |
| FBV-10 | T20, T39 |
| FBV-11 | T20, T37, T39 |
| FBV-12 | T40, T42 |
| FBV-13 | T28, T38 |
| FBV-14 | T16, T21, T25, T28, T39, T43 |
| FBV-15 | T8, T21, T25 |
| FBV-16 | T8, T21 |
| FBV-17 | T25 |
| FBV-18 | T27 |
| FBV-19 | T17, T21, T26, T43 |
| FBV-20 | T21, T26 |
| FBV-21 | T21, T26 |
| FBV-22 | T18, T21, T27, T39, T43 |
| FBV-23 | T27 |
| FBV-24 | T3, T22, T27 |
| FBV-25 | T16, T22, T25, T39, T43 |
| FBV-26 | T8, T22, T25 |
| FBV-27 | T8, T22 |
| FBV-28 | T22, T25 |
| FBV-29 | T25 |
| FBV-30 | T6, T22 |
| FBV-31 | T4, T19, T22, T24, T39, T43 |
| FBV-32 | T27 |
| FBV-33 | T5, T23, T34, T39, T41, T43 |
| FBV-34 | T29, T38 |
| FBV-35 | T12, T14, T23, T24, T29 |
| FBV-36 | T29 |
| FBV-37 | T12, T14, T15, T23, T30, T38 |
| FBV-38 | T30 |
| FBV-39 | T3, T18, T23, T30, T39, T43 |
| FBV-40 | T12, T23, T31 |
| FBV-41 | T18, T23, T31, T39, T43 |
| FBV-42 | T23, T31 |
| FBV-43 | T4, T24, T29 |
| FBV-44 | T3, T20, T33, T39 |
| FBV-45 | T4, T24, T27 |
| FBV-46 | T6, T22 |
| FBV-47 | T19, T23, T33, T39 |
| FBV-48 | T38, T43 |
| FBV-49 | T13, T35, T38, T43 |
| FBV-50 | T35, T38 |
| FBV-51 | T32 |
| FBV-52 | T17, T18, T19, T39 |
| FBV-53 | T1, T2, T21 |
| FBV-54 | T21 |
| FBV-55 | T2, T21 |
| FBV-56 | T21, T22, T25 |
| FBV-57 | T1, T9, T21 |
| FBV-58 | T17, T27 |

**Coverage:** 58 total, 58 mapped to tasks, 0 unmapped.
