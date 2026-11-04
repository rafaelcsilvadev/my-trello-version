# Labels Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/labels/spec.md`
**Design**: `front-end/.specs/features/labels/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `board.labelsPage.*`, `board.toast.*` or `board.breadcrumbLabels` to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js` and the design's i18n section, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/`, and e2e in `front-end/test/e2e/` (FE-AD-007). One task per branch and PR; the next task starts only after the review.

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-009, FE-AD-010, FE-AD-013, the approved design and the spec; confirmed lessons L-001, L-011, L-017, L-018 applied. Existing tests sampled for style: `test/unit/features/board/model/labels.spec.ts`, `test/unit/features/board/api/label-mutations.spec.tsx`, `test/unit/features/board/api/archived-counts.spec.tsx`, `test/unit/features/board/view-models/use-card-labels-view-model.spec.tsx`, `test/unit/features/board/components/card-detail-labels.spec.tsx`, `test/e2e/card-labels.e2e-spec.ts`. Guidelines found: none beyond the decisions above - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `features/board/model/` | unit | All branches; 1:1 to the ACs they back; boundaries (0/1/n cards, blank and 50/51 char names, unchanged vs changed fields, name and color changed together) | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` | unit (`renderHook` + MSW) | Request sent with the exact body; every cache patched at once; on failure only this change reverted (FE-AD-010), including an overlapping change; settle refetch once; usage counts from each of the three sources and `undefined` until all arrive | `front-end/test/unit/features/board/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + data router + MSW) | Every action and derived value; every failure toast path (retry, `409` board-archived, `409` label-name-taken, `404`); dialog kept or closed per rule; click each toast action and assert the queries it refetches (L-017) | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; composed screen with `renderApp` + MSW) | Every AC the component owns: roles, accessible names, PT-BR texts, key handling (Enter, Esc), callbacks, visibility per mode, disabled states and their style (L-018), focus return, icon identity (L-011); the composed screen asserts every prop it passes down (L-001) | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| `pages/`, router | unit | The route renders the screen for `/b/:boardId/labels`; the layout passes the section to the breadcrumb | `front-end/test/unit/pages/*.spec.tsx`, `front-end/test/unit/app/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Create, rename, recolor, delete with the count, validation messages, empty state, archived board read-only | `front-end/test/e2e/labels.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
| Docs | none | Build gate | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Inner TDD loop only | `pnpm --filter front-end test` |
| Build | End of every task (lint and types count) | `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` |
| Full | Tasks that touch e2e | build gate `&& pnpm --filter front-end test:e2e` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. One task per branch/PR, each PR reviewed before the next task starts.

### Phase 1: Model and API

```
T1 → T2 → T3 → T4
```

### Phase 2: View model

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: Components

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 4: Delivery

```
T14 → T15 → T16 → T17 → T18 → T19
```

---

## Task Breakdown

### T1: Label usage and edit rules

**What**: New `model/label-usage.ts` with `countLabelUsage`, `usageText`, `labelChanges` and `withoutLabel`; `UpdateLabelDto` alias in `model/types.ts`.
**Where**: `front-end/src/features/board/model/label-usage.ts`
**Depends on**: None
**Reuses**: `Label`, `Card` types and `LABEL_COLORS` of `model/labels.ts`
**Requirement**: FLP-03, FLP-21, FLP-34, FLP-38

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `countLabelUsage` over `[[c1, c2], [c3]]` counts each label once per card that carries it, returns no entry (not `0`) for a label on no card, and does not mutate its input; `usageText(0)` → `unused`, `1` → `one`, `2` and `10` → `many` with the count
- [x] Unit: `labelChanges` returns `null` for the same name and color, `{ name }` only when only the name changed, `{ color }` only when only the color changed, both when both changed, and the name trimmed (`"  Defect  "` → `"Defect"`); a name equal to the current one after trimming counts as unchanged; `withoutLabel` removes only that id
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the label usage and edit rules`

---

### T2: Label usage query

**What**: `useLabelUsage(boardId)` merging the board's active cards, archived cards and the active cards of each archived column into `counts`, with `isLoading`, `isError` and `refetch`.
**Where**: `front-end/src/features/board/api/label-usage.ts`
**Depends on**: T1
**Reuses**: `useCards`, `useLists`, `boardViewKeys.listCards` and the request of `archived-counts.ts`; `countLabelUsage`
**Requirement**: FLP-03, FLP-05, FLP-06

**Tools**:

- MCP: `codegraph`, `context7`
- Skill: NONE

**Done when**:

- [x] Unit (MSW): a label on one active card, one archived card and one active card of an archived column counts `3`; a card in no source is not counted; no archived column sends no per-column request
- [x] `counts` is `undefined` and `isLoading` is true until every source answered; one failing source sets `isError` and keeps `counts` `undefined`; `refetch` refetches only the failed sources
- [x] The per-column response is read from `boardViewKeys.listCards`, so it is shared with `useArchivedListCounts` (one request for both)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): count how many cards use each label`

