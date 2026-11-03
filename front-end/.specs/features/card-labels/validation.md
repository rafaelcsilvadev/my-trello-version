# Card Labels Validation

**Date**: 2026-11-03
**Spec**: `front-end/.specs/features/card-labels/spec.md`
**Diff range**: `d800bc3..bdf7fde` (`d800bc3` = spec/design/tasks docs; `bdf7fde` = HEAD of `docs/card-labels-t17`). 17 feature commits + 17 docs commits. `git diff --stat d800bc3..HEAD -- front-end/src` → 13 files, +776/−22; `-- front-end/test` → 9 files, +2339/−12.
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1; iteration 2 re-run by the main agent (gap fixes `43f5a87`, `98ec3db`)

## Validation: Card Labels - PASS ✅ (iteration 2)

**Iteration 2 (HEAD `98ec3db`)**: PASS ✅. Test-only gaps G1, G2 and G5 are closed by `43f5a87`; spec/code mismatches G3 and G4 are closed by `98ec3db` (spec text now matches the code). M1 is now killed by 2 tests, and a new mutant M21 (outside press no longer dismisses the popover) is killed too. Gate re-run: lint, typecheck, `vitest run` (127 files, 1897 tests), build and `test:e2e` (40 tests) all green. The only item left is the FCLB-02 "pressed state" attribute wording (`aria-expanded`), a spec-precision note with no behavior risk.

**Iteration 1 result (kept for history)**: FAIL ❌. The build gate is green (1893 unit/component tests, lint, typecheck, build). 28 of 29 FCLB requirements have discriminating evidence. The sensor ran 20 behavior-level mutants: **19 killed, 1 survived** (M1). One requirement (FCLB-27) has no test that fails when it breaks. Four smaller items are flagged as spec-precision gaps or weak conjuncts (details below). Gaps are test-only except the error placement (G4), which is a src/spec mismatch.

1. **M1 / FCLB-27 (test-only)**: `setName` in `use-card-labels-view-model.ts` can stop clearing `error` and every test still passes. The only `setName` test starts with `error: null` and asserts `error: null` after (`use-card-labels-view-model.spec.tsx:316-328`); the form spec only checks `onNameChange` is called (`card-detail-label-form.spec.tsx:71-75`).
2. **FCLB-08 click outside (test-only)**: no test clicks outside the popover. Esc, trigger toggle and focus return are asserted; the "clicks outside it" conjunct rests on React Aria `Popover` defaults and nothing would fail if it broke.
3. **FCLB-06 "disable" (spec-precision gap)**: the spec says the label checkbox is *disabled*. The code keeps the input enabled with `data-pending` and ignores toggles (`card-detail-label-popover.tsx:47,100-103`) so Esc and focus keep working. The test asserts `bug.disabled` is `false`. The behavior is better than the letter of the spec, but the spec and the code disagree and no `// SPEC_DEVIATION` marker records it. Fix the spec text or add the marker.
4. **FCLB-23 / assumptions "below the colors" (src vs spec)**: the form renders the `role="alert"` message between the name field and the color group (`card-detail-label-form.tsx:250-254`, colors at `:255`). The spec says "below the colors" (FCLB-23 and the Name validation row). No test pins the position.
5. **FCLB-29 (weak)**: `use-card-detail-view-model.spec.tsx` "keeps the detail open when the toggled label is removed" asserts `status` `'ready'` and `card.labelIds` `[]`, but never activates a board label filter, so "tile leaves the filtered board" is not exercised. Behavior holds by construction (the detail reads the card query, not the filtered list).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T17 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `37`. T17 (roadmap close-out) is checked. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. Line numbers read on `bdf7fde`. Short names: `model.spec` = `unit/features/board/model/labels.spec.ts`; `mut.spec` = `unit/features/board/api/label-mutations.spec.tsx`; `vm.spec` = `unit/features/board/view-models/use-card-labels-view-model.spec.tsx`; `dvm.spec` = `unit/features/board/view-models/use-card-detail-view-model.spec.tsx`; `pop.spec` = `unit/features/board/components/card-detail-label-popover.spec.tsx`; `form.spec` = `unit/features/board/components/card-detail-label-form.spec.tsx`; `labels.spec` = `unit/features/board/components/card-detail-labels.spec.tsx`; `cd.spec` = `unit/features/board/components/card-detail.spec.tsx` (the `describe('labels')` block starts at `:338`, so `cd.spec:N` below is the real file line); `e2e` = `e2e/card-labels.e2e-spec.ts` (real API, not run here). "Mx" points to a sensor mutant.

