# Lists Specification

## Problem Statement

A board is empty until it holds lists: lists are the columns ("To do", "Doing", "Done") that cards will live in. A logged-in user needs to add lists to a board, see them in a stable left-to-right order, rename and reorder them, put old ones away and remove them for good. Lists belong to a board, so the board's owner and the board's archive state decide who can see and change them (BE-AD-008).

## Goals

- [ ] A logged-in user can add lists to one of their boards and get them back from `GET /api/v1/boards/:boardId/lists` in the order they set.
- [ ] Reordering, archiving and deleting always leave the board's active lists at positions `0..n-1`, with no gaps or duplicates.
- [ ] No list route ever reveals or changes a list of another user's board.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Cards inside a list | Feature 4 (ROADMAP) |
| Moving a list to another board | Not needed for the MVP (context.md Deferred Ideas) |
| Copying a list, archiving all cards of a list | Not needed for the MVP / needs cards (context.md Deferred Ideas) |
| List description, color or limits (WIP) | Trello lists only carry a name |
| Pagination of lists | A board has few lists |
| List-specific rate limiting | No abuse surface beyond authenticated routes |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Routes | Collection nested (`/boards/:boardId/lists`), item flat (`/lists/:id`, `/lists/:id/move`, `/archive`, `/unarchive`) | Trello API style; cards reuse the pattern | y |
| List fields | `title` only, 1–100 chars after trim (required) | Same bound as board titles | y |
| Archive semantics | Archived list is read-only (`PATCH`, `move` → `409`); `DELETE` only on archived lists | Same lifecycle as boards | y |
| Ordering model | Active lists hold a 0-based `position`, contiguous `0..n-1`; `move` takes the target index | Simple for the client; the server renumbers | y |
| `move` beyond the end | `position` greater than the last index moves the list to the end | Client can say "to the end" without knowing `n` | y |
| Cross-board move | Not supported | Deferred (context.md) | y |
| Position of a new list | End of the board's active lists | Trello default | y |
| Archived list position | `position` is `null` while archived; unarchive puts the list at the end | Keeps active positions contiguous; restoring the old slot is deferred | y |
| Archived list order | `GET ...?archived=true` orders by `archivedAt` descending | Most recently archived first, like Trello's archive panel | y |
| Archived board | Lists of an archived board can be read but not written: every list write returns `409` `/problems/board-archived` | An archived board is read-only (BRD-14); its content follows | y |
| Error precedence | When both the board and the list are archived, the board error (`/problems/board-archived`) wins | The outer container decides first | y |
| Unknown or foreign board on nested routes | `404` `/problems/board-not-found`, same body as BRD-21 | Reuses the board lookup (BE-AD-008) | y |
| Unknown, foreign or malformed list id | `404` `/problems/list-not-found`, identical in all three cases | Same rule as boards (BE-AD-008) | y |
| Empty `PATCH` body `{}` | `200` with the unchanged list; `updatedAt` unchanged | Same as BRD-13 | y |
| `updatedAt` on move | Changes only on the moved list and only when its position changes; lists shifted as a side effect keep their `updatedAt` | `updatedAt` tracks what the client changed | y |
| `archived` query values | Only `true` and `false`; any other value → `400` | Same as BRD-07 | y |
| Concurrent writes on one board | Writes that change positions on the same board are serialized; positions stay contiguous. Title edits: last write wins | Ordering is an invariant, titles are not | y |
| Delete cascade | Deleting a board deletes its lists; cards add their own cascade in feature 4 | No orphan rows (boards spec Assumptions) | y |
| List limit per board | None | Personal scale | y |
| Duplicate titles | Allowed | Trello allows them | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Create a list ⭐ MVP

**User Story**: As a logged-in user, I want to add a list with a title to one of my boards so that I can split work into stages.

**Why P1**: Cards need a list to live in.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/boards/:boardId/lists` on an active board of theirs with a valid `title` THEN the system SHALL create the list at the end of the board's active lists (`position` equal to the number of active lists before the call) and return `201` with body `{ "id", "boardId", "title", "position", "archivedAt": null, "createdAt", "updatedAt" }`.  <!-- LST-01 -->
2. The system SHALL store and return `title` trimmed.  <!-- LST-02 -->
3. IF `title` is missing, not a string, empty after trim or longer than 100 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `title` and SHALL NOT create a list.  <!-- LST-03 -->
4. IF `:boardId` on `POST` or `GET /api/v1/boards/:boardId/lists` does not exist, belongs to another user, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/board-not-found`, identical in all three cases, and SHALL NOT create a list.  <!-- LST-04 -->
5. WHILE a board is archived the system SHALL answer `POST /api/v1/boards/:boardId/lists` with `409` and `type` `/problems/board-archived`, and SHALL NOT create a list.  <!-- LST-05 -->

