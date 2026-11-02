# Card Checklist Drag and Drop Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/card-checklist-dnd/spec.md`
**Design**: `front-end/.specs/features/card-checklist-dnd/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `board.cardDetail.checklist.*` to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from the design's i18n table, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). Drag events in unit tests use `fireEvent.dragStart/dragOver/drop/dragEnd` with a stub `dataTransfer` and a stubbed `getBoundingClientRect`, as `card-tile.spec.tsx` does. Composed screens are tested through the rendered screen, asserting what each child receives (lesson L-001); visual states named by an AC are asserted with a class check (lesson L-018); toast actions are clicked and the refetched queries asserted (lesson L-017).

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-012, FE-AD-013, the approved design and the spec; existing tests sampled for style: `test/unit/features/board/model/move.spec.ts`, `test/unit/features/board/model/checklist.spec.ts`, `test/unit/features/board/api/checklist-mutations.spec.tsx`, `test/unit/features/board/view-models/use-board-move.spec.tsx`, `test/unit/features/board/view-models/use-card-checklist-view-model.spec.tsx`, `test/unit/features/board/components/card-tile.spec.tsx`, `test/unit/features/board/components/card-detail-checklist.spec.tsx`, `test/e2e/board-dnd.e2e-spec.ts`, `test/e2e/card-checklist.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-007) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `features/board/model/` | unit | All branches; 1:1 to the ACs they back; boundaries (first, last, single item, same index, unknown id) | `front-end/test/unit/features/board/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` | unit (`renderHook` + MSW) | Request body sent; cache reordered at once; on failure only this move reverted (FE-AD-010), including an overlapping change; item pending while in flight; settle refetch once | `front-end/test/unit/features/board/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + MSW) | Every action and guard; banner and every announcement text with exact values; no request on the same index; every failure toast path (retry, `409`, `404`) | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; composed detail with `renderApp` + MSW) | Every AC the component owns: grip name and focus outline, key handling (Space, ↑ ↓, Enter, Esc), drag wiring, classes of source, lifted and placeholder, banner, live region, focus after each step, read-only and loading modes | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Mouse reorder and keyboard reorder kept after a reload; Esc cancels without closing the detail; archived card has no grip | `front-end/test/e2e/card-checklist-dnd.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Model and mutation

```
T1 → T2 → T3 → T4
```

### Phase 2: View models

```
T4 → T5 → T6 → T7
```

### Phase 3: Components

```
T7 → T8 → T9 → T10 → T11
```

### Phase 4: Delivery

```
T11 → T12 → T13 → T14
```

---

## Task Breakdown

### T1: Checklist move steps and request body

**What**: `MoveChecklistItemDto` alias in `model/types.ts`; `stepItem(count, index, key)` and `itemMoveBody(origin, target)` in `model/checklist.ts`.
**Where**: `front-end/src/features/board/model/checklist.ts`
**Depends on**: None
**Reuses**: `model/move.ts` `stepColumn` shape
**Requirement**: FCLD-06, FCLD-09, FCLD-12, FCLD-13

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `stepItem` moves one up and one down; stays at `0` on ↑ and at `count - 1` on ↓; a single item stays at `0` both ways
- [x] Unit: `itemMoveBody` returns `null` for a `null` target and for `target === origin`; returns `{ position: target }` otherwise, including `0`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the checklist move steps and request body`

---

### T2: Place a checklist item

**What**: `placeItem(items, id, index)` in `model/checklist.ts`: sorts by position, moves the item to `index` among the others and renumbers `0..n-1`.
**Where**: `front-end/src/features/board/model/checklist.ts`
**Depends on**: T1
**Reuses**: `byPosition`; `placeList` in `model/move.ts`
**Requirement**: FCLD-05, FCLD-21

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `[A0, B1, C2]` with C to `0` → `[C0, A1, B2]`; A to `2` → `[B0, C1, A2]`; input given out of position order is sorted first; the input array and its items are not mutated; an unknown id returns the input unchanged; an index beyond the end places the item last
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): place a checklist item at a new index`

---

### T3: Checklist move preview

