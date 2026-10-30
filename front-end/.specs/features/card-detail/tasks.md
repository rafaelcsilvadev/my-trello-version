# Card Detail Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/card-detail/spec.md`
**Design**: `front-end/.specs/features/card-detail/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, React Router and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `board.cardDetail.*` (or `board.toast.*` / `board.errors.*`) to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js` and the design's i18n table, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). MSW fixtures extend `front-end/test/support/fixtures/board.ts`. Dates in tests are fixed through the `today` the view model reads (`todayParts`), never the machine clock. Composed screens are tested through the rendered screen, asserting what each child receives (lesson L-001).

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-013, the approved design and the spec; existing tests sampled for style: `test/unit/features/board/api/mutations.spec.tsx`, `test/unit/features/board/api/queries.spec.tsx`, `test/unit/features/board/model/due-date.spec.ts`, `test/unit/features/board/view-models/use-board-view-model.spec.tsx`, `test/unit/features/board/components/card-tile.spec.tsx`, `test/unit/features/board/components/move-to-dialog.spec.tsx`, `test/unit/features/board/components/board-screen.spec.tsx`, `test/unit/pages/board-page.spec.tsx`, `test/unit/app/routes.spec.tsx`, `test/e2e/board-filters.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-007) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `shared/ui`, `shared/ui/toast` | unit | Every option and branch the change adds; existing behavior unchanged | `front-end/test/unit/shared/**/*.spec.ts(x)` | `pnpm --filter front-end test` |
| `features/board/model/` | unit | All branches; 1:1 to the ACs they back; boundaries (100/101 title, 4999/5000/5001 description, empty description, mode precedence) | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` | unit (`renderHook` + MSW) | Request sent; every cache patched at once; on failure only this change reverted (FE-AD-010), including an overlapping change; settle refetch once | `front-end/test/unit/features/board/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + data router + MSW) | Every action and derived value; every status; every failure toast path (retry, `409`, `404`, `400`, column archived); drafts kept on failure; blocker on and off | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/`, `pages/`, `app/routes` | unit (Testing Library, plain props; composed screen with `renderApp` + MSW) | Every AC the component owns: roles, names, PT-BR texts, key handling (Enter, Esc, Space), callbacks, visibility per mode, disabled states | `front-end/test/unit/{features/board/components,pages,app}/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Open from tile and by URL, rename, done, due date, description, move, archive → restore → archive → delete, discard dialog, archived board read-only, phone viewport | `front-end/test/e2e/card-detail.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Shared pieces, model and card query

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Card mutations and view model

```
T7 → T8 → T9 → T10 → T11 → T12 → T13
```

### Phase 3: Detail components

```
T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 4: Shell, wiring and delivery

```
T20 → T21 → T22 → T23 → T24 → T25 → T26 → T27
```

---

## Task Breakdown

### T1: Export the optimistic pipeline helpers

**What**: Export `useOptimisticBoardViewChange`, `removal`, `CacheChange` and `ItemVariables` from `mutations.ts` so other files of the board feature can build changes on them. No behavior change.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: None
**Reuses**: `mutations.ts:22-33`, `:301-345`
**Requirement**: none (enables FCD-13, FCD-33, FCD-35, FCD-38)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`, `safe-refactor`

**Done when**:

- [x] The four names are exported; no other change in `mutations.ts`
- [x] `mutations.spec.tsx` passes unchanged
- [x] Build gate passes; test count unchanged

**Tests**: unit
**Gate**: build

**Commit**: `refactor(front-end): export the board optimistic change helpers`

---

### T2: Conflict message option in the save-failure notifier

