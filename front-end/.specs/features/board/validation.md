# Board Validation

**Date**: 2026-10-27
**Spec**: `front-end/.specs/features/board/spec.md`
**Diff range**: `7fdd07e..3f65ae5` (95 non-merge commits, first feature commit `acc936f`; 101 files, +11016/-136). Scope: `front-end/` plus `README.md` / `README.PT.md`. One dependency line in `front-end/package.json` and its `pnpm-lock.yaml` entry; no CI file changed.
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1 of 3

## Validation: Board - FAIL ❌ (iteration 1)

**Result (iteration 1)**: FAIL ❌. The gate is green: 896 unit/component tests (+376 over the 520 baseline), 9 e2e in CI on `3f65ae5`. 57 of 58 FBV requirements behave as specified. **FBV-58 is not met**: a card's "Concluída" checkbox stays enabled while its done change is in flight (`card-tile.tsx:82` ignores `isPending`; a worktree probe confirms it). The sensor killed 41 of 48 mutants. Seven survived, all missing assertions: the view model's Recarregar / `404` refetch is never exercised (S10, FBV-54/55), un-ticking a done card is untested (S13), the unchanged-rename test cannot see a late request (S9), archived items on a board with no active columns (S43), and three layout/style classes (S45-S47). One fix needs code (Fix 1); the rest are test-only.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T44 | ✅ Done | Every "Done when" box in `tasks.md` is ticked (`grep -c -- '- \[ \]' tasks.md` → `0`, `- \[x\]` → `90`). T43's e2e journey was not run locally (no containers started); the `front-end (test:e2e)` CI job on `3f65ae5` is the evidence. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. `board/…` means `unit/features/board/…`; `vm.spec` is `board/view-models/use-board-view-model.spec.tsx`; `screen.spec` is `board/components/board-screen.spec.tsx`; `e2e` is `e2e/board.e2e-spec.ts`. Component specs render PT-BR unless the row says EN. "Sensor" points to the mutation that proves the test discriminates (see Discrimination Sensor).

