# Boards Specification

## Problem Statement

After logging in, the user lands on `/boards`, which is still the foundation placeholder: there is no way to see, create or manage boards from the web client. Feature `boards` turns that route into the "Meus quadros" screen from the prototype (doc §5): active and archived tabs, a grid of board cards, and the create, edit, archive, restore and permanent-delete flows, with the save and failure behavior of doc §10 and the toasts of doc §12. Feature 3 (`board`) needs a board to open.

## Goals

- [ ] A logged-in user can create a board at `/boards` and lands on `/b/{id}` with the toast "Quadro criado".
- [ ] A user can edit, archive, restore and permanently delete a board from the card menu without reloading the page, and every failed change is undone on screen with a toast.
- [ ] The Ativos and Arquivados tabs show the API lists (`GET /api/v1/boards` and `?archived=true`), newest first, with loading, empty and error states.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Board view at `/b/{id}` (columns, cards, read-only banner of an archived board, "Restaurar" in that banner) | Feature `board` (3); this feature only navigates there |
| Breadcrumb "Meus quadros › Quadro › Etiquetas" and the shortcuts icon in the top bar | Breadcrumb grows with features `board`/`labels`; shortcuts belong to feature `settings` (6) |
| Keyboard shortcuts on this screen | Doc §11 lists none for Meus quadros |
| Board color, reordering boards, search or filter on boards | Doc §1 out of scope |
| Deleting an active board | Doc §1 out of scope; the API answers `409` (BRD-20) |
| "Desfazer" on toasts | Doc §1 and §12 |
| Pagination | The API returns the whole list (no pagination) |
| Mobile back arrow / screen stack | `/boards` is the root of the stack; the arrow appears from the board screen on (feature 3) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Create flow | Not optimistic: the modal shows "Criando…" while `POST /api/v1/boards` is in flight; on `201` the modal closes, the toast "Quadro criado" shows and the app navigates to `/b/{id}` | User choice; navigating needs the server id, so a pending card would never be seen | y |
| Edit, archive, restore, delete | Optimistic (doc §10): the grid changes at once, and a failure undoes the change and shows a toast | User choice; matches doc §10 | y |
| Selected tab | Lives in the URL: `/boards` is Ativos, `/boards?archived=true` is Arquivados; switching tabs replaces the query string | User choice; survives reload and Back, mirrors the API query | y |
| Unknown `archived` value in the URL | Any value other than `true` shows the Ativos tab | Never shows an error for a hand-typed URL | y |
| Name field mapping | The UI field "Nome" is the API `title`; "Descrição" is `description` | API contract (`CreateBoardDto`) uses `title` | y |
| Empty description | A description that is empty after trim is sent as `null` on edit and omitted on create, and the card shows no description line | API accepts `null` to clear (BRD-12) | y |
| Trim | Name and description are trimmed before validation and before sending | Same rule as auth (FAUTH-06); the API trims too | y |
| Character counter | "n / 1000" counts the description as typed (before trim) | Prototype counter reads the raw field | y |
| Date shown on the card | `createdAt` (Ativos) or `archivedAt` (Arquivados) as a local calendar date: PT-BR "10 out, 2026", EN "Oct 10, 2026", using the month names of `design/i18n.js` | Prototype format; local date matches what the user saw when acting | y |
| Order after a change | The grid keeps the API order (`createdAt` desc); a restored board shows in Ativos at its `createdAt` position, not at the top | Doc §5: "como a API entrega" | y |
| `409` on edit, archive, restore or delete | Undo the change, show the toast "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches both board lists | Doc §10 conflict rule; edit of an archived board answers `409 /problems/board-archived`, delete of an active one `409 /problems/board-not-archived` | y |
| `404` on edit, archive, restore or delete | Undo the change, show the toast "Não foi possível salvar. Tente novamente." and refetch both lists, so the board deleted elsewhere disappears; no **Tentar novamente** button | Retrying a missing board would fail again | y |
| Other failures (network, `5xx`) on edit, archive, restore or delete | Undo the change and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which sends the same request again | Doc §10 | y |
| Failure on create | The modal stays open with the typed values, the button is enabled again, and the toast "Não foi possível salvar. Tente novamente." shows with **Tentar novamente**, which resubmits the same values | Create is not optimistic, so there is nothing to undo; the user keeps the form | y |
| `400` with `errors[]` on create or edit | Each `errors[].field` (`title`, `description`) shows that field's message from FBRD-12–FBRD-14 in the modal; no toast; the edit is undone on the grid | Server rules match the client rules, so this only fires if they drift; same pattern as FAUTH-10 | y |
| Delete confirmation match | The typed name must equal the board title exactly (case and spaces included, no trim) | Doc §5: "o nome digitado é exato" | y |
| Board cards | The whole card is a link to `/b/{id}` in both tabs; the menu button (…) is a separate control and does not navigate | Prototype opens the board on card click; archived boards open read-only (feature 3) | y |
| `401` on any request | Handled by the foundation session-expiry flow (FND-16) | Already shipped | y |
| Texts | All labels, placeholders, errors, toasts and empty/error states come from i18n keys with the PT-BR and EN texts of `design/i18n.js` | Foundation i18n rule | y |
| Layout | Responsive grid: one column at 360–390 px, more columns as the width grows; the same actions on every width | Doc §3 mobile stack starts at Meus quadros | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Browse boards ⭐ MVP

