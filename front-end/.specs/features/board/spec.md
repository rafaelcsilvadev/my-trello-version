# Board Specification

## Problem Statement

Opening a board from "Meus quadros" lands on `/b/{id}`, which is still the foundation placeholder: the user cannot see or organize the columns and cards of a board. Feature `board` (3a) turns that route into the board screen of the prototype (doc §6): the header, the columns side by side, creating and renaming columns, archiving, restoring and deleting columns, creating cards, marking cards done, the "Mostrar arquivadas" view, the read-only mode of an archived board (doc §5) and the phone layout (doc §3, §6 "Celular"). Dragging (3b `board-dnd`) and search/filters (3c `board-filters`) build on this screen; card detail (4) opens from it.

## Goals

- [ ] A user opens "Product launch" from the seed and sees its columns in API order, each with its active cards, labels, due-date line and checklist progress, within one screen load.
- [ ] A user creates, renames and archives a column, creates a card and marks it done without reloading the page; every failed change is undone on screen with a toast.
- [ ] With "Mostrar arquivadas" on, the user sees the archived cards and the archived columns, restores a column and permanently deletes an archived one.
- [ ] An archived board opens read-only with the banner "Quadro arquivado · somente leitura" and a working **Restaurar**.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Dragging cards and columns with mouse or keyboard, the keyboard help line below the board, the live region, "Mover para…" in the card menu | Feature `board-dnd` (3b) |
| Search, label filter, due-date filter, "Limpar filtros", the result count and the `/` shortcut | Feature `board-filters` (3c) |
| Opening a card (click or Enter on a card), the detail modal, archiving, restoring or deleting a card | Feature `card-detail` (4); in this feature a card is not a link |
| Editing labels and the labels page content | Feature `labels` (5); this feature only shows labels and links to `/b/{id}/labels` |
| Shortcuts dialog (`?`) and the shortcuts icon in the top bar | Feature `settings` (6) |
| Deleting an active column, column colors, "Desfazer" on toasts | Doc §1 and §12 |
| The card menu (…) | Its only item, "Mover para…", belongs to `board-dnd` (3b); this feature renders no card menu |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Split of roadmap feature 3 | `board` (3a, this spec) → `board-dnd` (3b) → `board-filters` (3c), one spec, task list and validation each | User choice; the full doc §6 scope is about three times `boards` | y |
| Shortcut `n` | Belongs to this feature; `/` belongs to `board-filters` | User choice; each shortcut ships with the control it opens | y |
| Phone layout | Belongs to this feature: one column per screen with snap and a peek of the next, page dots and "Doing · 2 de 3", back arrow to `/boards` | User choice; `boards` is already responsive | y |
| Requests | The screen loads `GET /api/v1/boards/{id}`, `GET /api/v1/boards/{id}/lists`, `GET /api/v1/boards/{id}/cards` and `GET /api/v1/boards/{id}/labels`; cards are grouped by `listId` and ordered by `position` | API contract; the board-wide cards endpoint returns active cards of active lists in board order | y |
| Archived data | Loaded only while "Mostrar arquivadas" is on: `GET /api/v1/boards/{id}/cards?archived=true` and `GET /api/v1/boards/{id}/lists?archived=true` | Keeps the default load to four requests | y |
| Card count of an archived column | Active cards of that column (`GET /api/v1/lists/{listId}/cards`) plus its archived cards from the board-wide archived list | Doc §6: "3 tarefas" counts active and archived; the board-wide active list hides cards of archived columns | y |
| Create column / create card | Not optimistic (FE-AD-009): the field keeps its text and its submit is disabled while the request is in flight; on `201` the item appears at the end, the field clears and stays open, and the toast shows | FE-AD-009: create waits for the server id; doc §6 keeps the field open for the next item | y |
| Rename column, archive, restore, delete, mark done | Optimistic (FE-AD-009); failures follow doc §10 | FE-AD-009 | y |
| Inline column rename | Enter or blur saves; Esc restores the old name; a name unchanged after trim sends no request | Doc §6; avoids empty writes | y |
| Blur with an invalid name | The field stays open with the error message and nothing is sent | Saving an invalid name would fail on the server | y |
| Name/title trim | Column names and card titles are trimmed before validation and before sending | Same rule as `boards` (FBRD) and auth | y |
| Field mapping | Column "nome" is the API list `title`; card "título" is the card `title` | API contract (`CreateListDto`, `CreateCardDto`) | y |
| Toasts | "Coluna criada", "Coluna renomeada", "Coluna arquivada", "Coluna restaurada", "Coluna excluída definitivamente", "Tarefa criada"; marking a card done shows no toast | Doc §12 lists no toast for the done flag | y |
| "Today" | The local calendar date of the browser | Same rule as the date formats in `boards` | y |
| Card due-date text | "Hoje", "Amanhã", "Ontem", else "12 out" (PT-BR) / "Oct 12" (EN), with the year when it differs from the current year ("12 out, 2027") | Doc §14 | y |
| Overdue | A card is overdue when it is not done and its due date is before today | Doc §2 | y |
| Archived board | Detected by `archivedAt` of `GET /api/v1/boards/{id}`; columns and cards show, every write control is hidden, the checkbox is disabled, `n` does nothing; **Restaurar** calls `POST /api/v1/boards/{id}/unarchive` | Doc §5 "Quadro arquivado aberto" | y |
| "Mostrar arquivadas" state | Off every time the board opens; not stored in the URL | Doc §6: toggles reset when the board opens | y |
| Checkbox on archived cards | Shown disabled (prototype `Task List.dc.html:467`) | User choice; keeps the done state visible | y |
| Archived columns section and virtual column | Shown after the active columns, virtual "Arquivadas" first, then the archived columns section | Doc §6 | y |
| Board menu (…) | One item, "Etiquetas do quadro", a link to `/b/{id}/labels` | Doc §6; the labels page itself is feature 5 | y |
| Breadcrumb | Desktop top bar shows "Meus quadros › {board title}"; "Meus quadros" links to `/boards` | Doc §3; `boards` left the breadcrumb to this feature | y |
| `409` on a write | Undo the change and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches every board query | Doc §10, FE-AD-009 | y |
| `404` on a write | Undo the change, show "Não foi possível salvar. Tente novamente." without a button and refetch every board query | FE-AD-009 | y |
| Network or `5xx` on a write | Undo the change and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which sends the same request again | Doc §10, FE-AD-009 | y |
| `400` with `errors[]` on create or rename | The `title` entry shows the field message of FBV-15/FBV-16 or FBV-26/FBV-27 under the still-open (or reopened) field; no toast | Same pattern as FBRD-41 | y |
| Board not found | `404` on `GET /api/v1/boards/{id}` (missing, foreign or malformed id) shows the not-found state | Doc §6 "Estados do quadro"; the API answers `404` for all three | y |
| `401` | Handled by the foundation session-expiry flow (FND-16) | Already shipped | y |
| Texts | All labels, placeholders, errors, toasts and states come from i18n keys with the PT-BR and EN texts of `design/i18n.js` | Foundation i18n rule | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: View a board ⭐ MVP