---

### T3: Update a label

**What**: `useUpdateLabel(boardId)` on `useOptimisticBoardViewChange`: `PATCH /labels/{id}` with the body; patches the board label query with `inList` + `fieldsPatch`.
**Where**: `front-end/src/features/board/api/label-mutations.ts`
**Depends on**: T2
**Reuses**: `fieldsPatch`, `inList`, `useOptimisticBoardViewChange`, `usePendingItemIds`
**Requirement**: FLP-20, FLP-22, FLP-28, FLP-30, FLP-31, FLP-32

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit (MSW): the request carries only the given fields; the label query shows the new name and color before the response; board label order is kept
- [x] On a failed request only this label's changed fields revert, and a field changed by another pending update stays; on success the board view refetches once when no other change is pending
- [x] The label shows in `usePendingItemIds` while the request is in flight (FLP-22)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): update a label optimistically`

---

### T4: Delete a label

**What**: `useDeleteLabel(boardId)` on `useOptimisticBoardViewChange`: `DELETE /labels/{id}`; removes the label from the label query and its id from `labelIds` in the active and archived card lists.
**Where**: `front-end/src/features/board/api/label-mutations.ts`
**Depends on**: T3
**Reuses**: `removal`, `withoutLabelId`, the `changed` flag pattern of `labelIdsPatch`
**Requirement**: FLP-24, FLP-25, FLP-28, FLP-31, FLP-32

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit (MSW): the label leaves the label query and its id leaves `labelIds` of every card in both card lists before the response; cards without the id are untouched
- [x] On failure the label returns at its original index and the id returns only on the cards that had it; a card that gained another label meanwhile keeps it; on success the board view refetches once when no other change is pending
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): delete a label optimistically`

---

### T5: Labels view-model: read state

