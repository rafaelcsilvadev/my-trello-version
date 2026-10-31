# Card Checklist Validation

**Date**: 2026-10-30
**Spec**: `front-end/.specs/features/card-checklist/spec.md`
**Diff range**: `e2e9058..1fc2d8f` (`e2e9058` = merge of spec PR #336; `1fc2d8f` = merge of PR #357, main HEAD). 21 code/test commits (`b59bec0` T1 … `8e3bccd` T19) plus docs commits; `git diff --stat e2e9058..1fc2d8f -- front-end/src front-end/test front-end/e2e` → 29 files, +3440/−61 (`src/` 16 files, `test/` 13 files). Outside `src`/`test`: `README.md`, `ROADMAP.md`, `STATE.md`, `tasks.md` only.
**Iteration 2 diff range**: `1fc2d8f..a1ae7c1` (`a1ae7c1` = merge of PR #363, main HEAD). Test commits `cb2b51d` (Fix 1, PR #359), `0f28e37` (Fix 2, PR #360), `8d92b1f` (Fix 3, PR #361), `38c3f5f` (Fix 4, PR #362), `9260982`, `cc895bd`, `fc9e22d` (Fix 4 open item, PR #363); the rest are docs (`0db3df3`, `c4e87c0`, `eb22ba5`). `git diff --shortstat 1fc2d8f..a1ae7c1 -- front-end/src front-end/test front-end/e2e` → 6 files, +75/−2, all under `test/`; no `src` file changed.
**Verifier**: independent pass (author ≠ verifier), iteration 2 (iteration 1 kept below)

## Validation: Card Checklist - PASS ✅ (iteration 2)

**Result (iteration 2)**: PASS ✅. All three iteration-1 gaps are closed with discriminating evidence, and the optional Fix 4 is done. The build gate is green on `a1ae7c1`: **1669** unit/component tests (1666 + 3), lint, typecheck, build; 31 e2e green in CI run `41160769236`. The sensor re-ran S18, S19 and S23 exactly as in iteration 1 (all now **killed**) and spot re-ran S20, S21 and S30, whose killing specs (`cd.spec`, `dvm.spec`) the Fix 4 commits touched: 6/6 killed.

1. **Fix 1 / FCL-35, FCL-36 edit path ✅**: `vm.spec:637-653` answers a text save with `409` and asserts the conflict text, **Recarregar**, no **Tentar novamente**, the draft back (`{ i2: 'Comprar leite' }`) and the cache text back to `seed[0].text`; `vm.spec:655-671` answers with `404` and asserts the save-fail text, no **Tentar novamente**, the draft back and `requests.items` growing. The cache revert on `404` is the same status-independent rollback the `409` and `5xx` tests assert (`vm.spec:615-634`). S19 killed (2 tests, `vm.spec`).
2. **Fix 2 / FCL-35 Recarregar ✅**: `vm.spec:481-493` waits for the settle refetch of a `409` toggle (`queryClient.isFetching()` `0`), clicks **Recarregar** and asserts `requests.items` is exactly `settled + 1`. S18 killed (`vm.spec`).
3. **Fix 3 / FCL-09 dimmed ✅**: `item.spec:126-134` asserts `text-text-tertiary` on a done item's text, `:136-142` asserts it is absent when not done. S23 killed (`item.spec`).
4. **Fix 4 (optional) ✅**: see the Fix 4 result under Fix Plans. No test ends with a change in flight.

### Iteration 1 verdict: Card Checklist - FAIL ❌

**Result (iteration 1)**: FAIL ❌. The build gate is green on `1fc2d8f`: **1666** unit/component tests (1531 + 135), lint, typecheck, build; 31 e2e green in CI run `41154954795`. 37 of 40 FCL requirements have full discriminating evidence. The sensor ran 40 behavior-level mutants: **36 killed, 3 survived** (S18, S19, S23), 1 equivalent (S34). No code defect was found; all three gaps are test-only.

1. **S19 / FCL-35, FCL-36 (edit path, test-only)**: an item text save has its own failure handler (`use-card-checklist-view-model.ts:117-120`), separate from the `runChange` path of toggle and delete. Only its `5xx` branch is tested (`vm.spec:599-619`). Forcing every text-save failure to the `5xx` branch (`Object.assign(err, { status: 500 })`) passes every test, so a `409` on an edit could show "Tentar novamente" instead of the conflict toast, and a `404` could skip the refetch, unnoticed.
2. **S18 / FCL-35 Recarregar (test-only)**: the reload that **Recarregar** runs (`use-card-checklist-view-model.ts:40-45`) can invalidate only the card query, leaving the checklist and the board lists stale, and nothing fails. The `404` tests (`vm.spec:479-491`, `:705-717`) see the checklist refetch, but that refetch comes from the optimistic pipeline's settle refetch (`api/mutations.ts`), not from the reload. No test clicks **Recarregar**. Repeat of lesson L-017 (card-detail M19).
3. **S23 / FCL-09 "dimmed" (test-only)**: a done item's text can keep `text-text-primary` (only `line-through`) and every test passes. `item.spec:126-133` asserts `line-through` only. Repeat of lesson L-018.

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-10-30) | `e2e9058..1fc2d8f` | ✅ 1666 unit (local), 31 e2e (CI `41154954795`) | 37/40 strong, 3 with a weak conjunct (FCL-09, FCL-35, FCL-36) | 36/40 killed, S18, S19, S23 survived, S34 equivalent | ❌ FAIL, Fixes 1–3 |
| 2 (2026-10-30) | `1fc2d8f..a1ae7c1` | ✅ 1669 unit (local), 31 e2e (CI `41160769236`) | 40/40 strong | 6/6 killed (S18, S19, S23 re-run; S20, S21, S30 spot re-run) | ✅ PASS |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T21 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `46`. Each task has its own commit (`b59bec0`..`fb811ca`, `bb4260c`) and a `docs: check off` commit. T19 (full gate) is backed by CI run `41154060287` on PR #355's merge: front-end e2e "31 passed". |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. Line numbers are read on `1fc2d8f`, except the iteration-2 evidence, read on `a1ae7c1` (the fixes shift `vm.spec` lines after `:480` by 16, and after `:620` by 52). Short names: `model.spec` = `unit/features/board/model/checklist.spec.ts`; `val.spec` = `unit/features/board/model/validation.spec.ts`; `q.spec` = `unit/features/board/api/checklist-queries.spec.tsx`; `mut.spec` = `unit/features/board/api/checklist-mutations.spec.tsx`; `vm.spec` = `unit/features/board/view-models/use-card-checklist-view-model.spec.tsx` (PT-BR); `dvm.spec` = `unit/features/board/view-models/use-card-detail-view-model.spec.tsx` (EN); `item.spec` = `unit/features/board/components/card-detail-checklist-item.spec.tsx` (PT-BR); `cl.spec` = `unit/features/board/components/card-detail-checklist.spec.tsx` (PT-BR); `cd.spec` = `unit/features/board/components/card-detail.spec.tsx` (PT-BR); `e2e` = `e2e/card-checklist.e2e-spec.ts` (EN, real API). "Sx" points to a sensor mutant.

### P1: See the checklist and its progress

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-01 | Section "Checklist" below the description, items in ascending `position` | `model.spec:75-91` `sortItems` order `['a','b','c']`, input untouched; `q.spec:64-79` unsorted response → ids sorted; `vm.spec:152-168` ids `['i1','i2','i3']`; `cl.spec:85-94` heading + values in order; `cd.spec:454-479` checkbox states `[true,false,false]`, values `['Draft','Review','Send','']`, `description.compareDocumentPosition(section) & FOLLOWING`; `e2e:133` (S32 killed) | ✅ |
| FCL-02 | Section skeleton while items load; rest of the detail shows once the card is loaded | `vm.spec:137-150` status `'loading'`, items `[]` while held; `cl.spec:123-129` `[aria-busy="true"]` present, no checkbox, no bar; `dvm.spec:356-366` checklist `'error'` while detail `'ready'`; `cd.spec:545-559` title editable while the section fails (S37 detail waits for the checklist, S38 no skeleton: killed) | ✅ |
| FCL-03 | Network/5xx → "Não foi possível carregar" + **Tentar novamente** in the section, reloads items, rest usable | `vm.spec:184-207` `'error'`, `retryLoad` → `requests.items` `failed + 1`, `requests.card` `0`, `'ready'`; `vm.spec:209-224` failed refetch keeps items (S17 killed); `cl.spec:131-145` alert text, retry `toHaveBeenCalledOnce`; `cd.spec:545-559` alert inside the section, "Título" `disabled` `false` | ✅ |
| FCL-04 | Items `404` → "Esta tarefa não existe mais" + **Fechar** | `q.spec:81-110` `ApiError` status 404, 1 call; `dvm.spec:349-354` status `'notFound'`; `cd.spec:535-543` text "Esta tarefa não existe mais" (S20 killed). **Fechar** is the FCD-11 not-found state, already verified in card-detail | ✅ |
| FCL-05 | ≥1 item: count "done/total", progressbar named "Checklist", `aria-valuetext` "done/total", width round(done/total×100) % | `model.spec:36-60` 1/3 → 33, 2/3 → 67; `cl.spec:96-103` count "2/3" `text-text-secondary`, `aria-valuetext` `'2/3'`, `style.width` `'67%'`, `bg-brand`; `e2e:134-136` `aria-valuetext` `'1/3'` (S1, S31 killed) | ✅ |
| FCL-06 | All done → count and bar green | `model.spec:62-71` `isComplete: true`, 100; `cl.spec:105-113` count `text-green-700`, width `'100%'`, `bg-green-500` (S2, S29 killed) | ✅ |
| FCL-07 | No items → no count, no bar | `model.spec:27-34`; `cl.spec:115-121` `count('0/0')` `toBeNull()`, `progressBar()` `toBeNull()`, heading shown (S26 killed) | ✅ |
| FCL-08 | Checkbox named by text; field "Editar item “{text}”"; button "Excluir item “{text}”"; names use the saved text | `item.spec:50-56` all three found by name with a different draft present (S33 killed) | ✅ |
| FCL-09 | Done → checkbox checked, text struck through **and dimmed** | `item.spec:126-133` `checked` `true`, `line-through` `true`; `:135-140` not done → both false. Dimmed (`text-text-tertiary`, `card-detail-checklist-item.tsx:77`) not asserted: S23 survived. **Iteration 2**: `item.spec:126-134` `classList.contains('text-text-tertiary')` `true`; `:136-142` `false` (S23 killed) | ✅ (it. 2) |

### P1: Add an item

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-10 | Enter with 1–200 chars after trim → `POST /cards/{cardId}/checklist-items` with trimmed `text` | `mut.spec:192-209` `bodies` `toEqual([{text:'Ship'}])`; `vm.spec:275-286` `setNewText` padded → `bodies` `[{text:'Comprar pão'}]`; `cl.spec:225-234` Enter → `add` once (S11 killed) | ✅ |
| FCL-11 | While create in flight: keep text, ignore Enter | `vm.spec:288-306` second `add` while held: `newText` kept, after settle `bodies` length 1; `vm.spec:308-325` text typed meanwhile survives the 201 (S10, S12 killed) | ✅ |
| FCL-12 | `201` → new item not done at the end, field cleared, focus kept | `mut.spec:225-240` cache `[firstItem, created]` and checklist invalidated; `vm.spec:283` `newText` `''`; `cl.spec:225-234` `activeElement` is the add field; `e2e:139-148` order `[...,'Publish']`, value `''`, `toBeFocused()` | ✅ |
| FCL-13 | Empty after trim → "Escreva o item", nothing sent | `val.spec` `''`/`'   '` → `checklistItemRequired`; `vm.spec:327-342` error `{target:'new', code}`, `bodies` `[]` (S39 killed); `cl.spec:236-243` alert text `'Escreva o item'`; `e2e:150-152` "Write the item", still 4 items | ✅ |
| FCL-14 | >200 after trim → "Use até 200 caracteres", nothing sent | `val.spec` 201 chars → `checklistItemTooLong`; `vm.spec:327-342` 201 chars, `bodies` `[]`; `cl.spec:245-254` alert text `'Use até 200 caracteres'` (S4 killed) | ✅ |
| FCL-15 | Typing in a field with an item error clears it | `vm.spec:344-353` `setNewText` → error `null`; `vm.spec:583-597` typing in another item keeps i2's error, typing in i2 clears it | ✅ |

### P1: Tick an item off

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-16 | Toggle → `PATCH /checklist-items/{id}` with the new `done`; new state and count at once | `vm.spec:413-426` both directions: `requests` `[{id, body:{done}}]`, no toast; `vm.spec:428-448` `done` true while held; `mut.spec:364-398` `done` +1 / −1 in the three card caches before the reply; `cd.spec:481-497` "2/3" in the section and on the tile; `e2e:154-158` (S6, S13 killed) | ✅ |
| FCL-17 | Change in flight → that item's checkbox and delete disabled | `mut.spec:506-524` pending set `{firstItem.id}`; `vm.spec:428-448` `pendingIds.has('i2')` true, `'i3'` false, cleared on settle; `item.spec:151-157` checkbox and delete disabled, text enabled; `cl.spec:154-171` pending row locked, other row not (S22, S36 killed) | ✅ |

### P1: Edit an item's text

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-18 | Enter or blur with a different valid trimmed text → `PATCH` with trimmed `text`, shown at once | `vm.spec:499-520` draft cleared, `textOf` `'Comprar leite'`, `requests` `[{id:'i2', body:{text:'Comprar leite'}}]`; `mut.spec:341-362` cache shows the text before the reply; `item.spec:91-109` Enter and blur → `onSubmit` once; `e2e:168-174` renamed field named by the new text (S25 killed) | ✅ |
| FCL-19 | Equal trimmed text → nothing sent | `vm.spec:522-534` `requests` `[]`, draft cleared (S14 killed) | ✅ |
| FCL-20 | Empty → "Escreva o item", text kept, nothing sent | `vm.spec:536-553` error `{target:'i2', code:'checklistItemRequired'}`, `drafts` `{i2:'   '}`, `requests` `[]` (S40 killed); `e2e:208-211` blur on empty → "Write the item" | ✅ |
| FCL-21 | >200 → "Use até 200 caracteres", text kept, nothing sent | `vm.spec:536-553` 201 chars → `checklistItemTooLong`, draft kept, `[]`; `cl.spec:245-254` message | ✅ |
| FCL-22 | Esc → saved text back, error cleared, detail open | `vm.spec:570-581` drafts `{}`, error `null`; `item.spec:111-124` `onCancel` once, `preventDefault`, ancestor not reached; `e2e:200-206` value back to "Review", panel visible (S24 killed) | ✅ |
| FCL-23 | Error → field `aria-invalid="true"`, message below the list with `role="alert"` | `item.spec:142-149`; `cl.spec:154-171` only the row with the error is invalid; `cl.spec:173-181`, `:236-254` add/item alert text and `aria-invalid` on the right field (S28 killed). "Below the list" rests on the render order (`card-detail-checklist.tsx:125-130`), not asserted; visual, UAT | ✅ |

### P1: Delete an item

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-24 | Delete → `DELETE /checklist-items/{id}`, item gone and count updated at once, no confirmation | `mut.spec:528-545` ids `[firstItem.id]`; `mut.spec:547-582` gone before reply, done item → `{total:2, done:0}`, not done → `{total:2, done:1}`; `vm.spec:640-658` ids `['i1','i3']`, no toast; `e2e:177-182` "1/2" (S5 killed) | ✅ |
| FCL-25 | Focus → "Adicionar item e apertar Enter" | `cl.spec:262-269` `remove('i3')`, `activeElement` is the add field (S27 killed) | ✅ |
| FCL-26 | Last item deleted → no count, no bar | Follows from the derived progress: `vm.spec:228-250` progress follows the cache; `mut.spec:547-560` item leaves the cache at once; `cl.spec:115-121` total 0 → no count, no bar (S26 killed) | ✅ |

### P1: Close with an unsaved item edit

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-27 | Item text ≠ saved text → unsaved edit | `model.spec:97-117` dirty/clean cases incl. trim and unknown id; `vm.spec:721-739`; `dvm.spec:1023-1032` detail `isDirty` true, false after `cancelDraft` (S3, S21 killed) | ✅ |
| FCL-28 | Any close path with an item edit → "Descartar alterações?" | `dvm.spec:1090-1101` `close()` → `isDiscardOpen` true, path kept; `cd.spec:561-576` Esc on the detail → alertdialog "Descartar alterações?"; `e2e:208-217` dialog → Discard closes. Every close path shares the one blocker (verified for FCD-41) | ✅ |
| FCL-29 | Text in the add field is not an unsaved edit | `vm.spec:741-748`; `dvm.spec:1034-1041` `isDirty` false; `dvm.spec:1103-1113` close goes to the board, no dialog | ✅ |
| FCL-30 | Esc in an item field closes only that edit | `item.spec:111-124` `stopPropagation` (ancestor listener not called); `e2e:200-206` panel still visible (S24 killed) | ✅ |

### P1: Read-only checklist

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-31 | Archived card / archived board → checkbox and text disabled and dimmed | `item.spec:159-168` disabled + `disabled:text-text-disabled`; `cl.spec:183-191`; `cd.spec:499-532` both modes, every checkbox and textbox `disabled`; `e2e:221-238` archived card (S30 killed). Checkbox dims through the shared `Checkbox` (`data-disabled:opacity-45`) | ✅ |
| FCL-32 | Read-only → no delete buttons, no add field | `item.spec:167`; `cl.spec:271-275`; `cd.spec:526-531` `queryAllByRole('button')` length 0, add field `null`; `e2e:239-242` (S35 killed) | ✅ |
| FCL-33 | Read-only → count and bar still shown | `cl.spec:147-152` "2/3", `aria-valuetext` `'2/3'`; `cd.spec:532` "1/3" in both modes; `e2e:230` | ✅ |

### Edge cases

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCL-34 | Edit/toggle/delete network or 5xx → undo + "Não foi possível salvar. Tente novamente." + **Tentar novamente** | toggle `vm.spec:450-464` undo, retry resends `{done:true}`; edit `vm.spec:599-619` text restored, retry resends; delete `vm.spec:677-690` item back, retry resends; `mut.spec:423-461` only the failed toggle reverts, overlapping text edit kept; `mut.spec:600-624` item back at its index, progress restored (S9 killed) | ✅ |
| FCL-35 | Create/edit/toggle/delete `409` → undo + "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar** | create `vm.spec:370-383`, toggle `vm.spec:466-477`, delete `vm.spec:692-703`: exact text, **Recarregar** shown, no retry, undo. **Edit `409`: no test** (S19 survived). **Recarregar never clicked**: reload key unproven (S18 survived). **Iteration 2**: edit `409` `vm.spec:637-653` conflict text, **Recarregar**, no retry, draft and cache text restored (S19 killed); **Recarregar** `vm.spec:481-493` `requests.items` `toBe(settled + 1)` (S18 killed) | ✅ (it. 2) |
| FCL-36 | Edit/toggle/delete `404` → undo + save-fail toast + checklist refetch | toggle `vm.spec:479-491`, delete `vm.spec:705-717`: save-fail text, no retry button, `requests.items` grows. **Edit `404`: no test** (S19 survived). **Iteration 2**: edit `404` `vm.spec:655-671` save-fail text, no retry, draft restored, `requests.items` grows (S19 killed) | ✅ (it. 2) |
| FCL-37 | Failed text save keeps the typed text as an unsaved edit | `vm.spec:599-619` drafts `{i2:' Comprar leite ', i3:'Rascunho'}` after a 5xx, cache text restored (S15 killed) | ✅ |
| FCL-38 | Failed create keeps the add text + save-fail toast with **Tentar novamente** | `vm.spec:355-368` `newText` `' Comprar pão '` kept, retry → `bodies` twice trimmed, then cleared; `mut.spec:262-289` no cache change on 409/5xx | ✅ |
| FCL-39 | Any save → tile "done/total" without reload | create `mut.spec:242-260` `{total:4, done:1}` in card, active and archived caches; toggle `mut.spec:364-398`; delete `mut.spec:562-582`; `cd.spec:481-497` tile "2/3" after a tick; `e2e:184-186` tile "1/2" after rename + delete (S7, S8 killed) | ✅ |
| FCL-40 | Exactly 200 chars after trim → saved | `val.spec` 200 chars and 200 with outer spaces → `null`; `vm.spec:555-568` `requests` `[{id:'i2', body:{text}}]` with 200 chars | ✅ |

**Status (iteration 2)**: ✅ 40/40 fully evidenced.

**Status (iteration 1)**: ❌ 37/40 fully evidenced; FCL-09, FCL-35, FCL-36 need a test each. 0 spec-precision gaps (every outcome in the spec is precise: texts, bodies, roles, percent rule).

---

## Discrimination Sensor

### Iteration 2 sensor

Temporary `git worktree add --detach` at `<scratchpad>/cc-sensor2` on `a1ae7c1`, with the root, `front-end` and `packages/api-contract` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). Same runner and restore method as iteration 1: `node ./node_modules/vitest/vitest.mjs run test/unit/features/board test/unit/pages` (**1268** tests, all green unmutated; 1265 + 3). Line numbers are unchanged since iteration 1 (no `src` change).

