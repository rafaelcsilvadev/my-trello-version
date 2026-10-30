# Card Detail Validation

**Date**: 2026-10-30
**Spec**: `front-end/.specs/features/card-detail/spec.md`
**Diff range**: `972abaf..61a4f7b` (`972abaf` = merge of spec PR #301; `61a4f7b` = merge of PR #328, main HEAD). 27 non-merge commits touch `front-end/src` / `front-end/test`; `git diff --stat 972abaf..61a4f7b -- front-end/src front-end/test front-end/e2e` → 50 files, +5372/−31 (`src/` 27 files, `test/` 23 files).
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1

## Validation: Card Detail - FAIL ❌ (iteration 1)

**Result (iteration 1)**: FAIL ❌. The build gate is green (1528 unit/component tests, lint, typecheck, build; 26 e2e green in CI run `41117429464` on `61a4f7b`). 49 of 53 FCD requirements have full discriminating evidence. The sensor ran 48 behavior-level mutants: **46 killed, 2 survived** (M19, M24). One small code defect: the title input is not dimmed in the read-only modes (FCD-34). All four gaps are small; three are test-only.

1. **M24 / FCD-09 (test-only)**: `CardDetail` can drop the skeleton wiring (`card-detail.tsx:104`) and every test still passes. The view model's `loading` status and `CardDetailSkeleton` are tested apart, but the composed detail never is (repeat of lesson L-001).
2. **M19 / FCD-48 (test-only)**: the reload that the notifier runs on **Recarregar** (`use-card-detail-view-model.ts:57-61`) can target only the active card list and nothing fails. For a `404` the settle refetch of the optimistic pipeline (`api/mutations.ts:379-384`) covers it anyway, but no test clicks **Recarregar** after a `409` and checks that the card and board load again.
3. **FCD-34 "dim" (src change)**: the title `Input` (`card-detail-title.tsx:78`) has no disabled style, only `disabled:hover:bg-transparent`, so the title keeps `text-text-primary` while the checkbox (`opacity-45`), due date and description (`disabled:text-text-disabled`) dim. No test asserts dimming for any field.
4. **FCD-29 "no control to change them" (test-only, minor)**: chips and order are asserted. Nothing asserts that the labels block has no button.

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-10-30) | `972abaf..61a4f7b` | ✅ 1528 unit (local), 26 e2e (CI `41117429464`) | 49/53 strong, 2 partial (FCD-09, FCD-34), 2 with a weak conjunct (FCD-29, FCD-48) | 46/48 killed, M19 and M24 survived | ❌ FAIL, Fixes 1–4 |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T27 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `55`. T27 (feature done) is checked; CI run `41117429464` on `61a4f7b` confirms the full gate including e2e. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. Line numbers are read on `61a4f7b`. Short names: `model.spec` = `unit/features/board/model/card-detail.spec.ts`; `q.spec` = `unit/features/board/api/card-detail-queries.spec.tsx`; `cm.spec` = `unit/features/board/api/card-mutations.spec.tsx`; `mut.spec` = `unit/features/board/api/mutations.spec.tsx`; `vm.spec` = `unit/features/board/view-models/use-card-detail-view-model.spec.tsx` (PT-BR); `cd.spec` = `unit/features/board/components/card-detail.spec.tsx` (PT-BR); `title.spec`, `desc.spec`, `due.spec`, `foot.spec`, `notice.spec`, `states.spec`, `dlg.spec` = `unit/features/board/components/card-detail-{title,description,due-date,footer,notices,states,dialogs}.spec.tsx`; `tile.spec` = `unit/features/board/components/card-tile.spec.tsx`; `screen.spec` = `unit/features/board/components/board-screen.spec.tsx` (EN); `page.spec` = `unit/pages/card-detail-page.spec.tsx` (EN); `notifier.spec` = `unit/shared/ui/toast/use-save-failure-notifier.spec.tsx`; `e2e` = `e2e/card-detail.e2e-spec.ts` (EN, real API). "Mx" points to a sensor mutant.

