# Card Labels Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/card-labels/spec.md`
**Design**: `front-end/.specs/features/card-labels/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `board.cardDetail.labelPopover.*`, `board.labelColors.*`, `board.toast.*` or `board.fieldErrors.*` to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js` and the design's i18n table, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). MSW fixtures use the existing `labelFixture()` builder of `front-end/test/support/fixtures/board.ts`; order assertions build three labels and apply the middle one (design risk). Composed screens are tested through the rendered screen, asserting what each child receives (lesson L-001).

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-013, the approved design and the spec; existing tests sampled for style: `test/unit/features/board/model/checklist.spec.ts`, `test/unit/features/board/model/validation.spec.ts`, `test/unit/features/board/api/checklist-mutations.spec.tsx`, `test/unit/features/board/api/create-mutations.spec.tsx`, `test/unit/features/board/view-models/use-card-checklist-view-model.spec.tsx`, `test/unit/features/board/view-models/use-card-detail-view-model.spec.tsx`, `test/unit/features/board/components/card-detail.spec.tsx`, `test/e2e/card-checklist.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-007) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `features/board/model/` | unit | All branches; 1:1 to the ACs they back; boundaries (0/1/50/51 chars after trim, case and accent variants, label missing from the board list) | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` | unit (`renderHook` + MSW) | Request sent; every cache patched at once in board label order; on failure only this change reverted (FE-AD-010), including an overlapping toggle; settle refetch once; create appends only on success | `front-end/test/unit/features/board/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + data router + MSW) | Every action and derived value; open/close reset; every failure toast path (retry, `409`, `404`, `409` label-name-taken); form kept on failure; create → apply chain; dirty unaffected | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; composed detail with `renderApp` + MSW) | Every AC the component owns: roles, names, PT-BR texts, key handling (Enter, Esc, Space), callbacks, visibility per mode, disabled states and their style (L-018), focus, icon identity (L-011) | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Apply, remove and create with the tile chips updated; search; validation message; Esc order; read-only card | `front-end/test/e2e/card-labels.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Model

```
T1 → T2
```

### Phase 2: Mutations

```
T2 → T3 → T4
```

### Phase 3: View models

```
T4 → T5 → T6 → T7 → T8 → T9
```

### Phase 4: Components

```
T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 5: Delivery

```
T14 → T15 → T16 → T17
```

---

## Task Breakdown

### T1: Label search and ordering rules

**What**: New `model/labels.ts` with `LABEL_COLORS` (doc §8 order), `DEFAULT_LABEL_COLOR`, `searchLabels`, `withLabelId`, `withoutLabelId` and `isLabelNameTaken`.
**Where**: `front-end/src/features/board/model/labels.ts`
**Depends on**: None
**Reuses**: `normalizeText` of `model/filters.ts`
**Requirement**: FCLB-03, FCLB-04, FCLB-05, FCLB-09, FCLB-12, FCLB-23

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `LABEL_COLORS` is `purple, blue, sky, green, lime, yellow, orange, red, pink, black` and the default is `blue`; `searchLabels` with `""` and `"   "` returns every label in order; `"ur"` matches "Urgent"; `"URG"` and an accented query match ignoring case and accents; `"zzz"` returns `[]`; `withLabelId` puts the middle label of three between the other two, never adds a duplicate, keeps an id missing from the board list at the end, and does not mutate its input; `withoutLabelId` removes only that id; `isLabelNameTaken` is true only for `409` with type ending `/problems/label-name-taken` (false for `409` board-archived and for `400`)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the label search and ordering rules`

---

### T2: Label name validation

