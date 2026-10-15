# Auth Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/auth/spec.md`
**Design**: `back-end/.specs/features/auth/design.md`
**Status**: Approved

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the foundation test layout (`test/unit`, `test/integration`, `test/e2e`), the approved design and the spec. Guidelines found: `back-end/.specs/STATE.md` (BE-AD-003), `test/jest-*.config.ts` - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Pure TS / services (env schema, password hasher, `AuthService`, guard) | unit | All branches; 1:1 to spec ACs; every listed edge case | `test/unit/**/*.spec.ts` | `pnpm test` |
| Persistence (entity, migration, repository) | integration | Table + constraint created by migration; every repository method incl. conflict path | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (controllers, DTOs, global guard, filter, throttler) | e2e | Every route in scope: happy + edge + error paths | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |
| Dependencies / compose / `.env.example` | none | Build gate | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test` |
| Full | After tasks with integration/e2e tests | `pnpm test && pnpm test:integration && pnpm test:e2e` |
| Build | After each phase and config-only tasks | `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` |

Docker smoke (T2, T12, repo root): `docker compose up -d --build --wait && curl -fsS localhost:3000/api/v1/health && docker compose down`

---

## Execution Plan

### Phase 1: Dependencies, config and building blocks

```
T1 → T2 → T3 → T4
```

### Phase 2: Users persistence

```
T4 → T5 → T6
```

### Phase 3: Register and login

```
T6 → T7 → T8 → T9
```

### Phase 4: Protection, current user and rate limit

```
T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Add JWT and throttler dependencies

**What**: Add `@nestjs/jwt@12.0.3` and `@nestjs/throttler@6.7.1` to `back-end` dependencies.
**Where**: `back-end/package.json` (+ `pnpm-lock.yaml`)
**Depends on**: None
**Reuses**: GL-AD-001 single lockfile
**Requirement**: AUTH-11, AUTH-17 (prerequisite)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pnpm install` exits `0` and both packages are in `dependencies`
- [x] Build gate passes with the same test counts as before

**Tests**: none
**Gate**: build

**Commit**: `chore(deps): add @nestjs/jwt and @nestjs/throttler`

---

### T2: JWT settings in the environment schema

**What**: Add `JWT_SECRET` (required, ≥ 32 chars) and `JWT_EXPIRES_IN` (`^\d+[smhd]$`, default `1h`) to `envSchema`; document both in `.env.example`; set them on the compose `api` service (secret commented as dev-only); set a test secret in the test env setup so unit/e2e/integration boots keep working.
**Where**: `back-end/src/config/env.schema.ts` (+ `.env.example`, `docker-compose.yml`, `test/support/postgres.global-setup.ts`; one config concern)
**Depends on**: T1
**Reuses**: `validateEnv` (FND-03)
**Requirement**: AUTH-12

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit tests in `test/unit/config/env.schema.spec.ts`: missing `JWT_SECRET` → error naming `JWT_SECRET`; 31-char secret → error; 32-char secret → ok; `JWT_EXPIRES_IN` default `1h`; invalid `JWT_EXPIRES_IN` (`1week`) → error naming it
- [x] Docker smoke passes
- [x] Build gate passes; ≥ 5 new unit tests, no existing test removed

**Tests**: unit
**Gate**: build

**Commit**: `feat(config): require JWT secret and token lifetime settings`

---

### T3: Domain errors mapped to Problem Details

**What**: `DomainError` base class, `EmailAlreadyRegisteredError` and `InvalidCredentialsError`, `DOMAIN_ERROR_MAPPINGS` (`409` `/problems/email-already-registered`, `401` `/problems/invalid-credentials`), and a `DomainError` branch in `ProblemDetailsFilter` (unmapped `DomainError` → `500`).
**Where**: `back-end/src/errors/domain-error-mappings.ts` (+ `src/errors/domain-error.ts`, `src/auth/auth.errors.ts`, filter branch; BE-AD-007)
**Depends on**: T2
**Reuses**: `buildProblem({ type })`, `TestOnlyController`
**Requirement**: AUTH-02, AUTH-09 (error contract)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] e2e tests via test-only routes: throwing `EmailAlreadyRegisteredError` → `409`, `type` `/problems/email-already-registered`, detail `"Email is already registered."`, Problem Details shape; `InvalidCredentialsError` → `401`, `type` `/problems/invalid-credentials`, detail `"Invalid email or password."`; an unmapped `DomainError` subclass → `500` with the generic detail
- [x] Full gate passes; ≥ 3 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(errors): map domain errors to problem details`

---

### T4: Password hasher with argon2id

