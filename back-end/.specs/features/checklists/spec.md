# Checklists Specification

## Problem Statement

A card names one piece of work, but most work has steps, and a description cannot be ticked off. A logged-in user needs checklist items on a card, each a short text with a done flag, that they can add, tick, reorder and delete, and the board needs to show each card's progress (`2/5`) without one extra call per card. Items belong to a card, so the board's owner and the archive state of the board, list and card decide who can see and change them (BE-AD-008, BE-AD-010).

## Goals

- [ ] A logged-in user can add an item to a card, tick it and see `checklist` `{ "total": 1, "done": 1 }` on that card with three HTTP calls.
- [ ] The items of every card always sit at positions `0..n-1`, each used once, even under concurrent writes.
- [ ] No checklist route ever reveals or changes an item of another user's board.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Several named checklists per card | Discussed: one flat checklist per card (context.md) |
| Due date or assignee per item | Not needed for the MVP (context.md Deferred Ideas) |
| Moving an item to another card | Not needed for the MVP (context.md Deferred Ideas) |
| Converting an item into a card | Not needed for the MVP (context.md Deferred Ideas) |
| Item archive | Items are deleted directly (context.md) |
| `GET /checklist-items/:id` | The card listing returns every item; no client needs a single read |
| Checklist-specific rate limiting | No abuse surface beyond authenticated routes |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Model | One flat list of items per card | Discussed (context.md) | y |
| Routes | Collection nested (`/cards/:cardId/checklist-items`), item flat (`/checklist-items/:id`, `/checklist-items/:id/move`) | Same pattern as lists, cards and labels | y |
| Item fields | `text` 1–200 after trim (required); `done` boolean | A step is a short line; the card description holds long text | y |
| `done` on create | Not accepted; a new item starts with `done: false` (unknown property → `400`, FND-09) | Same as cards (`done` on create) | y |
| Duplicate texts | Allowed | Trello allows them | y |
| Response body | `{ "id", "cardId", "text", "done", "position", "createdAt", "updatedAt" }` | Mirrors the card body; `cardId` ties it to its card | y |
| Ordering model | Contiguous 0-based `position` per card; new item at the end; `move` takes the target index inside the same card; `position` beyond the end → last index | Discussed (context.md); same as cards (CRD-20, CRD-22) | y |
| Item `updatedAt` | Changes on `PATCH` with at least one field and on the moved item when its position changes; items shifted by a move, create or delete keep theirs | Same as cards (`updatedAt` on move) | y |
| Card body | Every card response gains `checklist: { "total", "done" }`; `{ "total": 0, "done": 0 }` when the card has no items | Discussed (context.md) | y |
| Card `updatedAt` | Unchanged by every item write | Discussed (context.md); same as LBL-21 | y |
| Archive semantics | Items have no archive; an archived board, list or card makes its items read-only: writes → `409` `/problems/board-archived`, `/problems/list-archived` or `/problems/card-archived`; `GET` still answers | Item writes are card writes (CRD-27, LBL-23, LBL-24, LBL-27) | y |
| Error precedence | `400` body validation first (global `ValidationPipe`, before the controller), then lookup `404` (`card-not-found` on nested routes, `checklist-item-not-found` on item routes), then `board-archived` > `list-archived` > `card-archived` | Same order as cards and labels (LBL-25); the pipe always runs before the service | y |
| Unknown, foreign or malformed item id | `404` `/problems/checklist-item-not-found`, identical in all three cases | BE-AD-008 | y |
| Unknown, foreign or malformed card id on nested routes | `404` `/problems/card-not-found`, same body as CRD-38 | Reuses the card lookup (BE-AD-008) | y |
| Empty `PATCH` body `{}` | `200` with the unchanged item; `updatedAt` unchanged | Same as LST-12 | y |
| Clearing fields | `text: null` or `done: null` → `400` | Both fields are required | y |
| Delete cascade | Deleting a card deletes its items; deleting a list or a board deletes them through its cards | No orphan rows | y |
| Concurrent writes | Writes that change item positions on one card are serialized under the board row lock (BE-AD-010); positions stay contiguous. Field edits: last write wins | Ordering is an invariant, fields are not | y |
| Item limit per card | None | Personal scale | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Add an item to a card ⭐ MVP

**User Story**: As a logged-in user, I want to add a step to a card so that I can break its work down.

