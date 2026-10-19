# Boards Specification

## Problem Statement

Boards are the top-level container of the product: lists and cards live inside a board. A logged-in user needs to create boards, find them again, rename them, put old ones away, and remove them for good. Every board belongs to exactly one user, and no user may see or change another user's boards (ROADMAP: personal, single-owner Trello).

## Goals

- [ ] A logged-in user can create a board and see it in `GET /api/v1/boards` right after.
- [ ] Archived boards leave the default list and can be restored or deleted from the archive.
- [ ] No board route ever reveals or changes another user's board.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Lists and cards inside a board | Features 3 and 4 (ROADMAP) |
| Background color, cover image, starred boards | Not needed for the MVP (context.md Deferred Ideas) |
| Sharing boards, members, permissions | Single-owner product |
| Pagination, search, custom sort of boards | A personal user has few boards (context.md) |
| Board-specific rate limiting | No abuse surface beyond authenticated routes |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Board fields | `title` 1–100 chars after trim (required), `description` ≤ 1000 chars after trim (optional) | Enough for the MVP | y |
| Empty description | Missing, empty or whitespace-only `description` is stored and returned as `null` | One representation for "no description" | y |
| Archive semantics | Archived board is read-only; `DELETE` only on archived boards | Trello style, prevents accidental deletion | y |
| Listing | Active boards by default, `?archived=true` for archived, `createdAt` desc, no pagination | Personal scale | y |
| Archive endpoints | `POST /boards/:id/archive` and `POST /boards/:id/unarchive`, idempotent, `200` with the board | Explicit actions read better than a writable `archivedAt` field; retries are safe | y |
| Other user's board | `404` `/problems/board-not-found`, same body as a missing board | Does not reveal that a board id exists | y |
| Malformed `:id` (not a UUID) | `404` `/problems/board-not-found` | No board can have that id; client handling stays one case | y |
| Empty `PATCH` body `{}` | `200` with the unchanged board; `updatedAt` unchanged | Harmless no-op; no special error case | y |
| `archived` query values | Only `true` and `false` accepted; any other value → `400` | Typos fail loudly instead of returning the wrong list | y |
| Concurrent writes on one board | Last write wins; no optimistic locking | Single owner, low contention | y |
| Delete cascade | Deleting a board deletes everything inside it; lists and cards add their cascade in their own features | No orphan rows | y |
| Board limit per user | None | Personal scale | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Create a board ⭐ MVP

**User Story**: As a logged-in user, I want to create a board with a title and an optional description so that I can organize a project.

**Why P1**: Lists and cards need a board to live in.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/boards` with a valid `title` and optional `description` THEN the system SHALL create a board owned by the caller and return `201` with body `{ "id", "title", "description", "archivedAt": null, "createdAt", "updatedAt" }`.  <!-- BRD-01 -->
2. The system SHALL store and return `title` and `description` trimmed, and SHALL store and return a missing, empty or whitespace-only `description` as `null`.  <!-- BRD-02 -->
3. IF `title` is missing, not a string, empty after trim or longer than 100 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `title`.  <!-- BRD-03 -->
4. IF `description` is present and is neither a string nor `null`, or is longer than 1000 characters after trim THEN the system SHALL return `400` with an `errors` item whose `field` is `description`.  <!-- BRD-04 -->

**Independent Test**: e2e test registers, creates a board with `"  Roadmap  "` and gets `201` with `title` `"Roadmap"` and `description` `null`; a body with `title` `""` returns `400`.

---

### P1: List and read boards ⭐ MVP

**User Story**: As a logged-in user, I want to list my boards and open one so that I can get back to my work.

**Why P1**: Created boards are useless if they cannot be found again.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/v1/boards` without `archived` or with `archived=false` THEN the system SHALL return `200` with an array of the caller's boards whose `archivedAt` is `null`, ordered by `createdAt` descending.  <!-- BRD-05 -->
2. WHEN a client calls `GET /api/v1/boards?archived=true` THEN the system SHALL return `200` with an array of the caller's boards whose `archivedAt` is not `null`, ordered by `createdAt` descending.  <!-- BRD-06 -->
3. IF the `archived` query parameter is present with a value other than `true` or `false` THEN the system SHALL return `400` with an `errors` item whose `field` is `archived`.  <!-- BRD-07 -->
4. WHEN a client calls `GET /api/v1/boards/:id` for one of their boards THEN the system SHALL return `200` with that board, archived or not.  <!-- BRD-08 -->
5. The system SHALL NOT include another user's boards in any list response.  <!-- BRD-09 -->