**Independent Test**: e2e test registers, creates a board, creates lists `"  To do  "` and `"Doing"`, and gets `201` with `title` `"To do"` / `position` `0` and `title` `"Doing"` / `position` `1`; a body with `title` `""` returns `400`.

---

### P1: List and read lists ⭐ MVP

**User Story**: As a logged-in user, I want to see the lists of a board in order and open one so that I can see the board's structure.

**Why P1**: The board view is built from this response.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/v1/boards/:boardId/lists` on a board of theirs without `archived` or with `archived=false` THEN the system SHALL return `200` with an array of that board's lists whose `archivedAt` is `null`, ordered by `position` ascending, whether the board is archived or not.  <!-- LST-06 -->
2. WHEN a client calls `GET /api/v1/boards/:boardId/lists?archived=true` on a board of theirs THEN the system SHALL return `200` with an array of that board's lists whose `archivedAt` is not `null`, each with `position` `null`, ordered by `archivedAt` descending.  <!-- LST-07 -->
3. IF the `archived` query parameter is present with a value other than `true` or `false` THEN the system SHALL return `400` with an `errors` item whose `field` is `archived`.  <!-- LST-08 -->
4. WHEN a client calls `GET /api/v1/lists/:id` for a list on one of their boards THEN the system SHALL return `200` with that list, whether the list or its board is archived or not.  <!-- LST-09 -->

**Independent Test**: e2e test creates a board with three lists and archives one: `GET /boards/:boardId/lists` returns the two active lists at positions `0` and `1`; `?archived=true` returns the archived one with `position` `null`.

---

### P1: Rename a list ⭐ MVP

**User Story**: As a logged-in user, I want to rename a list so that its stage name stays accurate.

**Why P1**: Stage names change as a workflow evolves.

**Acceptance Criteria**:

1. WHEN a client calls `PATCH /api/v1/lists/:id` on an active list of an active board of theirs with a valid `title` THEN the system SHALL update the title and return `200` with the updated list and a later `updatedAt`.  <!-- LST-10 -->
2. IF a `PATCH` body has an invalid `title` (including `null`) by the rules of LST-03 THEN the system SHALL return `400` with an `errors` item whose `field` is `title` and SHALL NOT change the list.  <!-- LST-11 -->
3. WHEN a `PATCH` body is `{}` THEN the system SHALL return `200` with the list unchanged, including `updatedAt`.  <!-- LST-12 -->
4. WHILE a list is archived the system SHALL answer `PATCH /api/v1/lists/:id` with `409` and `type` `/problems/list-archived`, and SHALL NOT change the list.  <!-- LST-13 -->

**Independent Test**: e2e test creates a list, patches its title (`200`, new title), archives it, and a second patch returns `409`.

---

### P1: Reorder lists ⭐ MVP

**User Story**: As a logged-in user, I want to move a list to another position in its board so that the columns follow my workflow.

**Why P1**: Reordering is part of the roadmap scope for lists.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/lists/:id/move` on an active list of an active board of theirs with `position` `k` where `0 ≤ k ≤ n-1` (`n` = number of active lists in the board) THEN the system SHALL place the list at index `k`, shift the other active lists keeping their relative order, and return `200` with the moved list whose `position` is `k`.  <!-- LST-14 -->
2. WHEN `position` `k` is greater than `n-1` THEN the system SHALL move the list to position `n-1` and return `200` with the moved list.  <!-- LST-15 -->
3. WHEN `position` equals the list's current position THEN the system SHALL return `200` with the list unchanged, including `updatedAt`.  <!-- LST-16 -->
4. IF `position` is missing, not an integer, or negative THEN the system SHALL return `400` with an `errors` item whose `field` is `position` and SHALL NOT change any list.  <!-- LST-17 -->
5. WHILE a list is archived the system SHALL answer `POST /api/v1/lists/:id/move` with `409` and `type` `/problems/list-archived`, and SHALL NOT change any list.  <!-- LST-18 -->
6. The system SHALL keep the active lists of every board at positions `0..n-1`, each used exactly once, after every create, move, archive, unarchive and delete, including when such requests on the same board run concurrently.  <!-- LST-19 -->