**What**: `validateLabelName(raw, labels)` in `model/labels.ts`; `ItemFieldError` gains `labelNameRequired`, `labelNameTooLong`, `labelNameTaken`; `CreateLabelDto` alias in `model/types.ts`; their `board.fieldErrors.*` texts in EN and PT-BR.
**Where**: `front-end/src/features/board/model/labels.ts`
**Depends on**: T1
**Reuses**: `validateTitle` shape of `model/validation.ts`
**Requirement**: FCLB-15, FCLB-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit: `""` and `"   "` → `labelNameRequired`; 50 chars → `null`; 50 chars with outer spaces → `null`; 51 chars → `labelNameTooLong`; `"bug"` and `" BUG "` with "Bug" on the board → `labelNameTaken`; `"Bugs"` → `null`
- [x] PT-BR texts are "Dê um nome à etiqueta", "Use até 50 caracteres" and "Já existe uma etiqueta com esse nome neste quadro"; the locale key parity test passes
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): validate label names`

---

### T3: Toggle a card label

**What**: `useToggleCardLabel(boardId)` on `useOptimisticBoardViewChange`: `PUT` when `applied`, `DELETE` otherwise; patches `labelIds` of the card query and of the active card list with `withLabelId` / `withoutLabelId`; `revert` undoes only a change it made.
**Where**: `front-end/src/features/board/api/label-mutations.ts`
**Depends on**: T2
**Reuses**: `useOptimisticBoardViewChange`, `CacheChange`, `inList` of `api/mutations.ts`; `checklist-mutations.ts` as template
**Requirement**: FCLB-04, FCLB-05, FCLB-06, FCLB-17, FCLB-18, FCLB-19

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `applied: true` sends `PUT /api/v1/cards/{cardId}/labels/{labelId}` and `applied: false` sends `DELETE`; the card query and the active card list show the new `labelIds` at once, in board label order (middle of three); other cards are untouched; on `5xx` only this id is reverted while an overlapping toggle of another label survives; applying an id already present and failing leaves it present; the mutation's `id` is the label id (the card is not in `pendingIds`); the board is refetched once after the last change settles
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): apply and remove card labels optimistically`

---

### T4: Create a label

**What**: `useCreateLabel(boardId)` — not optimistic; `POST /api/v1/boards/{boardId}/labels`; on `201` appends the label to `boardViewKeys.labels(boardId)` and refetches.
**Where**: `front-end/src/features/board/api/label-mutations.ts`
**Depends on**: T3
**Reuses**: `appendThenInvalidate` of `api/create-mutations.ts`
**Requirement**: FCLB-13, FCLB-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit: sends `POST` with `{ name, color }`; the labels cache does not change while in flight; on success the label is last in the labels cache and the key is invalidated; on `409` and `5xx` no cache changed and the error is an `ApiError` with its `status` and `type`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): create board labels`

---

### T5: Label popover view model — open and search

**What**: `useCardLabelsViewModel(boardId, card, labels)` with `state.isOpen`, `state.query`, `state.options` (search applied, `isChecked` from `card.labelIds`) and `actions.setOpen`, `actions.setQuery`.
**Where**: `front-end/src/features/board/view-models/use-card-labels-view-model.ts`
**Depends on**: T4
**Reuses**: `searchLabels`; `useCardChecklistViewModel` structure
**Requirement**: FCLB-03, FCLB-08, FCLB-09, FCLB-10, FCLB-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Unit: closed with an empty query at start; `options` list every board label in order, checked exactly for the ids in `labelIds`; `setQuery("ur")` keeps only Urgent; no match → `options` is `[]`; `setOpen(false)` clears the query (and later the form), so the next open lists every label; `card` undefined → every option unchecked
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the label popover view model`

---

### T6: Label popover view model — apply and remove

**What**: `actions.toggle(label)` through `runChange` with `{ id: label.id, cardId, applied: !isChecked }`; `isPending` per option from `usePendingItemIds`.
**Where**: `front-end/src/features/board/view-models/use-card-labels-view-model.ts`
**Depends on**: T5
**Reuses**: `useToggleCardLabel`, `usePendingItemIds`, `useSaveFailureNotifier`
**Requirement**: FCLB-04, FCLB-05, FCLB-06, FCLB-07, FCLB-17, FCLB-18, FCLB-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Unit: toggling an unchecked label applies it and a checked one removes it, with no toast and the popover still open; the toggled option is `isPending` while in flight and the others are not; `5xx` → save-fail toast whose **Tentar novamente** repeats the same request; `409` → conflict toast whose **Recarregar** refetches exactly `boardViewKeys.all(boardId)` (L-017); `404` → save-fail toast and the board view is refetched
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): toggle card labels from the view model`

---

### T7: Label popover view model — create form state

**What**: `state.form` and `actions.startCreate`, `setName`, `setColor`, `cancelCreate`.
**Where**: `front-end/src/features/board/view-models/use-card-labels-view-model.ts`
**Depends on**: T6
**Reuses**: `DEFAULT_LABEL_COLOR`
**Requirement**: FCLB-12, FCLB-16, FCLB-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Unit: `startCreate` opens the form with the search text as name and `blue` as color; `setName` and `setColor` update it; `setName` clears an error; `cancelCreate` drops name, color and error and sends nothing; `setOpen(false)` drops the form
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): hold the create label form in the view model`