### P1: Open and close the card detail

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-01 | Click or Enter on an active tile → `/b/{boardId}/t/{cardId}`, dialog `aria-modal="true"` | `tile.spec:580-596` `onOpen` `toHaveBeenCalledExactlyOnceWith('c1')` on click and Enter, Enter `preventDefault`; `screen.spec:712-728` path `toBe(detailPath(cardId))`; `cd.spec:131` `getAttribute('aria-modal')` `toBe('true')`; `e2e:123-126` URL + `aria-modal` (M25, M40, M43 killed) | ✅ |
| FCD-02 | Click or Enter on a tile in "Arquivadas" → its detail | `tile.spec:580-596` archived tile row; `screen.spec:730-748` "Show archived" → path `detailPath('c9')` (M42 killed) | ✅ |
| FCD-03 | ≥ 768 px: centered modal, board behind, X "Fechar" | `cd.spec:135-143` X wrapper `hidden md:flex`; `e2e:127-128` "Close" visible at desktop, "Doing" column attached behind. "Centered" rests on `md:justify-center` (`card-detail.tsx:52`), not asserted; visual, UAT | ✅ |
| FCD-04 | < 768 px: full screen, back arrow "Voltar", no X | `cd.spec:142` back wrapper `md:hidden`; `e2e:304-320` "Back" visible, "Close" hidden, `boundingBox` `toEqual({x:0,y:0,...PHONE_VIEWPORT})` | ✅ |
| FCD-05 | Direct URL shows the board behind the detail | `page.spec:64-79` dialog + board `h1` "Product launch" (hidden by the modal); `e2e:280-283` | ✅ |
| FCD-06 | Header shows the card's current column | `cd.spec:132` `within(dialog).getByText('Backlog')`; `vm.spec:396-415` active and archived column; `e2e:191` (M28 killed) | ✅ |
| FCD-07 | X, back arrow, Esc, backdrop, browser Back with no edits → `/b/{boardId}` | `cd.spec:145-155` Fechar/Voltar, `:157-169` Esc, `:171-179` backdrop, all `closedPath` `toBe(boardPath)`; `vm.spec:982-989` close (M26 killed). Browser Back without edits is plain router navigation with the same blocker predicate (`dirty && ...`), proven open by `vm.spec:982` | ✅ |
| FCD-08 | On close, focus goes to the tile when on screen | `page.spec:133-149` after Esc `document.activeElement` `toBe(tile)`; `:151-166` same for a detail opened by URL (M27 killed) | ✅ |
| FCD-09 | Skeleton while loading | `vm.spec:281-309` status `'loading'` while each query is held; `states.spec:16-27` `aria-busy="true"`, no controls. **No test renders `CardDetail` while loading** (M24 survived) | ❌ Partial → Fix 1 |
| FCD-10 | Network/5xx → "Não foi possível carregar" + **Tentar novamente** that loads again | `vm.spec:332-357` status `'error'`, retry refetches only the failed query; `cd.spec:263-281` alert text `'Não foi possível carregar'`, click → title textbox shown | ✅ |
| FCD-11 | `404` or other-board card → "Esta tarefa não existe mais" + **Fechar** → `/b/{boardId}` | `vm.spec:311-330` 404 on card/board and card of list `l-other` → `'notFound'` (M6, M21 killed); `states.spec:41-71` heading text, `onClose` once; `page.spec:120-131`; `e2e:236-242` text, Close → URL `/b/{id}` | ✅ |
| FCD-12 | `n` and `/` ignored while the detail is open | `page.spec:99-118` `fireEvent.keyDown(document.body,{key:'/'|'n'})` `toBe(true)` (not handled) at the detail route, `false` on the board (M25 killed) | ✅ |

### P1: Edit the title and the done flag

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-13 | Checkbox "Concluída" → `PATCH` with the new `done`, shown at once | `vm.spec:448-468` `card.done` `toBe(!done)` before the held reply, `changes` `toEqual(patch({done:!done}))`; `title.spec:46-54` named "Concluída"; `cd.spec:334-339` body `{done:true}` (M16 killed) | ✅ |
| FCD-14 | Badge "Concluída" while done | `title.spec:56-70` `badges('Concluída')` length 1 / 0 | ✅ |
| FCD-15 | Badge "Atrasada" when not done and due before today | `title.spec:72-104` yesterday → 1; today, none, done → 0, with fixed `today` 2026-10-30 (M32 killed) | ✅ |
| FCD-16 | Enter or blur with a different trimmed title → `PATCH` trimmed `title`, shown at once | `vm.spec:510-530` `card.title` `toBe('Write tests')` before reply, `patch({title:'Write tests'})`; `title.spec:126-144` Enter and blur → `onSubmit` once; `e2e:131-136` (M9, M31 killed) | ✅ |
| FCD-17 | Same trimmed title → nothing sent | `vm.spec:532-543` `changes` `toEqual([])` (M10 killed) | ✅ |
| FCD-18 | Empty after trim → "Dê um título à tarefa", field kept, nothing sent | `vm.spec:558-575` `titleError` `'cardTitleRequired'`, draft kept, `[]`; `title.spec:164-179` message, `aria-invalid`; `cd.spec:316-319` on screen | ✅ |
| FCD-19 | > 100 after trim → "Use até 100 caracteres", kept, nothing sent | `vm.spec:558-575` 101 chars → `'cardTitleTooLong'`, `[]`; `title.spec:164-179` | ✅ |
| FCD-20 | Esc in title → saved title back, error cleared, detail open | `vm.spec:577-588`; `title.spec:146-162` `onCancel` once, `preventDefault`, ancestor not reached; `cd.spec:181-194` value `'Write the brief'`, dialog and path kept (M30 killed) | ✅ |

