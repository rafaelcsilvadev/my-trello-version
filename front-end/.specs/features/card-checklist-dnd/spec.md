# Card Checklist Drag and Drop Specification

## Problem Statement

The card detail (features `card-detail`, 4a, and `card-checklist`, 4b) shows the checklist items in API order, but the user cannot change that order: an item stays where it was added, at the end. Feature `card-checklist-dnd` (4b2) adds the reorder of the prototype (doc §7 "Itens podem ser … reordenados (arrastando ou pelo teclado na alça)", doc §6 "Arrastar colunas e itens com o teclado"): a grip handle on every item, mouse drag, and a keyboard move on the grip with a banner and a live region, following the board pattern of feature `board-dnd` (3b) and FE-AD-012.

## Goals

- [ ] A user drags the third item of a checklist to the first position with the mouse; after a reload the item is still first.
- [ ] A keyboard-only user focuses an item's grip, picks it with Space, moves it with ↑ ↓, drops it with Space, and hears every step from the live region.
- [ ] A failed move puts the item back where it was and shows a toast.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Reordering items by touch (long press) or through a menu on phones and tablets | User choice: no touch drag (FE-AD-012) and the prototype offers no menu for items; touch users keep the API order |
| Moving an item to another card | The API moves an item only inside its card (`MoveChecklistItemDto` has only `position`) |
| Reordering in the archived-card or archived-board mode | Doc §7: the fields are locked; FCL-31, FCL-32 |
| The shortcuts dialog row for Espaço on the grip | Feature `settings` (6) |
| "Desfazer" on toasts | Doc §1 and §12 |
| Changes to item add, edit, check or delete | Feature `card-checklist` (4b), done |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Move request | `POST /api/v1/checklist-items/{id}/move` with `position` = the item's index among the other items of the card, 0-based | API contract (`MoveChecklistItemDto`); back-end CHK-10 keeps positions contiguous `0..n-1` per card | y |
| Drop on the starting place | Sends no request and shows no toast; a keyboard drop still announces "Item {name} solto na posição {i} de {n}" | Prototype `Task List.dc.html:965` moves only when the index changed; back-end CHK-12 makes it a no-op anyway | y |
| Optimistic move | The item is placed at its new index at once and put back at its old index on failure; overlapping changes roll back only their own item | FE-AD-009, FE-AD-010 | y |
| Move fails (network or `5xx`) | Put back, toast "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which sends the same move again | User choice: FE-AD-009 default, same as FCL-34; doc has no item-specific text | y |
| `409` on a move | Put back, toast "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar** | Same path as FCL-35 | y |
| `404` on a move | Put back, toast "Não foi possível salvar. Tente novamente." without a button, and refetch the checklist | Same path as FCL-36 | y |
| Grip handle | A button with the `grip-vertical` icon (14 px) at the start of every item row, before the checkbox, with the accessible name "Reordenar o item {text}" (`{text}` = saved text), `cursor-grab`, and a visible purple focus outline | Prototype `Task List.dc.html:708`, i18n `reorderItem` | y |
| What the mouse drags | The whole item row is the drag source, started from the grip; dragging from the text field, checkbox or delete button does not start a drag, so text selection still works | The prototype makes the row `draggable`, which would take text selection away from the field; starting at the grip keeps the field usable | y |
| Mouse drag visuals | Same as the board (FDND-02): the source row is dashed and translucent and a dashed placeholder shows where the item will land | User choice: mirror `board-dnd` | y |
| Mouse drop target | Dropping above or below the middle of an item row places the item before or after it; dropping outside the list puts nothing and sends nothing | Same placeholder model as the board cards | y |
| Keyboard model | On the grip: Space picks; ↑ ↓ move one position; Space or Enter drops; Esc cancels. Nothing wraps at the ends | Doc §6 "Itens do checklist"; prototype `Task List.dc.html:961-966` | y |
| Banner while moving with the keyboard | Between the progress bar and the list, `role="status"`: "Movendo “{text}”: posição {i} de {n}. ↑ ↓ movem, Espaço solta, Esc cancela." | Prototype `Task List.dc.html:703`, i18n `kbdItemActive` | y |
| Picked row look | The picked row has the `bg-brand-soft` background | Prototype `cls` at `Task List.dc.html:1120` | y |
| Live region | One visually hidden `role="status"` `aria-live="assertive"` region inside the card detail dialog; the board's live region sits outside the modal dialog, where a screen reader does not read it | Doc §6 live region; the detail is a modal dialog | y |
| Announcements | Pick and each step: "Item {text}, posição {i} de {n}". Drop: "Item {text} solto na posição {i} de {n}". Esc: "Movimento cancelado" | i18n `kbdItemAnnounce`, `kbdItemDropped`, `kbdCancel` | y |
| `{i}` and `{n}` | `{i}` is the 1-based position; `{n}` is the number of items of the card | Prototype `itemAnnounce` | y |
| Focus | The grip of the picked item keeps focus while it moves, after the drop and after a cancel | Prototype `focusSel(sel)` after drop and cancel; FDND-15 | y |
| Esc while an item is picked | Cancels the move only; the detail stays open | Doc §11 Esc order: the innermost layer first; same as FCL-30 | y |
| Closing the detail while an item is picked | Click outside, the X or the browser back cancel the move with no request, then follow the normal close path | A picked item has no saved change to lose | y |
| One change per item | An item with a request in flight (toggle, delete, text save or move) cannot be picked or dragged; its grip is disabled | Same rule as FBV-58, FDND-40 and the card-checklist pending rule | y |
| One keyboard move at a time | While an item is picked, Space on another grip does nothing and no row can be dragged with the mouse | Prototype `onGripKey` requires `!this.state.kbdItem` | y |
| A move while another one is in flight | Another item can be moved; each failure puts back only its own item | FE-AD-010 | y |
| Item with an unsaved text draft | Can be moved; the draft stays in its field and still counts as an unsaved edit | Moving does not touch the text; focusing the grip blurs the text field, which saves it (FCL-18) | y |
| Single item | Its grip shows; Space picks it, ↑ ↓ keep it at position 1 of 1, and the drop sends nothing | Prototype bounds; back-end CHK-11, CHK-12 | y |
| Read-only modes | Archived card and card of an archived board: no grip and no draggable row | Doc §7; FCL-31, FCL-32 | y |
| Loading and error states | No grip while the checklist is loading or shows its load error; there are no items to show then | `card-checklist` load states | y |
| Board tile | A move does not change `card.checklist` (`total`, `done`), so the tile is not touched | Back-end CHK-18; the tile shows only the count | y |
| Texts | Every label, banner, announcement and toast text comes from i18n keys with the PT-BR and EN texts of `design/i18n.js` | FE-AD-004 i18n rule | y |
| Implementation of the keyboard state machine and drag handlers | Decided at Design, on the FE-AD-012 pattern | Spec states behavior only | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Reorder items with the mouse ⭐ MVP