**User Story**: As a logged-in user, I want to see my active and archived boards so that I can pick the one I want to work on.

**Why P1**: It is the landing screen after log in; nothing else in the app is reachable without it.

**Acceptance Criteria**:

1. WHEN a user opens `/boards` THEN the system SHALL show the heading "Meus quadros", the tabs "Ativos" and "Arquivados" with Ativos selected, and request `GET /api/v1/boards`.  <!-- FBRD-01 -->
2. WHEN a user opens `/boards?archived=true` THEN the system SHALL select the Arquivados tab and request `GET /api/v1/boards?archived=true`.  <!-- FBRD-02 -->
3. WHEN the user selects a tab THEN the system SHALL change the URL to `/boards` (Ativos) or `/boards?archived=true` (Arquivados) and show that tab's list.  <!-- FBRD-03 -->
4. WHEN the list loads THEN the system SHALL show one card per board in the API order, each with the title, the description clamped to 2 lines when it is not empty, and the date line.  <!-- FBRD-04 -->
5. The system SHALL show the date line as "Criado em {d}" with `createdAt` on Ativos cards and "Arquivado em {d}" with `archivedAt` on Arquivados cards, where `{d}` is the local date formatted as "10 out, 2026" (PT-BR) or "Oct 10, 2026" (EN).  <!-- FBRD-05 -->
6. WHEN the user activates a board card THEN the system SHALL navigate to `/b/{id}`.  <!-- FBRD-06 -->
7. WHILE a tab's list is loading the system SHALL show a skeleton of cards.  <!-- FBRD-07 -->
8. WHEN the Ativos list is empty THEN the system SHALL show "Crie seu primeiro quadro", the text "Um quadro reúne as colunas e tarefas de um projeto ou de uma área da sua vida." and a "Criar quadro" button.  <!-- FBRD-08 -->
9. WHEN the Arquivados list is empty THEN the system SHALL show "Nenhum quadro arquivado".  <!-- FBRD-09 -->
10. IF a tab's list request fails with anything other than `401` THEN the system SHALL show "Não foi possível carregar", "Verifique sua conexão e tente de novo." and a "Tentar novamente" button that requests the list again.  <!-- FBRD-10 -->

**Independent Test**: With MSW returning two active boards (one with description) and one archived board: `/boards` shows two cards in order with "Criado em …"; clicking Arquivados changes the URL to `?archived=true` and shows one card with "Arquivado em …"; an empty list shows the empty state; a `500` shows the error state and "Tentar novamente" refetches.

---

### P1: Create a board ⭐ MVP

**User Story**: As a logged-in user, I want to create a board with a name and an optional description so that I can start organizing a project.

**Why P1**: Without creating a board, the board view (feature 3) has nothing to show.

**Acceptance Criteria**:

