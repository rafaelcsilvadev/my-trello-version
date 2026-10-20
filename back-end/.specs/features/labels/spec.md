# Labels Specification

## Problem Statement

Cards of one board mix bugs, ideas and chores, and a title alone does not tell them apart at a glance. A logged-in user needs board-level labels, each a name and a color, that they can put on and take off cards, so a board can be scanned by kind of work. Labels belong to a board, so the board's owner and its archive state decide who can see and change them (BE-AD-008, BE-AD-010).

## Goals

- [ ] A logged-in user can create a label on a board, apply it to a card and see its id in that card's `labelIds` with three HTTP calls.
- [ ] No two labels of the same board share a name (case-insensitive, after trim), even under concurrent writes.
- [ ] No label route ever reveals or changes a label of another user's board, and no card ever holds a label of another board.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Checklists on cards | Feature 6 (ROADMAP) |
| Default labels on a new board | Discussed: a board starts empty (context.md) |
| Free hex colors | Discussed: fixed palette (context.md) |
| Label archive | Discussed: labels are deleted directly (context.md) |
| Filtering cards by label, copying labels between boards | Not needed for the MVP (context.md Deferred Ideas) |
| `GET /labels/:id` | The board listing returns every label; no client needs a single read |
| Label-specific rate limiting | No abuse surface beyond authenticated routes |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Routes | Collection nested (`/boards/:boardId/labels`), item flat (`/labels/:id`); apply/remove on `/cards/:id/labels/:labelId` | Same pattern as lists and cards | y |
| Label fields | `name` 1–50 after trim (required); `color` one of `green`, `yellow`, `orange`, `red`, `purple`, `blue`, `sky`, `lime`, `pink`, `black` (required) | Discussed (context.md) | y |
| Color case | Exact lowercase match only; `"Green"` → `400` | One spelling per color; clients render from a fixed map | y |
| Name uniqueness | Unique per board, compared with `lower(trim(name))`; a clash → `409` `/problems/label-name-taken` | Discussed (context.md) | y |
| Renaming to the same name | `PATCH` with the label's own name in another case (`"Bug"` → `"BUG"`) is allowed and stores the new case | The only clash is with another label | y |
| Response body | `{ "id", "boardId", "name", "color", "createdAt", "updatedAt" }` | Mirrors the list body; `boardId` ties it to its board | y |
| Label ordering | `createdAt` ascending, then `id` | Stable order with no position field to maintain | y |
| Apply/remove | `PUT` and `DELETE /cards/:id/labels/:labelId`, both idempotent, `204` with no body | Discussed (context.md) | y |
| Card body | Every card response gains `labelIds: string[]`, label order; `[]` when none | Discussed (context.md) | y |
| Card `updatedAt` | Unchanged by apply, remove and label delete | Labels are a relation, not a card field | y |
| Archived board | Labels can be read but not written; apply/remove on its cards → `409` `/problems/board-archived` | An archived board is read-only (BRD-14) | y |
| Archived list or card | Apply/remove → `409` `/problems/list-archived` or `/problems/card-archived` | Apply/remove is a card write (CRD-27, CRD-35) | y |
| Error precedence on apply/remove | `card-not-found` > `label-not-found` > `board-archived` > `list-archived` > `card-archived` | Lookups first, then the outer container decides first | y |
| Label of another board | `PUT` or `DELETE /cards/:id/labels/:labelId` with a label of another board (own or foreign) → `404` `/problems/label-not-found` | From the card's point of view that label does not exist | y |
| Unknown, foreign or malformed label id | `404` `/problems/label-not-found`, identical in all three cases | BE-AD-008 | y |
| Unknown, foreign or malformed board id on nested routes | `404` `/problems/board-not-found`, same body as BRD-21 | Reuses the board lookup (BE-AD-008) | y |
| Empty `PATCH` body `{}` | `200` with the unchanged label; `updatedAt` unchanged | Same as LST-12 | y |
| Clearing fields | `name: null` or `color: null` → `400` | Both fields are required | y |
| Delete cascade | Deleting a board deletes its labels and their card links; deleting a card, a list or a label deletes its card links | No orphan rows | y |
| Concurrent writes | Two creates or renames to the same name on one board: exactly one succeeds, the other → `409`. Two applies of the same label to one card: both `204`, applied once. Field edits: last write wins | Uniqueness is an invariant, fields are not | y |
| Label limit | None per board or per card | Personal scale | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Create a label ⭐ MVP

