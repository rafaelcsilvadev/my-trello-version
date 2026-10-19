# Lists Context

**Gathered:** 2026-10-19
**Spec:** `.specs/features/lists/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A logged-in user creates, lists, reads, renames, reorders, archives, unarchives and deletes lists inside one of their own boards. A user never sees or changes lists of another user's boards. Cards inside a list belong to feature 4.

---

## Implementation Decisions

### Routes (hybrid, Trello style)

- Collection routes are nested under the board: `POST /boards/:boardId/lists`, `GET /boards/:boardId/lists`.
- Item routes are flat: `GET /lists/:id`, `PATCH /lists/:id`, `POST /lists/:id/move`, `POST /lists/:id/archive`, `POST /lists/:id/unarchive`, `DELETE /lists/:id`.
- Cards will follow the same pattern.

### Archive and delete (same as boards)

- A list can be archived and unarchived; both actions are idempotent.
- An archived list is read-only: `PATCH` and `move` return `409`.
- `DELETE` is allowed only on an archived list; deleting an active list returns `409`.

### Ordering

- Each active list has a 0-based `position` within its board; the active lists of a board always hold positions `0..n-1` with no gaps or duplicates.
- `POST /lists/:id/move { "position": k }` moves the list to index `k` among the board's active lists and shifts the others; a `k` beyond the last index moves the list to the end.
- Moving is only within the same board.

### Agent's Discretion

- Board archived → its lists are read-only: every list write (create, update, move, archive, unarchive, delete) returns `409` `/problems/board-archived`; reads still work.
- `GET /boards/:boardId/lists` returns active lists ordered by `position`; `?archived=true` returns archived lists ordered by `archivedAt` descending.
- New list goes to the end. Archived lists have `position: null`; unarchive puts the list at the end.
- List fields: `title` only, 1–100 characters after trim.

### Declined / Undiscussed Gray Areas → Assumptions

- Malformed ids, empty `PATCH` body, concurrent moves, list limit per board and delete cascade are logged in the spec's Assumptions table.

---

## Specific References

Trello: lists live in a board, are dragged left/right to reorder, and are archived before being deleted.

---

## Deferred Ideas

- Move a list to another board.
- Copy a list.
- Restore an unarchived list to its original position.
- Archive all cards in a list (needs cards, feature 4).