| # | File:line | Mutation | Killed? (failing specs) |
| - | --------- | -------- | ----------------------- |
| S18 | `view-models/use-card-checklist-view-model.ts:43` | reload invalidates only `boardViewKeys.card` (same as it. 1) | ✅ (vm: `Recarregar after a 409 reloads the checklist`) |
| S19 | `view-models/use-card-checklist-view-model.ts:119` | text-save failure always handled as `5xx` (same as it. 1) | ✅ (vm: edit `409` and `404` tests) |
| S23 | `components/card-detail-checklist-item.tsx:77` | done text `text-text-primary` (same as it. 1) | ✅ (item: `…dims it when done (FCL-09)`) |
| S20 | `view-models/use-card-detail-view-model.ts:87-89` | checklist `404` no longer means notFound (spot re-run) | ✅ (cd, dvm) |
| S21 | `view-models/use-card-detail-view-model.ts:101-102` | checklist drafts not in `dirty` (spot re-run) | ✅ (cd, dvm) |
| S30 | `components/card-detail.tsx:168` | checklist never read-only (spot re-run) | ✅ (cd) |

**Outcome (iteration 2)**: 6/6 killed → ✅
**Isolation**: real-tree `git status --porcelain` was empty before and after (diffed against the saved baseline: identical); the worktree's porcelain after the last restore listed only the three `node_modules` symlinks; the symlinks were unlinked, then `git worktree remove --force` and `git worktree prune` ran; `git worktree list` shows only the main tree; `find front-end/node_modules node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → 0 broken links; `front-end/node_modules/vitest/vitest.mjs` still resolves. No `git stash` used.