**User Story**: As a logged-in user, I want to open a board and see its columns and cards so that I know where every task stands.

**Why P1**: Every other board action happens on this screen.

**Acceptance Criteria**:

1. WHEN the user opens `/b/{id}` THEN the system SHALL show the board title, the description when it is not null, and the board menu (…) whose only item "Etiquetas do quadro" links to `/b/{id}/labels`.  <!-- FBV-01 -->
2. WHEN the board loads THEN the system SHALL show its active columns side by side in ascending `position`, with horizontal scroll when they do not fit.  <!-- FBV-02 -->
3. WHEN the board loads THEN the system SHALL show in each column its active cards in ascending `position` and, in the column header, the number of those cards.  <!-- FBV-03 -->
4. WHEN a card has labels THEN the system SHALL show one chip per label with the label name and its color token `bg-label-{color}`.  <!-- FBV-04 -->
5. WHEN a card has a due date THEN the system SHALL show it as "Hoje", "Amanhã", "Ontem" or the short date ("12 out" / "Oct 12", with ", 2027" when the year is not the current year).  <!-- FBV-05 -->
6. WHEN a card is not done and its due date is before today THEN the system SHALL show the due date in the danger color and the badge "Atrasada".  <!-- FBV-06 -->
7. WHEN a card has checklist items THEN the system SHALL show "done/total" (e.g. "2/3"), in the success color when done equals total.  <!-- FBV-07 -->
8. WHEN a card is done THEN the system SHALL show its title muted and struck through, its due date in the success color and no "Atrasada" badge.  <!-- FBV-08 -->
9. WHILE the board is loading the system SHALL show skeletons of the header, the columns and the cards.  <!-- FBV-09 -->
10. IF any of the board requests fails with a network error or a `5xx` THEN the system SHALL show "Não foi possível carregar" with **Tentar novamente**, which repeats the failed requests.  <!-- FBV-10 -->
11. IF `GET /api/v1/boards/{id}` answers `404` THEN the system SHALL show "Quadro não encontrado", "Ele pode ter sido excluído." and the link **Voltar para Meus quadros** to `/boards`.  <!-- FBV-11 -->
12. WHEN the board screen shows on desktop THEN the top bar SHALL show the breadcrumb "Meus quadros › {board title}", where "Meus quadros" links to `/boards`.  <!-- FBV-12 -->

