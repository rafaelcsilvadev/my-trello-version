# Cards Context

**Gathered:** 2026-10-20
**Spec:** `.specs/features/cards/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A logged-in user creates, lists, reads, edits, reorders, moves between lists, archives, unarchives and deletes cards inside the lists of their own boards. A card carries a title, an optional description, an optional due date and a done flag. A user never sees or changes cards of another user's boards. Labels and checklists belong to features 5 and 6.

---

## Implementation Decisions

### Card fields

- `title`: required, 1–100 characters after trim (same as boards and lists).
- `description`: optional, trimmed, blank stored as `null`, at most 5000 characters after trim.
- `dueDate`: optional calendar date `YYYY-MM-DD` (no time, no time zone), `null` when unset.
- `done`: boolean, independent of `dueDate` (a card without a due date can be done); a new card starts with `done: false`.

### Moving cards

- `POST /cards/:id/move { "listId"?, "position" }`: without `listId` (or with the card's own list) it reorders inside the list; with another list it moves the card there.
- Only lists of the same board are valid targets; cross-board move is out of scope.
- A `position` beyond the end puts the card at the end of the target list.
- An archived card, an archived source list and an archived target list all block the move with `409`.

### Cards of an archived list

- Archiving a list leaves its cards untouched (state and positions); unarchiving the list brings them back as they were.
- While a list is archived its cards are read-only: every card write returns `409` `/problems/list-archived`.
- Error precedence: board archived > list archived > card state.

### Reading cards

- `GET /lists/:listId/cards`: active cards by `position`; `?archived=true` returns the list's archived cards.
- `GET /boards/:boardId/cards?archived=true`: the board's archive panel (archived cards of every list).
- `GET /cards/:id` reads one card in any state.

### Agent's Discretion

- Card archive works like list archive: `position` is `null` while archived, unarchive puts the card at the end of its list, `DELETE` only on archived cards, archive and unarchive are idempotent.
- `GET /boards/:boardId/cards` without `archived` (or `false`) returns the active cards of the board's active lists, ordered by list position, then card position, so a client can load a board in one call.
- Archived cards (both routes) are ordered by `archivedAt` descending.

### Declined / Undiscussed Gray Areas → Assumptions

- `done` on create, clearing fields with `null`, malformed `listId` in the move body, concurrent writes, card limit and delete cascade are logged in the spec's Assumptions table.

---

## Specific References

Trello: cards live in a list, are dragged up/down and across lists of the same board, carry a due date and a "complete" mark, and are archived before being deleted.

---

## Deferred Ideas

- Move a card to another board.
- Copy a card.
- Due time and reminders.
- Restore an unarchived card to its original position.
- Archive all cards of a list.
