# Checklists Context

**Gathered:** 2026-10-21
**Spec:** `.specs/features/checklists/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A logged-in user adds checklist items to a card of their own boards, lists them, edits their text, ticks them done, reorders them and deletes them. Every card response shows how many items the card has and how many are done. A user never sees or changes items of another user's boards.

---

## Implementation Decisions

### Model

- Items belong directly to a card: one flat checklist per card, no named checklists.
- An item has `text` and a `done` flag.

### Ordering

- Items hold a contiguous 0-based `position` per card, like lists and cards (BE-AD-010).
- `POST /checklist-items/:id/move` takes a target index inside the same card.

### Card body

- Every card response gains `checklist: { "total", "done" }`.
- The full items come from `GET /cards/:cardId/checklist-items`.

### Card `updatedAt`

- Creating, editing, ticking, moving or deleting an item leaves the card's `updatedAt` unchanged, the same as labels (LBL-21).

### Agent's Discretion

- Routes: collection nested (`/cards/:cardId/checklist-items`), item flat (`/checklist-items/:id`, `/checklist-items/:id/move`).
- `text` is 1–200 characters after trim; duplicates allowed.
- `done` is not accepted on create; a new item starts with `done: false`.
- Items have no archive; `DELETE` removes one directly and closes the position gap.
- An archived board, list or card freezes its items, with the precedence board > list > card used by cards and labels; reads stay allowed.

### Declined / Undiscussed Gray Areas → Assumptions

- Item limit per card, moving an item to another card, and concurrent writes are logged in the spec's Assumptions table.

---

## Specific References

Trello: a card shows a checklist badge `2/5`; items are ticked, edited inline and dragged to reorder.

---

## Deferred Ideas

- Several named checklists per card.
- Due date or assignee per item.
- Moving an item to another card.
- Converting an item into a card.