### P1: View a board

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-01 | Title, description when not null, menu (…) whose only item "Etiquetas do quadro" links to `/b/{id}/labels` | `board/components/board-header.spec.tsx:33-39` heading level 1 = title; `:41-44` `getByText('Q4 go-to-market')`; `:47-50` `null` → `queryByRole('paragraph')` `toBeNull()`; `:53-70` menu items `toEqual([labels])` (PT "Etiquetas do quadro" / EN "Board labels"), `href` `toBe('/b/${boardId}/labels')` (S40 killed) | ✅ |
| FBV-02 | Active columns side by side in ascending `position`, horizontal scroll | `board/model/columns.spec.ts:38-42` lists ordered by position; `vm.spec:252-265` `toEqual([['Doing', ['c3']], ['Backlog', ['c2','c1']]])` (Doing `position 0` before Backlog `1`, S44 killed); `screen.spec:138-144` region names `toEqual(['Backlog','Doing'])`; `board/components/board-columns.spec.tsx:131-134`. Scroll: `overflow-x-auto` on the scroller (`board-columns.tsx:137`), not asserted (layout, jsdom) | ✅ |
| FBV-03 | Each column: active cards by `position`, header count of those cards | `columns.spec.ts:44-57` grouped by list and sorted; `vm.spec:263-264` card order `['c2','c1']`; `board/components/board-column.spec.tsx:91-96` both cards + counter `'2'`; `:99-103` `'0'` when empty | ✅ |
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
| FBV-13 | No active columns → "Adicione a primeira coluna" with the field open | `board/components/add-column.spec.tsx:90-102` title, text, field focused; `board-columns.spec.tsx:166-173` only the block, no regions; `add-column.spec.tsx:118-128` field reopens when the last column leaves (edge case) | ✅ |
| FBV-14 | Enter + valid name → `POST /boards/{id}/lists` with trimmed `title`; `201` → column at the end, toast "Coluna criada", field cleared and open | `vm.spec:362-381` body `toEqual({ title: 'To do' })` from `'  To do  '`, `'Coluna criada'` (S16 killed); `board/api/create-mutations.spec.tsx:85-97` cache `toEqual([backlog, doing])` (S30 killed); `board/components/inline-create-field.spec.tsx:103-115` cleared, focused; `add-column.spec.tsx:79-88` stays open; `screen.spec:185-197`; `e2e:23-30` | ✅ |
| FBV-15 | Empty after trim → "Dê um nome à coluna", nothing sent | `board/model/validation.spec.ts:22-27` `''`, `'   '` → required; `vm.spec:383-398` `'   '` → `'columnNameRequired'`, `changes` `toEqual([])`; `inline-create-field.spec.tsx:85-100` message, text kept, `aria-invalid` | ✅ |
| FBV-16 | > 100 after trim → "Use até 100 caracteres", nothing sent | `validation.spec.ts:29-39` 1 / 100 / padded 100 accepted, padded 101 rejected (S23 killed); `vm.spec:383-398` 101 → `'columnNameTooLong'`, no request | ✅ |
| FBV-17 | In flight: text kept, submit disabled | `inline-create-field.spec.tsx:130-140` `isPending` → submit `disabled`, Enter ignored, text kept; `:142-156` second Enter during submit ignored; `add-column.spec.tsx:130-140`; `vm.spec:449-473` `isCreatingList` `true` while held | ✅ (S32 killed) |
| FBV-18 | Click on name or **Renomear** → field with the current name | `board-column.spec.tsx:106-112`, `:124-131` `onStartRename` once; `:142-150` field value `'To do'`, name button gone; `board/components/column-rename-field.spec.tsx:53-58` focused with the name; `vm.spec:475-484` | ✅ |
| FBV-19 | Enter/blur + valid differing name → new name at once, `PATCH /lists/{id}` trimmed `title`, toast "Coluna renomeada" | `vm.spec:518-545` field closed, titles `['Doing','Ideas']` before the held response, body `{ title: 'Ideas' }` from `' Ideas '`, `'Coluna renomeada'`; `board/api/mutations.spec.tsx:116-126`; `column-rename-field.spec.tsx:60-76` Enter and blur; `e2e:63-72`. "Unchanged name sends nothing": `vm.spec:486-500` asserts `changes` synchronously, see S9 | ⚠️ Weak (S9) |
| FBV-20 | Esc → field closes, old name, nothing sent | `column-rename-field.spec.tsx:87-95` `onCancel` once, `onSubmit` not called, also on the blur after Esc (S33 killed); `vm.spec:475-484` `cancelRename` → `null` | ✅ |
| FBV-21 | Invalid name on Enter/blur → field open with FBV-15/16 message, nothing sent | `column-rename-field.spec.tsx:97-112` message, value kept, `aria-invalid`; `:114-122` re-submits on blur after an error; `vm.spec:502-516` `'columnNameRequired'`, `editing` still open, `changes` `[]` | ✅ |
| FBV-22 | **Arquivar** → column removed at once, `POST /lists/{id}/archive`, toast "Coluna arquivada" | `vm.spec:567-588` titles `['Doing']` before the held response, path `…/archive`, `'Coluna arquivada'`; `mutations.spec.tsx:225-240` moved to the front of the archived lists; `board-column.spec.tsx:133-140`; `screen.spec:221-232`; `e2e:74-78` | ✅ |
| FBV-23 | Column menu: exactly **Renomear**, **Arquivar** | `board-column.spec.tsx:114-122` menu item names `toEqual(['Renomear','Arquivar'])` | ✅ |