**Independent Test**: e2e test creates lists A, B, C, D; `move` C to `0` returns `200` and `GET /boards/:boardId/lists` returns `[C, A, B, D]` at positions `0..3`.

---

### P1: Archive and unarchive a list ⭐ MVP

**User Story**: As a logged-in user, I want to archive lists I no longer use and restore them later so that the board stays clean without losing data.

**Why P1**: Archive is the safe path to deletion (context.md).

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/lists/:id/archive` on an active list of an active board of theirs THEN the system SHALL set `archivedAt` to the current time and `position` to `null`, close the gap in the remaining active lists' positions, and return `200` with the list.  <!-- LST-20 -->
2. WHEN a client calls `POST /api/v1/lists/:id/archive` on an already archived list THEN the system SHALL return `200` with the list and its original `archivedAt` unchanged.  <!-- LST-21 -->
3. WHEN a client calls `POST /api/v1/lists/:id/unarchive` on an archived list of an active board of theirs THEN the system SHALL set `archivedAt` to `null`, set `position` to the number of active lists before the call (end of the board), and return `200` with the list.  <!-- LST-22 -->
4. WHEN a client calls `POST /api/v1/lists/:id/unarchive` on an active list THEN the system SHALL return `200` with the list unchanged.  <!-- LST-23 -->

**Independent Test**: e2e test archives the first of three lists: it leaves `GET /boards/:boardId/lists`, the other two move to positions `0` and `1`, and it appears in `?archived=true`; after unarchive it is back at position `2`.

---

### P1: Delete a list ⭐ MVP

**User Story**: As a logged-in user, I want to permanently delete an archived list so that I can remove what I no longer need.

**Why P1**: Completes the list lifecycle, as for boards.

**Acceptance Criteria**:

1. WHEN a client calls `DELETE /api/v1/lists/:id` on an archived list of an active board of theirs THEN the system SHALL delete the list and return `204` with no body.  <!-- LST-24 -->
2. WHILE a list is active the system SHALL answer `DELETE /api/v1/lists/:id` with `409` and `type` `/problems/list-not-archived`, and SHALL NOT delete the list.  <!-- LST-25 -->

**Independent Test**: e2e test: deleting an active list returns `409`; after archive, delete returns `204` and `GET /lists/:id` returns `404`.

---

### P1: Archived board protects its lists ⭐ MVP

**User Story**: As a logged-in user, I want an archived board to stay frozen, lists included, so that restoring it gives back exactly what I archived.

**Why P1**: An archived board is read-only (BRD-14); without this, its lists could still change.

**Acceptance Criteria**:

1. WHILE a list's board is archived the system SHALL answer `PATCH /api/v1/lists/:id`, `POST /api/v1/lists/:id/move`, `POST /api/v1/lists/:id/archive`, `POST /api/v1/lists/:id/unarchive` and `DELETE /api/v1/lists/:id` with `409` and `type` `/problems/board-archived`, whether the list is archived or not, and SHALL NOT change any list.  <!-- LST-26 -->

**Independent Test**: e2e test creates a list, archives its board, and every list write returns `409` `/problems/board-archived`; after the board is unarchived, the list is unchanged.

---

### P1: Ownership boundary ⭐ MVP

**User Story**: As a user, I want the lists of my boards to be invisible to everyone else so that my data stays private.

**Why P1**: Single-owner product; a leak breaks the core promise.

**Acceptance Criteria**:

1. IF a request to `GET`, `PATCH` or `DELETE /api/v1/lists/:id`, or to `POST /api/v1/lists/:id/move`, `/archive` or `/unarchive`, targets an id that does not exist, belongs to a list of another user's board, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/list-not-found`, identical in all three cases, and SHALL NOT change any list.  <!-- LST-27 -->
2. The system SHALL require a valid access token on every `/api/v1/boards/:boardId/lists` and `/api/v1/lists` route (AUTH-16).  <!-- LST-28 -->

**Independent Test**: e2e test: user B calls every `/lists/:id` route on user A's list and gets `404`, and both collection routes on user A's board and gets `404`; user A's lists are unchanged afterwards.