**User Story**: As a logged-in user, I want to create a named, colored label on a board so that I can tag its cards.

**Why P1**: Without labels nothing can be applied.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/boards/:boardId/labels` on an active board of theirs with a valid `name` and `color` THEN the system SHALL create the label and return `201` with body `{ "id", "boardId", "name", "color", "createdAt", "updatedAt" }`.  <!-- LBL-01 -->
2. The system SHALL store and return `name` trimmed.  <!-- LBL-02 -->
3. IF `name` is missing, not a string, empty after trim or longer than 50 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `name` and SHALL NOT create a label.  <!-- LBL-03 -->
4. IF `color` is missing or is not exactly one of `green`, `yellow`, `orange`, `red`, `purple`, `blue`, `sky`, `lime`, `pink`, `black` THEN the system SHALL return `400` with an `errors` item whose `field` is `color` and SHALL NOT create a label.  <!-- LBL-04 -->
5. IF the trimmed `name` equals, ignoring case, the name of another label of the same board THEN the system SHALL return `409` with `type` `/problems/label-name-taken` and SHALL NOT create a label.  <!-- LBL-05 -->
6. WHEN the trimmed `name` equals, ignoring case, the name of a label of another board THEN the system SHALL create the label and return `201`.  <!-- LBL-06 -->
7. WHILE a board is archived the system SHALL answer `POST /api/v1/boards/:boardId/labels` with `409` and `type` `/problems/board-archived` and SHALL NOT create a label.  <!-- LBL-07 -->
8. IF `:boardId` on `POST` or `GET /api/v1/boards/:boardId/labels` does not exist, belongs to another user, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/board-not-found`, identical in all three cases, and SHALL NOT create a label.  <!-- LBL-08 -->

**Independent Test**: e2e test registers, creates a board, creates `"  Bug  "` / `red` and gets `201` with `name` `"Bug"`; creating `"bug"` / `blue` on the same board returns `409` `/problems/label-name-taken`; creating `"Bug"` / `red` on a second board returns `201`; `color` `"Green"` returns `400`.

---

### P1: List a board's labels ⭐ MVP

**User Story**: As a logged-in user, I want to get every label of a board so that I can show a label picker and render card labels.