### P1: Create cards and mark them done

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-24 | "+ Adicionar tarefa" opens the card field in that column | `board-column.spec.tsx:164-181` `onOpenAddCard` once; field replaces the button; `board-columns.spec.tsx:202-208` wired to its own list id; `vm.spec:617-627` | ✅ |
| FBV-25 | Enter + valid title → `POST /lists/{listId}/cards` trimmed; `201` → card at the end, toast "Tarefa criada", field cleared and open | `vm.spec:629-653` path `/api/v1/lists/${backlog.id}/cards`, body `{ title: 'Write tests' }` from `'  Write tests  '`, `'Tarefa criada'`, `addingCardListId` kept (S17 killed); `create-mutations.spec.tsx:160-177` cache `toEqual([first, second])` (S30 killed); `screen.spec:199-219`; `e2e:32-40` | ✅ |
| FBV-26 | Empty after trim → "Dê um título à tarefa", nothing sent | `validation.spec.ts:22-27` (card validator); `vm.spec:655-670` `'   '` → `'cardTitleRequired'`, `changes` `[]`; `inline-create-field.spec.tsx:85-100` | ✅ |
| FBV-27 | > 100 after trim → "Use até 100 caracteres", nothing sent | `validation.spec.ts:29-39`; `vm.spec:655-670` 101 → `'cardTitleTooLong'` | ✅ |
| FBV-28 | Esc → field closes, nothing sent | `inline-create-field.spec.tsx:158-165` `onClose` once, `onSubmit` not called; `vm.spec:617-627` `closeAddCard` | ✅ |
| FBV-29 | In flight: text kept, submit disabled | `inline-create-field.spec.tsx:130-156`; `vm.spec:721-747` `isCreatingCard` `true` while held | ✅ |
| FBV-30 | `n` outside text fields and dialogs, ≥ 1 active column → card field in the first column, focused | `vm.spec:809-816` `addingCardListId` `toBe(doing.id)` (first by position); `:832-839` no columns → nothing; `:841-857` loading → nothing; `inline-create-field.spec.tsx:62-66` focused on open; `unit/shared/keyboard/use-shortcut.spec.tsx:65-78` ignored in input/textarea/select/contenteditable, `:80-87` while a modal is open (S34, S35 killed) | ✅ |
| FBV-31 | Toggle "Concluída" → new state at once, `PATCH /cards/{id}` with `done` = new value | `vm.spec:749-768` `cardDone` `true` before the held response, body `{ done: true }`; `mutations.spec.tsx:442-452`; `card-tile.spec.tsx:157-164` `onToggleDone` with the card; `e2e:42-61` persisted after reload. Only `false → true` is tested, see S13 | ⚠️ Weak (S13) |
| FBV-32 | No active cards → "Arraste cards para cá" | `board-column.spec.tsx:99-103` text + counter `'0'` | ✅ |

### P1: See and manage archived items

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-33 | Switch **Mostrar arquivadas**, off whenever the board opens | `board/components/board-toolbar.spec.tsx:27-61` role `switch` named PT/EN, `checked` follows the prop, `onChange` once; `vm.spec:876-884` off and no archived request; `unit/pages/board-page.spec.tsx:52-66` off again after moving to another board; `e2e:81-82` | ✅ |
| FBV-34 | Virtual column "Arquivadas" after the active columns: dashed border, transparent background, archive icon, no menu, no create field | `board-columns.spec.tsx:137-147` region order `[…columns, 'Arquivadas', 'Colunas arquivadas']`; `board/components/archived-cards-column.spec.tsx:74-79` name, count; `:100-105` no button, no textbox. Dashed border / transparent background / icon not asserted (S47). With no active columns and the toggle on, nothing checks that the virtual column and section still show (S43) | ⚠️ Weak (S43, S47) |
| FBV-35 | Archived cards incl. archived columns', newest `archivedAt` first, "Arquivada em 2 out, 2026 · de: {column}" | `vm.spec:886-901` `toEqual([['c8','Backlog'],['c7','Ideas']])` (Ideas is archived); `board/model/archived.spec.ts:40-67` title from active ∪ archived lists, newest first (S27 killed); `archived-cards-column.spec.tsx:81-90` exact text `'Arquivada em 2 out, 2026 · de: To do'` | ✅ |
| FBV-36 | No archived cards → "Nenhuma tarefa arquivada" | `archived-cards-column.spec.tsx:107-112` | ✅ |
| FBV-37 | Archived columns section after the virtual column, newest first, "Arquivada em 2 out, 2026 · 3 tarefas", count = active + archived | `vm.spec:903-918` `toEqual([['Later',0],['Ideas',3]])`; `board/api/archived-counts.spec.tsx:73-93` 2 active + 1 archived → `3` (S26 killed); `archived.spec.ts:70-85` newest first; `board/components/archived-columns-section.spec.tsx:90-101` `'Arquivada em 2 out, 2026·3 tarefas'`, `'·1 tarefa'`; `:103-116` `'0 tarefas'` | ✅ |
| FBV-38 | No archived columns → "Nenhuma coluna arquivada" | `archived-columns-section.spec.tsx:162-167` | ✅ |
| FBV-39 | **Restaurar** → column at once at the end of the active ones, `POST /lists/{id}/unarchive`, toast "Coluna restaurada" | `vm.spec:933-957` titles `['Doing','Backlog','Ideas']` and section `['Later']` before the held response, path `…/unarchive`, `'Coluna restaurada'` (S3 killed); `mutations.spec.tsx:310-325` appended with `position` = length; `archived-columns-section.spec.tsx:118-132` callback with the id (S22 killed); `screen.spec:221-249`; `e2e:80-93` cards back after the refetch | ✅ |
| FBV-40 | Delete dialog text for n ≥ 2 / n = 1 / n = 0 | `board/components/delete-column-dialog.spec.tsx:61-78` PT exact for 0 / 1 / 3 (`'Isso apaga a coluna e as 3 tarefas dela, ativas e arquivadas. Não dá para desfazer.'`), `:80-99` EN; `archived.spec.ts:116-124` `0→none`, `1→one`, `2→many` (S28 killed); `screen.spec:251-288` dialog waits for the count, then `'… its 1 task …'` (S29 killed) | ✅ |
| FBV-41 | Confirm → removed at once, `DELETE /lists/{id}`, toast "Coluna excluída definitivamente" | `vm.spec:987-1010` dialog closed, section `['Later']` before the held response, `DELETE /api/v1/lists/${ideas.id}`, toast; `mutations.spec.tsx:364-375` list and its archived cards dropped (S5 killed); `screen.spec:289-294`; `e2e:95-114` | ✅ |
| FBV-42 | Cancel / Esc → closes, nothing sent | `delete-column-dialog.spec.tsx:113-128` `onCancel` once, `onConfirm` not called, for both; `vm.spec:975-985` `deleteTarget` `null`, `changes` `[]` | ✅ |
| FBV-43 | Virtual column cards read-only: disabled checkbox showing done, no menu, no link | `archived-cards-column.spec.tsx:92-98` `disabled` `[true,true]`, `checked` `[true,false]`; `:100-105` no button; `card-tile.spec.tsx:172-189` archived mode disabled + checked. No link: `CardTile` renders none (no assertion needed beyond the role query) | ✅ |