### P1: Apply and remove labels from the detail

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLB-01 | Editable: icon button "Adicionar etiqueta" with plus icon after the chips | `pop.spec:82` `trigger().querySelector('svg.lucide-plus')` `toBeTruthy()`; `cd.spec:396` chips `['Urgent','Bug']` then `:397-399` `compareDocumentPosition(add()) & DOCUMENT_POSITION_FOLLOWING` `toBeTruthy()`; `labels.spec:69-83` chips then add button (M8 killed) | ✅ |
| FCLB-02 | Click opens `dialog` "Etiquetas", pressed state, focus in "Buscar etiquetas…" | `pop.spec:97` `getByRole('dialog',{name:'Etiquetas'})`, `:101` `activeElement` `toBe(search)`; `:92` `aria-expanded` `'true'`; `e2e:136` `toBeFocused()` (M16 killed). Pressed state is asserted as `aria-expanded`, not `aria-pressed`; spec says "pressed state" without naming the attribute | ✅ ⚠️ Spec-precision gap (attribute) |
| FCLB-03 | Every board label, board order, checkbox named by label, checked iff in `labelIds` | `vm.spec:146-151` ids `['l1','l2','l3']`, `checkedIds` `['l1','l3']`; `pop.spec:111-113` `bug.checked` `true`, `feature.checked` `false`; `dvm.spec` "lists the board labels" `[['Urgent',false],['Later',false],['Bug',true]]` | ✅ |
| FCLB-04 | Check → `PUT /cards/{id}/labels/{labelId}`; chip at once on detail and tile, board order | `mut.spec:120` `expect(requests).toEqual([...PUT...])`; `mut.spec:138` `labelIdsOf(queryClient)` `toEqual(...)` in card and list caches; `cd.spec:448` `chips(list())` `toEqual(['Urgent','Bug'])`, `:452-454` tile `indexOf('Urgent')` `<` `indexOf('Bug')`; `e2e:162,170` (M2, M19 killed) | ✅ |
| FCLB-05 | Uncheck → `DELETE`; chip leaves detail and tile | `vm.spec:216` `toEqual([{method:'DELETE',labelId:'l2'}])`, `:218` `checkedIds` `[]`; `cd.spec:464` `chips(list())` `toEqual(['Bug'])`, `:466-468` `within(tileEl).queryByText('Urgent')` `toBeNull()`; `e2e:179` | ✅ |
| FCLB-06 | In-flight label disabled, others enabled | `vm.spec:232-238` pending ids `toEqual(['l1'])`; `pop.spec:143-154` `bug.disabled` `false`, `data-pending` `true`, `onToggle` `not.toHaveBeenCalled()` (M9 killed). Iteration 2: spec now says "mark pending, ignore toggles, keep focusable" (`98ec3db`), matching the test | ✅ |
| FCLB-07 | Popover stays open, no toast | `vm.spec:205-206` `queryByText(saveFail)` `toBeNull()`, `isOpen` `toBe(true)` | ✅ |
| FCLB-08 | Esc, click outside, or "+" again closes; detail stays; focus to "+" | Esc: `pop.spec:233-235` `onOpenChange` `toHaveBeenLastCalledWith(false)`, `activeElement` `toBe(trigger())`; `cd.spec:477-479` popover `toBeNull()` and `hiddenDetail()` `toBeTruthy()`, `:488` `closedPath` `toBe(boardPath)`; `e2e:199` `toBeFocused()`. "+" again: `pop.spec:241`. Click outside (iter 2): `cd.spec` "closes only the popover on a press outside it and returns focus to the add button" clicks `card-detail-overlay`, asserts popover gone, `hiddenDetail()` truthy, path not `boardPath`, focus on `add()` (M21 killed) | ✅ |