**Why P1**: `labelIds` on a card is useless without names and colors.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/v1/boards/:boardId/labels` on a board of theirs THEN the system SHALL return `200` with an array of that board's labels ordered by `createdAt` ascending, then `id`, whether the board is archived or not; a board with no labels SHALL return `[]`.  <!-- LBL-09 -->

**Independent Test**: e2e test creates labels `"Bug"`, `"Idea"`, `"Chore"` in that order and gets them back in that order; after the board is archived the same call returns the same array; a new board returns `[]`.

---

### P1: Edit a label ⭐ MVP

**User Story**: As a logged-in user, I want to rename a label or change its color so that it keeps matching how I organize the board.

**Why P1**: A typo in a label name would otherwise mean delete and re-apply on every card.

**Acceptance Criteria**:

1. WHEN a client calls `PATCH /api/v1/labels/:id` on a label of an active board of theirs with a valid `name`, `color` or both THEN the system SHALL change only the given fields, store `name` trimmed, update `updatedAt` and return `200` with the label body.  <!-- LBL-10 -->
2. IF `name` is present and is `null`, not a string, empty after trim or longer than 50 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `name` and SHALL NOT change the label.  <!-- LBL-11 -->
3. IF `color` is present and is `null` or not exactly one of the palette values of LBL-04 THEN the system SHALL return `400` with an `errors` item whose `field` is `color` and SHALL NOT change the label.  <!-- LBL-12 -->
4. IF the trimmed `name` equals, ignoring case, the name of another label of the same board THEN the system SHALL return `409` with `type` `/problems/label-name-taken` and SHALL NOT change the label.  <!-- LBL-13 -->
5. WHEN the trimmed `name` equals, ignoring case, the label's own current name THEN the system SHALL store the new value and return `200`.  <!-- LBL-14 -->
6. WHEN the body is `{}` THEN the system SHALL return `200` with the unchanged label and SHALL leave `updatedAt` unchanged.  <!-- LBL-15 -->

**Independent Test**: e2e test renames `"Bug"` to `"  Defect  "` and changes `color` to `orange`, getting `200` with `name` `"Defect"`; renaming `"Idea"` to `"defect"` returns `409`; renaming `"Defect"` to `"DEFECT"` returns `200`.

---

### P1: Delete a label ⭐ MVP

**User Story**: As a logged-in user, I want to delete a label I no longer use so that the picker stays short.

**Why P1**: Labels have no archive; delete is the only way to remove one.

**Acceptance Criteria**:

1. WHEN a client calls `DELETE /api/v1/labels/:id` on a label of an active board of theirs THEN the system SHALL delete the label and return `204`, and later `GET /api/v1/boards/:boardId/labels` SHALL NOT include it.  <!-- LBL-16 -->
2. WHEN a label applied to cards is deleted THEN the system SHALL remove its id from the `labelIds` of every card of the board, active or archived, and SHALL leave those cards' `updatedAt` unchanged.  <!-- LBL-17 -->

**Independent Test**: e2e test applies `"Bug"` to an active card and an archived card, deletes `"Bug"`, gets `204`, and both cards return `labelIds` `[]` with their `updatedAt` unchanged.

---

### P1: Apply and remove labels on a card ⭐ MVP

**User Story**: As a logged-in user, I want to put a label on a card and take it off so that I can tag the card's kind of work.

**Why P1**: Applying labels is the point of the feature.

**Acceptance Criteria**:

1. WHEN a client calls `PUT /api/v1/cards/:id/labels/:labelId` on an active card of an active list of an active board of theirs with a label of the same board THEN the system SHALL apply the label to the card and return `204` with no body.  <!-- LBL-18 -->
2. WHEN the label is already applied to the card THEN `PUT /api/v1/cards/:id/labels/:labelId` SHALL return `204` and the card SHALL hold the label once.  <!-- LBL-19 -->
3. WHEN a client calls `DELETE /api/v1/cards/:id/labels/:labelId` under the conditions of LBL-18 THEN the system SHALL remove the label from the card and return `204` with no body; a label not applied to the card SHALL also return `204` with no change.  <!-- LBL-20 -->
4. WHEN a label is applied to or removed from a card THEN the system SHALL leave the card's `updatedAt` unchanged.  <!-- LBL-21 -->
5. IF `:labelId` on `PUT` or `DELETE /api/v1/cards/:id/labels/:labelId` does not exist, belongs to another user's board, belongs to another board of the same user, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/label-not-found`, identical in all four cases, and SHALL NOT change any card.  <!-- LBL-22 -->
6. WHILE the card is archived and its list and board are active the system SHALL answer `PUT` and `DELETE /api/v1/cards/:id/labels/:labelId` with `409` and `type` `/problems/card-archived` and SHALL NOT change the card's labels.  <!-- LBL-23 -->
7. WHILE the card's list is archived and its board is active the system SHALL answer `PUT` and `DELETE /api/v1/cards/:id/labels/:labelId` with `409` and `type` `/problems/list-archived`, whether the card is archived or not, and SHALL NOT change the card's labels.  <!-- LBL-24 -->
8. IF `:id` and `:labelId` both fail their lookup THEN the system SHALL return the `/problems/card-not-found` error of LBL-30; IF a lookup fails THEN the system SHALL return its `404` before any `409` of LBL-23, LBL-24 or LBL-27.  <!-- LBL-25 -->

