# Card Checklist Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/card-checklist/spec.md`
**Design**: `front-end/.specs/features/card-checklist/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `board.cardDetail.checklist.*` or `board.fieldErrors.*` to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js` and the design's i18n table, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). MSW fixtures extend `front-end/test/support/fixtures/board.ts` with a `checklistItem()` builder. Composed screens are tested through the rendered screen, asserting what each child receives (lesson L-001).

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-013, the approved design and the spec; existing tests sampled for style: `test/unit/features/board/api/card-mutations.spec.tsx`, `test/unit/features/board/api/create-mutations.spec.tsx`, `test/unit/features/board/api/card-detail-queries.spec.tsx`, `test/unit/features/board/model/card-detail.spec.ts`, `test/unit/features/board/model/validation.spec.ts`, `test/unit/features/board/view-models/use-card-detail-view-model.spec.tsx`, `test/unit/features/board/components/card-detail.spec.tsx`, `test/e2e/card-detail.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-007) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `features/board/model/` | unit | All branches; 1:1 to the ACs they back; boundaries (0/1/200/201 chars after trim, empty checklist, all done) | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` | unit (`renderHook` + MSW) | Request sent; every cache patched at once; on failure only this change reverted (FE-AD-010), including an overlapping change; settle refetch once; create appends only on success | `front-end/test/unit/features/board/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + data router + MSW) | Every action and derived value; every status; every failure toast path (retry, `409`, `404`); drafts and add text kept on failure; dirty on and off | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; composed detail with `renderApp` + MSW) | Every AC the component owns: roles, names, PT-BR texts, key handling (Enter, Esc), callbacks, visibility per mode, disabled states, focus | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Add, tick, rename, delete with the tile badge updated; validation messages; discard dialog for an item edit; archived card read-only | `front-end/test/e2e/card-checklist.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Shared helpers, model and query

```
T1 → T2 → T3 → T4
```

### Phase 2: Mutations

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: View models

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 4: Components

```
T14 → T15 → T16 → T17 → T18
```

### Phase 5: Delivery

```
T18 → T19 → T20 → T21
```

---

## Task Breakdown

### T1: Generic field patch helpers

**What**: Move `fieldsPatch` and `inList` from `card-mutations.ts` to `mutations.ts`, next to `removal`, generic over `T extends { id: string }`, and export them. No behavior change.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: None
**Reuses**: `card-mutations.ts:126-153`
**Requirement**: none (enables FCL-16, FCL-18)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`, `safe-refactor`

**Done when**:

- [x] `card-mutations.ts` imports the moved helpers; no other change in behavior
- [x] `card-mutations.spec.tsx` and `mutations.spec.tsx` pass unchanged
- [x] Build gate passes; test count unchanged

**Tests**: unit
**Gate**: build

**Commit**: `refactor(front-end): share the field patch helpers of the board cache`

---

### T2: Checklist model rules

**What**: Contract aliases `ChecklistItem`, `CreateChecklistItemDto`, `UpdateChecklistItemDto` in `model/types.ts`; `checklistProgress`, `sortItems` and `isChecklistDirty` in a new `model/checklist.ts`.
**Where**: `front-end/src/features/board/model/checklist.ts`
**Depends on**: T1
**Reuses**: `model/columns.ts` `byPosition`
**Requirement**: FCL-01, FCL-05, FCL-06, FCL-07, FCL-27, FCL-29

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: progress of 0 items is `{ done: 0, total: 0, percent: 0, isComplete: false }`; 2 of 3 → 67 %; 3 of 3 → 100 % and complete; 1 of 3 → 33 %; `sortItems` orders by `position` without mutating the input; dirty only when a draft's trimmed text differs from its item's text; a draft for an unknown id or equal after trim is not dirty
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the checklist progress and unsaved-edit rules`

---

### T3: Checklist item text validation