**What**: `ItemMoveSession`, `ChecklistPreview` and `previewItems(items, session)` in `model/checklist.ts`.
**Where**: `front-end/src/features/board/model/checklist.ts`
**Depends on**: T2
**Reuses**: `MoveInput` from `model/move.ts`
**Requirement**: FCLD-04, FCLD-08, FCLD-09

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: no session → items unchanged and every marker `null`; mouse session → items unchanged, `sourceId` = the dragged id, `placeholderIndex` = `target` (`null` before the first hover), `liftedId` `null`; keyboard session → the picked item rendered at `target ?? origin`, `liftedId` = its id, `sourceId` and `placeholderIndex` `null`
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): preview a checklist item move`

---

### T4: Move checklist item mutation

**What**: `useMoveChecklistItem(boardId, cardId)` in `api/checklist-mutations.ts`: optimistic `POST /api/v1/checklist-items/{id}/move` with one `CacheChange` on the checklist cache; MSW handler for the move route.
**Where**: `front-end/src/features/board/api/checklist-mutations.ts`
**Depends on**: T3
**Reuses**: `useOptimisticBoardViewChange`, `placeItem`; `useMoveList` in `api/mutations.ts`
**Requirement**: FCLD-05, FCLD-21, FCLD-22

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: the request carries `{ position }` for the item id; the checklist cache shows the new order before the response; the card caches are not touched
- [ ] Unit: on `500` the item goes back to its old index; with an overlapping toggle of another item, a failed move reverts only the move
- [ ] Unit: the item id is in `usePendingItemIds` while the request is in flight; the board queries refetch once after the last change settles
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): move a checklist item optimistically`

---

### T5: Checklist move hook — keyboard session

**What**: New `view-models/use-checklist-move.ts` with `start`, `step`, `drop`, `cancel`, `bannerText`, `announcement`, `keyboardItemId` and `preview` for keyboard sessions; i18n keys `reorderItem`, `moveBanner`, `moveAnnounce`, `moveDropped`.
**Where**: `front-end/src/features/board/view-models/use-checklist-move.ts`
**Depends on**: T4
**Reuses**: `useBoardMove` structure; `board.move.cancelled`
**Requirement**: FCLD-08, FCLD-09, FCLD-10, FCLD-11, FCLD-12, FCLD-13, FCLD-14

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `start(id, 'keyboard')` sets the banner "Movendo “B”: posição 2 de 3. ↑ ↓ movem, Espaço solta, Esc cancela." and announces "Item B, posição 2 de 3"
- [ ] Unit: ↑ / ↓ update the preview order, the banner and the announcement; the ends do not wrap
- [ ] Unit: `drop()` announces "Item B solto na posição 1 de 3", clears the banner and sends `{ position: 0 }`; a drop at the start index sends nothing
- [ ] Unit: `cancel()` announces "Movimento cancelado", restores the order and sends nothing
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): move a checklist item with the keyboard`

---

### T6: Checklist move hook — mouse, guards and failures

**What**: `hover`, mouse `drop` and silent `cancel`, `canDrag(id)`, and the failure toasts through `runChange` in `use-checklist-move.ts`.
**Where**: `front-end/src/features/board/view-models/use-checklist-move.ts`
**Depends on**: T5
**Reuses**: `useSaveFailureNotifier.runChange`
**Requirement**: FCLD-05, FCLD-06, FCLD-18, FCLD-19, FCLD-20, FCLD-21, FCLD-22, FCLD-23

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: a mouse session never announces and has no banner; `hover(i)` sets the placeholder; `drop()` sends `{ position: i }`; a drop before any hover or at the start index sends nothing; `cancel()` is silent
- [ ] Unit: `canDrag` is `false` when `canMove` is `false`, while a session runs, and for a pending id; `start` is ignored in those cases
- [ ] Unit: `500` → "Não foi possível salvar. Tente novamente." and clicking Tentar novamente sends the same body again; `409` → the conflict toast and Recarregar refetches the board queries; `404` → the toast without a button and the checklist refetches
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): move a checklist item with the mouse`

---

### T7: Checklist view model composes the move