**Why P1**: Without items there is no checklist.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/cards/:cardId/checklist-items` on an active card of an active list of an active board of theirs with a valid `text` THEN the system SHALL create the item and return `201` with body `{ "id", "cardId", "text", "done", "position", "createdAt", "updatedAt" }`, `done` `false` and `position` equal to the number of items the card held before the call.  <!-- CHK-01 -->
2. The system SHALL store and return `text` trimmed.  <!-- CHK-02 -->
3. IF `text` is missing, not a string, empty after trim or longer than 200 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `text` and SHALL NOT create an item.  <!-- CHK-03 -->
4. IF `:cardId` on `POST` or `GET /api/v1/cards/:cardId/checklist-items` does not exist, belongs to a card of another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/card-not-found`, identical in all three cases, and SHALL NOT create an item.  <!-- CHK-04 -->

**Independent Test**: e2e test registers, creates a board, a list and a card, adds `"  Write tests  "` and gets `201` with `text` `"Write tests"`, `done` `false`, `position` `0`; a second item gets `position` `1`; `text` `"   "` returns `400` with `field` `text`.

---

### P1: List a card's items ⭐ MVP

**User Story**: As a logged-in user, I want to get every item of a card so that I can render its checklist.

**Why P1**: The card body only carries counters; the items themselves come from this route.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/v1/cards/:cardId/checklist-items` on a card of theirs THEN the system SHALL return `200` with an array of that card's items ordered by `position` ascending, whether the board, the list or the card is archived or not; a card with no items SHALL return `[]`.  <!-- CHK-05 -->

**Independent Test**: e2e test adds items `"A"`, `"B"`, `"C"` in that order and gets them back at positions `0`, `1`, `2`; after the card is archived the same call returns the same array; a new card returns `[]`.

---

### P1: Edit and tick an item ⭐ MVP

**User Story**: As a logged-in user, I want to fix an item's text and mark it done or not done so that the checklist tracks real progress.

**Why P1**: Ticking items is the point of a checklist.

**Acceptance Criteria**:

1. WHEN a client calls `PATCH /api/v1/checklist-items/:id` on an item of an active card of an active list of an active board of theirs with a valid `text`, `done` or both THEN the system SHALL change only the given fields, store `text` trimmed, update `updatedAt` and return `200` with the item body.  <!-- CHK-06 -->
2. IF `text` is present and is `null`, not a string, empty after trim or longer than 200 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `text` and SHALL NOT change the item.  <!-- CHK-07 -->
3. IF `done` is present and is not a boolean (including `null`) THEN the system SHALL return `400` with an `errors` item whose `field` is `done` and SHALL NOT change the item.  <!-- CHK-08 -->
4. WHEN the body is `{}` THEN the system SHALL return `200` with the unchanged item and SHALL leave `updatedAt` unchanged.  <!-- CHK-09 -->

**Independent Test**: e2e test sets `done` `true` on an item and gets `200` with `done` `true` and a later `updatedAt`; renames it to `"  Ship it  "` and gets `text` `"Ship it"`; `done` `"yes"` returns `400` with `field` `done`; `{}` returns the item with `updatedAt` unchanged.

---

### P1: Reorder items ⭐ MVP

**User Story**: As a logged-in user, I want to move an item up or down in its card's checklist so that the steps read in the order I do them.

**Why P1**: Steps are added as they come to mind, rarely in order.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/checklist-items/:id/move` under the conditions of CHK-06 with `position` `k` where `0 ≤ k ≤ n-1` (`n` = number of items of the card) THEN the system SHALL place the item at index `k`, shift the other items of the card keeping their relative order, and return `200` with the moved item whose `position` is `k`.  <!-- CHK-10 -->
2. WHEN `position` is greater than `n-1` THEN the system SHALL place the item at index `n-1` and return `200` with the moved item.  <!-- CHK-11 -->
3. WHEN `position` equals the item's current position (after the CHK-11 clamp) THEN the system SHALL return `200` with the item unchanged, including `updatedAt`.  <!-- CHK-12 -->
4. WHEN an item changes position through a move THEN the system SHALL update the moved item's `updatedAt` and SHALL leave the `updatedAt` of every item shifted as a side effect unchanged.  <!-- CHK-13 -->
5. IF `position` is missing, not an integer, or negative THEN the system SHALL return `400` with an `errors` item whose `field` is `position` and SHALL NOT change any item.  <!-- CHK-14 -->
6. The system SHALL keep the items of every card at positions `0..n-1`, each used exactly once, after every create, move and delete, including when such requests on the same card run concurrently.  <!-- CHK-15 -->