### P1: Archived board is read-only

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-44 | Banner "Quadro arquivado · somente leitura" + **Restaurar** | `board/components/archived-board-banner.spec.tsx:24-43` `role="status"` text PT/EN, button; `screen.spec:320-327`; `vm.spec:347-358` `readOnly` from `archivedAt` | ✅ |
| FBV-45 | Hide "+ Adicionar coluna", "+ Adicionar tarefa", column menus; checkboxes disabled; names not editable | `board-column.spec.tsx:183-194` no menu, no add, name is plain text; `board-columns.spec.tsx:158-164` no add column; `card-tile.spec.tsx:166-170` checkbox `disabled` (S18 killed); `screen.spec:327` no "Add column" | ✅ |
| FBV-46 | `n` does nothing on an archived board | `vm.spec:818-830` `addingCardListId` `toBeNull()` (S11 killed) | ✅ |
| FBV-47 | **Restaurar** → `POST /boards/{id}/unarchive`; on success banner gone, writes enabled, toast "Quadro restaurado" | `vm.spec:1046-1068` `readOnly` `false`, `'Quadro restaurado'`, path `…/unarchive`; `screen.spec:329-335` banner gone, "Add column" back; `mutations.spec.tsx:502-512` `archivedAt` cleared | ✅ |

### P1: Phone layout

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-48 | < `md`: one column per screen, scroll snap, visible edge of the next column | `e2e:116-127` at 375 px: first column `toBeInViewport({ ratio: 1 })`, next `not.toBeInViewport({ ratio: 0.5 })`. Snap (`snap-x snap-mandatory`, `snap-start`) and the peek (`w-11/12`) are not asserted anywhere (S45, S46) | ⚠️ Weak (S45, S46) |
| FBV-49 | One dot per active column, "{title} · {i} de {n}" | `board/components/column-pager.spec.tsx:29-40` 3 dots, `'Ir para Fazendo'`; `:52-64` `'Fazendo · 2 de 3'` / EN `'Feito · 3 of 3'`, `aria-live="polite"`; `board-columns.spec.tsx:175-189` pager follows scroll (S38 killed); `board/model/pager.spec.ts:9-45`; `e2e:123` `'Planning · 1 of 2'` | ✅ |
| FBV-50 | Tap a dot → scroll to that column | `column-pager.spec.tsx:77-83` `onSelect(2)`; `board-columns.spec.tsx:191-200` `scrollTo({ left: 312, behavior: 'smooth' })` (S39 killed) | ✅ |
| FBV-51 | < `md`: back arrow "Voltar" → `/boards`, menu (…) top right | `board-header.spec.tsx:73-82` link named `'Voltar'`/`'Back'`, `href` `'/boards'`, `md:hidden`; `:53-70` menu present | ✅ |

