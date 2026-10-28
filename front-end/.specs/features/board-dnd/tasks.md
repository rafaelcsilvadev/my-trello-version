# Board Drag and Drop Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/board-dnd/spec.md`
**Design**: `front-end/.specs/features/board-dnd/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components, TanStack Query and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js`, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007). Optimistic hooks follow FE-AD-009 and FE-AD-010; drag and drop follows FE-AD-012. MSW fixtures extend `front-end/test/support/fixtures/board.ts`. jsdom has no `DataTransfer`: drag tests pass a stub `dataTransfer` (`setData`, `getData`, `effectAllowed`, `dropEffect`) and stub `getBoundingClientRect` where a slot depends on the pointer.

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, FE-AD-009, FE-AD-010, FE-AD-012, the approved design and the spec; existing tests sampled for style: `test/unit/features/board/model/columns.spec.ts`, `test/unit/features/board/api/mutations.spec.tsx`, `test/unit/features/board/view-models/use-board-view-model.spec.tsx`, `test/unit/features/board/components/card-tile.spec.tsx`, `test/unit/features/board/components/board-column.spec.tsx`, `test/unit/features/board/components/board-screen.spec.tsx`, `test/unit/shared/ui/toast/use-save-failure-notifier.spec.tsx`, `test/e2e/board.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005 to FE-AD-012) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `shared/ui/toast` | unit (`renderHook`) | Every failure kind with and without the new options; existing callers unchanged | `front-end/test/unit/shared/**/*.spec.ts(x)` | `pnpm --filter front-end test` |
| `features/board/model/move.ts` | unit | All branches; 1:1 to the position ACs; every edge (first/last index, first/last column, empty column, one column, same spot); renumbering of both groups | `front-end/test/unit/features/board/model/move.spec.ts` | `pnpm --filter front-end test` |
| `features/board/api/` move hooks | unit (`renderHook` + MSW + `QueryClient` wrapper) | Request path and exact body; cache patched before the response; per-item revert with an overlapping move still pending; pending id; invalidation after the last change | `front-end/test/unit/features/board/api/mutations.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/view-models/` | unit (`renderHook` in app providers + MSW) | Every action and guard; every announcement and banner text; every failure kind → toast text and action; retry resends the same body; no request on a no-op | `front-end/test/unit/features/board/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/board/components/` | unit (Testing Library, plain props; screen with MSW) | Every AC the component owns: roles, names, focusability, `draggable`, key handling on the element only, drag events → callbacks, visual state classes, read-only and pending variants | `front-end/test/unit/features/board/components/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | Mouse card move, keyboard card move, column move, "Mover para…" at 375 px; each persisted after a reload | `front-end/test/e2e/board-dnd.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
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

### Phase 1: Shared notifier and move model

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Move mutations

```
T6 → T7 → T8
```

### Phase 3: Move view model

```
T8 → T9 → T10 → T11 → T12
```

### Phase 4: Move chrome

```
T12 → T13 → T14 → T15 → T16
```

### Phase 5: Card and column views

```
T16 → T17 → T18 → T19 → T20 → T21 → T22
```

### Phase 6: Delivery

```
T22 → T23 → T24
```

---

## Task Breakdown

### T1: Notifier retry message and silent success

**What**: `notify(err, retry, options?: { retryMessage?: string })` uses `retryMessage` only on the retry branch; `runChange(mutateAsync, variables, successMessage: string | null, options?)` shows no success toast for `null` and forwards `options` to `notify`.
**Where**: `front-end/src/shared/ui/toast/use-save-failure-notifier.ts`
**Depends on**: None
**Reuses**: Existing `notify` / `runChange`
**Requirement**: none (enables FDND-35, FDND-36)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: retry branch shows `retryMessage` with Tentar novamente; `409` and `404` ignore it; `runChange` with `null` shows no toast on success and still notifies on failure; retry of `runChange` keeps the options
- [x] Existing callers and their tests pass unchanged
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): let a change name its retry failure`

---

### T2: Keyboard steps