**Independent Test**: e2e test applies `"Bug"` twice to a card and reads `labelIds` `["<bug-id>"]`; removes it twice, both `204`, and reads `[]`; applying a label of a second board returns `404` `/problems/label-not-found`; archiving the card makes `PUT` return `409` `/problems/card-archived`.

---

### P1: Card responses show their labels ⭐ MVP

**User Story**: As a logged-in user, I want every card I read to tell me which labels it carries so that the board renders them without extra calls.

**Why P1**: A client loads a board with `GET /boards/:boardId/cards`; labels must come with it.

**Acceptance Criteria**:

1. The system SHALL include `labelIds` in every card body returned by the card routes (`POST /api/v1/lists/:listId/cards`, `GET /api/v1/lists/:listId/cards`, `GET /api/v1/boards/:boardId/cards`, `GET` and `PATCH /api/v1/cards/:id`, `POST /api/v1/cards/:id/move`, `/archive` and `/unarchive`), as an array of the ids of the labels applied to the card ordered by label `createdAt` ascending, then `id`, and as `[]` when none is applied (a new card always has `[]`).  <!-- LBL-26 -->

**Independent Test**: e2e test creates labels `"Bug"` then `"Idea"`, applies `"Idea"` then `"Bug"` to a card, and `GET /api/v1/cards/:id`, `GET /api/v1/lists/:listId/cards` and `GET /api/v1/boards/:boardId/cards` all return `labelIds` `["<bug-id>", "<idea-id>"]`.

---

### P1: Archived board freezes its labels ⭐ MVP

**User Story**: As a logged-in user, I want an archived board to stay frozen, labels included, so that restoring it gives back exactly what I archived.

**Why P1**: An archived board is read-only (BRD-14); without this, its labels could still change.

**Acceptance Criteria**:

1. WHILE a board is archived the system SHALL answer `PATCH` and `DELETE /api/v1/labels/:id` on its labels, and `PUT` and `DELETE /api/v1/cards/:id/labels/:labelId` on its cards, with `409` and `type` `/problems/board-archived`, whether the list or the card is archived or not, and SHALL NOT change any label or card.  <!-- LBL-27 -->

**Independent Test**: e2e test creates a label and applies it to a card, archives the board, and `PATCH` label, `DELETE` label, `PUT` and `DELETE` card label all return `409` `/problems/board-archived`; after unarchiving, the label and the card's `labelIds` are unchanged.

---

### P1: Ownership boundary ⭐ MVP

**User Story**: As a user, I want the labels of my boards to be invisible to everyone else so that my data stays private.

**Why P1**: Single-owner product; a leak breaks the core promise.

**Acceptance Criteria**:

1. IF a request to `PATCH` or `DELETE /api/v1/labels/:id` targets an id that does not exist, belongs to a label of another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/label-not-found`, identical in all three cases, and SHALL NOT change any label.  <!-- LBL-28 -->
2. The system SHALL require a valid access token on every `/api/v1/boards/:boardId/labels`, `/api/v1/labels` and `/api/v1/cards/:id/labels` route (AUTH-16).  <!-- LBL-29 -->
3. IF `:id` on `PUT` or `DELETE /api/v1/cards/:id/labels/:labelId` does not exist, belongs to a card of another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/card-not-found`, identical in all three cases, and SHALL NOT change any card.  <!-- LBL-30 -->

**Independent Test**: e2e test with two users: user B's `PATCH` and `DELETE` on user A's label return the same `404` as an unknown id; user B's `PUT` of their own label on user A's card returns `404` `/problems/card-not-found`; calls without a token return `401`.

---

## Edge Cases