**What**: `useLabelsViewModel(boardId)` returning `state` (`status`, `board`, `readOnly`, `rows` with usage and pending flag) and `actions.retry`.
**Where**: `front-end/src/features/board/view-models/use-labels-view-model.ts`
**Depends on**: T4
**Reuses**: `useBoard`, `useLabels`, `useLabelUsage`, `usePendingItemIds`, `usageText`; status mapping of `use-board-view-model.ts`
**Requirement**: FLP-01, FLP-03, FLP-05, FLP-06, FLP-07, FLP-27, FLP-38

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `loading` until the board, labels and every usage source answered; `ready` with one row per label in board label order and the right usage kind (0 → `unused`, 1 → `one`, n → `many`); a created-but-unused label is a row
- [x] `error` when any read fails and no data exists (a failed refetch with cached data stays `ready`); clicking `retry` refetches exactly the failed queries (L-017); a `404`, a foreign id or a malformed id → `notFound`
- [x] `readOnly` is true only when the board has `archivedAt`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the labels view-model read state`

---

### T6: Labels view-model: create flow

**What**: `openCreate`, `setName`, `setColor`, `closeForm` and `submit` for create: validation, `POST`, success and failure rules.
**Where**: `front-end/src/features/board/view-models/use-labels-view-model.ts`
**Depends on**: T5
**Reuses**: `useCreateLabel`, `validateLabelName`, `isLabelNameTaken`, `DEFAULT_LABEL_COLOR`, failure handling of `use-card-labels-view-model.ts`
**Requirement**: FLP-10, FLP-13, FLP-15, FLP-16, FLP-17, FLP-29, FLP-30, FLP-31, FLP-33, FLP-34

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `openCreate` opens a form with an empty name and `blue`; an invalid name sets the error and sends nothing; 50 chars (and 50 with outer spaces) are sent trimmed; typing clears the error
- [x] `submit` sends `POST` once while in flight (`isSubmitting` true, second `submit` ignored); on `201` the form closes, the label is the last row as `unused` and the toast "Etiqueta criada" shows; `closeForm` drops the text with no request
- [x] Network/`5xx` keeps the form with its text and color and shows "Não foi possível salvar. Tente novamente." whose **Tentar novamente** repeats the same create; `409` label-name-taken keeps the form, sets `labelNameTaken` and refetches the labels; `409` board-archived shows the conflict toast and **Recarregar** refetches the board view (L-017)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the create flow to the labels view-model`

---

### T7: Labels view-model: edit flow

**What**: `openEdit(id)` and the edit branch of `submit`: validation excluding the label itself, no-change close, optimistic `PATCH` with only changed fields.
**Where**: `front-end/src/features/board/view-models/use-labels-view-model.ts`
**Depends on**: T6
**Reuses**: `useUpdateLabel`, `labelChanges`, `validateLabelName`, `runChange`
**Requirement**: FLP-18, FLP-19, FLP-20, FLP-21, FLP-22, FLP-28, FLP-30, FLP-31, FLP-32

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `openEdit` fills the label's name and color; renaming to the label's own name in another case is valid; renaming to another label's name (any case) sets `labelNameTaken` and sends nothing
- [x] An unchanged name and color closes the form with no request and no toast; a changed one closes the form at once, shows "Etiqueta salva" and sends `PATCH` with only the changed fields
- [x] Network/`5xx` reverts the row and shows the retry toast, whose action repeats the same `PATCH`; `409` label-name-taken reverts the row and reopens the form with the text and `labelNameTaken`; `409` board-archived and `404` follow the spec toasts and refetch what FLP-31/FLP-32 name
- [x] A row with a change in flight is `isPending`; other rows are not
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the edit flow to the labels view-model`

---

### T8: Labels view-model: delete flow

**What**: `openDelete(id)`, `closeDelete`, `confirmDelete` with the card count captured when the dialog opens.
**Where**: `front-end/src/features/board/view-models/use-labels-view-model.ts`
**Depends on**: T7
**Reuses**: `useDeleteLabel`, `runChange`
**Requirement**: FLP-23, FLP-24, FLP-25, FLP-26, FLP-28, FLP-31, FLP-32, FLP-35, FLP-37

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `openDelete` sets `confirmDelete` with the label and its current count (0, 1, n); `closeDelete` closes with no request; `confirmDelete` closes the dialog, removes the row, shows "Etiqueta excluída" and sends `DELETE`
- [x] Deleting the last label yields zero rows (the empty state input); network/`5xx` puts the row back at its index with the retry toast, which repeats the `DELETE`; `409` board-archived and `404` follow the spec toasts; a `404` refetches the labels and the cards (L-017)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the delete flow to the labels view-model`

---

### T9: Extract the label color picker

**What**: Move the color `RadioGroup` of `CardDetailLabelForm` into `LabelColorPicker` (props: `value`, `onChange`, `ariaLabel`) and use it in the card popover form; no behavior change.
**Where**: `front-end/src/features/board/components/label-color-picker.tsx`
**Depends on**: T8
**Reuses**: `LABEL_COLORS`, `LABEL_CLASSES`, `board.labelColors.*`
**Requirement**: FLP-10, FLP-11

