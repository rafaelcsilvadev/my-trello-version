# Card Checklist Specification

## Problem Statement

The card detail (feature `card-detail`, 4a) shows the title, due date, description and labels of a card, but not its checklist. The board tile already shows the checklist progress ("2/4"), yet the user cannot see the items, tick them off, add a step, fix a typo or remove a step. Feature `card-checklist` (4b) adds the checklist section of the prototype (doc §7) to the card detail: the progress bar and count, the items with their done checkbox, in-place text editing, delete, and the "Adicionar item" field, in the editable and read-only modes of the detail. Reordering items (mouse and keyboard) is feature `card-checklist-dnd` (4b2).

## Goals

- [ ] A user opens a card and sees its checklist items in order, with the progress "done/total" and a progress bar.
- [ ] A user adds, ticks, renames and deletes items from the detail, and the board tile shows the new progress when the detail closes, without a reload.
- [ ] A user who closes the detail while an item edit is unsaved is asked "Descartar alterações?" and loses nothing by choosing **Continuar editando**.
- [ ] An archived card or a card of an archived board shows its checklist read-only.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Reorder items by mouse drag or by keyboard on the grip (`Espaço`, `↑ ↓`, `Esc`), the "Movendo …" banner, the live region and the grip handle itself | Feature `card-checklist-dnd` (4b2), user choice to split roadmap 4b |
| Label popover in the detail | Feature `card-labels` (4c) |
| Confirmation before deleting an item | Doc §7: items are deleted "sem confirmação" |
| Archive or restore of a single item | Back-end `checklists` spec: items have no archive, they are deleted |
| Converting an item into a card, due dates or members per item | Not in the prototype |
| Checklist progress on the board tile | Already shipped by feature `board` (`card-tile.tsx`); this feature only keeps its data current |
| The shortcuts dialog row for Esc | Feature `settings` (6) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Split of roadmap 4b | 4b `card-checklist` (this spec): progress, add, edit, check, delete. 4b2 `card-checklist-dnd`: reorder by mouse and keyboard | User choice; mirrors the `board` / `board-dnd` split and keeps each feature near the size of 4a | y |
| Where the section sits | Below the description, above the footer, with the heading "Checklist" and a checklist icon | Doc §7 order; prototype `design/Task List.dc.html:698-722` | y |
| Item order | Ascending `position`, as returned by `GET /cards/{cardId}/checklist-items` | Back-end `checklists` spec: contiguous 0-based positions | y |
| Loading the items | The rest of the detail does not wait for the items: it still opens at once from the board cache (FCD). Only the checklist section shows a skeleton while the items load, and "Não foi possível carregar" with **Tentar novamente** inside the section when they fail with a network error or `5xx`. A `404` on the items shows "Esta tarefa não existe mais" for the whole detail | User choice at Design: waiting for the items would flash the detail skeleton on every open from the board; a `404` on the items means the card is gone | y |
| Progress | While the card has at least one item: the count "done/total" next to the heading and a progress bar (`role="progressbar"`, accessible name "Checklist", `aria-valuetext` "done/total", width = round(done / total × 100) %). Count and bar are green when every item is done, otherwise the count is secondary text and the bar is the brand color. With no items: no count and no bar | Prototype `hasCheck`, `checkText`, `checkPct`, `checkBarCls` | y |
| Item row | Done checkbox, the item text as an in-place text field, and a delete button ("X"). A done item's text is struck through and dimmed | Prototype item row; `textCls` | y |
| Accessible names | Checkbox: the item text. Text field: "Editar item “{text}”". Delete button: "Excluir item “{text}”". `{text}` is the saved text | The prototype gives every text field the same name "Checklist" and the delete buttons the same name "Excluir item", which a screen reader cannot tell apart | y |
| Add item | A text field with placeholder and accessible name "Adicionar item e apertar Enter", after the last item. Enter with valid text sends `POST /cards/{cardId}/checklist-items` with the trimmed `text` | Doc §7 "Adicionar item com Enter"; prototype `itemPh` | y |
| Add is not optimistic | While the create is in flight the field keeps its text and Enter does nothing; on `201` the item shows at the end, the field clears and keeps focus for the next item. No toast | FE-AD-009: create waits for the server id. Overrides the doc §10 "pendente" look for new items, as the board did for columns and cards (FBV-17, FBV-29). Checklist saves are silent like the other detail fields | y |
| Item validation | Text 1–200 characters after trim. Empty → "Escreva o item"; longer than 200 → "Use até 200 caracteres". The message shows below the list with `role="alert"`; the field with the error gets `aria-invalid="true"`; nothing is sent while invalid | Doc §7; back-end `CreateChecklistItemDto`/`UpdateChecklistItemDto` 1–200 after trim; prototype `itemErr` | y |
| Edit item text | In place. Enter or leaving the field saves when the trimmed text differs from the saved text (optimistic `PATCH /checklist-items/{id}` with `text`); equal text sends nothing; Esc restores the saved text, clears the error and keeps the detail open | Doc §7 "Enter salva, Esc cancela, sair do campo salva"; same rules as the card title (FCD-16–FCD-20) | y |
| Leaving an item field with invalid text | Keeps the field's text and its error and sends nothing | Same rule as the card title and the board rename field (FBV-21) | y |
| Check an item | Toggling the checkbox saves at once (optimistic `PATCH /checklist-items/{id}` with `done`) | Doc §7; FE-AD-009 toggle | y |
| Delete an item | The delete button removes the item at once (optimistic `DELETE /checklist-items/{id}`), with no confirmation and no toast. Focus moves to the "Adicionar item" field | Doc §7 "sem confirmação"; the add field always exists in the editable mode, so focus never falls to `body` | y |
| Item with a change in flight | Its checkbox and delete button stay disabled until the change settles; its text field stays enabled | FBV-58 pattern: one change per item at a time; the text keeps the FCD pending rule (a second save supersedes the first) | y |
| Board tile and caches | Every checklist change keeps `card.checklist` (`total`, `done`) current in the card query and in the active and archived card lists, so the tile shows the new progress without a reload: create adds 1 to `total` on success; toggle adds or removes 1 from `done`; delete removes 1 from `total`, and 1 from `done` when the item was done | FE-AD-006, FE-AD-013: the detail and the board share one cache | y |
| Unsaved edits | An item text field whose text differs from its saved text counts as an unsaved edit, next to the title and description drafts. The "Adicionar item" field does not count | Doc §7 "item de checklist em edição"; prototype `dirty()` only checks `editItem` | y |
| Esc order | An open dialog → the item text field being edited (restores it, the detail stays) → the detail (with the discard rule) | Doc §11 Esc row, limited to the layers present after 4a and 4b | y |
| Read-only modes | Archived card and card of an archived board: items show with their checkbox and text field disabled and dimmed, no delete buttons and no "Adicionar item" field; the progress still shows | Doc §7 "campos ficam bloqueados e atenuados"; prototype hides the add field when the detail is not active | y |
| Failure of a save | Edit, toggle and delete: undo on screen and the FCD-47/FCD-48/FCD-49 toasts. A `404` on an item (deleted on another device) shows "Não foi possível salvar. Tente novamente." and refetches the checklist. A failed text save keeps the typed text in the field. Create: the field keeps its text and the same toasts show | Doc §10; FE-AD-009, FE-AD-010 | y |
| Many items | No limit and no virtualization; the detail body scrolls | Back-end: no item limit per card (personal scale); the detail already scrolls (PR #335) | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: See the checklist and its progress ⭐ MVP

**User Story**: As a logged-in user, I want to see a card's checklist in its detail so that I know which steps are left.

**Why P1**: Every other story acts on the list shown here.

**Acceptance Criteria**:

1. WHEN the card detail is ready THEN the system SHALL show the section "Checklist" below the description with the card's items in ascending `position` order.  <!-- FCL-01 -->
2. WHILE the checklist items are loading the system SHALL show a skeleton in the checklist section and the rest of the detail as soon as the card is loaded.  <!-- FCL-02 -->
3. IF loading the checklist items fails with a network error or a `5xx` THEN the system SHALL show "Não foi possível carregar" with **Tentar novamente** inside the checklist section, which loads the items again, and keep the rest of the detail usable.  <!-- FCL-03 -->
4. IF loading the checklist items returns `404` THEN the system SHALL show "Esta tarefa não existe mais" with **Fechar**.  <!-- FCL-04 -->
5. WHILE the card has at least one item the system SHALL show the count "done/total" next to the heading and a progress bar with accessible name "Checklist", `aria-valuetext` "done/total" and width round(done / total × 100) %.  <!-- FCL-05 -->
6. WHILE every item of the card is done the system SHALL show the count and the progress bar in green.  <!-- FCL-06 -->
7. WHILE the card has no items the system SHALL show neither the count nor the progress bar.  <!-- FCL-07 -->
8. The system SHALL show each item as a checkbox named by the item text, a text field named "Editar item “{text}”" holding the text, and a button named "Excluir item “{text}”".  <!-- FCL-08 -->
9. WHILE an item is done the system SHALL show its checkbox checked and its text struck through and dimmed.  <!-- FCL-09 -->

**Independent Test**: Open "Polish the board screen" on the seed board → three items with the first two checked, "2/3" and a bar at 67 %; open a card with no items → heading only.

---

### P1: Add an item ⭐ MVP

**User Story**: As a logged-in user, I want to add steps to a card so that I can break the work down.

**Why P1**: A checklist starts empty; without adding there is nothing to track.

**Acceptance Criteria**:

1. WHEN the user presses Enter in the field "Adicionar item e apertar Enter" with text that is 1–200 characters after trimming THEN the system SHALL send `POST /api/v1/cards/{cardId}/checklist-items` with the trimmed `text`.  <!-- FCL-10 -->
2. WHILE an item create is in flight the system SHALL keep the field's text and ignore Enter in it.  <!-- FCL-11 -->
3. WHEN the create returns `201` THEN the system SHALL show the new item not done at the end of the list, clear the field and keep focus in it.  <!-- FCL-12 -->
4. IF the text is empty after trimming when the user presses Enter THEN the system SHALL show "Escreva o item" and send nothing.  <!-- FCL-13 -->
5. IF the text is longer than 200 characters after trimming when the user presses Enter THEN the system SHALL show "Use até 200 caracteres" and send nothing.  <!-- FCL-14 -->
6. WHEN the user types in a field that shows an item error THEN the system SHALL clear the error.  <!-- FCL-15 -->

**Independent Test**: On a card with no items type "Coffee" + Enter → the item shows, "0/1" appears, the field is empty and focused; Enter on an empty field → "Escreva o item".

---

### P1: Tick an item off ⭐ MVP

**User Story**: As a logged-in user, I want to mark an item done or not done so that the progress shows how far the task is.

**Why P1**: Progress is the point of a checklist.

**Acceptance Criteria**:

1. WHEN the user toggles an item's checkbox THEN the system SHALL send `PATCH /api/v1/checklist-items/{id}` with `done` set to the new value and show the new state and the new count at once.  <!-- FCL-16 -->
2. WHILE a change to an item is in flight the system SHALL keep that item's checkbox and delete button disabled.  <!-- FCL-17 -->

**Independent Test**: Tick "Fruit" on "Buy groceries" → "2/3" at once; tick "Coffee" → "3/3" in green.

---

### P1: Edit an item's text ⭐ MVP

**User Story**: As a logged-in user, I want to fix an item's text in place so that each step reads right.

**Why P1**: Steps get renamed as the work becomes clearer.

**Acceptance Criteria**:

1. WHEN the user presses Enter or leaves an item's text field with text that is 1–200 characters after trimming and differs from the saved text THEN the system SHALL send `PATCH /api/v1/checklist-items/{id}` with the trimmed `text` and show it at once.  <!-- FCL-18 -->
2. WHEN the user presses Enter or leaves an item's text field with trimmed text equal to the saved text THEN the system SHALL send nothing.  <!-- FCL-19 -->
3. IF an item's text is empty after trimming when the user presses Enter or leaves the field THEN the system SHALL show "Escreva o item", keep the field's text and send nothing.  <!-- FCL-20 -->
4. IF an item's text is longer than 200 characters after trimming when the user presses Enter or leaves the field THEN the system SHALL show "Use até 200 caracteres", keep the field's text and send nothing.  <!-- FCL-21 -->
5. WHEN the user presses Esc in an item's text field THEN the system SHALL restore the saved text, clear the error and keep the detail open.  <!-- FCL-22 -->
6. WHILE an item field shows an error the system SHALL mark that field with `aria-invalid="true"` and show the message below the list with `role="alert"`.  <!-- FCL-23 -->

**Independent Test**: Change "Bread" to "Whole bread" + Enter → saved; clear it and press Tab → "Escreva o item" and the field stays empty; Esc → "Whole bread" back.

---

### P1: Delete an item ⭐ MVP

**User Story**: As a logged-in user, I want to remove a step that no longer applies so that the progress stays honest.

**Why P1**: Wrong or obsolete steps would block a complete checklist.

**Acceptance Criteria**:

1. WHEN the user activates "Excluir item “{text}”" THEN the system SHALL send `DELETE /api/v1/checklist-items/{id}` and remove the item and update the count at once, with no confirmation.  <!-- FCL-24 -->
2. WHEN an item is removed by its delete button THEN the system SHALL move focus to the field "Adicionar item e apertar Enter".  <!-- FCL-25 -->
3. WHEN the last item of the card is deleted THEN the system SHALL hide the count and the progress bar.  <!-- FCL-26 -->

**Independent Test**: Delete "Bread" on "Buy groceries" (the only done item) → "Coffee" and "Fruit" remain, the count reads "0/2", focus is in the add field.

---

### P1: Close with an unsaved item edit ⭐ MVP

**User Story**: As a logged-in user, I want to be warned before closing the detail with an item edit I did not save so that I do not lose it.

**Why P1**: Doc §7 lists the item being edited among the unsaved edits.

**Acceptance Criteria**:

1. WHILE an item's text field holds text that differs from its saved text the system SHALL count it as an unsaved edit of the detail.  <!-- FCL-27 -->
2. WHEN the user closes the detail by any close path while an item edit is unsaved THEN the system SHALL open "Descartar alterações?" before closing.  <!-- FCL-28 -->
3. The system SHALL NOT count text in the field "Adicionar item e apertar Enter" as an unsaved edit.  <!-- FCL-29 -->
4. WHEN the user presses Esc while an item's text field is being edited THEN the system SHALL close only that edit (FCL-22) and keep the detail open.  <!-- FCL-30 -->

**Independent Test**: Type in an item's field, click the backdrop → "Descartar alterações?"; **Continuar editando** keeps the typed text.

---

### P1: Read-only checklist ⭐ MVP

**User Story**: As a logged-in user, I want an archived card's checklist to be visible but locked so that I can read it without changing an archived task.

**Why P1**: The read-only modes of 4a must hold for the new section too.

**Acceptance Criteria**:

1. WHILE the detail is in the archived-card or the archived-board mode the system SHALL show every item with its checkbox and text field disabled and dimmed.  <!-- FCL-31 -->
2. WHILE the detail is in the archived-card or the archived-board mode the system SHALL show no delete buttons and no field "Adicionar item e apertar Enter".  <!-- FCL-32 -->
3. WHILE the detail is in the archived-card or the archived-board mode the system SHALL still show the count and the progress bar.  <!-- FCL-33 -->

**Independent Test**: Archive "Buy groceries" from the detail → the items lock, no X buttons, no add field, "1/3" still shows.

---

## Edge Cases

- IF an item edit, toggle or delete fails with a network error or `5xx` THEN the system SHALL undo the change on screen and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**.  <!-- FCL-34 -->
- IF an item create, edit, toggle or delete returns `409` THEN the system SHALL undo the change on screen and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**.  <!-- FCL-35 -->
- IF an item edit, toggle or delete returns `404` THEN the system SHALL undo the change, show "Não foi possível salvar. Tente novamente." and refetch the checklist.  <!-- FCL-36 -->
- IF an item text save fails THEN the system SHALL keep the user's text in that item's field as an unsaved edit.  <!-- FCL-37 -->
- IF an item create fails THEN the system SHALL keep the text in the field "Adicionar item e apertar Enter" and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**.  <!-- FCL-38 -->
- WHEN any checklist save succeeds THEN the system SHALL show the matching "done/total" on the board tile without a reload.  <!-- FCL-39 -->
- IF an item's text holds exactly 200 characters after trimming THEN the system SHALL save it.  <!-- FCL-40 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Text 1–200 after trim on add and edit (FCL-13, FCL-14, FCL-20, FCL-21, FCL-40) |
| Failure / partial-failure states | Optimistic edit, toggle and delete undo on failure (FCL-34–FCL-36); typed text survives a failed save (FCL-37, FCL-38); load error and not found (FCL-03, FCL-04) |
| Idempotency / retry / duplicate handling | Unchanged text sends nothing (FCL-19); Enter is ignored while a create is in flight, so one Enter makes one item (FCL-11); one change per item at a time (FCL-17) |
| Auth boundaries & rate limits | A foreign card's items return `404` → not found (FCL-04); session expiry follows FE-AD-002; no checklist rate limit (back-end spec) |
| Concurrency / ordering | Item deleted on another device → `404` path (FCL-36); card or board archived elsewhere → `409` path (FCL-35); overlapping saves roll back only their own change (FE-AD-010). Reordering is 4b2 |
| Data lifecycle / expiry | Items are deleted directly, no archive (FCL-24); item drafts live only while the detail is open (FCL-27, FCL-28) |
| Observability | N/A because the web client has no logging or metrics pipeline |
| External-dependency failure | API unreachable → load error (FCL-03) or save-fail toast (FCL-34, FCL-38) |
| State-transition integrity | Done ↔ not done (FCL-16); editable ↔ read-only follows the detail mode (FCL-31–FCL-33) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FCL-01 | P1: See the checklist and its progress | Specify | Pending |
| FCL-02 | P1: See the checklist and its progress | Specify | Pending |
| FCL-03 | P1: See the checklist and its progress | Specify | Pending |
| FCL-04 | P1: See the checklist and its progress | Specify | Pending |
| FCL-05 | P1: See the checklist and its progress | Specify | Pending |
| FCL-06 | P1: See the checklist and its progress | Specify | Pending |
| FCL-07 | P1: See the checklist and its progress | Specify | Pending |
| FCL-08 | P1: See the checklist and its progress | Specify | Pending |
| FCL-09 | P1: See the checklist and its progress | Specify | Pending |
| FCL-10 | P1: Add an item | Specify | Pending |
| FCL-11 | P1: Add an item | Specify | Pending |
| FCL-12 | P1: Add an item | Specify | Pending |
| FCL-13 | P1: Add an item | Specify | Pending |
| FCL-14 | P1: Add an item | Specify | Pending |
| FCL-15 | P1: Add an item | Specify | Pending |
| FCL-16 | P1: Tick an item off | Specify | Pending |
| FCL-17 | P1: Tick an item off | Specify | Pending |
| FCL-18 | P1: Edit an item's text | Specify | Pending |
| FCL-19 | P1: Edit an item's text | Specify | Pending |
| FCL-20 | P1: Edit an item's text | Specify | Pending |
| FCL-21 | P1: Edit an item's text | Specify | Pending |
| FCL-22 | P1: Edit an item's text | Specify | Pending |
| FCL-23 | P1: Edit an item's text | Specify | Pending |
| FCL-24 | P1: Delete an item | Specify | Pending |
| FCL-25 | P1: Delete an item | Specify | Pending |
| FCL-26 | P1: Delete an item | Specify | Pending |
| FCL-27 | P1: Close with an unsaved item edit | Specify | Pending |
| FCL-28 | P1: Close with an unsaved item edit | Specify | Pending |
| FCL-29 | P1: Close with an unsaved item edit | Specify | Pending |
| FCL-30 | P1: Close with an unsaved item edit | Specify | Pending |
| FCL-31 | P1: Read-only checklist | Specify | Pending |
| FCL-32 | P1: Read-only checklist | Specify | Pending |
| FCL-33 | P1: Read-only checklist | Specify | Pending |
| FCL-34 | Edge cases | Specify | Pending |
| FCL-35 | Edge cases | Specify | Pending |
| FCL-36 | Edge cases | Specify | Pending |
| FCL-37 | Edge cases | Specify | Pending |
| FCL-38 | Edge cases | Specify | Pending |
| FCL-39 | Edge cases | Specify | Pending |
| FCL-40 | Edge cases | Specify | Pending |

**Coverage:** 40 total, 0 mapped to tasks, 40 unmapped ⚠️ (mapped in the Tasks phase)

---

## Success Criteria

- [ ] Every FCL requirement has a passing unit or e2e test.
- [ ] Adding, ticking, renaming and deleting items on the seed board works end to end in Playwright against the real API, and the board tile shows the new progress.
- [ ] No typed item text is lost on close or on a failed save.