1. WHILE the Ativos tab is selected the system SHALL show the "Criar quadro" button, and WHILE Arquivados is selected it SHALL NOT.  <!-- FBRD-11 -->
2. WHEN the user activates "Criar quadro" THEN the system SHALL open the modal "Novo quadro" with the fields Nome (placeholder "Ex.: Viagem de férias") and Descrição "(opcional)" (placeholder "Para que serve este quadro?"), the counter "0 / 1000", and the buttons "Cancelar" and "Criar".  <!-- FBRD-12 -->
3. IF the trimmed name is empty on submit THEN the system SHALL show "Dê um nome ao quadro" on Nome and send no request.  <!-- FBRD-13 -->
4. IF the trimmed name is longer than 100 characters on submit THEN the system SHALL show "Use até 100 caracteres" on Nome and send no request.  <!-- FBRD-14 -->
5. IF the trimmed description is longer than 1000 characters on submit THEN the system SHALL show "Use até 1000 caracteres" on Descrição and send no request.  <!-- FBRD-15 -->
6. WHEN the user types in Descrição THEN the system SHALL update the counter to "{n} / 1000", where n is the number of characters typed.  <!-- FBRD-16 -->
7. WHEN the fields are valid on submit THEN the system SHALL send `POST /api/v1/boards` with `title` set to the trimmed name and, only when the trimmed description is not empty, `description` set to it.  <!-- FBRD-17 -->
8. WHILE the create request is in flight the system SHALL show "Criando…" on the submit button and keep it disabled.  <!-- FBRD-18 -->
9. WHEN create answers `201` THEN the system SHALL close the modal, show the toast "Quadro criado" and navigate to `/b/{id}` with the returned id.  <!-- FBRD-19 -->
10. IF create fails with anything other than `400` or `401` THEN the system SHALL keep the modal open with the typed values, enable the submit button and show the toast "Não foi possível salvar. Tente novamente." with "Tentar novamente", which sends the same request again.  <!-- FBRD-20 -->
11. WHEN the user activates "Cancelar" or presses Esc THEN the system SHALL close the modal without sending a request.  <!-- FBRD-21 -->

**Independent Test**: Against MSW, open the modal, submit an empty name → "Dê um nome ao quadro" and no request; type "Viagem" and submit → `POST` body `{ "title": "Viagem" }`, toast "Quadro criado", URL `/b/{id}`; with a `500` the modal stays open with "Viagem" and the toast offers "Tentar novamente".

---

### P1: Edit a board ⭐ MVP

**User Story**: As a logged-in user, I want to change a board's name and description so that they keep describing the project.

**Why P1**: Names written in a hurry need fixing; doc §5 ships edit in the same modal as create.

**Acceptance Criteria**:

1. WHEN the user opens the menu (…) of an Ativos card THEN the system SHALL show the items "Editar" and "Arquivar".  <!-- FBRD-22 -->
2. WHEN the user activates "Editar" THEN the system SHALL open the modal "Editar quadro" with Nome and Descrição filled with the board's current values, the matching counter, and the buttons "Cancelar" and "Salvar".  <!-- FBRD-23 -->
3. The system SHALL validate the edit modal with the same rules and messages as FBRD-13, FBRD-14 and FBRD-15.  <!-- FBRD-24 -->
4. WHEN the fields are valid on save THEN the system SHALL close the modal, show the new title and description on the card at once, and send `PATCH /api/v1/boards/{id}` with `title` set to the trimmed name and `description` set to the trimmed description, or `null` when it is empty.  <!-- FBRD-25 -->
5. WHEN edit answers `200` THEN the system SHALL show the toast "Quadro salvo".  <!-- FBRD-26 -->

**Independent Test**: Edit "Viagem" to "Viagem 2027" with an empty description → the card shows "Viagem 2027" before the response, the `PATCH` body is `{ "title": "Viagem 2027", "description": null }` and the toast "Quadro salvo" shows.

---

### P1: Archive and restore a board ⭐ MVP

**User Story**: As a logged-in user, I want to archive a board I'm not using and restore it later so that Meus quadros shows only what matters now.

**Why P1**: Archiving is the only way to hide a board, and the only path to deleting one.

**Acceptance Criteria**:

1. WHEN the user activates "Arquivar" on an Ativos card THEN the system SHALL remove the card from Ativos at once, send `POST /api/v1/boards/{id}/archive` and, on `200`, show the toast "Quadro arquivado".  <!-- FBRD-27 -->
2. WHEN the user opens the menu (…) of an Arquivados card THEN the system SHALL show the items "Restaurar" and "Excluir definitivamente".  <!-- FBRD-28 -->
3. WHEN the user activates "Restaurar" on an Arquivados card THEN the system SHALL remove the card from Arquivados at once, send `POST /api/v1/boards/{id}/unarchive` and, on `200`, show the toast "Quadro restaurado".  <!-- FBRD-29 -->
4. WHEN an archive or restore answers `200` THEN the system SHALL show the board in the other tab, with the board returned by the API, the next time that tab is shown.  <!-- FBRD-30 -->

