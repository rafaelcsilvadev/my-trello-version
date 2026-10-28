# Board Drag and Drop Specification

## Problem Statement

The board screen (feature `board`, 3a) shows columns and cards in API order, but the user cannot change that order: a card stays in the column and position where it was created, and columns stay in creation order. Feature `board-dnd` (3b) adds the moves of the prototype (doc §6 "Arrastar com o mouse", "Arrastar com o teclado", "Arrastar colunas e itens com o teclado", "Celular"): drag cards and columns with the mouse, move them with the keyboard with a live region, and move a card through the card menu "Mover para…", which is also the way to move a card on a phone.

## Goals

- [ ] A user drags a card from "To do" to the second position of "Doing" with the mouse; after a reload the card is still there.
- [ ] A keyboard-only user picks a card with Space, moves it with the arrows, drops it with Space, and hears every step from the live region.
- [ ] A user reorders the columns of a board by dragging a column header, with the mouse or the keyboard.
- [ ] A phone user moves a card to another column through "Mover para…".
- [ ] A failed move puts the card or column back where it was and shows a toast.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Reordering checklist items (doc §6 "Itens do checklist") | The checklist renders only in the card detail; feature `card-detail` (4) ships it with its reorder (user choice) |
| "Mover para…" in the card detail footer | Feature `card-detail` (4); it reuses the dialog of this feature |
| Turning drag off while a search or filter is active, and the notice "Arrastar fica desativado enquanto há filtros" | Feature `board-filters` (3c) |
| Touch drag (long press) on phones and tablets | User choice: touch users move cards with "Mover para…"; touch drag would fight the snap scroll of the phone layout |
| Moving a card to another board | The API moves a card only between lists of its own board (`MoveCardDto.listId`) |
| Dragging archived columns, archived cards or the virtual column "Arquivadas" | Doc §6: the virtual column and its cards are read-only; archived columns only offer Restaurar and Excluir |
| The shortcuts dialog row for Espaço | Feature `settings` (6) |
| "Desfazer" on toasts | Doc §1 and §12 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Card move request | `POST /api/v1/cards/{id}/move` with `position` = the card's index among the other active cards of the target column, and `listId` only when the column changes | API contract (`MoveCardDto`); the API keeps active positions contiguous `0..n-1` per list (back-end cards spec) | y |
| Column move request | `POST /api/v1/lists/{id}/move` with `position` = the column's index among the other active columns | API contract (`MoveListDto`); archived columns have `position` `null` | y |
| Drop on the starting place | Sends no request, shows no toast, and the live region still announces the drop | Prototype `Task List.dc.html:949` moves only when the column or index changed; avoids empty writes | y |
| Optimistic moves | Every move (mouse, keyboard, "Mover para…") is optimistic (FE-AD-009, FE-AD-010): the card or column is placed at its new spot at once and put back at its old spot on failure | FE-AD-009 | y |
| Card move fails (network or `5xx`) | Toast "Não foi possível mover a tarefa" with **Tentar novamente**, which sends the same move again | User choice: doc §6 text plus the FE-AD-009 retry | y |
| Column move fails (network or `5xx`) | Toast "Não foi possível salvar. Tente novamente." with **Tentar novamente** | Doc §6 has no column-specific text; FE-AD-009 default | y |
| `409` on a move | Put back, toast "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches every board query | Doc §10, FE-AD-009 | y |
| `404` on a move | Put back, toast "Não foi possível salvar. Tente novamente." without a button, refetch every board query | FE-AD-009 | y |
| "Mover para…" target position | The end of the chosen column | Prototype `Task List.dc.html:1145` | y |
| "Mover para…" on the current column | Closes the dialog and sends nothing | Prototype `Task List.dc.html:1145` | y |
| "Mover para…" success toast | "Tarefa movida para {col}"; mouse and keyboard moves show no success toast | Prototype `Task List.dc.html:1145`; doc §12 lists no toast for drag | y |
| Card menu (…) | Shown on every active card of an active board at every width, with one item "Mover para…" | Doc §6 "Card"; `board` left the menu to this feature | y |
| Touch | No touch drag; mouse drag works at every width | User choice | y |
| Keyboard model | Doc §6 table: Space picks; ↑ ↓ change the position; ← → change the column (cards) or the position (columns); Space or Enter drops; Esc cancels | Doc §6; prototype `Task List.dc.html:942-952` | y |
| ↑ ↓ ← → at an edge | The move stays where it is; nothing wraps | Prototype `Task List.dc.html:944-946` | y |
| ← → index | The card keeps its index in the new column, capped at the number of active cards already there | Prototype `Task List.dc.html:946` | y |
| Focus | The picked card or column header keeps focus while it moves, after the drop and after a cancel | Prototype `focusCard` after every key | y |
| Column keyboard handle | The column header is focusable with the accessible name "Coluna {name}. Espaço para mover"; Space on the header itself picks the column, Space on the name button inside it still starts the rename | Prototype `Task List.dc.html:386`, `:1092` (`e.target !== e.currentTarget`) | y |
| Space on the card checkbox | Toggles done (FBV-31) and does not pick the card | Only Space on the card itself picks it | y |
| Banner while moving with the keyboard | Above the columns: "Movendo “{title}”: {col}, posição {i} de {n}. Setas movem, Espaço solta, Esc cancela." for a card, "Movendo a coluna “{name}”: posição {i} de {n}. ← → movem, Espaço solta, Esc cancela." for a column | Prototype `Task List.dc.html:355-356`, i18n `kbdActive`, `kbdColActive` | y |
| Live region | One `role="status"` `aria-live="assertive"` region, visually hidden | Prototype `Task List.dc.html:801` | y |
| `{n}` in texts | The number of active cards in the column counting the moved card (cards) or the number of active columns (columns); `{i}` is 1-based | Prototype `Task List.dc.html:940`, `:1201` | y |
| Keyboard help line | "Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela" below the board, only at `md` and up, on an active board with at least one active column, while no keyboard move is in progress | Prototype `Task List.dc.html:1202` (`showKbdHelp`) | y |
| One change per item | A card or column with a request in flight cannot be picked, dragged or moved through the menu | Same rule as FBV-58 | y |
| A move while another one is in flight | A different card or column can be moved; each failure puts back only its own item (FE-AD-010) | FE-AD-010 | y |
| Rename field open | A column whose name is being edited cannot be dragged or picked | Prototype `Task List.dc.html:1088` | y |
| One keyboard move at a time | While a card or column is picked, Space on another card or header does nothing until the drop or cancel | Prototype `headDrag` requires `!s.kbd && !s.kbdCol` | y |
| Phone layout and ← → | ← → scroll the target column into view | Prototype `scrollToCol` in `Task List.dc.html:946` | y |
| Texts | Every label, banner, announcement, toast and dialog text comes from i18n keys with the PT-BR and EN texts of `design/i18n.js` | Foundation i18n rule (FE-AD-004) | y |
| Library for drag and drop | Decided at Design | Spec states behavior only | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Move cards with the mouse ⭐ MVP