**Independent Test**: With MSW serving the seed, `/b/{product-launch}` shows To do · Doing · Done with their cards in order; "Fix login on Safari" shows Bug and Urgent, "Ontem" in red and "Atrasada"; "Polish the board screen" shows "Hoje" and "2/3"; "Register and login" is struck through; a `404` board shows the not-found state.

---

### P1: Manage columns ⭐ MVP

**User Story**: As a logged-in user, I want to add, rename and archive columns so that the board matches my workflow.

**Why P1**: A new board starts without columns (doc §2); without this the board cannot hold cards.

**Acceptance Criteria**:

1. WHEN the board has no active columns THEN the system SHALL show "Adicione a primeira coluna" with the column name field open.  <!-- FBV-13 -->
2. WHEN the user presses Enter in the "+ Adicionar coluna" field with a valid name THEN the system SHALL send `POST /api/v1/boards/{id}/lists` with the trimmed `title`, and on `201` show the column at the end, show the toast "Coluna criada", clear the field and keep it open.  <!-- FBV-14 -->
3. IF the column name is empty after trim THEN the system SHALL show "Dê um nome à coluna" and send nothing.  <!-- FBV-15 -->
4. IF the column name is longer than 100 characters after trim THEN the system SHALL show "Use até 100 caracteres" and send nothing.  <!-- FBV-16 -->
5. WHILE a column create is in flight the system SHALL keep the field text and disable its submit.  <!-- FBV-17 -->
6. WHEN the user clicks the column name or picks **Renomear** in the column menu THEN the system SHALL turn the name into a field with the current name.  <!-- FBV-18 -->
7. WHEN the user presses Enter or leaves the rename field with a valid name that differs from the current one after trim THEN the system SHALL show the new name at once, send `PATCH /api/v1/lists/{id}` with the trimmed `title` and on success show the toast "Coluna renomeada".  <!-- FBV-19 -->
8. WHEN the user presses Esc in the rename field THEN the system SHALL close the field, keep the old name and send nothing.  <!-- FBV-20 -->
9. IF the user presses Enter or leaves the rename field with an invalid name THEN the system SHALL keep the field open with the message of FBV-15 or FBV-16 and send nothing.  <!-- FBV-21 -->
10. WHEN the user picks **Arquivar** in the column menu THEN the system SHALL remove the column from the board at once, send `POST /api/v1/lists/{id}/archive` and on success show the toast "Coluna arquivada".  <!-- FBV-22 -->
11. The column menu SHALL offer exactly **Renomear** and **Arquivar**.  <!-- FBV-23 -->