**Independent Test**: e2e test with two users: each user creates boards, and each `GET /boards` returns only the caller's boards, newest first.

---

### P1: Update a board ⭐ MVP

**User Story**: As a logged-in user, I want to rename a board and change its description so that it stays accurate.

**Why P1**: Titles change as projects evolve.

**Acceptance Criteria**:

1. WHEN a client calls `PATCH /api/v1/boards/:id` on an active board of theirs with `title` and/or `description` THEN the system SHALL update only the fields present and return `200` with the updated board and a later `updatedAt`.  <!-- BRD-10 -->
2. WHEN a `PATCH` body sets `description` to `null` THEN the system SHALL store the description as `null`.  <!-- BRD-11 -->
3. IF a `PATCH` body has an invalid `title` (including `null`) or an invalid `description` by the rules of BRD-03 and BRD-04 THEN the system SHALL return `400` with an `errors` item for each invalid field and SHALL NOT change the board.  <!-- BRD-12 -->
4. WHEN a `PATCH` body is `{}` THEN the system SHALL return `200` with the board unchanged, including `updatedAt`.  <!-- BRD-13 -->
5. WHILE a board is archived the system SHALL answer `PATCH /api/v1/boards/:id` with `409` and `type` `/problems/board-archived`, and SHALL NOT change the board.  <!-- BRD-14 -->

**Independent Test**: e2e test creates a board, patches the title (`200`, new title), archives it, and a second patch returns `409`.

---

### P1: Archive and unarchive a board ⭐ MVP

**User Story**: As a logged-in user, I want to archive boards I no longer use and restore them later so that my list stays clean without losing data.

