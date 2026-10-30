# Card Detail Specification

## Problem Statement

The board screen (features `board`, `board-dnd`, `board-filters`) shows cards, but a card is not a link: the user cannot read or change its description and due date, rename it, archive it, restore it or delete it, and `/b/{boardId}/t/{cardId}` is still the foundation placeholder. Feature `card-detail` (4a) turns that route into the card detail of the prototype (doc §7): a modal over the board on desktop and a full screen on a phone, with the done flag, the title, the due date, the description, the applied labels (read-only), the footer actions (**Mover para…**, **Arquivar**), the read-only modes of an archived card and of an archived board, the load states and the "Descartar alterações?" dialog. The checklist (4b `card-checklist`) and the label popover (4c `card-labels`) build on this screen.

## Goals

- [ ] A user clicks a card on the board and sees its detail at `/b/{boardId}/t/{cardId}`, over the board on desktop and full screen on a phone.
- [ ] A user renames a card, sets or removes its due date, marks it done and edits its description from the detail, and the board shows the same values when the detail closes.
- [ ] A user archives a card from the detail, sees it read-only, restores it to the end of its column or deletes it for good after a confirmation.
- [ ] A user who closes the detail with an unsaved title or description is asked "Descartar alterações?" and loses nothing by choosing **Continuar editando**.
- [ ] Opening the link of a card that no longer exists shows "Esta tarefa não existe mais" with **Fechar**.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Checklist section (progress, add, edit, check, reorder, delete items) | Feature `card-checklist` (4b) |
| Label popover ("+", search, apply/remove, "Criar etiqueta", "Gerenciar etiquetas") | Feature `card-labels` (4c); this feature only shows the labels already applied |
| Labels page (`/b/{boardId}/labels`) | Feature `labels` (5) |
| Restore/delete a card from the board tiles (virtual column "Arquivadas") | Doc §7 puts these actions only in the detail; the tile opens the detail |
| Comments, attachments, members, activity history | Doc §1 "Fora do escopo" |
| Due time (hour) or reminders | Doc §7: the due date is date-only; `UpdateCardDto.dueDate` is `format: date` |
| Esc order across popover and checklist editing layers | Those layers arrive with 4b and 4c; this feature covers dialog → detail → in-place field |
| The shortcuts dialog row for Esc | Feature `settings` (6) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Split of roadmap 4 | 4a `card-detail` (this spec), 4b `card-checklist`, 4c `card-labels` | User choice; keeps each feature near the size of 3a–3c | y |
| "Criar etiqueta" in the popover | Belongs to 4c, not to feature `labels` (5) | User choice; doc §7 puts it in the popover | y |
| What opens the detail | Click or Enter on an active card tile, and on a card tile in the virtual column "Arquivadas" | Doc §7; board spec defers "opening a card (click or Enter on a card)" to this feature | y |
| Desktop vs phone | Desktop (≥ 768 px, the board's existing breakpoint): centered modal over the board, which stays rendered behind. Phone (< 768 px): full screen with a back arrow ("Voltar") instead of the X | Doc §7; doc §3 phone layout | y |
| Opening the URL directly (reload, shared link) | Shows the board behind the detail, as when opened by click | Doc §7: the detail lives over the board at its own URL | y |
| Closing | X, Esc, click on the backdrop or browser Back navigates to `/b/{boardId}`, and focus goes back to the card tile when it is on screen | Doc §7; prototype `closeDetail` → `focusCard` | y |
| Header | Shows the name of the card's current column | Doc §7 | y |
| Done checkbox | Saves at once (optimistic `PATCH` with `done`); accessible name "Concluída"; while done, the badge "Concluída" shows next to the title | Doc §7, §13; FE-AD-009 (toggle) | y |
| Title editing | Edited in place. Enter or blur saves when the trimmed value differs from the current title; Esc restores the current title. Errors: empty after trim → "Dê um título à tarefa"; > 100 chars after trim → "Use até 100 caracteres"; nothing is sent while invalid | Doc §7; `UpdateCardDto.title` 1–100; board validation already trims | y |
| Blur with an invalid title | Keeps the field with its error and sends nothing | Same rule as the board rename field (FBV-21) | y |
| "Atrasada" badge | Shows by the existing `isOverdue` rule (not done, due date before today) | Doc §2, §7; same rule as the card tile | y |
| Due date | A native date input (`type="date"`); choosing a date saves at once with `dueDate: "YYYY-MM-DD"`; "Remover prazo" shows only when a due date is set and saves `dueDate: null` | Doc §7 "seletor de data (só data)"; FE-AD-009 | y |
| Description | Textarea with counter "n / 5000"; **Salvar** and **Cancelar** show only while the draft differs from the saved value. **Salvar** sends the draft as is (not trimmed); an empty draft sends `description: null`. Over 5000 chars: "Use até 5000 caracteres" and **Salvar** is disabled. **Cancelar** restores the saved value | Doc §7; prototype `saveDesc` does not trim; `description` is nullable | y |
| Labels in this feature | The applied labels show as the same chips as on the card tile, in board label order; no "+" button | Split decision; chips reuse the board's `LabelChip` | y |
| Footer | "Criada em 3 out, 2026" (doc §14 date format), **Mover para…** (the board's move dialog), **Arquivar** | Doc §7 | y |
| **Mover para…** from the detail | Opens the existing move dialog over the detail; on success the detail stays open and its header shows the new column | Prototype keeps `detailId` after `moveTo` | y |
| **Arquivar** from the detail | Optimistic `POST /cards/{id}/archive`; toast "Tarefa arquivada"; the detail stays open and switches to the archived read-only mode | Prototype `archiveTask` keeps the detail open | y |
| Archived card (read-only) | Notice "Tarefa arquivada · somente leitura"; title, done, due date and description are disabled and dimmed; footer shows **Restaurar** and **Excluir definitivamente** instead of **Mover para…** and **Arquivar** | Doc §7 "Tarefa arquivada" | y |
| **Restaurar** | Optimistic `POST /cards/{id}/unarchive`; toast "Tarefa restaurada"; the card goes to the end of its column (server rule); the detail stays open and becomes editable | Doc §7; prototype `restoreTask` | y |
| **Excluir definitivamente** | Confirmation dialog "Excluir a tarefa definitivamente?" / "Isso apaga a tarefa e o checklist. Não dá para desfazer." with **Cancelar** · **Excluir definitivamente**; on confirm, optimistic `DELETE /cards/{id}`, the detail closes to `/b/{boardId}` and the toast "Tarefa excluída definitivamente" shows | Doc §7; prototype `deleteForever` closes the detail | y |
| Archived card whose column is archived | The notice "A coluna de origem está arquivada. Restaure a coluna primeiro." shows at the top and **Restaurar** and **Excluir definitivamente** are disabled | Doc §7 | y |
| Card of an archived board | Notice "Quadro arquivado · somente leitura"; every field disabled; the footer shows only the creation date, with no actions. Wins over the archived-card mode when both apply | Doc §7 "Tarefa de quadro arquivado" | y |
| Unsaved edits | Title draft ≠ saved title (trimmed) or description draft ≠ saved description. Never counted in a read-only mode | Doc §7; prototype `dirty()` | y |
| Close with unsaved edits | Any close path (X, back arrow, Esc, backdrop, browser Back) opens "Descartar alterações?" / "Você tem edições não salvas." with **Continuar editando** · **Descartar**; **Descartar** closes without saving; **Continuar editando** keeps the detail and the drafts | Doc §7 | y |
| Browser Back with unsaved edits | Blocked with the same dialog (React Router `useBlocker`) | Doc §7 lists "voltar" as a close path | y |
| Esc order | Esc closes the innermost layer: an open dialog → the title field being edited (restores it, the detail stays) → the detail (with the discard rule) | Doc §11 Esc row, limited to the layers of this feature | y |
| Shortcuts while the detail is open | `n` and `/` do nothing (the detail is `aria-modal`, FE-AD-011) | FE-AD-011 | y |
| Load states | Loading: skeleton of the fields. Error (network/`5xx`): "Não foi possível carregar" + **Tentar novamente**. `404` (missing, foreign or deleted card, or card of another board): "Esta tarefa não existe mais" + **Fechar**, which goes to `/b/{boardId}` | Doc §7 "Estados do detalhe" | y |
| Card id that belongs to another board in the URL | Treated as not found | The URL board must own the card; showing it over another board would mix data | y |
| Card deleted or archived on another device while the detail is open | A save that gets `409` follows doc §10 (rollback + "Este item foi arquivado. Recarregue para ver o estado atual." + **Recarregar**); a `404` rolls back, shows the plain save-fail toast and refetches, which turns the detail into "Esta tarefa não existe mais" | FE-AD-009 failure rules | y |
| Failure of any save | FE-AD-009/FE-AD-010: the change is undone on screen and "Não foi possível salvar. Tente novamente." shows with **Tentar novamente**; a failed title or description save keeps the draft in the field so nothing typed is lost | Doc §10 | y |
| Board consistency | Every save patches the same cache the board reads, so the tile shows the new title, done flag, due date or archived state without a reload | FE-AD-006, FE-AD-009 | y |
| Pending state | While a save of a field is in flight, that control stays enabled; a second save of the same field supersedes the first (FE-AD-009 settles once no mutation with the key is pending) | FE-AD-009 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Open and close the card detail ⭐ MVP

**User Story**: As a logged-in user, I want to open a card from the board and close it again so that I can see everything about one task without leaving the board.

**Why P1**: Every other story happens inside the detail.

**Acceptance Criteria**:

1. WHEN the user clicks an active card tile or presses Enter on it THEN the system SHALL navigate to `/b/{boardId}/t/{cardId}` and show the card detail as a dialog with `aria-modal="true"`.  <!-- FCD-01 -->
2. WHEN the user clicks a card tile in the virtual column "Arquivadas" or presses Enter on it THEN the system SHALL navigate to `/b/{boardId}/t/{cardId}` and show that card's detail.  <!-- FCD-02 -->
3. WHILE the viewport is at least 768 px wide the system SHALL show the detail as a centered modal with the board rendered behind it and an X button labelled "Fechar".  <!-- FCD-03 -->
4. WHILE the viewport is narrower than 768 px the system SHALL show the detail full screen with a back arrow button labelled "Voltar" instead of the X.  <!-- FCD-04 -->
5. WHEN the user opens `/b/{boardId}/t/{cardId}` directly THEN the system SHALL show the board of `{boardId}` behind the detail of `{cardId}`.  <!-- FCD-05 -->
6. The system SHALL show the name of the card's current column in the detail header.  <!-- FCD-06 -->
7. WHEN the user activates the X, the back arrow, presses Esc, clicks the backdrop or uses browser Back with no unsaved edits THEN the system SHALL navigate to `/b/{boardId}` and close the detail.  <!-- FCD-07 -->
8. WHEN the detail closes and the card tile is on screen THEN the system SHALL move focus to that card tile.  <!-- FCD-08 -->
9. WHILE the detail is loading the system SHALL show a skeleton of the fields.  <!-- FCD-09 -->
10. IF loading the card fails with a network error or a `5xx` THEN the system SHALL show "Não foi possível carregar" with a **Tentar novamente** button that loads it again.  <!-- FCD-10 -->
11. IF loading the card returns `404`, or the card belongs to a board other than `{boardId}`, THEN the system SHALL show "Esta tarefa não existe mais" with a **Fechar** button that navigates to `/b/{boardId}`.  <!-- FCD-11 -->
12. WHILE the detail is open the system SHALL ignore the board shortcuts `n` and `/`.  <!-- FCD-12 -->

**Independent Test**: On the seed board, click a card → the URL is `/b/{id}/t/{cardId}`, the modal shows the column name; Esc → back on `/b/{id}` with focus on the tile; reload on a deleted card's URL → "Esta tarefa não existe mais".

---

### P1: Edit the title and the done flag ⭐ MVP

**User Story**: As a logged-in user, I want to rename a card and mark it done from its detail so that the task reads right and shows its status.

**Why P1**: Title and status are the core fields of a task.

**Acceptance Criteria**:

1. WHEN the user toggles the checkbox labelled "Concluída" THEN the system SHALL send `PATCH /api/v1/cards/{id}` with `done` set to the new value and show the new state at once.  <!-- FCD-13 -->
2. WHILE the card is done the system SHALL show the badge "Concluída" next to the title.  <!-- FCD-14 -->
3. WHILE the card is not done and its due date is before today the system SHALL show the badge "Atrasada" next to the title.  <!-- FCD-15 -->
4. WHEN the user presses Enter or leaves the title field with a valid title that differs, after trimming, from the saved title THEN the system SHALL send `PATCH /api/v1/cards/{id}` with the trimmed `title` and show it at once.  <!-- FCD-16 -->
5. WHEN the user presses Enter or leaves the title field with a trimmed title equal to the saved title THEN the system SHALL send nothing.  <!-- FCD-17 -->
6. IF the title is empty after trimming when the user presses Enter or leaves the field THEN the system SHALL show "Dê um título à tarefa", keep the field and send nothing.  <!-- FCD-18 -->
7. IF the title is longer than 100 characters after trimming when the user presses Enter or leaves the field THEN the system SHALL show "Use até 100 caracteres", keep the field and send nothing.  <!-- FCD-19 -->
8. WHEN the user presses Esc in the title field THEN the system SHALL restore the saved title, clear the error and keep the detail open.  <!-- FCD-20 -->

**Independent Test**: Rename "Write launch post" to "Write launch blog post" + Enter → the board tile shows the new title after closing; clear it + Enter → "Dê um título à tarefa"; tick "Concluída" → badge shows and the tile is done.

---

### P1: Set the due date and edit the description ⭐ MVP

**User Story**: As a logged-in user, I want to set a due date and write a description so that the task has a deadline and enough context.

**Why P1**: Due date and description are the remaining fields of a card in the API.

**Acceptance Criteria**:

1. WHEN the user picks a date in the due date field THEN the system SHALL send `PATCH /api/v1/cards/{id}` with `dueDate` as `YYYY-MM-DD` and show it at once.  <!-- FCD-21 -->
2. WHILE the card has a due date the system SHALL show a "Remover prazo" button.  <!-- FCD-22 -->
3. WHEN the user activates "Remover prazo" THEN the system SHALL send `PATCH /api/v1/cards/{id}` with `dueDate: null` and clear the field at once.  <!-- FCD-23 -->
4. The system SHALL show the description counter as "{n} / 5000", where n is the number of characters in the draft.  <!-- FCD-24 -->
5. WHILE the description draft differs from the saved description the system SHALL show **Salvar** and **Cancelar** below the field.  <!-- FCD-25 -->
6. WHEN the user activates **Salvar** with a draft of at most 5000 characters THEN the system SHALL send `PATCH /api/v1/cards/{id}` with the draft as `description` (`null` when the draft is empty) and hide **Salvar** and **Cancelar**.  <!-- FCD-26 -->
7. IF the description draft is longer than 5000 characters THEN the system SHALL show "Use até 5000 caracteres" and disable **Salvar**.  <!-- FCD-27 -->
8. WHEN the user activates **Cancelar** THEN the system SHALL restore the saved description and hide **Salvar** and **Cancelar**.  <!-- FCD-28 -->
9. The system SHALL show the labels applied to the card as label chips in board label order, with no control to change them.  <!-- FCD-29 -->
10. The system SHALL show "Criada em {date}" in the footer, with the card's `createdAt` in the doc §14 date format of the current language.  <!-- FCD-30 -->

**Independent Test**: Pick tomorrow → the tile shows the due line; "Remover prazo" → it is gone; type in the description → counter and Salvar/Cancelar show; Salvar → reopening the card shows the text.

---

### P1: Move and archive from the detail ⭐ MVP

**User Story**: As a logged-in user, I want to move a card to another column or archive it from its detail so that I can act on it while I read it.

**Why P1**: Doc §7 puts these actions in the detail footer; archiving a card exists nowhere else.

**Acceptance Criteria**:

1. WHEN the user activates **Mover para…** in the footer THEN the system SHALL open the board's move dialog for this card over the detail.  <!-- FCD-31 -->
2. WHEN a move from the detail succeeds THEN the system SHALL keep the detail open and show the new column name in its header.  <!-- FCD-32 -->
3. WHEN the user activates **Arquivar** THEN the system SHALL send `POST /api/v1/cards/{id}/archive`, show the toast "Tarefa arquivada", keep the detail open and switch it to the archived read-only mode at once.  <!-- FCD-33 -->

**Independent Test**: From the detail, Mover para… "Done" → header reads "Done" and the tile moved; Arquivar → toast and the read-only notice; the tile is gone from its column.

---

### P1: Archived card: restore or delete ⭐ MVP

**User Story**: As a logged-in user, I want to restore an archived card or delete it for good so that archiving is not a dead end.

**Why P1**: Board spec defers restoring and deleting cards to this feature; without it archived cards pile up forever.

**Acceptance Criteria**:

1. WHILE the card is archived and its board is active the system SHALL show the notice "Tarefa arquivada · somente leitura", disable and dim the done checkbox, title, due date and description, and show **Restaurar** and **Excluir definitivamente** instead of **Mover para…** and **Arquivar**.  <!-- FCD-34 -->
2. WHEN the user activates **Restaurar** THEN the system SHALL send `POST /api/v1/cards/{id}/unarchive`, show the toast "Tarefa restaurada" and switch the detail to the editable mode at once.  <!-- FCD-35 -->
3. WHEN a restore succeeds THEN the system SHALL show the card at the end of its column on the board.  <!-- FCD-36 -->
4. WHEN the user activates **Excluir definitivamente** THEN the system SHALL open the dialog "Excluir a tarefa definitivamente?" with the text "Isso apaga a tarefa e o checklist. Não dá para desfazer." and the buttons **Cancelar** and **Excluir definitivamente**.  <!-- FCD-37 -->
5. WHEN the user confirms the delete THEN the system SHALL send `DELETE /api/v1/cards/{id}`, navigate to `/b/{boardId}` and show the toast "Tarefa excluída definitivamente".  <!-- FCD-38 -->
6. WHILE the card is archived and its column is archived the system SHALL show "A coluna de origem está arquivada. Restaure a coluna primeiro." at the top of the detail and disable **Restaurar** and **Excluir definitivamente**.  <!-- FCD-39 -->

**Independent Test**: Archive a card, open it from "Arquivadas" → read-only notice; Restaurar → editable and the tile is last in its column; archive again, Excluir definitivamente → confirm → back on the board with the toast.

---

### P1: Read-only card of an archived board ⭐ MVP

**User Story**: As a logged-in user, I want cards of an archived board to open read-only so that I can look at old work without changing it by mistake.

**Why P1**: The archived board is read-only (doc §5); its cards must follow.

**Acceptance Criteria**:

1. WHILE the card's board is archived the system SHALL show the notice "Quadro arquivado · somente leitura", disable every field and show no footer action, only the creation date.  <!-- FCD-40 -->
2. WHILE the card's board is archived and the card is archived the system SHALL show only the archived-board notice of FCD-40.  <!-- FCD-41 -->

**Independent Test**: Archive a board, open one of its cards → only the board notice, nothing editable, no footer buttons.

---

### P1: Unsaved edits ⭐ MVP

**User Story**: As a logged-in user, I want to be warned before closing the detail with unsaved text so that I don't lose what I typed.

**Why P1**: Doc §7 requires it; losing a long description is costly.

**Acceptance Criteria**:

1. WHEN the user tries to close the detail by any path of FCD-07 while the trimmed title draft differs from the saved title or the description draft differs from the saved description THEN the system SHALL open the dialog "Descartar alterações?" with the text "Você tem edições não salvas." and the buttons **Continuar editando** and **Descartar**.  <!-- FCD-42 -->
2. WHEN the user activates **Descartar** THEN the system SHALL close the detail to `/b/{boardId}` without sending the drafts.  <!-- FCD-43 -->
3. WHEN the user activates **Continuar editando** or presses Esc in that dialog THEN the system SHALL close the dialog and keep the detail open with the drafts unchanged.  <!-- FCD-44 -->
4. WHILE the detail is in a read-only mode (FCD-34, FCD-40) the system SHALL close without the discard dialog.  <!-- FCD-45 -->
5. WHEN the user presses Esc while the title field is focused THEN the system SHALL handle it as FCD-20 and not close the detail.  <!-- FCD-46 -->

**Independent Test**: Type in the description without saving, press Esc → the dialog; Continuar editando → the text is still there; Esc again → Descartar → board; reopen → old description.

---

## Edge Cases

- IF a save (done, title, due date, description, archive, restore, delete) fails with a network error or `5xx` THEN the system SHALL undo the change on screen and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**.  <!-- FCD-47 -->
- IF a save returns `409` THEN the system SHALL undo the change on screen and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**.  <!-- FCD-48 -->
- IF a save returns `404` THEN the system SHALL undo the change, show "Não foi possível salvar. Tente novamente." and refetch the card, so the detail shows "Esta tarefa não existe mais".  <!-- FCD-49 -->
- IF a title or description save fails THEN the system SHALL keep the user's text in the field as an unsaved draft.  <!-- FCD-50 -->
- IF restore or delete returns `409` because the column is archived THEN the system SHALL undo the change and show "A coluna de origem está arquivada. Restaure a coluna primeiro."  <!-- FCD-51 -->
- WHEN any save succeeds THEN the system SHALL show the same values on the board tile without a reload.  <!-- FCD-52 -->
- IF a description holds exactly 5000 characters THEN the system SHALL allow **Salvar**; IF a title holds exactly 100 characters after trimming THEN the system SHALL save it.  <!-- FCD-53 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Title 1–100 after trim (FCD-18, FCD-19, FCD-53); description ≤ 5000, not trimmed (FCD-27, FCD-53); due date is a date-only value (FCD-21) |
| Failure / partial-failure states | Optimistic saves undo on failure with the doc §10 toasts (FCD-47–FCD-49, FCD-51); typed text survives a failed save (FCD-50); load error and not found (FCD-10, FCD-11) |
| Idempotency / retry / duplicate handling | An unchanged title sends nothing (FCD-17); **Tentar novamente** repeats the failed request (FCD-47); a second save of the same field supersedes the first (FE-AD-009) |
| Auth boundaries & rate limits | A foreign or other-board card is not found (FCD-11); session expiry follows FE-AD-002 |
| Concurrency / ordering | Card archived or deleted on another device → `409`/`404` paths (FCD-48, FCD-49); overlapping saves roll back only their own change (FE-AD-010) |
| Data lifecycle / expiry | Archive → restore or delete for good (FCD-33–FCD-39); drafts live only while the detail is open (FCD-42–FCD-44) |
| Observability | N/A because the web client has no logging or metrics pipeline |
| External-dependency failure | API unreachable → load error (FCD-10) or save-fail toast (FCD-47) |
| State-transition integrity | Editable ↔ archived read-only (FCD-33, FCD-35); archived board wins over archived card (FCD-41); restore/delete blocked while the column is archived (FCD-39); read-only modes skip the discard dialog (FCD-45) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FCD-01 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-02 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-03 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-04 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-05 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-06 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-07 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-08 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-09 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-10 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-11 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-12 | P1: Open and close the card detail | Verify | ✅ Verified |
| FCD-13 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-14 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-15 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-16 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-17 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-18 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-19 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-20 | P1: Edit the title and the done flag | Verify | ✅ Verified |
| FCD-21 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-22 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-23 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-24 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-25 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-26 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-27 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-28 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-29 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-30 | P1: Set the due date and edit the description | Verify | ✅ Verified |
| FCD-31 | P1: Move and archive from the detail | Verify | ✅ Verified |
| FCD-32 | P1: Move and archive from the detail | Verify | ✅ Verified |
| FCD-33 | P1: Move and archive from the detail | Verify | ✅ Verified |
| FCD-34 | P1: Archived card: restore or delete | Verify | ✅ Verified |
| FCD-35 | P1: Archived card: restore or delete | Verify | ✅ Verified |
| FCD-36 | P1: Archived card: restore or delete | Verify | ✅ Verified |
| FCD-37 | P1: Archived card: restore or delete | Verify | ✅ Verified |
| FCD-38 | P1: Archived card: restore or delete | Verify | ✅ Verified |
| FCD-39 | P1: Archived card: restore or delete | Verify | ✅ Verified |
| FCD-40 | P1: Read-only card of an archived board | Verify | ✅ Verified |
| FCD-41 | P1: Read-only card of an archived board | Verify | ✅ Verified |
| FCD-42 | P1: Unsaved edits | Verify | ✅ Verified |
| FCD-43 | P1: Unsaved edits | Verify | ✅ Verified |
| FCD-44 | P1: Unsaved edits | Verify | ✅ Verified |
| FCD-45 | P1: Unsaved edits | Verify | ✅ Verified |
| FCD-46 | P1: Unsaved edits | Verify | ✅ Verified |
| FCD-47 | Edge cases | Verify | ✅ Verified |
| FCD-48 | Edge cases | Verify | ✅ Verified |
| FCD-49 | Edge cases | Verify | ✅ Verified |
| FCD-50 | Edge cases | Verify | ✅ Verified |
| FCD-51 | Edge cases | Verify | ✅ Verified |
| FCD-52 | Edge cases | Verify | ✅ Verified |
| FCD-53 | Edge cases | Verify | ✅ Verified |

**Coverage:** 53 total, 0 mapped to tasks, 53 unmapped ⚠️ (mapped at Tasks)

---

## Success Criteria

- [ ] Every FCD requirement has a passing unit or e2e test.
- [ ] Opening, editing, archiving, restoring and deleting a card from the seed board works end to end in Playwright against the real API.
- [ ] No typed text is lost on close or on a failed save.