**User Story**: As a logged-in user, I want to drag a card to another position or column so that the board shows the real state of my work.

**Why P1**: Moving cards between columns is the main reason to use a board.

**Acceptance Criteria**:

1. WHILE the board is active, the system SHALL let the user drag every active card of an active column with the mouse.  <!-- FDND-01 -->
2. WHILE a card is being dragged, the system SHALL show the source card dashed and translucent, a dashed purple outline on the column under the pointer, and a dashed placeholder at the spot where the card will land.  <!-- FDND-02 -->
3. WHEN the user drops a card in another column THEN the system SHALL place it at the placeholder spot and send `POST /api/v1/cards/{id}/move` with that column's id as `listId` and the card's index among the other active cards there as `position`.  <!-- FDND-03 -->
4. WHEN the user drops a card at another position of its own column THEN the system SHALL place it there and send `POST /api/v1/cards/{id}/move` with the new index as `position` and no `listId`.  <!-- FDND-04 -->
5. WHEN the user drops a card on an empty column THEN the system SHALL place it as that column's only card and send `position` `0` with that column's `listId`.  <!-- FDND-05 -->
6. WHEN a card moves to another column THEN the system SHALL update the card counter of both column headers.  <!-- FDND-06 -->
7. WHEN the user drops a card back on its starting spot or outside every column THEN the system SHALL leave the card where it was and send no request.  <!-- FDND-07 -->

**Independent Test**: On "Product launch", drag a card from "To do" to the second spot of "Doing"; the card shows there at once, the counters change, and after a reload it is still the second card of "Doing".

---

### P1: Move cards with the keyboard ⭐ MVP

**User Story**: As a keyboard or screen-reader user, I want to move a card with the keys so that I can organize a board without a mouse.

**Why P1**: Doc §6 makes every drag reachable by keyboard; the app targets WCAG (doc §11).

**Acceptance Criteria**:

1. The system SHALL make every active card of an active board focusable with a visible purple focus outline.  <!-- FDND-08 -->
2. WHEN the user presses Space on a focused card THEN the system SHALL pick it: the card shows lifted, the banner "Movendo “{title}”: {col}, posição {i} de {n}. Setas movem, Espaço solta, Esc cancela." shows above the columns, and the live region announces "Tarefa {title}, coluna {col}, posição {i} de {n}".  <!-- FDND-09 -->
3. WHILE a card is picked, WHEN the user presses ↑ or ↓ THEN the system SHALL move it one position up or down in its column, stopping at the first and last position.  <!-- FDND-10 -->
4. WHILE a card is picked, WHEN the user presses ← or → THEN the system SHALL move it to the previous or next active column at the same index, capped at the number of active cards there, stopping at the first and last column.  <!-- FDND-11 -->
5. WHILE a card is picked, WHEN it changes position or column THEN the system SHALL update the banner and announce "Tarefa {title}, coluna {col}, posição {i} de {n}" in the live region.  <!-- FDND-12 -->
6. WHILE a card is picked, WHEN the user presses Space or Enter THEN the system SHALL drop it, announce "Tarefa {title} solta em {col}, posição {i} de {n}", hide the banner and, when the column or index changed, send the move of FDND-03 or FDND-04.  <!-- FDND-13 -->
7. WHILE a card is picked, WHEN the user presses Esc THEN the system SHALL put it back at its starting spot, announce "Movimento cancelado", hide the banner and send no request.  <!-- FDND-14 -->
8. WHILE a card is picked and after it is dropped or cancelled, the system SHALL keep keyboard focus on that card.  <!-- FDND-15 -->
9. WHEN the user presses Space on a card's done checkbox THEN the system SHALL toggle the done flag (FBV-31) and SHALL NOT pick the card.  <!-- FDND-16 -->
10. WHILE the viewport is at least `md`, the board is active, it has at least one active column and no keyboard move is in progress, the system SHALL show below the board the help line "Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela".  <!-- FDND-17 -->
11. WHILE a card is picked on the phone layout, WHEN it changes column THEN the system SHALL scroll that column into view.  <!-- FDND-18 -->

**Independent Test**: Tab to a card in "To do", press Space, →, ↓, Space; the card ends at position 2 of "Doing", the live region read every step, focus is on the card, and a reload keeps it there.

---

### P1: Reorder columns ⭐ MVP

**User Story**: As a logged-in user, I want to reorder the columns of a board so that they follow my workflow.

**Why P1**: Doc §6 lists column reordering among the board's core moves.

**Acceptance Criteria**:

1. WHILE the board is active, the system SHALL let the user drag every active column by its header with the mouse, and show where it will land while dragging.  <!-- FDND-19 -->
2. WHEN the user drops a column at another position THEN the system SHALL place it there and send `POST /api/v1/lists/{id}/move` with its index among the other active columns as `position`.  <!-- FDND-20 -->
3. The system SHALL make the header of every active column of an active board focusable with the accessible name "Coluna {name}. Espaço para mover".  <!-- FDND-21 -->
4. WHEN the user presses Space on a focused column header THEN the system SHALL pick the column, show the banner "Movendo a coluna “{name}”: posição {i} de {n}. ← → movem, Espaço solta, Esc cancela." and announce "Coluna {name}, posição {i} de {n}".  <!-- FDND-22 -->
5. WHILE a column is picked, WHEN the user presses ← or → THEN the system SHALL move it one position left or right, stopping at the ends, and announce "Coluna {name}, posição {i} de {n}".  <!-- FDND-23 -->
6. WHILE a column is picked, WHEN the user presses Space or Enter THEN the system SHALL drop it, announce "Coluna {name} solta na posição {i} de {n}", hide the banner and, when the index changed, send the move of FDND-20.  <!-- FDND-24 -->
7. WHILE a column is picked, WHEN the user presses Esc THEN the system SHALL put it back, announce "Movimento cancelado", hide the banner and send no request.  <!-- FDND-25 -->
8. WHEN the user presses Space on the column name button THEN the system SHALL start the rename (FBV-18) and SHALL NOT pick the column.  <!-- FDND-26 -->
9. WHILE a column's rename field is open, the system SHALL NOT let the user drag or pick that column.  <!-- FDND-27 -->
10. WHEN the user drops a column on its starting position THEN the system SHALL send no request.  <!-- FDND-28 -->

**Independent Test**: Drag "Done" in front of "To do"; the columns reorder at once and keep that order after a reload. Then focus the "Done" header, press Space, →, Space; it moves one place right.