### Iteration 1 sensor

Temporary `git worktree add --detach` at `<scratchpad>/cc-sensor` on `1fc2d8f`, with the root, `front-end` and `packages/api-contract` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). A script checked that each mutant's old text matched exactly once, applied it, ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board test/unit/pages` (79 files, **1265** tests, all green unmutated), then restored the file from an in-memory copy before the next mutant. Paths are relative to `front-end/src/features/board/`.

| # | File:line | Mutation | Killed? (failing specs) |
| - | --------- | -------- | ----------------------- |
| S1 | `model/checklist.ts:23` | `Math.round` → `Math.floor` (67 % → 66 %) | ✅ (model, vm, cl) |
| S2 | `model/checklist.ts:24` | empty checklist counts as complete | ✅ (model, vm) |
| S3 | `model/checklist.ts:39` | dirty check without trim | ✅ (model, vm) |
| S4 | `model/validation.ts:15` | limit `>` → `>=` (200 rejected) | ✅ (val, vm, dvm) |
| S5 | `api/checklist-mutations.ts:114` | deleting a done item leaves `done` | ✅ (mut) |
| S6 | `api/checklist-mutations.ts:84` | tick ignores the previous `done` | ✅ (mut) |
| S7 | `api/checklist-mutations.ts:38` | create adds 0 to `total` | ✅ (mut) |
| S8 | `api/checklist-mutations.ts:139-142` | archived card list not patched | ✅ (mut) |
| S9 | `api/checklist-mutations.ts:153` | progress revert does nothing | ✅ (mut) |
| S10 | `view-models/use-card-checklist-view-model.ts:68` | Enter not ignored while creating | ✅ (vm) |
| S11 | `view-models/use-card-checklist-view-model.ts:60` | create sends untrimmed text | ✅ (vm) |
| S12 | `view-models/use-card-checklist-view-model.ts:61` | 201 clears text typed meanwhile | ✅ (vm) |
| S13 | `view-models/use-card-checklist-view-model.ts:83` | toggle sends the current `done` | ✅ (vm, cd) |
| S14 | `view-models/use-card-checklist-view-model.ts:115` | unchanged text still sent | ✅ (vm) |
| S15 | `view-models/use-card-checklist-view-model.ts:118` | failed save drops the typed text | ✅ (vm) |
| S16 | `view-models/use-card-checklist-view-model.ts:125` | delete keeps the item's draft | ✅ (vm) |
| S17 | `view-models/use-card-checklist-view-model.ts:54` | failed refetch → section error | ✅ (vm) |
| S18 | `view-models/use-card-checklist-view-model.ts:43` | reload (Recarregar, 404) invalidates only `boardViewKeys.card` | ❌ **Survived** → Fix 2 |
| S19 | `view-models/use-card-checklist-view-model.ts:119` | text-save failure always handled as `5xx` | ❌ **Survived** → Fix 1 |
| S20 | `view-models/use-card-detail-view-model.ts:87-89` | checklist `404` no longer means notFound | ✅ (cd, dvm) |
| S21 | `view-models/use-card-detail-view-model.ts:101-102` | checklist drafts not in `dirty` | ✅ (cd, dvm) |
| S22 | `components/card-detail-checklist-item.tsx:61` | pending does not disable the checkbox | ✅ (item, cl) |
| S23 | `components/card-detail-checklist-item.tsx:77` | done text not dimmed (`text-text-primary`) | ❌ **Survived** → Fix 3 |
| S24 | `components/card-detail-checklist-item.tsx:50` | Esc bubbles to the modal | ✅ (item) |
| S25 | `components/card-detail-checklist-item.tsx:76` | no save on blur | ✅ (item) |
| S26 | `components/card-detail-checklist.tsx:36` | count and bar with no items | ✅ (cl) |
| S27 | `components/card-detail-checklist.tsx:48` | no focus to the add field after delete | ✅ (cl) |
| S28 | `components/card-detail-checklist.tsx:96` | any error marks every row invalid | ✅ (cl) |
| S29 | `components/card-detail-checklist.tsx:74` | bar never green | ✅ (cl) |
| S30 | `components/card-detail.tsx:168` | checklist never read-only | ✅ (cd) |
| S31 | `components/card-detail-checklist.tsx:70` | no `valueLabel` (`aria-valuetext` becomes "67%") | ✅ (cl) |
| S32 | `api/checklist-queries.ts:21` | items not sorted | ✅ (q, vm) |
| S33 | `components/card-detail-checklist-item.tsx:67` | field named by the draft | ✅ (item, cl) |
| S34 | `api/checklist-mutations.ts:42` | create resolves without waiting for the checklist invalidation (`return void`) | ⚪ Equivalent for the spec (no AC fixes when the create settles relative to the refetch) |
| S35 | `components/card-detail-checklist.tsx:106` | add field shown when read-only | ✅ (cl, cd) |
| S36 | `components/card-detail-checklist-item.tsx:87` | pending does not disable delete | ✅ (item, cl) |
| S37 | `view-models/use-card-detail-view-model.ts:94` | detail waits for the checklist (`loading`) | ✅ (cd) |
| S38 | `components/card-detail-checklist.tsx:80` | no section skeleton | ✅ (cl) |
| S39 | `view-models/use-card-checklist-view-model.ts:71-72` | invalid add sets the error but still sends | ✅ (vm) |
| S40 | `view-models/use-card-checklist-view-model.ts:108-109` | invalid edit sets the error but still sends | ✅ (vm) |