### P1: Set the due date and edit the description

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-21 | Pick a date → `PATCH` `dueDate` `YYYY-MM-DD`, shown at once | `vm.spec:470-487` `dueDate` `'2026-11-05'` before reply, `patch({dueDate:'2026-11-05'})`; `due.spec:35-54` `type` `'date'`, `onChange('2026-12-01')`; `e2e:148-150` | ✅ |
| FCD-22 | "Remover prazo" only with a due date | `due.spec:64-78` shown / `queryByRole` null (M38 killed) | ✅ |
| FCD-23 | "Remover prazo" → `PATCH` `dueDate: null`, field cleared at once | `vm.spec:489-506` `dueDate` null before reply, `patch({dueDate:null})`; `cd.spec:340-344`; `e2e:151-152` (M17 killed) | ✅ |
| FCD-24 | Counter "{n} / 5000" of the draft | `desc.spec:44-66` `'6 / 5000'`, `'0 / 5000'`, `'16 / 5000'` (M37 killed) | ✅ |
| FCD-25 | Salvar and Cancelar only while draft ≠ saved | `desc.spec:76-107` hidden when equal (incl. `''` vs null), shown and wired while dirty (M35 killed) | ✅ |
| FCD-26 | Salvar ≤ 5000 → `PATCH` draft as is (`null` when empty), buttons hidden | `vm.spec:641-653` `patch({description:' Notes '})` untrimmed, draft `null`; `:655-671` `''` → `null`; `model.spec:76-88`; `e2e:157-160` Save hidden (M3 killed) | ✅ |
| FCD-27 | > 5000 → "Use até 5000 caracteres", Salvar disabled | `vm.spec:686-700` error, nothing sent; `desc.spec:109-123` message, Salvar `disabled` `true`; `cd.spec:322-323` (M2, M36 killed) | ✅ |
| FCD-28 | Cancelar → saved description back, buttons hidden | `vm.spec:702-712` draft null, not dirty; `cd.spec:324-325` value `'Saved notes'` | ✅ |
| FCD-29 | Applied labels as chips in board label order, **no control to change them** | `cd.spec:283-293` listitems `toEqual(['Urgent','Bug'])` from card order `['lb3','lb1']`; `vm.spec:429-444` skips deleted ids (M22 killed). "No control" has no assertion (the code has none) | ⚠️ Weak conjunct → Fix 4 |
| FCD-30 | "Criada em {date}", doc §14 format | `foot.spec:54-64` `'Criada em 3 out, 2026'`, `'Created Oct 3, 2026'` | ✅ |

### P1: Move and archive from the detail

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-31 | Mover para… opens the board's move dialog over the detail | `cd.spec:196-210` `dialog` "Mover para…" over the detail, Esc closes only it; `foot.spec:66-78` `onMove` once; `vm.spec:768-789` body `{listId, position: 2}` (end of column) (M18 killed) | ✅ |
| FCD-32 | Move succeeds → detail open, header shows new column | `vm.spec:784` `card.listId` `toBe(doing.id)`, toast "Tarefa movida para Doing"; `mut.spec:668` card query patched; `e2e:183-201` header "Doing", panel visible (M48 killed) | ✅ |
| FCD-33 | Arquivar → `POST .../archive`, toast "Tarefa arquivada", detail open, read-only at once | `vm.spec:831-848` mode `'archivedCard'` before reply, toast, `post('archive')`; `cm.spec:252-267`; `e2e:212-215` (M15, M47 killed) | ✅ |

