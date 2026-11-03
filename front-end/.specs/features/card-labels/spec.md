# Card Labels Specification

## Problem Statement

The card detail (feature `card-detail`, 4a) shows the labels applied to a card as read-only chips (FCD-29). The user cannot tag a card from the web: applying "Bug" or "Urgent" needs the API by hand, and the board label filter (3c) has nothing new to filter on. Feature `card-labels` (4c) adds the label popover of the prototype (doc §7): the "+" button next to the chips opens a popover with a search field, the board's labels to check and uncheck, **Criar etiqueta** (name + one of the 10 colors, applied to the card at once) and the link **Gerenciar etiquetas** to `/b/{boardId}/labels`. Editing and deleting labels is feature `labels` (5).

## Goals

- [ ] A user opens a card, clicks "+", checks "Bug" and sees the chip on the detail and on the board tile at once, without a reload.
- [ ] A user creates a label from the popover and finds it applied to the open card and listed in the board label filter.
- [ ] A failed apply, remove or create leaves the screen as it was before and tells the user with the doc §10 toasts.
- [ ] An archived card or a card of an archived board shows its labels with no "+" button.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Labels page (`/b/{boardId}/labels`): list, "usada em N tarefas", edit, delete | Feature `labels` (5); this feature only links to the route, which still renders the foundation placeholder |
| Rename, recolor or delete a label from the popover | Not in the prototype popover; feature `labels` (5) |
| The board header menu entry **Etiquetas do quadro** | Feature `labels` (5) |
| Applying labels from the board tile or in bulk | Not in the prototype |
| Reordering labels or applied labels | Labels follow board label order (`createdAt`, then `id`) everywhere |
| Label limit per board or per card | Back-end `labels` spec: no limit (personal scale) |
| The shortcuts dialog row for Esc | Feature `settings` (6) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where the "+" sits | An icon button with a plus icon, accessible name "Adicionar etiqueta", after the applied chips in the Etiquetas field of the detail; it shows the pressed state while the popover is open | Prototype `toggleLabelPop` button (`design/Task List.dc.html:656`); doc §13 every icon-only button has a label | y |
| Popover shape | A non-modal popover anchored below the Etiquetas field, `role="dialog"` with accessible name "Etiquetas", with, in order: the search field, the label list, a separator, **Criar etiqueta** (or the create form), and the link **Gerenciar etiquetas**. The same popover on desktop and phone, never wider than the detail | Prototype markup lines 658–683 | y |
| Label list roles | Each label is a checkbox (`role="checkbox"`, `aria-checked`) whose accessible name is the label name, showing a check box and the label chip | The prototype uses `menuitemcheckbox` inside a `dialog`, which is invalid ARIA outside a `menu`; doc §13 reserves `menuitemcheckbox` for the board label filter | y |
| Label list order and content | Every label of the board, in board label order (`GET /boards/{boardId}/labels`), checked when its id is in the card's `labelIds` | Back-end ordering `createdAt`, then `id`; FCD-29 order | y |
| Search | The search field gets focus when the popover opens, placeholder and accessible name "Buscar etiquetas…". The list shows labels whose name contains the trimmed query, ignoring case and accents, with the same normalization as the board search (FBF). No match → "Nenhuma etiqueta encontrada". An empty query shows every label | Prototype `lpItems` (`norm(l.name).includes(lq)`); reuses the board-filters normalization | y |
| Board with no labels | The list shows "Nenhuma etiqueta encontrada"; **Criar etiqueta** and **Gerenciar etiquetas** stay available | Prototype `lpEmpty` | y |
| Apply / remove | Clicking a label (or Space on its checkbox) toggles it at once: optimistic `PUT /cards/{id}/labels/{labelId}` to apply or `DELETE` to remove; no toast. The popover stays open | FE-AD-009 toggle; detail saves are silent (FCD rule); the prototype keeps the popover open | y |
| A label with a change in flight | Its checkbox stays disabled until that change settles; other labels stay enabled | FBV-58 pattern: one change per item at a time, so a fast double click never races itself | y |
| Caches on apply / remove | The card's `labelIds` change in the card query and in the active card list, keeping board label order, so the detail chips, the board tile chips and the board label filter results agree without a reload | FE-AD-013: one cache for the detail and the board; FCD-52 | y |
| Create form | **Criar etiqueta** replaces itself with a form: a name field (accessible name "Nome", placeholder "Ex.: Bug", prefilled with the search text, focused), the 10 colors as a `radiogroup` named "Cor" with one radio per color named by its color name, a **Criar** button and a cancel icon button "Cancelar". Default color: `blue`. Enter in the name field submits | Prototype `startLpNew` (name from `lpQ`, color `blue`); doc §13 colors are a `radiogroup` with each color's name | y |
| Color order and names | Doc §8 order: Roxo, Azul, Céu, Verde, Lima, Amarelo, Laranja, Vermelho, Rosa, Preto (EN: Purple, Blue, Sky, Green, Lime, Yellow, Orange, Red, Pink, Black), rendered with the existing `LabelChip` color classes | Doc §8 color table | y |
| Name validation | Trimmed name 1–50. Empty → "Dê um nome à etiqueta"; longer than 50 → "Use até 50 caracteres"; equal, ignoring case, to a label already in the board label list → "Já existe uma etiqueta com esse nome neste quadro". Nothing is sent while invalid. The message shows below the name field with `role="alert"`, the name field gets `aria-invalid="true"`, and typing clears it | Doc §8 errors; back-end LBL-03, LBL-05; prototype `labelErr` | y |
| Create is not optimistic, then applies | While `POST /boards/{boardId}/labels` is in flight the **Criar** button is disabled and Enter does nothing. On `201`: the label joins the board label list, the form closes, the search clears, the toast "Etiqueta criada" shows, and the new label is applied to the card through the apply of FCLB-04 | User choice (create and apply, as the prototype `createLabelFromPop`); FE-AD-009 create waits for the server id | y |
| Server name clash | A `409` `/problems/label-name-taken` on create (label created on another device) keeps the form and its text, shows "Já existe uma etiqueta com esse nome neste quadro" and refetches the board labels | Back-end LBL-05; same pattern as the board title server errors (FBV) | y |
| Manage labels link | **Gerenciar etiquetas** is a link to `/b/{boardId}/labels`. Following it closes the detail through the normal close path, so unsaved title, description or checklist edits still ask "Descartar alterações?" (FCD-42) | Prototype `manageLabels`; one navigation blocker for every close path (card-detail view-model) | y |
| Closing the popover | Esc, a click outside the popover, or the "+" button again closes it, drops the search text and the create form, and returns focus to "+" | Prototype `closeLabelPop`; doc §11 Esc closes the innermost layer | y |
| Esc order | An open dialog → the popover (Esc anywhere inside it, the create form included, closes the whole popover) → the detail (with the discard rule) | Doc §11 lists "menu/popover" as one layer; the prototype closes the popover and the form together | y |
| Unsaved edits | Text in the search field or the create form does not count as an unsaved edit and is dropped on close | Prototype `dirty()` counts title, description and the item being edited only (doc §7) | y |
| Read-only modes | Archived card and card of an archived board: the chips show, the "+" button does not | Prototype `sc-if d.active`; FCD-34, FCD-40 | y |
| Board labels loading | The detail already waits for the board labels (`useLabels` in the detail queries), so the popover never shows a loading state | Current `useCardDetailViewModel`; FCD load states | y |
| Failure of apply / remove | Undo the check on screen and show the FCD-47/FCD-48 toasts. A `404` (card, or label deleted on another device) shows "Não foi possível salvar. Tente novamente." and refetches the board view, so a deleted label leaves the list and a deleted card shows "Esta tarefa não existe mais" | Doc §10; FE-AD-009, FE-AD-010; back-end LBL-22, LBL-30 | y |
| Failure of create | Network error or `5xx`: the form keeps its text and color and shows "Não foi possível salvar. Tente novamente." with **Tentar novamente**. `409` `/problems/board-archived`: "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**. `404` board: "Não foi possível salvar. Tente novamente." and the board view refetches | Doc §10; back-end LBL-07, LBL-08 | y |
| Create succeeds, apply fails | The label stays on the board (it shows unchecked in the list) and the apply failure follows FCLB-17–FCLB-19; "Etiqueta criada" still shows | Two independent server writes; undoing the create would delete a label the user may want | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Apply and remove labels from the detail ⭐ MVP