### P1: Search the board's labels

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLB-09 | Labels whose name contains the trimmed query, ignoring case and accents, board order | `model.spec:54-66` case and trim, accents both ways, order; `vm.spec:176-178` options `toEqual([{label:labels[1],isChecked:true,isPending:false}])`; `e2e:140` count `1` (M13 killed) | ✅ |
| FCLB-10 | No match or no labels → "Nenhuma etiqueta encontrada" | `pop.spec:194-195` `getByText('Nenhuma etiqueta encontrada')`, checkboxes `toHaveLength(0)`; `:286-290` footer stays on empty board; `vm.spec:164` `options` `toEqual([])` | ✅ |
| FCLB-11 | Close clears the search | `vm.spec:136-137` `query` `toBe('')`, `options` `toHaveLength(3)` (M6 killed) | ✅ |

### P1: Create a label from the popover

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLB-12 | Form: "Nome" prefilled with search text and focused; `radiogroup` "Cor", 10 colors in doc order, `blue` selected; **Criar**; "Cancelar" | `vm.spec:309-313` form `toEqual({name:'Errands',color:'blue',error:null})` (M11, M12 killed); `form.spec:66-68` focus, value, placeholder; `:79-89` radiogroup "Cor", `aria-label` list `toEqual(COLOR_NAMES)`, "Lima" checked; `model.spec:22` color order | ✅ |
| FCLB-13 | Submit sends `POST` with trimmed `name` and `color`; **Criar** disabled until response | `vm.spec:426` `bodies` `toEqual([{name:'Errands',color:'orange'}])` (M17 killed); `:444-447` `isCreating` `true` then `false`, `bodies` `toHaveLength(1)` (M4 killed); `form.spec:115` `hasAttribute('disabled')` `true`; `:107-109` Enter and click call `onSubmit` | ✅ |
| FCLB-14 | 201 → label in list, form closed, search cleared, toast "Etiqueta criada", applied | `vm.spec:459-464` toast, `form` `toBeNull()`, `query` `toBe('')`, `requests` `toEqual([{method:'PUT',labelId:'l9'}])` (M5, M18 killed); `mut.spec:372` appends and invalidates; `cd.spec:623-625` created label in board filter; `e2e:232-236` | ✅ |
| FCLB-15 | Empty / >50 / duplicate name → message, `role="alert"`, `aria-invalid`, no request | `model.spec:143-164` `'labelNameRequired'`, `'labelNameTooLong'`, `'labelNameTaken'` for `bug`/` BUG ` (M3, M10 killed); `vm.spec:478-481` `error` `toBe(error)`, `bodies` `toEqual([])`; `form.spec:121-128` alert text and `aria-invalid` `'true'`; `e2e:219-222` | ✅ |
| FCLB-16 | Cancel closes the form, no request, drops name/color/error, **Criar etiqueta** returns | `vm.spec:345-346` `form` `toBeNull()`, `requests` `toEqual([])`; `:358-362` restart is `Docs2`/`blue`/`null`; `pop.spec:272-273` button back (M20 killed) | ✅ |