**What**: `validateChecklistItemText(raw)` in `model/validation.ts` (shared `validateTitle` gains a `max` parameter); `ItemFieldError` gains `checklistItemRequired` and `checklistItemTooLong`; their `board.fieldErrors.*` texts in EN and PT-BR.
**Where**: `front-end/src/features/board/model/validation.ts`
**Depends on**: T2
**Reuses**: `validateTitle`
**Requirement**: FCL-13, FCL-14, FCL-20, FCL-21, FCL-40

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `""` and `"   "` → `checklistItemRequired`; 200 chars → `null`; 200 chars with outer spaces → `null`; 201 chars → `checklistItemTooLong`; column and card title rules unchanged (100/101)
- [x] PT-BR texts are "Escreva o item" and "Use até 200 caracteres"; the locale key parity test passes
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): validate checklist item text`

---

### T4: Checklist query

**What**: `boardViewKeys.checklist(boardId, cardId)`; `useChecklistItems(boardId, cardId)` loads `GET /api/v1/cards/{cardId}/checklist-items` with `select: sortItems` and `gcTime: 0`. Adds the `checklistItem()` fixture builder.
**Where**: `front-end/src/features/board/api/checklist-queries.ts` (and the key in `keys.ts`)
**Depends on**: T3
**Reuses**: `card-detail-queries.ts` pattern
**Requirement**: FCL-01, FCL-03, FCL-04

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: fetches the items of the card and returns them sorted by `position` from an unsorted response; `404` surfaces as `ApiError` status 404; the key is under `all(boardId)` (a board invalidation refetches it) and not under `card(boardId, cardId)`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the checklist items query`

---

### T5: Card progress change

**What**: `progressChange(boardId, cardId, delta)` returns the `CacheChange`s that add a `{ total, done }` delta to `card.checklist` in the card query and in the active and archived card lists, and subtract the same delta on revert.
**Where**: `front-end/src/features/board/api/checklist-mutations.ts`
**Depends on**: T4
**Reuses**: `CacheChange`, generic `inList` (T1)
**Requirement**: FCL-39

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `apply` adds the delta only to the matching card in each of the three caches; `revert` subtracts it; two overlapping deltas reverted out of order leave the other's change in place; a delta read lazily (function) is the one applied and reverted
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): keep the card checklist progress in step with its items`

---

### T6: Create checklist item

**What**: `useCreateChecklistItem(boardId, cardId)` — not optimistic; on `201` appends the item to the checklist cache, applies `progressChange(+1 total)` and invalidates the checklist key.
**Where**: `front-end/src/features/board/api/checklist-mutations.ts`
**Depends on**: T5
**Reuses**: `create-mutations.ts` `appendThenInvalidate` pattern
**Requirement**: FCL-10, FCL-12, FCL-38, FCL-39

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: sends `POST` with `{ text }`; nothing changes in any cache while in flight; on success the item is last in the checklist cache and the card's `total` grew by 1 in the three caches; on `409`/`5xx` no cache changed and the error is an `ApiError`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): create checklist items`

---

### T7: Update checklist item

**What**: `useUpdateChecklistItem(boardId, cardId)` on `useOptimisticBoardViewChange`: patches `text`/`done` of the item in the checklist cache and, when `done` is in the body, `progressChange(done ±1)`.
**Where**: `front-end/src/features/board/api/checklist-mutations.ts`
**Depends on**: T6
**Reuses**: `useOptimisticBoardViewChange`, generic `fieldsPatch`/`inList`
**Requirement**: FCL-16, FCL-18, FCL-34, FCL-35, FCL-36

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `PATCH` body is the given body; the item shows the new `text`/`done` at once; ticking adds 1 to `done`, unticking removes 1, a text-only change leaves the progress alone; on failure only this change is reverted (an overlapping text edit of the same item survives a failed toggle); the board is refetched once after the last change settles; the mutation's `id` is the item id
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): update checklist items optimistically`

---

### T8: Delete checklist item

**What**: `useDeleteChecklistItem(boardId, cardId)` on `useOptimisticBoardViewChange`: `removal` on the checklist cache, then `progressChange(total −1, done −1 when the removed item was done)`.
**Where**: `front-end/src/features/board/api/checklist-mutations.ts`
**Depends on**: T7
**Reuses**: `removal`, `progressChange`
**Requirement**: FCL-24, FCL-34, FCL-35, FCL-36

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: sends `DELETE`; the item leaves the cache at once; deleting a done item lowers `total` and `done`, a not-done item only `total`; on failure the item returns at its index and the progress is restored
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): delete checklist items optimistically`

---

### T9: Checklist view model — load and progress

