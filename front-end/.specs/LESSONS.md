# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-001 - Test each screen composition through the rendered screen, asserting every prop it derives and passes to child components, not only the view-model state and the children in isolation
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `components` · harmful: 1
- features: boards, board-filters
- evidence: M40-M43 front-end/src/features/boards/components/boards-screen.tsx:89,115,125,147 (components) (+1 more)
- last seen: 2026-10-30T20:11:17Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-002 - When a spec says a value is computed before trimming, test it with input that has surrounding spaces
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: boards
- evidence: M50 front-end/src/features/boards/components/board-form-dialog.tsx:110 (components)
- last seen: 2026-10-26T20:51:23Z

### L-003 - Test per-item state with at least two items and assert the untouched item stays unaffected
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: boards
- evidence: N5 front-end/src/features/boards/components/boards-screen.tsx:89 (components)
- last seen: 2026-10-26T21:23:45Z

### L-004 - When a component receives a pending flag, test every control the spec locks while pending, not only the pending indicator
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board
- evidence: FBV-58 front-end/src/features/board/components/card-tile.tsx:82 (components)
- last seen: 2026-10-28T01:03:59Z

### L-005 - Test a callback a feature passes into a shared hook through the feature itself, asserting its effect, not only with a spy in the shared hook test
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `view-models` · harmful: 0
- features: board
- evidence: S10 front-end/src/features/board/view-models/use-board-view-model.ts:90 (view-models)
- last seen: 2026-10-28T01:03:59Z

### L-006 - Test a toggle in both directions
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `view-models` · harmful: 0
- features: board
- evidence: S13 front-end/src/features/board/view-models/use-board-view-model.ts:200 (view-models)
- last seen: 2026-10-28T01:03:59Z

### L-007 - Assert that a request was not sent only after a later request has arrived, never right after the action
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: board
- evidence: S9 front-end/test/unit/features/board/view-models/use-board-view-model.spec.tsx:486-500 (tests)
- last seen: 2026-10-28T01:03:59Z

### L-008 - Test the empty-collection branch together with every toggle that adds content to it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board
- evidence: S43 front-end/src/features/board/components/board-columns.tsx:121 (components)
- last seen: 2026-10-28T01:03:59Z

### L-009 - Assert the layout and style classes the spec names when jsdom cannot observe the layout
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board
- evidence: S45 S46 S47 front-end/src/features/board/components/board-columns.tsx:137 board-column.tsx:66 archived-cards-column.tsx:33 (components)
- last seen: 2026-10-28T01:03:59Z

### L-010 - Scope an element query to the part of the component that owns it, so a matching child elsewhere cannot satisfy the assertion
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: board
- evidence: S47b front-end/test/unit/features/board/components/archived-cards-column.spec.tsx:86 (archived-cards-column.tsx:36) (tests)
- last seen: 2026-10-28T13:54:53Z

### L-011 - When the spec names a specific icon, assert that icon's identity, not only that some svg is present
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: board
- evidence: N4 front-end/test/unit/features/board/components/archived-cards-column.spec.tsx:88 (archived-cards-column.tsx:36) (tests)
- last seen: 2026-10-28T14:08:17Z

### L-012 - When a spec names a visual style (dashed, highlighted, icon), assert the class or glyph that draws it, not just that the element exists.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `front-end/components` · harmful: 0
- features: board-dnd
- evidence: FDND-02 board-column.spec.tsx:521 (front-end/components)
- last seen: 2026-10-28T19:58:36Z

### L-013 - Test each clear-all button with every filter kind active, not only the one that was easiest to set
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board-filters
- evidence: M40 front-end/src/features/board/components/board-screen.tsx:84 (components)
- last seen: 2026-10-29T18:09:54Z

### L-014 - When an acceptance criterion lists several triggers, test each trigger, not only the first
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board-filters
- evidence: FBF-13 front-end/test/unit/features/board/components/label-filter.spec.tsx:117 (components)
- last seen: 2026-10-29T18:09:54Z

### L-015 - Check how a React Aria trigger names its overlay before designing an aria-label on the overlay
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board-filters
- evidence: SPEC_DEVIATION front-end/src/features/board/components/label-filter.tsx:39 (components)
- last seen: 2026-10-29T18:09:54Z

### L-016 - Do not nest a shared focusable form control inside an ARIA menu item; draw its visual instead
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: board-filters
- evidence: SPEC_DEVIATION front-end/src/features/board/components/label-filter.tsx:63 (components)
- last seen: 2026-10-29T18:09:54Z

### L-017 - Click each toast action such as Recarregar in a test and assert the exact queries it refetches, since a settle refetch can mask a wrong reload key
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `view-models` · harmful: 0
- features: card-detail
- evidence: M19 use-card-detail-view-model.ts:59 (validation.md Fix 2) (view-models)
- last seen: 2026-10-30T20:11:17Z

### L-018 - Assert the visual state an AC names, such as dimmed, with a class or style check on every listed field, not only the disabled attribute
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: card-detail
- evidence: FCD-34 card-detail-title.tsx:78 (validation.md Fix 3) (components)
- last seen: 2026-10-30T20:11:17Z

### L-019 - Give each negative clause of an AC, such as no control or not shown, its own absence assertion
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: card-detail
- evidence: FCD-29 card-detail.spec.tsx:283-293 (validation.md Fix 4) (components)
- last seen: 2026-10-30T20:11:17Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