---

## Edge Cases

- IF a create, `PATCH` or `move` body contains a property not declared in the contract (e.g. `position` on create or `PATCH`, `boardId`, `archivedAt`) THEN the system SHALL return `400` (covered by FND-09).
- WHEN a board has no lists THEN `GET /api/v1/boards/:boardId/lists` SHALL return `200` with `[]` (covered by LST-06).
- WHEN a board's only active list is moved to any `position` THEN the system SHALL return `200` with `position` `0` (covered by LST-15 and LST-16).
- IF a board is deleted THEN the system SHALL delete its lists (database foreign key with cascade).  <!-- LST-29 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | LST-02, LST-03, LST-08, LST-11, LST-17, LST-27 (malformed id) |
| Failure / partial-failure states | LST-03, LST-05, LST-11, LST-13, LST-17, LST-18, LST-25, LST-26 (rejected requests change nothing); multi-row position changes are atomic (LST-19) |
| Idempotency / retry / duplicate handling | LST-21, LST-23 (archive/unarchive idempotent); LST-16 (move to the same position is a no-op); duplicate titles allowed (Assumptions) |
| Auth boundaries & rate limits | LST-04, LST-27, LST-28; no extra rate limit (Out of Scope) |
| Concurrency / ordering | LST-19 (position writes on one board are serialized and stay contiguous); title edits last write wins (Assumptions) |
| Data lifecycle / expiry | LST-20 to LST-25 (archive → delete), LST-29 |
| Observability | Covered by FND-16 and FND-17 (request logs with request id) |
| External-dependency failure | N/A because lists add no external dependency beyond the database, whose failure surfaces as FND-11 `500` |
| State-transition integrity | Active ⇄ archived (LST-20 to LST-23); edit and move only while active (LST-13, LST-18); delete only while archived (LST-25); board archive freezes lists (LST-05, LST-26) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LST-01 | P1: Create a list | Tasks | In Tasks |
| LST-02 | P1: Create a list | Tasks | In Tasks |
| LST-03 | P1: Create a list | Tasks | In Tasks |
| LST-04 | P1: Create a list | Tasks | In Tasks |
| LST-05 | P1: Create a list | Tasks | In Tasks |
| LST-06 | P1: List and read lists | Tasks | In Tasks |
| LST-07 | P1: List and read lists | Tasks | In Tasks |
| LST-08 | P1: List and read lists | Tasks | In Tasks |
| LST-09 | P1: List and read lists | Tasks | In Tasks |
| LST-10 | P1: Rename a list | Tasks | In Tasks |
| LST-11 | P1: Rename a list | Tasks | In Tasks |
| LST-12 | P1: Rename a list | Tasks | In Tasks |
| LST-13 | P1: Rename a list | Tasks | In Tasks |
| LST-14 | P1: Reorder lists | Tasks | In Tasks |
| LST-15 | P1: Reorder lists | Tasks | In Tasks |
| LST-16 | P1: Reorder lists | Tasks | In Tasks |
| LST-17 | P1: Reorder lists | Tasks | In Tasks |
| LST-18 | P1: Reorder lists | Tasks | In Tasks |
| LST-19 | P1: Reorder lists | Tasks | In Tasks |
| LST-20 | P1: Archive and unarchive a list | Tasks | In Tasks |
| LST-21 | P1: Archive and unarchive a list | Tasks | In Tasks |
| LST-22 | P1: Archive and unarchive a list | Tasks | In Tasks |
| LST-23 | P1: Archive and unarchive a list | Tasks | In Tasks |
| LST-24 | P1: Delete a list | Tasks | In Tasks |
| LST-25 | P1: Delete a list | Tasks | In Tasks |
| LST-26 | P1: Archived board protects its lists | Tasks | In Tasks |
| LST-27 | P1: Ownership boundary | Tasks | In Tasks |
| LST-28 | P1: Ownership boundary | Tasks | In Tasks |
| LST-29 | Edge case: board deletion cascade | Tasks | In Tasks |

**Coverage:** 29 total, 29 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A user can build a board with lists `To do`, `Doing`, `Done` and reorder them with three HTTP calls or fewer.
- [ ] After any sequence of create, move, archive, unarchive and delete on a board, its active lists hold positions `0..n-1` exactly once.
- [ ] Zero list routes answer with data of another user's board.