**What**: `NotifyOptions` gains `conflictMessage?: string`; a `409` shows it instead of `errors.conflict`, still with **Recarregar**.
**Where**: `front-end/src/shared/ui/toast/use-save-failure-notifier.ts`
**Depends on**: T1
**Reuses**: Existing `notify` switch
**Requirement**: FCD-51

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `409` with `conflictMessage` shows that text and **Recarregar**; `409` without it shows the generic conflict text; `runChange` passes the option through on retry
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): let the save-failure notifier override the conflict text`

---

### T3: Card query key and `useCardDetail`

**What**: `boardViewKeys.card(boardId, cardId)`; `useCardDetail(boardId, cardId)` loads `GET /api/v1/cards/{id}`, seeded from `cards(boardId, false|true)` with `initialDataUpdatedAt`, `gcTime: 0`.
**Where**: `front-end/src/features/board/api/card-detail-queries.ts` (and the key in `keys.ts`)
**Depends on**: T2
**Reuses**: `queries.ts` patterns, `boardViewKeys`
**Requirement**: FCD-09, FCD-10, FCD-11

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: fetches the card; returns the seeded card at once when it is in the active or archived board list and still refetches; `404` surfaces as `ApiError` status 404 with no retry; network error retries; the key is under `all(boardId)` (board invalidation refetches it)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail query`

---

### T4: Detail mode and card list lookup

**What**: `cardDetailMode(card, board, list)` and `findCardList(card, lists)` in the card-detail model.
**Where**: `front-end/src/features/board/model/card-detail.ts`
**Depends on**: T3
**Reuses**: `model/types.ts`
**Requirement**: FCD-11, FCD-34, FCD-39, FCD-40, FCD-41

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `editable` for active card on active board; `archivedCard` for archived card; `archivedBoard` for any card of an archived board, archived card included; `findCardList` finds active and archived lists and returns `undefined` for a list of another board
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail mode rules`

---

### T5: Description and dirty rules

**What**: `isDescriptionTooLong`, `descriptionBody`, `isDirty(card, drafts)` and `nextPosition(cards, listId)` in the card-detail model.
**Where**: `front-end/src/features/board/model/card-detail.ts`
**Depends on**: T4
**Reuses**: `model/columns.ts` `byPosition`
**Requirement**: FCD-24, FCD-26, FCD-27, FCD-36, FCD-42, FCD-53

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: 4999 and 5000 chars allowed, 5001 too long; empty draft → `null`, spaces-only draft kept as is; dirty when trimmed title differs or description differs (`null` description equals empty draft); not dirty with `null` drafts or a title that differs only by outer spaces; `nextPosition` is max active position + 1, `0` for an empty column
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card description and unsaved-edit rules`

---

### T6: `useUpdateCard`

**What**: Optimistic `PATCH /api/v1/cards/{id}` with a partial `UpdateCardDto`, patching the card query and both board card lists, reverting only the fields it changed.
**Where**: `front-end/src/features/board/api/card-mutations.ts`
**Depends on**: T5
**Reuses**: `useOptimisticBoardViewChange` (T1)
**Requirement**: FCD-13, FCD-16, FCD-21, FCD-23, FCD-26, FCD-47, FCD-52

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: sends the body; card query and `cards(b, false)` show the new values before the response; failure reverts only the changed fields; two overlapping updates of different fields — first fails — keep the second; one settle refetch after the last change
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the optimistic card update`

---

### T7: `useArchiveCard` and `useRestoreCard`

**What**: Optimistic archive and restore: card query `archivedAt`, move between `cards(b, false)` and `cards(b, true)`; restore appends at `nextPosition`.
**Where**: `front-end/src/features/board/api/card-mutations.ts`
**Depends on**: T6
**Reuses**: `removal` (T1), `nextPosition` (T5)
**Requirement**: FCD-33, FCD-35, FCD-36, FCD-47, FCD-52

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: archive removes from the active list, prepends to the archived list (when loaded) and sets `archivedAt` on the card query; restore does the reverse and puts the card last in its column; each failure puts back only that card at its old index
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add optimistic card archive and restore`

---

### T8: `useDeleteCard`