**What**: `useCardChecklistViewModel(boardId, cardId)` with `query`, `state.status` (`loading` / `error` / `ready`), `state.items`, `state.progress` and `actions.retryLoad`.
**Where**: `front-end/src/features/board/view-models/use-card-checklist-view-model.ts`
**Depends on**: T8
**Reuses**: `useChecklistItems`, `checklistProgress`
**Requirement**: FCL-01, FCL-02, FCL-03, FCL-05, FCL-06, FCL-07

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `loading` before the response; `ready` with sorted items and their progress; `error` on `5xx` and `retryLoad` refetches only the checklist and reaches `ready`; progress follows the cache after a toggle
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the checklist view model`

---

### T10: Checklist view model — add item

**What**: `state.newText`, `state.isCreating`, `state.error` for target `'new'`; `actions.setNewText` and `actions.add`.
**Where**: `front-end/src/features/board/view-models/use-card-checklist-view-model.ts`
**Depends on**: T9
**Reuses**: `useCreateChecklistItem`, `validateChecklistItemText`, `useSaveFailureNotifier`
**Requirement**: FCL-10, FCL-11, FCL-12, FCL-13, FCL-14, FCL-15, FCL-35, FCL-38

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `add` sends the trimmed text; a second `add` while in flight sends nothing and keeps the text; `201` clears `newText`; empty → `checklistItemRequired` and 201 chars → `checklistItemTooLong` with no request; typing clears the error; `5xx` keeps the text and shows the save-fail toast whose **Tentar novamente** resends the same text; `409` shows the conflict toast with **Recarregar**
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add checklist items from the view model`

---

### T11: Checklist view model — tick and pending items

**What**: `actions.toggle(id)` and `state.pendingIds` (from `usePendingItemIds`).
**Where**: `front-end/src/features/board/view-models/use-card-checklist-view-model.ts`
**Depends on**: T10
**Reuses**: `useUpdateChecklistItem`, `runChange`
**Requirement**: FCL-16, FCL-17, FCL-34, FCL-35, FCL-36

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `toggle` sends the opposite `done` and saves silently (no toast); the item id is in `pendingIds` while in flight and leaves it on settle; `5xx` → save-fail toast with retry; `409` → conflict toast; `404` → save-fail toast and the checklist is refetched
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): tick checklist items from the view model`

---

### T12: Checklist view model — edit item text

**What**: `state.drafts`, `state.error` for an item; `actions.setDraft`, `actions.submitDraft`, `actions.cancelDraft`.
**Where**: `front-end/src/features/board/view-models/use-card-checklist-view-model.ts`
**Depends on**: T11
**Reuses**: `submitTitle` / `saveDraft` flow of `useCardDetailViewModel`, `validateChecklistItemText`
**Requirement**: FCL-18, FCL-19, FCL-20, FCL-21, FCL-22, FCL-37, FCL-40

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `submitDraft` sends the trimmed text and clears the draft; equal text after trim sends nothing and clears the draft; empty or 201 chars → error for that item, draft kept, nothing sent; exactly 200 chars is sent; `cancelDraft` clears the draft and the error; a failed save puts the typed text back as that item's draft while another item's draft is untouched; typing clears the error
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): edit checklist item text from the view model`

---

### T13: Checklist view model — delete item and dirty flag

**What**: `actions.remove(id)` (also drops that item's draft and error) and `isDirty`.
**Where**: `front-end/src/features/board/view-models/use-card-checklist-view-model.ts`
**Depends on**: T12
**Reuses**: `useDeleteChecklistItem`, `isChecklistDirty`
**Requirement**: FCL-24, FCL-27, FCL-29, FCL-34, FCL-35, FCL-36

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `remove` sends `DELETE` silently; failures follow the three toast paths; `isDirty` is true with a changed item draft, false with only `newText`, false after `cancelDraft` or `remove`
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): delete checklist items from the view model`

---

### T14: Card detail view model composes the checklist

**What**: `useCardDetailViewModel` calls `useCardChecklistViewModel`; a `404` on the checklist sets `status = 'notFound'`; `isDirty` and the discard blocker include the checklist; returns `state.checklist` and `actions.checklist`. Every existing detail test setup answers `GET …/checklist-items` (`[]` by default).
**Where**: `front-end/src/features/board/view-models/use-card-detail-view-model.ts`
**Depends on**: T13
**Reuses**: existing `status` and `useBlocker` logic
**Requirement**: FCL-04, FCL-27, FCL-28, FCL-29

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: checklist `404` → `notFound`; checklist `5xx` keeps the detail `ready`; a changed item draft makes `isDirty` true and a close navigation is blocked; text only in the add field does not block; read-only modes never block
- [ ] `card-detail.spec.tsx`, `use-card-detail-view-model.spec.tsx`, `card-detail-page.spec.tsx` and `board-screen.spec.tsx` setups answer the checklist request; no MSW unhandled-request warning in the run
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): compose the checklist into the card detail view model`