**Sensor depth**: expanded lightweight (UI feature, not P0; 40 mutants over model, mutations, view models, components and wiring, every requirement group)
**Outcome**: 36/39 non-equivalent mutants killed, 3 survived (S18, S19, S23) → ❌
**Isolation**: real-tree `git status --porcelain` was empty before and after (diffed against the saved baseline: identical); the worktree's porcelain after the last restore listed only the three `node_modules` symlinks; the symlinks were unlinked, then `git worktree remove --force` and `git worktree prune` ran; `git worktree list` shows only the main tree; `find front-end/node_modules node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → 0 broken links; `front-end/node_modules/vitest/vitest.mjs` still resolves. No `git stash` used.

---

## Interactive UAT Results

Not performed; the orchestrator decides. Worth a look: the alert sits below the list (FCL-23), the done text is dimmed (FCL-09), and the read-only rows are dimmed (FCL-31).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ One pure model file (41 lines), one query hook, three mutation hooks on the existing optimistic pipeline, one view model (166 lines), two components, six lines of composition in `card-detail.tsx` |
| Surgical changes | ✅ Outside the new files: `fieldsPatch`/`inList` moved and made generic (T1, no behavior change, `card-mutations.spec` unchanged), `appendThenInvalidate` exported, `validateTitle` gains `max`, two `ItemFieldError` codes, one key, detail view model composes the checklist. No test removed; the removed test lines are the replaced `renderDetail` / server setups |
| No scope creep | ✅ No reorder, grip or "Movendo" banner (4b2), no label popover, no confirmation on delete |
| Matches patterns | ✅ FE-AD-009/-010 per-item revert via `useOptimisticBoardViewChange`; `useSaveFailureNotifier`; React Aria `TextField`/`ProgressBar`/`Checkbox`; EN + PT-BR keys (FE-AD-004); tests mirror `src/` (FE-AD-007). Nit: the comment at `api/checklist-mutations.ts:77-78` cites FCL-18 for the tick rule; FCL-16 is meant |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ Texts, bodies, percent, names and statuses exact; three weak conjuncts (FCL-09 dim, FCL-35/36 on the edit path, FCL-35 Recarregar) |
| Per-layer Coverage Expectation met (tasks.md matrix) | ⚠️ Model, api and components met it; the view-model row ("every failure toast path (retry, `409`, `404`)") is missed for the text edit |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Spot-checked `vm.spec`, `cl.spec`, `mut.spec`: each test cites an FCL AC, an edge case or a T-task Done-when (e.g. `q.spec:142` `gcTime: 0` → T4; `mut.spec:129` list without the card → T5) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004, -006, -007, -009, -010, -013), lesson L-001 | ✅ L-001 applied: composed detail tests for items, tile badge, read-only, 404, 5xx, discard (`cd.spec:434-577`); S20, S21, S30, S37 killed through the rendered detail |

