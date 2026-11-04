# Labels Validation

**Date**: 2026-11-04
**Spec**: `front-end/.specs/features/labels/spec.md`
**Diff range**: `eec166a..HEAD` (branch `feat/labels-T19`, front-end paths only)
**Verifier**: independent sub-agent (author ≠ verifier)

## Validation: PASS

Result: PASS. All 38 FLP requirements have a `file:line` assertion. Gate green (2054 tests), 5/5 sensor mutants killed. The first pass flagged 4 spec-precision gaps and an unimplemented Esc; the follow-up changes (see Follow-up) closed all of them except the cosmetic FLP-09 caveat.

---

## Follow-up

After the first pass, `labels-screen.tsx` gained the Esc handler and the specs `labels-screen.spec.tsx` and `label-form-dialog.spec.tsx` gained 7 tests (Esc x2, PT heading/subtitle, PT load error, 409 text, PT validation texts x2). The sensor was not re-run: the mutated behaviors (M1-M5) are untouched by the follow-up. The Esc listener was not mutated; the two Esc tests fail without it (seen red before the implementation).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T19 | ✅ Done | 63 "Done when" boxes `[x]`, 0 open in `tasks.md` |

---

## Spec-Anchored Acceptance Criteria

Unit/component tests for screens run in the `en` locale; PT-BR strings are asserted in the leaf component specs (`labels-list`, `labels-states`, `delete-label-dialog`, `label-form-dialog`, `label-color-picker`) and in the view-model spec (toasts). Paths below are under `front-end/test/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FLP-01 rows, heading, subtitle | heading "Etiquetas", subtitle "{board} · Valem só para este quadro.", rows in board order | `unit/features/board/components/labels-screen.spec.tsx:112-118` `findByRole('heading',{level:1,name:'Labels'})`, `findByText('Product launch · Apply to this board only.')`; `unit/features/board/view-models/use-labels-view-model.spec.tsx:177` `expect(rows.map(r=>r.label.id)).toEqual(['lb1','lb2','lb3'])`; `unit/features/board/components/labels-list.spec.tsx:57` order; e2e `e2e/labels.e2e-spec.ts:121-127` | ✅ PASS after follow-up: `labels-screen.spec.tsx:130-133` `findByRole('heading',{level:1,name:'Etiquetas'})`, `findByText('Product launch · Valem só para este quadro.')` |
| FLP-02 row content | chip, usage text, "Editar etiqueta {name}", "Excluir etiqueta {name}" | `unit/features/board/components/labels-list.spec.tsx:77-82` `getByRole('button',{name:'Editar etiqueta Urgent'})`, `svg.lucide-pencil` | ✅ PASS |
| FLP-03 usage text and 3 sources | "não usada" / "usada em 1 tarefa" / "usada em {n} tarefas", counts active + archived + archived-column cards | `labels-list.spec.tsx:69-71` `getByText('usada em 3 tarefas')`, `'não usada'`, `'usada em 1 tarefa'`; `unit/features/board/api/label-usage.spec.tsx:107` `expect(result.current.counts?.get('bug')).toBe(3)`; `view-models/use-labels-view-model.spec.tsx:178-182` `toEqual([{key:'many',count:2},{key:'many',count:3},{key:'unused',count:0}])`; `unit/features/board/model/label-usage.spec.ts:43-51` | ✅ PASS |
| FLP-04 empty state | "Nenhuma etiqueta ainda" + "Crie etiquetas para destacar tarefas, como Bug ou Urgent." + **Nova etiqueta** | `unit/features/board/components/labels-states.spec.tsx:28-34` heading and detail text; `:41` button; `labels-screen.spec.tsx:165-166`; e2e `e2e/labels.e2e-spec.ts:197-215` | ✅ PASS |
| FLP-05 skeleton while loading | skeleton of rows while board, labels or any source loads | `labels-screen.spec.tsx:127` `querySelector('[aria-busy="true"]')).not.toBeNull()`; `view-models/use-labels-view-model.spec.tsx:134,153` `status` is `'loading'`; `labels-states.spec.tsx:59` | ✅ PASS |
| FLP-06 load error + retry | "Não foi possível carregar" + **Tentar novamente** refetching the failed requests | `labels-screen.spec.tsx:145-149` `findByText('Couldn’t load')`, click `'Try again'`, row appears; `view-models/use-labels-view-model.spec.tsx:219-233` `status` is `'error'`; `:288-291` only failed queries refetched | ✅ PASS after follow-up: `labels-screen.spec.tsx:144` `findByText('Não foi possível carregar')` (PT locale) |
| FLP-07 not found | board-not-found screen for missing, foreign, non-UUID id | `labels-screen.spec.tsx:158` `findByText('Board not found')`; `view-models/use-labels-view-model.spec.tsx:257,266` `status` is `'notFound'` (404 and malformed id) | ✅ PASS |
| FLP-08 entry points | menu entry and popover link open the page | `unit/pages/labels-page.spec.tsx:61-83` click `menuitem 'Board labels'` and `link 'Manage labels'`, then `labelsSubtitle('Product launch')`; `:54-58` route | ✅ PASS |
| FLP-09 breadcrumb / back arrow | desktop "Meus quadros › {board} › Etiquetas"; phone back arrow to the board | `unit/features/board/components/board-breadcrumb.spec.tsx` (new it.each) `expect(current[0]?.textContent).toBe(labels)`, `href` `/boards` and `/b/${boardId}`, `className` contains `hidden`, `md:flex`; `labels-screen.spec.tsx:284` `back.getAttribute('href')` is `/b/${boardId}`; `unit/pages/protected-layout.spec.tsx` `breadcrumb.getByText('Labels').getAttribute('aria-current')` is `'page'` | ⚠️ Back arrow phone-only visibility and the "›" separator not asserted |
| FLP-10 create dialog opens | title **Nova etiqueta**, focused name, radiogroup "Cor" in order, `blue`, color name, preview | `label-form-dialog.spec.tsx:43-56` `getByRole('dialog',{name:'Nova etiqueta'})`, `document.activeElement` is the input, radio `Azul` checked, `label-color-name` is `'Azul'`; `label-color-picker.spec.tsx:51-60` 10 radios in order inside `radiogroup 'Cor'`; `view-models/use-labels-view-model.spec.tsx:398-404` form `{mode:'create',name:'',color:'blue'}` | ✅ PASS |
| FLP-11 pick color | selects it, shows its name, recolors preview | `label-form-dialog.spec.tsx:89-92` preview contains `bg-label-green`, name `'Verde'`; `:100` `onColorChange` called with `'red'` | ✅ PASS |
| FLP-12 preview text | typed name, or "Ex.: Bug" while trimmed name blank | `label-form-dialog.spec.tsx:79,83` `label-preview` textContent `'Urgente'` / `'Ex.: Bug'` | ✅ PASS |
| FLP-13 create validation | empty / over 50 / duplicate case-insensitive: message below field, no request | `view-models/use-labels-view-model.spec.tsx:411-420` error is `labelNameRequired`/`labelNameTooLong`/`labelNameTaken`, `bodies` `toEqual([])`; `label-form-dialog.spec.tsx:106-113` alert text `'Já existe uma etiqueta com esse nome neste quadro'`, `aria-invalid` `'true'`; e2e `e2e/labels.e2e-spec.ts:176-179` (EN duplicate) | ✅ PASS after follow-up: `label-form-dialog.spec.tsx:106` it.each `getByRole('alert').textContent` `toBe('Dê um nome à etiqueta')` / `toBe('Use até 50 caracteres')` |
| FLP-14 typing clears error | error and `aria-invalid` cleared | `view-models/use-labels-view-model.spec.tsx:431` `form?.error` `toBeNull()`; `label-form-dialog.spec.tsx:119-124` no alert, no `aria-invalid` without error | ✅ PASS |
| FLP-15 create request, in-flight guard | `POST` with trimmed name + color, button disabled, Enter ignored | `view-models/use-labels-view-model.spec.tsx:446` `bodies` `toEqual([{name:sent,color:'green'}])`; `:467` `bodies` `toHaveLength(1)` after 2 submits; `label-form-dialog.spec.tsx:156-157` `button.disabled` true + `disabled:opacity-45`; `:140-147` Enter and button submit | ✅ PASS |
| FLP-16 create 201 | dialog closes, label last as "não usada", toast "Etiqueta criada" | `view-models/use-labels-view-model.spec.tsx:474-489` `findByText('Etiqueta criada')`, `form` null, ids `['lb1','lb2','lb3','lb9']`, usage `{key:'unused',count:0}`; `labels-screen.spec.tsx:181` `rowNames()` `toEqual(['Urgent','Bug','Docs'])` | ✅ PASS |
| FLP-17 cancel / Esc / outside | close, no request, drop text | `label-form-dialog.spec.tsx:165,173,181` `onClose` called once (Cancelar, Esc, outside); `view-models/use-labels-view-model.spec.tsx:494-504` reopen gives `name` `''`, `bodies` `[]` | ✅ PASS |
| FLP-18 edit dialog opens | title **Editar etiqueta**, name and color prefilled, **Salvar** | `label-form-dialog.spec.tsx:62-71`; `view-models/use-labels-view-model.spec.tsx:617-624` form `{mode:'edit',id:'lb2',name:'Urgent',color:'green'}` | ✅ PASS |
| FLP-19 edit validation + own name | breaks FLP-13 rules: message, no request; own name ignoring case valid | `view-models/use-labels-view-model.spec.tsx:630-635` `bodies` `toEqual([{name:'bUg'}])`; `:638-647` `labelNameTaken`; `:650-662` required / too long | ✅ PASS after follow-up (PT texts asserted, see FLP-13) |
| FLP-20 edit changed | closes, row updates at once, toast "Etiqueta salva", `PATCH` only changed fields | `view-models/use-labels-view-model.spec.tsx:690-704` `form` null, row `toMatchObject(expected)`, `findByText('Etiqueta salva')`, `bodies` `toEqual([expected])` (name / color / both, trimmed); `unit/features/board/api/label-mutations.spec.tsx:434` body only given fields | ✅ PASS |
| FLP-21 edit unchanged | closes, no request, no toast | `view-models/use-labels-view-model.spec.tsx:667-674` `form` null, `bodies` `[]`, `queryByText('Etiqueta salva')` null; `model/label-usage.spec.ts:59` `labelChanges` null | ✅ PASS |
| FLP-22 one change per row | row buttons disabled in flight, other rows enabled | `labels-list.spec.tsx:105-115` `button.disabled` true + `disabled:opacity-45` on pending row, `false` on others; `view-models/use-labels-view-model.spec.tsx:322,336` `pending` `[false,true,false]` | ✅ PASS |
| FLP-23 delete confirm | "Excluir a etiqueta {name}?", body by count (0/1/n), **Cancelar**, **Excluir** | `delete-label-dialog.spec.tsx:35-56,59-66` title, buttons, `'Nenhuma tarefa usa esta etiqueta.'`, `'Ela será removida de 1 tarefa.'`, `'Ela será removida de 3 tarefas.'`; `view-models/use-labels-view-model.spec.tsx:865` `confirmDelete` `toEqual({label:bug,count})`; `:888` count captured on open | ✅ PASS |
| FLP-24 delete confirm action | closes, row leaves, toast "Etiqueta excluída", `DELETE /labels/{id}` | `view-models/use-labels-view-model.spec.tsx:909-917` `confirmDelete` null, ids `['lb2','lb3']`, `findByText('Etiqueta excluída')`, `deleted` `toEqual(['lb1'])`; `delete-label-dialog.spec.tsx:93` `onConfirm` once; e2e `e2e/labels.e2e-spec.ts:146-148` | ✅ PASS |
| FLP-25 strip id from cached cards + single refetch | label id removed from active and archived card caches; board view refetched once after last change | `unit/features/board/api/label-mutations.spec.tsx:629-634` `toEqual({labels:[bravo,charlie],active:[[charlie.id],[]],archived:[[bravo.id]]})`; `:731-738` `isInvalidated` false then true; e2e `e2e/labels.e2e-spec.ts:150-155` no "Bug" on the board | ✅ PASS |
| FLP-26 cancel / Esc / outside on confirm | closes, no request | `delete-label-dialog.spec.tsx:103-121` `onCancel` once, `onConfirm` not called (3 triggers); `view-models/use-labels-view-model.spec.tsx:896-901` `deleted` `[]` | ✅ PASS |
| FLP-27 archived board read-only | notice, list kept, no **Nova etiqueta** / **Editar** / **Excluir** | `labels-screen.spec.tsx:270-275` notice `'Archived board · read-only'`, `queryByRole` null x3; `labels-list.spec.tsx:122-125` no buttons; `view-models/use-labels-view-model.spec.tsx:308` `readOnly` true; e2e `e2e/labels.e2e-spec.ts:218-` | ✅ PASS |
| FLP-28 edit/delete 5xx | row restored, "Não foi possível salvar. Tente novamente." + **Tentar novamente** repeats | `view-models/use-labels-view-model.spec.tsx:735-743` (edit) row name `'Bug'`, `bodies[1]` `toEqual({name:'Defect'})`; `:945-956` (delete) ids restored, `deleted` `toEqual(['lb2','lb2'])` | ✅ PASS |
| FLP-29 create 5xx | dialog kept with name and color; **Tentar novamente** repeats | `view-models/use-labels-view-model.spec.tsx:514-523` `form` `toMatchObject({name:'Chore',color:'green',isSubmitting:false})`, `bodies[1]` `toEqual({name:'Chore',color:'green'})` | ✅ PASS |
| FLP-30 409 label-name-taken | create/edit: dialog stays with text, "Já existe..." below field, labels refetched; edit restores row | `view-models/use-labels-view-model.spec.tsx:535-546` (create) `toMatchObject({name:'Chore',error:'labelNameTaken'})`, `invalidateQueries` called with `boardViewKeys.labels`; `:757-775` (edit) row back to `Bug`/`green`, form reopened with `Defect`/`orange` | ✅ PASS after follow-up: `labels-screen.spec.tsx:357` server 409 `label-name-taken` on create, `findByRole('alert').textContent` `toBe('Já existe uma etiqueta com esse nome neste quadro')`, dialog still open |
| FLP-31 409 board-archived | undo, "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar** refetches board view | `view-models/use-labels-view-model.spec.tsx:558-566` (create), `:788-794` (edit), `:967-974` (delete) `invalidate` `toHaveBeenCalledWith({queryKey:boardViewKeys.all(boardId)})` after clicking `Recarregar` | ✅ PASS |
| FLP-32 404 on edit/delete | undo, "Não foi possível salvar. Tente novamente.", refetch labels and cards | `view-models/use-labels-view-model.spec.tsx:805-811` (edit) and `:983-989` (delete) text, rows restored, `invalidate` called with `boardViewKeys.all(boardId)` | ✅ PASS |
| FLP-33 50-char name sent | request sent | `view-models/use-labels-view-model.spec.tsx:435,446` `bodies` `toEqual([{name:'a'.repeat(50),color:'green'}])`; 51 chars rejected at `:409` | ✅ PASS |
| FLP-34 trimmed name | sent and shown trimmed | `view-models/use-labels-view-model.spec.tsx:436,446` (create, outer spaces); `:686,704` (edit, `'  Defect  '` sends `{name:'Defect',color:'orange'}`) | ✅ PASS |
| FLP-35 last label deleted | empty state | `labels-screen.spec.tsx:259` `findByText('No labels yet')`; `view-models/use-labels-view-model.spec.tsx:939-941` rows `[]`, `status` `'ready'` | ✅ PASS |
| FLP-36 focus return | to opener; to **Nova etiqueta** after delete | `labels-screen.spec.tsx:183` (create), `:203-205` (edit → `Edit label Defect`), `:227-229` (delete → `New label`), `:245` (cancel → delete button) `document.activeElement` `toBe(...)` | ✅ PASS |
| FLP-37 dialog open for a label deleted elsewhere | follows FLP-32 | `view-models/use-labels-view-model.spec.tsx:798-811` (edit 404), `:977-989` (delete 404) | ✅ PASS (covered by FLP-32 tests) |
| FLP-38 created label never applied | shows "não usada" | `view-models/use-labels-view-model.spec.tsx:205` `rows[0].usage.key` `toBe('unused')`; `:487` `usage` `toEqual({key:'unused',count:0})`; e2e `e2e/labels.e2e-spec.ts:181` `toContainText('unused')` | ✅ PASS |

**Status**: ✅ 38/38 FLPs have evidence. One cosmetic caveat remains: FLP-09 (phone-only back arrow and the "›" separator not asserted).

**Esc (spec text without FLP)**: the assumption row "Entry points" says "The Esc key and the back arrow return to the board". The first pass found no implementation. Fixed in the follow-up: `src/features/board/components/labels-screen.tsx` listens for `Escape` on the document and navigates to `/b/{boardId}` while no dialog is open. Tests: `labels-screen.spec.tsx:304-311` (`findByText('Board stub')` after `{Escape}`) and `:314-325` (with a dialog open, Esc closes it and the page stays: `queryByText('Board stub')` is null). The back arrow stays tested at `labels-screen.spec.tsx:284`.

---

## Discrimination Sensor

Isolated `git worktree` (detached HEAD) with symlinked `node_modules`; runner `./node_modules/.bin/vitest run <files>`; no pnpm. `git status --porcelain` of the real tree was empty before and after; worktree removed and pruned; no broken `node_modules` links.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/features/board/api/label-usage.ts` (`countLabelUsage([...cards, ...columns])`) | Dropped the archived-column card sources from the count | ✅ Killed (3 failures: `label-usage.spec.tsx` counts, refetch-failed-sources; VM row usage) |
| M2 | `src/features/board/model/label-usage.ts:33` (`labelChanges`) | `if (color !== label.color) changes.color = color` made unconditional (PATCH always carries color) | ✅ Killed (8 failures across `use-labels-view-model.spec.tsx` and `label-usage.spec.ts`) |
| M3 | `src/features/board/api/label-mutations.ts` (`useDeleteLabel`) | `[false, true]` to `[false]` (archived card cache keeps the deleted id) | ✅ Killed (`label-mutations.spec.tsx` "removes the label and its id from every card in both lists") |
| M4 | `src/features/board/view-models/use-labels-view-model.ts:206` | Removed the in-flight guard `isSubmitting.current` in `submit()` | ✅ Killed (`use-labels-view-model.spec.tsx` "a second submit in flight sends nothing") |
| M5 | `src/features/board/model/label-usage.ts:21` (`usageText`) | `count === 1 ? 'one' : 'many'` to `'many'` | ✅ Killed (`label-usage.spec.ts` "picks the one form for 1"; `labels-list.spec.tsx` usage text) |