### P1: Save failures

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBV-52 | Failed rename / archive / restore / delete / done → board back to the prior state | `mutations.spec.tsx:128-156` rename: only the failed title restored while a later rename is pending (S1 killed); `:253-270`, `:272-290` archive: old index, no duplicate after a refetch (S2 killed); `:327-345` restore; `:377-400` delete with its cards; `:454-480` done (S6 killed); `:514-532` board restore (S7 killed); `vm.spec:590-613` archive back on 409/404/500; `:770-791` done back; `:1012-1024` delete back; `screen.spec:297-318` checkbox unticked | ✅ |
| FBV-53 | Network / `5xx` → "Não foi possível salvar. Tente novamente." + **Tentar novamente** resending the same request | `unit/shared/ui/toast/use-save-failure-notifier.spec.tsx:53-75` server and network → button resends; `:131-148` `runChange` retry resends the same variables; `vm.spec:793-805` done retry body `{ done: true }`; `:414-433`, `:686-705` create retry resends the same title; `unit/shared/api/save-failure.spec.ts:24-26` `0/500/503` → `retry` | ✅ |
| FBV-54 | `409` → "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar** refetching every board query | Toast and button: `vm.spec:590-613`, `:770-791`, `:435-447`; `use-save-failure-notifier.spec.tsx:77-92` `reload` called only on click (S37 killed). Refetch: the view model's `reload` (`use-board-view-model.ts:89-94`) is never exercised; replacing it with a no-op passes every test (S10) | ⚠️ Weak (S10) |
| FBV-55 | `404` → saveFail toast without a button, refetch every board query | Toast without button: `vm.spec:590-613` (`404` → `[]` buttons); `use-save-failure-notifier.spec.tsx:94-104` `reload` called once (S36 killed). Same gap as FBV-54: no test sees the board refetch (S10) | ⚠️ Weak (S10) |
| FBV-56 | Create fails (network / `5xx` / `404` / `409`) → field open with the text, submit enabled, matching toast | `inline-create-field.spec.tsx:117-128` reject → text kept, submit enabled, second submit works; `vm.spec:414-447` create list 500 / 409 reject with the toast; `:686-719` create card 500 / 409. `404` on create goes through the same notifier branch as FBV-55 (`notify`, `use-board-view-model.ts:143,191`) | ✅ |
| FBV-57 | Create / rename `400` `errors[].field = title` → "Dê um nome…/Dê um título…" when empty else "Use até 100 caracteres", submitted text, no toast | `board/model/errors.spec.ts:27-61` blank → required, filled → too long, title found among fields, other statuses → `null`; `vm.spec:400-412`, `:672-684` create → field error, no toast; `:547-565` rename reopens `{ value: 'Ideas', error: 'columnNameTooLong' }`, no toast (S12 killed); `board-column.spec.tsx:152-162`, `column-rename-field.spec.tsx:124-130` reopened field shows text + message (S31 killed) | ✅ |
| FBV-58 | While a change to a column or card is in flight: that item's menu (…) **and checkbox** disabled | Menu: `board-column.spec.tsx:203-210` `disabled` `true` (S21 killed); `archived-columns-section.spec.tsx:141-160` only the pending column's buttons disabled; `archived-board-banner.spec.tsx:53-63`; `mutations.spec.tsx:536-560` pending ids (S8 killed). **Checkbox: not implemented.** `card-tile.tsx:78-83` passes `isDisabled={isArchived \|\| isReadOnly}` and ignores `isPending`; `card-tile.spec.tsx:191-195` only checks the "Salvando…" spinner. Verifier probe in the scratch worktree (`CardTile` with `isPending`) → checkbox `disabled` is `false` | ❌ GAP |

**Status**: ❌ Gaps present. 58/58 ACs have `file:line` evidence; 57/58 behave as the spec says; **FBV-58 fails** (the pending card checkbox stays enabled). 6 ACs are weak (surviving mutants: FBV-19, FBV-31, FBV-34, FBV-48, FBV-54, FBV-55). Spec-precision gaps: 0.

---

## Discrimination Sensor

Run in a temporary `git worktree` (`/tmp/claude-1000/board-sensor`, detached `3f65ae5`). No `pnpm` command ran in the worktree: the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked in, and Vitest ran directly (`node ./node_modules/vitest/vitest.mjs run`, full unit suite per mutant). Unmutated sanity run: 896/896 passed. A script applied each mutation alone (the target text had to occur exactly once), ran the suite, reverted with `git checkout -- <file>` and asserted a clean tracked tree before the next. Afterwards the symlinks were removed, then `git worktree remove --force` and `git worktree prune`; the real tree's `git status --porcelain` matched the baseline (empty) apart from this report, and `find … -xtype l` on the three `node_modules` found no broken links.