No `// SPEC_DEVIATION` markers in this feature.

**CI note (not a feature gap)**: run `41154529996` (merge of docs PR #356, `fc34acb`) failed `front-end (test)` with 1666/1666 passing and one unhandled rejection, `ReferenceError: window is not defined` from `toast-provider.tsx:40` via `use-save-failure-notifier.ts:56`, attributed to `dvm.spec`: a `runChange` failure toast fired after the jsdom teardown. The next run on `1fc2d8f` is green, 5 local runs of `dvm.spec` are green, and it is the only such failure in the last 200 runs. The leak source is not pinned down; see Fix 4 (optional).

---

## Edge Cases

- [x] Overlapping toggle and text edit of the same item: a failed toggle keeps the text edit: `mut.spec:423-461`
- [x] Settle refetch once, after the last pending change: `mut.spec:463-504`
- [x] Delete of an item already gone counts nothing: `mut.spec:584-598`
- [x] Tick of an item already done counts nothing: `mut.spec:400-421`
- [x] Text typed while a create is in flight survives the 201: `vm.spec:308-325`
- [x] Read-only modes never block close with an item draft: `dvm.spec:1199-1221`
- [x] Edit `409` / `404` toast and refetch: `vm.spec:637-653`, `vm.spec:655-671` (iteration 2, Fix 1)

---

## Gate Check

**Iteration 2** (real tree, repo root, on `a1ae7c1`):

- **Result**: exit 0. Lint (`oxlint --deny-warnings` + Prettier), `tsc --noEmit` clean, **120 test files, 1669 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 737.31 kB, unchanged)
- **E2E (CI, not run locally)**: run `41160769236` on `a1ae7c1` (main, PR #363), conclusion success, all 12 jobs green; job `front-end (test:e2e)` (`124417586266`): **31 passed (1.2m)**
- **Test count**: 1666 → 1669 (+3: Fix 1 `vm.spec:637`, `:655`; Fix 2 `vm.spec:481`; Fix 3 adds two assertions to existing tests; Fix 4 adds settle waits to four existing tests). No test removed or weakened; the only changed line is the renamed `item.spec:126` title
- **Skipped / failures**: none

**Iteration 1**:

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root, on `1fc2d8f`)
- **Result**: exit 0. Lint (`oxlint --deny-warnings` + Prettier "All matched files use Prettier code style!"), `tsc --noEmit` clean, **120 test files, 1666 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 737.31 kB; 726.86 kB after card-detail, +10 kB)
- **E2E (CI, not run locally)**: run `41154954795` on `1fc2d8f` (main, PR #357), all 12 jobs green, `front-end (test:e2e)` "31 passed (1.1m)". Card-detail PASS had 26, `6b2a1bd` (between the features) added 1, this feature adds the 4 `card-checklist.e2e-spec.ts` journeys
- **Test count before feature**: 1531 (card-detail iteration 2 on `29b6863`; `29b6863..e2e9058` changes one `src` line and one e2e file, no unit test)
- **Test count after feature**: 1666
- **Delta**: +135 new tests; no test removed or weakened
- **Skipped tests**: none
- **Failures**: none locally; one flaky CI run, see the CI note under Code Quality

---

## Fix Plans

| Fix | AC | Kind | Priority |
| --- | -- | ---- | -------- |
| Fix 1 | FCL-35, FCL-36 edit path (S19) | test only | Minor |
| Fix 2 | FCL-35 Recarregar (S18) | test only | Minor |
| Fix 3 | FCL-09 dim (S23) | test only | Cosmetic |
| Fix 4 | CI flake (optional) | test hygiene | Minor |

### Fix 1: An item text save handles `409` and `404` like the other changes (FCL-35, FCL-36) - S19

- **Root cause**: `submitDraft` catches its own failure (`use-card-checklist-view-model.ts:117-120`) instead of going through `runChange`; only its `5xx` branch has a test (`vm.spec:599-619`).
- **Fix task**:
  - **What**: In `vm.spec` (`edit text` block) add `it.each` over `409` and `404` with `updateServer(() => problem(status))`: after `setDraft('i2', 'Comprar leite')` + `submitDraft('i2')`, assert the cache text is back to `seed[0].text`, the draft is back (`drafts.i2` `'Comprar leite'`, FCL-37), and for `409` the conflict text with **Recarregar** and no **Tentar novamente**; for `404` the save-fail text, no **Tentar novamente**, and `requests.items` grows.
  - **Where**: `front-end/test/unit/features/board/view-models/use-card-checklist-view-model.spec.tsx`. Test only.
  - **Verify**: In a scratch copy, change line 119 to `notify(Object.assign(err, { status: 500 }), …)`; the new tests fail. Build gate passes.
  - **Done when**: S19 is killed; test count +2.

### Fix 2: Recarregar reloads the checklist and the board (FCL-35) - S18

- **Root cause**: no test clicks **Recarregar**; on a `404` the optimistic pipeline's settle refetch already invalidates the board, so a wrong reload key goes unseen (same as card-detail M19, lesson L-017).
- **Fix task**:
  - **What**: In `vm.spec`, after a `409` on `toggle('i2')`, wait for the settle refetch to finish, record `requests.items`, click **Recarregar**, and assert `requests.items` grew by exactly 1.
  - **Where**: `front-end/test/unit/features/board/view-models/use-card-checklist-view-model.spec.tsx` (`toggle` block). Test only.
  - **Verify**: In a scratch copy, set `queryKey: boardViewKeys.card(boardId, cardId)` at line 43; the test fails.
  - **Done when**: S18 is killed; test count +1.

### Fix 3: A done item's text is dimmed (FCL-09) - S23

- **Root cause**: `item.spec:126-133` asserts `line-through` only.
- **Fix task**:
  - **What**: In the same test, assert `textbox().classList.contains('text-text-tertiary')` is `true` for a done item, and `false` in the not-done test (`:135-140`).
  - **Where**: `front-end/test/unit/features/board/components/card-detail-checklist-item.spec.tsx`. Test only.
  - **Verify**: In a scratch copy, replace `'text-text-tertiary line-through'` with `'text-text-primary line-through'` at `card-detail-checklist-item.tsx:77`; the test fails.
  - **Done when**: S23 is killed; test count +0.

### Fix 4 (optional): Find the toast that fires after teardown in `dvm.spec`

- **Root cause**: unknown. A `runChange` failure in `use-card-detail-view-model.spec.tsx` resolves after the test environment is gone (CI run `41154529996`).
- **Fix task**: run `dvm.spec` with `--sequence.shuffle` in a loop until it reproduces, then end the leaking test with its request settled (or a `cleanup()` + awaited settle in `afterEach`).
- **Done when**: the source test is fixed or the flake is logged as not reproducible after N shuffled runs.
- **Result**: fixed in `38c3f5f`. Not reproducible as is (0 of 15 runs of the last two tests), so the source was found with a temporary probe, since reverted: it listed every test that ended with a `runChange` still pending. Two did: `confirmDelete is never blocked` and the file's last test, `treats the local calendar date as today`, both holding that test's delete. `confirmDelete` navigates before the delete starts, and the test ended on the `pathname`, so the delete outlived the file; a failure then toasted into the gone jsdom (`notify` default branch, as in the CI stack). The test now awaits the "Tarefa excluída definitivamente" toast. After the fix the probe lists no pending change in `dvm.spec`, in order and in 3 `--sequence.shuffle` runs. Gate green, 1669 tests (+0).
- **Open item (other files, not this feature)**: the same probe over the whole suite lists three tests that end with a change in flight; one settled in the next test as `status 0, Network error`, like the unhandled `POST /cards/c3/move` in the CI log. Harmless while none is the last test of its file:
  - `use-board-view-model.spec.tsx` › "moves the card counters with a cross-column move, before and after the drop"
  - `use-boards-view-model.spec.tsx` › "404 toasts saveFail without a button and refetches the lists, even with another change pending"
  - `card-detail.spec.tsx` › "updates the count and the board tile badge on a tick"
- **Open item result**: closed in `9260982`, `cc895bd` and `fc9e22d`, one per test. Each test now waits for its change to settle before it ends: the move test until `c3` leaves `pendingIds`, the saveFail test until `pendingIds` is empty and the settle refetch is done, and the tick test until the `Review` checkbox is enabled again. The `runChange` probe (temporary, reverted) listed these three tests before the fix and none after, over the whole suite in order and in one `--sequence.shuffle` run. Gate green, 1669 tests (+0).

---

## Requirement Traceability Update

| Requirement | Previous Status | Iteration 1 | Iteration 2 |
| ----------- | --------------- | ----------- | ----------- |
| FCL-01 – FCL-08, FCL-10 – FCL-34, FCL-37 – FCL-40 | Pending | ✅ Verified | ✅ Verified |
| FCL-09 | Pending | ❌ Needs Fix (Fix 3) | ✅ Verified |
| FCL-35 | Pending | ❌ Needs Fix (Fixes 1, 2) | ✅ Verified |
| FCL-36 | Pending | ❌ Needs Fix (Fix 1) | ✅ Verified |

`spec.md` Requirement Traceability updated: Phase `Verify`, all 40 `✅ Verified` (iteration 2).

---

## Summary

**Overall (iteration 2)**: ✅ Ready

**Spec-anchored check**: 40/40 ACs matched the spec outcome; 0 spec-precision gaps
**Sensor**: iteration 2 6/6 killed (S18, S19, S23 now killed); iteration 1 36/39 (S34 equivalent)
**Gate**: 1669 unit/component passed, 0 failed, 0 skipped (`a1ae7c1`); 31 e2e passed in CI `41160769236`

**Iteration 2 notes**: the fixes add tests and assertions only; no `src` change, no test removed or weakened. UAT is still worth a look for the alert below the list (FCL-23), the dimmed done text (FCL-09) and the dimmed read-only rows (FCL-31).

**Lessons (iteration 2)**: clean PASS, nothing new recorded. L-017 and L-018 stay `confirmed`; L-020 stays `candidate`.

### Iteration 1 summary

**Overall**: ❌ Not Ready (3 small gaps, all test-only)

**Spec-anchored check**: 37/40 ACs fully evidenced; 3 Needs Fix (FCL-09, FCL-35, FCL-36); 0 spec-precision gaps
**Sensor**: 36/39 killed (S18, S19, S23 survived; S34 equivalent)
**Gate**: 1666 unit/component passed, 0 failed, 0 skipped (`1fc2d8f`); 31 e2e passed in CI `41154954795`

**What works**: the section loads on its own (skeleton, section error with retry, `404` → not found) without delaying the detail; sorted items; count, bar width, `aria-valuetext` and green state; add with trim, 1–200 validation, one item per Enter and text kept on failure; optimistic tick, rename and delete with per-change revert, including an overlapping toggle and edit; progress kept in step in the card query and both card lists, so the tile updates; pending items locked; Esc only undoes the edit; item drafts count as unsaved edits, the add field does not; both read-only modes lock the rows and hide delete and add.

**Next steps**: Fixes 1–3 (one small test PR, or one per fix), optional Fix 4, then re-verify (iteration 2).

**Lessons**: L-017 (S18) and L-018 (FCL-09 / S23) recurred from card-detail and are now `confirmed` (recurrence 2). New candidate L-020 (S19). L-001 (confirmed, loaded in `tasks.md`) held: no penalty.