### P2: Manage labels link and read-only modes

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLB-20 | Link goes to `/b/{boardId}/labels` through the close path; unsaved edits ask first | `pop.spec:282` `href` `toBe('/b/b1/labels')` (M15 killed); `cd.spec:534-545` `alertdialog` "Descartar alterações?", **Descartar** → `pathname` `toBe(`${boardPath}/labels`)` | ✅ |
| FCLB-21 | Archived card or board: chips, no "+" | `cd.spec:422-425` `queryByRole('button',{name:'Adicionar etiqueta'})` `toBeNull()` for both rows, chips `['Urgent','Bug']`; `labels.spec:91-96`; `e2e:267-268` `toHaveCount(0)` (M8 killed) | ✅ |

### Edge cases

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCLB-17 | Network/5xx: undo, "Não foi possível salvar. Tente novamente." + **Tentar novamente** repeats | `vm.spec:251-256` toast, `checkedIds` `['l2']`, `requests[1]` `toEqual({method:'PUT',labelId:'l1'})`; `mut.spec:170,213,242` revert only the failed id (M14 killed); `cd.spec:520` retry button reachable by keyboard | ✅ |
| FCLB-18 | 409: undo, "Este item foi arquivado…" + **Recarregar** refetches the board view | `vm.spec:266-273` `invalidate` `toHaveBeenCalledWith({queryKey:boardViewKeys.all(boardId)})` once | ✅ |
| FCLB-19 | 404: undo, save-fail toast, no retry, refetch board view | `vm.spec:283-289` `queryByRole('button',{name:'Tentar novamente'})` `toBeNull()`, `invalidate` `toHaveBeenCalledWith({queryKey:boardViewKeys.all(boardId)})` | ✅ |
| FCLB-22 | Create network/5xx: form keeps text, toast + retry repeats the same create | `vm.spec:542-547` `form.name` `toBe('Errands')`, `bodies[1]` `toEqual({name:'Errands',color:'orange'})` | ✅ |
| FCLB-23 | `409 label-name-taken`: form kept, message below the colors, labels refetched | `vm.spec:505-513` form `toEqual({name:'Errands',color:'orange',error:'labelNameTaken'})`, `invalidate` `toHaveBeenCalledWith({queryKey:boardViewKeys.labels(boardId)})` (M7 killed). Position "below the colors" not asserted and not what the form does (gap G4) | ✅ ⚠️ Spec vs src |
| FCLB-24 | `409 board-archived`: archived toast + **Recarregar** | `vm.spec:525-531` conflict toast, `form.name` `toBe('Errands')`, `invalidate` `toHaveBeenCalledWith({queryKey:boardViewKeys.all(boardId)})` | ✅ |
| FCLB-25 | Create ok, apply fails: label stays unchecked in list, FCLB-17–19 | `vm.spec:558-566` both toasts, labels cache `toContainEqual(newLabel)`, card `labelIds` `toEqual([])` | ✅ |
| FCLB-26 | Exactly 50 chars after trim is sent | `model.spec:148-152` `toBeNull()` with and without outer spaces; `vm.spec:493` `bodies` `toEqual([{name,color:'orange'}])` | ✅ |
| FCLB-27 | Typing in the name clears the error and `aria-invalid` | `vm.spec:316-328` only with `error: null` before and after; no test types after an error. **M1 survived** in iteration 1. Iteration 2: `vm.spec` "setName clears the error left by a rejected submit" (`labelNameRequired` then `null`) and `cd.spec` "clears the name error and aria-invalid when typing in the create form" (alert gone, `aria-invalid` not `'true'`); M1 killed by both | ✅ |
| FCLB-28 | Close with search/form text and no other edit → no discard dialog | `dvm.spec` "is false with search text or an open create form" `isDirty` `toBe(false)`; `cd.spec:563` `queryByRole('alertdialog')` `toBeNull()` after typing "urg" and following the link | ✅ |
| FCLB-29 | Label filter active, change makes the open card stop matching: detail stays open | `dvm.spec` "keeps the detail open when the toggled label is removed": `status` `toBe('ready')`, `card.labelIds` `toEqual([])`. Iteration 1: no label filter activated. Iteration 2: `cd.spec` "keeps the detail open when removing the label leaves the board filter" turns the Urgent filter on, removes the label from the open card, asserts the tile leaves the board (`[data-card-id]` null), `hiddenDetail()` truthy and the path is not `boardPath` | ✅ |