**Tools**:

- MCP: `codegraph`
- Skill: `safe-refactor`

**Done when**:

- [x] Unit: the picker renders 10 radios named by color in doc §8 order inside a radiogroup with the given name; the selected one is checked; arrow keys and click call `onChange` with the color; each swatch uses its color class (L-018)
- [x] `card-detail-label-form` renders the picker and its existing specs pass unchanged
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `refactor(front-end): extract the label color picker`

---

### T10: Label form dialog

**What**: `LabelFormDialog` View: modal with title, name field, picker, color name, preview chip, **Cancelar** and the primary button; mounted only while open.
**Where**: `front-end/src/features/board/components/label-form-dialog.tsx`
**Depends on**: T9
**Reuses**: `Dialog`, `TextField`, `Button`, `LabelColorPicker`, `LabelChip`
**Requirement**: FLP-10, FLP-11, FLP-12, FLP-13, FLP-14, FLP-15, FLP-17, FLP-18, FLP-36

**Tools**:

- MCP: `codegraph`
- Skill: `accessibility`

**Done when**:

- [x] Unit: create mode shows title **Nova etiqueta**, a focused "Nome" field with placeholder "Ex.: Bug", `blue` selected with its name "Azul" and the primary button **Criar etiqueta**; edit mode shows **Editar etiqueta**, the label's values and **Salvar**
- [x] The preview chip shows the typed name, or "Ex.: Bug" while the trimmed name is blank, and the picked color; picking a color shows its name
- [x] An error shows below the field with `role="alert"` and `aria-invalid="true"`, and typing calls `onNameChange` (the view-model clears it); Enter submits; while `isSubmitting` the primary button is disabled and styled so (L-018); **Cancelar**, Esc and an outside click call `onClose`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the label form dialog`

---

### T11: Delete label dialog

**What**: `DeleteLabelDialog` View: `alertdialog` "Excluir a etiqueta {name}?" with the count text, **Cancelar** and **Excluir**.
**Where**: `front-end/src/features/board/components/delete-label-dialog.tsx`
**Depends on**: T10
**Reuses**: `Dialog` and the shape of `delete-column-dialog.tsx`
**Requirement**: FLP-23, FLP-26, FLP-36

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: count 0 → "Nenhuma tarefa usa esta etiqueta."; 1 → "Ela será removida de 1 tarefa."; 3 → "Ela será removida de 3 tarefas."; the title names the label; **Excluir** uses the danger style
- [x] **Excluir** calls `onConfirm`; **Cancelar**, Esc and an outside click call `onCancel`; role is `alertdialog`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the delete label dialog`

---

### T12: Labels list and row

**What**: `LabelsList` with one `LabelRow` per label: chip, usage text, **Editar** and **Excluir** icon buttons.
**Where**: `front-end/src/features/board/components/labels-list.tsx`
**Depends on**: T11
**Reuses**: `LabelChip`, `Button`, lucide icons
**Requirement**: FLP-02, FLP-03, FLP-22, FLP-38

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: rows keep the given order; each shows the chip and "não usada" / "usada em 1 tarefa" / "usada em 3 tarefas"; buttons are named "Editar etiqueta {name}" and "Excluir etiqueta {name}" with the pencil and trash icons (L-011)
- [x] Buttons call `onEdit(id)` and `onDelete(id)`; a pending row has both buttons disabled and dimmed (L-018) while others stay enabled; `readOnly` hides both buttons and keeps chip and usage
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the labels list`

---

### T13: Labels empty state and skeleton

**What**: `LabelsEmpty` ("Nenhuma etiqueta ainda" + detail + **Nova etiqueta**) and `LabelsSkeleton` (rows).
**Where**: `front-end/src/features/board/components/labels-states.tsx`
**Depends on**: T12
**Reuses**: `boards-empty.tsx` and `board-skeleton.tsx` patterns
**Requirement**: FLP-04, FLP-05

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: the empty state shows the title, "Crie etiquetas para destacar tarefas, como Bug ou Urgent." and a **Nova etiqueta** button calling `onCreate`; with `readOnly` the button is absent
- [x] The skeleton renders placeholder rows with no text and `aria-busy` on its container
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the labels empty state and skeleton`