### P1: Archived card: restore or delete

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-34 | Notice "Tarefa arquivada · somente leitura"; done, title, due, description **disabled and dimmed**; Restaurar + Excluir instead of Mover/Arquivar | `cd.spec:349-374` status text, the four fields `disabled` `true`, no "Mover para…"; `notice.spec:31-38`; `foot.spec:80-94` exactly 2 buttons, Restaurar/Excluir wired (M29, M34 killed). **Dim**: checkbox `data-disabled:opacity-45`, due and description `disabled:text-text-disabled`; the title input has no disabled style (`card-detail-title.tsx:78`); no test asserts dimming | ❌ Partial → Fix 3 |
| FCD-35 | Restaurar → `POST .../unarchive`, toast "Tarefa restaurada", editable at once | `vm.spec:850-865` mode `'editable'` before reply, toast, `post('unarchive')`; `e2e:217-219` | ✅ |
| FCD-36 | Restored card at the end of its column | `cm.spec:350-364` ids `['c1','c2','c3']`, `position: 2`; `model.spec:128-145`; `e2e:221-223` titles `['Clean backlog','Tag release','Write notes']` (M5, M45 killed) | ✅ |
| FCD-37 | Excluir → dialog title, text, Cancelar + Excluir definitivamente | `dlg.spec:42-67` `alertdialog` name, exact text, both buttons (PT-BR, EN); `cd.spec:212-232` opened from the footer | ✅ |
| FCD-38 | Confirm → `DELETE`, `/b/{boardId}`, toast "Tarefa excluída definitivamente" | `vm.spec:913-935` path `boardPath`, toast, `DELETE` once, no refetch; `e2e:227-234` (M13, M50 killed) | ✅ |
| FCD-39 | Archived column: notice at the top; Restaurar and Excluir disabled | `notice.spec:40-49` alert text exact; `foot.spec:96-111` both `disabled`, clicks ignored; `vm.spec:404-415` `isColumnArchived` true (M23, M33 killed) | ✅ |

### P1: Read-only card of an archived board

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-40 | Notice "Quadro arquivado · somente leitura", every field disabled, footer only the date | `cd.spec:349-374` board row; `foot.spec:122-127` 0 buttons, date shown; `e2e:269-301` four fields disabled, four buttons count 0, "Created" visible (M34 killed) | ✅ |
| FCD-41 | Archived board + archived card → only the board notice | `notice.spec:51-60` one status, board text, no card text, no alert; `model.spec:38-46`; `vm.spec:380-392` (M1, M39 killed) | ✅ |

### P1: Unsaved edits

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-42 | Any close path with trimmed-title or description draft ≠ saved → "Descartar alterações?" / "Você tem edições não salvas." + Continuar editando + Descartar | `vm.spec:991-1026` close and browser Back while dirty → `isDiscardOpen` true, path kept; `:957-978` trimmed rule; `model.spec:90-126`; `cd.spec:234-243` X → alertdialog; `dlg.spec:104-129` exact texts; `e2e:246-263` Esc → dialog (M4 killed) | ✅ |
| FCD-43 | Descartar → `/b/{boardId}`, drafts not sent | `vm.spec:1040-1055` path, `changes` `[]`; `e2e:264-265` | ✅ |
| FCD-44 | Continuar editando or Esc → dialog closes, drafts kept | `vm.spec:1057-1075`; `cd.spec:234-261` Esc in the dialog → textarea `'Unsaved notes'`, path kept; `dlg.spec:140-156` | ✅ |
| FCD-45 | Read-only modes close without the dialog | `vm.spec:1077-1100` archived card / archived board with drafts → path `boardPath`, no dialog (M7 killed) | ✅ |
| FCD-46 | Esc in focused title = FCD-20, detail stays | `title.spec:146-162`; `cd.spec:181-194` (M30 killed) | ✅ |

