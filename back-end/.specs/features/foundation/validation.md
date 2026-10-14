# Foundation Validation

**Date**: 2026-10-14
**Spec**: `back-end/.specs/features/foundation/spec.md`
**Diff range**: `5a48e54^..e27da04` (branch `fix/foundation-validation`, T1..T14 + F1 + F2); depth focus `87203c4..e27da04` (`c561e39`, `d967d75`, `e27da04`)
**Verifier**: independent sub-agent (author ≠ verifier), re-verify iteration 3 of 3

## Validation: Foundation - PASS ✅

**Result**: PASS ✅ - 27/27 ACs met with spec-anchored evidence. FND-17 now holds for class instances, child/`assign` bindings, Nest's own logs and `err` objects. Gate green, sensor 10/10 killed.

---

## Iteration History

| Iteration | Verdict | Gaps |
| --------- | ------- | ---- |
| 1 (`5a48e54^..b225fb2`) | FAIL ❌ | (1) FND-17 partial: `password` was redacted only at `*.password` / `*.*.password`. Top-level, 3+ levels deep and array items leaked. (2) FND-07 spec-precision gap: the text did not carve out the FND-06 health `503`. |
| 2 (`5a48e54^..d967d75`) | FAIL ❌ | Gap (2) closed by `d967d75`. Gap (1) closed for plain objects/arrays, but (1a) the `formatters.log` walker (`src/logging/redact-passwords.ts:3-7,23` at `d967d75`) skipped class instances (DTOs) and never saw child-logger bindings, a regression vs the old paths; (1b) `design.md:122` still described the old redact paths. |
| 3 (`5a48e54^..e27da04`) | PASS ✅ | (1a) closed by `e27da04`: redaction moved to pino `hooks.streamWrite: redactLogLine`, which censors the final serialized JSON line (after serializers, `toJSON`, child bindings). (1b) closed: `design.md:122` documents `streamWrite`. No new gaps. |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T14 | ✅ Done | unchanged since iteration 1 |
| F1 | ✅ Done | `c561e39` (superseded in mechanism by F2; its tests still run and pass) |
| F2 | ✅ Done | `e27da04`; Done-when items verified below (e2e class instance + binding, unit `redactLogLine` newline, gate) |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`. Since `b225fb2`, `src/` and `test/` changed only in `src/logging/logging.module.ts`, `src/logging/redact-passwords.ts`, `test/e2e/logging/logging.e2e-spec.ts`, `test/support/test-only.controller.ts`, `test/unit/logging/redact-passwords.spec.ts` (`git diff b225fb2..HEAD --stat -- src test`). Citations in every other file are unchanged from iteration 1 and re-ran green; citations in the changed files were re-derived at `e27da04`.

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FND-01 | `docker compose up` starts `postgres` + `api`; health `200` | `docker-compose.yml:1-43` unchanged; iteration-1 smoke: both `healthy`, `GET /api/v1/health` → `200` | ✅ |
| FND-02 | Migrations applied before HTTP | `test/integration/database/database.module.int-spec.ts:61`, `:64`; `src/database/database.module.ts:26` `migrationsRun: true` | ✅ |
| FND-03 | Non-zero exit + names of invalid vars | `test/unit/config/env.schema.spec.ts:34`, `:38-40`; `test/unit/app.module.spec.ts:81` | ✅ |
| FND-04 | Every route under `/api/v1` | `test/e2e/errors/problem-details.e2e-spec.ts:107` `toBe(201)`, `:109` `toBe(404)` | ✅ |
| FND-05 | `200 { status:'ok', checks:{database:'up'} }` | `test/e2e/health/health.e2e-spec.ts:18-19` | ✅ |
| FND-06 | DB silent > 3 s → `503 { status:'error', checks:{database:'down'} }` | `test/e2e/health/health.e2e-spec.ts:28-29`; `test/unit/health/database-health.spec.ts:36-40` | ✅ |
| FND-07 | Every error (≥ 400) except the FND-06 health `503` → problem+json with `type,title,status,detail,instance,requestId` | `spec.md:92` carve-out; `test/e2e/errors/problem-details.e2e-spec.ts:25-33` shape helper used at `:41,:52,:69,:83,:92`; content type at `:40,:51,:68,:82,:91,:110` | ✅ |
| FND-08 | `400` + `errors[]` of `{field,message}` | `test/e2e/errors/problem-details.e2e-spec.ts:50`, `:53-59`; `test/unit/errors/validation.exception.spec.ts:65` | ✅ |
| FND-09 | Undeclared property → `400` listing it | `test/e2e/errors/problem-details.e2e-spec.ts:67,70` | ✅ |
| FND-10 | Unknown route → `404` Problem Details | `test/e2e/errors/problem-details.e2e-spec.ts:39-42` | ✅ |
| FND-11 | `500`, fixed `detail`, no stack/message | `test/e2e/errors/problem-details.e2e-spec.ts:90-96` | ✅ |
| FND-12 | Unhandled → `error` log with stack + requestId | `test/e2e/logging/logging.e2e-spec.ts:157-163` - `line.level === PINO_ERROR_LEVEL` for `requestId === 'boom'`, `expect(errorLine?.err.stack).toContain('Error: secret internal failure')` (moved from `:143-149`; stack survives the `streamWrite` re-serialization) | ✅ |
| FND-13 | Valid header reused | `test/unit/logging/request-id.spec.ts:17`, `:23`; `test/e2e/logging/logging.e2e-spec.ts:56` `toBe('abc')` | ✅ |
| FND-14 | Missing/invalid → UUID v4 | `test/unit/logging/request-id.spec.ts:27,31,35`; `test/e2e/logging/logging.e2e-spec.ts:64` `toMatch(UUID_V4)` | ✅ |
| FND-15 | `X-Request-Id` on every response | `test/e2e/logging/logging.e2e-spec.ts:56`, `:64`, `:75` | ✅ |
| FND-16 | One JSON access line with requestId/method/URL/status/duration | `test/e2e/logging/logging.e2e-spec.ts:87-91` | ✅ |
| FND-17 | `Authorization` header and **any** `password` field → `"[REDACTED]"` in **every** log line | Authorization: `test/e2e/logging/logging.e2e-spec.ts:102` `toBe('[REDACTED]')`, `:103` raw token absent. Plain objects: `:115-119` (top + depth 2), `:134-137` (depth 3 + array item). **Class instance + `assign` binding (iteration-2 gap)**: `:149` `expect(logged?.body).toEqual({ password: '[REDACTED]' })`, `:150` `expect(logged?.bound).toEqual({ password: '[REDACTED]' })`, `:151` `not.toContain('p5')` over every line. Unit: `test/unit/logging/redact-passwords.spec.ts:8,15,21` (top, depth 3, arrays), `:55` `redactLogLine(line)` → censored line ending in `\n`. Mechanism: `src/logging/logging.module.ts:33` `hooks: { streamWrite: redactLogLine }`, `src/logging/redact-passwords.ts:39-40`. Verifier probes (not committed) all clean, see Edge Cases. | ✅ |
| FND-18 | `LOG_LEVEL` honored, default `info` | `test/unit/config/env.schema.spec.ts:25-30`; `test/e2e/logging/logging.e2e-spec.ts:177` `toEqual([])`, `:178-182` error line still written (moved from `:163-168`) | ✅ |
| FND-19 | `GET /api/docs` → `200` Swagger UI | `test/e2e/docs/docs.e2e-spec.ts:19-21` | ✅ |
| FND-20 | `GET /api/docs-json` → OpenAPI 3 with health | `test/e2e/docs/docs.e2e-spec.ts:27-30` | ✅ |
| FND-21 | `pnpm test` without Docker/DB | `test/unit/app.module.spec.ts:41-47`; new unit cases are pure | ✅ |
| FND-22 | Testcontainers PG for integration | `test/jest-integration.config.ts:10-11`; `test/integration/database/postgres.int-spec.ts:13` | ✅ |
| FND-23 | Full app vs Testcontainers PG | `test/jest-e2e.config.ts:10-11`; `test/support/create-test-app.ts:16-31` | ✅ |
| FND-24 | oxlint type-aware + Prettier | `package.json:13` `lint`; gate `pnpm lint` exit 0 | ✅ |
| FND-25 | No Docker → "Docker is required" | `test/unit/support/start-postgres.spec.ts:8-10` | ✅ |
| FND-26 | Malformed JSON → `400`, detail "not valid JSON" | `test/e2e/errors/problem-details.e2e-spec.ts:81-84` | ✅ |
| FND-27 | `api` waits for `postgres` healthcheck | `docker-compose.yml:10-14`, `:21-23` | ✅ |

**Status**: ✅ All ACs covered. 27/27 met; spec-precision gaps: 0.

---

## Discrimination Sensor

Run in a temporary `git worktree` (`<scratchpad>/wt`, detached `e27da04`, `pnpm install --frozen-lockfile --offline`). Each mutation applied alone and reverted before the next. Unit suite first; e2e `logging` (+`errors`) when the target is wiring.

| # | File:line | Description | Suite | Killed? |
| - | --------- | ----------- | ----- | ------- |
| M1 | `src/logging/logging.module.ts:33` | `hooks.streamWrite` dropped | e2e logging (3 failed) | ✅ Killed |
| M2 | `src/logging/redact-passwords.ts:40` | `redactLogLine` returns the line unchanged | unit (1 failed) | ✅ Killed |
| M3 | `src/logging/redact-passwords.ts:40` | Trailing `\n` dropped | unit (1 failed) | ✅ Killed |
| M4 | `src/logging/redact-passwords.ts:29` | Censor wrong key (`'passwd'`) | unit (5 failed) | ✅ Killed |
| M5 | `src/logging/redact-passwords.ts:21` | Arrays not recursed | unit (1 failed) | ✅ Killed |
| M6 | `src/logging/redact-passwords.ts:29` | No recursion past top level | unit (3 failed) | ✅ Killed |
| M7 | `src/logging/logging.module.ts:30` | `req.headers.authorization` redact path removed | e2e logging (1 failed) | ✅ Killed |
| M8 | `src/logging/redact-passwords.ts:1` | Censor `'[REDACTED]'` → `'***'` | unit (5 failed) | ✅ Killed |
| S1 | `src/logging/request-id.ts:13` | Spot regression: `<= 128` → `< 128` | unit (1 failed) | ✅ Killed |
| S2 | `src/errors/problem-details.filter.ts:56` | Spot regression: 500 `detail` leaks the exception message | e2e errors (1 failed) | ✅ Killed |

**Sensor depth**: P0-style expanded (8 mutations on the redaction code + 2 spot regressions; logging/security path)
**Result**: 10/10 killed, 0 survived - PASS ✅
**Isolation**: baseline `git status --porcelain` = only the 3 untracked spec files (`LESSONS.md`, `validation.md`, `lessons.json`); identical after `git worktree remove --force` + `git worktree prune` (`git worktree list` shows only the main tree). Note: M3 (newline) is caught only by the unit test; the e2e capture destination (`logging.e2e-spec.ts:25`) parses each write separately, so it cannot see a missing newline.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (fix is a 5-line hook + one wiring line) |
| Surgical changes | ✅ (logging module, redaction helper, test-only route, tests, F2 + design entry) |
| No scope creep | ✅ |
| Matches patterns | ✅ (new route follows the existing `test-only` pattern) |
| Spec-anchored outcome check | ✅ every FND-17 assertion targets `'[REDACTED]'` and raw-value absence |
| Per-layer Coverage Expectation | ✅ unit for the pure helper (`redactPasswords`, `redactLogLine`); e2e for wiring (plain, deep, array, instance, binding, Authorization) |
| Every test maps to a spec requirement | ✅ new cases → FND-17 / F2 Done-when |
| Documented guidelines followed | ✅ none in repo - strong defaults applied |

Minor (non-blocking) note: now that `redactPasswords` only runs on `JSON.parse` output, its plain-object check, cycle guard and `Error` pass-through (`src/logging/redact-passwords.ts:3-7,15-25`) are unreachable in production, and the comment at `:9-11` describes the old `formatters.log` input. Optional simplification; behavior is correct.

---

## Edge Cases

Verifier probes run outside the real tree: (a) a Node script with the exact production pino options against `dist/logging/redact-passwords.js`; (b) a throwaway e2e spec in the sensor worktree booting the real app through `createTestApp` (deleted with the worktree).

- [x] Top-level DTO instance, nested DTO instance, `child({ user: { password } })`, grandchild bindings with arrays, `toJSON()` returning `password`: all `"[REDACTED]"` (probe a)
- [x] `err` with own `password` and `err.cause.password` (pino `err` serializer), `logger.error(err)`: redacted, `stack` kept (probe a)
- [x] Nest's own logs via `app.useLogger(app.get(Logger))`: `new Logger('Probe').log({ user: { password } })`, `.log(classInstance)`, `.warn({ creds: instance })`, `.error(errWithPassword)`: all redacted, `Error: nest boom` stack present (probe b)
- [x] HTTP `Authorization: Bearer …` and an extra `password` in a rejected body: absent from all lines (probe b)
- [x] Output integrity: every write is valid JSON, ends with exactly one `\n`, no embedded raw newline; escapes, control chars and lone surrogates round-trip; `LOG_LEVEL=warn` drops an `info` line with `password` and redacts a `warn` one (probe a)
- [x] Circular reference / `Error` as-is / no input mutation: `test/unit/logging/redact-passwords.spec.ts:28-46`

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`), exit 0
- **Result**: unit 37/37, integration 3/3, e2e 21/21 → 61 passed, 0 failed, 0 skipped; build 0, lint 0
- **Test count before fixes (iteration 1)**: 52
- **Test count after fixes**: 61
- **Delta**: +9 (7 unit `redact-passwords.spec.ts`, 2 e2e `logging.e2e-spec.ts:122`, `:140`)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None required. Optional cleanup (Cosmetic): simplify `redactPasswords` to a JSON-only walker and refresh the comment at `src/logging/redact-passwords.ts:9-11`.

---

## Requirement Traceability Update

(Proposed; the Verifier does not edit `spec.md`.)

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FND-01 .. FND-16 | In Tasks | ✅ Verified |
| FND-17 | In Tasks (Needs Fix in iterations 1-2) | ✅ Verified |
| FND-18 .. FND-27 | In Tasks | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 27/27 ACs matched spec outcome; 0 spec-precision gaps
**Sensor**: 10/10 mutations killed
**Gate**: 61 passed, 0 failed; build/lint 0

**What works**: password redaction now runs on the final JSON line, so it covers plain objects, arrays, class instances, `toJSON`, child/`assign` bindings, `err` objects and Nest's own logs; `Authorization` stays redacted; output lines stay valid, newline-terminated JSON with stacks intact; `LOG_LEVEL` filtering unchanged.

**Issues found**: none blocking. Optional cosmetic cleanup of now-unreachable branches in `redactPasswords`.

**Next steps**: mark FND-01..27 Verified; open the PR for `fix/foundation-validation`.