---

### T14: Labels screen

**What**: `LabelsScreen` composing the header (phone back arrow, heading, subtitle, **Nova etiqueta**), read-only notice, states, list and both dialogs from the view-model.
**Where**: `front-end/src/features/board/components/labels-screen.tsx`
**Depends on**: T13
**Reuses**: `useLabelsViewModel`, `LoadError`, `BoardNotFound`, the dialogs and states above; notice text `board.cardDetail.boardArchivedNotice`
**Requirement**: FLP-01, FLP-04, FLP-05, FLP-06, FLP-07, FLP-09, FLP-16, FLP-20, FLP-27, FLP-35, FLP-36

**Tools**:

- MCP: `codegraph`
- Skill: `accessibility`

**Done when**:

- [x] Unit (`renderApp` + MSW, L-001): shows **Etiquetas**, "{board} · Valem só para este quadro.", the rows and **Nova etiqueta**; loading → skeleton; load failure → "Não foi possível carregar" with **Tentar novamente**; not found → the board-not-found screen; no labels → the empty state
- [x] Create from the screen adds the last row and the toast; edit changes the row; delete shows the count dialog then removes the row; after a delete focus is on **Nova etiqueta**, after a dialog from a row focus returns to that row's button
- [x] Archived board: the notice "Quadro arquivado · somente leitura", the list, and no **Nova etiqueta**, **Editar** or **Excluir**; the phone back arrow links to `/b/{boardId}` with an accessible name
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the labels screen`

---

### T15: Labels route

**What**: `LabelsPage` renders `LabelsScreen`; the route `b/:boardId/labels` uses it instead of the placeholder; `LabelsScreen` exported from `features/board/index.ts`.
**Where**: `front-end/src/pages/labels-page.tsx`
**Depends on**: T14
**Reuses**: `board-page.tsx` container and `key` by board
**Requirement**: FLP-08

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit (`renderApp`): `/b/{id}/labels` shows the heading **Etiquetas** and not the placeholder; the board menu entry **Etiquetas do quadro** and the card popover link **Gerenciar etiquetas** both lead there
- [x] Moving between two boards' label pages resets the screen state (keyed by board)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): open the labels page from the board`

---

### T16: Breadcrumb third crumb

**What**: `BoardBreadcrumb` takes `section?: 'labels'`; with it the board title links to `/b/{boardId}` and "Etiquetas" is the current page; `ProtectedLayout` passes it on the labels route.
**Where**: `front-end/src/features/board/components/board-breadcrumb.tsx`
**Depends on**: T15
**Reuses**: current breadcrumb markup; `useMatch` in `protected-layout.tsx`
**Requirement**: FLP-09

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: on the board route the breadcrumb is unchanged ("Meus quadros › {board}", title current); on the labels route it is "Meus quadros › {board} › Etiquetas", the board crumb is a link to `/b/{boardId}` and only "Etiquetas" has `aria-current="page"`; hidden below `md` as before
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): show the labels crumb in the breadcrumb`

---

### T17: Labels e2e

**What**: Playwright journey on the real API: create, rename and recolor, delete with the count, validation messages, empty state, archived board read-only.
**Where**: `front-end/test/e2e/labels.e2e-spec.ts`
**Depends on**: T16
**Reuses**: sign-up and API seeding helpers of `card-labels.e2e-spec.ts`
**Requirement**: FLP-01, FLP-08, FLP-16, FLP-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Seeded board with "Bug" on two cards (one archived) and "Idea" unused: the page lists "usada em 2 tarefas" and "não usada"; the Bug delete dialog says "Ela será removida de 2 tarefas." and after **Excluir** the board shows no Bug chip
- [x] Create "Chore" in Verde, rename it with a duplicate name (error shown) then to "Chores", recolor, and reload: the page matches
- [x] A board with no labels shows "Nenhuma etiqueta ainda"; an archived board shows the notice and no write buttons
- [x] Full gate passes

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): add the labels e2e journey`