---

### P1: Move a card with "Mover para…" ⭐ MVP

**User Story**: As a phone user, I want to send a card to another column from its menu so that I can move cards without dragging.

**Why P1**: It is the only way to move a card on a phone (doc §6 "Celular").

**Acceptance Criteria**:

1. WHILE the board is active, the system SHALL show on every active card a menu button (…) labelled "Mover para…" whose only item is "Mover para…".  <!-- FDND-29 -->
2. WHEN the user chooses "Mover para…" THEN the system SHALL open a dialog titled "Mover para…" with the card title in quotes as its description and one option per active column in board order, the current column marked "Atual" with a check.  <!-- FDND-30 -->
3. WHEN the user chooses another column in the dialog THEN the system SHALL close the dialog, place the card at the end of that column, send `POST /api/v1/cards/{id}/move` with that `listId` and `position` equal to the number of active cards there, and show the toast "Tarefa movida para {col}".  <!-- FDND-31 -->
4. WHEN the user chooses the current column THEN the system SHALL close the dialog and send no request.  <!-- FDND-32 -->
5. WHEN the user presses Esc or the close button in the dialog THEN the system SHALL close it with no move.  <!-- FDND-33 -->
6. WHEN a card's menu opens THEN choosing an item or closing the menu SHALL NOT pick or open the card.  <!-- FDND-34 -->

**Independent Test**: At 375 px, open the menu of a card in "To do", choose "Mover para…", pick "Done"; the toast reads "Tarefa movida para Done" and the card is the last of "Done" after a reload.

---

### P1: Failed and blocked moves ⭐ MVP

**User Story**: As a user, I want a failed move to be undone on screen so that the board never shows an order the server rejected.

**Why P1**: Every move is optimistic (FE-AD-009); without this the screen can lie.

**Acceptance Criteria**:

1. IF a card move fails with a network error or `5xx` THEN the system SHALL put the card back at its old column and index and show the toast "Não foi possível mover a tarefa" with **Tentar novamente**, which sends the same move again.  <!-- FDND-35 -->
2. IF a column move fails with a network error or `5xx` THEN the system SHALL put the column back at its old index and show the toast "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which sends the same move again.  <!-- FDND-36 -->
3. IF a move fails with `409` THEN the system SHALL put the item back and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**, which refetches every board query.  <!-- FDND-37 -->
4. IF a move fails with `404` THEN the system SHALL put the item back, show "Não foi possível salvar. Tente novamente." without a button and refetch every board query.  <!-- FDND-38 -->
5. IF two moves are in flight and one fails THEN the system SHALL put back only the failed item and keep the other move on screen.  <!-- FDND-39 -->
6. WHILE a card or column has a request in flight, the system SHALL NOT let the user drag it, pick it or open its "Mover para…".  <!-- FDND-40 -->
7. WHILE a card or column is picked with the keyboard, the system SHALL ignore Space on any other card or column header.  <!-- FDND-41 -->
8. WHILE the board is archived, the system SHALL render no draggable card or column, no focusable column header handle, no card menu, and no keyboard help line.  <!-- FDND-42 -->
9. The system SHALL NOT let the user drag or pick the virtual column "Arquivadas", its cards, or the archived columns section, and SHALL NOT accept a drop on them.  <!-- FDND-43 -->

**Independent Test**: With the API stopped, drag a card to another column; it returns to its old spot and the toast offers Tentar novamente. Open an archived board: no card has a menu and nothing can be dragged.

---

## Edge Cases