Paths are relative to `front-end/src/features/board/` unless they start with `shared/` (`front-end/src/shared/`).

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

**S9 note**: in the full suite the only failing test was `submitRename with an empty name…`, the test *after* the target. The stray `PATCH` from the unchanged-rename test landed in the next test's `changes`. Run alone (`-t "unchanged name"`), the target test passes with the mutant: `vm.spec:486-500` asserts `changes` right after `act`, before the request can arrive. A kill through test leakage is not a discriminating test, so S9 counts as survived.

**FBV-58 probe** (not a mutant): a throwaway spec in the worktree rendered `CardTile` with `isPending` and asserted the "Concluída" checkbox `disabled` → `AssertionError: expected false to be true`. The behavior is missing in the code, not only in the tests.

**Sensor depth**: expanded (48 behavior-level mutations across optimistic apply/revert, settle invalidation, pending ids, restore position, view-model wiring and failure paths, validation bounds, due-date rules, archived counts and order, create append, field state, shortcut guards, failure-kind mapping, pager, header, breadcrumb, banner, read-only gates and layout classes). Every P1 story has at least one killed mutant.
**Result**: 41/48 killed, 7 survived (S9, S10, S13, S43, S45, S46, S47), 0 equivalent - FAIL ❌

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Pure `model/` mappers (largest 51 lines), one optimistic helper for six hooks (`mutations.ts:245-278`), one shared notifier for both features |
| Surgical changes | ✅ Outside `features/board`: `save-failure.ts` and `use-save-failure-notifier.ts` moved out of `boards` (refactor commit, `boards` tests repointed, `boards/model/errors.spec.ts` −37 lines moved to `shared/api/save-failure.spec.ts`); `button.tsx` (`ghost`, `sm`), `menu.tsx` (link items), new `checkbox.tsx`, `switch.tsx`, `use-shortcut.ts`, `formatDayMonth`; `routes.tsx` / `board-page.tsx` / `protected-layout.tsx` wiring; `app.tsx`; READMEs, ROADMAP, STATE |
| No scope creep | ✅ No drag and drop, filters, card menu, card links or "Desfazer". Small extras: "Salvando…" spinners on pending items, a local `LoadError` in the archived column and section (design), `board.column.empty` text for an empty read-only column |
| Matches patterns | ✅ FE-AD-006 layering, FE-AD-009 optimistic recipe with FE-AD-010 per-item `apply`/`revert`, FE-AD-011 shortcut guards, React Aria primitives in `shared/ui`, decorative icons `aria-hidden`, i18n keys in both locales, tests mirror `src/` (FE-AD-007); lint/format clean |
| Spec-anchored outcome check (asserted values match spec) | ✅ Exact PT/EN texts, request paths and bodies, cache contents before the response, `disabled` / `aria-invalid` / `aria-current` / `aria-live` |
| Per-layer Coverage Expectation met | ⚠️ Model, API hooks and components meet the matrix (boundaries 0/1/100/101, TZ `America/Sao_Paulo`, counts 0/1/2, per-item revert with an overlapping change pending). The view model misses the matrix row "every failure kind → toast text **and action**": the Recarregar / `404` refetch is not exercised (S10). The FBV-58 checkbox is missing in code and tests |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Extras map to design or Done-when items (e.g. `archived-counts.spec.tsx:95-124` undefined while loading, `queries.spec.tsx:188` separate caches, `mutations.spec.tsx:188,242` uncached queries untouched, `card-tile.spec.tsx:191` spinner) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004..-011), root `.specs/STATE.md` | ✅ |

---

## Edge Cases