**What**: Optimistic `DELETE /api/v1/cards/{id}` removing the card from `cards(b, true)`.
**Where**: `front-end/src/features/board/api/card-mutations.ts`
**Depends on**: T7
**Reuses**: `removal` (T1)
**Requirement**: FCD-38, FCD-47

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: sends the request; the archived list drops the card at once; failure puts it back at its index; the card query is not patched
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add optimistic card delete`

---

### T9: `useMoveCard` patches the card query

**What**: `useMoveCard` adds a `CacheChange` on `card(boardId, id)` setting `listId` and reverting it.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: T8
**Reuses**: Existing `useMoveCard`
**Requirement**: FCD-32

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: with a cached card query, a move updates its `listId` at once and a failure restores it; without a cached card query nothing breaks; existing move tests pass unchanged
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): keep the card detail column in step with moves`

---

### T10: Card detail view model: load status, mode and labels

**What**: `useCardDetailViewModel(boardId, cardId)` returns `status`, `card`, `list`, `mode`, `isColumnArchived`, applied `labels` in board order, `today`, `activeLists` and `retryLoad`.
**Where**: `front-end/src/features/board/view-models/use-card-detail-view-model.ts`
**Depends on**: T9
**Reuses**: `useCardDetail` (T3), `useBoard`, `useLists`, `useLabels`, `cardDetailMode`/`findCardList` (T4), `todayParts`
**Requirement**: FCD-06, FCD-09, FCD-10, FCD-11, FCD-29, FCD-34, FCD-39, FCD-40, FCD-41

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `loading` while any query is pending; `error` on a failed load with no data and `retryLoad` refetches only failed queries; `notFound` on `404` and on a card whose list is not of the board; `mode` per T4; `list` resolves archived columns; labels follow board label order and skip unknown ids
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail view model`

---

### T11: View model: field edits

**What**: `toggleDone`, title draft (`setTitleDraft`, `submitTitle`, `cancelTitle`, `titleError`), `setDueDate`, `removeDueDate`, description draft (`setDescriptionDraft`, `saveDescription`, `cancelDescription`, `descriptionError`), `isDirty`.
**Where**: `front-end/src/features/board/view-models/use-card-detail-view-model.ts`
**Depends on**: T10
**Reuses**: `useUpdateCard` (T6), `validateCardTitle`, `mapTitleServerError`, `useSaveFailureNotifier`, T5 rules
**Requirement**: FCD-13, FCD-16, FCD-17, FCD-18, FCD-19, FCD-20, FCD-21, FCD-23, FCD-26, FCD-27, FCD-28, FCD-47, FCD-48, FCD-49, FCD-50, FCD-53

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: each action sends the exact body of its AC; unchanged trimmed title sends nothing; empty / 101-char title sets the error and sends nothing, 100 chars saves; `cancelTitle` restores and clears the error; description over 5000 sets the error and `saveDescription` sends nothing; empty description sends `null`; a failed title or description save restores the typed draft; title `400` maps to the field error with no toast; network failure toasts with retry, `409` with Recarregar, `404` toasts and refetches; done/title/due/description success shows no toast
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): edit card fields from the detail view model`

---

### T12: View model: move, archive, restore, delete

**What**: `openMove`/`closeMove`/`moveTo`, `archive`, `restore`, `askDelete`/`cancelDelete`/`confirmDelete`, `isPending`.
**Where**: `front-end/src/features/board/view-models/use-card-detail-view-model.ts`
**Depends on**: T11
**Reuses**: `useMoveCard` (T9), T7/T8 mutations, `usePendingItemIds`, `conflictMessage` (T2)
**Requirement**: FCD-31, FCD-32, FCD-33, FCD-35, FCD-37, FCD-38, FCD-47, FCD-51

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `moveTo` sends the end position of the chosen column, toasts "Tarefa movida para {col}", sends nothing for the current column and closes the dialog; archive toasts "Tarefa arquivada" and `mode` becomes `archivedCard` at once; restore toasts "Tarefa restaurada" and `mode` becomes `editable`; `confirmDelete` sends the delete, navigates to `/b/{boardId}`, removes the card query and toasts "Tarefa excluída definitivamente"; restore/delete `409` toast the column-archived text; move failure toasts "Não foi possível mover a tarefa"; `isPending` is true while a change on the card is in flight
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): move, archive, restore and delete from the card detail`

---

### T13: View model: close and discard

**What**: `close()` navigates to `/b/{boardId}`; `useBlocker` blocks while dirty and editable; `isDiscardOpen`, `discard`, `keepEditing`.
**Where**: `front-end/src/features/board/view-models/use-card-detail-view-model.ts`
**Depends on**: T12
**Reuses**: React Router `useNavigate`, `useBlocker` (verified in design)
**Requirement**: FCD-07, FCD-42, FCD-43, FCD-44, FCD-45

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (data router): close with no drafts navigates; close with a dirty title or description opens the discard state; browser back (`navigate(-1)`) while dirty is blocked too; `discard` completes the navigation without sending; `keepEditing` stays with drafts intact; read-only modes never block; `confirmDelete` is never blocked
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): ask before closing a card detail with unsaved edits`

