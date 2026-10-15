# Auth Validation

**Date**: 2026-10-15
**Spec**: `.specs/features/auth/spec.md`
**Diff range**: `87494ea..HEAD` (`feat/auth-rate-limit` merged work + `docs/auth-validation` docs branch, HEAD `9ed1f92`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict: PASS ✅.** All 20 ACs and 3 edge cases trace to a test assertion that targets the spec-defined outcome. Build gate is green (165 tests, +106). The sensor killed 14 of 16 mutants. The 2 survivors are equivalent mutants (no observable behavior change), not weak tests. Four minor coverage gaps remain (see Fix Plans); none blocks the feature.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | all boxes ticked |
| T2 | ✅ Done | all boxes ticked |
| T3 | ✅ Done | all boxes ticked |
| T4 | ✅ Done | all boxes ticked |
| T5 | ✅ Done | all boxes ticked |
| T6 | ✅ Done | all boxes ticked |
| T7 | ✅ Done | all boxes ticked |
| T8 | ✅ Done | all boxes ticked |
| T9 | ✅ Done | all boxes ticked |
| T10 | ✅ Done | all boxes ticked |
| T11 | ✅ Done | all boxes ticked |
| T12 | ✅ Done | all boxes ticked |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `back-end/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AUTH-01 register valid body | `201`, `{ accessToken: JWT, user: { id, name, email, createdAt } }` | `test/e2e/auth/register.e2e-spec.ts:59` - `expect(res.status).toBe(201)`; `:60` - `expect(res.body).toEqual({ accessToken: expect.stringMatching(JWT), user: { id, name: 'Ana', email, createdAt } })` | ✅ PASS |
| AUTH-02 duplicate normalized email | `409`, `type` `/problems/email-already-registered`, no user created | `test/e2e/auth/register.e2e-spec.ts:113` - `toBe(409)`; `:115` - `toMatchObject({ type: '/problems/email-already-registered', status: 409 })`; `:120` - `expect(await countUsers()).toBe(1)` | ✅ PASS |
| AUTH-03 name empty after trim / > 100 | `400` + `errors` item for `name` | `test/e2e/auth/register.e2e-spec.ts:124` (`'   '`) and `:128` (101 chars) via `expectFieldError` `:48` `toBe(400)` + `:50` `arrayContaining([{ field: 'name', ... }])`; boundaries 1/100 → 201 at `:178-179` | ✅ PASS |
| AUTH-04 invalid email / > 254 | `400` + `errors` item for `email` | `test/e2e/auth/register.e2e-spec.ts:135` (`not-an-email`), `:143-145` (255 chars, `toHaveLength(255)`) via `expectFieldError(..., 'email')` | ✅ PASS (minor: 254-char accept boundary not asserted) |
| AUTH-05 password < 8 / > 72 | `400` + `errors` item for `password` | `test/e2e/auth/register.e2e-spec.ts:149` (7), `:156` (73) via `expectFieldError(..., 'password')`; boundaries 8/72 → 201 at `:178-179` | ✅ PASS |
| AUTH-06 email trimmed + lowercased on store and lookup | stored/returned `ana@x.com`; lookup normalized | Store: `test/e2e/auth/register.e2e-spec.ts:100` - `toBe('ana@x.com')`, `:105` - `expect(row.email).toBe('ana@x.com')`. Lookup: `test/e2e/auth/login.e2e-spec.ts:79-81` - `'  ANA@EXAMPLE.COM '` → `toBe(200)`; conflict on other case `register.e2e-spec.ts:111-113` | ✅ PASS |
| AUTH-07 one-way salted hash, never in responses | hash ≠ password, salted, absent from body | `test/e2e/auth/register.e2e-spec.ts:78-81` - `not.toBe(valid.password)`, `toMatch(/^argon2id\$/)`, `res.text not.toContain(row.password_hash)` / `not.toContain(valid.password)`; salt: `test/unit/auth/password-hasher.spec.ts:29` - `expect(first).not.toBe(second)`; login/me bodies asserted with exact `toEqual` (`login.e2e-spec.ts:67`, `me.e2e-spec.ts:67`) | ✅ PASS |
| AUTH-08 login right credentials | `200`, `{ accessToken, user }` | `test/e2e/auth/login.e2e-spec.ts:66` - `toBe(200)`; `:67` - `toEqual({ accessToken: expect.stringMatching(JWT), user: {...} })` | ✅ PASS |
| AUTH-09 unknown email / wrong password identical | `401`, `type` `/problems/invalid-credentials`, `detail` `"Invalid email or password."`, identical | `test/e2e/auth/login.e2e-spec.ts:41-47` - `toBe(401)` + `toMatchObject({ type: '/problems/invalid-credentials', status: 401, detail: 'Invalid email or password.' })` used at `:88` and `:94`; identity `:110` - `expect(contract(unknownEmail)).toEqual(contract(wrongPassword))`; timing: `test/unit/auth/auth.service.spec.ts:125` - `expect(dummy).toHaveBeenCalledWith(PASSWORD)` | ✅ PASS |
| AUTH-10 email/password missing or not a string | `400` + `errors` item per invalid field | `test/e2e/auth/login.e2e-spec.ts:116` (missing email), `:128` (missing password), `:140` (non-string password), `:146-147` (both missing → item per field) via `expectFieldError` `:55` `toBe(400)` + `:57` `arrayContaining([{ field, ... }])` | ✅ PASS (minor: non-string `email` not asserted) |
| AUTH-11 HS256, `sub` = user id, `exp` = iat + `JWT_EXPIRES_IN` (default 1h) | header `alg` HS256, `sub`, `exp - iat` = 3600 / configured | `test/unit/auth/auth.service.spec.ts:157` - `expect(header.alg).toBe('HS256')`; `:158` - `expect(decoded.sub).toBe(buildUser().id)`; `:165` - `expect(exp - iat).toBe(3600)`; `:179` - `toBe(900)` for `15m` | ✅ PASS |
| AUTH-12 `JWT_SECRET` missing / < 32 → exit non-zero, log variable name | error names `JWT_SECRET`; process exits non-zero (FND-03) | `test/unit/config/env.schema.spec.ts:75` - `toThrow(/JWT_SECRET/)` (missing); `:81` - `toThrow(/JWT_SECRET/)` (31 chars); `:85` - 32 chars accepted. Exit path is the inherited FND-03 bootstrap rejection (`src/main.ts`) | ✅ PASS (minor: no boot-level test for `JWT_SECRET`; `test/unit/app.module.spec.ts:89` covers only `DATABASE_URL`) |
| AUTH-13 `GET /me` with valid token | `200`, `{ id, name, email, createdAt }` of the token's user | `test/e2e/users/me.e2e-spec.ts:66` - `toBe(200)`; `:67` - exact `toEqual({ id, name: 'Ana', email, createdAt })`; `:73` - `toEqual(user)`; login token `:85-86` | ✅ PASS |
| AUTH-14 no header / non-Bearer / bad signature / expired → 401 `about:blank` | `401` Problem Details, `type` `about:blank` | e2e `test/e2e/users/me.e2e-spec.ts:55-57` - `toBe(401)`, `toMatch(PROBLEM_JSON)`, `toMatchObject({ type: 'about:blank', status: 401 })` used at `:90` (no header), `:100` (other secret), `:111` (expired). Non-Bearer: `test/unit/auth/jwt-auth.guard.spec.ts:92` (`Basic x`), `:96-97` (`Bearer` without token) - `rejects.toThrow(new UnauthorizedException(...))`; `alg: none` `:127` | ✅ PASS |
| AUTH-15 valid token, unknown `sub` → 401 `about:blank` | `401` Problem Details, `about:blank` | `test/e2e/users/me.e2e-spec.ts:118` - `expectUnauthorized` after deleting the user; unit `test/unit/auth/jwt-auth.guard.spec.ts:136-137` | ✅ PASS |
| AUTH-16 token required everywhere except register, login, health, docs | protected by default; listed routes public | Protected: `test/e2e/users/me.e2e-spec.ts:90`; `test/e2e/auth/rate-limit.e2e-spec.ts:76` - `toBe(401)`. Public: register/login suites call without token (`register.e2e-spec.ts:59`, `login.e2e-spec.ts:66`); `test/e2e/docs/docs.e2e-spec.ts:16-25` (`/api/docs`, `/api/docs-json` → 200); health suite unchanged and passing. Guard bypass: `test/unit/auth/jwt-auth.guard.spec.ts:79` - `resolves.toBe(true)` | ✅ PASS |
| AUTH-17 > 10 login / 60 s per IP → 429 + `Retry-After` | 11th → `429` Problem Details + `Retry-After` | `test/e2e/auth/rate-limit.e2e-spec.ts:50` (10× `toBe(401)`), `:53` → `expectTooManyRequests`: `:37` `toBe(429)`, `:38` problem+json, `:39` `retry-after` `toMatch(/^\d+$/)`, `:40-45` `type: 'about:blank', status: 429` | ✅ PASS |
| AUTH-18 > 10 register / 60 s → 429 + `Retry-After` | same | `test/e2e/auth/rate-limit.e2e-spec.ts:58` (10× `toBe(201)`), `:61` `expectTooManyRequests` | ✅ PASS |
| AUTH-19 separate limits | register after 11 logins is not 429 | `test/e2e/auth/rate-limit.e2e-spec.ts:65-69` - `expect((await register(0)).status).toBe(201)` | ✅ PASS |
| AUTH-20 concurrent same-email register | exactly one user, other `409` | `test/integration/users/users.repository.int-spec.ts:61-63` - `fulfilled toHaveLength(1)`, `rejected toHaveLength(1)`, `reason toBeInstanceOf(EmailAlreadyRegisteredError)`; error → `409` mapping `test/e2e/errors/domain-errors.e2e-spec.ts:37-46` | ✅ PASS |

**Status**: ✅ All 20 ACs covered with spec-anchored assertions. No spec-precision gaps.

---

## Discrimination Sensor

Run in a scratch worktree at `HEAD` (`/tmp/claude-1000/auth-sensor`), one mutation at a time, reverted after each run.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/auth/password-hasher.ts:69` | `timingSafeEqual(candidate, tag)` → `candidate.length === tag.length` (any password verifies) | ✅ Killed (5 unit failures) |
| M2 | `src/auth/auth.service.ts:56` | `!user \|\| !matches` → `!user` (wrong password logs in) | ✅ Killed |
| M3 | `src/auth/auth.service.ts:54` | dummy verify on unknown email → `false` (timing leak) | ✅ Killed |
| M4 | `src/auth/jwt-auth.guard.ts:31` | `if (isPublic)` → `if (isPublic !== undefined)` | ⚪ Survived, equivalent: `IS_PUBLIC` metadata is only ever `true` or absent |
| M4b | `src/auth/jwt-auth.guard.ts:31` | `if (isPublic)` → `if (!isPublic)` (public bypass inverted) | ✅ Killed (11 unit failures) |
| M15 | `src/auth/jwt-auth.guard.ts:31` | public bypass removed | ✅ Killed (15 e2e failures: health, docs, login) |
| M5 | `src/auth/jwt-auth.guard.ts:59` | verify with `ignoreExpiration: true` | ✅ Killed |
| M7 | `src/auth/jwt-auth.guard.ts:59` | verify `algorithms` → `['HS256', 'none']` | ⚪ Survived, equivalent: `jsonwebtoken/verify.js:107-109` rejects unsigned tokens whenever a secret is set |
| M13 | `src/auth/auth.module.ts:23` | sign algorithm `HS256` → `HS512` | ✅ Killed (6 unit failures) |
| M6 | `src/auth/jwt-auth.guard.ts:50` | skip `findById`, trust `sub` (unknown sub accepted) | ✅ Killed |
| M8 | `src/users/users.repository.ts:48` | duplicate-email mapping disabled | ✅ Killed (2 integration failures) |
| M9 | `src/auth/auth.module.ts:41` | rate limit `10` → `11` | ✅ Killed |
| M10 | `src/auth/auth.controller.ts:31` | `@UseGuards(ThrottlerGuard)` removed | ✅ Killed |
| M11 | `src/auth/dto/register.dto.ts:10` | email normalization drops `toLowerCase()` | ✅ Killed (3 e2e failures) |
| M12 | `src/auth/dto/register.dto.ts:7` | name trim removed | ✅ Killed |
| M14 | `src/users/dto/user-response.dto.ts:24` | `passwordHash` leaked in user response | ✅ Killed (3 e2e failures) |

**Sensor depth**: P0-full (manual, 16 behavior-level mutants; no mutation tool configured)
**Result**: 14/16 killed; 2 survivors are equivalent mutants (no behavior change). PASS ✅

Isolation: real tree `git status --porcelain` was empty before and after; scratch worktree removed.

---

## Interactive UAT Results

Skipped: back-end only feature; automated checks are sufficient.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Guard ~70 lines without Passport; hasher on `node:crypto` |
| Surgical changes | ✅ Foundation edits limited to filter `DomainError` branch, `@Public()` on health, `addBearerAuth()`, test stubs needed for new providers |
| No scope creep | ✅ No refresh/logout/reset; throttler only on `AuthController` |
| Matches patterns | ✅ Follows BE-AD-005/006/007, existing `createTestApp` and test layout |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ Unit: hasher, service, guard, env; integration: table + repository incl. conflict and concurrency; e2e: register, login, me, rate limit, domain errors |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Extras (`Bearer` case-insensitive, non-string `sub`, filter logging of mapped errors, login `401` not `400` for short password) trace to design decisions in `design.md` / Done-when |
| Documented guidelines followed: `.specs/STATE.md` (BE-AD-003), `test/jest-*.config.ts` | ✅ |

Observation (no action): the filter now logs `Unhandled exception` for any `500` instead of any non-`HttpException` (`src/errors/problem-details.filter.ts:30`). Covered by `test/e2e/errors/domain-errors.e2e-spec.ts:84,92`.

---

## Edge Cases

- [x] Concurrent register with same normalized email → one user, other `409` (AUTH-20): `test/integration/users/users.repository.int-spec.ts:61-63` + mapping `test/e2e/errors/domain-errors.e2e-spec.ts:37`.
- [x] Undeclared property → `400`: `test/e2e/auth/register.e2e-spec.ts:185-189` (`role` error, no user created); `test/e2e/auth/login.e2e-spec.ts:159`.
- [x] Rejected register (`400`, `409`) returns no token: `test/e2e/auth/register.e2e-spec.ts:53` (`expectFieldError` → `not.toHaveProperty('accessToken')`) and `:119` (409).

---

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (in `back-end/`)
- **Result**: build exit 0, lint exit 0 (oxlint + prettier clean); unit 86 passed (11 suites), integration 15 passed (4 suites), e2e 64 passed (9 suites). 165 passed, 0 failed, 0 skipped.
- **Test count before feature**: 59 (unit 35, integration 3, e2e 21), measured by running the same commands in a temporary worktree at `87494ea`.
- **Test count after feature**: 165
- **Delta**: +106 new tests (unit +51, integration +12, e2e +43); no test removed.
- **Skipped tests**: none
- **Failures**: none
- **Assertion integrity**: modified pre-existing tests (`health.e2e-spec.ts`, `app.module.spec.ts`, `database.module.int-spec.ts`) only extend stubs/env; no assertion weakened.

---

## Fix Plans (minor, non-blocking)

### Fix 1: Non-string email on login not asserted (AUTH-10)

- **Root cause**: `test/e2e/auth/login.e2e-spec.ts` covers non-string `password` (`:137`) but not non-string `email`.
- **Fix task**: add `login({ ...credentials, email: 123 })` → `expectFieldError(res, 'email')`.
- **Priority**: Minor

### Fix 2: No boot-level test for missing `JWT_SECRET` (AUTH-12)

- **Root cause**: `validateEnv` is tested (`test/unit/config/env.schema.spec.ts:75,81`), but `test/unit/app.module.spec.ts:84-90` checks boot failure only for `DATABASE_URL`.
- **Fix task**: add an `AppModule` compile test with `JWT_SECRET` deleted → `rejects.toThrow(/JWT_SECRET/)`.
- **Priority**: Minor

### Fix 3: 254-char email accept boundary not asserted (AUTH-04)

- **Root cause**: only the 255-char rejection is tested (`test/e2e/auth/register.e2e-spec.ts:141`); the code relies on `@IsEmail` for the bound (`src/auth/dto/register.dto.ts:21`).
- **Fix task**: add a 254-char valid email → `201`.
- **Priority**: Minor

### Fix 4: Non-Bearer header only covered at unit level (AUTH-14)

- **Root cause**: `Basic x` is asserted in `test/unit/auth/jwt-auth.guard.spec.ts:92`, not over HTTP.
- **Fix task**: add `GET /me` with `Authorization: Basic x` → `expectUnauthorized` in `test/e2e/users/me.e2e-spec.ts`.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| AUTH-01 | Pending | ✅ Verified |
| AUTH-02 | Pending | ✅ Verified |
| AUTH-03 | Pending | ✅ Verified |
| AUTH-04 | Pending | ✅ Verified |
| AUTH-05 | Pending | ✅ Verified |
| AUTH-06 | Pending | ✅ Verified |
| AUTH-07 | Pending | ✅ Verified |
| AUTH-08 | Pending | ✅ Verified |
| AUTH-09 | Pending | ✅ Verified |
| AUTH-10 | Pending | ✅ Verified |
| AUTH-11 | Pending | ✅ Verified |
| AUTH-12 | Pending | ✅ Verified |
| AUTH-13 | Pending | ✅ Verified |
| AUTH-14 | Pending | ✅ Verified |
| AUTH-15 | Pending | ✅ Verified |
| AUTH-16 | Pending | ✅ Verified |
| AUTH-17 | Pending | ✅ Verified |
| AUTH-18 | Pending | ✅ Verified |
| AUTH-19 | Pending | ✅ Verified |
| AUTH-20 | Pending | ✅ Verified |

spec.md was not edited by the Verifier; the orchestrator applies this table.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/20 ACs matched spec outcome; 3/3 edge cases covered; 0 spec-precision gaps
**Sensor**: 14/16 killed; 2 equivalent survivors (M4, M7)
**Gate**: 165 passed, 0 failed, 0 skipped

**What works**: register, login, `/me`, default-deny JWT guard, per-route rate limit, argon2id hashing with dummy verify, duplicate-email mapping including the concurrent case.

**Issues found**: 4 minor test gaps (Fix 1-4); none changes behavior.

**Next steps**: update spec.md traceability; optionally add the four small tests.