**What**: `CardSpot`, `ColumnSpot`, `cardSpot(columns, id)`, `stepCard(columns, id, at, key)` and `stepColumn(count, at, key)` in the move model.
**Where**: `front-end/src/features/board/model/move.ts`
**Depends on**: T1
**Reuses**: `Column` from `model/types.ts`
**Requirement**: FDND-10, FDND-11, FDND-23

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: ↑ at index 0 and ↓ at the last index stay; ← on the first and → on the last column stay; ← → keep the index, capped at the number of other cards in the target (including an empty target → 0); one-column board stays; `stepColumn` stops at both ends
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add keyboard move steps to the board model`

---

### T3: Mouse drop targets

**What**: `dropSlot(rect, clientY)` (and the horizontal variant for columns) and `dropIndex(otherIds, hoveredId, slot)` in the move model.
**Where**: `front-end/src/features/board/model/move.ts`
**Depends on**: T2
**Reuses**: none
**Requirement**: FDND-03, FDND-04, FDND-05, FDND-19

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: pointer above / below the midpoint → `before` / `after` (exact midpoint fixed by test); `dropIndex` before the first, after the last, `null` hovered → end, empty column → 0
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add drop targets to the board move model`

---

### T4: Move request bodies

**What**: `cardMoveBody(origin, target)` and `columnMoveBody(origin, target)` returning the API body or `null` on the same spot.
**Where**: `front-end/src/features/board/model/move.ts`
**Depends on**: T3
**Reuses**: `MoveCardDto`, `MoveListDto` from the contract
**Requirement**: FDND-03, FDND-04, FDND-07, FDND-20, FDND-28

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: same spot → `null`; same column, new index → `{ position }` with no `listId` key; other column → `{ listId, position }`; columns → `{ position }` or `null`
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): build board move request bodies`

---

### T5: Place a card or list

**What**: `placeCard(cards, id, listId, index)` and `placeList(lists, id, index)`: move one item and renumber the active positions `0..n-1` of every group it touched; other groups and archived items untouched.
**Where**: `front-end/src/features/board/model/move.ts`
**Depends on**: T4
**Reuses**: `byPosition` ordering of `model/columns.ts`
**Requirement**: FDND-03, FDND-04, FDND-05, FDND-06, FDND-20

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: within one list (up, down, to the end); across lists (both renumbered, `listId` changed); into an empty list; unknown id returns the input; `toColumns` of the result gives the expected order and counts
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): place moved cards and lists in the board model`

---

### T6: Session preview

**What**: `MoveSession`, `ColumnsPreview` and `previewColumns(columns, session)` per the design Data Models.
**Where**: `front-end/src/features/board/model/move.ts`
**Depends on**: T5
**Reuses**: `placeCard` / `placeList` logic on `Column[]`
**Requirement**: FDND-02, FDND-09, FDND-19, FDND-22

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: no session → columns unchanged, all fields `null`; mouse card → columns unchanged, `sourceCardId`, `placeholder` before the right card or at the end, `targetListId`, no placeholder on the origin; keyboard card → card at the target, `liftedId`; column session (both inputs) → reordered columns; `target` `null` → nothing moved
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): preview a board move session`

---

### T7: Move card mutation

**What**: `useMoveCard(boardId)` with variables `{ id, body: MoveCardDto }` on top of `useOptimisticBoardViewChange`.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: T6
**Reuses**: `useOptimisticBoardViewChange`, `placeCard`
**Requirement**: FDND-03, FDND-04, FDND-06, FDND-39, FDND-40

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `POST /api/v1/cards/{id}/move` with the exact body; active cards cache patched before the response; on failure the card returns to its old list and index while a second move still pending keeps its own place; the id is in `usePendingItemIds` while pending; one invalidation after the last change
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the optimistic card move`

---

### T8: Move list mutation