---

### T14: Card detail skeleton and not-found block

**What**: `CardDetailSkeleton` (field placeholders) and `CardDetailNotFound` ("Esta tarefa não existe mais" + **Fechar** calling `onClose`).
**Where**: `front-end/src/features/board/components/card-detail-states.tsx`
**Depends on**: T13
**Reuses**: `board-skeleton.tsx`, `board-not-found.tsx` styles
**Requirement**: FCD-09, FCD-11

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: skeleton has `aria-busy` and no field controls; not-found shows the PT-BR text and **Fechar** calls `onClose`
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail loading and not-found states`

---

### T15: Title and done component

**What**: `CardDetailTitle`: "Concluída" checkbox, title input with Enter/blur/Esc, badges "Concluída" / "Atrasada", field error, disabled state.
**Where**: `front-end/src/features/board/components/card-detail-title.tsx`
**Depends on**: T14
**Reuses**: `shared/ui/checkbox`, `shared/ui/text-field` input classes, `isOverdue`
**Requirement**: FCD-13, FCD-14, FCD-15, FCD-16, FCD-18, FCD-19, FCD-20, FCD-46

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: checkbox named "Concluída" calls `onToggleDone`; badge "Concluída" only when done; "Atrasada" only when not done and due before today; Enter and blur call `onSubmit`; Esc calls `onCancel`, prevents default and stops propagation; error text shows under the field with `aria-invalid`; `isDisabled` disables checkbox and input
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail title and done flag`

---

### T16: Due date component

**What**: `CardDetailDueDate`: native date input labelled "Prazo" and "Remover prazo" while a due date is set.
**Where**: `front-end/src/features/board/components/card-detail-due-date.tsx`
**Depends on**: T15
**Reuses**: `shared/ui/text-field` input classes, `Button`
**Requirement**: FCD-21, FCD-22, FCD-23

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: shows the current `YYYY-MM-DD`; changing it calls `onChange` with the new value; clearing the native input does not call `onChange`; "Remover prazo" shows only with a due date and calls `onRemove`; disabled state disables both
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail due date field`

---

### T17: Description component

**What**: `CardDetailDescription`: textarea with "{n} / 5000", error, **Salvar** / **Cancelar** while dirty, **Salvar** disabled when too long.
**Where**: `front-end/src/features/board/components/card-detail-description.tsx`
**Depends on**: T16
**Reuses**: `shared/ui/text-area-field` (`counter`, `error`), `Button`
**Requirement**: FCD-24, FCD-25, FCD-26, FCD-27, FCD-28

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: counter reads "0 / 5000" for an empty value and follows typing; buttons hidden when not dirty; **Salvar** calls `onSave`, **Cancelar** calls `onCancel`; with the error **Salvar** is disabled and "Use até 5000 caracteres" shows; disabled state disables the textarea
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail description field`

---

### T18: Read-only notices