**Independent Test**: Archive "Viagem" → it leaves Ativos before the response, the toast "Quadro arquivado" shows, and the Arquivados tab lists it with "Arquivado em …"; restore it → it leaves Arquivados, the toast "Quadro restaurado" shows and Ativos lists it again.

---

### P1: Delete an archived board ⭐ MVP

**User Story**: As a logged-in user, I want to permanently delete an archived board so that I can remove what I no longer need, without deleting the wrong one by accident.

**Why P1**: The only way to remove data; the typed confirmation protects against a slip.

**Acceptance Criteria**:

1. WHEN the user activates "Excluir definitivamente" on an Arquivados card THEN the system SHALL open the dialog "Excluir o quadro {name} definitivamente?" with the text "Isso apaga o quadro com todas as colunas, tarefas e etiquetas. Não dá para desfazer.", the field "Digite o nome do quadro para confirmar", and the buttons "Cancelar" and "Excluir definitivamente".  <!-- FBRD-31 -->
2. WHILE the confirmation field differs from the board title the system SHALL keep the "Excluir definitivamente" button disabled.  <!-- FBRD-32 -->
3. WHEN the confirmation field equals the board title exactly THEN the system SHALL enable the "Excluir definitivamente" button.  <!-- FBRD-33 -->
4. WHEN the user confirms THEN the system SHALL close the dialog, remove the card from Arquivados at once and send `DELETE /api/v1/boards/{id}`.  <!-- FBRD-34 -->
5. WHEN delete answers `204` THEN the system SHALL show the toast "Quadro excluído definitivamente".  <!-- FBRD-35 -->
6. WHEN the user activates "Cancelar" or presses Esc THEN the system SHALL close the dialog without sending a request.  <!-- FBRD-36 -->

**Independent Test**: Open the dialog for "Old side project", type "old side project" → button disabled; type "Old side project" → enabled; confirm → card gone before the response, `DELETE` sent, toast "Quadro excluído definitivamente".

---

### P1: Save failures ⭐ MVP

**User Story**: As a logged-in user, I want a failed change to be undone and explained so that the screen never shows something the server did not save.

**Why P1**: Edit, archive, restore and delete are optimistic (doc §10); without rollback the grid lies after a failure.

**Acceptance Criteria**:

1. IF an edit, archive, restore or delete fails THEN the system SHALL put the grid back to the state it had before the change.  <!-- FBRD-37 -->
2. IF an edit, archive, restore or delete fails with a network error or a `5xx` THEN the system SHALL show the toast "Não foi possível salvar. Tente novamente." with "Tentar novamente", which applies the same change again.  <!-- FBRD-38 -->
3. IF an edit, archive, restore or delete answers `409` THEN the system SHALL show the toast "Este item foi arquivado. Recarregue para ver o estado atual." with "Recarregar", which refetches the Ativos and Arquivados lists.  <!-- FBRD-39 -->
4. IF an edit, archive, restore or delete answers `404` THEN the system SHALL show the toast "Não foi possível salvar. Tente novamente." without a button and refetch the Ativos and Arquivados lists.  <!-- FBRD-40 -->
5. IF a create or edit answers `400` with `errors[]` THEN the system SHALL show, for each entry whose `field` is `title` or `description`, that field's message (title: "Dê um nome ao quadro" when the trimmed name is empty, else "Use até 100 caracteres"; description: "Use até 1000 caracteres") in a reopened or still-open modal with the submitted values.  <!-- FBRD-41 -->
6. WHILE a change to a board is in flight the system SHALL keep that card's menu (…) button disabled.  <!-- FBRD-42 -->

**Independent Test**: With MSW answering `500` to archive, archiving "Viagem" removes it, then puts it back in Ativos with the "Tentar novamente" toast; a `409` on edit restores the old title and shows "Recarregar"; a `404` on restore puts the card back, shows the toast without a button and the refetched list drops the board.

---

## Edge Cases