---

### T8: Label popover view model — submit create

**What**: `actions.submitCreate` and `state.isCreating`: validate, create, then close the form, clear the search, toast "Etiqueta criada" and apply the new label; failure branches.
**Where**: `front-end/src/features/board/view-models/use-card-labels-view-model.ts`
**Depends on**: T7
**Reuses**: `useCreateLabel`, `validateLabelName`, `isLabelNameTaken`, `toggle` of T6, `useToast`
**Requirement**: FCLB-13, FCLB-14, FCLB-15, FCLB-22, FCLB-23, FCLB-24, FCLB-25, FCLB-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Unit: a valid name sends the trimmed name and the color; a second submit in flight sends nothing; `201` → form `null`, query `""`, toast "Etiqueta criada" and a `PUT` for the new label id; empty, 51 chars and a clashing name set the matching error with no request; 50 chars is sent; `409` label-name-taken → `labelNameTaken`, form text kept and the labels refetched; `409` board-archived → conflict toast with **Recarregar**; `5xx` → form kept and the save-fail toast whose **Tentar novamente** resends the same body; create ok + `PUT` `5xx` → label in the list unchecked, "Etiqueta criada" and the save-fail toast both shown
- [ ] PT-BR toast text is "Etiqueta criada"; the locale key parity test passes
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): create a label from the popover and apply it`

---

### T9: Wire the popover into the card detail view model

**What**: `useCardDetailViewModel` calls `useCardLabelsViewModel(boardId, card.data, labels.data ?? [])` and exposes it as `state.labelPopover` / `actions.labelPopover`; popover text never counts as dirty.
**Where**: `front-end/src/features/board/view-models/use-card-detail-view-model.ts`
**Depends on**: T8
**Reuses**: the checklist wiring of the same view model
**Requirement**: FCLB-28, FCLB-29

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit: `state.labelPopover.options` reflect the loaded card and board labels; search text or an open create form leaves `dirty` false and closing needs no discard dialog; with the label filter active, removing the label that made the card match keeps the detail open (the card query still resolves)
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): expose the label popover from the card detail view model`

---

### T10: Create label form

**What**: `CardDetailLabelForm` with plain props: name field, color `RadioGroup`, error, **Criar** and "Cancelar"; exports `LABEL_CLASSES` from `label-chip.tsx` for the swatches; `board.labelColors.*` and form texts in EN and PT-BR.
**Where**: `front-end/src/features/board/components/card-detail-label-form.tsx`
**Depends on**: T9
**Reuses**: `LABEL_CLASSES`, `Button`, `inputClasses`
**Requirement**: FCLB-12, FCLB-13, FCLB-15, FCLB-16, FCLB-27

**Tools**:

- MCP: `codegraph`
- Skill: `accessibility`

**Done when**:

- [ ] Unit: the field "Nome" (placeholder "Ex.: Bug") is focused and shows the given name; the `radiogroup` "Cor" has 10 radios named Roxo…Preto in doc §8 order with the given color checked; arrow keys and clicks call `onColorChange`; Enter in the name and **Criar** call `onSubmit`; **Criar** is disabled while creating; an error shows its PT-BR text with `role="alert"` and `aria-invalid="true"` on the name; typing calls `onNameChange`; "Cancelar" (`X` icon) calls `onCancel`
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the create label form`

---

### T11: Label popover — trigger, search and list

**What**: `CardDetailLabelPopover`: "+" trigger, RAC `DialogTrigger` + `Popover` + `Dialog` "Etiquetas", focused search field, checkbox rows or "Nenhuma etiqueta encontrada".
**Where**: `front-end/src/features/board/components/card-detail-label-popover.tsx`
**Depends on**: T10
**Reuses**: `LabelChip`, label-filter box styles, `Button`, `inputClasses`
**Requirement**: FCLB-01, FCLB-02, FCLB-03, FCLB-06, FCLB-08, FCLB-09, FCLB-10

**Tools**:

- MCP: `codegraph`
- Skill: `accessibility`

**Done when**:

- [ ] Unit: "Adicionar etiqueta" shows the `Plus` icon (L-011) and `aria-pressed`/expanded state while open; pressing it calls `onOpenChange(true)`; open → `role="dialog"` "Etiquetas" with focus in "Buscar etiquetas…"; each option is a checkbox named by the label with its chip, checked per props; click and Space call `onToggle(label)`; a pending option is disabled with the disabled style (L-018) while the others stay enabled; typing calls `onQueryChange`; no options → "Nenhuma etiqueta encontrada"; Esc and the trigger call `onOpenChange(false)` and focus returns to the trigger
- [ ] PT-BR texts from the design's i18n table; the locale key parity test passes
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the label popover with search and checkboxes`

---

### T12: Label popover — create and manage

**What**: The popover footer: ghost **Criar etiqueta** swapped for `CardDetailLabelForm` while the form is open, and the RAC `Link` **Gerenciar etiquetas** to `/b/{boardId}/labels`.
**Where**: `front-end/src/features/board/components/card-detail-label-popover.tsx`
**Depends on**: T11
**Reuses**: `CardDetailLabelForm`, `AriaRouterProvider`
**Requirement**: FCLB-12, FCLB-16, FCLB-20

**Tools**:

- MCP: NONE
- Skill: `accessibility`

**Done when**:

- [ ] Unit: **Criar etiqueta** calls `onStartCreate`; with a form in props the button is gone and the form receives name, color, error and creating state; with no form the button is back; **Gerenciar etiquetas** is a link to `/b/{boardId}/labels`; a board with no labels still shows both
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): create and manage labels from the popover`

---

### T13: Detail labels field

**What**: `CardDetailLabels`: the Etiquetas heading, the applied chips moved out of `card-detail.tsx`, and the popover when editable; renders when editable or with chips.
**Where**: `front-end/src/features/board/components/card-detail-labels.tsx`
**Depends on**: T12
**Reuses**: `LabelChip`, `CardDetailLabelPopover`
**Requirement**: FCLB-01, FCLB-21

**Tools**:

- MCP: NONE
- Skill: `react-composition-patterns`

**Done when**:

- [ ] Unit: editable with chips → chips in board order then "Adicionar etiqueta"; editable with none → heading and "+" only; read-only with chips → chips and no "+"; read-only with none → nothing rendered; the popover receives the given state and actions
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail labels field`

---

### T14: Compose the labels field into the card detail

**What**: `card-detail.tsx` renders `CardDetailLabels` with `applied`, `isEditable={mode === 'editable'}`, `state.labelPopover` and `actions.labelPopover`.
**Where**: `front-end/src/features/board/components/card-detail.tsx`
**Depends on**: T13
**Reuses**: `renderApp` + MSW detail setup of `card-detail.spec.tsx`
**Requirement**: FCLB-04, FCLB-05, FCLB-08, FCLB-14, FCLB-20, FCLB-21, FCLB-28, FCLB-29

**Tools**:

- MCP: `codegraph`
- Skill: `accessibility`

**Done when**:

- [ ] Unit (L-001): `CardDetailLabels` gets the applied chips and `isEditable` per mode (editable, archived card, archived board); checking a label shows its chip in the detail and on the board tile behind it in board order, unchecking removes both; Esc in the popover (and in its create form) closes only the popover and the detail stays open, a second Esc closes the detail; a failed toggle with the popover open shows a toast whose action is reachable (P3 regression); **Gerenciar etiquetas** with an unsaved title opens "Descartar alterações?" and **Descartar** lands on `/b/{boardId}/labels`; search text alone closes the detail without the dialog; a created label shows in the board label filter
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): edit card labels from the card detail`

---

### T15: Card labels e2e

**What**: Playwright spec against the real API, seeding through the API like `card-checklist.e2e-spec.ts`.
**Where**: `front-end/test/e2e/card-labels.e2e-spec.ts`
**Depends on**: T14
**Reuses**: `card-checklist.e2e-spec.ts` setup helpers
**Requirement**: FCLB-01, FCLB-02, FCLB-04, FCLB-05, FCLB-08, FCLB-09, FCLB-10, FCLB-14, FCLB-15, FCLB-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] E2E: open a card, "+" → search focused; type part of a name → filtered list, "zzz" → "Nenhuma etiqueta encontrada"; check a label → chip on the detail and, after Esc, on the tile; uncheck → gone after reload; **Criar etiqueta** with an existing name → "Já existe uma etiqueta com esse nome neste quadro"; create "Errands" in Laranja → "Etiqueta criada", checked, chip on the tile and listed in the label filter; Esc closes the popover first and the detail second; archived card → chips, no "+"
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the card labels end to end`