**What**: `CardDetailNotices`: "Tarefa arquivada · somente leitura", "Quadro arquivado · somente leitura", and the column-archived notice, by mode.
**Where**: `front-end/src/features/board/components/card-detail-notices.tsx`
**Depends on**: T17
**Reuses**: `shared/ui/alert`, `archived-board-banner.tsx` style
**Requirement**: FCD-34, FCD-39, FCD-40, FCD-41

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `editable` renders nothing; `archivedCard` shows the card notice, plus the column notice when `isColumnArchived`; `archivedBoard` shows only the board notice, even for an archived card in an archived column
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail read-only notices`

---

### T19: Footer

**What**: `CardDetailFooter`: "Criada em {date}" and the actions per mode, with disabled states.
**Where**: `front-end/src/features/board/components/card-detail-footer.tsx`
**Depends on**: T18
**Reuses**: `formatShortDate`, `Button`
**Requirement**: FCD-30, FCD-31, FCD-33, FCD-34, FCD-35, FCD-37, FCD-39, FCD-40

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: date in PT-BR and EN format; `editable` shows **Mover para…** and **Arquivar** wired to their callbacks; `archivedCard` shows **Restaurar** and **Excluir definitivamente**, both disabled when `isColumnArchived` or `isPending`; `archivedBoard` shows only the date
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail footer`

---

### T20: Delete and discard dialogs

**What**: `DeleteCardDialog` and `DiscardChangesDialog` on `shared/ui/dialog` with `role="alertdialog"`.
**Where**: `front-end/src/features/board/components/card-detail-dialogs.tsx`
**Depends on**: T19
**Reuses**: `shared/ui/dialog`, `delete-column-dialog.tsx`
**Requirement**: FCD-37, FCD-42, FCD-43, FCD-44

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: delete dialog shows "Excluir a tarefa definitivamente?", the text and **Cancelar** / **Excluir definitivamente** wired to callbacks; discard dialog shows "Descartar alterações?", "Você tem edições não salvas.", **Continuar editando** / **Descartar**; Esc in each calls the cancel / keep-editing callback
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card delete and discard dialogs`

---

### T21: Card detail shell

**What**: `CardDetail`: React Aria modal (`aria-modal`, dismissable), phone full screen / desktop panel, header with column name, X "Fechar" and back arrow "Voltar", status switch, body composing T15–T19 and the applied label chips, nested `MoveToDialog`, delete and discard dialogs. Exported from `features/board/index.ts`.
**Where**: `front-end/src/features/board/components/card-detail.tsx`
**Depends on**: T20
**Reuses**: `useCardDetailViewModel` (T10–T13), T14–T20, `LabelChip`, `MoveToDialog`, `LoadError`
**Requirement**: FCD-03, FCD-04, FCD-06, FCD-07, FCD-10, FCD-29, FCD-31, FCD-45, FCD-46

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (rendered with `renderApp` + MSW, L-001): dialog has `aria-modal="true"`; header shows the column name; X and back arrow carry their names and responsive classes; X, back arrow, Esc and backdrop each navigate to `/b/{boardId}`; Esc in the title restores it and keeps the dialog; Esc in the move, delete and discard dialogs closes only that dialog; load error shows **Tentar novamente**; each child receives the mode-derived `isDisabled`, drafts, errors and callbacks; label chips in board order
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card detail modal`

---

### T22: Nested card route

**What**: `t/:cardId` becomes a child of `b/:boardId`; `BoardPage` renders `<Outlet />`; new `CardDetailPage` renders `<CardDetail key={cardId} />`. Removes the card placeholder route.
**Where**: `front-end/src/app/routes.tsx` (plus `src/pages/board-page.tsx`, new `src/pages/card-detail-page.tsx`)
**Depends on**: T21
**Reuses**: Existing route tree, `PlaceholderPage` removal for `card`
**Requirement**: FCD-05, FCD-12

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `/b/{id}/t/{cardId}` renders the board and the detail; closing keeps the same `BoardScreen` instance (a filter typed before opening is still there after closing); `n` and `/` do nothing while the detail is open; unknown card id shows the not-found block over the board; routes spec updated
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): route cards as a child of the board`

---

### T23: Card tile opens the detail

**What**: `CardTile` gains `onOpen`: always a focusable `role="button"` with `data-card-id` when given; click opens unless inside the checkbox or menu; Enter opens unless the card is lifted.
**Where**: `front-end/src/features/board/components/card-tile.tsx`
**Depends on**: T22
**Reuses**: Existing `onKeyDown`, `movable`
**Requirement**: FCD-01, FCD-02

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: click and Enter call `onOpen(card.id)` for active, archived and read-only tiles; clicking the checkbox or the menu button does not; Enter while lifted drops and does not open; Space still picks; archived and read-only tiles are focusable; existing tile tests pass
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): open the card detail from a card tile`