**Status**: ✅ All 29 ACs have discriminating evidence after iteration 2. Open note: FCLB-02 asserts the pressed state as `aria-expanded` (spec does not name the attribute).

---

## Discrimination Sensor

Run in an isolated detached worktree (`git worktree add --detach … HEAD`), `node_modules` symlinked, runner called directly (`node_modules/.bin/vitest run`) over the 8 feature specs per mutant (no `pnpm install`, no pnpm script, no `git stash`). Each mutant was applied to the worktree copy only and restored after its run.

| Mutation | File | Description | Killed? |
| -------- | ---- | ----------- | ------- |
| M1 | `view-models/use-card-labels-view-model.ts` `setName` | Keep `error` while typing (FCLB-27) | ❌ **Survived** → fix task |
| M2 | `model/labels.ts` `withLabelId` | Skip the board-order sort (FCLB-04) | ✅ `mut.spec` "shows an applied label at once, in board label order" |
| M3 | `model/labels.ts` `validateLabelName` | Case-sensitive duplicate check (FCLB-15) | ✅ `vm.spec` "clashing name sets the error" |
| M4 | `use-card-labels-view-model.ts` `submitCreate` | Drop the in-flight guard (FCLB-13) | ✅ `vm.spec` "a second submit in flight…" |
| M5 | `use-card-labels-view-model.ts` `create` | Do not apply the created label (FCLB-14) | ✅ `vm.spec` "201 closes the form…" |
| M6 | `use-card-labels-view-model.ts` `setOpen` | Close keeps the search text (FCLB-11) | ✅ `vm.spec` "clears the query on close" |
| M7 | `use-card-labels-view-model.ts` `create` | 409 name-taken skips the labels refetch (FCLB-23) | ✅ `vm.spec` "a 409 label-name-taken…" |
| M8 | `components/card-detail-labels.tsx` | Show "+" in read-only mode (FCLB-21) | ✅ `labels.spec` "read-only with chips" |
| M9 | `components/card-detail-label-popover.tsx` | Pending option no longer ignores toggles (FCLB-06) | ✅ `pop.spec` "dims the pending option…" |
| M10 | `model/labels.ts` | Max length 50 → 51 (FCLB-15) | ✅ `vm.spec` "51 chars name…" |
| M11 | `model/labels.ts` | Default color `blue` → `purple` (FCLB-12) | ✅ `model.spec` "defaults to blue" |
| M12 | `use-card-labels-view-model.ts` `startCreate` | Form not prefilled with the search text (FCLB-12) | ✅ `vm.spec` "startCreate opens the form…" |
| M13 | `model/labels.ts` `searchLabels` | Search without accent normalization (FCLB-09) | ✅ `model.spec` "ignores accents…" |
| M14 | `api/label-mutations.ts` `labelIdsPatch` | Failed toggle never reverts (FCLB-17) | ✅ `mut.spec` "reverts only the failed label…" |
| M15 | `components/card-detail-label-popover.tsx` | Manage link `href` loses `/labels` (FCLB-20) | ✅ `pop.spec` "links Gerenciar etiquetas…" |
| M16 | `components/card-detail-label-popover.tsx` `SearchField` | Search not focused on mount (FCLB-02) | ✅ `pop.spec` "opens a dialog… focus in the search field" |
| M17 | `use-card-labels-view-model.ts` `submitCreate` | Send the untrimmed name (FCLB-13) | ✅ `vm.spec` "sends the trimmed name…" |
| M18 | `use-card-labels-view-model.ts` `create` | No "Etiqueta criada" toast (FCLB-14) | ✅ `vm.spec` "201 closes the form…" |
| M19 | `api/label-mutations.ts` | Swap PUT and DELETE (FCLB-04/05) | ✅ `mut.spec` "sends PUT to apply and DELETE to remove" |
| M20 | `use-card-labels-view-model.ts` `setOpen` | Close keeps the create form (FCLB-16) | ✅ `vm.spec` "setOpen(false) drops the form…" |
| M21 | `components/card-detail-label-popover.tsx` `Popover` | Outside press no longer dismisses: `shouldCloseOnInteractOutside={() => false}` (FCLB-08, iteration 2) | ✅ `cd.spec` "closes only the popover on a press outside it…" |