**User Story**: As a logged-in user, I want to drag a checklist item to another position so that the steps read in the order I do them.

**Why P1**: Doc §7 lists reordering among the checklist item actions; mouse drag is the main way on a computer.

**Acceptance Criteria**:

1. WHILE the detail is in the editable mode and the checklist shows its items, the system SHALL show a grip button with the `grip-vertical` icon and the accessible name "Reordenar o item {text}" at the start of every item row.  <!-- FCLD-01 -->
2. WHEN the user starts a mouse drag on an item's grip THEN the system SHALL drag that item's row.  <!-- FCLD-02 -->
3. The system SHALL NOT start a drag when the user presses the mouse on an item's text field, checkbox or delete button.  <!-- FCLD-03 -->
4. WHILE an item is being dragged, the system SHALL show its source row dashed and translucent and a dashed placeholder at the spot where the item will land.  <!-- FCLD-04 -->
5. WHEN the user drops an item at another position THEN the system SHALL place it at the placeholder spot and send `POST /api/v1/checklist-items/{id}/move` with the item's index among the other items of the card as `position`.  <!-- FCLD-05 -->
6. WHEN the user drops an item back on its starting spot or outside the list THEN the system SHALL leave the item where it was and send no request.  <!-- FCLD-06 -->

**Independent Test**: Open a card with items "A", "B", "C"; drag "C" by its grip above "A"; the list reads "C", "A", "B" at once, the request carries `position` `0`, and after a reload the order is the same.

