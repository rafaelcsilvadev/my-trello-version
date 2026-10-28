# Board Validation

**Date**: 2026-10-28 (iterations 2, 3 and 4); iteration 1 on 2026-10-27
**Spec**: `front-end/.specs/features/board/spec.md`
**Diff range**: iteration 4 re-verifies `3f5c74e..45b0664` (PR #239 `6439ba5`, merged as `45b0664`; test only: `archived-cards-column.spec.tsx` +1/-1, `'svg'` → `'svg.lucide-archive'`; no file under `front-end/src` changed). Iteration 3 re-verified `f0916ca..b98287b` (PR #237 `1f24395`, test only: `archived-cards-column.spec.tsx` +3/-1; PR #236 docs only; no file under `front-end/src` changed). Iteration 2: `3f65ae5..f0916ca`. Feature range from iteration 1: `7fdd07e..3f65ae5` (95 non-merge commits, first feature commit `acc936f`).
**Verifier**: independent sub-agent (author ≠ verifier), iteration 4: a re-verify after the user chose to land Fix 8 following the iteration-3 escalation

## Validation: Board - PASS ✅ (iteration 4)

**Result (iteration 4)**: PASS ✅. Fix 8 (#239) works: `archived-cards-column.spec.tsx:88` now asserts `header?.querySelector('svg.lucide-archive')`, so the header must draw the lucide `Archive` glyph. N4 (`Archive` → `Inbox`) is killed, and so is a new near-miss glyph N4b (`Archive` → `ArchiveX`, class `lucide-archive-x`). The FBV-34 regression sample (S47b, N2, N3, S47) stays killed: 6/6. The gate is green: 86 files / 907 unit/component tests, lint, typecheck and build in the real tree on `45b0664`; 9 e2e in CI run `40704542083`. All 58 FBV requirements are met with discriminating evidence. Spec-precision gaps: 0.

**Result (iteration 3, history)**: FAIL ❌, one cosmetic test gap left, escalated because this was the last of 3 iterations. Fix 7 works: S47b (remove `<Archive>`) is now killed, and so are two new placement mutants (icon moved out of the header, header title dropped) and the regression sample (S43, S47, F1a, S10). The gate is green: 907 unit/component tests, 9 e2e in CI on `b98287b`. All 58 FBV requirements behave as specified. One new mutant survives: **N4**, swapping the `Archive` glyph for `Inbox` in the header, because `archived-cards-column.spec.tsx:88` asserts only that *some* svg is in the header, while FBV-34 names an *archive* icon. A one-token test change (`'svg'` → `'svg.lucide-archive'`) kills N4. The Verifier proved that in the scratch worktree (Fix 8). Behavior is complete; only the strength of the assertion on the icon's identity is short.

## Iteration History

| Iteration | Range | Gate | ACs | Sensor | Verdict |
| --------- | ----- | ---- | --- | ------ | ------- |
| 1 (2026-10-27) | `7fdd07e..3f65ae5` | ✅ 896 unit, 9 e2e (CI `40610579326`) | 57/58 met (FBV-58 ❌), 6 weak | 41/48 killed | ❌ FAIL, Fixes 1-6 |
| 2 (2026-10-28) | `3f65ae5..f0916ca` | ✅ 907 unit, 9 e2e (CI `40699259671`) | 58/58 met, 1 weak (FBV-34 icon) | 10/11 board-scope killed (+1 e2e-only, not run) | ❌ FAIL, Fix 7 |
| 3 (2026-10-28) | `f0916ca..b98287b` | ✅ 907 unit, 9 e2e (CI `40701824685`) | 58/58 met, 1 weak (FBV-34 icon identity) | 7/8 killed | ❌ FAIL, Fix 8, escalated |
| 4 (2026-10-28) | `3f5c74e..45b0664` | ✅ 907 unit, 9 e2e (CI `40704542083`) | 58/58 met, 0 weak | 6/6 killed | ✅ PASS |

### Iteration-3 fix, re-verified in iteration 4

| Fix | PR / commit | Change | Evidence on `45b0664` | Status |
| --- | ----------- | ------ | --------------------- | ------ |
| 8 Archive glyph in the header (N4) | #239 `6439ba5` (merge `45b0664`) | test only, one line | `archived-cards-column.spec.tsx:87` `const header = screen.getByText('Arquivadas').parentElement`; `:88` `expect(header?.querySelector('svg.lucide-archive')).toBeTruthy()`. The header row is `archived-cards-column.tsx:35-43`, icon `<Archive size={16} aria-hidden />` at `:36` (import `:1`). N4 and N4b killed; S47b, N2, N3, S47 still killed | ✅ Done when met |

### Iteration-2 fix, re-verified in iteration 3 (history)

| Fix | PR / commit | Change | Evidence on `b98287b` | Status |
| --- | ----------- | ------ | --------------------- | ------ |
| 7 Archive icon in the header (S47b) | #237 `1f24395` | test only | `archived-cards-column.spec.tsx:87` `const header = screen.getByText('Arquivadas').parentElement`; `:88` `expect(header?.querySelector('svg')).toBeTruthy()`. The header row is `archived-cards-column.tsx:35-43` (icon `:36`, title `:37`, count `:38-42`); card checkboxes render in `:51-72`, outside it. S47b killed, N2 and N3 killed. N4 (another glyph) survives | ⚠️ Done-when met; icon identity not asserted (Fix 8) |

### Iteration-1 fixes, re-verified in iteration 2 (history)

| Fix | PR / commit | Change | Evidence on `f0916ca` | Status |
| --- | ----------- | ------ | --------------------- | ------ |
| 1 FBV-58 checkbox | #229 `2b4cbcd`, `89acfc1` | `card-tile.tsx:82` adds `isPending` to `isDisabled` | `card-tile.spec.tsx:197-204`; `board-column.spec.tsx:220-229` (2 cards, only `c2` disabled); F1a, F1b killed | ✅ |
| 2 Recarregar / 404 refetch (S10) | #230 `586e668` | test only | `vm.spec:628-641` (409 + click → +1 each), `:643-656` (404 → +2 each); S10 killed (2 tests) | ✅ |
| 3 Un-tick (S13) | #230 `941ad0a` | test only | `vm.spec:813-836` `{ done: false }`; S13 killed | ✅ |
| 4 Unchanged rename (S9) | #231 `11cfcb8` | test only | `vm.spec:499-510` later rename flushes; S9 killed in the full suite and alone | ✅ |
| 5 Empty board + archived (S43) | #231 `cd837d0` | test only | `board-columns.spec.tsx:186-193`; S43 killed | ✅ |
| 6 Phone layout + virtual column style (S45-S47) | #231 `14b9095` | test only | `board-columns.spec.tsx:138-145` (S45), `board-column.spec.tsx:100-105` (S46, S46b), `archived-cards-column.spec.tsx:81-87` (S47). The `svg` clause at `:86` does not discriminate (S47b) | ⚠️ Partial |

### UX PRs #232-#235 and board ACs (iteration 2, history)

| PR | Change | Board impact | Evidence |
| -- | ------ | ------------ | -------- |
| #232 | `shared/ui/checkbox.tsx:26` adds `relative` so React Aria's hidden input cannot widen a scroll container; e2e adds a third column and asserts no page overflow at 375 px | Card checkbox (FBV-31, FBV-43, FBV-45, FBV-58) keeps label, state and `disabled`; FBV-48/49 e2e now expects `'Planning · 1 of 3'` | Unit suite green; `e2e:116-146` passed in CI. Mutant N1 (drop `relative`) survives the unit suite; its only killer is `e2e:141-146` (`overflow` `toBe(0)`), not run by the Verifier |
| #233 | `styles/tokens/dark.css:4` `color-scheme: dark` | None on FBV ACs (native scrollbars) | `foundation.e2e-spec.ts:47` passed in CI |
| #234 | `shared/ui/text-field.tsx:56` hides the hint while an error shows; sign-up focuses the first server-rejected field | None: board fields use React Aria `TextField` directly (`inline-create-field.tsx:74`, `column-rename-field.tsx:60`), not `shared/ui/text-field` | `text-field.spec.tsx` green |
| #235 | `boards/components/board-form-dialog.tsx` focuses the first invalid field | None: the `boards` feature, not `board` | `board-form-dialog.spec.tsx` green |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T44 | ✅ Done | `tasks.md`: `- [ ]` → `0`, `- [x]` → `90` (re-counted on `f0916ca`; `tasks.md` not changed in `f0916ca..b98287b`). Fixes 1-7 were routed as PRs #229-#231 and #237, not as new tasks in `tasks.md`. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. `board/…` means `unit/features/board/…`; `vm.spec` is `board/view-models/use-board-view-model.spec.tsx`; `screen.spec` is `board/components/board-screen.spec.tsx`; `e2e` is `e2e/board.e2e-spec.ts`. Component specs render PT-BR unless the row says EN. "Sensor" points to the mutation that proves the test discriminates (see Discrimination Sensor).

### P1: View a board

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-01 | Title, description when not null, menu (…) whose only item "Etiquetas do quadro" links to `/b/{id}/labels` | `board/components/board-header.spec.tsx:33-39` heading level 1 = title; `:41-44` `getByText('Q4 go-to-market')`; `:47-50` `null` → `queryByRole('paragraph')` `toBeNull()`; `:53-70` menu items `toEqual([labels])` (PT "Etiquetas do quadro" / EN "Board labels"), `href` `toBe('/b/${boardId}/labels')` (S40 killed) | ✅ |
| FBV-02 | Active columns side by side in ascending `position`, horizontal scroll | `board/model/columns.spec.ts:38-42` lists ordered by position; `vm.spec:252-265` `toEqual([['Doing', ['c3']], ['Backlog', ['c2','c1']]])` (Doing `position 0` before Backlog `1`, S44 killed); `screen.spec:138-144` region names `toEqual(['Backlog','Doing'])`; `board/components/board-columns.spec.tsx:131-134`. Scroll: `overflow-x-auto` on the scroller (`board-columns.tsx:137`), not asserted (layout, jsdom) | ✅ |
| FBV-03 | Each column: active cards by `position`, header count of those cards | `columns.spec.ts:44-57` grouped by list and sorted; `vm.spec:263-264` card order `['c2','c1']`; `board/components/board-column.spec.tsx:91-96` both cards + counter `'2'`; `:107-111` `'0'` when empty | ✅ |
| FBV-04 | One chip per label with name and `bg-label-{color}` | `board/components/card-tile.spec.tsx:73-84` `Docs` chip contains `.bg-label-sky`, `Bug` `.bg-label-red`, label order kept, unknown id skipped (S48 killed) | ✅ |
| FBV-05 | "Hoje" / "Amanhã" / "Ontem" / "12 out" / ", 2027" when not the current year | `card-tile.spec.tsx:86-96` `2026-10-27`→`'Hoje'`, `-28`→`'Amanhã'`, `-26`→`'Ontem'`, `2026-11-12`→`'12 nov'`, `2027-01-05`→`'5 jan, 2027'`; `board/model/due-date.spec.ts:65-133` incl. TZ `America/Sao_Paulo` (`:22-53`) and month/year boundaries; `unit/shared/i18n/format-date.spec.ts` EN `"Oct 12"` (S25 killed) | ✅ |
| FBV-06 | Not done and due before today → danger color + "Atrasada" | `card-tile.spec.tsx:98-107` `'20 out'` parent `text-red-600` `toBe(true)`, `getByText('Atrasada')`; `due-date.spec.ts:135-163` (S24 killed) | ✅ |
| FBV-07 | "done/total", success color when equal | `card-tile.spec.tsx:135-148` `'2/3'` → `text-text-secondary`, `'3/3'` → `text-green-700`; `:150-155` no `'0/0'` without a checklist (S20 killed) | ✅ |
| FBV-08 | Done: title muted + struck, due date success color, no "Atrasada" | `card-tile.spec.tsx:120-133` `line-through` and `text-text-tertiary` `toBe(true)`, `'20 out'` parent `text-green-700`, `queryByText('Atrasada')` `toBeNull()` (S19 killed) | ✅ |
| FBV-09 | Skeletons of header, columns and cards while loading | `board/components/board-skeleton.spec.tsx:9-19` `aria-busy="true"`, 3 columns with ≥ 3 children; `screen.spec:133` busy before load, `:137` gone after; `vm.spec:242-249` `loading` until every query answers | ✅ |
| FBV-10 | Network / `5xx` → "Não foi possível carregar" + **Tentar novamente** repeating the failed requests | `screen.spec:150-168` alert `'Couldn’t load'`, `Try again` → board heading (EN; PT text from shared `LoadError`, `unit/shared/ui/load-error.spec.tsx`); `vm.spec:318-335` retry: failed `cards` request `+1`, `board`/`lists`/`labels` unchanged (S15 killed) | ✅ |
| FBV-11 | `404` on the board → "Quadro não encontrado", "Ele pode ter sido excluído.", link **Voltar para Meus quadros** → `/boards` | `board/components/board-not-found.spec.tsx:27-53` PT/EN title, detail, link `href` `'/boards'`; `screen.spec:170-183`; `vm.spec:289-299` `notFound` for `404` on board, lists or cards; `:308-316` `notFound` beats `error` (S14 killed) | ✅ |
| FBV-12 | Desktop breadcrumb "Meus quadros › {title}", "Meus quadros" → `/boards` | `board/components/board-breadcrumb.spec.tsx:30-52` PT/EN link `href` `'/boards'`, title `aria-current="page"`, `hidden md:flex`; `unit/pages/protected-layout.spec.tsx:67-85` in the top bar on `/b/{id}`, `:87-95` absent elsewhere (S41 killed) | ✅ |

### P1: Manage columns

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-13 | No active columns → "Adicione a primeira coluna" with the field open | `board/components/add-column.spec.tsx:90-102` title, text, field focused; `board-columns.spec.tsx:176-183` only the block, no regions; `add-column.spec.tsx:118-128` field reopens when the last column leaves (edge case) | ✅ |
| FBV-14 | Enter + valid name → `POST /boards/{id}/lists` with trimmed `title`; `201` → column at the end, toast "Coluna criada", field cleared and open | `vm.spec:362-381` body `toEqual({ title: 'To do' })` from `'  To do  '`, `'Coluna criada'` (S16 killed); `board/api/create-mutations.spec.tsx:85-97` cache `toEqual([backlog, doing])` (S30 killed); `board/components/inline-create-field.spec.tsx:103-115` cleared, focused; `add-column.spec.tsx:79-88` stays open; `screen.spec:185-197`; `e2e:23-30` | ✅ |
| FBV-15 | Empty after trim → "Dê um nome à coluna", nothing sent | `board/model/validation.spec.ts:22-27` `''`, `'   '` → required; `vm.spec:383-398` `'   '` → `'columnNameRequired'`, `changes` `toEqual([])`; `inline-create-field.spec.tsx:85-100` message, text kept, `aria-invalid` | ✅ |
| FBV-16 | > 100 after trim → "Use até 100 caracteres", nothing sent | `validation.spec.ts:29-39` 1 / 100 / padded 100 accepted, padded 101 rejected (S23 killed); `vm.spec:383-398` 101 → `'columnNameTooLong'`, no request | ✅ |
| FBV-17 | In flight: text kept, submit disabled | `inline-create-field.spec.tsx:130-140` `isPending` → submit `disabled`, Enter ignored, text kept; `:142-156` second Enter during submit ignored; `add-column.spec.tsx:130-140`; `vm.spec:449-473` `isCreatingList` `true` while held | ✅ (S32 killed) |
| FBV-18 | Click on name or **Renomear** → field with the current name | `board-column.spec.tsx:114-120`, `:132-139` `onStartRename` once; `:150-158` field value `'To do'`, name button gone; `board/components/column-rename-field.spec.tsx:53-58` focused with the name; `vm.spec:475-484` | ✅ |
| FBV-19 | Enter/blur + valid differing name → new name at once, `PATCH /lists/{id}` trimmed `title`, toast "Coluna renomeada" | `vm.spec:529-556` field closed, titles `['Doing','Ideas']` before the held response, body `{ title: 'Ideas' }` from `' Ideas '`, `'Coluna renomeada'`; `board/api/mutations.spec.tsx:116-126`; `column-rename-field.spec.tsx:60-76` Enter and blur; `e2e:63-72`. Unchanged name sends nothing: `vm.spec:486-510` `outcome` `toBeNull()`, then a rename of `doing` flushes any stray request and `changes` `toEqual([{ PATCH /api/v1/lists/${doing.id}, { title: 'Done' } }])` (S9 killed, also alone with `-t "unchanged name"`) | ✅ (iter 2) |
| FBV-20 | Esc → field closes, old name, nothing sent | `column-rename-field.spec.tsx:87-95` `onCancel` once, `onSubmit` not called, also on the blur after Esc (S33 killed); `vm.spec:475-484` `cancelRename` → `null` | ✅ |
| FBV-21 | Invalid name on Enter/blur → field open with FBV-15/16 message, nothing sent | `column-rename-field.spec.tsx:97-112` message, value kept, `aria-invalid`; `:114-122` re-submits on blur after an error; `vm.spec:513-527` `'columnNameRequired'`, `editing` still open, `changes` `[]` | ✅ |
| FBV-22 | **Arquivar** → column removed at once, `POST /lists/{id}/archive`, toast "Coluna arquivada" | `vm.spec:578-599` titles `['Doing']` before the held response, path `…/archive`, `'Coluna arquivada'`; `mutations.spec.tsx:225-240` moved to the front of the archived lists; `board-column.spec.tsx:141-148`; `screen.spec:221-232`; `e2e:74-78` | ✅ |
| FBV-23 | Column menu: exactly **Renomear**, **Arquivar** | `board-column.spec.tsx:122-130` menu item names `toEqual(['Renomear','Arquivar'])` | ✅ |

### P1: Create cards and mark them done

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-24 | "+ Adicionar tarefa" opens the card field in that column | `board-column.spec.tsx:172-189` `onOpenAddCard` once; field replaces the button; `board-columns.spec.tsx:222-228` wired to its own list id; `vm.spec:660-670` | ✅ |
| FBV-25 | Enter + valid title → `POST /lists/{listId}/cards` trimmed; `201` → card at the end, toast "Tarefa criada", field cleared and open | `vm.spec:672-696` path `/api/v1/lists/${backlog.id}/cards`, body `{ title: 'Write tests' }` from `'  Write tests  '`, `'Tarefa criada'`, `addingCardListId` kept (S17 killed); `create-mutations.spec.tsx:160-177` cache `toEqual([first, second])` (S30 killed); `screen.spec:199-219`; `e2e:32-40` | ✅ |
| FBV-26 | Empty after trim → "Dê um título à tarefa", nothing sent | `validation.spec.ts:22-27` (card validator); `vm.spec:698-713` `'   '` → `'cardTitleRequired'`, `changes` `[]`; `inline-create-field.spec.tsx:85-100` | ✅ |
| FBV-27 | > 100 after trim → "Use até 100 caracteres", nothing sent | `validation.spec.ts:29-39`; `vm.spec:698-713` 101 → `'cardTitleTooLong'` | ✅ |
| FBV-28 | Esc → field closes, nothing sent | `inline-create-field.spec.tsx:158-165` `onClose` once, `onSubmit` not called; `vm.spec:660-670` `closeAddCard` | ✅ |
| FBV-29 | In flight: text kept, submit disabled | `inline-create-field.spec.tsx:130-156`; `vm.spec:764-790` `isCreatingCard` `true` while held | ✅ |
| FBV-30 | `n` outside text fields and dialogs, ≥ 1 active column → card field in the first column, focused | `vm.spec:876-883` `addingCardListId` `toBe(doing.id)` (first by position); `:899-906` no columns → nothing; `:908-924` loading → nothing; `inline-create-field.spec.tsx:62-66` focused on open; `unit/shared/keyboard/use-shortcut.spec.tsx:65-78` ignored in input/textarea/select/contenteditable, `:80-87` while a modal is open (S34, S35 killed) | ✅ |
| FBV-31 | Toggle "Concluída" → new state at once, `PATCH /cards/{id}` with `done` = new value | `vm.spec:792-811` `false → true`: `cardDone` `true` before the held response, body `{ done: true }`; `vm.spec:813-836` `true → false`: `cardDone(result,'c3')` `toBe(false)` before the held response, `changes` `toEqual([{ PATCH '/api/v1/cards/c3', { done: false } }])` (S13 killed); `mutations.spec.tsx:442-452`; `card-tile.spec.tsx:157-164`; `e2e:42-61` persisted after reload | ✅ (iter 2) |
| FBV-32 | No active cards → "Arraste cards para cá" | `board-column.spec.tsx:107-111` text + counter `'0'` | ✅ |

### P1: See and manage archived items

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-33 | Switch **Mostrar arquivadas**, off whenever the board opens | `board/components/board-toolbar.spec.tsx:27-61` role `switch` named PT/EN, `checked` follows the prop, `onChange` once; `vm.spec:943-951` off and no archived request; `unit/pages/board-page.spec.tsx:52-66` off again after moving to another board; `e2e:81-82` | ✅ |
| FBV-34 | Virtual column "Arquivadas" after the active columns: dashed border, transparent background, archive icon, no menu, no create field | `board-columns.spec.tsx:147-157` region order `[…columns, 'Arquivadas', 'Colunas arquivadas']`; `:186-193` `columns: []` + `showArchived` → regions `toEqual(['Arquivadas','Colunas arquivadas'])` and "Adicionar coluna" (S43 killed); `archived-cards-column.spec.tsx:74-79` name, count; `:81-89` `border-dashed` and `bg-transparent` `toBe(true)` (S47 killed); `:110-115` no button, no textbox. **Icon (iter 3)**: `:87-88` `screen.getByText('Arquivadas').parentElement` → `header?.querySelector('svg')` `toBeTruthy()`; the header row (`archived-cards-column.tsx:35-43`) holds no checkbox, so removing `<Archive>` (S47b), moving it below the header (N2) or dropping the header title (N3) all fail the test. **Iter 4 (Fix 8)**: `:88` now reads `header?.querySelector('svg.lucide-archive')` `toBeTruthy()`, which only the lucide `Archive` svg satisfies; swapping the glyph for `Inbox` (N4) or `ArchiveX` (N4b) fails the test | ✅ (iter 4) |
| FBV-35 | Archived cards incl. archived columns', newest `archivedAt` first, "Arquivada em 2 out, 2026 · de: {column}" | `vm.spec:953-968` `toEqual([['c8','Backlog'],['c7','Ideas']])` (Ideas is archived); `board/model/archived.spec.ts:40-67` title from active ∪ archived lists, newest first (S27 killed); `archived-cards-column.spec.tsx:91-100` exact text `'Arquivada em 2 out, 2026 · de: To do'` | ✅ |
| FBV-36 | No archived cards → "Nenhuma tarefa arquivada" | `archived-cards-column.spec.tsx:117-122` | ✅ |
| FBV-37 | Archived columns section after the virtual column, newest first, "Arquivada em 2 out, 2026 · 3 tarefas", count = active + archived | `vm.spec:970-985` `toEqual([['Later',0],['Ideas',3]])`; `board/api/archived-counts.spec.tsx:73-93` 2 active + 1 archived → `3` (S26 killed); `archived.spec.ts:70-85` newest first; `board/components/archived-columns-section.spec.tsx:90-101` `'Arquivada em 2 out, 2026·3 tarefas'`, `'·1 tarefa'`; `:103-116` `'0 tarefas'` | ✅ |
| FBV-38 | No archived columns → "Nenhuma coluna arquivada" | `archived-columns-section.spec.tsx:162-167` | ✅ |
| FBV-39 | **Restaurar** → column at once at the end of the active ones, `POST /lists/{id}/unarchive`, toast "Coluna restaurada" | `vm.spec:1000-1024` titles `['Doing','Backlog','Ideas']` and section `['Later']` before the held response, path `…/unarchive`, `'Coluna restaurada'` (S3 killed); `mutations.spec.tsx:310-325` appended with `position` = length; `archived-columns-section.spec.tsx:118-132` callback with the id (S22 killed); `screen.spec:221-249`; `e2e:80-93` cards back after the refetch | ✅ |
| FBV-40 | Delete dialog text for n ≥ 2 / n = 1 / n = 0 | `board/components/delete-column-dialog.spec.tsx:61-78` PT exact for 0 / 1 / 3 (`'Isso apaga a coluna e as 3 tarefas dela, ativas e arquivadas. Não dá para desfazer.'`), `:80-99` EN; `archived.spec.ts:116-124` `0→none`, `1→one`, `2→many` (S28 killed); `screen.spec:251-288` dialog waits for the count, then `'… its 1 task …'` (S29 killed) | ✅ |
| FBV-41 | Confirm → removed at once, `DELETE /lists/{id}`, toast "Coluna excluída definitivamente" | `vm.spec:1054-1077` dialog closed, section `['Later']` before the held response, `DELETE /api/v1/lists/${ideas.id}`, toast; `mutations.spec.tsx:364-375` list and its archived cards dropped (S5 killed); `screen.spec:289-294`; `e2e:95-114` | ✅ |
| FBV-42 | Cancel / Esc → closes, nothing sent | `delete-column-dialog.spec.tsx:113-128` `onCancel` once, `onConfirm` not called, for both; `vm.spec:1042-1052` `deleteTarget` `null`, `changes` `[]` | ✅ |
| FBV-43 | Virtual column cards read-only: disabled checkbox showing done, no menu, no link | `archived-cards-column.spec.tsx:102-108` `disabled` `[true,true]`, `checked` `[true,false]`; `:110-115` no button; `card-tile.spec.tsx:172-189` archived mode disabled + checked. No link: `CardTile` renders none (no assertion needed beyond the role query) | ✅ |

### P1: Archived board is read-only

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-44 | Banner "Quadro arquivado · somente leitura" + **Restaurar** | `board/components/archived-board-banner.spec.tsx:24-43` `role="status"` text PT/EN, button; `screen.spec:320-327`; `vm.spec:347-358` `readOnly` from `archivedAt` | ✅ |
| FBV-45 | Hide "+ Adicionar coluna", "+ Adicionar tarefa", column menus; checkboxes disabled; names not editable | `board-column.spec.tsx:191-202` no menu, no add, name is plain text; `board-columns.spec.tsx:168-174` no add column; `card-tile.spec.tsx:166-170` checkbox `disabled` (S18 killed); `screen.spec:327` no "Add column" | ✅ |
| FBV-46 | `n` does nothing on an archived board | `vm.spec:885-897` `addingCardListId` `toBeNull()` (S11 killed) | ✅ |
| FBV-47 | **Restaurar** → `POST /boards/{id}/unarchive`; on success banner gone, writes enabled, toast "Quadro restaurado" | `vm.spec:1113-1135` `readOnly` `false`, `'Quadro restaurado'`, path `…/unarchive`; `screen.spec:329-335` banner gone, "Add column" back; `mutations.spec.tsx:502-512` `archivedAt` cleared | ✅ |

### P1: Phone layout

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-48 | < `md`: one column per screen, scroll snap, visible edge of the next column | `e2e:116-146` at 375 px: `'Planning · 1 of 3'`, first column `toBeInViewport({ ratio: 1 })`, next `not.toBeInViewport({ ratio: 0.5 })`, page `scrollWidth - clientWidth` `toBe(0)`; `board-columns.spec.tsx:138-145` scroller `snap-x`, `snap-mandatory`, `md:snap-none` (S45 killed); `board-column.spec.tsx:100-105` section `snap-start` and `w-11/12` (S46, S46b killed). Class-level, the only observable in jsdom | ✅ (iter 2) |
| FBV-49 | One dot per active column, "{title} · {i} de {n}" | `board/components/column-pager.spec.tsx:29-40` 3 dots, `'Ir para Fazendo'`; `:52-64` `'Fazendo · 2 de 3'` / EN `'Feito · 3 of 3'`, `aria-live="polite"`; `board-columns.spec.tsx:195-209` pager follows scroll (S38 killed); `board/model/pager.spec.ts:9-45`; `e2e:137` `'Planning · 1 of 3'` | ✅ |
| FBV-50 | Tap a dot → scroll to that column | `column-pager.spec.tsx:77-83` `onSelect(2)`; `board-columns.spec.tsx:211-220` `scrollTo({ left: 312, behavior: 'smooth' })` (S39 killed) | ✅ |
| FBV-51 | < `md`: back arrow "Voltar" → `/boards`, menu (…) top right | `board-header.spec.tsx:73-82` link named `'Voltar'`/`'Back'`, `href` `'/boards'`, `md:hidden`; `:53-70` menu present | ✅ |

### P1: Save failures

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-52 | Failed rename / archive / restore / delete / done → board back to the prior state | `mutations.spec.tsx:128-156` rename: only the failed title restored while a later rename is pending (S1 killed); `:253-270`, `:272-290` archive: old index, no duplicate after a refetch (S2 killed); `:327-345` restore; `:377-400` delete with its cards; `:454-480` done (S6 killed); `:514-532` board restore (S7 killed); `vm.spec:601-624` archive back on 409/404/500; `:837-858` done back; `:1079-1091` delete back; `screen.spec:297-318` checkbox unticked | ✅ |
| FBV-53 | Network / `5xx` → "Não foi possível salvar. Tente novamente." + **Tentar novamente** resending the same request | `unit/shared/ui/toast/use-save-failure-notifier.spec.tsx:53-75` server and network → button resends; `:131-148` `runChange` retry resends the same variables; `vm.spec:860-872` done retry body `{ done: true }`; `:414-433`, `:729-748` create retry resends the same title; `unit/shared/api/save-failure.spec.ts:24-26` `0/500/503` → `retry` | ✅ |
| FBV-54 | `409` → "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar** refetching every board query | Toast and button: `vm.spec:601-624`, `:837-858`, `:435-447`; `use-save-failure-notifier.spec.tsx:77-92` `reload` only on click (S37 killed). Refetch: `vm.spec:628-641` archive answers `409`, click **Recarregar** → `requests[url]` `toBe(before[url] + 1)` for board, lists, cards and labels (S10 killed) | ✅ (iter 2) |
| FBV-55 | `404` → saveFail toast without a button, refetch every board query | Toast without button: `vm.spec:601-624` (`404` → `[]` buttons); `use-save-failure-notifier.spec.tsx:94-104` (S36 killed). Refetch: `vm.spec:643-656` archive answers `404`, no click → `requests[url]` `toBe(loaded[url] + 2)` (settle + reload) for all four queries (S10 killed) | ✅ (iter 2) |
| FBV-56 | Create fails (network / `5xx` / `404` / `409`) → field open with the text, submit enabled, matching toast | `inline-create-field.spec.tsx:117-128` reject → text kept, submit enabled, second submit works; `vm.spec:414-447` create list 500 / 409 reject with the toast; `:729-762` create card 500 / 409. `404` on create goes through the same notifier branch as FBV-55 (`notify`, `use-board-view-model.ts:143,191`) | ✅ |
| FBV-57 | Create / rename `400` `errors[].field = title` → "Dê um nome…/Dê um título…" when empty else "Use até 100 caracteres", submitted text, no toast | `board/model/errors.spec.ts:27-61` blank → required, filled → too long, title found among fields, other statuses → `null`; `vm.spec:400-412`, `:715-727` create → field error, no toast; `:558-576` rename reopens `{ value: 'Ideas', error: 'columnNameTooLong' }`, no toast (S12 killed); `board-column.spec.tsx:160-170`, `column-rename-field.spec.tsx:124-130` reopened field shows text + message (S31 killed) | ✅ |
| FBV-58 | While a change to a column or card is in flight: that item's menu (…) **and checkbox** disabled | Menu: `board-column.spec.tsx:211-218` `disabled` `true` (S21 killed); `archived-columns-section.spec.tsx:141-160`; `archived-board-banner.spec.tsx:53-63`; `mutations.spec.tsx:536-560` pending ids (S8 killed). Checkbox: code `card-tile.tsx:82` `isDisabled={isArchived \|\| isReadOnly \|\| isPending}`; `card-tile.spec.tsx:197-204` `doneCheckbox().disabled` `toBe(true)`, click → `onToggleDone` `not.toHaveBeenCalled()` (F1a killed); `board-column.spec.tsx:220-229` two cards, `pendingIds: ['c2']` → `first.disabled` `toBe(false)`, `second.disabled` `toBe(true)` (L-003; F1a and F1b killed) | ✅ (iter 2) |

**Status (iteration 4)**: ✅ All ACs covered. 58/58 ACs have `file:line` evidence, behave as the spec says and are discriminating. Spec-precision gaps: 0. `3f5c74e..45b0664` changed one line of one test file and no source, so every citation keeps its line number; only FBV-34's icon clause changed (`archived-cards-column.spec.tsx:88`, re-read on `45b0664`).

**Status (iteration 3, history)**: ⚠️ One weak AC. 58/58 ACs have `file:line` evidence and behave as the spec says. 57/58 are fully discriminating; FBV-34's icon clause now catches a missing or misplaced icon but not a wrong glyph (N4). Spec-precision gaps: 0. `f0916ca..b98287b` changed one test file and no source, so only the `archived-cards-column.spec.tsx` citations moved (+2 lines after `:86`; FBV-34, FBV-35, FBV-36, FBV-43 re-mapped and re-read on `b98287b`). Every other row keeps its iteration-2 evidence, and the regression sample (S10, S43, S47, F1a) confirms FBV-34, FBV-54, FBV-55 and FBV-58 still discriminate.


---

## Discrimination Sensor

### Iteration 4

Same method as iteration 3, in a temporary `git worktree` (`<scratchpad>/board-sensor-4`, detached `45b0664`). No `pnpm` command ran in the worktree: the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked in and Vitest ran directly (`./node_modules/.bin/vitest run`, full unit suite per mutant). Unmutated sanity run: 86 files / 907 tests passed. A script applied each mutation alone (each target text had to occur exactly once), ran the suite, reverted with `git checkout -- .` and checked a clean tracked tree before the next. Cleanup: symlinks removed, `git worktree remove --force`, `git worktree prune`; `git worktree list` shows only the main tree; real-tree `git status --porcelain` before and after was identical (empty); `find node_modules front-end/node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` printed nothing.

Paths are relative to `front-end/src/features/board/`. Line numbers are those of `45b0664` (unchanged since `b98287b`).

| # | File:line | Mutation | Failing tests | Killed? |
| - | --------- | -------- | ------------- | ------- |
| N4 | `components/archived-cards-column.tsx:1,36` | `Archive` glyph swapped for lucide `Inbox` (still one svg in the header) | 1 (`looks like a virtual column, with a dashed border, no fill and an icon`) | ✅ Killed (survived in iteration 3) |
| N4b | `components/archived-cards-column.tsx:1,36` | `Archive` swapped for the near-miss `ArchiveX` (class `lucide-archive-x`) | 1 (same test) | ✅ Killed |
| S47b | `components/archived-cards-column.tsx:36` | remove `<Archive size={16} aria-hidden />` | 1 (same test) | ✅ Killed |
| N2 | `components/archived-cards-column.tsx:36` → `:43` | icon moved out of the header row, to just above the cards | 1 (same test) | ✅ Killed |
| N3 | `components/archived-cards-column.tsx:37` | header title `{title}` dropped (the region keeps its `aria-label`) | 2 (`… an icon`, `shows a region named "Arquivadas" …`) | ✅ Killed |
| S47 | `components/archived-cards-column.tsx:33` | `border-2 border-dashed border-border-default bg-transparent` → `bg-surface-sunken` | 1 (same test) | ✅ Killed |

**Sensor depth**: targeted re-run (the iteration-3 survivor N4, one new near-miss glyph, 4 FBV-34 regression mutants). The other board mutants were not re-run: no source file and no other test changed in `3f5c74e..45b0664`.
**Result**: 6/6 killed, 0 survived - PASS ✅

### Iteration 3 (history)

Same method as iteration 2, in a temporary `git worktree` (`<scratchpad>/board-sensor-3`, detached `b98287b`). No `pnpm` command ran in the worktree: the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked in and Vitest ran directly (`node ./node_modules/vitest/vitest.mjs run`, full unit suite per mutant). Unmutated sanity run: 86 files / 907 tests passed. A script applied each mutation alone (each target text had to occur exactly once), ran the suite, reverted with `git checkout -- .` and asserted a clean tracked tree before the next. Cleanup: symlinks removed, `git worktree remove --force`, `git worktree prune`; `git worktree list` shows only the main tree; real-tree `git status --porcelain` before and after was identical (empty); `find node_modules front-end/node_modules packages/api-contract/node_modules -maxdepth 2 -xtype l` printed nothing.

Paths are relative to `front-end/src/features/board/`. Line numbers are those of `b98287b`.

| # | File:line | Mutation | Failing tests | Killed? |
| - | --------- | -------- | ------------- | ------- |
| S47b | `components/archived-cards-column.tsx:36` | remove `<Archive size={16} aria-hidden />` | 1 (`looks like a virtual column, with a dashed border, no fill and an icon`) | ✅ Killed |
| N2 | `components/archived-cards-column.tsx:36` → `:43` | icon moved out of the header row, to just above the cards | 1 (same test) | ✅ Killed |
| N3 | `components/archived-cards-column.tsx:37` | header title `{title}` dropped (the region keeps its `aria-label`) | 2 (`… an icon`, `shows a region named "Arquivadas" …`) | ✅ Killed |
| N4 | `components/archived-cards-column.tsx:1,36` | `Archive` glyph swapped for lucide `Inbox` (still one svg in the header) | 0 | ❌ Survived → Fix 8 (killed in iteration 4) |
| S43 | `components/board-columns.tsx:121` | `columns.length === 0 && !showArchived` → `columns.length === 0` | 1 | ✅ Killed |
| S47 | `components/archived-cards-column.tsx:33` | `border-2 border-dashed border-border-default bg-transparent` → `bg-surface-sunken` | 1 | ✅ Killed |
| F1a | `components/card-tile.tsx:82` | checkbox ignores `isPending` | 2 (`card-tile` pending, `board-column` per-item) | ✅ Killed |
| S10 | `view-models/use-board-view-model.ts:89-94` | reload callback is a no-op | 2 (`Recarregar refetches … after a 409`, `refetches … after a 404`) | ✅ Killed |

**Fix 8 probe (scratch only)**: in the same worktree, `archived-cards-column.spec.tsx:88` was changed to `header?.querySelector('svg.lucide-archive')` (lucide-react puts `lucide-archive` on the `Archive` svg). Unmutated: 9/9 tests in the file pass. With N4: `… an icon` fails (1 failed, 8 passed). The probe was reverted before cleanup and is not in the real tree.

**Sensor depth**: targeted re-run (the iteration-2 survivor S47b, 3 new FBV-34 mutants, 4 regression mutants).
**Iteration 3 sensor outcome (history)**: 7/8 killed, 1 survived (N4) - FAIL ❌

### Iteration 2 (history)

Same method on `f0916ca` (907/907 unmutated). Paths are relative to `front-end/src/features/board/` unless they start with `shared/`.

| # | File:line | Mutation | Failing tests | Killed? |
| - | --------- | -------- | ------------- | ------- |
| S9 | `view-models/use-board-view-model.ts:156` | drop `if (title === list.title) return null` (unchanged rename sends a request) | 1 (`unchanged name…`); alone with `-t "unchanged name"`: 1, `expected … to have a length of 1 but got 2` | ✅ Killed |
| S10 | `view-models/use-board-view-model.ts:90-92` | reload callback is a no-op | 2 (`Recarregar refetches…`, `refetches … after a 404`) | ✅ Killed |
| S13 | `view-models/use-board-view-model.ts:200` | `done: !card.done` → `done: true` | 1 (`toggleDone on a done card…`) | ✅ Killed |
| S43 | `components/board-columns.tsx:121` | `columns.length === 0 && !showArchived` → `columns.length === 0` | 1 | ✅ Killed |
| S45 | `components/board-columns.tsx:137` | drop `snap-x snap-mandatory` | 1 | ✅ Killed |
| S46 | `components/board-column.tsx:66` | `w-11/12` → `w-full` (no peek) | 1 | ✅ Killed |
| S46b | `components/board-column.tsx:66` | drop `snap-start` | 1 | ✅ Killed |
| S47 | `components/archived-cards-column.tsx:33` | `border-2 border-dashed border-border-default bg-transparent` → `bg-surface-sunken` | 1 | ✅ Killed |
| S47b | `components/archived-cards-column.tsx:36` | remove `<Archive size={16} aria-hidden />` | 0 | ❌ Survived → Fix 7 (killed in iteration 3) |
| F1a | `components/card-tile.tsx:82` | checkbox ignores `isPending` | 2 (`card-tile` pending, `board-column` per-item) | ✅ Killed |
| F1b | `components/card-tile.tsx:82` | checkbox disabled for every card (`isDisabled={true}`) | 2 (`board-column` per-item `first.disabled false`, `card-tile` toggle) | ✅ Killed |
| N1 | `shared/ui/checkbox.tsx:26` | drop `relative` (#232) | 0 in the unit suite. Designed killer is `e2e:141-146`, which needs a real layout; not run by the Verifier (e2e runs in CI only) | ⏭️ Not counted (e2e-only) |

**Iteration 2 sensor outcome (history)**: 10/11 board-scope mutants killed, 1 survived (S47b), N1 not counted - FAIL ❌

### Iteration 1 (history)

Same worktree method on `3f65ae5` (896/896 unmutated). 41/48 killed; S9, S10, S13, S43, S45, S46, S47 survived (all killed in iteration 2). S9 in iteration 1 failed only the *next* test through leakage, so it counted as survived. A worktree probe confirmed the FBV-58 checkbox stayed enabled with `isPending` (fixed by #229). Line numbers are those of `3f65ae5`; source files under `features/board` did not move except `card-tile.tsx:82` (changed in place).

| # | File:line | Mutation | Failing tests | Killed? |
| - | --------- | -------- | ------------- | ------- |
| S1 | `api/mutations.ts:56` | rename revert is a no-op | 1 | ✅ Killed |
| S2 | `api/mutations.ts:233` | removal revert re-inserts even when a refetch brought the item back | 1 | ✅ Killed |
| S3 | `api/mutations.ts:113` | restored list goes first, not last | 2 | ✅ Killed |
| S4 | `api/mutations.ts:272` | settle invalidates while another change is pending | 1 | ✅ Killed |
| S5 | `api/mutations.ts:138` | delete keeps the archived cards of the list | 1 | ✅ Killed |
| S6 | `api/mutations.ts:172` | done revert is a no-op | 1 | ✅ Killed |
| S7 | `api/mutations.ts:202` | board restore revert is a no-op | 1 | ✅ Killed |
| S8 | `api/mutations.ts:212` | pending ids keep settled changes | 3 | ✅ Killed |
| S9 | `view-models/use-board-view-model.ts:156` | unchanged rename sends a request | 1 in the full suite, 0 alone | ❌ Survived (see note) |
| S10 | `view-models/use-board-view-model.ts:90` | Recarregar / 404 reload does not refetch the board | 0 | ❌ Survived |
| S11 | `view-models/use-board-view-model.ts:213` | `n` works on an archived board | 1 | ✅ Killed |
| S12 | `view-models/use-board-view-model.ts:164` | rename 400 reopens without the sent text | 1 | ✅ Killed |
| S13 | `view-models/use-board-view-model.ts:200` | toggle always sends done: true | 0 | ❌ Survived |
| S14 | `view-models/use-board-view-model.ts:128` | lists/cards 404 no longer means not found | 2 | ✅ Killed |
| S15 | `view-models/use-board-view-model.ts:252` | retryLoad refetches every query | 1 | ✅ Killed |
| S16 | `view-models/use-board-view-model.ts:138` | create column sends the untrimmed title | 2 | ✅ Killed |
| S17 | `view-models/use-board-view-model.ts:194` | no "Tarefa criada" toast | 3 | ✅ Killed |
| S18 | `components/card-tile.tsx:82` | checkbox enabled on a read-only board | 1 | ✅ Killed |
| S19 | `components/card-tile.tsx:143` | done card due date not in success color | 1 | ✅ Killed |
| S20 | `components/card-tile.tsx:122` | complete checklist not in success color | 1 | ✅ Killed |
| S21 | `components/board-column.tsx:109` | column menu enabled while pending | 1 | ✅ Killed |
| S22 | `components/archived-columns-section.tsx:111` | Restaurar wired to delete | 2 | ✅ Killed |
| S23 | `model/validation.ts:13` | title limit off by one | 4 | ✅ Killed |
| S24 | `model/due-date.ts:50` | due today counts as overdue | 2 | ✅ Killed |
| S25 | `model/due-date.ts:40` | next-year date shown without the year | 2 | ✅ Killed |
| S26 | `api/archived-counts.ts:39` | archived column count ignores archived cards | 3 | ✅ Killed |
| S27 | `model/archived.ts:8` | archived items oldest first | 7 | ✅ Killed |
| S28 | `model/archived.ts:34` | delete text says no tasks for n = 1 | 1 | ✅ Killed |
| S29 | `components/board-screen.tsx:72` | delete dialog opens before the count loads | 1 | ✅ Killed |
| S30 | `api/create-mutations.ts:66` | created item prepended, not appended | 2 | ✅ Killed |
| S31 | `components/inline-create-field.tsx:56` | field clears on a field error | 4 | ✅ Killed |
| S32 | `components/inline-create-field.tsx:93` | submit enabled while the create is pending (prop) | 2 | ✅ Killed |
| S33 | `components/column-rename-field.tsx:54` | blur after Esc submits | 1 | ✅ Killed |
| S34 | `shared/keyboard/use-shortcut.ts:11` | shortcut fires while a dialog is open | 1 | ✅ Killed |
| S35 | `shared/keyboard/use-shortcut.ts:4` | shortcut fires inside an input | 1 | ✅ Killed |
| S36 | `shared/ui/toast/use-save-failure-notifier.ts:24` | 404 does not refetch | 2 | ✅ Killed |
| S37 | `shared/api/save-failure.ts:13` | 409 treated as retry | 7 | ✅ Killed |
| S38 | `components/board-columns.tsx:193` | pager always shows the first column | 1 | ✅ Killed |
| S39 | `components/board-columns.tsx:115` | dot scroll ignores the gap | 1 | ✅ Killed |
| S40 | `components/board-header.tsx:38` | labels menu item links to the board | 2 | ✅ Killed |
| S41 | `components/board-breadcrumb.tsx:28` | breadcrumb links to / | 3 | ✅ Killed |
| S42 | `components/archived-board-banner.tsx:26` | banner Restaurar enabled while pending | 1 | ✅ Killed |
| S43 | `components/board-columns.tsx:121` | empty board hides the archived items | 0 | ❌ Survived |
| S44 | `model/columns.ts:20` | columns kept in API order, not by position | 10 | ✅ Killed |
| S45 | `components/board-columns.tsx:137` | phone scroller does not snap | 0 | ❌ Survived |
| S46 | `components/board-column.tsx:66` | phone column fills the screen, no peek of the next | 0 | ❌ Survived |
| S47 | `components/archived-cards-column.tsx:33` | virtual column without dashed border and transparent background | 0 | ❌ Survived |
| S48 | `components/card-tile.tsx:69` | every label chip dot is red | 1 | ✅ Killed |

**Iteration 1 sensor outcome (history)**: 41/48 killed, 7 survived, 0 equivalent - FAIL ❌

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Pure `model/` mappers (largest 51 lines), one optimistic helper for six hooks (`mutations.ts:245-278`), one shared notifier for both features |
| Surgical changes | ✅ Iteration 4: Fix 8 changes one token in one test (`'svg'` → `'svg.lucide-archive'`). Iteration 3: Fix 7 changes one test (3 lines: a comment, the header lookup, the scoped `svg` query). Iteration 2: Fix 1 is a one-token code change (`card-tile.tsx:82`); Fixes 2-6 touch only tests. Iteration 1: Outside `features/board`: `save-failure.ts` and `use-save-failure-notifier.ts` moved out of `boards` (refactor commit, `boards` tests repointed, `boards/model/errors.spec.ts` −37 lines moved to `shared/api/save-failure.spec.ts`); `button.tsx` (`ghost`, `sm`), `menu.tsx` (link items), new `checkbox.tsx`, `switch.tsx`, `use-shortcut.ts`, `formatDayMonth`; `routes.tsx` / `board-page.tsx` / `protected-layout.tsx` wiring; `app.tsx`; READMEs, ROADMAP, STATE |
| No scope creep | ✅ No drag and drop, filters, card menu, card links or "Desfazer". Small extras: "Salvando…" spinners on pending items, a local `LoadError` in the archived column and section (design), `board.column.empty` text for an empty read-only column |
| Matches patterns | ✅ FE-AD-006 layering, FE-AD-009 optimistic recipe with FE-AD-010 per-item `apply`/`revert`, FE-AD-011 shortcut guards, React Aria primitives in `shared/ui`, decorative icons `aria-hidden`, i18n keys in both locales, tests mirror `src/` (FE-AD-007); lint/format clean |
| Spec-anchored outcome check (asserted values match spec) | ✅ Exact PT/EN texts, request paths and bodies, cache contents before the response, `disabled` / `aria-invalid` / `aria-current` / `aria-live` |
| Per-layer Coverage Expectation met | ✅ (iter 2) The view model now exercises Recarregar and the `404` refetch through the real reload callback (`vm.spec:628-656`), toggles both ways (`:792-836`), and the FBV-58 checkbox is covered with two cards (L-003). Iteration 3: the archive-icon query is now scoped to the header (S47b, N2, N3 killed) but does not check the glyph (N4, Fix 8). Iteration 4: Fix 8 checks the glyph; N4 and N4b killed |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Extras map to design or Done-when items (e.g. `archived-counts.spec.tsx:95-124` undefined while loading, `queries.spec.tsx:188` separate caches, `mutations.spec.tsx:188,242` uncached queries untouched, `card-tile.spec.tsx:191` spinner) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004..-011), root `.specs/STATE.md` | ✅ |

---

## Edge Cases

- [x] Spaces-only name/title → empty: `validation.spec.ts:22-27`, `inline-create-field.spec.tsx:85-100`, `vm.spec:383-398`, `:698-713`
- [x] Archiving the last active column → "Adicione a primeira coluna": `add-column.spec.tsx:118-128` (field reopens), `board-columns.spec.tsx:176-183`
- [x] Restore while **Mostrar arquivadas** is on → leaves the section, cards back after the refetch: `vm.spec:1011-1014`; `e2e:91-93`
- [x] Due today, not done → "Hoje", no "Atrasada": `card-tile.spec.tsx:109-118`; `due-date.spec.ts:144-148`
- [x] Past due and done → success color, no "Atrasada": `card-tile.spec.tsx:120-133`; `due-date.spec.ts:156-158`
- [x] Column with no active cards but archived ones → counter 0: `board-column.spec.tsx:107-111` (the counter counts `cards`, the active cards of `cards(false)`)
- [x] `n` inside a text field types the letter: `use-shortcut.spec.tsx:65-78` (handler not called; `preventDefault` runs only after the guards, `use-shortcut.ts:30-31`)
- [x] `401` on a board request → FND-16, no board toast: `use-save-failure-notifier.spec.tsx:106-115`; `save-failure.spec.ts:47-49`; `unit/app/app.spec.tsx:60-97`

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root)
- **Result (iteration 4, `45b0664`)**: tests run directly with `cd front-end && ./node_modules/.bin/vitest run`: **86 test files / 907 tests passed**, 0 failed, 0 skipped. `pnpm --filter front-end lint && … typecheck && … build` exit 0 (oxlint + Prettier clean, `tsc --noEmit` clean, `vite build` OK, JS 680.99 kB, gzip 209.02 kB, same > 500 kB chunk warning, observation 1). Real-tree `git status --porcelain` stayed empty.
- **Full gate (iteration 4)**: CI run `40704542083` on `main` at `45b0664` (push of the PR #239 merge): `completed` / `success`, all 12 jobs `success`, including `front-end (test:e2e)` (job `122872986906`, 9 passed) and `back-end (test:e2e)`.
- **Result (iteration 3, `b98287b`)**: exit 0. oxlint `--deny-warnings` + Prettier clean, `tsc --noEmit` clean, **86 test files / 907 tests passed**, 0 failed, 0 skipped; `vite build` OK (JS 680.99 kB, gzip 209.02 kB; same > 500 kB chunk warning, observation 1)
- **Full gate**: not run locally. CI run `40701824685` on `main` at `b98287b` (push of PR #237 merge): `completed` / `success`, all 12 jobs `success`, including `front-end (test:e2e)` (job `122864084511`) and `back-end (test:e2e)`. The previous `main` run `40701754316` (`8e82697`, PR #236 docs merge) was `cancelled` by the newer push, not failed. PR #237's own run `40701336582` (`1f24395`) was also all `success`.
- **Iteration 2**: same command on `f0916ca`, exit 0, 907 passed; CI run `40699259671` all `success`.
- **Test count before feature**: 520 unit/component + 8 e2e (`7fdd07e`)
- **Test count at iteration 1**: 896 unit/component + 9 e2e (`3f65ae5`)
- **Test count at iteration 2**: 907 unit/component + 9 e2e (`f0916ca`)
- **Test count at iteration 4**: 907 unit/component + 9 e2e (`45b0664`). Delta since iteration 3: 0; no test added or removed. One assertion got stronger: `archived-cards-column.spec.tsx:88` `'svg'` → `'svg.lucide-archive'`
- **Test count at iteration 3**: 907 unit/component + 9 e2e (`b98287b`). Delta since iteration 2: 0; no test added or removed. One assertion changed and got stronger: `archived-cards-column.spec.tsx:86` `column().querySelector('svg')` → `:87-88` the same query on the title's header row
- **Delta since iteration 1**: +11 unit/component (board: +1 `card-tile`, +1 `board-column`, +2 `board-columns`, +1 `archived-cards-column`, +3 `vm.spec`; other: +2 `board-form-dialog`, +1 `text-field`). e2e count unchanged; `board.e2e-spec.ts` gained steps (third column, reload, overflow check). No test removed. One assertion changed: `vm.spec:499` `expect(changes).toEqual([])` replaced by a stronger flush-then-`toEqual` check; `text-field.spec.tsx` dropped "hint still in the description" for the error case, matching the #234 behavior change (the hint is hidden while the error shows)
- **Skipped tests**: none
- **Failures**: none

---

## Observations (non-blocking)

1. Bundle: main JS chunk 681 kB, unchanged since iteration 1. A code split is worth doing before 3b adds the drag library.
2. Archived cards in the virtual column show no due date (`card-tile.tsx:50-53`). Spec-silent.
3. A `400` without a `title` entry in `errors[]` on create falls through to "Tentar novamente" (`use-board-view-model.ts:141-144`). Spec-silent.
4. The `n` shortcut moves an open card field to the first column (`use-board-view-model.ts:212`). Spec-silent.
5. N1 (#232 `relative` on the checkbox) is guarded only by `e2e:141-146`. That is the right layer (jsdom has no layout); the Verifier did not run Playwright, so N1 is not counted.

---

## Fix Plans

### Fix 8: Assert the header icon is the archive glyph (N4; FBV-34) - test only (done, #239)

- **Root cause**: `archived-cards-column.spec.tsx:88` checks `header?.querySelector('svg')`, which any icon satisfies. FBV-34 names an archive icon, so a wrong glyph (N4: `Archive` → `Inbox`) passes every test.
- **Fix task**: in `front-end/test/unit/features/board/components/archived-cards-column.spec.tsx:88`, query `header?.querySelector('svg.lucide-archive')` (the class lucide-react sets on the `Archive` svg). One line.
- **Verified in scratch**: with this change the file passes 9/9 on `b98287b` and fails 1 with N4 applied (see Discrimination Sensor, iteration 3).
- **Done when**: the test fails with N4 and with S47b, passes on `main`; build gate green.
- **Priority**: Cosmetic. Escalated to the user after iteration 3 of 3; the user chose to land it. Landed as PR #239 (`6439ba5`) and verified in iteration 4: N4 and N4b killed, S47b still killed.

### Fix 7: Make the archive-icon assertion see only the column header (S47b; FBV-34) - test only (done, #237)

- **Root cause**: `archived-cards-column.spec.tsx:86` checks `column().querySelector('svg')`. The default render has two archived cards, and each card's checkbox draws a `Check` svg (`shared/ui/checkbox.tsx:29`), so the query passes without the header's `<Archive>` icon (`archived-cards-column.tsx:36`).
- **Fix task**: In `front-end/test/unit/features/board/components/archived-cards-column.spec.tsx`, scope the query to the header row that holds the "Arquivadas" title (e.g. the title's parent element) and assert it contains an `svg`, or assert the lucide class `lucide-archive` on that svg. Do not query the whole column.
- **Done when**: the test fails with `<Archive size={16} aria-hidden />` removed and passes on `main`; build gate green.
- **Priority**: Cosmetic

### Iteration-1 fix plans (history)

Fixes 1-6 (FBV-58 checkbox; S10 refetch; S13 un-tick; S9 unchanged rename; S43 empty board; S45-S47 layout and style classes) were all implemented in PRs #229-#231 and verified above (Fix 6 partially: its `svg` clause became Fix 7).

---

## Requirement Traceability Update

| Requirement | Status (iter 1) | Status (iter 2) | Status (iter 3) | New Status (iter 4) |
| ----------- | --------------- | --------------- | --------------- | ------------------- |
| FBV-01..18, FBV-20..30, FBV-32, FBV-33, FBV-35..47, FBV-49..53, FBV-56, FBV-57 | ✅ Verified | ✅ Verified | ✅ Verified (no source change; `archived-cards-column.spec.tsx` line maps re-read) | ✅ Verified (no source change) |
| FBV-58 | ❌ Needs Fix | ✅ Verified | ✅ Verified (F1a killed again) | ✅ Verified (no source change) |
| FBV-54, FBV-55 | ❌ Needs Fix | ✅ Verified | ✅ Verified (S10 killed again) | ✅ Verified (no source change) |
| FBV-31 | ❌ Needs Fix | ✅ Verified | ✅ Verified | ✅ Verified (no source change) |
| FBV-19 | ❌ Needs Fix | ✅ Verified | ✅ Verified | ✅ Verified (no source change) |
| FBV-48 | ❌ Needs Fix | ✅ Verified | ✅ Verified | ✅ Verified (no source change) |
| FBV-34 | ❌ Needs Fix | ❌ Needs Fix (S47b) | ❌ Needs Fix (N4 survived, Fix 8, escalated) | ✅ Verified (Fix 8 #239: N4, N4b, S47b, N2, N3, S47 killed) |

`spec.md`'s traceability table is updated to match.

---

## Summary

**Overall**: ✅ Ready.

**Spec-anchored check**: 58/58 ACs matched the spec outcome with discriminating evidence. Spec-precision gaps: 0
**Sensor**: iteration 4: 6/6 killed. Iteration 3: 7/8 (N4 survived). Iteration 2: 10/11 (+N1 e2e-only). Iteration 1: 41/48
**Gate**: 907 unit/component passed, lint, typecheck and build clean on `45b0664`; 9 e2e passed in CI run `40704542083`

**What works**: everything from iterations 1-3. Fix 8 (#239) makes the FBV-34 icon test check the glyph itself: a wrong icon (N4 `Inbox`, N4b `ArchiveX`), a missing icon (S47b), a misplaced icon (N2) or a dropped header title (N3) all fail it.

**Issues found**: none. Observations 1-5 stay non-blocking.

**Next steps**: close the board feature. Commit this report and the `spec.md` traceability update as a small `docs(front-end)` change.