**Independent Test**: e2e test adds items 1, 2, 3; `move` item 3 to position `0` returns `200` and the card reads `[3, 1, 2]` at `0..2`; `move` item 1 to position `99` reads `[3, 2, 1]`; items shifted keep their `updatedAt`.

---

### P1: Delete an item ⭐ MVP

**User Story**: As a logged-in user, I want to delete an item I no longer need so that the checklist stays accurate.

**Why P1**: Items have no archive; delete is the only way to remove one.

**Acceptance Criteria**:

1. WHEN a client calls `DELETE /api/v1/checklist-items/:id` under the conditions of CHK-06 THEN the system SHALL delete the item, shift the items after it down by one closing the gap, and return `204`; later `GET /api/v1/cards/:cardId/checklist-items` SHALL NOT include it.  <!-- CHK-16 -->

**Independent Test**: e2e test adds items 1, 2, 3, deletes item 2, gets `204`, and the card reads `[1, 3]` at positions `0..1`.

---

### P1: Card responses show checklist progress ⭐ MVP

**User Story**: As a logged-in user, I want every card I read to tell me how many checklist items it has and how many are done so that the board shows progress without extra calls.

**Why P1**: A client loads a board with `GET /boards/:boardId/cards`; progress must come with it.

**Acceptance Criteria**:

1. The system SHALL include `checklist` `{ "total", "done" }` in every card body returned by the card routes (`POST /api/v1/lists/:listId/cards`, `GET /api/v1/lists/:listId/cards`, `GET /api/v1/boards/:boardId/cards`, `GET` and `PATCH /api/v1/cards/:id`, `POST /api/v1/cards/:id/move`, `/archive` and `/unarchive`), where `total` is the number of items of the card and `done` the number of those with `done` `true`; a card with no items (a new card always) SHALL return `{ "total": 0, "done": 0 }`.  <!-- CHK-17 -->
2. WHEN an item of a card is created, edited, ticked, moved or deleted THEN the system SHALL leave the card's `updatedAt` unchanged.  <!-- CHK-18 -->

**Independent Test**: e2e test adds three items to a card and ticks one; `GET /api/v1/cards/:id`, `GET /api/v1/lists/:listId/cards` and `GET /api/v1/boards/:boardId/cards` all return `checklist` `{ "total": 3, "done": 1 }` and the card's `updatedAt` from before the first item.

---

### P1: Archive freezes items ⭐ MVP

**User Story**: As a logged-in user, I want an archived board, list or card to keep its checklist frozen so that restoring it gives back exactly what I archived.

**Why P1**: Archived boards, lists and cards are read-only (BRD-14, CRD-27, CRD-35, CRD-36); without this their items could still change.

**Acceptance Criteria**:

1. WHILE a card's board is archived the system SHALL answer `POST /api/v1/cards/:cardId/checklist-items`, and `PATCH`, `DELETE` and `POST .../move` on `/api/v1/checklist-items/:id` of that card, with `409` and `type` `/problems/board-archived`, whether the list or the card is archived or not, and SHALL NOT change any item.  <!-- CHK-19 -->
2. WHILE a card's list is archived and its board is active the system SHALL answer the routes of CHK-19 with `409` and `type` `/problems/list-archived`, whether the card is archived or not, and SHALL NOT change any item.  <!-- CHK-20 -->
3. WHILE a card is archived and its list and board are active the system SHALL answer the routes of CHK-19 with `409` and `type` `/problems/card-archived` and SHALL NOT change any item.  <!-- CHK-21 -->
4. IF a lookup of CHK-04 or CHK-23 fails THEN the system SHALL return its `404` before any `409` of CHK-19 to CHK-21.  <!-- CHK-22 -->

**Independent Test**: e2e test adds an item, archives the card, and `POST` item, `PATCH`, `DELETE` and `move` all return `409` `/problems/card-archived`; archiving the list instead returns `/problems/list-archived`; archiving the board returns `/problems/board-archived`; after unarchiving, the items are unchanged.

---

### P1: Ownership boundary ⭐ MVP

**User Story**: As a user, I want the checklists of my cards to be invisible to everyone else so that my data stays private.

**Why P1**: Single-owner product; a leak breaks the core promise.

**Acceptance Criteria**:

1. IF a request to `PATCH` or `DELETE /api/v1/checklist-items/:id`, or to `POST /api/v1/checklist-items/:id/move`, targets an id that does not exist, belongs to an item of another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/checklist-item-not-found`, identical in all three cases, and SHALL NOT change any item.  <!-- CHK-23 -->
2. The system SHALL require a valid access token on every `/api/v1/cards/:cardId/checklist-items` and `/api/v1/checklist-items` route (AUTH-16).  <!-- CHK-24 -->

**Independent Test**: e2e test with two users: user B's `PATCH`, `DELETE` and `move` on user A's item return the same `404` as an unknown id; user B's `POST` and `GET` on user A's card return `404` `/problems/card-not-found`; calls without a token return `401`.

---

## Edge Cases

- IF a create, `PATCH` or `move` body contains a property not declared in the contract (e.g. `cardId`, `position` on create, `done` on create) THEN the system SHALL return `400` (covered by FND-09).
- IF two requests add items to the same card at the same time THEN the system SHALL give them distinct positions and keep the card's items at `0..n-1` (covered by CHK-15).
- WHEN the card has a single item and it is moved to any `position` THEN the system SHALL return `200` with the item at `position` `0`, unchanged (CHK-11, CHK-12).
- IF a card, a list or a board is deleted THEN the system SHALL delete the items of every card it held (database foreign key with cascade).  <!-- CHK-25 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | CHK-02, CHK-03, CHK-07, CHK-08, CHK-14; CHK-04, CHK-23 (malformed ids) |
| Failure / partial-failure states | CHK-03, CHK-04, CHK-07, CHK-08, CHK-14, CHK-19 to CHK-23 (rejected requests change nothing); every position-changing write runs in one transaction (CHK-15) |
| Idempotency / retry / duplicate handling | CHK-09 (`{}` is a no-op), CHK-12 (move to the current position is a no-op); retried creates add duplicates, which are allowed (Assumptions) |
| Auth boundaries & rate limits | CHK-04, CHK-23, CHK-24; no extra rate limit (Out of Scope) |
| Concurrency / ordering | CHK-15 (contiguous positions under races, board row lock); order by `position` (CHK-05); field edits last write wins (Assumptions) |
| Data lifecycle / expiry | CHK-16, CHK-25; no item archive (Out of Scope) |
| Observability | Covered by FND-16 and FND-17 (request logs with request id) |
| External-dependency failure | N/A because checklists add no external dependency beyond the database, whose failure surfaces as FND-11 `500` |
| State-transition integrity | Items have no states besides `done`, which toggles freely; archived board, list or card freezes items with precedence board > list > card (CHK-19 to CHK-22) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CHK-01 | P1: Add an item to a card | - | Pending |
| CHK-02 | P1: Add an item to a card | - | Pending |
| CHK-03 | P1: Add an item to a card | - | Pending |
| CHK-04 | P1: Add an item to a card | - | Pending |
| CHK-05 | P1: List a card's items | - | Pending |
| CHK-06 | P1: Edit and tick an item | - | Pending |
| CHK-07 | P1: Edit and tick an item | - | Pending |
| CHK-08 | P1: Edit and tick an item | - | Pending |
| CHK-09 | P1: Edit and tick an item | - | Pending |
| CHK-10 | P1: Reorder items | - | Pending |
| CHK-11 | P1: Reorder items | - | Pending |
| CHK-12 | P1: Reorder items | - | Pending |
| CHK-13 | P1: Reorder items | - | Pending |
| CHK-14 | P1: Reorder items | - | Pending |
| CHK-15 | P1: Reorder items | - | Pending |
| CHK-16 | P1: Delete an item | - | Pending |
| CHK-17 | P1: Card responses show checklist progress | - | Pending |
| CHK-18 | P1: Card responses show checklist progress | - | Pending |
| CHK-19 | P1: Archive freezes items | - | Pending |
| CHK-20 | P1: Archive freezes items | - | Pending |
| CHK-21 | P1: Archive freezes items | - | Pending |
| CHK-22 | P1: Archive freezes items | - | Pending |
| CHK-23 | P1: Ownership boundary | - | Pending |
| CHK-24 | P1: Ownership boundary | - | Pending |
| CHK-25 | Edge case: delete cascade | - | Pending |

**Coverage:** 25 total, 0 mapped to tasks, 25 unmapped ⚠️

---

## Success Criteria

- [ ] A user can add an item to a card, tick it and see `checklist` `{ "total": 1, "done": 1 }` in `GET /api/v1/boards/:boardId/cards` with three HTTP calls.
- [ ] Zero cards hold two items at the same position or a gap in `0..n-1`.
- [ ] Zero checklist routes answer with data of another user's board.
