# Boards Context

**Gathered:** 2026-10-19
**Spec:** `.specs/features/boards/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A logged-in user creates, lists, reads, updates, archives, unarchives and deletes their own boards under `/api/v1/boards`. A user never sees or changes another user's boards. Lists and cards inside a board belong to later features.

---

## Implementation Decisions

### Board fields

- `title`: required, 1–100 characters after trim.
- `description`: optional, up to 1000 characters after trim; empty or missing is stored as `null`.
- Responses expose `id`, `title`, `description`, `archivedAt`, `createdAt`, `updatedAt`.

### Archive and delete (Trello style)

- A board can be archived and unarchived at any time.
- An archived board is read-only: `PATCH` returns `409`.
- `DELETE` is allowed only on an archived board; deleting an active board returns `409`.

### Listing

- `GET /boards` returns only active boards; `GET /boards?archived=true` returns only archived boards.
- Ordered by `createdAt` descending, newest first.
- No pagination: a personal user has few boards.

### Agent's Discretion

- Archive and unarchive are dedicated actions: `POST /boards/:id/archive` and `POST /boards/:id/unarchive`, both idempotent (`200` with the current board).
- Another user's board answers exactly like a missing board: `404` with `type` `/problems/board-not-found`.
- `PATCH` is partial; `description: null` clears the description.

### Declined / Undiscussed Gray Areas → Assumptions

- Malformed `:id`, empty `PATCH` body, concurrent writes and cascade to future lists/cards are logged in the spec's Assumptions table.

---

## Specific References

Trello: archive first, then delete permanently from the archive.

---

## Deferred Ideas

- Board background color or cover image.
- Favorite/starred boards.
- Sharing boards with other users (out of the single-owner product).
- Pagination of the board list.