---

### T16: Document the card labels

**What**: README bullet(s) on applying, removing and creating labels in the card detail; status line updated.
**Where**: `README.md`
**Depends on**: T15
**Reuses**: Card detail section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] README explains the label popover (search, apply/remove, create, manage link) and the read-only modes
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document the card labels`

---

### T17: Close out the feature in the roadmap

**What**: ROADMAP 4c status → Done; spec traceability → Verified after validation; STATE handoff.
**Where**: `front-end/.specs/ROADMAP.md`
**Depends on**: T16
**Reuses**: Previous feature close-outs
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] ROADMAP shows 4c Done and STATE Handoff points to `labels` (5)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): mark card-labels done`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2
Phase 2:  T3 → T4
Phase 3:  T5 → T6 → T7 → T8 → T9
Phase 4:  T10 → T11 → T12 → T13 → T14
Phase 5:  T15 → T16 → T17
```

Execution is strictly sequential. Each task is its own branch and PR, reviewed before the next starts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Constants + 4 small pure functions, one file | ⚠️ Cohesive (all read the board label list) |
| T2 | 1 function + 3 error codes | ✅ |
| T3, T4 | 1 hook each | ✅ |
| T5–T8 | 1 concern of one view model each | ✅ |
| T9 | 1 composition | ✅ |
| T10 | 1 component (+ 1 export) | ✅ |
| T11, T12 | 1 concern of one component each | ✅ |
| T13 | 1 component | ✅ |
| T14 | 1 composition | ✅ |
| T15 | 1 e2e file | ✅ |
| T16, T17 | Docs | ✅ |

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

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1, T2 | `features/board/model/` | unit | unit | ✅ |
| T3, T4 | `features/board/api/` | unit | unit | ✅ |
| T5–T9 | `features/board/view-models/` | unit | unit | ✅ |
| T10–T14 | `features/board/components/` | unit | unit | ✅ |
| T15 | Running app | e2e | e2e | ✅ |
| T16, T17 | Docs | none | none | ✅ |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FCLB-01 | T11, T13, T15 |
| FCLB-02 | T11, T15 |
| FCLB-03 | T1, T5, T11 |
| FCLB-04 | T1, T3, T6, T14, T15 |
| FCLB-05 | T1, T3, T6, T14, T15 |
| FCLB-06 | T3, T6, T11 |
| FCLB-07 | T6 |
| FCLB-08 | T5, T11, T14, T15 |
| FCLB-09 | T1, T5, T11, T15 |
| FCLB-10 | T5, T11, T15 |
| FCLB-11 | T5 |
| FCLB-12 | T1, T7, T10, T12 |
| FCLB-13 | T4, T8, T10 |
| FCLB-14 | T4, T8, T14, T15 |
| FCLB-15 | T2, T8, T10, T15 |
| FCLB-16 | T7, T10, T12 |
| FCLB-17 | T3, T6 |
| FCLB-18 | T3, T6 |
| FCLB-19 | T3, T6 |
| FCLB-20 | T12, T14 |
| FCLB-21 | T13, T14, T15 |
| FCLB-22 | T8 |
| FCLB-23 | T1, T8 |
| FCLB-24 | T8 |
| FCLB-25 | T8 |
| FCLB-26 | T2, T8 |
| FCLB-27 | T7, T10 |
| FCLB-28 | T9, T14 |
| FCLB-29 | T9, T14 |

**Coverage:** 29 requirements, 29 mapped, 0 unmapped.