**User Story**: As a board owner, I want to check and uncheck the board's labels on a card so that I can tag it without leaving the detail.

**Why P1**: Applying labels is the reason the popover exists; without it the label filter (3c) is fed only by the seed.

**Acceptance Criteria**:

1. WHILE the detail is editable the system SHALL show, after the applied label chips, an icon button labelled "Adicionar etiqueta" with a plus icon.  <!-- FCLB-01 -->
2. WHEN the user activates "Adicionar etiqueta" THEN the system SHALL open a popover with `role="dialog"` and accessible name "Etiquetas", set the button's pressed state, and move focus to the field labelled "Buscar etiquetas…".  <!-- FCLB-02 -->
3. The system SHALL list in the popover every label of the board in board label order, each as a checkbox named by the label name that shows the label chip, checked exactly when the card's `labelIds` hold its id.  <!-- FCLB-03 -->
4. WHEN the user checks an unchecked label THEN the system SHALL send `PUT /api/v1/cards/{id}/labels/{labelId}` and at once show it checked and show its chip in the detail and on the board tile, in board label order.  <!-- FCLB-04 -->
5. WHEN the user unchecks a checked label THEN the system SHALL send `DELETE /api/v1/cards/{id}/labels/{labelId}` and at once show it unchecked and remove its chip from the detail and from the board tile.  <!-- FCLB-05 -->
6. WHILE an apply or remove of a label is in flight the system SHALL mark that label's checkbox pending, ignore its toggles and keep it focusable, and keep the other labels enabled.  <!-- FCLB-06 -->
7. WHEN an apply or remove succeeds THEN the system SHALL keep the popover open and show no toast.  <!-- FCLB-07 -->
8. WHEN the user presses Esc inside the popover, clicks outside it, or activates "Adicionar etiqueta" again THEN the system SHALL close the popover, keep the detail open, and return focus to "Adicionar etiqueta".  <!-- FCLB-08 -->

