# Boards Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/boards/spec.md`
**Design**: `front-end/.specs/features/boards/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js`, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). Optimistic hooks follow FE-AD-009.

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-009, the approved design and the spec; existing tests sampled for style: `test/unit/features/auth/api/mutations.spec.tsx`, `test/unit/features/auth/components/sign-up-form.spec.tsx`, `test/unit/features/auth/model/errors.spec.ts`, `test/unit/shared/ui/text-field.spec.tsx`, `test/unit/shared/ui/toast/toast-provider.spec.tsx`, `test/unit/pages/signup-page.spec.tsx`, `test/e2e/auth.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-006, FE-AD-007, FE-AD-009) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `shared/ui` primitives, `shared/i18n/format-date` | unit (Testing Library, plain props) | Every prop branch; ARIA roles and wiring (`dialog`/`alertdialog`, `menu`/`menuitem`, `tablist`/`tab`, `aria-invalid`); keyboard (Esc, arrows, Enter); both locales for dates | `front-end/test/unit/shared/**/*.spec.ts(x)` | `pnpm --filter front-end test` |
| `features/boards/model/` | unit | All branches; 1:1 to spec ACs; boundaries 0/1/100/101 chars (name) and 1000/1001 chars (description); spaces-only; every status branch of `saveFailureKind` | `front-end/test/unit/features/boards/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/boards/api/` hooks | unit (`renderHook` + MSW + `QueryClient` wrapper) | Request path and body; cache patched before the response; snapshot restored on failure; invalidation on settle only when no other change is pending; pending ids | `front-end/test/unit/features/boards/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/boards/view-models/` | unit (`renderHook` inside `renderApp`-style providers + MSW) | Every action; every failure kind → toast text and action; retry resends the same variables; tab ↔ URL | `front-end/test/unit/features/boards/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/boards/components/` | unit (Testing Library, plain props; screen with MSW) | Every AC the component owns, happy + error + edge cases | `front-end/test/unit/features/boards/components/*.spec.tsx` | `pnpm --filter front-end test` |
| `pages/` and route table | unit (`renderApp` + memory router + MSW) | `/boards` renders the screen; create navigates to `/b/{id}` | `front-end/test/unit/pages/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | One journey: create → edit → archive → restore → archive → delete; 1 auth call | `front-end/test/e2e/boards.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Form and dialog primitives

```
T1 → T2 → T3 → T4
```

### Phase 2: Menu, tabs, load error and dates

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: Boards model and API

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 4: Boards views

```
T14 → T15 → T16 → T17 → T18 → T19
```

### Phase 5: Screen and route

```
T19 → T20 → T21 → T22 → T23
```

### Phase 6: Delivery

```
T23 → T24 → T25
```

---

## Task Breakdown

### T1: Button danger variant

**What**: Add `variant="danger"` to `Button` (Púrpura `.p-btn-danger` colors) for "Excluir definitivamente".
**Where**: `front-end/src/shared/ui/button.tsx`
**Depends on**: None
**Reuses**: Existing `variants` map; `design/_ds/.../css/components.css` button styles
**Requirement**: none (enables FBRD-31)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `danger` renders the danger classes; `primary`/`secondary` unchanged
- [x] Build gate passes; ≥ 1 new test

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add danger button variant`

---

### T2: TextField placeholder

**What**: Add an optional `placeholder` prop to `TextField` and export `inputClasses` for `TextAreaField`.
**Where**: `front-end/src/shared/ui/text-field.tsx`
**Depends on**: T1
**Reuses**: Existing `TextField`
**Requirement**: none (enables FBRD-12)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: the input shows the placeholder when given and none when omitted
- [x] Build gate passes; ≥ 1 new test

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add placeholder to text field`

---

### T3: TextAreaField primitive

**What**: `TextAreaField({ label, value, onChange, placeholder?, counter?, error?, inputRef? })` with label, multi-line input, counter text and error, same look as `TextField`.
**Where**: `front-end/src/shared/ui/text-area-field.tsx`
**Depends on**: T2
**Reuses**: `inputClasses` from `text-field.tsx`; React Aria `TextField` + `TextArea`
**Requirement**: none (enables FBRD-12, FBRD-15, FBRD-16)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: label is associated; typing calls `onChange`; counter renders when given; error sets `aria-invalid` and shows the message
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add text area field primitive`

---

### T4: Dialog primitive

**What**: `Dialog({ isOpen, onOpenChange, title, children, footer?, role? })`: modal with heading, body and footer; Esc and overlay click close it; `role` `dialog` or `alertdialog`.
**Where**: `front-end/src/shared/ui/dialog.tsx`
**Depends on**: T3
**Reuses**: React Aria `ModalOverlay`, `Modal`, `Dialog`, `Heading`; prototype modal styles
**Requirement**: none (enables FBRD-12, FBRD-21, FBRD-31, FBRD-36)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: closed renders nothing; open renders `role="dialog"` named by the title; `role="alertdialog"` when asked; Esc calls `onOpenChange(false)`; focus moves into the dialog
- [ ] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add dialog primitive`

---

### T5: ActionMenu primitive

**What**: `ActionMenu({ label, items, isDisabled? })`: icon button (…) with `aria-label` that opens a `role="menu"` of items with icon, label and optional `danger` tone.
**Where**: `front-end/src/shared/ui/menu.tsx`
**Depends on**: T4
**Reuses**: React Aria `MenuTrigger`, `Popover`, `Menu`, `MenuItem`; `tl-menu` styles (`design/Task List.dc.html:74-75`)
**Requirement**: none (enables FBRD-22, FBRD-28, FBRD-42)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: button named by `label`; click opens `menu` with one `menuitem` per item in order; choosing an item calls its `onAction` and closes the menu; `isDisabled` disables the button
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add action menu primitive`

---

### T6: SegmentedTabs primitive

**What**: Controlled `SegmentedTabs({ label, options, selected, onChange })` rendering a `tablist` styled as the Púrpura segmented control.
**Where**: `front-end/src/shared/ui/tabs.tsx`
**Depends on**: T5
**Reuses**: React Aria `Tabs`, `TabList`, `Tab`
**Requirement**: none (enables FBRD-01–03)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `tablist` named by `label`; `selected` tab has `aria-selected="true"`; click and arrow keys call `onChange` with the option id
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add segmented tabs primitive`

---

### T7: LoadError block

**What**: `LoadError({ onRetry })`: `role="alert"` block with `errors.loadTitle`, `errors.loadDetail` and a secondary "Tentar novamente" button.
**Where**: `front-end/src/shared/ui/load-error.tsx`
**Depends on**: T6
**Reuses**: `errors.*` i18n keys; `Button`
**Requirement**: FBRD-10

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (EN and PT-BR): shows title, detail and button texts; button calls `onRetry`
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add load error block`

---

### T8: Short date format

**What**: `formatShortDate(iso, t)` returning "10 out, 2026" (PT-BR) / "Oct 10, 2026" (EN) for the local date; adds `dates.months.*` and `dates.short` keys.
**Where**: `front-end/src/shared/i18n/format-date.ts`
**Depends on**: T7
**Reuses**: Month names of `design/i18n.js:3-6`
**Requirement**: FBRD-05

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: both locales; January and December; single-digit day; ISO built at local noon (design Risks)
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): format short dates per locale`

---

### T9: Board form model

**What**: `BoardFormValues`/`BoardFieldErrors` types, `validateBoardForm`, `toCreateBody`, `toUpdateBody` and `isDeleteConfirmed`.
**Where**: `front-end/src/features/boards/model/validation.ts` (+ `model/types.ts`)
**Depends on**: T8
**Reuses**: `features/auth/model/validation.ts` style; contract `Schemas`
**Requirement**: FBRD-13, FBRD-14, FBRD-15, FBRD-17, FBRD-24, FBRD-25, FBRD-32, FBRD-33

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: empty and spaces-only name → `nameRequired`; 100 chars ok, 101 → `nameTooLong` (after trim); description 1000 ok, 1001 → `descriptionTooLong`; create body omits empty description; update body sends `null`; delete match is exact (case and spaces)
- [ ] Build gate passes; ≥ 10 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): validate board form and build request bodies`

---

### T10: Board error model

**What**: `mapBoardServerErrors(err, values)` and `saveFailureKind(err)`.
**Where**: `front-end/src/features/boards/model/errors.ts`
**Depends on**: T9
**Reuses**: `features/auth/model/errors.ts` pattern
**Requirement**: FBRD-20, FBRD-38, FBRD-39, FBRD-40, FBRD-41

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `title` → `nameRequired`/`nameTooLong` by submitted value; `description` → `descriptionTooLong`; unknown fields ignored; `null` when nothing maps; kinds for 0, 500, 503, 409, 404, 400 with and without `errors[]`, 401, 422
- [ ] Build gate passes; ≥ 10 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): classify board save failures`

---

### T11: Boards list query

**What**: `boardKeys` and `useBoards(archived)` calling `GET /api/v1/boards` with `archived=true` only for the archived list.
**Where**: `front-end/src/features/boards/api/queries.ts` (+ `api/keys.ts`)
**Depends on**: T10
**Reuses**: `features/auth/api/queries.ts`; `call`, `useApi`
**Requirement**: FBRD-01, FBRD-02, FBRD-04

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): active request has no query string; archived sends `archived=true`; data keeps API order; a `500` surfaces as `ApiError`
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): query active and archived boards`

---

### T12: Create board mutation

**What**: `useCreateBoard()` sending `POST /api/v1/boards`; on success invalidates the active list.
**Where**: `front-end/src/features/boards/api/mutations.ts`
**Depends on**: T11
**Reuses**: `features/auth/api/mutations.ts`
**Requirement**: FBRD-17, FBRD-19

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): body sent as given; returns the created board; active list invalidated on success, not on failure
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): create a board`

---

### T13: Optimistic edit mutation

**What**: `BOARD_CHANGE_KEY`, the shared optimistic helper (cancel, snapshot both lists, patch, rollback, settle-invalidate when alone) and `useUpdateBoard()` sending `PATCH /api/v1/boards/{id}`.
**Where**: `front-end/src/features/boards/api/mutations.ts`
**Depends on**: T12
**Reuses**: TanStack Query optimistic recipe (FE-AD-009)
**Requirement**: FBRD-25, FBRD-37

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW, delayed handler): cache shows the new title before the response; `500` restores the previous list; success invalidates `boards`
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): edit a board optimistically`

---

### T14: Optimistic archive, restore and delete

**What**: `useArchiveBoard`, `useRestoreBoard`, `useDeleteBoard` on the T13 helper, plus `usePendingBoardIds()`.
**Where**: `front-end/src/features/boards/api/mutations.ts`
**Depends on**: T13
**Reuses**: T13 helper
**Requirement**: FBRD-27, FBRD-29, FBRD-30, FBRD-34, FBRD-37, FBRD-42

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): each hook calls its path and removes the board from its list before the response; each restores on failure; two concurrent archives both stay removed until both settle; `usePendingBoardIds` holds the id only while pending
- [ ] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): archive, restore and delete boards optimistically`

---

### T15: BoardCard

**What**: `BoardCard({ board, tab, isPending, onEdit, onArchive, onRestore, onDelete })`: link to `/b/{id}` with title, 2-line description and date line; `ActionMenu` beside the link with the tab's items.
**Where**: `front-end/src/features/boards/components/board-card.tsx`
**Depends on**: T14
**Reuses**: `ActionMenu`, `formatShortDate`, prototype card markup (`design/Task List.dc.html:240-260`)
**Requirement**: FBRD-04, FBRD-05, FBRD-06, FBRD-22, FBRD-28, FBRD-42

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: link `href` is `/b/{id}`; description hidden when `null`; "Criado em …" on active and "Arquivado em …" on archived; menu items Editar · Arquivar vs Restaurar · Excluir definitivamente call the right callback; menu disabled when `isPending`
- [ ] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): show a board card with its actions`

---

### T16: Board grid and skeleton

**What**: `BoardGrid` (responsive grid) and `BoardsSkeleton` (6 placeholders, `aria-busy`).
**Where**: `front-end/src/features/boards/components/board-grid.tsx`
**Depends on**: T15
**Reuses**: Prototype `grid-boards` and skeleton markup (`design/Task List.dc.html:208-216`)
**Requirement**: FBRD-04, FBRD-07

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: grid renders children in order as a list; skeleton has `aria-busy="true"` and 6 placeholders
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): lay out the board grid and its skeleton`

---

### T17: Empty states

**What**: `ActiveBoardsEmpty({ onCreate })` and `ArchivedBoardsEmpty()`.
**Where**: `front-end/src/features/boards/components/boards-empty.tsx`
**Depends on**: T16
**Reuses**: Prototype empty markup (`design/Task List.dc.html:226-238`)
**Requirement**: FBRD-08, FBRD-09

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: active shows title, text and "Criar quadro" calling `onCreate`; archived shows "Nenhum quadro arquivado"
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): show empty board states`

---

### T18: BoardFormDialog

**What**: `BoardFormDialog({ mode, isOpen, initialValues?, serverErrors?, isPending, onSubmit, onClose })`: create/edit modal with Nome, Descrição + counter, Cancelar and Criar/Salvar (Criando… while pending); validates on submit.
**Where**: `front-end/src/features/boards/components/board-form-dialog.tsx`
**Depends on**: T17
**Reuses**: `Dialog`, `TextField`, `TextAreaField`, `Button`, `validateBoardForm`
**Requirement**: FBRD-12, FBRD-13, FBRD-14, FBRD-15, FBRD-16, FBRD-18, FBRD-21, FBRD-23, FBRD-24, FBRD-41

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: create title, placeholders and "0 / 1000"; edit prefilled with matching counter; each validation error shows and blocks `onSubmit`; counter follows typing (incl. 1001); valid submit passes raw values; pending shows "Criando…" disabled; server errors render on fields; Cancelar and Esc call `onClose`
- [ ] Build gate passes; ≥ 10 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): add the create and edit board dialog`

---

### T19: DeleteBoardDialog

**What**: `DeleteBoardDialog({ board, isOpen, onConfirm, onClose })`: `alertdialog` with title, text, confirmation field and Cancelar / Excluir definitivamente (danger).
**Where**: `front-end/src/features/boards/components/delete-board-dialog.tsx`
**Depends on**: T18
**Reuses**: `Dialog` (`alertdialog`), `TextField`, `Button` danger, `isDeleteConfirmed`
**Requirement**: FBRD-31, FBRD-32, FBRD-33, FBRD-36

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: title interpolates the board title; button disabled when empty, wrong case or extra space; enabled on exact match and calls `onConfirm`; Cancelar and Esc call `onClose`; field resets when reopened
- [ ] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): confirm permanent board deletion by name`

---

### T20: View-model: tabs, list and create

**What**: `useBoardsViewModel({ onCreated })` with `tab` from `?archived`, `selectTab`, the selected list query, `retryLoad`, the dialog state and `openCreate`/`closeDialog`/`submitCreate` with success and failure toasts.
**Where**: `front-end/src/features/boards/view-models/use-boards-view-model.ts`
**Depends on**: T19
**Reuses**: `useSearchParams`, `useToast`, T10–T12
**Requirement**: FBRD-01, FBRD-02, FBRD-03, FBRD-10, FBRD-19, FBRD-20, FBRD-41

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `?archived=true` → archived, anything else → active; `selectTab` writes/removes the param; create success closes, toasts "Quadro criado", calls `onCreated(id)`; `500` keeps the dialog and toasts with Tentar novamente that resends the same body; `400` sets field errors with no toast; `401` shows no toast
- [ ] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): drive tabs and board creation from a view-model`

---

### T21: View-model: edit, archive, restore, delete and failures

**What**: Add `openEdit`, `submitEdit`, `archive`, `restore`, `openDelete`, `confirmDelete`, `pendingIds` and the shared `notifyFailure` toast mapping.
**Where**: `front-end/src/features/boards/view-models/use-boards-view-model.ts`
**Depends on**: T20
**Reuses**: T13, T14, `saveFailureKind`
**Requirement**: FBRD-25, FBRD-26, FBRD-27, FBRD-29, FBRD-34, FBRD-35, FBRD-38, FBRD-39, FBRD-40, FBRD-41, FBRD-42

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: success toasts "Quadro salvo/arquivado/restaurado/excluído definitivamente"; `500` → saveFail + Tentar novamente resending the same variables (also after a tab switch); `409` → conflict + Recarregar invalidating both lists; `404` → saveFail without action + refetch; edit `400` reopens the dialog with submitted values and field errors
- [ ] Build gate passes; ≥ 10 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): handle board changes and their failures`

---

### T22: BoardsScreen

**What**: `BoardsScreen({ onCreated })`: heading, Criar quadro (Ativos only), tabs, the loading/error/empty/grid switch and both dialogs; exported from `features/boards/index.ts`.
**Where**: `front-end/src/features/boards/components/boards-screen.tsx` (+ `index.ts`)
**Depends on**: T21
**Reuses**: T15–T21, `SegmentedTabs`, `LoadError`
**Requirement**: FBRD-01, FBRD-07, FBRD-08, FBRD-09, FBRD-10, FBRD-11

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp` + MSW): heading and tabs; skeleton while loading; grid, empty and error states per tab; Criar quadro only on Ativos; archiving the last active board shows the empty state
- [ ] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(boards): compose the my boards screen`

---

### T23: Boards page and route

**What**: `BoardsPage` passing `onCreated` → `navigate('/b/{id}')`; `/boards` route uses it instead of the placeholder.
**Where**: `front-end/src/pages/boards-page.tsx` (+ `src/app/routes.tsx`)
**Depends on**: T22
**Reuses**: `SignupPage` composition
**Requirement**: FBRD-06, FBRD-19

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): `/boards` renders "My boards"; creating a board lands on `/b/{id}`; clicking a card lands on `/b/{id}`
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): serve the my boards page at /boards`

---

### T24: Boards e2e journey

**What**: One Playwright test against the real API: sign up → create a board (lands on `/b/{id}`) → back to `/boards` → edit → archive → Archived tab → restore → archive again → delete with the typed name → "No archived boards".
**Where**: `front-end/test/e2e/boards.e2e-spec.ts`
**Depends on**: T23
**Reuses**: `auth.e2e-spec.ts` sign-up steps
**Requirement**: FBRD-03, FBRD-19, FBRD-25, FBRD-27, FBRD-29, FBRD-33, FBRD-35

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Full gate passes locally against `docker compose`; the `front-end (e2e)` CI job passes
- [ ] The test makes 1 call to `/api/v1/auth/*`

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the boards journey end to end`

---

### T25: Docs and roadmap

**What**: README section on managing boards; ROADMAP marks `boards` as Done; Handoff updated.
**Where**: `README.md` (+ `front-end/.specs/ROADMAP.md`, `front-end/.specs/STATE.md`)
**Depends on**: T24
**Reuses**: Auth docs section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains creating, editing, archiving, restoring and deleting boards
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document managing boards`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12 → T13 → T14
Phase 4:  T15 → T16 → T17 → T18 → T19
Phase 5:  T20 → T21 → T22 → T23
Phase 6:  T24 → T25
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1, T2 | 1 prop on 1 primitive | ✅ Granular |
| T3–T7 | 1 primitive each | ✅ Granular |
| T8 | 1 function + its keys | ✅ Granular |
| T9 | 4 small functions + types, one concern (form rules) | ⚠️ Cohesive |
| T10 | 2 functions, one file | ✅ Cohesive |
| T11 | 1 query + key factory | ✅ Cohesive |
| T12, T13 | 1 hook each (T13 + its shared helper) | ✅ Granular |
| T14 | 3 hooks on one helper + pending ids, one file | ⚠️ Cohesive |
| T15, T17, T18, T19 | 1 component each | ✅ Granular |
| T16 | 2 tiny layout components, one file | ✅ Cohesive |
| T20, T21 | 1 view-model split by concern | ✅ Cohesive |
| T22 | 1 component + index export | ✅ Cohesive |
| T23 | 1 page + its route line | ✅ Cohesive |
| T24 | 1 e2e spec | ✅ Granular |
| T25 | Docs | ✅ Cohesive |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | T21 | T21 → T22 | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |
| T24 | T23 | T23 → T24 | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1–T8 | `shared/ui`, `shared/i18n` | unit | unit | ✅ OK |
| T9, T10 | `features/boards/model` | unit | unit | ✅ OK |
| T11–T14 | `features/boards/api` | unit | unit | ✅ OK |
| T15–T19, T22 | `features/boards/components` | unit | unit | ✅ OK |
| T20, T21 | `features/boards/view-models` | unit | unit | ✅ OK |
| T23 | `pages/` + route table | unit | unit | ✅ OK |
| T24 | Running app | e2e | e2e | ✅ OK |
| T25 | Docs | none | none | ✅ OK |

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FBRD-01 | T6, T11, T20, T22 |
| FBRD-02 | T6, T11, T20 |
| FBRD-03 | T6, T20, T24 |
| FBRD-04 | T11, T15, T16 |
| FBRD-05 | T8, T15 |
| FBRD-06 | T15, T23 |
| FBRD-07 | T16, T22 |
| FBRD-08 | T17, T22 |
| FBRD-09 | T17, T22 |
| FBRD-10 | T7, T20, T22 |
| FBRD-11 | T22 |
| FBRD-12 | T2, T3, T4, T18 |
| FBRD-13 | T9, T18 |
| FBRD-14 | T9, T18 |
| FBRD-15 | T3, T9, T18 |
| FBRD-16 | T3, T18 |
| FBRD-17 | T9, T12 |
| FBRD-18 | T18 |
| FBRD-19 | T12, T20, T23, T24 |
| FBRD-20 | T10, T20 |
| FBRD-21 | T4, T18 |
| FBRD-22 | T5, T15 |
| FBRD-23 | T18 |
| FBRD-24 | T9, T18 |
| FBRD-25 | T9, T13, T21, T24 |
| FBRD-26 | T21 |
| FBRD-27 | T14, T21, T24 |
| FBRD-28 | T5, T15 |
| FBRD-29 | T14, T21, T24 |
| FBRD-30 | T14 |
| FBRD-31 | T1, T19 |
| FBRD-32 | T9, T19 |
| FBRD-33 | T9, T19, T24 |
| FBRD-34 | T14, T21 |
| FBRD-35 | T21, T24 |
| FBRD-36 | T4, T19 |
| FBRD-37 | T13, T14 |
| FBRD-38 | T10, T21 |
| FBRD-39 | T10, T21 |
| FBRD-40 | T10, T21 |
| FBRD-41 | T10, T18, T20, T21 |
| FBRD-42 | T5, T14, T15, T21 |

**Coverage:** 42 total, 42 mapped to tasks, 0 unmapped.