**What**: `useMoveList(boardId)` with variables `{ id, body: MoveListDto }`.
**Where**: `front-end/src/features/board/api/mutations.ts`
**Depends on**: T7
**Reuses**: `useOptimisticBoardViewChange`, `placeList`
**Requirement**: FDND-20, FDND-39, FDND-40

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `POST /api/v1/lists/{id}/move` with `{ position }`; active lists cache patched; per-item revert with an overlapping move; pending id
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the optimistic column move`

---

### T9: Move session with the mouse

**What**: `useBoardMove` with `start`, `hover`, `drop`, `cancel` for card and column sessions, the start guards, the request on drop and the failure toasts.
**Where**: `front-end/src/features/board/view-models/use-board-move.ts`
**Depends on**: T8
**Reuses**: `model/move.ts`, `useMoveCard`, `useMoveList`, `useSaveFailureNotifier`
**Requirement**: FDND-03, FDND-04, FDND-05, FDND-07, FDND-20, FDND-28, FDND-35, FDND-36, FDND-37, FDND-38, FDND-40, FDND-27

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `start` ignored when `!canMove`, when the item is pending, when a session runs, and for a column whose rename is open; drop sends the body of T4; drop without a target, on the origin or `cancel` sends nothing; card failure toast "Não foi possível mover a tarefa" + Tentar novamente resends the same body; column failure uses the default toast; `409` → conflict + Recarregar; `404` → refetch; no success toast
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): run board move sessions from the mouse`

---

### T10: Move session with the keyboard

**What**: `step(key)` plus the keyboard drop and cancel in `useBoardMove`, with `announcement` and `banner` texts.
**Where**: `front-end/src/features/board/view-models/use-board-move.ts`
**Depends on**: T9
**Reuses**: `stepCard`, `stepColumn`
**Requirement**: FDND-09, FDND-10, FDND-11, FDND-12, FDND-13, FDND-14, FDND-22, FDND-23, FDND-24, FDND-25, FDND-41

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: exact PT-BR texts for card pick, step, drop ("Tarefa {title} solta em {col}, posição {i} de {n}") and cancel ("Movimento cancelado"); column pick, step, drop; banner texts for card and column and `null` after drop or cancel; `{n}` counts the moved card; drop on the origin announces but sends nothing; a second `start` while picked is ignored
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): move cards and columns with the keyboard`

---

### T11: "Mover para…" state

**What**: `askMoveTo(cardId)`, `moveTo(listId)`, `closeMoveTo()` and `moveToCard` in `useBoardMove`.
**Where**: `front-end/src/features/board/view-models/use-board-move.ts`
**Depends on**: T10
**Reuses**: `useMoveCard`, `runChange`
**Requirement**: FDND-31, FDND-32, FDND-33, FDND-35, FDND-40

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: another column → closes, sends `{ listId, position: <count there> }`, toast "Tarefa movida para {col}"; current column → closes, no request; `askMoveTo` ignored for a pending card; failure toast as T9
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): move a card through "Mover para…"`

---

### T12: Compose moves into the board view model

**What**: `useBoardViewModel` exposes `canMove`, the preview columns and the move state and actions.
**Where**: `front-end/src/features/board/view-models/use-board-view-model.ts`
**Depends on**: T11
**Reuses**: `useBoardMove`
**Requirement**: FDND-06, FDND-42

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `canMove` false on an archived board; `state.columns` reflects an active session preview; counters follow a cross-column move; existing view-model tests pass unchanged
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): wire move sessions into the board view model`

---

### T13: Move announcer

**What**: `MoveAnnouncer`: a visually hidden `role="status"` `aria-live="assertive"` region with the announcement text.
**Where**: `front-end/src/features/board/components/move-announcer.tsx`
**Depends on**: T12
**Reuses**: Prototype `Task List.dc.html:801`
**Requirement**: FDND-09, FDND-12, FDND-13, FDND-14

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: role, `aria-live="assertive"`, `sr-only`, renders the given text, present with an empty text
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the board move announcer`

---

### T14: Move banner

**What**: `MoveBanner`: `Move` icon and the banner text, styled as prototype `Task List.dc.html:356`.
**Where**: `front-end/src/features/board/components/move-banner.tsx`
**Depends on**: T13
**Reuses**: Púrpura tokens (`bg-brand-soft`, `text-purple-700`)
**Requirement**: FDND-09, FDND-22

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: renders the text with the icon hidden from assistive tech
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the board move banner`

---

### T15: Keyboard help line

**What**: `KeyboardHelp`: `Keyboard` icon and the help text, `hidden md:flex`, as prototype `Task List.dc.html:522`.
**Where**: `front-end/src/features/board/components/keyboard-help.tsx`
**Depends on**: T14
**Reuses**: none
**Requirement**: FDND-17

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: exact PT-BR and EN texts; carries the `hidden md:flex` classes
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the board keyboard help line`