- [x] Spaces-only name/title → empty: `validation.spec.ts:22-27`, `inline-create-field.spec.tsx:85-100`, `vm.spec:383-398`, `:655-670`
- [x] Archiving the last active column → "Adicione a primeira coluna": `add-column.spec.tsx:118-128` (field reopens), `board-columns.spec.tsx:166-173`
- [x] Restore while **Mostrar arquivadas** is on → leaves the section, cards back after the refetch: `vm.spec:944-947`; `e2e:91-93`
- [x] Due today, not done → "Hoje", no "Atrasada": `card-tile.spec.tsx:109-118`; `due-date.spec.ts:144-148`
- [x] Past due and done → success color, no "Atrasada": `card-tile.spec.tsx:120-133`; `due-date.spec.ts:156-158`
- [x] Column with no active cards but archived ones → counter 0: `board-column.spec.tsx:99-103` (the counter counts `cards`, the active cards of `cards(false)`)
- [x] `n` inside a text field types the letter: `use-shortcut.spec.tsx:65-78` (handler not called; `preventDefault` runs only after the guards, `use-shortcut.ts:30-31`)
- [x] `401` on a board request → FND-16, no board toast: `use-save-failure-notifier.spec.tsx:106-115`; `save-failure.spec.ts:47-49`; `unit/app/app.spec.tsx:60-97`

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root)
- **Result**: exit 0. oxlint `--deny-warnings` + Prettier clean, `tsc --noEmit` clean, **86 test files / 896 tests passed**, 0 failed, 0 skipped; `vite build` OK (JS 680.84 kB, gzip 208.97 kB; same Vite > 500 kB chunk warning as the boards report, observation 1)
- **Full gate**: not run locally (Verifier started no containers). CI run `40610579326` on `main` at `3f65ae5` (`success`): job `front-end (test:e2e)` (`122560862378`) `success`, log `9 passed (1.1m)` (8 earlier + 1 `board.e2e-spec.ts`). All 12 jobs `success`
- **Test count before feature**: 520 unit/component (Vitest at `7fdd07e` in the scratch worktree: 52 files / 520 tests) + 8 e2e
- **Test count after feature**: 896 unit/component + 9 e2e
- **Delta**: +376 unit/component, +1 e2e. Removed test lines are moves, not losses: `boards/model/errors.spec.ts` (−37, the `saveFailureKind` cases now in `shared/api/save-failure.spec.ts`), `routes.spec.tsx` (−1, the replaced placeholder route), and small rewrites in `app.spec.tsx`, `boards-page.spec.tsx`, `protected-layout.spec.tsx`, `format-date.spec.ts`, `menu.spec.tsx`. No assertion weakened
- **Skipped tests**: none
- **Failures**: none

---

## Observations (non-blocking)

1. Bundle: the main JS chunk grew from 630 kB (boards) to 681 kB. Still only the Vite warning; a code split is worth doing before 3b adds the drag library.
2. Archived cards in the virtual column show no due date (`card-tile.tsx:50-53`). The spec does not ask for one; the prototype line 467 shows only the archive line.
3. A `400` whose `errors[]` has no `title` entry on create resolves `null` from `titleFieldError` and falls through to `notify` → "Tentar novamente" (`use-board-view-model.ts:141-144`), because `saveFailureKind` returns `invalid` and the notifier treats it as `retry`. Spec-silent.
4. The `n` shortcut does not check that no create is already open in another column; it moves the field to the first column (`use-board-view-model.ts:212`). Spec-silent.
5. `vm.spec:486-500` (unchanged rename) and other "sends nothing" checks read `changes` synchronously right after an action that would send asynchronously, so they cannot see a request that leaves later (S9). Only the validation paths return before any request, so the other uses are safe.

---

## Fix Plans

### Fix 1: Disable the checkbox of a card whose change is in flight (FBV-58) - code + test

- **Root cause**: `card-tile.tsx:82` passes `isDisabled={isArchived || isReadOnly}`; `isPending` only shows the "Salvando…" spinner. T24's Done-when list left out the pending checkbox, so neither code nor tests carry the FBV-58 checkbox clause. A second click during a toggle sends another `PATCH`.
- **Fix task**: In `front-end/src/features/board/components/card-tile.tsx` add `isPending` to the checkbox `isDisabled`. In `front-end/test/unit/features/board/components/card-tile.spec.tsx` assert the checkbox is `disabled` with `isPending`; in `board-column.spec.tsx` render two cards with `pendingIds: ['c2']` and assert only `c2`'s checkbox is disabled (lesson L-003).
- **Done when**: the probe assertion holds; the column test fails if the checkbox ignores `isPending` or locks every card; build gate green.
- **Priority**: Major

### Fix 2: Prove Recarregar and the 404 path refetch the board (S10; FBV-54, FBV-55) - test only

- **Root cause**: the notifier is tested with a `reload` spy (`use-save-failure-notifier.spec.tsx:77-104`), but the view model's `reload` (`use-board-view-model.ts:89-94`, invalidate `boardViewKeys.all(boardId)`) is never run in a test, so a no-op passes.
- **Fix task**: In `vm.spec`, using the `requests` counter of `boardServer()`: (a) archive answering `409`, click **Recarregar** → `requests[boardUrl]`, `[listsUrl]`, `[cardsUrl]`, `[labelsUrl]` each grow by 1 (none before the click); (b) archive answering `404` → the same growth without a click.
- **Done when**: both tests fail with S10 applied and pass on `main`; build gate green.
- **Priority**: Major