**Sensor depth**: lightweight (feature is not P0)
**Result**: 5/5 killed - PASS ✅

---

## Interactive UAT Results

Not performed by the Verifier (left to the user).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`label-color-picker.tsx` extracted from the card label form and reused by the dialog; no single-use abstractions found) |
| Surgical changes | ✅ (touches outside `labels-*`: `archived-counts.ts`, `card-detail-label-form.tsx`, `board-breadcrumb.tsx`, `protected-layout.tsx`, `queries.ts`, all tied to tasks T2, T9, T16) |
| No scope creep | ✅ |
| Matches patterns | ✅ (VM + screen + `useOptimisticBoardViewChange`, `labels-*` naming per spec assumption) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (one cosmetic FLP-09 caveat) |
| Per-layer Coverage Expectation met (model 1:1 ACs; api; VM failure paths; components; e2e happy+edge+error) | ✅ e2e covers happy, empty, validation duplicate, archived; error paths (5xx/409/404) are unit-only |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (`labels-states.spec.tsx:48` tags FLP-38 for the read-only empty state; that behavior is FLP-27, a cosmetic mis-tag) |
| Documented guidelines followed | none - strong defaults applied (tasks.md Test Coverage Matrix and confirmed lessons L-001, L-011, L-017, L-018: L-017 honored by the `Recarregar` click tests, L-018 by the `disabled:opacity-45` class checks) |