---

### T15: Checklist item row

**What**: `CardDetailChecklistItem`: checkbox named by the text, text field "Editar item “{text}”" with Enter / blur / Esc, delete button "Excluir item “{text}”", done style, pending and disabled states. Adds the `editItem` and `deleteItem` keys.
**Where**: `front-end/src/features/board/components/card-detail-checklist-item.tsx`
**Depends on**: T14
**Reuses**: `Checkbox`, `Button`, `CardDetailTitle` field pattern
**Requirement**: FCL-08, FCL-09, FCL-17, FCL-22, FCL-23, FCL-30, FCL-31, FCL-32

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: the three names with the saved text; the field shows the draft when given; Enter and blur call `onSubmit`; Esc calls `onCancel` and does not reach a parent key handler; done → checkbox checked and text struck through; `isInvalid` → `aria-invalid="true"`; `isPending` disables checkbox and delete, not the text; `isDisabled` disables checkbox and text and renders no delete button
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the checklist item row`

---

### T16: Checklist section — heading, progress and list

**What**: `CardDetailChecklist` renders the heading "Checklist" with `SquareCheck`, the count and progress bar, the item rows, the section skeleton while loading and `LoadError` on error. Adds the `title` key.
**Where**: `front-end/src/features/board/components/card-detail-checklist.tsx`
**Depends on**: T15
**Reuses**: `LoadError`, `CardDetailChecklistItem`, prototype `design/Task List.dc.html:698-722`
**Requirement**: FCL-01, FCL-02, FCL-03, FCL-05, FCL-06, FCL-07, FCL-33

**Tools**:

- MCP: `claude-in-chrome` (visual check against the prototype)
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: items in the given order; "2/3" and a progressbar named "Checklist" with `aria-valuetext="2/3"` and width 67 %; complete → green count and bar; no items → no count and no bar; loading → skeleton and no list; error → "Não foi possível carregar" whose **Tentar novamente** calls `retryLoad`; read-only still shows count and bar; each row receives its draft, invalid, pending and disabled props (L-001)
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): show the checklist and its progress in the card detail`

---

### T17: Checklist section — add field, error and focus

**What**: The "Adicionar item e apertar Enter" field (Enter calls `add`, hidden when disabled), the `role="alert"` message below the list, and focus to the add field after a delete. Adds the `addItem` key.
**Where**: `front-end/src/features/board/components/card-detail-checklist.tsx`
**Depends on**: T16
**Reuses**: `CardDetailTitle` field pattern
**Requirement**: FCL-10, FCL-12, FCL-13, FCL-15, FCL-23, FCL-25, FCL-26, FCL-32

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: typing calls `setNewText`; Enter calls `add` and focus stays in the field; the error text shows in an alert and the field it belongs to is `aria-invalid`; activating a row's delete calls `remove` and moves focus to the add field; no add field when disabled
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add checklist items from the card detail`

---

### T18: Card detail renders the checklist

**What**: `CardDetail` renders `CardDetailChecklist` below the description with `state.checklist`, `actions.checklist` and `isDisabled`.
**Where**: `front-end/src/features/board/components/card-detail.tsx`
**Depends on**: T17
**Reuses**: existing detail composition
**Requirement**: FCL-01, FCL-04, FCL-28, FCL-31, FCL-32, FCL-33, FCL-39

**Tools**:

- MCP: `claude-in-chrome` (manual check on the seed board)
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (rendered detail, L-001): items and progress show; ticking an item updates the count and the board tile badge; archived card and archived board → items disabled, no delete, no add field; checklist `404` → "Esta tarefa não existe mais"; checklist `5xx` → section error with the title still editable; an item edit + Esc on the detail → "Descartar alterações?"
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): show the checklist in the card detail`

---

### T19: Card checklist e2e

**What**: Playwright spec against the real API, seeding through the API like `card-detail.e2e-spec.ts`.
**Where**: `front-end/test/e2e/card-checklist.e2e-spec.ts`
**Depends on**: T18
**Reuses**: `card-detail.e2e-spec.ts` setup helpers
**Requirement**: FCL-01, FCL-05, FCL-12, FCL-13, FCL-16, FCL-18, FCL-24, FCL-28, FCL-31, FCL-39

**Tools**:

- MCP: `claude-in-chrome` (manual check only)
- Skill: `pair-programming`, `playwright-skill`