**Independent Test**: Open "Fix login on Safari" (Bug, Urgent), click "+", uncheck Urgent and check Feature; the chips read Bug, Feature in the detail and on the tile; Esc closes the popover and the detail stays open.

---

### P1: Search the board's labels ⭐ MVP

**User Story**: As a board owner with many labels, I want to type part of a label name so that I find it without scrolling.

**Why P1**: The search field is the first control of the popover and holds focus on open; the create form takes its text.

**Acceptance Criteria**:

1. WHEN the user types in "Buscar etiquetas…" THEN the system SHALL list only the labels whose name contains the trimmed query, ignoring case and accents, in board label order.  <!-- FCLB-09 -->
2. IF no label matches the query, or the board has no labels, THEN the system SHALL show "Nenhuma etiqueta encontrada" in place of the list.  <!-- FCLB-10 -->
3. WHEN the popover closes THEN the system SHALL clear the search, so the next open lists every label.  <!-- FCLB-11 -->

**Independent Test**: With Bug, Feature, Design, Urgent, type "ur" → only Urgent; type "zzz" → "Nenhuma etiqueta encontrada"; close and reopen → four labels.

---

### P1: Create a label from the popover ⭐ MVP

**User Story**: As a board owner, I want to create a missing label right from the card so that I can tag it in one flow.

**Why P1**: Without it, a new board has no labels to apply until feature `labels` (5) ships.

**Acceptance Criteria**:

1. WHEN the user activates **Criar etiqueta** THEN the system SHALL replace it with a form holding a name field labelled "Nome" prefilled with the search text and focused, a `radiogroup` labelled "Cor" with the 10 colors in doc §8 order each named by its color name with `blue` ("Azul") selected, a **Criar** button and an icon button "Cancelar".  <!-- FCLB-12 -->
2. WHEN the user submits the form (**Criar** or Enter in the name field) with a valid name THEN the system SHALL send `POST /api/v1/boards/{boardId}/labels` with the trimmed `name` and the selected `color`, and disable **Criar** until the response arrives.  <!-- FCLB-13 -->
3. WHEN the create returns `201` THEN the system SHALL add the label to the board label list, close the form, clear the search, show the toast "Etiqueta criada", and apply the new label to the card as in FCLB-04.  <!-- FCLB-14 -->
4. IF the trimmed name is empty THEN the system SHALL show "Dê um nome à etiqueta"; IF it is longer than 50 characters THEN the system SHALL show "Use até 50 caracteres"; IF it equals, ignoring case, the name of a label in the board label list THEN the system SHALL show "Já existe uma etiqueta com esse nome neste quadro"; in all three cases with `role="alert"`, the name field with `aria-invalid="true"`, and no request sent.  <!-- FCLB-15 -->
5. WHEN the user activates "Cancelar" THEN the system SHALL close the form without a request, drop its name, color and error, and show **Criar etiqueta** again.  <!-- FCLB-16 -->

**Independent Test**: In Personal (Home, Health), open "Buy groceries", type "Errands", **Criar etiqueta**, pick Laranja, Enter → "Etiqueta criada", Errands is checked in the list and its chip shows on the detail and the tile; the board label filter lists Errands.

---

### P2: Manage labels link and read-only modes

**User Story**: As a board owner, I want a way from the popover to the labels page, and no label controls on cards I cannot change.

**Why P2**: The link only reaches a placeholder until feature `labels` (5); read-only cards already hide every write control (FCD-34, FCD-40).

**Acceptance Criteria**:

1. WHEN the user activates the link **Gerenciar etiquetas** THEN the system SHALL navigate to `/b/{boardId}/labels`, through the detail's close path, so unsaved edits open "Descartar alterações?" first (FCD-42).  <!-- FCLB-20 -->
2. WHILE the card is archived or its board is archived the system SHALL show the applied label chips and SHALL NOT show "Adicionar etiqueta".  <!-- FCLB-21 -->

**Independent Test**: Edit the title, click **Gerenciar etiquetas** → discard dialog; **Descartar** → `/b/{boardId}/labels`. Open the archived "Translate the onboarding emails" → chips, no "+".

---

## Edge Cases

