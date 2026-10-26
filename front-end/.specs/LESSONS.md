# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Test each screen composition through the rendered screen, asserting every prop it derives and passes to child components, not only the view-model state and the children in isolation
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: boards
- evidence: M40-M43 front-end/src/features/boards/components/boards-screen.tsx:89,115,125,147 (components)
- last seen: 2026-10-26T20:51:23Z

### L-002 - When a spec says a value is computed before trimming, test it with input that has surrounding spaces
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: boards
- evidence: M50 front-end/src/features/boards/components/board-form-dialog.tsx:110 (components)
- last seen: 2026-10-26T20:51:23Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