**Done when**:

- [ ] E2E: open a card with items → order and "1/3"; add an item → it shows last and the field is empty; Enter on empty → "Escreva o item"; tick → count changes; rename + Enter → kept after reload; delete → gone after reload; close → the tile shows the new "done/total"; item edit + Esc → discard dialog; archived card → items locked
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the card checklist end to end`

---

### T20: Document the card checklist

**What**: README bullet(s) on the checklist in the card detail; status line updated.
**Where**: `README.md`
**Depends on**: T19
**Reuses**: Card detail section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains adding, ticking, renaming and deleting items and the read-only modes
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document the card checklist`

---

### T21: Close out the feature in the roadmap

**What**: ROADMAP 4b status → Done; spec traceability → Verified after validation; STATE handoff.
**Where**: `front-end/.specs/ROADMAP.md`
**Depends on**: T20
**Reuses**: Previous feature close-outs
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] ROADMAP shows 4b Done and STATE Handoff points to `card-checklist-dnd` (4b2)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): mark card-checklist done`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12 → T13 → T14
Phase 4:  T15 → T16 → T17 → T18
Phase 5:  T19 → T20 → T21
```

Execution is strictly sequential. Each task is its own branch and PR (pair-programming), reviewed before the next starts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 2 helpers moved | ⚠️ Cohesive (`inList` wraps `fieldsPatch`) |
| T2 | 3 small rules + type aliases, one file | ⚠️ Cohesive (all read the item list) |
| T3 | 1 function + 2 error codes | ✅ |
| T4 | 1 hook + 1 key | ✅ |
| T5 | 1 function | ✅ |
| T6–T8 | 1 hook each | ✅ |
| T9–T13 | 1 concern of one view model each | ✅ |
| T14 | 1 composition + test setups | ⚠️ Cohesive (the setups break without the composition) |
| T15 | 1 component | ✅ |
| T16, T17 | 1 concern of one component each | ✅ |
| T18 | 1 composition | ✅ |
| T19 | 1 e2e file | ✅ |
| T20, T21 | Docs | ✅ |

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

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `features/board/api/` | unit | unit | ✅ |
| T2, T3 | `features/board/model/` | unit | unit | ✅ |
| T4–T8 | `features/board/api/` | unit | unit | ✅ |
| T9–T14 | `features/board/view-models/` | unit | unit | ✅ |
| T15–T18 | `features/board/components/` | unit | unit | ✅ |
| T19 | Running app | e2e | e2e | ✅ |
| T20, T21 | Docs | none | none | ✅ |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FCL-01 | T2, T4, T9, T16, T18, T19 |
| FCL-02 | T9, T16 |
| FCL-03 | T4, T9, T16 |
| FCL-04 | T4, T14, T18 |
| FCL-05 | T2, T9, T16, T19 |
| FCL-06 | T2, T9, T16 |
| FCL-07 | T2, T9, T16 |
| FCL-08 | T15 |
| FCL-09 | T15 |
| FCL-10 | T6, T10, T17 |
| FCL-11 | T10 |
| FCL-12 | T6, T10, T17, T19 |
| FCL-13 | T3, T10, T17, T19 |
| FCL-14 | T3, T10 |
| FCL-15 | T10, T17 |
| FCL-16 | T7, T11, T19 |
| FCL-17 | T11, T15 |
| FCL-18 | T7, T12, T19 |
| FCL-19 | T12 |
| FCL-20 | T3, T12 |
| FCL-21 | T3, T12 |
| FCL-22 | T12, T15 |
| FCL-23 | T15, T17 |
| FCL-24 | T8, T13, T19 |
| FCL-25 | T17 |
| FCL-26 | T17 |
| FCL-27 | T2, T13, T14 |
| FCL-28 | T14, T18, T19 |
| FCL-29 | T2, T13, T14 |
| FCL-30 | T15 |
| FCL-31 | T15, T18, T19 |
| FCL-32 | T15, T17, T18 |
| FCL-33 | T16, T18 |
| FCL-34 | T7, T8, T11, T13 |
| FCL-35 | T7, T8, T10, T11, T13 |
| FCL-36 | T7, T8, T11, T13 |
| FCL-37 | T12 |
| FCL-38 | T6, T10 |
| FCL-39 | T5, T6, T18, T19 |
| FCL-40 | T3, T12 |

**Coverage:** 40 requirements, 40 mapped, 0 unmapped.