**What**: `PasswordHasher` (`hash`, `verify`, `verifyAgainstDummy`) on Node `crypto.argon2` (`argon2id`, m=19456 KiB, t=2, p=1, 16-byte salt, 32-byte tag), self-describing stored format.
**Where**: `back-end/src/auth/password-hasher.ts`
**Depends on**: T3
**Reuses**: `node:crypto`
**Requirement**: AUTH-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit tests: hash differs from the password and starts with `argon2id$`; two hashes of the same password differ (salt); `verify` true for the right password; false for a wrong one; false for a malformed stored string; `verifyAgainstDummy` resolves `false`
- [x] Quick gate passes; ≥ 6 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): hash passwords with argon2id`

---

### T5: User entity and users table migration

**What**: `User` entity (`users` table, snake_case columns), hand-written `CreateUsers` migration (design SQL, constraint `UQ_users_email`), `UsersModule` registering the entity, imported by `AppModule`.
**Where**: `back-end/src/users/user.entity.ts` (+ `src/database/migrations/<ts>-CreateUsers.ts`, `src/users/users.module.ts`)
**Depends on**: T4
**Reuses**: `DatabaseModule` (`autoLoadEntities`, `migrationsRun`)
**Requirement**: AUTH-06, AUTH-20 (storage)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration test: after boot, table `users` exists with columns `id`, `name`, `email`, `password_hash`, `created_at`; inserting two rows with the same email fails with `23505` on `UQ_users_email`; `id` and `created_at` get defaults
- [x] `migration:revert` drops the table (checked in the integration test via `undoLastMigration`)
- [x] Full gate passes; ≥ 3 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(users): add users table and entity`

---

### T6: Users repository

**What**: `UsersRepository` with `create` (maps `23505`/`UQ_users_email` → `EmailAlreadyRegisteredError`), `findByEmail`, `findById`.
**Where**: `back-end/src/users/users.repository.ts`
**Depends on**: T5
**Reuses**: `EmailAlreadyRegisteredError` (T3)
**Requirement**: AUTH-02, AUTH-20

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Integration tests: `create` returns the user with generated `id` and `createdAt`; duplicate email → `EmailAlreadyRegisteredError`; two concurrent `create` with the same email → exactly one fulfils and one rejects with `EmailAlreadyRegisteredError`; `findByEmail` / `findById` return the user or `null`
- [x] Full gate passes; ≥ 5 new integration tests

**Tests**: integration
**Gate**: full

**Commit**: `feat(users): add users repository with duplicate email mapping`

---

### T7: Auth service with token issuing