- IF an apply or remove fails with a network error or `5xx` THEN the system SHALL undo the check and the chips on screen and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which repeats the same request.  <!-- FCLB-17 -->
- IF an apply or remove returns `409` THEN the system SHALL undo the check and the chips on screen and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches the board view.  <!-- FCLB-18 -->
- IF an apply or remove returns `404` THEN the system SHALL undo the change, show "Não foi possível salvar. Tente novamente." and refetch the board view, so a label deleted on another device leaves the list and a deleted card shows "Esta tarefa não existe mais".  <!-- FCLB-19 -->
- IF the create fails with a network error or `5xx` THEN the system SHALL keep the form with its name and color and show "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which repeats the same create.  <!-- FCLB-22 -->
- IF the create returns `409` with type `/problems/label-name-taken` THEN the system SHALL keep the form with its text, show "Já existe uma etiqueta com esse nome neste quadro" below the name field and refetch the board labels.  <!-- FCLB-23 -->
- IF the create returns `409` with type `/problems/board-archived` THEN the system SHALL show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**.  <!-- FCLB-24 -->
- IF the create succeeds and the following apply fails THEN the system SHALL keep the new label in the board label list unchecked and handle the apply failure as FCLB-17–FCLB-19.  <!-- FCLB-25 -->
- WHEN the name holds exactly 50 characters after trimming THEN the system SHALL send the create.  <!-- FCLB-26 -->
- WHEN the user types in the name field after an error THEN the system SHALL clear the error and `aria-invalid`.  <!-- FCLB-27 -->
- WHEN the user closes the detail with text in the search field or the create form and no other unsaved edit THEN the system SHALL close without the discard dialog.  <!-- FCLB-28 -->
- WHILE the board label filter is active WHEN a label change makes the open card stop matching THEN the system SHALL keep the detail open; the tile leaves the filtered board behind it.  <!-- FCLB-29 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Name 1–50 after trim, case-insensitive uniqueness, color from the fixed 10 (FCLB-12, FCLB-15, FCLB-26, FCLB-27) |
| Failure / partial-failure states | Optimistic undo with doc §10 toasts (FCLB-17–FCLB-19); create keeps the form (FCLB-22–FCLB-24); create ok + apply failed (FCLB-25) |
| Idempotency / retry / duplicate handling | Apply/remove are idempotent on the server; one change per label at a time (FCLB-06); **Tentar novamente** repeats the same request (FCLB-17, FCLB-22); **Criar** disabled while in flight (FCLB-13) |
| Auth boundaries & rate limits | N/A because the session-expired handling of feature `foundation` covers every request and labels have no extra permission rule |
| Concurrency / ordering | Overlapping toggles on different labels roll back only their own change (FE-AD-010); label or card deleted elsewhere → `404` path (FCLB-19); name taken elsewhere → FCLB-23 |
| Data lifecycle / expiry | Search and create form live only while the popover is open (FCLB-11, FCLB-28) |
| Observability | N/A because the front-end has no client logging or metrics (foundation) |
| External-dependency failure | API unreachable → FCLB-17, FCLB-22 |
| State-transition integrity | Editable vs read-only card (FCLB-21); archived board on create → FCLB-24 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FCLB-01 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-02 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-03 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-04 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-05 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-06 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-07 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-08 | P1: Apply and remove labels | Tasks | Pending |
| FCLB-09 | P1: Search the board's labels | Tasks | Pending |
| FCLB-10 | P1: Search the board's labels | Tasks | Pending |
| FCLB-11 | P1: Search the board's labels | Tasks | Pending |
| FCLB-12 | P1: Create a label from the popover | Tasks | Pending |
| FCLB-13 | P1: Create a label from the popover | Tasks | Pending |
| FCLB-14 | P1: Create a label from the popover | Tasks | Pending |
| FCLB-15 | P1: Create a label from the popover | Tasks | Pending |
| FCLB-16 | P1: Create a label from the popover | Tasks | Pending |
| FCLB-17 | Edge cases | Tasks | Pending |
| FCLB-18 | Edge cases | Tasks | Pending |
| FCLB-19 | Edge cases | Tasks | Pending |
| FCLB-20 | P2: Manage labels link and read-only modes | Tasks | Pending |
| FCLB-21 | P2: Manage labels link and read-only modes | Tasks | Pending |
| FCLB-22 | Edge cases | Tasks | Pending |
| FCLB-23 | Edge cases | Tasks | Pending |
| FCLB-24 | Edge cases | Tasks | Pending |
| FCLB-25 | Edge cases | Tasks | Pending |
| FCLB-26 | Edge cases | Tasks | Pending |
| FCLB-27 | Edge cases | Tasks | Pending |
| FCLB-28 | Edge cases | Tasks | Pending |
| FCLB-29 | Edge cases | Tasks | Pending |

**Coverage:** 29 total, 29 mapped to tasks (T1–T15), 0 unmapped

---

## Success Criteria

- [ ] Applying or removing a label shows on the detail and on the board tile in the same frame as the click, with no reload.
- [ ] A label created from the popover is applied to the open card and appears in the board label filter without a reload.
- [ ] Every failure path of FCLB-17–FCLB-25 leaves the screen matching the server after the toast.