---

### T18: Document the labels page

**What**: README bullets on managing a board's labels; status line updated.
**Where**: `README.md`
**Depends on**: T17
**Reuses**: card-labels section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] README explains the labels page (list with usage, create, edit, delete with the count, read-only archived board)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document the labels page`

---

### T19: Close out the feature in the roadmap

**What**: ROADMAP 5 → Done; `FE-AD-013` scope gains `labels`; STATE handoff points to `settings` (6).
**Where**: `front-end/.specs/ROADMAP.md`
**Depends on**: T18
**Reuses**: Previous feature close-outs
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] ROADMAP shows 5 Done, `FE-AD-013` lists `labels`, and the Handoff points to `settings` (6)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): mark labels done`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12 → T13 → T14
Phase 4:  T15 → T16 → T17 → T18 → T19
```

Execution is strictly sequential. Each task is its own branch and PR, reviewed before the next starts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 4 small pure functions, one file | ⚠️ Cohesive (all read labels and cards) |
| T2 | 1 query hook | ✅ |
| T3, T4 | 1 mutation hook each | ✅ |
| T5–T8 | 1 concern of one view model each | ✅ |
| T9 | 1 extraction | ✅ |
| T10, T11 | 1 dialog each | ✅ |
| T12 | 1 list + row | ✅ |
| T13 | 2 tiny state components, one file | ⚠️ Cohesive (both are non-list states) |
| T14 | 1 composition | ✅ |
| T15, T16 | 1 wiring each | ✅ |
| T17 | 1 e2e file | ✅ |
| T18, T19 | 1 doc each | ✅ |

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
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `features/board/model/` | unit | unit | ✅ |
| T2–T4 | `features/board/api/` | unit | unit | ✅ |
| T5–T8 | `features/board/view-models/` | unit | unit | ✅ |
| T9–T14 | `features/board/components/` | unit | unit | ✅ |
| T15, T16 | `pages/`, router, components | unit | unit | ✅ |
| T17 | Running app | e2e | e2e | ✅ |
| T18, T19 | Docs | none | none | ✅ |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FLP-01 | T5, T14, T17 |
| FLP-02 | T12 |
| FLP-03 | T1, T2, T5, T12 |
| FLP-04 | T13, T14 |
| FLP-05 | T2, T5, T13, T14 |
| FLP-06 | T2, T5, T14 |
| FLP-07 | T5, T14 |
| FLP-08 | T15, T17 |
| FLP-09 | T14, T16 |
| FLP-10 | T6, T9, T10 |
| FLP-11 | T9, T10 |
| FLP-12 | T10 |
| FLP-13 | T6, T10 |
| FLP-14 | T10 |
| FLP-15 | T6, T10 |
| FLP-16 | T6, T14, T17 |
| FLP-17 | T6, T10 |
| FLP-18 | T7, T10 |
| FLP-19 | T7 |
| FLP-20 | T3, T7, T14 |
| FLP-21 | T1, T7 |
| FLP-22 | T3, T7, T12 |
| FLP-23 | T8, T11 |
| FLP-24 | T4, T8 |
| FLP-25 | T4, T8 |
| FLP-26 | T8, T11 |
| FLP-27 | T5, T14, T17 |
| FLP-28 | T3, T4, T7, T8 |
| FLP-29 | T6 |
| FLP-30 | T3, T6, T7 |
| FLP-31 | T3, T4, T6, T7, T8 |
| FLP-32 | T3, T4, T7, T8 |
| FLP-33 | T6 |
| FLP-34 | T1, T6 |
| FLP-35 | T8, T14 |
| FLP-36 | T10, T11, T14 |
| FLP-37 | T8 |
| FLP-38 | T1, T5, T12 |

**Coverage:** 38 total, 38 mapped to tasks (T1–T19), 0 unmapped