**What**: `AuthService.register` / `login` and `JwtModule.registerAsync` config (HS256, `JWT_SECRET`, `JWT_EXPIRES_IN`) in `AuthModule`.
**Where**: `back-end/src/auth/auth.service.ts` (+ `src/auth/auth.module.ts`)
**Depends on**: T6
**Reuses**: `PasswordHasher`, `UsersRepository`, `JwtService`
**Requirement**: AUTH-01, AUTH-02, AUTH-08, AUTH-09, AUTH-11

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests (mocked repository, real hasher and `JwtService`): register stores a hash, never the password, and returns `{ accessToken, user }`; repository conflict propagates `EmailAlreadyRegisteredError`; login with right password returns a token; unknown email → `InvalidCredentialsError` and the dummy verify ran; wrong password → `InvalidCredentialsError`; decoded token has `sub` = user id, header `alg` `HS256`, `exp - iat` = 3600 by default
- [ ] Quick gate passes; ≥ 6 new unit tests

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add register and login service with JWT issuing`

---

### T8: Register endpoint

**What**: `POST /api/v1/auth/register` (`201`) with `RegisterDto` (trim, lowercase, bounds), `AuthResponseDto`, `UserResponseDto` + `toUserResponse`, `@Public()` decorator on `AuthController`, Swagger annotations.
**Where**: `back-end/src/auth/auth.controller.ts` (+ `src/auth/dto/*`, `src/users/dto/user-response.dto.ts`, `src/auth/public.decorator.ts`)
**Depends on**: T7
**Reuses**: global `ValidationPipe`, filter
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e tests: valid body → `201` with `accessToken` and `user` `{ id, name, email, createdAt }` only (no `password`/`passwordHash` keys); `  Ana  ` stored as `Ana`; `  ANA@X.COM ` returned as `ana@x.com`; same email in other case → `409` `/problems/email-already-registered`; name empty after trim / 101 chars → `400` with `errors` for `name`; invalid email / 255-char email → `400` for `email`; password 7 / 73 chars → `400` for `password`; boundaries 1/100 name and 8/72 password → `201`; unknown property → `400`
- [ ] Full gate passes; ≥ 12 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add register endpoint`

---

### T9: Login endpoint

**What**: `POST /api/v1/auth/login` (`200`) with `LoginDto` (email trim + lowercase, both non-empty strings).
**Where**: `back-end/src/auth/auth.controller.ts` (modify; + `src/auth/dto/login.dto.ts`)
**Depends on**: T8
**Reuses**: `AuthResponseDto`, `toUserResponse`
**Requirement**: AUTH-08, AUTH-09, AUTH-10, AUTH-06

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e tests: right credentials → `200` `{ accessToken, user }`; email in upper case with spaces → `200`; wrong password and unknown email → `401` with identical `type`, `title` and `detail` `"Invalid email or password."`; missing email / missing password / non-string password → `400` with `errors` per field
- [ ] Full gate passes; ≥ 7 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(auth): add login endpoint`

---

### T10: Global JWT guard

**What**: `JwtAuthGuard` as `APP_GUARD` (Bearer parsing, `verifyAsync` with `algorithms: ['HS256']`, user lookup, `req.user`), `@CurrentUser()`, `@Public()` on `HealthController` and `TestOnlyController`.
**Where**: `back-end/src/auth/jwt-auth.guard.ts` (+ `src/auth/current-user.decorator.ts`, `@Public()` on health and test-only controllers)
**Depends on**: T9
**Reuses**: `Reflector`, `UsersRepository`, `IS_PUBLIC`
**Requirement**: AUTH-14, AUTH-15, AUTH-16

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit tests (mocked `Reflector`/repository, real `JwtService`): public handler → allowed without header; no header / `Basic x` / `Bearer` without token / bad signature / expired token / `alg: none` token / unknown `sub` → `UnauthorizedException`; valid token → allowed and `req.user` set
- [ ] Existing health, docs, errors and logging e2e suites still pass unchanged (AUTH-16 public routes)
- [ ] Full gate passes; ≥ 8 new unit tests

**Tests**: unit
**Gate**: full

**Commit**: `feat(auth): protect every route with a global JWT guard`

---

### T11: Current user endpoint

**What**: `GET /api/v1/me` in `MeController` (`users` module) with `@ApiBearerAuth()`, and `.addBearerAuth()` in Swagger setup.
**Where**: `back-end/src/users/me.controller.ts` (+ `addBearerAuth` in `src/app.setup.ts`)
**Depends on**: T10
**Reuses**: `@CurrentUser()`, `toUserResponse`
**Requirement**: AUTH-13, AUTH-14, AUTH-15, AUTH-11

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e tests: register → `/me` with its token → `200` `{ id, name, email, createdAt }` matching the registered user; login token also works; no header → `401` Problem Details `about:blank`; token signed with another secret → `401`; expired token → `401`; token whose user row was deleted → `401`; `/api/docs-json` lists `/api/v1/me` with a bearer security scheme
- [ ] Full gate passes; ≥ 7 new e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `feat(users): add current user endpoint`

---

### T12: Rate limit on login and register

**What**: `ThrottlerModule.forRoot` (10 / 60 s, message `"Too many requests. Try again later."`) in `AuthModule`, `@UseGuards(ThrottlerGuard)` on `AuthController`; `createTestApp` replaces the throttler storage with a never-blocking one unless `{ rateLimit: true }`.
**Where**: `back-end/src/auth/auth.module.ts` (modify; + guard on `auth.controller.ts`, option in `test/support/create-test-app.ts`)
**Depends on**: T11
**Reuses**: `getStorageToken()`, filter
**Requirement**: AUTH-17, AUTH-18, AUTH-19

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e tests with `{ rateLimit: true }`: 10 login requests pass the limit and the 11th → `429` Problem Details with a numeric `Retry-After` header; same for register; after 11 login requests a register request is not `429`; `GET /me` is never throttled
- [ ] Docker smoke passes
- [ ] Build gate passes; ≥ 4 new e2e tests

**Tests**: e2e
**Gate**: build

**Commit**: `feat(auth): rate limit login and register per IP`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6
Phase 3:  T7 → T8 → T9
Phase 4:  T10 → T11 → T12
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Dependencies | 1 manifest change | ✅ Granular |
| T2: JWT env settings | 1 schema + its config files | ⚠️ Cohesive (one config concern) |
| T3: Domain error mapping | base class + 2 errors + filter branch | ⚠️ Cohesive (one mapping mechanism) |
| T4: Password hasher | 1 class | ✅ Granular |
| T5: User entity + migration | 1 table | ⚠️ Cohesive (entity and migration describe the same table) |
| T6: Users repository | 1 class | ✅ Granular |
| T7: Auth service | 1 class + JWT module config | ✅ Granular |
| T8: Register endpoint | 1 endpoint + its DTOs | ✅ Granular |
| T9: Login endpoint | 1 endpoint + its DTO | ✅ Granular |
| T10: Global guard | 1 guard + its decorators | ✅ Granular |
| T11: `/me` endpoint | 1 endpoint | ✅ Granular |
| T12: Rate limit | 1 guard config + test option | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Dependencies | none | none | ✅ OK |
| T2 | Env schema (pure TS) + config files | unit | unit | ✅ OK |
| T3 | Filter (HTTP layer) + error classes | e2e | e2e | ✅ OK |
| T4 | Password hasher (pure TS) | unit | unit | ✅ OK |
| T5 | Entity + migration (persistence) | integration | integration | ✅ OK |
| T6 | Repository (persistence) | integration | integration | ✅ OK |
| T7 | Service | unit | unit | ✅ OK |
| T8 | Controller + DTOs (HTTP) | e2e | e2e | ✅ OK |
| T9 | Controller + DTO (HTTP) | e2e | e2e | ✅ OK |
| T10 | Guard (unit) wired as global guard (HTTP) | unit + e2e | unit, existing e2e suites in gate | ✅ OK (wiring proven by T11 e2e and the unchanged public-route suites in the same gate) |
| T11 | Controller (HTTP) | e2e | e2e | ✅ OK |
| T12 | Throttler config (HTTP) | e2e | e2e | ✅ OK |