**Sensor depth**: lightweight, widened to 20 mutants because the feature is a write path with optimistic cache patches and rollback (data integrity).
**Result**: iteration 1: 19/20 killed (M1 survived). Iteration 2: M1 re-run, now killed by `vm.spec` "setName clears the error…" and `cd.spec` "clears the name error…"; M21 added and killed → 21/21 killed ✅ PASS. Iteration 2 ran in a detached worktree with `node_modules` symlinked and the 4 touched specs only (100 tests green at baseline); worktree removed and pruned, no broken symlink, real tree clean.
**Isolation check**: worktree removed and pruned; `git worktree list` shows only the real tree; `find */node_modules -maxdepth 2 -xtype l` found no broken link; real `git status --porcelain` was empty before and after.

---

## Interactive UAT Results

Not performed in this pass. The Independent Test lines of the spec stay for the human review of the PR (no browser used, per project rules).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ one hook per concern (`label-mutations.ts`, `use-card-labels-view-model.ts`), three small components |
| Surgical changes | ✅ outside new files: `card-detail.tsx` swaps the read-only list for `CardDetailLabels`; `validateTitle` and `LABEL_CLASSES` gain `export`; `ItemFieldError` gains 3 members |
| No scope creep | ✅ no edit/delete of labels, no header menu entry |
| Matches patterns | ✅ reuses `useOptimisticBoardViewChange`, `useSaveFailureNotifier`, `appendThenInvalidate`, `normalizeText` |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ FCLB-27, FCLB-08 (click outside), FCLB-29 weak; FCLB-06 and FCLB-23 deviate from the spec text without a `SPEC_DEVIATION` marker |
| Per-layer Coverage Expectation met (model 1:1 ACs; view-models; components; e2e) | ⚠️ model, api, view-model, component rows meet the table in `tasks.md`; FCLB-27 is the hole |
| Every test maps to a spec requirement - no unclaimed tests | ✅ spot-checked `pop.spec` "moves the focus back to the search field when the form closes" (design focus rule, FCLB-12/16) and `cd.spec:507` (keyboard reach of the retry toast, FCLB-17) |
| Documented guidelines followed | `front-end/.specs/features/card-labels/tasks.md` test-layer table and `CLAUDE.md` (tests apart from src, English identifiers) |

---

## Edge Cases