---

### T24: Board screen wires card opening and focus return

**What**: `BoardScreen` passes `onOpenCard` (`navigate('/b/{boardId}/t/{cardId}')`) through `BoardColumns` → `BoardColumn` / `ArchivedCardsColumn` → `CardTile`; `CardDetail` focuses `[data-card-id]` on close.
**Where**: `front-end/src/features/board/components/board-screen.tsx` (plus `board-columns.tsx`, `board-column.tsx`, `archived-cards-column.tsx`, `card-detail.tsx`)
**Depends on**: T23
**Reuses**: `useNavigate`
**Requirement**: FCD-01, FCD-02, FCD-08

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (rendered board, L-001): clicking an active tile, an archived tile ("Mostrar arquivadas" on) and a tile of an archived board opens the detail URL; each column and the archived column pass `onOpen` to every tile; after Esc, focus is on the tile of the closed card; direct URL close focuses the tile too
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): open cards from the board and return focus on close`

---

### T25: Card detail e2e

**What**: Playwright spec against the real API and seed.
**Where**: `front-end/test/e2e/card-detail.e2e-spec.ts`
**Depends on**: T24
**Reuses**: `board-filters.e2e-spec.ts` setup helpers
**Requirement**: FCD-01, FCD-03, FCD-04, FCD-05, FCD-11, FCD-16, FCD-21, FCD-26, FCD-32, FCD-33, FCD-35, FCD-36, FCD-38, FCD-40, FCD-42, FCD-52

**Tools**:

- MCP: `claude-in-chrome` (manual check only)
- Skill: `pair-programming`, `playwright-skill`

**Done when**:

- [ ] E2E: open from tile → rename, tick done, set and remove due date, save description → close and the tile shows the values; reopen shows them after reload; Mover para… updates the header; archive → restore puts the card last → archive → delete; dirty description + Esc → discard dialog; archived board card is read-only; 375 px viewport shows full screen with "Voltar"; URL of a deleted card shows "Esta tarefa não existe mais"
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the card detail end to end`

---

### T26: Document the card detail