**Independent Test**: On an empty board, typing "To do" + Enter creates the column, shows "Coluna criada" and keeps the field open; renaming it to "Backlog" + Enter shows "Coluna renomeada"; Esc keeps the old name; **Arquivar** removes it and shows "Coluna arquivada".

---

### P1: Create cards and mark them done ⭐ MVP

**User Story**: As a logged-in user, I want to add cards to a column and tick them done so that I capture and close tasks without leaving the board.

**Why P1**: Cards are the content of the board.

**Acceptance Criteria**:

1. WHEN the user clicks "+ Adicionar tarefa" in a column footer THEN the system SHALL open the card title field in that column.  <!-- FBV-24 -->
2. WHEN the user presses Enter in the card title field with a valid title THEN the system SHALL send `POST /api/v1/lists/{listId}/cards` with the trimmed `title`, and on `201` show the card at the end of the column, show the toast "Tarefa criada", clear the field and keep it open.  <!-- FBV-25 -->
3. IF the card title is empty after trim THEN the system SHALL show "Dê um título à tarefa" and send nothing.  <!-- FBV-26 -->
4. IF the card title is longer than 100 characters after trim THEN the system SHALL show "Use até 100 caracteres" and send nothing.  <!-- FBV-27 -->
5. WHEN the user presses Esc in the card title field THEN the system SHALL close the field and send nothing.  <!-- FBV-28 -->
6. WHILE a card create is in flight the system SHALL keep the field text and disable its submit.  <!-- FBV-29 -->
7. WHEN the user presses `n` while focus is not in a text field, no dialog is open and the board has at least one active column THEN the system SHALL open the card title field in the first column and focus it.  <!-- FBV-30 -->
8. WHEN the user toggles the checkbox labelled "Concluída" on a card THEN the system SHALL show the new done state at once and send `PATCH /api/v1/cards/{id}` with `done` set to the new value.  <!-- FBV-31 -->
9. WHEN a column has no active cards THEN the system SHALL show "Arraste cards para cá" in the column body.  <!-- FBV-32 -->

**Independent Test**: In "To do", "+ Adicionar tarefa", "Write tests" + Enter adds the card at the end with "Tarefa criada" and the field stays open; Esc closes it; `n` opens the field in "To do"; ticking "Write release notes" strikes it through and the request body is `{ "done": true }`.

---

### P1: See and manage archived items ⭐ MVP

**User Story**: As a logged-in user, I want to see archived cards and columns, restore a column or delete it for good so that archiving is never a dead end.

**Why P1**: Archiving a column (FBV-22) is only safe if it can be undone.

**Acceptance Criteria**:

1. The board toolbar SHALL show the switch **Mostrar arquivadas**, off whenever the board opens.  <!-- FBV-33 -->
2. WHILE **Mostrar arquivadas** is on the system SHALL show, after the active columns, the virtual column "Arquivadas" with a dashed border, a transparent background, an archive icon, no menu and no create field.  <!-- FBV-34 -->
3. WHILE **Mostrar arquivadas** is on the virtual column SHALL list the archived cards of the board, including those of archived columns, newest `archivedAt` first, each with "Arquivada em 2 out, 2026 · de: {column title}".  <!-- FBV-35 -->
4. WHILE **Mostrar arquivadas** is on and the board has no archived cards the virtual column SHALL show "Nenhuma tarefa arquivada".  <!-- FBV-36 -->
5. WHILE **Mostrar arquivadas** is on the system SHALL show, after the virtual column, the dashed section of archived columns, newest `archivedAt` first, each with "Arquivada em 2 out, 2026 · 3 tarefas", where the number counts its active and archived cards.  <!-- FBV-37 -->
6. WHILE **Mostrar arquivadas** is on and the board has no archived columns the section SHALL show "Nenhuma coluna arquivada".  <!-- FBV-38 -->
7. WHEN the user picks **Restaurar** on an archived column THEN the system SHALL move it at once to the end of the active columns, send `POST /api/v1/lists/{id}/unarchive` and on success show the toast "Coluna restaurada".  <!-- FBV-39 -->
8. WHEN the user picks **Excluir definitivamente** on an archived column THEN the system SHALL open a confirmation dialog reading "Isso apaga a coluna e as {n} tarefas dela, ativas e arquivadas. Não dá para desfazer." with n ≥ 2, "…e a 1 tarefa dela…" with n = 1, and "Isso apaga a coluna, que não tem tarefas…" with n = 0.  <!-- FBV-40 -->
9. WHEN the user confirms the deletion THEN the system SHALL remove the column from the section at once, send `DELETE /api/v1/lists/{id}` and on success show the toast "Coluna excluída definitivamente".  <!-- FBV-41 -->
10. WHEN the user cancels the deletion dialog or presses Esc THEN the system SHALL close it and send nothing.  <!-- FBV-42 -->
11. The cards of the virtual column SHALL be read-only: a disabled "Concluída" checkbox showing the done state, no menu and no link.  <!-- FBV-43 -->