- [x] Failure paths FCLB-17 to FCLB-19, FCLB-22 to FCLB-25 handled and asserted
- [x] 50-char name accepted, 51 rejected (FCLB-26, FCLB-15)
- [x] Typing clears the error (FCLB-27): proven by `vm.spec` and `cd.spec` (iteration 2)
- [x] Click outside closes the popover (FCLB-08): proven by `cd.spec` (iteration 2)
- [x] Close with unsaved search/form text skips the discard dialog (FCLB-28)

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (run as `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` from `front-end/`, same scripts)
- **Iteration 2 result**: lint exit 0, typecheck exit 0, `vitest run` 127 files / 1897 tests passed, build ok, e2e 40 passed.
- **Iteration 1 result**: lint exit 0 (oxlint `--deny-warnings` + prettier clean); typecheck exit 0; `vitest run` **127 files, 1893 tests passed, 0 failed, 0 skipped**; build ok (only the existing chunk-size notice)
- **Test count before feature**: static count of `it`/`test` declarations in `test/unit` at `d800bc3` = 1467; the dynamic count before was not re-run (the `it.each` expansion differs)
- **Test count after feature**: 1893 dynamic; static 1574 (+107 declarations; 8 spec files touched, 1 new e2e spec)
- **Test integrity**: `git diff --stat` on tests is +2339/−12. The 12 removed lines are in `cd.spec.tsx`: the old test "shows the label chips in board order, with no control" was split into the `describe('labels')` block (chips in order + add button). The old "no control" assertion was replaced by the add-button assertion (FCLB-01 supersedes FCD-29's "no control"); no coverage was dropped.
- **E2E (`pnpm test:e2e`)**: iteration 1 **skipped**; iteration 2 ran it against the real API: **40 passed** (incl. the 5 in `card-labels.e2e-spec.ts`). Iteration 1 note: It needs the real API, database and Playwright browsers; not cheap or available in this pass. 5 tests in `e2e/card-labels.e2e-spec.ts` were read for evidence only; their pass status comes from CI.
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: FCLB-27 has no discriminating test (Major, test-only)

- **Root cause**: the only `setName` tests never have an error to clear. M1 survives.
- **Fix task**: in `vm.spec`, submit an empty/clashing name to set `form.error`, call `setName('x')`, assert `form.error` `toBeNull()`. In `form.spec` or `cd.spec`, type after an alert is shown and assert `queryByRole('alert')` is `null` and `aria-invalid` is not `'true'`. Re-run M1.
- **Priority**: Major

### Fix 2: FCLB-08 click outside not asserted (Minor, test-only)

- **Fix task**: add a `cd.spec` or `pop.spec` test that opens the popover and presses/clicks outside it (React Aria dismisses on a press that starts and ends outside, see `cd.spec:204`), then asserts the popover is gone, the detail is still open, and focus is on "Adicionar etiqueta".
- **Priority**: Minor

### Fix 3: FCLB-06 and FCLB-23 text vs code (Minor, docs or src)

- **FCLB-06**: update `spec.md` to "mark the checkbox pending and ignore its toggles; keep it focusable", or add `// SPEC_DEVIATION` at `card-detail-label-popover.tsx:47`.
- **FCLB-23**: either move the alert below the `RadioGroup` in `card-detail-label-form.tsx` (and assert the order in `form.spec`) or change the spec to "below the name field".
- **Priority**: Minor

### Fix 4: FCLB-29 exercise (Minor, test-only, optional)

- **Fix task**: in `cd.spec`, render with a label filter on, remove the filtered label from the open card, assert the detail dialog stays and the tile leaves the board.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FCLB-01..07, 09..16, 17..26, 28 | Pending | ✅ Verified |
| FCLB-08 | Pending | ✅ Verified (iteration 2) |
| FCLB-27 | Pending | ✅ Verified (iteration 2) |
| FCLB-29 | Pending | ✅ Verified (iteration 2) |

---

## Summary

**Overall**: ✅ Ready (iteration 2: no surviving mutant, all gaps closed)

**Spec-anchored check**: 29/29 ACs matched the spec outcome with discriminating evidence; one open wording note (FCLB-02 attribute)
**Sensor**: 21/21 mutations killed (iteration 2)
**Gate**: 1897 passed, 0 failed (lint, typecheck, build green; e2e 40 passed)

**What works**: the optimistic toggle with per-label rollback, the order rules, the create-then-apply flow, every failure toast path, the read-only modes and the discard path are covered at the model, api, view-model and component layers with killed mutants.

**Issues found**: Fix 1 (FCLB-27 test), Fix 2 (click outside test), Fix 3 (spec text vs code), Fix 4 (FCLB-29 test).

**Next steps**: open the PR. Fixes 1 to 4 are done (`43f5a87`, `98ec3db`).