**Why P1**: Archive is the safe path to deletion (context.md).

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/boards/:id/archive` on an active board of theirs THEN the system SHALL set `archivedAt` to the current time and return `200` with the board.  <!-- BRD-15 -->
2. WHEN a client calls `POST /api/v1/boards/:id/archive` on an already archived board of theirs THEN the system SHALL return `200` with the board and its original `archivedAt` unchanged.  <!-- BRD-16 -->
3. WHEN a client calls `POST /api/v1/boards/:id/unarchive` on an archived board of theirs THEN the system SHALL set `archivedAt` to `null` and return `200` with the board.  <!-- BRD-17 -->
4. WHEN a client calls `POST /api/v1/boards/:id/unarchive` on an active board of theirs THEN the system SHALL return `200` with the board unchanged.  <!-- BRD-18 -->

**Independent Test**: e2e test archives a board: it leaves `GET /boards` and appears in `GET /boards?archived=true`; after unarchive it is back in `GET /boards`.

---

### P1: Delete a board ⭐ MVP

**User Story**: As a logged-in user, I want to permanently delete an archived board so that I can remove what I no longer need.

**Why P1**: Completes the board lifecycle from the roadmap.

**Acceptance Criteria**:

1. WHEN a client calls `DELETE /api/v1/boards/:id` on an archived board of theirs THEN the system SHALL delete the board and return `204` with no body.  <!-- BRD-19 -->
2. WHILE a board is active the system SHALL answer `DELETE /api/v1/boards/:id` with `409` and `type` `/problems/board-not-archived`, and SHALL NOT delete the board.  <!-- BRD-20 -->

**Independent Test**: e2e test: deleting an active board returns `409`; after archive, delete returns `204` and `GET /boards/:id` returns `404`.

---

### P1: Ownership boundary ⭐ MVP

**User Story**: As a user, I want my boards to be invisible to everyone else so that my data stays private.

**Why P1**: Single-owner product; a leak breaks the core promise.

**Acceptance Criteria**:

1. IF a request to `GET`, `PATCH` or `DELETE /api/v1/boards/:id`, or to `POST /api/v1/boards/:id/archive` or `/unarchive`, targets an id that does not exist, belongs to another user, or is not a UUID THEN the system SHALL return `404` with `type` `/problems/board-not-found`, identical in all three cases, and SHALL NOT change any board.  <!-- BRD-21 -->
2. The system SHALL require a valid access token on every `/api/v1/boards` route (AUTH-16).  <!-- BRD-22 -->

**Independent Test**: e2e test: user B calls every `/:id` route on user A's board and gets `404`; user A's board is unchanged afterwards.

---

## Edge Cases

- IF a create or `PATCH` body contains a property not declared in the contract (e.g. `archivedAt`, `id`) THEN the system SHALL return `400` (covered by FND-09).
- WHEN a user has no boards THEN `GET /api/v1/boards` SHALL return `200` with `[]` (covered by BRD-05).
- IF a user's account is deleted THEN the system SHALL delete that user's boards (database foreign key with cascade; account deletion itself is out of scope).  <!-- BRD-23 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | BRD-02, BRD-03, BRD-04, BRD-07, BRD-12, BRD-21 (malformed id) |
| Failure / partial-failure states | BRD-12, BRD-14, BRD-20, BRD-21 (rejected requests change nothing) |
| Idempotency / retry / duplicate handling | BRD-16, BRD-18 (archive/unarchive idempotent); duplicate titles allowed (no uniqueness) |
| Auth boundaries & rate limits | BRD-09, BRD-21, BRD-22; no extra rate limit (Out of Scope) |
| Concurrency / ordering | Last write wins (Assumptions); list order BRD-05, BRD-06 |
| Data lifecycle / expiry | BRD-15 to BRD-20 (archive → delete), BRD-23 |
| Observability | Covered by FND-16 and FND-17 (request logs with request id) |
| External-dependency failure | N/A because boards add no external dependency beyond the database, whose failure surfaces as FND-11 `500` |
| State-transition integrity | Active ⇄ archived (BRD-15 to BRD-18); edit only while active (BRD-14); delete only while archived (BRD-20) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BRD-01 | P1: Create a board | Tasks | In Tasks |
| BRD-02 | P1: Create a board | Tasks | In Tasks |
| BRD-03 | P1: Create a board | Tasks | In Tasks |
| BRD-04 | P1: Create a board | Tasks | In Tasks |
| BRD-05 | P1: List and read boards | Tasks | In Tasks |
| BRD-06 | P1: List and read boards | Tasks | In Tasks |
| BRD-07 | P1: List and read boards | Tasks | In Tasks |
| BRD-08 | P1: List and read boards | Tasks | In Tasks |
| BRD-09 | P1: List and read boards | Tasks | In Tasks |
| BRD-10 | P1: Update a board | Tasks | In Tasks |
| BRD-11 | P1: Update a board | Tasks | In Tasks |
| BRD-12 | P1: Update a board | Tasks | In Tasks |
| BRD-13 | P1: Update a board | Tasks | In Tasks |
| BRD-14 | P1: Update a board | Tasks | In Tasks |
| BRD-15 | P1: Archive and unarchive a board | Tasks | In Tasks |
| BRD-16 | P1: Archive and unarchive a board | Tasks | In Tasks |
| BRD-17 | P1: Archive and unarchive a board | Tasks | In Tasks |
| BRD-18 | P1: Archive and unarchive a board | Tasks | In Tasks |
| BRD-19 | P1: Delete a board | Tasks | In Tasks |
| BRD-20 | P1: Delete a board | Tasks | In Tasks |
| BRD-21 | P1: Ownership boundary | Tasks | In Tasks |
| BRD-22 | P1: Ownership boundary | Tasks | In Tasks |
| BRD-23 | Edge case: user deletion cascade | Tasks | In Tasks |

**Coverage:** 23 total, 23 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] Create → list → archive → delete works end to end in one e2e test with no manual step.
- [x] Every `/:id` route called by a second user returns `404` and leaves the board unchanged.
- [x] `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` and `pnpm lint` all exit `0`.