- WHEN a column has no active cards THEN it SHALL still accept a dropped card and show "Arraste cards para cá" until it does (FDND-05).
- WHEN the board has one active column THEN ← and → on a picked card SHALL keep it in place (FDND-11), and ← → on a picked column SHALL keep it in place (FDND-23).
- WHEN "Mostrar arquivadas" is on THEN active cards and columns SHALL still move, and the virtual column and archived section SHALL stay out of every drag (FDND-43).
- WHEN the board has only one active column THEN the dialog "Mover para…" SHALL list it as "Atual" and choosing it SHALL send nothing (FDND-32).
- IF a card is moved and then archived from another device THEN the next move SHALL fail with `409` and follow FDND-37.
- IF a `401` arrives on a move THEN the foundation session-expiry flow runs (FND-16) and no move toast shows.

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Positions are computed by the client from the visible order and capped at the ends (FDND-10, FDND-11, FDND-23); `listId` is always an active column of the same board (FDND-03, FDND-31) |
| Failure / partial-failure states | FDND-35–FDND-39 |
| Idempotency / retry / duplicate handling | No request for a drop on the starting spot (FDND-07, FDND-28, FDND-32); Tentar novamente resends the same move (FDND-35, FDND-36); one request per item at a time (FDND-40) |
| Auth boundaries & rate limits | Every request carries the token; `401` goes through FND-16; foreign ids answer `404` (FDND-38). No rate limit on move endpoints |
| Concurrency / ordering | Several items may move at once; each failure reverts only its item (FDND-39, FE-AD-010); one keyboard move at a time (FDND-41); changes from another device surface as `409`/`404` (FDND-37, FDND-38) |
| Data lifecycle / expiry | N/A because moves do not create, archive or delete anything |
| Observability | N/A because the web client has no logging or metrics pipeline; failures are shown to the user |
| External-dependency failure | The API is the only dependency: FDND-35, FDND-36 |
| State-transition integrity | Archived board, archived columns and archived cards never move (FDND-42, FDND-43); a column being renamed never moves (FDND-27) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FDND-01 | P1: Move cards with the mouse | - | Pending |
| FDND-02 | P1: Move cards with the mouse | - | Pending |
| FDND-03 | P1: Move cards with the mouse | - | Pending |
| FDND-04 | P1: Move cards with the mouse | - | Pending |
| FDND-05 | P1: Move cards with the mouse | - | Pending |
| FDND-06 | P1: Move cards with the mouse | - | Pending |
| FDND-07 | P1: Move cards with the mouse | - | Pending |
| FDND-08 | P1: Move cards with the keyboard | - | Pending |
| FDND-09 | P1: Move cards with the keyboard | - | Pending |
| FDND-10 | P1: Move cards with the keyboard | - | Pending |
| FDND-11 | P1: Move cards with the keyboard | - | Pending |
| FDND-12 | P1: Move cards with the keyboard | - | Pending |
| FDND-13 | P1: Move cards with the keyboard | - | Pending |
| FDND-14 | P1: Move cards with the keyboard | - | Pending |
| FDND-15 | P1: Move cards with the keyboard | - | Pending |
| FDND-16 | P1: Move cards with the keyboard | - | Pending |
| FDND-17 | P1: Move cards with the keyboard | - | Pending |
| FDND-18 | P1: Move cards with the keyboard | - | Pending |
| FDND-19 | P1: Reorder columns | - | Pending |
| FDND-20 | P1: Reorder columns | - | Pending |
| FDND-21 | P1: Reorder columns | - | Pending |
| FDND-22 | P1: Reorder columns | - | Pending |
| FDND-23 | P1: Reorder columns | - | Pending |
| FDND-24 | P1: Reorder columns | - | Pending |
| FDND-25 | P1: Reorder columns | - | Pending |
| FDND-26 | P1: Reorder columns | - | Pending |
| FDND-27 | P1: Reorder columns | - | Pending |
| FDND-28 | P1: Reorder columns | - | Pending |
| FDND-29 | P1: Move a card with "Mover para…" | - | Pending |
| FDND-30 | P1: Move a card with "Mover para…" | - | Pending |
| FDND-31 | P1: Move a card with "Mover para…" | - | Pending |
| FDND-32 | P1: Move a card with "Mover para…" | - | Pending |
| FDND-33 | P1: Move a card with "Mover para…" | - | Pending |
| FDND-34 | P1: Move a card with "Mover para…" | - | Pending |
| FDND-35 | P1: Failed and blocked moves | - | Pending |
| FDND-36 | P1: Failed and blocked moves | - | Pending |
| FDND-37 | P1: Failed and blocked moves | - | Pending |
| FDND-38 | P1: Failed and blocked moves | - | Pending |
| FDND-39 | P1: Failed and blocked moves | - | Pending |
| FDND-40 | P1: Failed and blocked moves | - | Pending |
| FDND-41 | P1: Failed and blocked moves | - | Pending |
| FDND-42 | P1: Failed and blocked moves | - | Pending |
| FDND-43 | P1: Failed and blocked moves | - | Pending |

**Coverage:** 43 total, 0 mapped to tasks, 43 unmapped ⚠️ (mapped at Tasks)

---

## Success Criteria

- [ ] Every move path (mouse, keyboard, "Mover para…") persists: after a reload the board shows the same order.
- [ ] A keyboard-only user completes a card move and a column move without a mouse, and each step is announced.
- [ ] Zero moves leave the screen out of sync with the server after a failure.
- [ ] The Verifier marks all FDND requirements met with discriminating tests.