---

### T16: "Mover para…" dialog

**What**: `MoveToDialog` with the title, the card title in quotes, one option per active column, the current one marked "Atual" with a check.
**Where**: `front-end/src/features/board/components/move-to-dialog.tsx`
**Depends on**: T15
**Reuses**: `shared/ui/dialog.tsx`, prototype `Task List.dc.html:1143-1145`
**Requirement**: FDND-30, FDND-31, FDND-32, FDND-33

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: dialog name "Mover para…"; description “{title}”; options in board order; only the current shows "Atual"; choosing an option calls back with its id; Esc and the close button call close
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the "Mover para…" dialog`

---

### T17: Draggable, focusable card

**What**: `CardTile` in active mode on an active board: `role="button"`, `tabIndex={0}`, name, `data-card-id`, focus outline, `draggable` with `dragstart` / `dragend`, keyboard handling on the card element only, dashed source and lifted states.
**Where**: `front-end/src/features/board/components/card-tile.tsx`
**Depends on**: T16
**Reuses**: Prototype `Task List.dc.html:412`
**Requirement**: FDND-01, FDND-02, FDND-08, FDND-09, FDND-16, FDND-40, FDND-42, FDND-43

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: focusable with name; `draggable` true only when it can move and is not pending; `dragstart` sets `text/plain` data and calls back; Space on the card calls pick, arrows/Enter/Esc call their callbacks only while picked; Space on the checkbox toggles done and does not pick; archived and read-only cards are neither focusable nor draggable; source and lifted classes
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): make board cards draggable and focusable`

---

### T18: Card menu

**What**: The card menu (…) labelled "Mover para…" with one item "Mover para…", disabled while pending, absent on archived cards and read-only boards.
**Where**: `front-end/src/features/board/components/card-tile.tsx`
**Depends on**: T17
**Reuses**: `ActionMenu`
**Requirement**: FDND-29, FDND-34, FDND-40, FDND-42

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: one item; choosing it calls `onMoveTo`; keys on the menu button never reach the card's pick; disabled while pending; no menu when archived or read-only
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add the card menu with "Mover para…"`

---

### T19: Column header handle

**What**: The `BoardColumn` header row as the column handle: `role="button"`, `tabIndex={0}`, name "Coluna {name}. Espaço para mover", `data-column-id`, `draggable`, keyboard handling on the header element only.
**Where**: `front-end/src/features/board/components/board-column.tsx`
**Depends on**: T18
**Reuses**: Prototype `Task List.dc.html:386`, `:1092`
**Requirement**: FDND-19, FDND-21, FDND-22, FDND-26, FDND-27, FDND-42

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: name and focusability; Space on the header picks; Space on the name button starts the rename and does not pick; not draggable or pickable while renaming or pending; read-only board has no handle
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): make column headers drag handles`

---

### T20: Column as card drop target

**What**: `BoardColumn` `<section>` handles card `dragover` (target from the hovered card's slot or the end) and `drop`, shows the dashed purple outline while targeted and renders the placeholder.
**Where**: `front-end/src/features/board/components/board-column.tsx`
**Depends on**: T19
**Reuses**: `dropSlot`, `dropIndex`
**Requirement**: FDND-02, FDND-03, FDND-04, FDND-05

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: `dragover` above / below a card's midpoint calls hover with the right index; over empty space → end; `drop` calls drop and prevents default; outline class only when targeted; placeholder before the given card or at the end; empty column still accepts a drop
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): drop cards on board columns`

---

### T21: Board columns: column drops, focus and scroll

**What**: `BoardColumns` handles column `dragover` / `drop`, refocuses the session item after each keyboard step, drop or cancel, scrolls the target column into view on the phone layout, and keeps the archived column and section out of every drag.
**Where**: `front-end/src/features/board/components/board-columns.tsx`
**Depends on**: T20
**Reuses**: `scrollToColumn`, `dropSlot`
**Requirement**: FDND-15, FDND-18, FDND-19, FDND-20, FDND-43

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: column `dragover` left / right half → hover index; focus stays on a card that moved to another column (`document.activeElement`); scroll called for the target column; the virtual column and archived section have no drag handlers and ignore drops
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): reorder columns and keep focus while moving`