**Independent Test**: On "Product launch", turning **Mostrar arquivadas** on shows "Translate the onboarding emails" with "de: To do" and "Nenhuma coluna arquivada"; after archiving "Done", it shows "· 2 tarefas", **Restaurar** puts it back last; on another archived column the dialog cites the exact count and confirming removes it.

---

### P1: Archived board is read-only ⭐ MVP

**User Story**: As a logged-in user, I want an archived board to open read-only with a way to restore it so that I can look at old work without changing it by mistake.

**Why P1**: Archived boards open from the Arquivados tab of `boards`; the API answers `409` to every write on them.

**Acceptance Criteria**:

1. WHILE the board is archived the system SHALL show the banner "Quadro arquivado · somente leitura" with the button **Restaurar**.  <!-- FBV-44 -->
2. WHILE the board is archived the system SHALL hide "+ Adicionar coluna", "+ Adicionar tarefa" and the column menus, disable the card checkboxes, and keep column names not editable.  <!-- FBV-45 -->
3. WHILE the board is archived pressing `n` SHALL do nothing.  <!-- FBV-46 -->
4. WHEN the user clicks **Restaurar** in the banner THEN the system SHALL send `POST /api/v1/boards/{id}/unarchive`, and on success hide the banner, enable every write control and show the toast "Quadro restaurado".  <!-- FBV-47 -->

**Independent Test**: "Old side project" opens with the banner, shows "Ideas" and "Rewrite it in a weekend", has no add controls and a disabled checkbox; **Restaurar** removes the banner and shows "+ Adicionar coluna".

---

### P1: Phone layout ⭐ MVP

**User Story**: As a user on a phone, I want one column per screen with clear paging so that the board is usable at 360–390 px.

**Why P1**: Doc §3 defines the phone stack Meus quadros → Quadro.

**Acceptance Criteria**:

1. WHILE the viewport is narrower than the `md` breakpoint the system SHALL show one column per screen with horizontal scroll snapping to each column and a visible edge of the next column.  <!-- FBV-48 -->
2. WHILE the viewport is narrower than the `md` breakpoint the system SHALL show one dot per active column and the text "{column title} · {i} de {n}" for the column in view.  <!-- FBV-49 -->
3. WHEN the user taps a dot THEN the system SHALL scroll to that column.  <!-- FBV-50 -->
4. WHILE the viewport is narrower than the `md` breakpoint the header SHALL show a back arrow labelled "Voltar" linking to `/boards` and the board menu (…) at the top right.  <!-- FBV-51 -->

**Independent Test**: At 375 px, "Product launch" shows "To do · 1 de 3"; tapping the third dot shows "Done · 3 de 3"; the back arrow goes to `/boards`.

---

### P1: Save failures ⭐ MVP

**User Story**: As a logged-in user, I want a failed change to be undone and explained so that the board never shows something the server did not save.

**Why P1**: Rename, archive, restore, delete and done are optimistic (FE-AD-009).

**Acceptance Criteria**:

1. IF a rename, archive, restore, delete or done change fails THEN the system SHALL put the board back to the state it had before the change.  <!-- FBV-52 -->
2. IF a write fails with a network error or a `5xx` THEN the system SHALL show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which sends the same request again.  <!-- FBV-53 -->
3. IF a write answers `409` THEN the system SHALL show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches every query of the board.  <!-- FBV-54 -->
4. IF a write answers `404` THEN the system SHALL show "Não foi possível salvar. Tente novamente." without a button and refetch every query of the board.  <!-- FBV-55 -->
5. IF a create fails with a network error, a `5xx`, a `404` or a `409` THEN the system SHALL keep the field open with the typed text, enable its submit again and show the toast of FBV-53, FBV-54 or FBV-55 for that status.  <!-- FBV-56 -->
6. IF a create or rename answers `400` with an `errors[]` entry whose `field` is `title` THEN the system SHALL show under the field "Dê um nome à coluna" / "Dê um título à tarefa" when the trimmed text is empty, else "Use até 100 caracteres", with the submitted text, and no toast.  <!-- FBV-57 -->
7. WHILE a change to a column or card is in flight the system SHALL keep that item's menu (…) and checkbox disabled.  <!-- FBV-58 -->

**Independent Test**: With MSW answering `500` to archive, archiving "Doing" removes it, then puts it back with **Tentar novamente**; a `409` on done unticks the card and shows **Recarregar**; a `404` on rename restores the old name and refetches.

---

## Edge Cases