- IF the user types more than 1000 characters in Descrição THEN the system SHALL keep the text, show the counter above 1000 (e.g. "1001 / 1000") and block submit with "Use até 1000 caracteres" (FBRD-15).
- IF the name has only spaces THEN the system SHALL treat it as empty (FBRD-13).
- WHEN the user archives the last Ativos board THEN the system SHALL show the Ativos empty state (FBRD-08).
- WHEN the user deletes or restores the last Arquivados board THEN the system SHALL show "Nenhum quadro arquivado" (FBRD-09).
- IF a `401` arrives on any boards request THEN the foundation session-expiry flow runs (FND-16) and no boards toast shows.
- WHEN the user switches tabs while a change is in flight THEN the change still completes or rolls back in the tab it belongs to (FBRD-37).

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | FBRD-13–FBRD-16, FBRD-24, FBRD-41; name 1–100, description ≤ 1000, trimmed |
| Failure / partial-failure states | FBRD-10, FBRD-20, FBRD-37–FBRD-41 |
| Idempotency / retry / duplicate handling | Retry buttons resend the same request (FBRD-20, FBRD-38); archive/unarchive are idempotent in the API (BRD-16); FBRD-18 and FBRD-42 block double submits |
| Auth boundaries & rate limits | Every request carries the token; `401` goes through FND-16; the API scopes boards to the caller. No rate limit on boards endpoints |
| Concurrency / ordering | Changes made on another device surface as `409`/`404` (FBRD-39, FBRD-40); one change per card at a time (FBRD-42) |
| Data lifecycle / expiry | Active → archived → deleted; delete only from Arquivados (FBRD-28, FBRD-31) |
| Observability | N/A because the web client has no logging or metrics pipeline; failures are shown to the user |
| External-dependency failure | The API is the only dependency: FBRD-10, FBRD-20, FBRD-38 |
| State-transition integrity | Menu items depend on the tab (FBRD-22, FBRD-28); edit only on Ativos, delete only on Arquivados |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FBRD-01 | P1: Browse boards | - | Pending |
| FBRD-02 | P1: Browse boards | - | Pending |
| FBRD-03 | P1: Browse boards | - | Pending |
| FBRD-04 | P1: Browse boards | - | Pending |
| FBRD-05 | P1: Browse boards | - | Pending |
| FBRD-06 | P1: Browse boards | - | Pending |
| FBRD-07 | P1: Browse boards | - | Pending |
| FBRD-08 | P1: Browse boards | - | Pending |
| FBRD-09 | P1: Browse boards | - | Pending |
| FBRD-10 | P1: Browse boards | - | Pending |
| FBRD-11 | P1: Create a board | - | Pending |
| FBRD-12 | P1: Create a board | - | Pending |
| FBRD-13 | P1: Create a board | - | Pending |
| FBRD-14 | P1: Create a board | - | Pending |
| FBRD-15 | P1: Create a board | - | Pending |
| FBRD-16 | P1: Create a board | - | Pending |
| FBRD-17 | P1: Create a board | - | Pending |
| FBRD-18 | P1: Create a board | - | Pending |
| FBRD-19 | P1: Create a board | - | Pending |
| FBRD-20 | P1: Create a board | - | Pending |
| FBRD-21 | P1: Create a board | - | Pending |
| FBRD-22 | P1: Edit a board | - | Pending |
| FBRD-23 | P1: Edit a board | - | Pending |
| FBRD-24 | P1: Edit a board | - | Pending |
| FBRD-25 | P1: Edit a board | - | Pending |
| FBRD-26 | P1: Edit a board | - | Pending |
| FBRD-27 | P1: Archive and restore a board | - | Pending |
| FBRD-28 | P1: Archive and restore a board | - | Pending |
| FBRD-29 | P1: Archive and restore a board | - | Pending |
| FBRD-30 | P1: Archive and restore a board | - | Pending |
| FBRD-31 | P1: Delete an archived board | - | Pending |
| FBRD-32 | P1: Delete an archived board | - | Pending |
| FBRD-33 | P1: Delete an archived board | - | Pending |
| FBRD-34 | P1: Delete an archived board | - | Pending |
| FBRD-35 | P1: Delete an archived board | - | Pending |
| FBRD-36 | P1: Delete an archived board | - | Pending |
| FBRD-37 | P1: Save failures | - | Pending |
| FBRD-38 | P1: Save failures | - | Pending |
| FBRD-39 | P1: Save failures | - | Pending |
| FBRD-40 | P1: Save failures | - | Pending |
| FBRD-41 | P1: Save failures | - | Pending |
| FBRD-42 | P1: Save failures | - | Pending |

**Coverage:** 42 total, 0 mapped to tasks, 42 unmapped (mapped at Tasks)

---

## Success Criteria

- [ ] A new user goes from log in to an open, newly created board in under 30 seconds.
- [ ] Every failed edit, archive, restore or delete leaves the grid equal to the server state after the toast shows (zero stale cards).
- [ ] Deleting a board is impossible without typing its exact name.