---

### T22: Board screen wiring

**What**: `BoardScreen` renders `MoveAnnouncer`, `MoveBanner`, `KeyboardHelp` and `MoveToDialog` and passes the move props to `BoardColumns`; Esc on the board cancels a keyboard session.
**Where**: `front-end/src/features/board/components/board-screen.tsx`
**Depends on**: T21
**Reuses**: All components above
**Requirement**: FDND-06, FDND-09, FDND-14, FDND-17, FDND-31, FDND-41, FDND-42

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (screen + MSW): keyboard pick → → ↓ Space moves a card, sends the body, announces each step and keeps focus; mouse drag events move a card across columns and both counters change; "Mover para…" moves a card and shows the toast; help line hidden while picked, on an archived board and with no columns; archived board shows no menu and nothing draggable
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): wire drag and drop into the board screen`

---

### T23: End-to-end moves

**What**: Playwright journey on the real API: mouse card move across columns, keyboard card move, column move by mouse and keyboard, "Mover para…" at 375 px; each order checked after a reload.
**Where**: `front-end/test/e2e/board-dnd.e2e-spec.ts`
**Depends on**: T22
**Reuses**: `test/e2e/board.e2e-spec.ts` sign-up and board setup
**Requirement**: FDND-01, FDND-03, FDND-13, FDND-20, FDND-24, FDND-31

**Tools**:

- MCP: `claude-in-chrome` (manual check of the drag visuals)
- Skill: `pair-programming`, `playwright-skill`

**Done when**:

- [ ] E2E: the four journeys pass and survive a reload
- [ ] Full gate passes locally and in CI

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover board drag and drop end to end`

---

### T24: Docs and roadmap

**What**: README section on moving cards and columns; ROADMAP marks 3b `board-dnd` Done; Handoff updated.
**Where**: `README.md` (+ `front-end/.specs/ROADMAP.md`, `front-end/.specs/STATE.md`)
**Depends on**: T23
**Reuses**: Board docs section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README explains mouse, keyboard and "Mover para…" moves
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document moving cards and columns`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6
Phase 2:  T7 → T8
Phase 3:  T9 → T10 → T11 → T12
Phase 4:  T13 → T14 → T15 → T16
Phase 5:  T17 → T18 → T19 → T20 → T21 → T22
Phase 6:  T23 → T24
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 2 functions, 1 hook | ⚠️ Cohesive (same options flow) |
| T2-T6 | 1-2 related functions each, one file | ✅ |
| T7, T8 | 1 hook each | ✅ |
| T9-T11 | 1 concern of one hook each | ✅ |
| T12 | 1 composition | ✅ |
| T13-T16 | 1 component each | ✅ |
| T17, T18 | 1 concern of `CardTile` each | ✅ |
| T19, T20 | 1 concern of `BoardColumn` each | ✅ |
| T21 | 1 component, 3 related effects | ⚠️ Cohesive (column session handling) |
| T22 | 1 component wiring | ✅ |
| T23 | 1 e2e file | ✅ |
| T24 | Docs | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | Phase 1 → Phase 2 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | Phase 2 → Phase 3 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | Phase 3 → Phase 4 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | Phase 4 → Phase 5 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | Phase 5 → Phase 6 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | `shared/ui/toast` | unit | unit | ✅ |
| T2-T6 | `features/board/model/move.ts` | unit | unit | ✅ |
| T7, T8 | `features/board/api/` | unit | unit | ✅ |
| T9-T12 | `features/board/view-models/` | unit | unit | ✅ |
| T13-T22 | `features/board/components/` | unit | unit | ✅ |
| T23 | Running app | e2e | e2e | ✅ |
| T24 | Docs | none | none | ✅ |