### Edge cases

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FCD-47 | Network/5xx save → undo on screen + "Não foi possível salvar. Tente novamente." + Tentar novamente | `vm.spec:730-748` 500 → `done` back `false`, text exact, buttons `['Tentar novamente']`; `vm.spec:619-637` retry resends; rollback per hook `cm.spec:133-192`, `:281-330`, `:366-384`, `:418-437`; `notifier.spec:53-75` | ✅ |
| FCD-48 | `409` → undo + "Este item foi arquivado. Recarregue para ver o estado atual." + Recarregar | `vm.spec:730-748` 409 → text exact, `done` back, buttons `['Recarregar']`; `notifier.spec:77-92` reload on click (shared). The detail's reload target is never exercised (M19 survived) | ⚠️ Weak conjunct → Fix 2 |
| FCD-49 | `404` → undo + save-fail toast + refetch → "Esta tarefa não existe mais" | `vm.spec:750-764` toast, no button, status `'notFound'` | ✅ (M19 survives here because the settle refetch also reloads) |
| FCD-50 | Failed title/description save keeps the text as a draft | `vm.spec:590-602` draft `' Write tests '`, title back, dirty; `:714-726` draft `'Notes'` (M11, M12 killed) | ✅ |
| FCD-51 | Restore/delete `409` → undo + "A coluna de origem está arquivada. Restaure a coluna primeiro." | `vm.spec:867-879` restore, mode back `'archivedCard'`, `['Recarregar']`; `:937-946` delete; `notifier.spec:185-207` (M14, M49 killed) | ✅ |
| FCD-52 | Any save → same values on the board tile without reload | `cm.spec:87-110` active list patched at once, neighbor untouched; `:112-131` archived list; `:252-267`, `:350-364`, `:406-416`; `e2e:162-168` tile checked and "Tomorrow" after close (M46, M47, M50 killed) | ✅ |
| FCD-53 | Description of 5000 allowed; title of 100 after trim saved | `vm.spec:673-684` 5000 sent; `vm.spec:545-556` `' '+100+' '` → `patch({title})`; `model.spec:67-74` 4999/5000/5001 (M2 killed) | ✅ |

**Status**: ❌ 49/53 fully evidenced; FCD-09 and FCD-34 partial; FCD-29 and FCD-48 have one weak conjunct each. No spec-precision gaps: every FCD text, request, path and rule is precise. "Centered" (FCD-03) and "dimmed" (FCD-34) are visual, so they are left for UAT or a class assertion.

---

## Discrimination Sensor

Temporary `git worktree add --detach` at `<scratchpad>/cd-sensor` on `61a4f7b`, with the root, `front-end` and `packages/api-contract` `node_modules` symlinked from the real tree (no `pnpm install`, no `pnpm` script). Each mutant was applied by a script that checks the old text matches exactly once, ran `node ./node_modules/vitest/vitest.mjs run test/unit/features/board test/unit/pages test/unit/shared/ui test/unit/app` (89 files, **1250** tests, all green unmutated), then restored the file (in-memory copy + `git checkout -- <file>`) before the next one. Paths are relative to `front-end/src/features/board/` unless stated.