- IF the user types only spaces in a column or card field THEN the system SHALL treat it as empty (FBV-15, FBV-26).
- WHEN the user archives the last active column THEN the system SHALL show "Adicione a primeira coluna" (FBV-13).
- WHEN the user restores a column while **Mostrar arquivadas** is on THEN the column leaves the archived section and its active cards show in it again after the refetch (FBV-39).
- WHEN a card's due date is today and the card is not done THEN the system SHALL show "Hoje" with no "Atrasada" badge (FBV-05, FBV-06).
- WHEN a card has a due date before today and is done THEN the system SHALL show the date in the success color with no "Atrasada" badge (FBV-08).
- WHEN a column has no active cards but has archived ones THEN its header counter SHALL read 0 (FBV-03).
- IF `n` is pressed inside a text field THEN the key SHALL type the letter (FBV-30).
- IF a `401` arrives on any board request THEN the foundation session-expiry flow runs (FND-16) and no board toast shows.

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | FBV-15, FBV-16, FBV-21, FBV-26, FBV-27, FBV-57; names and titles 1–100 after trim |
| Failure / partial-failure states | FBV-10, FBV-11, FBV-52–FBV-57 |
| Idempotency / retry / duplicate handling | Retry resends the same request (FBV-10, FBV-53); archive and unarchive are idempotent in the API; FBV-17, FBV-29 and FBV-58 block double submits; an unchanged rename sends nothing (FBV-19) |
| Auth boundaries & rate limits | Every request carries the token; `401` goes through FND-16; the API scopes boards, lists and cards to the caller and answers `404` for foreign ids (FBV-11). No rate limit on these endpoints |
| Concurrency / ordering | Changes from another device surface as `409`/`404` (FBV-54, FBV-55); one change per item at a time (FBV-58); reordering is feature 3b |
| Data lifecycle / expiry | Column: active → archived → deleted, delete only when archived (FBV-22, FBV-39–FBV-41); cards keep their state when their column is archived (FBV-35, FBV-37) |
| Observability | N/A because the web client has no logging or metrics pipeline; failures are shown to the user |
| External-dependency failure | The API is the only dependency: FBV-10, FBV-53, FBV-56 |
| State-transition integrity | Archived board blocks writes (FBV-44–FBV-46); column menu items fixed (FBV-23); virtual column read-only (FBV-43) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FBV-01 | P1: View a board | - | Verified |
| FBV-02 | P1: View a board | - | Verified |
| FBV-03 | P1: View a board | - | Verified |
| FBV-04 | P1: View a board | - | Verified |
| FBV-05 | P1: View a board | - | Verified |
| FBV-06 | P1: View a board | - | Verified |
| FBV-07 | P1: View a board | - | Verified |
| FBV-08 | P1: View a board | - | Verified |
| FBV-09 | P1: View a board | - | Verified |
| FBV-10 | P1: View a board | - | Verified |
| FBV-11 | P1: View a board | - | Verified |
| FBV-12 | P1: View a board | - | Verified |
| FBV-13 | P1: Manage columns | - | Verified |
| FBV-14 | P1: Manage columns | - | Verified |
| FBV-15 | P1: Manage columns | - | Verified |
| FBV-16 | P1: Manage columns | - | Verified |
| FBV-17 | P1: Manage columns | - | Verified |
| FBV-18 | P1: Manage columns | - | Verified |
| FBV-19 | P1: Manage columns | - | Needs Fix |
| FBV-20 | P1: Manage columns | - | Verified |
| FBV-21 | P1: Manage columns | - | Verified |
| FBV-22 | P1: Manage columns | - | Verified |
| FBV-23 | P1: Manage columns | - | Verified |
| FBV-24 | P1: Create cards and mark them done | - | Verified |
| FBV-25 | P1: Create cards and mark them done | - | Verified |
| FBV-26 | P1: Create cards and mark them done | - | Verified |
| FBV-27 | P1: Create cards and mark them done | - | Verified |
| FBV-28 | P1: Create cards and mark them done | - | Verified |
| FBV-29 | P1: Create cards and mark them done | - | Verified |
| FBV-30 | P1: Create cards and mark them done | - | Verified |
| FBV-31 | P1: Create cards and mark them done | - | Needs Fix |
| FBV-32 | P1: Create cards and mark them done | - | Verified |
| FBV-33 | P1: See and manage archived items | - | Verified |
| FBV-34 | P1: See and manage archived items | - | Needs Fix |
| FBV-35 | P1: See and manage archived items | - | Verified |
| FBV-36 | P1: See and manage archived items | - | Verified |
| FBV-37 | P1: See and manage archived items | - | Verified |
| FBV-38 | P1: See and manage archived items | - | Verified |
| FBV-39 | P1: See and manage archived items | - | Verified |
| FBV-40 | P1: See and manage archived items | - | Verified |
| FBV-41 | P1: See and manage archived items | - | Verified |
| FBV-42 | P1: See and manage archived items | - | Verified |
| FBV-43 | P1: See and manage archived items | - | Verified |
| FBV-44 | P1: Archived board is read-only | - | Verified |
| FBV-45 | P1: Archived board is read-only | - | Verified |
| FBV-46 | P1: Archived board is read-only | - | Verified |
| FBV-47 | P1: Archived board is read-only | - | Verified |
| FBV-48 | P1: Phone layout | - | Needs Fix |
| FBV-49 | P1: Phone layout | - | Verified |
| FBV-50 | P1: Phone layout | - | Verified |
| FBV-51 | P1: Phone layout | - | Verified |
| FBV-52 | P1: Save failures | - | Verified |
| FBV-53 | P1: Save failures | - | Verified |
| FBV-54 | P1: Save failures | - | Needs Fix |
| FBV-55 | P1: Save failures | - | Needs Fix |
| FBV-56 | P1: Save failures | - | Verified |
| FBV-57 | P1: Save failures | - | Verified |
| FBV-58 | P1: Save failures | - | Needs Fix |

**Coverage:** 58 total, all mapped to tasks (`tasks.md`). Validation iteration 1: 51 Verified, 7 Needs Fix (FBV-19, FBV-31, FBV-34, FBV-48, FBV-54, FBV-55, FBV-58; see `validation.md`).

---

## Success Criteria

- [ ] Every seed board ("Product launch", "Personal", "Old side project") renders as described in doc §15 against the real API in Docker.
- [ ] A user creates a column, creates two cards in it, marks one done, archives the column and restores it, with zero page reloads.
- [ ] Every write path has a test for its failure toast and rollback (FBV-52–FBV-57).