**What**: `useCardChecklistViewModel` composes `useChecklistMove` with `canMove: status === 'ready'` and exposes `state.move` and `actions.move`.
**Where**: `front-end/src/features/board/view-models/use-card-checklist-view-model.ts`
**Depends on**: T6
**Reuses**: the view model's `pendingIds` and `reload`
**Requirement**: FCLD-22, FCLD-25

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: while loading or on a load error `actions.move.canDrag(id)` is `false`; when ready it is `true`; while a toggle of an item is in flight it is `false` for that item only
- [ ] Unit: a keyboard move through `actions.move` reorders `state.move.preview.items` and the drop sends the move
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): expose the checklist move from the checklist view model`

---

### T8: Checklist item grip and keyboard

**What**: The grip button in `card-detail-checklist-item.tsx` (`data-item-grip-id`, name "Reordenar o item {text}", `GripVertical`, focus outline, disabled while it cannot move) and its key handling.
**Where**: `front-end/src/features/board/components/card-detail-checklist-item.tsx`
**Depends on**: T7
**Reuses**: `card-tile.tsx` key handling
**Requirement**: FCLD-01, FCLD-07, FCLD-08, FCLD-14, FCLD-22, FCLD-23, FCLD-24

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: the grip shows with its name and the `focus-visible:outline-2` class; with `movable` `null` there is no grip; with `canDrag` `false` and not picked it is disabled
- [ ] Unit: Space calls `onStart('keyboard')`; while picked, ↑ ↓ Space Enter Esc reach `onKey` with `preventDefault`; Esc does not bubble to a parent `keydown` listener; the picked row has `bg-brand-soft`
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the checklist item grip`

---

### T9: Checklist item mouse drag

**What**: The row is `draggable` only while the grip is pressed; `dragstart`, `dragover` (with `dropSlot`), `drop` and `dragend` wiring; the dashed translucent source look.
**Where**: `front-end/src/features/board/components/card-detail-checklist-item.tsx`
**Depends on**: T8
**Reuses**: `card-tile.tsx` `onDragStart`; `dropSlot`
**Requirement**: FCLD-02, FCLD-03, FCLD-04

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: the row is not draggable until `pointerdown` on the grip; `pointerdown` on the text field, checkbox or delete button leaves it not draggable; `pointerup` disarms it
- [ ] Unit: `dragstart` sets `text/plain` and calls `onStart('mouse')`; `dragover` above and below the middle calls `onHover('before')` and `onHover('after')`; `drop` calls `onDrop`; `dragend` calls `onEnd`
- [ ] Unit: the source row has the `border-dashed` and `opacity-50` classes
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): drag a checklist item with the mouse`

---

### T10: Checklist section move wiring

**What**: `card-detail-checklist.tsx` renders `MoveBanner`, the list from the preview, the dashed placeholder, the end zone, `MoveAnnouncer`, and refocuses the picked grip.
**Where**: `front-end/src/features/board/components/card-detail-checklist.tsx`
**Depends on**: T9
**Reuses**: `MoveBanner`, `MoveAnnouncer`, `dropIndex`, `board-columns.tsx` refocus effect
**Requirement**: FCLD-04, FCLD-08, FCLD-15, FCLD-17, FCLD-24, FCLD-25

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: the banner renders between the progress bar and the list only with `bannerText`; the live region is an `output` with `aria-live="assertive"` and the `sr-only` class carrying `announcement`
- [ ] Unit: the placeholder (`border-dashed`) renders at `placeholderIndex`; hover over a row maps to `hover(dropIndex(...))`; a drop on the end zone hovers `items.length` and drops
- [ ] Unit: after a step the picked grip has focus even when its node moved
- [ ] Unit: read-only mode passes `movable` `null` to every row; loading and error render no grip
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): wire the checklist reorder into the section`

---

### T11: Card detail reorders the checklist

**What**: Composed tests through the rendered card detail with `renderApp` + MSW; fix any wiring gap they find in `card-detail.tsx`.
**Where**: `front-end/src/features/board/components/card-detail.tsx`
**Depends on**: T10
**Reuses**: `card-detail.spec.tsx` setup
**Requirement**: FCLD-11, FCLD-14, FCLD-15, FCLD-16, FCLD-17, FCLD-18, FCLD-24

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: Tab to a grip, Space, ↑, Space → the list order changes, the move request is sent, the live region text is inside the dialog, focus is on the grip
- [ ] Unit: Esc while picked → order restored, the dialog stays open; a second Esc closes the detail
- [ ] Unit: closing the detail while an item is picked sends no move request
- [ ] Unit: an archived card shows no grip; a `500` on the move puts the item back and shows the retry toast
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `test(front-end): cover the checklist reorder in the card detail`

---

### T12: Card checklist drag and drop e2e

**What**: Playwright spec against the real API, seeding through the API like `card-checklist.e2e-spec.ts`.
**Where**: `front-end/test/e2e/card-checklist-dnd.e2e-spec.ts`
**Depends on**: T11
**Reuses**: `card-checklist.e2e-spec.ts` and `board-dnd.e2e-spec.ts` helpers
**Requirement**: FCLD-01, FCLD-05, FCLD-08, FCLD-11, FCLD-14, FCLD-24

**Tools**:

- MCP: NONE
- Skill: `pair-programming`, `playwright-skill`

**Done when**:

- [ ] E2E: drag "C" by its grip above "A" → order "C, A, B" kept after a reload
- [ ] E2E: grip of "A", Space, ↓, ↓, Space → banner shown while moving, order "B, C, A" kept after a reload
- [ ] E2E: Space, ↓, Esc → order unchanged and the detail still open
- [ ] E2E: archived card → no grip
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the checklist reorder end to end`

---

### T13: Document the checklist reorder

**What**: README bullet on reordering checklist items with the mouse and the keyboard.
**Where**: `README.md`
**Depends on**: T12
**Reuses**: Card checklist section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains the grip, mouse drag and the keys (Espaço, ↑ ↓, Esc), and that touch has no reorder
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document the checklist reorder`

---

### T14: Close out the feature in the roadmap

**What**: ROADMAP 4b2 status → Done; spec traceability → Verified after validation; STATE handoff.
**Where**: `front-end/.specs/ROADMAP.md`
**Depends on**: T13
**Reuses**: Previous feature close-outs
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] ROADMAP shows 4b2 Done and STATE Handoff points to `card-labels` (4c)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): mark card-checklist-dnd done`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7
Phase 3:  T8 → T9 → T10 → T11
Phase 4:  T12 → T13 → T14
```

Execution is strictly sequential. Each task is its own branch and PR (pair-programming), reviewed before the next starts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Move steps and request body | 2 pure functions + 1 type alias, one file | ✅ Granular (cohesive) |
| T2: Place an item | 1 function | ✅ Granular |
| T3: Move preview | 1 function + its types | ✅ Granular |
| T4: Move mutation | 1 hook | ✅ Granular |
| T5: Move hook, keyboard | 1 hook (keyboard half) | ✅ Granular |
| T6: Move hook, mouse and failures | same hook (mouse half and guards) | ✅ Granular |
| T7: View model composes the move | 1 composition | ✅ Granular |
| T8: Grip and keyboard | 1 element of 1 component | ✅ Granular |
| T9: Mouse drag | drag wiring of 1 component | ✅ Granular |
| T10: Section wiring | 1 component | ✅ Granular |
| T11: Composed detail tests | 1 composed screen | ✅ Granular |
| T12: E2E | 1 spec file | ✅ Granular |
| T13: README | 1 doc | ✅ Granular |
| T14: Roadmap close-out | 1 doc | ✅ Granular |

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

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `model/` | unit | unit | ✅ OK |
| T2 | `model/` | unit | unit | ✅ OK |
| T3 | `model/` | unit | unit | ✅ OK |
| T4 | `api/` | unit | unit | ✅ OK |
| T5 | `view-models/` | unit | unit | ✅ OK |
| T6 | `view-models/` | unit | unit | ✅ OK |
| T7 | `view-models/` | unit | unit | ✅ OK |
| T8 | `components/` | unit | unit | ✅ OK |
| T9 | `components/` | unit | unit | ✅ OK |
| T10 | `components/` | unit | unit | ✅ OK |
| T11 | `components/` (composed) | unit | unit | ✅ OK |
| T12 | Running app | e2e | e2e | ✅ OK |
| T13 | Docs | none | none | ✅ OK |
| T14 | Docs | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FCLD-01 | T8, T12 |
| FCLD-02 | T9 |
| FCLD-03 | T9 |
| FCLD-04 | T3, T9, T10 |
| FCLD-05 | T2, T4, T6, T12 |
| FCLD-06 | T1, T6 |
| FCLD-07 | T8 |
| FCLD-08 | T3, T5, T8, T10, T12 |
| FCLD-09 | T1, T3, T5 |
| FCLD-10 | T5 |
| FCLD-11 | T5, T11, T12 |
| FCLD-12 | T1, T5 |
| FCLD-13 | T1, T5 |
| FCLD-14 | T5, T8, T11, T12 |
| FCLD-15 | T10, T11 |
| FCLD-16 | T11 |
| FCLD-17 | T10, T11 |
| FCLD-18 | T6, T11 |
| FCLD-19 | T6 |
| FCLD-20 | T6 |
| FCLD-21 | T2, T4, T6 |
| FCLD-22 | T4, T6, T7, T8 |
| FCLD-23 | T6, T8 |
| FCLD-24 | T8, T10, T11, T12 |
| FCLD-25 | T7, T10 |

**Coverage:** 25 total, 25 mapped to tasks, 0 unmapped.