---

## Edge Cases

- [x] 50-char name sent (FLP-33)
- [x] Trimmed name sent and shown (FLP-34)
- [x] Last label deleted shows the empty state (FLP-35)
- [x] Focus return after dialogs and delete (FLP-36)
- [x] Label deleted elsewhere (FLP-37)
- [x] Created label never applied shows "não usada" (FLP-38)

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build`
- **Result**: lint, typecheck, build exit 0; vitest 2054 passed, 0 failed, 0 skipped (137 test files). First pass: 2047; the follow-up added 7 tests
- **Test count before feature**: not measured; diff shows 0 removed `it(`/`test(` lines and 138 added test/each lines, so the count only grew
- **Test count after feature**: 2054
- **Skipped tests**: none
- **Failures**: none
- **e2e (`test:e2e`, Full gate)**: NOT run by the Verifier (needs Playwright Chromium and the API and DB servers; no browser allowed). Relying on CI. The e2e spec was read and cited above.

---

## Fix Plans

No blocking fix. Status of the first-pass items:

1. **Fix 1 (Minor)** - PT texts of FLP-01/06/13/19: ✅ fixed in the follow-up (`label-form-dialog.spec.tsx:106`, `labels-screen.spec.tsx:125-144`).
2. **Fix 2 (Minor)** - Esc on the labels page: ✅ implemented and tested in the follow-up.
3. **Fix 3 (Minor)** - rendered alert text through the 409 `label-name-taken` path (FLP-30): ✅ fixed in the follow-up (`labels-screen.spec.tsx:328-358`).
4. **Fix 4 (Cosmetic)** - back arrow phone-only (`md:hidden`) and the "›" separator (FLP-09): open, optional.
5. **Cosmetic** - `labels-states.spec.tsx:48` tags FLP-38 on a read-only empty-state test (behavior is FLP-27): open, optional.

---

## Requirement Traceability Update

Verifier does not edit `spec.md`. Suggested statuses:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FLP-01..08, 10-38 | Pending | ✅ Verified |
| FLP-09 | Pending | ✅ Verified with a cosmetic caveat |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 38/38 FLPs have evidence; 1 cosmetic caveat (FLP-09)
**Sensor**: 5/5 mutations killed
**Gate**: 2054 passed, 0 failed (lint, typecheck, build green; e2e not run, left to CI)

**What works**: list with three-source usage counts, create (non-optimistic, in-flight guard), optimistic edit and delete with rollback, all doc §10 failure toasts with their actions, read-only archived board, focus return.

**Issues found**: none open besides two cosmetic items (see Fix Plans).

**Next steps**: user UAT; CI e2e.
