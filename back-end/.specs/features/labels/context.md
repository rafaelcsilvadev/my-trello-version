# Labels Context

**Gathered:** 2026-10-20
**Spec:** `.specs/features/labels/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A logged-in user creates, lists, edits and deletes labels on their own boards, and applies labels to and removes them from the cards of that board. A label has a name and a color from a fixed palette. Every card response shows the ids of the labels applied to it. A user never sees or changes labels of another user's boards. Checklists belong to feature 6.

---

## Implementation Decisions

### Label fields

- `name`: required, 1–50 characters after trim, unique per board, compared case-insensitively after trim (`"Bug"` and `" bug "` clash on the same board; different boards never clash).
- `color`: required, one of a fixed palette of 10 values: `green`, `yellow`, `orange`, `red`, `purple`, `blue`, `sky`, `lime`, `pink`, `black`.
- A name taken by another label of the board returns `409`.

### Default labels

- A new board starts with no labels. `POST /boards` does not change.

### Applying labels to cards

- `PUT /cards/:id/labels/:labelId` applies a label, `DELETE /cards/:id/labels/:labelId` removes it. Both are idempotent and return `204`.
- Only labels of the card's own board can be applied.
- Every card response gains `labelIds: string[]`. Clients get names and colors from `GET /boards/:boardId/labels`.

### Archive and delete

- Labels have no archive: `DELETE /labels/:id` deletes directly.
- Deleting a label removes it from every card of the board, archived cards included.
- An archived board freezes its labels: every label write and every apply/remove on its cards returns `409` `/problems/board-archived`.
- Apply/remove is a card write: an archived list returns `409` `/problems/list-archived`, an archived card returns `409` `/problems/card-archived`, with the precedence board > list > card used by cards.

### Agent's Discretion

- `GET /boards/:boardId/labels` and `labelIds` on a card are ordered by label `createdAt` ascending, then `id`.
- Applying or removing a label, and deleting a label in use, leave the card's `updatedAt` unchanged.
- Not-found checks run before state checks on apply/remove: `card-not-found` > `label-not-found` > `board-archived` > `list-archived` > `card-archived`.

### Declined / Undiscussed Gray Areas → Assumptions

- Label limit per board or per card, label read by id, color case and concurrent duplicate names are logged in the spec's Assumptions table.

---

## Specific References

Trello: labels belong to a board, carry a color and a name, are toggled on a card from a picker, and deleting one removes it from every card.

---

## Deferred Ideas

- Default labels on a new board.
- Free hex colors.
- Filtering cards by label.
- Copying labels between boards.