---

### P1: Reorder items with the keyboard ⭐ MVP

**User Story**: As a keyboard or screen-reader user, I want to move a checklist item with the keys so that I can order the steps without a mouse.

**Why P1**: Doc §6 makes every drag reachable by keyboard; the app targets WCAG (doc §11).

**Acceptance Criteria**:

1. The system SHALL make every item's grip focusable with a visible purple focus outline.  <!-- FCLD-07 -->
2. WHEN the user presses Space on a focused grip THEN the system SHALL pick that item: its row gets the `bg-brand-soft` background, the banner "Movendo “{text}”: posição {i} de {n}. ↑ ↓ movem, Espaço solta, Esc cancela." shows between the progress bar and the list, and the live region announces "Item {text}, posição {i} de {n}".  <!-- FCLD-08 -->
3. WHILE an item is picked, WHEN the user presses ↑ or ↓ THEN the system SHALL move it one position up or down, stopping at the first and last position.  <!-- FCLD-09 -->
4. WHILE an item is picked, WHEN it changes position THEN the system SHALL update the banner and announce "Item {text}, posição {i} de {n}" in the live region.  <!-- FCLD-10 -->
5. WHILE an item is picked, WHEN the user presses Space or Enter THEN the system SHALL drop it, announce "Item {text} solto na posição {i} de {n}" and hide the banner.  <!-- FCLD-11 -->
6. WHEN a keyboard drop leaves the item at another index than where it was picked THEN the system SHALL send the move of FCLD-05 with that index as `position`.  <!-- FCLD-12 -->
7. WHEN a keyboard drop leaves the item at the index where it was picked THEN the system SHALL send no request.  <!-- FCLD-13 -->
8. WHILE an item is picked, WHEN the user presses Esc THEN the system SHALL put it back at its starting index, announce "Movimento cancelado", hide the banner, send no request and keep the detail open.  <!-- FCLD-14 -->
9. WHILE an item is picked and after it is dropped or cancelled, the system SHALL keep keyboard focus on that item's grip.  <!-- FCLD-15 -->
10. WHEN the user closes the detail while an item is picked THEN the system SHALL cancel the move and send no request.  <!-- FCLD-16 -->
11. The system SHALL render the live region inside the card detail dialog as a visually hidden element with `role="status"` and `aria-live="assertive"`.  <!-- FCLD-17 -->

**Independent Test**: Tab to the grip of "C" in "A", "B", "C", press Space, ↑, ↑, Space; the list reads "C", "A", "B", the live region read every step, focus is on the grip of "C", and a reload keeps the order. Repeat with Esc instead of the last Space: the list is back to "A", "B", "C" and no request was sent.

---

### P1: Failed and blocked moves ⭐ MVP

**User Story**: As a user, I want a failed move to be undone on screen so that the checklist never shows an order the server rejected.

**Why P1**: Every move is optimistic (FE-AD-009); without this the screen can lie.

**Acceptance Criteria**:

1. IF a move fails with a network error or `5xx` THEN the system SHALL put the item back at its old index and show the toast "Não foi possível salvar. Tente novamente." with **Tentar novamente**, which sends the same move again.  <!-- FCLD-18 -->
2. IF a move fails with `409` THEN the system SHALL put the item back and show "Este item foi arquivado. Recarregue para ver o estado atual." with **Recarregar**.  <!-- FCLD-19 -->
3. IF a move fails with `404` THEN the system SHALL put the item back, show "Não foi possível salvar. Tente novamente." without a button and refetch the checklist.  <!-- FCLD-20 -->
4. IF two moves are in flight and one fails THEN the system SHALL put back only the failed item and keep the other move on screen.  <!-- FCLD-21 -->
5. WHILE an item has a request in flight, the system SHALL disable its grip and SHALL NOT let the user drag it.  <!-- FCLD-22 -->
6. WHILE an item is picked with the keyboard, the system SHALL ignore Space on every other grip and SHALL NOT let the user drag any item with the mouse.  <!-- FCLD-23 -->
7. WHILE the detail is in the archived-card or the archived-board mode, the system SHALL render no grip and no draggable item row.  <!-- FCLD-24 -->
8. WHILE the checklist is loading or shows its load error, the system SHALL render no grip.  <!-- FCLD-25 -->

