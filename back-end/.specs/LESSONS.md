# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Redact sensitive keys at any nesting depth, including top level and array items, not only at fixed wildcard paths
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `logging` · harmful: 0
- features: foundation
- evidence: FND-17 src/logging/logging.module.ts:29-33 (logging)
- last seen: 2026-10-14T20:13:56Z

### L-002 - When one AC defines an exception to a global rule, state the carve-out in the global AC text too
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: foundation
- evidence: FND-07 vs FND-06 spec.md (spec)
- last seen: 2026-10-14T20:13:56Z

### L-003 - Redact sensitive keys in class instances and child logger bindings too, not only in plain log objects
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `logging` · harmful: 0
- features: foundation
- evidence: FND-17 src/logging/redact-passwords.ts:3-7,23 (iteration 2) (logging)
- last seen: 2026-10-14T20:23:11Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