| # | File:line | Mutation | Killed? (failing specs) |
| - | --------- | -------- | ----------------------- |
| M1 | `model/card-detail.ts:12` | archived card wins over archived board | ✅ (model, vm) |
| M2 | `model/card-detail.ts:22` | description limit `>` → `>=` | ✅ (model, vm) |
| M3 | `model/card-detail.ts:27` | description trimmed, spaces-only → null | ✅ (model, vm) |
| M4 | `model/card-detail.ts:32` | title dirty check without trim | ✅ (model, vm) |
| M5 | `model/card-detail.ts:44` | `nextPosition` = max, not max + 1 | ✅ (model, cm) |
| M6 | `view-models/use-card-detail-view-model.ts:87` | card of another board is `ready` | ✅ (vm) |
| M7 | `view-models/use-card-detail-view-model.ts:97` | blocker also in read-only modes | ✅ (vm) |
| M9 | `view-models/use-card-detail-view-model.ts:137` | title sent untrimmed | ✅ (vm) |
| M10 | `view-models/use-card-detail-view-model.ts:138` | unchanged title still sent | ✅ (vm) |
| M11 | `view-models/use-card-detail-view-model.ts:154` | failed description save drops the draft | ✅ (vm) |
| M12 | `view-models/use-card-detail-view-model.ts:140` | failed title save drops the draft | ✅ (vm) |
| M13 | `view-models/use-card-detail-view-model.ts:182` | delete does not leave the detail | ✅ (vm) |
| M14 | `view-models/use-card-detail-view-model.ts:240` | restore `409` shows the generic conflict | ✅ (vm) |
| M15 | `view-models/use-card-detail-view-model.ts:232` | archive saves silently (no toast) | ✅ (vm) |
| M16 | `view-models/use-card-detail-view-model.ts:212` | toggle sends the current `done` | ✅ (vm, cd) |
| M17 | `view-models/use-card-detail-view-model.ts:221` | Remover prazo sends `{}` | ✅ (vm, cd) |
| M18 | `view-models/use-card-detail-view-model.ts:168` | move position = end + 1 | ✅ (vm) |
| M19 | `view-models/use-card-detail-view-model.ts:59` | reload invalidates only the active cards, not the whole board (card query left out) | ❌ **Survived** → Fix 2 |
| M20 | `view-models/use-card-detail-view-model.ts:206` | `isPending` always false | ✅ (vm) |
| M21 | `view-models/use-card-detail-view-model.ts:83` | `404` no longer means notFound | ✅ (vm, page) |
| M22 | `view-models/use-card-detail-view-model.ts:78` | labels in card order | ✅ (vm, cd) |
| M23 | `view-models/use-card-detail-view-model.ts:197` | `isColumnArchived` always false | ✅ (vm) |
| M24 | `components/card-detail.tsx:104` | skeleton never rendered while loading | ❌ **Survived** → Fix 1 |
| M25 | `components/card-detail.tsx:61` | no `aria-modal` on the dialog | ✅ (cd, page) |
| M26 | `components/card-detail.tsx:47` | backdrop does not dismiss | ✅ (cd) |
| M27 | `components/card-detail.tsx:39` | unmount blurs instead of focusing the tile | ✅ (page) |
| M28 | `components/card-detail.tsx:88` | header shows the list id | ✅ (cd) |
| M29 | `components/card-detail.tsx:31` | archived card fields editable | ✅ (cd) |
| M30 | `components/card-detail-title.tsx:50` | title Esc bubbles to the modal | ✅ (title, cd) |
| M31 | `components/card-detail-title.tsx:77` | no save on blur | ✅ (title) |
| M32 | `components/card-detail-title.tsx:41` | "Atrasada" for any due date | ✅ (title) |
| M33 | `components/card-detail-footer.tsx:32` | archived column does not disable actions | ✅ (foot) |
| M34 | `components/card-detail-footer.tsx:41` | archived board shows Mover/Arquivar | ✅ (foot, cd) |
| M35 | `components/card-detail-description.tsx:30` | Salvar/Cancelar always shown | ✅ (desc) |
| M36 | `components/card-detail-description.tsx:48` | Salvar enabled over 5000 | ✅ (desc) |
| M37 | `components/card-detail-description.tsx:39` | counter counts the saved text | ✅ (desc) |
| M38 | `components/card-detail-due-date.tsx:45` | Remover prazo always shown | ✅ (due) |
| M39 | `components/card-detail-notices.tsx:35` | column alert also on archived board | ✅ (notice) |
| M40 | `components/card-tile.tsx:89` | Enter does not open | ✅ (tile, screen) |
| M41 | `components/card-tile.tsx:30` | checkbox click opens the card | ✅ (tile) |
| M42 | `components/archived-cards-column.tsx:66` | archived tiles cannot open | ✅ (archived column, screen) |
| M43 | `components/board-screen.tsx:109` | tile navigates to `/b/{id}/c/{card}` | ✅ (screen, page) |
| M45 | `api/card-mutations.ts:98` | restored card at position 0 | ✅ (cm) |
| M46 | `api/card-mutations.ts:33` | update does not patch the board's active list | ✅ (cm) |
| M47 | `api/card-mutations.ts:55` | archive does not patch the card query | ✅ (cm, vm) |
| M48 | `api/mutations.ts:213` | move does not patch the card query's `listId` | ✅ (mut, vm) |
| M49 | `src/shared/ui/toast/use-save-failure-notifier.ts:23` | `conflictMessage` ignored | ✅ (notifier, vm) |
| M50 | `api/card-mutations.ts:117-122` | delete leaves the card in the archived list | ✅ (cm) |

(M8 and M44 were planned and dropped as trivial before the run; the ids were kept so the table matches the script.)

**Sensor depth**: expanded lightweight (UI feature, not P0; 48 mutants over model, view model, mutations, components and wiring, every requirement group)
**Outcome**: 46/48 killed by the unit suite, 2 survived (M19, M24) → ❌
**Isolation**: real-tree `git status --porcelain` was empty before and after (diffed against the saved baseline: identical); the worktree's porcelain after the last restore listed only the three `node_modules` symlinks; `git worktree remove --force` and `git worktree prune` ran, `git worktree list` shows only the main tree on `main`; `find front-end/node_modules node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` → 0 broken links; `front-end/node_modules/vitest/vitest.mjs` still resolves. No `git stash` used.

---

## Interactive UAT Results