### Fix 3: Un-tick a done card (S13; FBV-31) - test only

- **Fix task**: In `vm.spec` toggle a card fixture with `done: true` → cache shows `false` before the held response and the body is `{ done: false }`.
- **Done when**: fails with S13 (`done: true` hard-coded); gate green.
- **Priority**: Minor

### Fix 4: Make "unchanged rename sends nothing" observable (S9; FBV-19) - test only

- **Fix task**: In `vm.spec:486-500`, after the unchanged `submitRename`, rename the other column to a new name and wait for its `PATCH`; assert `changes` holds only that one request. The second request flushes any stray first one.
- **Done when**: the test fails alone (`-t "unchanged name"`) with S9 applied; gate green.
- **Priority**: Minor

### Fix 5: Archived items on a board without active columns (S43; FBV-34, FBV-37) - test only

- **Root cause**: `board-columns.tsx:121` keeps the archived column and section visible when the board has no active columns but the toggle is on. Without that, a user who archived the last column could not restore it. No test covers it.
- **Fix task**: In `board-columns.spec.tsx` render `columns: []`, `showArchived: true` → regions `['Arquivadas', 'Colunas arquivadas']` and the add column are shown.
- **Done when**: fails with S43 applied; gate green.
- **Priority**: Minor

### Fix 6: Assert the phone layout and the virtual column style (S45, S46, S47; FBV-48, FBV-34) - test only

- **Fix task**: Class-level checks, the only observable in jsdom (same approach as boards Fix 3): in `board-columns.spec.tsx` the scroller has `snap-x`, `snap-mandatory`, `md:snap-none`; in `board-column.spec.tsx` the section has `snap-start` and `w-11/12`; in `archived-cards-column.spec.tsx` the region has `border-dashed` and `bg-transparent` and contains an `svg`. Optionally in `e2e` at 375 px assert the next column `toBeInViewport()` (some part visible) to prove the peek.
- **Done when**: each check fails with its mutant applied; gate green.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FBV-01..18, FBV-20..30, FBV-32, FBV-33, FBV-35..47, FBV-49..53, FBV-56, FBV-57 | Pending | ✅ Verified |
| FBV-58 | Pending | ❌ Needs Fix (checkbox not disabled while pending, Fix 1) |
| FBV-54, FBV-55 | Pending | ❌ Needs Fix (S10, Fix 2) |
| FBV-31 | Pending | ❌ Needs Fix (S13, Fix 3) |
| FBV-19 | Pending | ❌ Needs Fix (S9, Fix 4) |
| FBV-34 | Pending | ❌ Needs Fix (S43, S47, Fixes 5-6) |
| FBV-48 | Pending | ❌ Needs Fix (S45, S46, Fix 6) |

`spec.md`'s traceability table is updated to match.

---

## Summary

**Overall**: ❌ Not Ready (one code gap, test gaps otherwise)

**Spec-anchored check**: 58/58 ACs have evidence; 57/58 behave as specified; 51/58 fully discriminating. FBV-58 fails; FBV-19, FBV-31, FBV-34, FBV-48, FBV-54, FBV-55 are weak. Spec-precision gaps: 0
**Sensor**: 41/48 killed, 7 survived, 0 equivalent
**Gate**: 896 unit/component passed (+376); 9 e2e passed in CI run `40610579326` on `3f65ae5`

**What works**: per-item optimistic apply/revert that survives overlapping changes (FE-AD-010), settle refetch only after the last change, pending ids per item, restore to the end by position, create append then invalidate, exact validation bounds and trim, due-date rules in local time, archived counts (active + archived) and newest-first order, delete text by count with the dialog waiting for the count, every failure kind's toast and button, `400` back into the field, shortcut guards, read-only board, pager and breadcrumb.

**Issues found**: the pending card checkbox stays enabled (FBV-58, Fix 1). Six missing assertions: Recarregar / `404` refetch (Fix 2), un-ticking a card (Fix 3), unchanged rename (Fix 4), archived items on an empty board (Fix 5), phone layout and virtual column classes (Fix 6).

**Next steps**: Fix 1 as its own `fix(front-end)` PR (code + test); Fixes 2-6 as one or two test-only PRs. Then re-run the Verifier (iteration 2 of 3).