**What**: README section on opening a card, editing fields, archive/restore/delete and the discard dialog; status line updated.
**Where**: `README.md`
**Depends on**: T25
**Reuses**: Existing board sections
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains the card detail and its read-only modes
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document the card detail`

---

### T27: Close out the feature in the roadmap

**What**: ROADMAP 4a status → Done; spec traceability → Verified after validation; STATE handoff.
**Where**: `front-end/.specs/ROADMAP.md`
**Depends on**: T26
**Reuses**: Previous feature close-outs
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] ROADMAP shows 4a Done and STATE Handoff points to `card-checklist` (4b)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): mark card-detail done`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13
Phase 3:  T14 → T15 → T16 → T17 → T18 → T19 → T20
Phase 4:  T21 → T22 → T23 → T24 → T25 → T26 → T27
```

Execution is strictly sequential. Each task is its own branch and PR (pair-programming), reviewed before the next starts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Exports only | ✅ |
| T2 | 1 option | ✅ |
| T3 | 1 hook + 1 key | ✅ |
| T4 | 2 related functions, one file | ⚠️ Cohesive (mode needs the list lookup) |
| T5 | 4 small rules, one file | ⚠️ Cohesive (all feed the drafts and restore) |
| T6 | 1 hook | ✅ |
| T7 | 2 mirror hooks, one file | ⚠️ Cohesive (each is the other's reverse) |
| T8 | 1 hook | ✅ |
| T9 | 1 patch in one hook | ✅ |
| T10–T13 | 1 concern of one view model each | ✅ |
| T14 | 2 tiny state blocks, one file | ⚠️ Cohesive (both replace the body by status) |
| T15–T19 | 1 component each | ✅ |
| T20 | 2 confirmation dialogs, one file | ⚠️ Cohesive (same shape on `shared/ui/dialog`) |
| T21 | 1 component composition | ✅ |
| T22 | 1 route change (route + page + outlet) | ⚠️ Cohesive (none works without the others) |
| T23 | 1 concern of `CardTile` | ✅ |
| T24 | 1 prop threaded through the board | ⚠️ Cohesive (one callback, no new logic per file) |
| T25 | 1 e2e file | ✅ |
| T26, T27 | Docs | ✅ |

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
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | T24 | T24 → T25 | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `features/board/api/` | unit | unit | ✅ |
| T2 | `shared/ui/toast` | unit | unit | ✅ |
| T3 | `features/board/api/` | unit | unit | ✅ |
| T4, T5 | `features/board/model/` | unit | unit | ✅ |
| T6–T9 | `features/board/api/` | unit | unit | ✅ |
| T10–T13 | `features/board/view-models/` | unit | unit | ✅ |
| T14–T21 | `features/board/components/` | unit | unit | ✅ |
| T22 | `app/routes`, `pages/` | unit | unit | ✅ |
| T23, T24 | `features/board/components/` | unit | unit | ✅ |
| T25 | Running app | e2e | e2e | ✅ |
| T26, T27 | Docs | none | none | ✅ |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FCD-01 | T23, T24, T25 |
| FCD-02 | T23, T24 |
| FCD-03 | T21, T25 |
| FCD-04 | T21, T25 |
| FCD-05 | T22, T25 |
| FCD-06 | T10, T21 |
| FCD-07 | T13, T21 |
| FCD-08 | T24 |
| FCD-09 | T3, T10, T14 |
| FCD-10 | T3, T10, T21 |
| FCD-11 | T3, T4, T10, T14, T25 |
| FCD-12 | T22 |
| FCD-13 | T6, T11, T15 |
| FCD-14 | T15 |
| FCD-15 | T15 |
| FCD-16 | T6, T11, T15, T25 |
| FCD-17 | T11 |
| FCD-18 | T11, T15 |
| FCD-19 | T11, T15 |
| FCD-20 | T11, T15 |
| FCD-21 | T6, T11, T16, T25 |
| FCD-22 | T16 |
| FCD-23 | T6, T11, T16 |
| FCD-24 | T5, T17 |
| FCD-25 | T17 |
| FCD-26 | T5, T6, T11, T17, T25 |
| FCD-27 | T5, T11, T17 |
| FCD-28 | T11, T17 |
| FCD-29 | T10, T21 |
| FCD-30 | T19 |
| FCD-31 | T12, T19, T21 |
| FCD-32 | T9, T12, T25 |
| FCD-33 | T7, T12, T19, T25 |
| FCD-34 | T4, T10, T18, T19 |
| FCD-35 | T7, T12, T19, T25 |
| FCD-36 | T5, T7, T25 |
| FCD-37 | T12, T19, T20 |
| FCD-38 | T8, T12, T25 |
| FCD-39 | T4, T10, T18, T19 |
| FCD-40 | T4, T10, T18, T19, T25 |
| FCD-41 | T4, T10, T18 |
| FCD-42 | T5, T13, T20, T25 |
| FCD-43 | T13, T20 |
| FCD-44 | T13, T20 |
| FCD-45 | T13, T21 |
| FCD-46 | T15, T21 |
| FCD-47 | T6, T7, T8, T11, T12 |
| FCD-48 | T11 |
| FCD-49 | T11 |
| FCD-50 | T11 |
| FCD-51 | T2, T12 |
| FCD-52 | T6, T7, T25 |
| FCD-53 | T5, T11 |

**Coverage:** 53 total, 53 mapped to tasks, 0 unmapped.