Not performed; the orchestrator decides. Worth a look: centered modal at ≥ 768 px (FCD-03) and dimming of the read-only fields (FCD-34).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ One pure model file (45 lines), one query hook, four mutation hooks on the existing optimistic pipeline (exported, not duplicated), one view model, eight small components, one page |
| Surgical changes | ✅ Outside the feature: `mutations.ts` exports and one card-query patch in `useMoveCard` (FCD-32), `conflictMessage` option in the notifier (FCD-51), `isDisabled` on `TextAreaField`, `onOpen` on `CardTile` and its three parents, child route under `b/:boardId`. Removed tests are the replaced placeholder route rows and archived-tile "not focusable" assertions, which FCD-02 makes obsolete |
| No scope creep | ✅ No checklist, no label popover, no due time, no shortcuts-dialog row (all out of scope) |
| Matches patterns | ✅ FE-AD-009/-010 optimistic per-item revert via `useOptimisticBoardViewChange`; `useSaveFailureNotifier`; React Aria modal; i18n keys in both locales (FE-AD-004); tests mirror `src/` (FE-AD-007) |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ Texts, bodies, paths and statuses exact; FCD-09 composition and FCD-34 dim missing |
| Per-layer Coverage Expectation met (tasks.md matrix) | ⚠️ Model, api and view model meet it; the composed screen misses the loading state (L-001 says test each derived child through the rendered screen) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Spot-checked `vm.spec`, `cd.spec`, `tile.spec`: each test cites an FCD AC, an edge case or a T-task Done-when (e.g. `vm.spec:1028-1038` same-path navigation not blocked → T13; `q.spec:173` `gcTime: 0` → T3) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004, -006, -007, -009, -010, -011), lesson L-001 | ⚠️ L-001 missed once (M24) |

No new `// SPEC_DEVIATION` markers in this feature (the two in the tree are from board-filters).

---

## Edge Cases