**Independent Test**: With the API stopped, drag an item to another spot; it returns to its old spot and the toast offers Tentar novamente. Open an archived card: no item has a grip.

---

## Edge Cases

- WHEN the card has one item THEN Space on its grip SHALL pick it, ↑ ↓ SHALL keep it at "posição 1 de 1" (FCLD-09), and the drop SHALL send nothing (FCLD-13).
- WHEN an item with an unsaved text draft is moved THEN its field SHALL keep the draft, and the draft SHALL still count as an unsaved edit (FCL-27).
- WHEN the user moves an item and toggles another one before the move settles THEN both changes SHALL stay on screen, and a failure SHALL undo only its own change (FCLD-21, FE-AD-010).
- IF the card or its board is archived on another device THEN the next move SHALL fail with `409` and follow FCLD-19.
- IF the item is deleted on another device THEN the next move SHALL fail with `404` and follow FCLD-20.
- IF a `401` arrives on a move THEN the foundation session-expiry flow runs (FND-16) and no move toast shows.

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Positions are computed by the client from the visible order and capped at the ends (FCLD-05, FCLD-09); the back-end caps `position` beyond the end (CHK-11) |
| Failure / partial-failure states | FCLD-18–FCLD-21 |
| Idempotency / retry / duplicate handling | No request for a drop on the starting spot (FCLD-06, FCLD-13); Tentar novamente resends the same move (FCLD-18); one request per item at a time (FCLD-22) |
| Auth boundaries & rate limits | Every request carries the token; `401` goes through FND-16; foreign ids answer `404` (FCLD-20). No rate limit on the move endpoint |
| Concurrency / ordering | Several items may move at once; each failure reverts only its item (FCLD-21, FE-AD-010); one keyboard move at a time (FCLD-23); changes from another device surface as `409`/`404` (FCLD-19, FCLD-20) |
| Data lifecycle / expiry | N/A because a move does not create, archive or delete anything |
| Observability | N/A because the web client has no logging or metrics pipeline; failures are shown to the user |
| External-dependency failure | The API is the only dependency: FCLD-18 |
| State-transition integrity | Read-only modes never reorder (FCLD-24); a picked item is cancelled when the detail closes (FCLD-16) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FCLD-01 | P1: Reorder items with the mouse | - | Pending |
| FCLD-02 | P1: Reorder items with the mouse | - | Pending |
| FCLD-03 | P1: Reorder items with the mouse | - | Pending |
| FCLD-04 | P1: Reorder items with the mouse | - | Pending |
| FCLD-05 | P1: Reorder items with the mouse | - | Pending |
| FCLD-06 | P1: Reorder items with the mouse | - | Pending |
| FCLD-07 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-08 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-09 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-10 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-11 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-12 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-13 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-14 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-15 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-16 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-17 | P1: Reorder items with the keyboard | - | Pending |
| FCLD-18 | P1: Failed and blocked moves | - | Pending |
| FCLD-19 | P1: Failed and blocked moves | - | Pending |
| FCLD-20 | P1: Failed and blocked moves | - | Pending |
| FCLD-21 | P1: Failed and blocked moves | - | Pending |
| FCLD-22 | P1: Failed and blocked moves | - | Pending |
| FCLD-23 | P1: Failed and blocked moves | - | Pending |
| FCLD-24 | P1: Failed and blocked moves | - | Pending |
| FCLD-25 | P1: Failed and blocked moves | - | Pending |

**Coverage:** 25 total, 0 mapped to tasks, 25 unmapped ⚠️ (mapped at Tasks)

---

## Success Criteria

- [ ] Every reorder path (mouse, keyboard) persists: after a reload the checklist shows the same order.
- [ ] A keyboard-only user reorders an item without a mouse, and each step is announced.
- [ ] Zero moves leave the checklist out of sync with the server after a failure.
- [ ] The Verifier marks all FCLD requirements met with discriminating tests.
