# Cards Specification

## Problem Statement

Lists are empty columns until they hold cards: a card is one piece of work with a title, an optional description, an optional due date and a done mark. A logged-in user needs to add cards to a list, see them in a stable top-to-bottom order, edit them, drag them inside a list and across lists of the same board, put old ones away and remove them for good. Cards belong to a list, so the board's owner and the archive state of the board and the list decide who can see and change them (BE-AD-008, BE-AD-010).

## Goals

- [ ] A logged-in user can add cards to a list of one of their boards and get them back from `GET /api/v1/lists/:listId/cards` in the order they set.
- [ ] Reordering, moving between lists, archiving and deleting always leave every list's active cards at positions `0..n-1`, with no gaps or duplicates.
- [ ] No card route ever reveals or changes a card of another user's board.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Labels on cards | Feature 5 (ROADMAP) |
| Checklists on cards | Feature 6 (ROADMAP) |
| Moving a card to another board | Not needed for the MVP (context.md Deferred Ideas) |
| Copying a card, archiving all cards of a list | Not needed for the MVP (context.md Deferred Ideas) |
| Due time, reminders, start date | Due date is a calendar date only (context.md) |
| Comments, attachments, members, cover | Single-owner MVP; not in the ROADMAP |
| Search and filters, pagination of cards | Personal scale; a list holds few cards |
| Card-specific rate limiting | No abuse surface beyond authenticated routes |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Routes | Collections nested (`/lists/:listId/cards`, `/boards/:boardId/cards`), item flat (`/cards/:id`, `/cards/:id/move`, `/archive`, `/unarchive`) | Same pattern as lists (lists context.md) | y |
| Card fields | `title` 1–100 after trim (required); `description` ≤ 5000 after trim, blank → `null`; `dueDate` `YYYY-MM-DD` or `null`; `done` boolean | Discussed (context.md) | y |
| `done` and `dueDate` | Independent; a card without `dueDate` can be `done` | Discussed (context.md) | y |
| `done` on create | Not accepted; a new card starts with `done: false` (unknown property → `400`, FND-09) | A new card is never finished; one less rule to test | y |
| Clearing fields | `PATCH` with `description: null` or `dueDate: null` clears the field; `title: null` or `done: null` → `400` | Required fields cannot be cleared | y |
| `dueDate` validity | Must be a real calendar date (`2026-02-30` → `400`); past dates allowed | Overdue cards are normal | y |
| Response body | `{ "id", "listId", "title", "description", "dueDate", "done", "position", "archivedAt", "createdAt", "updatedAt" }` | Mirrors the list body; `listId` lets a client group board cards | y |
| Archive semantics | Archived card is read-only (`PATCH`, `move` → `409` `/problems/card-archived`); `DELETE` only on archived cards (`409` `/problems/card-not-archived` otherwise) | Same lifecycle as boards and lists | y |
| Ordering model | Active cards hold a 0-based `position`, contiguous `0..n-1` per list; `move` takes the target index | Same as lists (BE-AD-010) | y |
| Position of a new card | End of the list's active cards | Trello default | y |
| Archived card position | `position` is `null` while archived; unarchive puts the card at the end of its list | Same as lists | y |
| `move` targets | Same list or another list of the same board; `position` beyond the end → end of the target list | Discussed (context.md) | y |
| `move` with a bad `listId` | Not a UUID → `400` (`field` `listId`); unknown, foreign or of another board → `404` `/problems/list-not-found`, identical | Body values are validated like body fields; a target outside the board is "not found" from the card's point of view | y |
| `updatedAt` on move | Changes only on the moved card and only when its list or position changes; cards shifted as a side effect keep their `updatedAt` | Same as lists | y |
| Archived list | Its cards stay as they were and are read-only: every card write → `409` `/problems/list-archived` | Discussed (context.md) | y |
| Error precedence | Board archived > list archived > card state (`card-archived`, `card-not-archived`) | The outer container decides first | y |
| Board cards route | `GET /boards/:boardId/cards` (or `?archived=false`) → active cards of active lists by list position, then card position; `?archived=true` → archived cards of every list, `archivedAt` descending | Discussed (context.md) | y |
| Unknown or foreign parent on nested routes | `404` `/problems/list-not-found` or `/problems/board-not-found`, same bodies as LST-27 and BRD-21 | Reuses the parent lookup (BE-AD-008) | y |
| Unknown, foreign or malformed card id | `404` `/problems/card-not-found`, identical in all three cases | BE-AD-008 | y |
| Empty `PATCH` body `{}` | `200` with the unchanged card; `updatedAt` unchanged | Same as LST-12 | y |
| `archived` query values | Only `true` and `false`; any other value → `400` | Same as LST-08 | y |
| Concurrent writes | Writes that change card positions in the same list (both lists on a cross-list move) are serialized; positions stay contiguous. Field edits: last write wins | Ordering is an invariant, fields are not | y |
| Delete cascade | Deleting a list deletes its cards, active or archived; deleting a board deletes them through its lists | No orphan rows. Blocking the delete of a non-empty list conflicts with LST-25 + CRD-35 (an archived list's cards cannot be deleted); kept simple for the MVP | y |
| Card limit per list | None | Personal scale | y |
| Duplicate titles | Allowed | Trello allows them | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Create a card ⭐ MVP

**User Story**: As a logged-in user, I want to add a card with a title, an optional description and an optional due date to a list so that I can track a piece of work.

**Why P1**: Cards are the unit of work of the product.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/lists/:listId/cards` on an active list of an active board of theirs with a valid `title` THEN the system SHALL create the card at the end of the list's active cards (`position` equal to the number of active cards before the call) with `done` `false` and return `201` with body `{ "id", "listId", "title", "description", "dueDate", "done", "position", "archivedAt": null, "createdAt", "updatedAt" }`.  <!-- CRD-01 -->
2. The system SHALL store and return `title` trimmed, and `description` trimmed with a missing or blank value stored and returned as `null`.  <!-- CRD-02 -->
3. IF `title` is missing, not a string, empty after trim or longer than 100 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `title` and SHALL NOT create a card.  <!-- CRD-03 -->
4. IF `description` is present and is neither `null` nor a string, or is longer than 5000 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `description` and SHALL NOT create a card.  <!-- CRD-04 -->
5. IF `dueDate` is present and is neither `null` nor a string in the form `YYYY-MM-DD` naming a real calendar date THEN the system SHALL return `400` with an `errors` item whose `field` is `dueDate` and SHALL NOT create a card; a missing or `null` `dueDate` SHALL be stored and returned as `null`.  <!-- CRD-05 -->
6. IF `:listId` on `POST` or `GET /api/v1/lists/:listId/cards` does not exist, belongs to another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/list-not-found`, identical in all three cases, and SHALL NOT create a card.  <!-- CRD-06 -->

**Independent Test**: e2e test registers, creates a board and a list, creates cards `"  Write spec  "` with `dueDate` `"2026-11-01"` and `"Review"`, and gets `201` with `title` `"Write spec"` / `position` `0` / `done` `false` and `title` `"Review"` / `position` `1` / `dueDate` `null`; a body with `dueDate` `"2026-02-30"` returns `400`.

---

### P1: List and read cards ⭐ MVP

**User Story**: As a logged-in user, I want to see the cards of a list or of a whole board in order, and open one, so that I can see my work.

**Why P1**: The board view is built from these responses.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/v1/lists/:listId/cards` on a list of theirs without `archived` or with `archived=false` THEN the system SHALL return `200` with an array of that list's cards whose `archivedAt` is `null`, ordered by `position` ascending, whether the list or its board is archived or not.  <!-- CRD-07 -->
2. WHEN a client calls `GET /api/v1/lists/:listId/cards?archived=true` on a list of theirs THEN the system SHALL return `200` with an array of that list's cards whose `archivedAt` is not `null`, each with `position` `null`, ordered by `archivedAt` descending.  <!-- CRD-08 -->
3. WHEN a client calls `GET /api/v1/boards/:boardId/cards` on a board of theirs without `archived` or with `archived=false` THEN the system SHALL return `200` with an array of the active cards of the board's active lists, ordered by list `position` ascending, then card `position` ascending, whether the board is archived or not.  <!-- CRD-09 -->
4. WHEN a client calls `GET /api/v1/boards/:boardId/cards?archived=true` on a board of theirs THEN the system SHALL return `200` with an array of the board's cards whose `archivedAt` is not `null`, from every list whether archived or not, ordered by `archivedAt` descending.  <!-- CRD-10 -->
5. IF the `archived` query parameter on either collection route is present with a value other than `true` or `false` THEN the system SHALL return `400` with an `errors` item whose `field` is `archived`.  <!-- CRD-11 -->
6. IF `:boardId` on `GET /api/v1/boards/:boardId/cards` does not exist, belongs to another user, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/board-not-found`, identical in all three cases.  <!-- CRD-12 -->
7. WHEN a client calls `GET /api/v1/cards/:id` for a card on one of their boards THEN the system SHALL return `200` with that card, whether the card, its list or its board is archived or not.  <!-- CRD-13 -->

**Independent Test**: e2e test creates a board with lists A and B, two cards in each, archives one card of A: `GET /lists/:A/cards` returns one card at position `0`; `GET /boards/:boardId/cards` returns A's card then B's two cards; `?archived=true` on the board returns the archived card with `position` `null`.

---

### P1: Edit a card ⭐ MVP

**User Story**: As a logged-in user, I want to change a card's title, description, due date and done mark so that it reflects the current state of the work.

**Why P1**: Marking work done and setting dates is part of the roadmap scope for cards.

**Acceptance Criteria**:

1. WHEN a client calls `PATCH /api/v1/cards/:id` on an active card of an active list of an active board of theirs with any valid subset of `title`, `description`, `dueDate` and `done` THEN the system SHALL update only the given fields and return `200` with the updated card and a later `updatedAt`.  <!-- CRD-14 -->
2. IF a `PATCH` body has an invalid `title` (including `null`) by the rules of CRD-03 THEN the system SHALL return `400` with an `errors` item whose `field` is `title` and SHALL NOT change the card.  <!-- CRD-15 -->
3. WHEN a `PATCH` body sets `description` or `dueDate` to `null` (or `description` to a blank string) THEN the system SHALL store that field as `null`; IF either value is invalid by the rules of CRD-04 or CRD-05 THEN the system SHALL return `400` with an `errors` item for that field and SHALL NOT change the card.  <!-- CRD-16 -->
4. IF a `PATCH` body has a `done` that is not a boolean (including `null`) THEN the system SHALL return `400` with an `errors` item whose `field` is `done` and SHALL NOT change the card.  <!-- CRD-17 -->
5. WHEN a `PATCH` body is `{}` THEN the system SHALL return `200` with the card unchanged, including `updatedAt`.  <!-- CRD-18 -->
6. WHILE a card is archived the system SHALL answer `PATCH /api/v1/cards/:id` with `409` and `type` `/problems/card-archived`, and SHALL NOT change the card.  <!-- CRD-19 -->

**Independent Test**: e2e test creates a card, patches `{ "done": true, "dueDate": "2026-12-24" }` (`200`, both set), patches `{ "dueDate": null }` (`200`, `dueDate` `null`, `done` still `true`), archives it, and a third patch returns `409`.

---

### P1: Reorder and move cards ⭐ MVP

**User Story**: As a logged-in user, I want to move a card up or down in its list and to another list of the same board so that the board shows where each piece of work stands.

**Why P1**: Moving between lists and reordering is the roadmap scope for cards and the core Trello gesture.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/cards/:id/move` on an active card with `position` `k` and without `listId` (or with `listId` equal to the card's list), where `0 ≤ k ≤ n-1` (`n` = number of active cards in the list) THEN the system SHALL place the card at index `k`, shift the other active cards of the list keeping their relative order, and return `200` with the moved card whose `position` is `k`.  <!-- CRD-20 -->
2. WHEN a client calls `POST /api/v1/cards/:id/move` on an active card with `listId` of another active list of the same board and `position` `k` where `0 ≤ k ≤ m` (`m` = number of active cards in the target list before the call) THEN the system SHALL remove the card from its list closing the gap, insert it into the target list at index `k` shifting the cards from `k` onward, and return `200` with the card whose `listId` is the target list and `position` is `k`.  <!-- CRD-21 -->
3. WHEN `position` is greater than the last valid index of the target list (`n-1` for the same list, `m` for another list) THEN the system SHALL place the card at that last index and return `200` with the moved card.  <!-- CRD-22 -->
4. WHEN the target list is the card's list and `position` equals the card's current position THEN the system SHALL return `200` with the card unchanged, including `updatedAt`.  <!-- CRD-23 -->
5. IF `position` is missing, not an integer, or negative, or `listId` is present and is not a UUID THEN the system SHALL return `400` with an `errors` item whose `field` is `position` or `listId` respectively, and SHALL NOT change any card.  <!-- CRD-24 -->
6. IF `listId` names a list that does not exist, belongs to another user's board, or belongs to another board of the same user THEN the system SHALL return `404` with `type` `/problems/list-not-found`, identical in all three cases, and SHALL NOT change any card.  <!-- CRD-25 -->
7. IF the target list is archived THEN the system SHALL return `409` with `type` `/problems/list-archived` and SHALL NOT change any card.  <!-- CRD-26 -->
8. WHILE a card is archived the system SHALL answer `POST /api/v1/cards/:id/move` with `409` and `type` `/problems/card-archived`, and SHALL NOT change any card.  <!-- CRD-27 -->
9. The system SHALL keep the active cards of every list at positions `0..n-1`, each used exactly once, after every create, move, archive, unarchive and delete, including when such requests on the same lists run concurrently.  <!-- CRD-28 -->

**Independent Test**: e2e test creates list A with cards 1, 2, 3 and list B with card 4; `move` card 3 to position `0` returns `200` and A reads `[3, 1, 2]`; `move` card 1 to `{ listId: B, position: 0 }` returns `200`, A reads `[3, 2]` at `0..1` and B reads `[1, 4]` at `0..1`.

---

### P1: Archive and unarchive a card ⭐ MVP

**User Story**: As a logged-in user, I want to archive finished or abandoned cards and restore them later so that lists stay clean without losing data.

**Why P1**: Archive is the safe path to deletion, as for boards and lists.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/cards/:id/archive` on an active card of an active list of an active board of theirs THEN the system SHALL set `archivedAt` to the current time and `position` to `null`, close the gap in the remaining active cards' positions of its list, and return `200` with the card.  <!-- CRD-29 -->
2. WHEN a client calls `POST /api/v1/cards/:id/archive` on an already archived card THEN the system SHALL return `200` with the card and its original `archivedAt` unchanged.  <!-- CRD-30 -->
3. WHEN a client calls `POST /api/v1/cards/:id/unarchive` on an archived card of an active list of an active board of theirs THEN the system SHALL set `archivedAt` to `null`, set `position` to the number of active cards of its list before the call (end of the list), and return `200` with the card.  <!-- CRD-31 -->
4. WHEN a client calls `POST /api/v1/cards/:id/unarchive` on an active card THEN the system SHALL return `200` with the card unchanged.  <!-- CRD-32 -->

**Independent Test**: e2e test archives the first of three cards: it leaves `GET /lists/:listId/cards`, the other two move to positions `0` and `1`, and it appears in `?archived=true`; after unarchive it is back at position `2`.

---

### P1: Delete a card ⭐ MVP

**User Story**: As a logged-in user, I want to permanently delete an archived card so that I can remove what I no longer need.

**Why P1**: Completes the card lifecycle, as for boards and lists.

**Acceptance Criteria**:

1. WHEN a client calls `DELETE /api/v1/cards/:id` on an archived card of an active list of an active board of theirs THEN the system SHALL delete the card and return `204` with no body.  <!-- CRD-33 -->
2. WHILE a card is active the system SHALL answer `DELETE /api/v1/cards/:id` with `409` and `type` `/problems/card-not-archived`, and SHALL NOT delete the card.  <!-- CRD-34 -->

**Independent Test**: e2e test: deleting an active card returns `409`; after archive, delete returns `204` and `GET /cards/:id` returns `404`.

---

### P1: Archived list and archived board protect their cards ⭐ MVP

**User Story**: As a logged-in user, I want an archived list or board to stay frozen, cards included, so that restoring it gives back exactly what I archived.

**Why P1**: An archived list or board is read-only (LST-13, BRD-14); without this, its cards could still change.

**Acceptance Criteria**:

1. WHILE a card's list is archived and its board is active the system SHALL answer `POST /api/v1/lists/:listId/cards`, `PATCH /api/v1/cards/:id`, `POST /api/v1/cards/:id/move`, `POST /api/v1/cards/:id/archive`, `POST /api/v1/cards/:id/unarchive` and `DELETE /api/v1/cards/:id` with `409` and `type` `/problems/list-archived`, whether the card is archived or not, and SHALL NOT change any card.  <!-- CRD-35 -->
2. WHILE a card's board is archived the system SHALL answer the routes of CRD-35 with `409` and `type` `/problems/board-archived`, whether the list or the card is archived or not, and SHALL NOT change any card.  <!-- CRD-36 -->
3. WHEN a list is archived or unarchived THEN the system SHALL leave its cards' `position`, `archivedAt` and `updatedAt` unchanged.  <!-- CRD-37 -->

**Independent Test**: e2e test creates a card, archives its list, and every card write returns `409` `/problems/list-archived`; archives the board, and every card write returns `409` `/problems/board-archived`; after unarchiving both, the card is unchanged.

---

### P1: Ownership boundary ⭐ MVP

**User Story**: As a user, I want the cards of my boards to be invisible to everyone else so that my data stays private.

**Why P1**: Single-owner product; a leak breaks the core promise.

**Acceptance Criteria**:

1. IF a request to `GET`, `PATCH` or `DELETE /api/v1/cards/:id`, or to `POST /api/v1/cards/:id/move`, `/archive` or `/unarchive`, targets an id that does not exist, belongs to a card of another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/card-not-found`, identical in all three cases, and SHALL NOT change any card.  <!-- CRD-38 -->
2. The system SHALL require a valid access token on every `/api/v1/lists/:listId/cards`, `/api/v1/boards/:boardId/cards` and `/api/v1/cards` route (AUTH-16).  <!-- CRD-39 -->

**Independent Test**: e2e test: user B calls every `/cards/:id` route on user A's card and gets `404`, and both collection routes on user A's list and board and gets `404`; user A's cards are unchanged afterwards.

---

## Edge Cases

- IF a create, `PATCH` or `move` body contains a property not declared in the contract (e.g. `done` or `position` on create, `listId` on `PATCH`, `archivedAt`) THEN the system SHALL return `400` (covered by FND-09).
- WHEN a list has no cards THEN `GET /api/v1/lists/:listId/cards` SHALL return `200` with `[]` (covered by CRD-07).
- WHEN a card is moved into an empty list with any `position` THEN the system SHALL return `200` with `position` `0` (covered by CRD-21 and CRD-22).
- IF a list is deleted THEN the system SHALL delete its cards, and IF a board is deleted THEN the system SHALL delete the cards of all its lists (database foreign keys with cascade).  <!-- CRD-40 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | CRD-02 to CRD-05, CRD-11, CRD-15 to CRD-17, CRD-24, CRD-38 (malformed id) |
| Failure / partial-failure states | CRD-03 to CRD-06, CRD-15 to CRD-17, CRD-19, CRD-24 to CRD-27, CRD-34 to CRD-36 (rejected requests change nothing); multi-row position changes, including both lists of a cross-list move, are atomic (CRD-28) |
| Idempotency / retry / duplicate handling | CRD-30, CRD-32 (archive/unarchive idempotent); CRD-23 (move to the same place is a no-op); CRD-18 (`{}` is a no-op); duplicate titles allowed (Assumptions) |
| Auth boundaries & rate limits | CRD-06, CRD-12, CRD-25, CRD-38, CRD-39; no extra rate limit (Out of Scope) |
| Concurrency / ordering | CRD-28 (position writes on the same lists are serialized and stay contiguous); field edits last write wins (Assumptions) |
| Data lifecycle / expiry | CRD-29 to CRD-34 (archive → delete), CRD-37, CRD-40 |
| Observability | Covered by FND-16 and FND-17 (request logs with request id) |
| External-dependency failure | N/A because cards add no external dependency beyond the database, whose failure surfaces as FND-11 `500` |
| State-transition integrity | Active ⇄ archived (CRD-29 to CRD-32); edit and move only while active (CRD-19, CRD-27); delete only while archived (CRD-34); archived list or board freezes cards with precedence board > list > card (CRD-26, CRD-35, CRD-36) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CRD-01 | P1: Create a card | Execute | Implementing |
| CRD-02 | P1: Create a card | Execute | Implementing |
| CRD-03 | P1: Create a card | Execute | Implementing |
| CRD-04 | P1: Create a card | Execute | Implementing |
| CRD-05 | P1: Create a card | Execute | Implementing |
| CRD-06 | P1: Create a card | Execute | Implementing |
| CRD-07 | P1: List and read cards | Execute | Implementing |
| CRD-08 | P1: List and read cards | Execute | Implementing |
| CRD-09 | P1: List and read cards | Execute | Implementing |
| CRD-10 | P1: List and read cards | Execute | Implementing |
| CRD-11 | P1: List and read cards | Execute | Implementing |
| CRD-12 | P1: List and read cards | Execute | Implementing |
| CRD-13 | P1: List and read cards | Execute | Implementing |
| CRD-14 | P1: Edit a card | Execute | Implementing |
| CRD-15 | P1: Edit a card | Execute | Implementing |
| CRD-16 | P1: Edit a card | Execute | Implementing |
| CRD-17 | P1: Edit a card | Execute | Implementing |
| CRD-18 | P1: Edit a card | Execute | Implementing |
| CRD-19 | P1: Edit a card | Execute | Implementing |
| CRD-20 | P1: Reorder and move cards | Execute | Implementing |
| CRD-21 | P1: Reorder and move cards | Execute | Implementing |
| CRD-22 | P1: Reorder and move cards | Execute | Implementing |
| CRD-23 | P1: Reorder and move cards | Execute | Implementing |
| CRD-24 | P1: Reorder and move cards | Execute | Implementing |
| CRD-25 | P1: Reorder and move cards | Execute | Implementing |
| CRD-26 | P1: Reorder and move cards | Execute | Implementing |
| CRD-27 | P1: Reorder and move cards | Execute | Implementing |
| CRD-28 | P1: Reorder and move cards | Execute | Implementing |
| CRD-29 | P1: Archive and unarchive a card | Execute | Implementing |
| CRD-30 | P1: Archive and unarchive a card | Execute | Implementing |
| CRD-31 | P1: Archive and unarchive a card | Execute | Implementing |
| CRD-32 | P1: Archive and unarchive a card | Execute | Implementing |
| CRD-33 | P1: Delete a card | Execute | Implementing |
| CRD-34 | P1: Delete a card | Execute | Implementing |
| CRD-35 | P1: Archived list and archived board protect their cards | Execute | Implementing |
| CRD-36 | P1: Archived list and archived board protect their cards | Execute | Implementing |
| CRD-37 | P1: Archived list and archived board protect their cards | Tasks | In Tasks |
| CRD-38 | P1: Ownership boundary | Execute | Implementing |
| CRD-39 | P1: Ownership boundary | Execute | Implementing |
| CRD-40 | Edge case: list and board deletion cascade | Execute | Implementing |

**Coverage:** 40 total, 40 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A user can add a card to `To do`, move it to `Doing` and then to `Done` and mark it done with four HTTP calls or fewer.
- [ ] After any sequence of create, move, archive, unarchive and delete on a board, every list's active cards hold positions `0..n-1` exactly once.
- [ ] Zero card routes answer with data of another user's board.