- [x] Card of another board in the URL → not found: `vm.spec:323-330` (M6 killed)
- [x] Card deleted on another device while open → 404 save → not found: `vm.spec:750-764`
- [x] Overlapping saves roll back only their own field: `cm.spec:155-192`
- [x] Second save of the same field supersedes; settle refetch once: `cm.spec:193-233`
- [x] Native date input cleared → nothing sent: `due.spec:56-62`
- [x] Closing the detail keeps the board filters: `page.spec:81-97`
- [x] Same-path navigation (query string) not blocked: `vm.spec:1028-1038`

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root, on `61a4f7b`)
- **Result**: exit 0. Lint (`oxlint --deny-warnings` + Prettier "All matched files use Prettier code style!"), `tsc --noEmit` clean, **114 test files, 1528 passed, 0 failed, 0 skipped**, `vite build` OK (main JS chunk 726.83 kB; 706 kB after board-filters, +21 kB)
- **E2E (CI, not run locally)**: run `41117429464` on `61a4f7b` (main, PR #328), conclusion success, all 12 jobs green; job `front-end (test:e2e)` (`124275175272`): "Running 26 tests using 2 workers", **26 passed (1.1m)**. Board-filters PASS had 20, so +6: the six `card-detail.e2e-spec.ts` journeys
- **Test count before feature**: 1307 (board-filters iteration 2 on `64d842d`; `64d842d..972abaf` changes no `front-end/src` or `front-end/test` file)
- **Test count after feature**: 1528
- **Delta**: +221 new tests; the removed lines are the replaced placeholder route rows (`routes.spec`) and archived-tile assertions superseded by FCD-02 (`archived-cards-column.spec`, `card-tile.spec`)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

| Fix | AC | Kind | Priority |
| --- | -- | ---- | -------- |
| Fix 1 | FCD-09 (M24) | test only | Minor |
| Fix 2 | FCD-48/FCD-49 (M19) | test only | Minor |
| Fix 3 | FCD-34 dim | src + test | Cosmetic |
| Fix 4 | FCD-29 no control | test only | Minor |

### Fix 1: The composed detail shows the skeleton while loading (FCD-09) - M24

- **Root cause**: `vm.spec:281-309` proves the `loading` status and `states.spec:16-27` proves the skeleton, but no test renders `CardDetail` while a query is pending, so `card-detail.tsx:104` can render nothing.
- **Fix task**:
  - **What**: In `cd.spec`, hold the card `GET` (a promise the test releases; the board cache is empty, so no seed). Assert the dialog holds an element with `aria-busy="true"` and no "Título" textbox. Release → the textbox shows and the busy element is gone.
  - **Where**: `front-end/test/unit/features/board/components/card-detail.spec.tsx`. Test only.
  - **Verify**: In a scratch copy, replace line 104 with `{null}`; the test fails. Build gate passes.
  - **Done when**: M24 is killed; test count +1.

### Fix 2: Recarregar reloads the card and the board (FCD-48) - M19

- **Root cause**: the `409` tests stop at the toast buttons (`vm.spec:730-748`, `:867-879`). Nobody clicks **Recarregar**, and on a `404` the settle refetch hides a wrong reload key.
- **Fix task**:
  - **What**: In `vm.spec`, after a `409` on `toggleDone`, let the settle refetch finish, record `requests[cardUrl]` and `requests[boardUrl]`, click **Recarregar**, and assert both grew by 1.
  - **Where**: `front-end/test/unit/features/board/view-models/use-card-detail-view-model.spec.tsx` (`save failures` block). Test only.
  - **Verify**: In a scratch copy, set `queryKey: boardViewKeys.cards(boardId, false)` at line 59; the test fails.
  - **Done when**: M19 is killed; test count +1.

### Fix 3: The title dims in the read-only modes (FCD-34)

- **Root cause**: `card-detail-title.tsx:78` has no disabled text style; the other three fields dim through their shared styles.
- **Fix task**:
  - **What**: Add a disabled style to the title `Input` that matches the other fields (e.g. `disabled:text-text-disabled`, keeping the done line-through rule). In `title.spec:189-200`, assert that the disabled input has the class. Optionally assert the dim class on the four fields in the `cd.spec:349-374` read-only test.
  - **Where**: `front-end/src/features/board/components/card-detail-title.tsx`, `front-end/test/unit/features/board/components/card-detail-title.spec.tsx`.
  - **Verify**: The new assertion fails before the src change and passes after. Build gate passes.
  - **Done when**: The title reads dimmed in both read-only modes; test count +0 or +1.

### Fix 4: The labels block has no control (FCD-29)

- **Root cause**: `cd.spec:283-293` checks only the chip texts and order.
- **Fix task**:
  - **What**: In the same test, assert `within(labels.parentElement!).queryAllByRole('button')` has length 0 (no "+" or remove control).
  - **Where**: `front-end/test/unit/features/board/components/card-detail.spec.tsx`. Test only.
  - **Done when**: The negative half of FCD-29 has evidence; test count +0.

---

## Requirement Traceability Update

| Requirement | Previous Status | Iteration 1 |
| ----------- | --------------- | ----------- |
| FCD-01 – FCD-08, FCD-10 – FCD-28, FCD-30 – FCD-33, FCD-35 – FCD-47, FCD-49 – FCD-53 | Pending | ✅ Verified |
| FCD-09 | Pending | ❌ Needs Fix (Fix 1) |
| FCD-29 | Pending | ❌ Needs Fix (Fix 4) |
| FCD-34 | Pending | ❌ Needs Fix (Fix 3) |
| FCD-48 | Pending | ❌ Needs Fix (Fix 2) |

`spec.md` Requirement Traceability updated: Phase `Verify`, Status as above.

---

## Summary

**Overall**: ❌ Not Ready (4 small gaps; 3 test-only, 1 cosmetic src change)

**Spec-anchored check**: 49/53 ACs fully evidenced; 4 Needs Fix (FCD-09, FCD-29, FCD-34, FCD-48); 0 spec-precision gaps
**Sensor**: 46/48 killed (M19, M24 survived)
**Gate**: 1528 unit/component passed, 0 failed, 0 skipped (`61a4f7b`); 26 e2e passed in CI `41117429464`

**What works**: open from active and archived tiles by click and Enter; modal / full-screen shells; direct URL over the board; column header that follows a move; every close path with the discard blocker (browser Back included) and focus back on the tile; load, error and not-found states (other-board card included); done, title (trim, 1–100, Esc), due date and description (untrimmed, null, 5000) saves that are optimistic and patch the board; archive → read-only, restore to the column end, delete with confirmation; the archived-column and archived-board modes; every failure toast path with drafts kept.

**Next steps**: Fixes 1–4 (one small PR each or one test PR + one src PR), then re-verify (iteration 2).

**Lessons**: L-001 penalized (confirmed; loaded for this feature in `tasks.md`, and its failure recurred as M24). New candidates: L-017 (M19, toast actions), L-018 (FCD-34, visual states), L-019 (FCD-29, negative clauses).