- IF a create or `PATCH` body contains a property not declared in the contract (e.g. `boardId`, `id`) THEN the system SHALL return `400` (covered by FND-09).
- IF two requests create or rename labels of one board to the same name at the same time THEN the system SHALL accept exactly one and answer the other with `409` `/problems/label-name-taken` (database unique index on board and lowercased name).  <!-- LBL-31 -->
- IF two requests apply the same label to the same card at the same time THEN the system SHALL answer both with `204` and the card SHALL hold the label once (database primary key on card and label).  <!-- LBL-32 -->
- IF a board is deleted THEN the system SHALL delete its labels, and IF a card, a list, a board or a label is deleted THEN the system SHALL delete its card-label links (database foreign keys with cascade).  <!-- LBL-33 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | LBL-02 to LBL-04, LBL-11, LBL-12, LBL-08, LBL-22, LBL-28, LBL-30 (malformed ids) |
| Failure / partial-failure states | LBL-03 to LBL-05, LBL-07, LBL-11 to LBL-13, LBL-22 to LBL-25, LBL-27 (rejected requests change nothing); label delete and its card-link removal are one statement through the foreign key (LBL-17, LBL-33) |
| Idempotency / retry / duplicate handling | LBL-19, LBL-20 (apply/remove idempotent); LBL-15 (`{}` is a no-op); LBL-05, LBL-13 (duplicate names rejected) |
| Auth boundaries & rate limits | LBL-08, LBL-22, LBL-28 to LBL-30; no extra rate limit (Out of Scope) |
| Concurrency / ordering | LBL-31 (name uniqueness under races), LBL-32 (double apply); order by `createdAt`, then `id` (LBL-09, LBL-26); field edits last write wins (Assumptions) |
| Data lifecycle / expiry | LBL-16, LBL-17, LBL-33; no label archive (Out of Scope) |
| Observability | Covered by FND-16 and FND-17 (request logs with request id) |
| External-dependency failure | N/A because labels add no external dependency beyond the database, whose failure surfaces as FND-11 `500` |
| State-transition integrity | Labels have no states; archived board freezes labels and card links (LBL-07, LBL-27); archived list or card freezes card links with precedence board > list > card (LBL-23 to LBL-25) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LBL-01 | P1: Create a label | Validate | ✅ Verified |
| LBL-02 | P1: Create a label | Validate | ✅ Verified |
| LBL-03 | P1: Create a label | Validate | ✅ Verified |
| LBL-04 | P1: Create a label | Validate | ✅ Verified |
| LBL-05 | P1: Create a label | Validate | ✅ Verified |
| LBL-06 | P1: Create a label | Validate | ✅ Verified |
| LBL-07 | P1: Create a label | Validate | ✅ Verified |
| LBL-08 | P1: Create a label | Validate | ✅ Verified |
| LBL-09 | P1: List a board's labels | Validate | ✅ Verified |
| LBL-10 | P1: Edit a label | Validate | ✅ Verified |
| LBL-11 | P1: Edit a label | Validate | ✅ Verified |
| LBL-12 | P1: Edit a label | Validate | ✅ Verified |
| LBL-13 | P1: Edit a label | Validate | ✅ Verified |
| LBL-14 | P1: Edit a label | Validate | ✅ Verified |
| LBL-15 | P1: Edit a label | Validate | ✅ Verified |
| LBL-16 | P1: Delete a label | Validate | ✅ Verified |
| LBL-17 | P1: Delete a label | Validate | ✅ Verified |
| LBL-18 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-19 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-20 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-21 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-22 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-23 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-24 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-25 | P1: Apply and remove labels on a card | Validate | ✅ Verified |
| LBL-26 | P1: Card responses show their labels | Validate | ✅ Verified |
| LBL-27 | P1: Archived board freezes its labels | Validate | ✅ Verified |
| LBL-28 | P1: Ownership boundary | Validate | ✅ Verified |
| LBL-29 | P1: Ownership boundary | Validate | ✅ Verified |
| LBL-30 | P1: Ownership boundary | Validate | ✅ Verified |
| LBL-31 | Edge case: concurrent duplicate names | Validate | ✅ Verified |
| LBL-32 | Edge case: concurrent double apply | Validate | ✅ Verified |
| LBL-33 | Edge case: delete cascade | Validate | ✅ Verified |

**Coverage:** 33 total, 33 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A user can create a label, apply it to a card and see it in `GET /api/v1/boards/:boardId/cards` with three HTTP calls.
- [ ] Zero boards hold two labels whose names match ignoring case.
- [ ] Zero label routes answer with data of another user's board, and zero cards hold a label of another board.
