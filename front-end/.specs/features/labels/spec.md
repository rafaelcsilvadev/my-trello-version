# Labels Specification

## Problem Statement

The user can apply labels to cards (feature `card-labels`, 4c) and create one from the popover, but cannot rename, recolor, delete or review them. A typo in "Bug" means deleting it and re-tagging every card, and the link **Gerenciar etiquetas** and the board menu entry **Etiquetas do quadro** still open the foundation placeholder at `/b/{boardId}/labels`. Feature `labels` (5) builds that page from the prototype (doc §8): the board's labels in creation order, each with its color and "usada em N tarefas", plus create, edit and delete with a confirmation that says how many cards lose the label.

## Goals

- [ ] A user opens **Etiquetas do quadro** and sees every label of the board with the number of cards that use it.
- [ ] A user creates, renames and recolors a label on the page and sees the board, the card detail and the label filter agree when the board opens again, without a reload.
- [ ] A user deletes a label after a dialog that names the number of cards it leaves, and the label disappears from every card.
- [ ] A failed create, edit or delete leaves the screen matching the server and tells the user with the doc §10 toasts.
- [ ] An archived board shows the page read-only.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Applying or removing a label on a card from this page | Done in the card detail popover (feature `card-labels`, 4c) |
| Reordering labels | Labels follow creation order (`createdAt`, then `id`) everywhere, as the back-end orders them |
| Archive or restore of a label | Labels have no archive in the API (back-end `labels` spec) |
| Merging labels or bulk delete | Not in the prototype |
| Filtering or searching the labels list | Not in the prototype; the list is short at personal scale |
| A `cardCount` field on the API label | Counted in the front-end (assumption below); no back-end change |
| The shortcuts dialog row for this page | Feature `settings` (6) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Source of "usada em N tarefas" | The front-end counts, per label id, the cards of three sources, using each card's `labelIds`: the board's active cards (`GET /boards/{boardId}/cards`), the board's archived cards (same call with `archived=true`) and the active cards of each archived column (`GET /lists/{listId}/cards`, one call per archived column) | User choice (A): no back-end change; back-end LBL-17 removes a deleted label from every card of the board, active or archived, whatever its column | y |
| Cards the board calls omit | The board's active card call hides the active cards of archived columns (back-end `CardsRepository.listInBoard`), so the third source above reads them per column; archived cards are listed whatever their column | Verified in the back-end code during design; without it the count and the delete warning would fall short | y |
| Where the files live | In `features/board`, as `labels-*` files, reusing `LabelChip`, `LABEL_CLASSES`, `LABEL_COLORS`, `validateLabelName`, `isLabelNameTaken`, the label query keys and the optimistic pipeline | User choice (A), same reason as FE-AD-013; FE-AD-006 forbids imports between features | y |
| Page layout | Heading **Etiquetas**, a subtitle "{board name} · Valem só para este quadro.", a primary button **Nova etiqueta** (hidden when the board is archived), and the list below. Desktop breadcrumb "Meus quadros › {board name} › Etiquetas"; phone shows a back arrow to the board | Prototype lines 532–534; doc §3 | y |
| Row content | The label chip (color dot + name), the usage text, and the icon buttons **Editar** and **Excluir** named "Editar etiqueta {name}" and "Excluir etiqueta {name}" | Prototype `onEdit` / `onDelete` (line 1152); doc §13 every icon-only button has a label | y |
| Usage text | 0 cards → "não usada"; 1 → "usada em 1 tarefa"; n ≥ 2 → "usada em {n} tarefas" (EN: "unused", "used in 1 task", "used in {n} tasks") | Prototype i18n `usedIn0`, `usedIn1`, `usedIn` | y |
| Create / edit dialog | A modal dialog titled **Nova etiqueta** or **Editar etiqueta**: a name field (accessible name "Nome", placeholder "Ex.: Bug", focused), the 10 colors as a `radiogroup` named "Cor", the selected color's name and a preview chip with the typed name, **Cancelar** and a primary button (**Criar etiqueta** or **Salvar**). Create starts on `blue`; edit starts on the label's name and color. Enter in the name field submits | Prototype `openLabelDialog`, `saveLabel`, `onLNameKey`; doc §8 and §13 | y |
| Preview text | The preview chip shows the typed name, or the placeholder "Ex.: Bug" while the name is blank | The prototype shows a preview and does not say what a blank name looks like | n |
| Name validation | Trimmed name 1–50. Empty → "Dê um nome à etiqueta"; over 50 → "Use até 50 caracteres"; equal, ignoring case, to another label of the board → "Já existe uma etiqueta com esse nome neste quadro". Nothing is sent while invalid. The message shows below the name field with `role="alert"`, the field gets `aria-invalid="true"`, typing clears it. In edit, a name equal ignoring case to the label's own name is valid | Doc §8; back-end LBL-03, LBL-05, LBL-14; reuses the validators of FCLB | y |
| Edit with no change | Saving an unchanged name and color closes the dialog, sends nothing and shows no toast | Back-end LBL-15 makes `{}` a no-op; a request would only add noise | n |
| Edit sends only changes | The `PATCH` carries only the fields that changed (name and/or color) | Back-end LBL-10 changes only given fields | n |
| Create is not optimistic | While `POST /boards/{boardId}/labels` is in flight the primary button is disabled and Enter does nothing. On `201` the dialog closes, the label joins the end of the list and the toast "Etiqueta criada" shows | FE-AD-009: create waits for the server id; prototype `tLabelCreated` | y |
| Edit is optimistic | On save the dialog closes at once, the row shows the new name and color, and the toast "Etiqueta salva" shows; a failure rolls the row back | FE-AD-009 optimistic updates; prototype `tLabelSaved` | y |
| Delete confirmation | A confirm dialog "Excluir a etiqueta {name}?" with the body "Ela será removida de {n} tarefas." (1 → "Ela será removida de 1 tarefa."; 0 → "Nenhuma tarefa usa esta etiqueta."), **Cancelar** and a destructive **Excluir** | Prototype `delLabel` (line 1142), i18n `delLabelDesc*` | y |
| Delete is optimistic | On **Excluir** the dialog closes, the row leaves the list and the toast "Etiqueta excluída" shows; a failure puts the row back at its original place | FE-AD-009; prototype `tLabelDeleted` | y |
| Caches after edit and delete | A rename or recolor patches the board's label query; a delete also removes the id from the cached active and archived card lists. Both end with the board-view refetch, which refreshes the card detail and list caches. The card detail and the label filter are not mounted on this route (the filter state resets with the board screen), so nothing else is patched | One cache for the board and the detail (FE-AD-013); back-end LBL-17 | y |
| One change per label | While a change of a label is in flight its row buttons are disabled; other rows stay usable | Same pattern as FBV-58 and FCLB-06 | y |
| Empty board | "Nenhuma etiqueta ainda" with the line "Crie etiquetas para destacar tarefas, como Bug ou Urgent." and the **Nova etiqueta** button | Prototype lines 540–543, i18n `noLabelsYet*` | y |
| Page states | Loading: a skeleton of the rows. Error: "Não foi possível carregar" with **Tentar novamente**. Board missing, foreign or malformed id: the existing board-not-found screen | Doc §10 and the board screen states; back-end LBL-08 | y |
| Archived board | The page shows the archived board notice "Quadro arquivado · somente leitura" (the board screen's notice), keeps the list, hides **Nova etiqueta**, and shows no **Editar** or **Excluir** buttons | Doc §8 "Em quadro arquivado, a tela é somente leitura"; back-end rejects writes with `409` | y |
| Failure messages | Network error or `5xx` → "Não foi possível salvar. Tente novamente." with **Tentar novamente**; `409` `/problems/board-archived` → "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**; `404` on edit or delete (label gone elsewhere) → "Não foi possível salvar. Tente novamente." and a refetch of the board's labels and cards | Doc §10; back-end LBL-07, LBL-08 and the `404` for a missing label | y |
| Entry points | The board menu entry **Etiquetas do quadro** and the popover link **Gerenciar etiquetas** both open `/b/{boardId}/labels`; the route replaces the placeholder. The Esc key and the back arrow return to the board | Doc §3 and §8; both links already exist | y |
| Dialog focus | Closing a dialog returns focus to the button that opened it; after a delete, to the **Nova etiqueta** button, since the row is gone | Doc §13 dialogs restore focus; the opener no longer exists after a delete | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: See the board's labels ⭐ MVP

**User Story**: As a board owner, I want a page that lists the board's labels with their use so that I know what I have before I change it.

**Why P1**: Edit and delete have nothing to act on without the list, and the existing links lead to a placeholder.

**Acceptance Criteria**:

1. WHEN the user opens `/b/{boardId}/labels` THEN the system SHALL show the heading **Etiquetas**, the subtitle "{board name} · Valem só para este quadro." and one row per label of the board, in board label order (`createdAt`, then `id`).  <!-- FLP-01 -->
2. The system SHALL show in each row the label chip with its color and name, the usage text and the buttons "Editar etiqueta {name}" and "Excluir etiqueta {name}".  <!-- FLP-02 -->
3. The system SHALL write the usage text as "não usada" for 0 cards, "usada em 1 tarefa" for 1 and "usada em {n} tarefas" for n ≥ 2, counting every card of the board that carries the label: active, archived, and active cards of archived columns.  <!-- FLP-03 -->
4. WHEN the board has no labels THEN the system SHALL show "Nenhuma etiqueta ainda" with "Crie etiquetas para destacar tarefas, como Bug ou Urgent." and the **Nova etiqueta** button.  <!-- FLP-04 -->
5. WHILE the board, its labels or any of the card sources of FLP-03 are loading the system SHALL show a skeleton of the rows.  <!-- FLP-05 -->
6. IF a request for the board, its labels or any card source of FLP-03 fails THEN the system SHALL show "Não foi possível carregar" with **Tentar novamente**, which refetches the failed requests.  <!-- FLP-06 -->
7. IF the board id does not exist, belongs to another user or is not a UUID THEN the system SHALL show the board-not-found screen.  <!-- FLP-07 -->
8. WHEN the user follows **Etiquetas do quadro** in the board menu or **Gerenciar etiquetas** in the card popover THEN the system SHALL open this page in place of the placeholder.  <!-- FLP-08 -->
9. The system SHALL show on desktop the breadcrumb "Meus quadros › {board name} › Etiquetas" and on a phone a back arrow to the board.  <!-- FLP-09 -->

**Independent Test**: Open a board with "Bug" on two active cards and one archived card, "Idea" on none and "Chore" on one: three rows in creation order with "usada em 3 tarefas", "não usada" and "usada em 1 tarefa". A board with no labels shows the empty state.

---

### P1: Create a label ⭐ MVP

**User Story**: As a board owner, I want to create a named, colored label on the page so that I can prepare labels before tagging cards.

**Why P1**: The popover creates a label only while a card is open; the page is where labels are planned.

**Acceptance Criteria**:

1. WHEN the user presses **Nova etiqueta** THEN the system SHALL open a modal dialog titled **Nova etiqueta** with the focused name field, the 10 colors as a radiogroup named "Cor" in doc §8 order, `blue` selected, the selected color's name and a preview chip.  <!-- FLP-10 -->
2. WHEN the user picks a color THEN the system SHALL select it, show its name and recolor the preview chip.  <!-- FLP-11 -->
3. WHEN the user types in the name field THEN the system SHALL show the typed name in the preview chip, and "Ex.: Bug" while the trimmed name is blank.  <!-- FLP-12 -->
4. IF the trimmed name is empty, longer than 50 characters, or equal ignoring case to the name of a label already in the list THEN the system SHALL show the matching message of doc §8 below the name field and SHALL NOT send a request.  <!-- FLP-13 -->
5. WHEN the user types in the name field after an error THEN the system SHALL clear the error and `aria-invalid`.  <!-- FLP-14 -->
6. WHEN the user presses **Criar etiqueta** or Enter with a valid name THEN the system SHALL send `POST /boards/{boardId}/labels` with the trimmed name and the color and SHALL disable the button and ignore Enter until the response arrives.  <!-- FLP-15 -->
7. WHEN the create returns `201` THEN the system SHALL close the dialog, add the label at the end of the list as "não usada" and show the toast "Etiqueta criada".  <!-- FLP-16 -->
8. WHEN the user presses **Cancelar**, presses Esc or clicks outside the dialog THEN the system SHALL close it without a request and drop the typed text.  <!-- FLP-17 -->

**Independent Test**: Press **Nova etiqueta**, type "  Bug  ", pick Vermelho, press Enter → the dialog closes, "Bug" is the last row "não usada" and the toast shows; typing "bug" again shows "Já existe uma etiqueta com esse nome neste quadro".

---

### P1: Edit a label ⭐ MVP

**User Story**: As a board owner, I want to rename or recolor a label so that it keeps matching how I organize the board.

**Why P1**: Fixing a typo should not mean re-tagging every card.

**Acceptance Criteria**:

1. WHEN the user presses "Editar etiqueta {name}" THEN the system SHALL open the same dialog titled **Editar etiqueta**, with the focused name field holding the label's name, the label's color selected and the primary button **Salvar**.  <!-- FLP-18 -->
2. IF the trimmed name breaks a rule of FLP-13 THEN the system SHALL show the message and SHALL NOT send a request, and a name equal ignoring case to the label's own name SHALL be valid.  <!-- FLP-19 -->
3. WHEN the user saves a changed name, color or both THEN the system SHALL close the dialog, show the new name and color in the row at once, show the toast "Etiqueta salva" and send `PATCH /labels/{id}` with only the changed fields.  <!-- FLP-20 -->
4. WHEN the user saves with the name and color unchanged THEN the system SHALL close the dialog without a request and without a toast.  <!-- FLP-21 -->
5. WHILE a change of a label is in flight the system SHALL disable the **Editar** and **Excluir** buttons of that row and keep the other rows enabled.  <!-- FLP-22 -->

**Independent Test**: Edit "Bug" to "  Defect  " in Laranja → the row shows "Defect" in orange, and the tiles and the card detail of cards carrying it show it when the board opens again; saving "Defect" unchanged closes with no toast and no request.

---

### P1: Delete a label ⭐ MVP

**User Story**: As a board owner, I want to delete a label I no longer use so that the picker stays short.

**Why P1**: Delete is the only way to remove a label, and it silently strips cards, so the user must see the effect first.

**Acceptance Criteria**:

1. WHEN the user presses "Excluir etiqueta {name}" THEN the system SHALL open a confirm dialog "Excluir a etiqueta {name}?" with the body "Ela será removida de {n} tarefas." (1 → "Ela será removida de 1 tarefa."; 0 → "Nenhuma tarefa usa esta etiqueta."), **Cancelar** and **Excluir**.  <!-- FLP-23 -->
2. WHEN the user presses **Excluir** THEN the system SHALL close the dialog, remove the row, show the toast "Etiqueta excluída" and send `DELETE /labels/{id}`.  <!-- FLP-24 -->
3. WHEN a label is deleted THEN the system SHALL remove its id from the `labelIds` of every card in the board's cached active and archived card lists and refetch the board view once no other change is in flight, so no tile or chip shows it when the board opens again.  <!-- FLP-25 -->
4. WHEN the user presses **Cancelar**, presses Esc or clicks outside the confirm dialog THEN the system SHALL close it without a request.  <!-- FLP-26 -->

**Independent Test**: Delete "Bug" used on 3 cards: the dialog says "Ela será removida de 3 tarefas.", after **Excluir** the row is gone and going back to the board shows no "Bug" chip on any tile, active or archived.

---

### P2: Failures and read-only mode

**User Story**: As a board owner, I want a failed change to undo itself with a clear message, and an archived board to stay unchanged.

**Why P2**: The happy paths work without it, but the optimistic edit and delete need a safe rollback, and the archived board must not offer writes the API refuses.

**Acceptance Criteria**:

1. WHILE the board is archived the system SHALL show the archived board notice "Quadro arquivado · somente leitura", list the labels and SHALL NOT show **Nova etiqueta**, **Editar** or **Excluir**.  <!-- FLP-27 -->
2. IF an edit or a delete fails with a network error or `5xx` THEN the system SHALL put the row back as it was and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which repeats the same request.  <!-- FLP-28 -->
3. IF a create fails with a network error or `5xx` THEN the system SHALL keep the dialog open with its name and color and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which repeats the same create.  <!-- FLP-29 -->
4. IF a create or an edit returns `409` with type `/problems/label-name-taken` THEN the system SHALL keep the dialog open with its text, show "Já existe uma etiqueta com esse nome neste quadro" below the name field and refetch the board's labels; an edit SHALL also put the row back.  <!-- FLP-30 -->
5. IF a create, edit or delete returns `409` with type `/problems/board-archived` THEN the system SHALL undo the change and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches the board view.  <!-- FLP-31 -->
6. IF an edit or a delete returns `404` THEN the system SHALL undo the change, show "Não foi possível salvar. Tente novamente." and refetch the board's labels and cards, so a label deleted on another device leaves the list.  <!-- FLP-32 -->

**Independent Test**: Archive the board and open the page: the notice shows, no write button. With the API stopped, delete a label: the row returns and the toast offers **Tentar novamente**.

---

## Edge Cases

- WHEN the name holds exactly 50 characters after trimming THEN the system SHALL send the create or edit.  <!-- FLP-33 -->
- WHEN the name has leading or trailing spaces THEN the system SHALL send and show it trimmed.  <!-- FLP-34 -->
- WHEN a delete leaves no labels THEN the system SHALL show the empty state of FLP-04.  <!-- FLP-35 -->
- WHEN a dialog closes THEN the system SHALL return focus to the button that opened it, or to **Nova etiqueta** after a delete.  <!-- FLP-36 -->
- WHILE a confirm or edit dialog is open for a label deleted on another device and the user confirms THEN the system SHALL follow FLP-32.  <!-- FLP-37 -->
- IF a created label is never applied THEN the system SHALL show "não usada", not hide it.  <!-- FLP-38 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Name 1–50 after trim, case-insensitive uniqueness, the fixed 10 colors (FLP-13, FLP-19, FLP-33, FLP-34) |
| Failure / partial-failure states | Rollback with doc §10 toasts (FLP-28–FLP-32); create keeps the dialog (FLP-29, FLP-30); load error (FLP-06) |
| Idempotency / retry / duplicate handling | Create button disabled in flight (FLP-15); one change per row (FLP-22); **Tentar novamente** repeats the same request (FLP-28, FLP-29) |
| Auth boundaries & rate limits | N/A because the session-expired handling of feature `foundation` covers every request and labels have no extra permission rule |
| Concurrency / ordering | Name taken elsewhere (FLP-30); label or board changed elsewhere (FLP-31, FLP-32, FLP-37); one change per row (FLP-22) |
| Data lifecycle / expiry | Delete strips the label from every card (FLP-25); dialog text lives only while it is open (FLP-17) |
| Observability | N/A because the front-end has no client logging or metrics (foundation) |
| External-dependency failure | API unreachable → FLP-06, FLP-28, FLP-29 |
| State-transition integrity | Editable vs archived board (FLP-27, FLP-31); edit vs delete in flight (FLP-22) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FLP-01 | P1: See the board's labels | Design | Pending |
| FLP-02 | P1: See the board's labels | Design | Pending |
| FLP-03 | P1: See the board's labels | Design | Pending |
| FLP-04 | P1: See the board's labels | Design | Pending |
| FLP-05 | P1: See the board's labels | Design | Pending |
| FLP-06 | P1: See the board's labels | Design | Pending |
| FLP-07 | P1: See the board's labels | Design | Pending |
| FLP-08 | P1: See the board's labels | Design | Pending |
| FLP-09 | P1: See the board's labels | Design | Pending |
| FLP-10 | P1: Create a label | Design | Pending |
| FLP-11 | P1: Create a label | Design | Pending |
| FLP-12 | P1: Create a label | Design | Pending |
| FLP-13 | P1: Create a label | Design | Pending |
| FLP-14 | P1: Create a label | Design | Pending |
| FLP-15 | P1: Create a label | Design | Pending |
| FLP-16 | P1: Create a label | Design | Pending |
| FLP-17 | P1: Create a label | Design | Pending |
| FLP-18 | P1: Edit a label | Design | Pending |
| FLP-19 | P1: Edit a label | Design | Pending |
| FLP-20 | P1: Edit a label | Design | Pending |
| FLP-21 | P1: Edit a label | Design | Pending |
| FLP-22 | P1: Edit a label | Design | Pending |
| FLP-23 | P1: Delete a label | Design | Pending |
| FLP-24 | P1: Delete a label | Design | Pending |
| FLP-25 | P1: Delete a label | Design | Pending |
| FLP-26 | P1: Delete a label | Design | Pending |
| FLP-27 | P2: Failures and read-only mode | Design | Pending |
| FLP-28 | P2: Failures and read-only mode | Design | Pending |
| FLP-29 | P2: Failures and read-only mode | Design | Pending |
| FLP-30 | P2: Failures and read-only mode | Design | Pending |
| FLP-31 | P2: Failures and read-only mode | Design | Pending |
| FLP-32 | P2: Failures and read-only mode | Design | Pending |
| FLP-33 | Edge cases | Design | Pending |
| FLP-34 | Edge cases | Design | Pending |
| FLP-35 | Edge cases | Design | Pending |
| FLP-36 | Edge cases | Design | Pending |
| FLP-37 | Edge cases | Design | Pending |
| FLP-38 | Edge cases | Design | Pending |

**Coverage:** 38 total, 0 mapped to tasks, 38 unmapped (tasks come after design)

---

## Success Criteria

- [ ] A user creates, renames, recolors and deletes a label on the page, and the board tiles, the card detail and the label filter agree when the board opens again, with no reload.
- [ ] The number in "usada em N tarefas" and in the delete dialog equals the number of cards, active and archived, that lose the label.
- [ ] Every failure path of FLP-28–FLP-32 leaves the screen matching the server after the toast.
- [ ] An archived board offers no write control on the page.
