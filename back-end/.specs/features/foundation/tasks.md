# Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `back-end/.specs/features/foundation/spec.md`
**Design**: `back-end/.specs/features/foundation/design.md`
**Status**: In Progress

**Execution mode** (approved 2026-10-14): inline in the main session, no batch sub-agents; the Verifier still runs automatically after T14. Logic tasks run with the `pair-programming` skill so every change is reviewed in small TDD steps instead of one large review at the end.

Skill scripts for this app run with `--root back-end`. All `pnpm` commands below run inside `back-end/` unless stated.

---

## Test Coverage Matrix

> Generated from BE-AD-003, the approved design and the spec - confirmed by the user on 2026-10-14. Guidelines found: none in repo (greenfield) - strong defaults applied; test levels from `back-end/.specs/STATE.md` BE-AD-003.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Pure TS functions (env schema, problem builder, validation mapper, request id, db check) | unit | All branches; 1:1 to spec ACs; every listed edge case | `test/unit/**/*.spec.ts` | `pnpm test` |
| Database infrastructure (TypeORM module, migrations) | integration | Connection, migrations applied, error path | `test/integration/**/*.int-spec.ts` | `pnpm test:integration` |
| HTTP layer (configureApp, filter, logging, controllers, Swagger) | e2e | Every route/behavior in scope: happy + edge + error paths | `test/e2e/**/*.e2e-spec.ts` | `pnpm test:e2e` |
| Workspace / tooling / Docker config | none | Build gate + command smoke check in `Done when` | - | build gate only |

## Gate Check Commands

> Generated from the design - confirmed by the user on 2026-10-14.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test` |
| Full | After tasks with integration/e2e tests | `pnpm test && pnpm test:integration && pnpm test:e2e` |
| Build | After phase completion or config-only tasks | `pnpm build && pnpm lint && pnpm test && pnpm test:integration && pnpm test:e2e` (scripts that do not exist yet are skipped until the task that creates them) |

Docker smoke (T13, T14, repo root): `docker compose up -d --build --wait && curl -fsS localhost:3000/api/v1/health && docker compose down`

---

## Execution Plan

### Phase 1: Workspace and pure core

```
T1 → T2 → T3
T2 → T4 → T5
```

### Phase 2: HTTP pipeline

```
T3 → T6 → T7 → T8
T5 → T7
```

### Phase 3: Database, health and docs

```
T6 → T9 → T10 → T11 → T12
T7 → T11
```

### Phase 4: Docker

```
T12 → T13 → T14
```

---

## Task Breakdown

### T1: Create root pnpm workspace

**What**: Root `package.json` (private, `packageManager: pnpm@11.8.0`, `engines.node: 24.17.0`), `pnpm-workspace.yaml` (`packages: [back-end]`), `.nvmrc` (`24.17.0`) and `.gitignore` (`node_modules/`, `dist/`, `coverage/`, `.env`, `.idea/`, `.codegraph/`).
**Where**: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore` (repo root; one cohesive workspace concern)
**Depends on**: None
**Reuses**: GL-AD-001
**Requirement**: FND-01 (prerequisite)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] `pnpm install` at repo root exits `0`
- [x] `git status` no longer lists `.idea/` or `.codegraph/`

**Tests**: none
**Gate**: build

**Commit**: `chore: set up pnpm workspace monorepo root`

**Status**: ✅ Complete (gate: `pnpm install` exit 0)

---

### T2: Scaffold NestJS 12 app with lint and unit test runner

**What**: `back-end/` Nest 12 app from the official template (`package.json` scripts `build`, `start`, `start:dev`, `lint`, `format`, `test`; `tsconfig*.json` with `typescript@~6.0.3`; `nest-cli.json`; `.oxlintrc.json`; `.prettierrc`; `test/jest-unit.config.ts` matching `test/unit/**/*.spec.ts`), minimal `src/main.ts` + `src/app.module.ts`, template sample controller removed.
**Where**: `back-end/package.json` and template config files
**Depends on**: T1
**Reuses**: `@nestjs/schematics` 12.0.7 `application/files/ts` template
**Requirement**: FND-21, FND-24

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] `pnpm build` and `pnpm lint` exit `0`
- [x] `pnpm test` runs with no Docker and exits `0` (one placeholder-free sanity test of `AppModule` compilation)
- [x] `pnpm lint` exits non-zero on an injected formatting violation (checked once, then reverted)

**Tests**: unit
**Gate**: build

**Commit**: `chore(back-end): scaffold NestJS 12 app with oxlint and jest`

**Status**: ✅ Complete (gate: build 0, lint 0, test 1/1; lint exits 1 on injected violation)

**Notes**: Nest 12 packages are ESM, so jest runs with `node --experimental-vm-modules` (same as the official template). `allowBuilds` denies `@parcel/watcher` and `unrs-resolver` install scripts (prebuilt binaries are used).

---

### T3: Env schema and fail-fast config

**What**: `validateEnv()` zod schema (`NODE_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`) wired into `ConfigModule.forRoot({ isGlobal: true, validate })`, plus `back-end/.env.example`.
**Where**: `back-end/src/config/env.schema.ts`
**Depends on**: T2
**Reuses**: design "Env schema"
**Requirement**: FND-03, FND-18 (default)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit tests: valid env parses with defaults (`PORT=3000`, `LOG_LEVEL=info`); missing `DATABASE_URL` throws naming it; two invalid vars throw naming both; invalid `LOG_LEVEL` throws naming it
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ≥ 4 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(config): validate environment variables at startup`

---

### T4: Problem Details builder

**What**: Pure TS `buildProblem()` and `ProblemDetails` / `FieldError` types.
**Where**: `back-end/src/errors/problem-details.ts`
**Depends on**: T2
**Reuses**: design "ProblemDetails builder"
**Requirement**: FND-07

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit tests: `type` defaults to `about:blank`; `title` is the reason phrase for 400/404/500/503; all required fields present; `errors` included only when given
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ≥ 4 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(errors): add RFC 9457 problem details builder`

---

### T5: Validation error mapper

**What**: `validationExceptionFactory()` and `RequestValidationException` flattening class-validator errors to `{ field, message }` with dotted paths, including the "property should not exist" case.
**Where**: `back-end/src/errors/validation.exception.ts`
**Depends on**: T4
**Reuses**: `FieldError` from T4
**Requirement**: FND-08, FND-09

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit tests: one error per failed constraint; nested property path `a.b`; non-whitelisted property listed with its name
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ≥ 3 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(errors): map validation errors to field errors`

---

### T6: E2E and integration harness with Testcontainers

**What**: `test/jest-integration.config.ts`, `test/jest-e2e.config.ts`, Testcontainers global setup/teardown (`postgres:18.6-alpine`, exports `DATABASE_URL`), Docker-missing message, scripts `test:integration` and `test:e2e`.
**Where**: `back-end/test/support/postgres.global-setup.ts` (+ teardown and two jest configs)
**Depends on**: T3
**Reuses**: design "Test harness"
**Requirement**: FND-22, FND-23, FND-25

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration smoke test runs `SELECT 1` against the container through `pg`
- [ ] Unit test: the container-start wrapper rethrows `Docker is required to run integration and e2e tests (Testcontainers could not reach a Docker daemon).` when the starter fails
- [ ] Gate check passes: `pnpm test && pnpm test:integration`
- [ ] Test count: ≥ 2 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `test(back-end): add Testcontainers integration and e2e harness`

---

### T7: Global Problem Details filter and configureApp

**What**: `ProblemDetailsFilter`, `configureApp()` (prefix `api/v1`, global `ValidationPipe` with T5 factory, filter), `main.ts` using it, `test/support/create-test-app.ts` and `TestOnlyController` (validation route, throwing route).
**Where**: `back-end/src/errors/problem-details.filter.ts` (+ `src/app.setup.ts`, test support)
**Depends on**: T5, T6
**Reuses**: `buildProblem` (T4), `validationExceptionFactory` (T5)
**Requirement**: FND-04, FND-07, FND-08, FND-09, FND-10, FND-11, FND-26

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] E2E tests: unknown route → `404` problem; invalid body → `400` + `errors`; extra property → `400` listing it; malformed JSON → `400` "Request body is not valid JSON."; throwing route → `500` with generic detail and no stack; every error has `Content-Type: application/problem+json`, `instance` and `requestId`; routes live under `/api/v1`
- [ ] Gate check passes: full gate
- [ ] Test count: ≥ 7 new tests pass

**Tests**: e2e
**Gate**: full

**Commit**: `feat(errors): return RFC 9457 problem details for every error`

---

### T8: Structured logging with request id

**What**: `LoggingModule` (nestjs-pino): `genReqId` (reuse valid `X-Request-Id` ≤ 128 chars, else UUID v4) as a pure exported function, response header, redaction, `LOG_LEVEL`; filter logs unhandled errors at `error` with stack and `requestId`.
**Where**: `back-end/src/logging/logging.module.ts` (+ filter logging line)
**Depends on**: T7
**Reuses**: `Env` (T3), filter (T7)
**Requirement**: FND-12, FND-13, FND-14, FND-15, FND-16, FND-17, FND-18

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit tests for request id: valid header reused; empty, missing and 129-char header → UUID v4
- [ ] E2E tests with captured log stream: `X-Request-Id` echoed; one JSON line with `requestId`, method, path, status, duration; `Authorization` and `password` → `"[REDACTED]"`; throwing route logs `error` level with stack and `requestId`; `LOG_LEVEL=warn` suppresses the `info` access line
- [ ] Gate check passes: full gate
- [ ] Test count: ≥ 8 new tests pass

**Tests**: e2e
**Gate**: full

**Commit**: `feat(logging): add pino structured logs with request id`

---

### T9: Database module with migrations on boot

**What**: `DatabaseModule` (`TypeOrmModule.forRootAsync`, `synchronize: false`, `migrationsRun: true`), CLI `data-source.ts`, scripts `migration:generate|run|revert`.
**Where**: `back-end/src/database/database.module.ts` (+ `data-source.ts`)
**Depends on**: T6
**Reuses**: `DATABASE_URL` (T3), harness (T6)
**Requirement**: FND-02

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Integration test: booting the module against the container applies a test-only migration (table exists in `migrations` history)
- [ ] Integration test: invalid `DATABASE_URL` makes the module init reject
- [ ] Gate check passes: full gate
- [ ] Test count: ≥ 2 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(database): connect TypeORM and run migrations on boot`

---

### T10: Database health check function

**What**: `checkDatabase(dataSource, timeoutMs = 3000): Promise<'up' | 'down'>`.
**Where**: `back-end/src/health/database-health.ts`
**Depends on**: T9
**Reuses**: TypeORM `DataSource` (T9)
**Requirement**: FND-05, FND-06

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit tests with a fake `DataSource`: resolves → `'up'`; rejects → `'down'`; hangs past timeout → `'down'` (fake timers)
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ≥ 3 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(health): add database health check with timeout`

---

### T11: Health endpoint

**What**: `HealthController` + `HealthModule` serving `GET /api/v1/health`.
**Where**: `back-end/src/health/health.controller.ts` (+ module registration)
**Depends on**: T10, T7
**Reuses**: `checkDatabase` (T10), `configureApp` (T7)
**Requirement**: FND-05, FND-06

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] E2E tests: DB up → `200 { status: 'ok', checks: { database: 'up' } }`; DB unreachable (overridden `DataSource` that hangs) → `503 { status: 'error', checks: { database: 'down' } }`
- [ ] Gate check passes: full gate
- [ ] Test count: ≥ 2 new tests pass

**Tests**: e2e
**Gate**: full

**Commit**: `feat(health): expose GET /api/v1/health`

---

### T12: Swagger / OpenAPI docs

**What**: Swagger setup in `configureApp` at `api/docs` and `api/docs-json`; health endpoint documented.
**Where**: `back-end/src/app.setup.ts` (modify)
**Depends on**: T11
**Reuses**: `configureApp` (T7)
**Requirement**: FND-19, FND-20

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] E2E tests: `GET /api/docs` → `200` HTML; `GET /api/docs-json` → `200`, `openapi` starts with `3.`, `paths` has `/api/v1/health`
- [ ] Gate check passes: build gate (phase end)
- [ ] Test count: ≥ 2 new tests pass

**Tests**: e2e
**Gate**: build

**Commit**: `feat(docs): serve Swagger UI and OpenAPI document`

---

### T13: API Dockerfile

**What**: Multi-stage `node:24.17.0-alpine` image (corepack pnpm, filtered frozen install, `nest build`, prod deps only, `CMD node dist/main.js`) and root `.dockerignore`.
**Where**: `back-end/Dockerfile` (+ `.dockerignore`)
**Depends on**: T12
**Reuses**: design "Docker"
**Requirement**: FND-01

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] `docker build -f back-end/Dockerfile .` at repo root exits `0`
- [ ] Image has no dev dependencies (`jest` absent from `node_modules`)
- [ ] Gate check passes: build gate

**Tests**: none
**Gate**: build

**Commit**: `build(back-end): add multi-stage Dockerfile`

---

### T14: Docker compose for one-command run

**What**: Root `docker-compose.yml`: `postgres` (`postgres:18.6-alpine`, volume, `pg_isready` healthcheck) and `api` (`depends_on: service_healthy`, env, port `3000`, Node-fetch healthcheck).
**Where**: `docker-compose.yml`
**Depends on**: T13
**Reuses**: T13 image
**Requirement**: FND-01, FND-02, FND-27

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Docker smoke passes from a clean state (`docker compose down -v` first): health returns `200`
- [ ] `api` logs show migrations ran before "listening"
- [ ] Gate check passes: build gate

**Tests**: none
**Gate**: build

**Commit**: `build: add docker compose for API and PostgreSQL`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1, T2, T3, T4, T5   (run in this order)
Phase 2:  T6, T7, T8
Phase 3:  T9, T10, T11, T12
Phase 4:  T13, T14
```

Arrows in the Execution Plan show real dependencies (including backward cross-phase ones); execution is still strictly sequential in task-number order.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Workspace root config (4 tiny files, one concern) | ⚠️ OK - cohesive |
| T2 | Generated template scaffold | ⚠️ OK - generated unit |
| T3 | 1 function + `.env.example` | ✅ Granular |
| T4 | 1 function | ✅ Granular |
| T5 | 1 function + exception class | ✅ Granular |
| T6 | Test harness (setup/teardown + configs) | ⚠️ OK - cohesive |
| T7 | Filter + `configureApp` wiring (merge-backward so the filter is testable) | ⚠️ OK - cohesive |
| T8 | 1 module | ✅ Granular |
| T9 | 1 module + CLI data source | ✅ Granular |
| T10 | 1 function | ✅ Granular |
| T11 | 1 endpoint | ✅ Granular |
| T12 | 1 setup change | ✅ Granular |
| T13 | 1 Dockerfile | ✅ Granular |
| T14 | 1 compose file | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T2 | T2 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T3 | T3 → T6 | ✅ Match |
| T7 | T5, T6 | T5 → T7, T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T6 | T6 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10, T7 | T10 → T11, T7 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Workspace config | none | none | ✅ OK |
| T2 | Tooling + app module | unit (runner) | unit | ✅ OK |
| T3 | Pure TS (env) | unit | unit | ✅ OK |
| T4 | Pure TS (problem) | unit | unit | ✅ OK |
| T5 | Pure TS (validation) | unit | unit | ✅ OK |
| T6 | Test infra + DB smoke | integration | integration | ✅ OK |
| T7 | HTTP layer | e2e | e2e | ✅ OK |
| T8 | HTTP layer + pure request id | e2e (highest) | e2e | ✅ OK |
| T9 | Database infrastructure | integration | integration | ✅ OK |
| T10 | Pure TS (db check) | unit | unit | ✅ OK |
| T11 | HTTP layer | e2e | e2e | ✅ OK |
| T12 | HTTP layer | e2e | e2e | ✅ OK |
| T13 | Docker config | none | none | ✅ OK |
| T14 | Docker config | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FND-01 | T1, T13, T14 |
| FND-02 | T9, T14 |
| FND-03 | T3 |
| FND-04 | T7 |
| FND-05, FND-06 | T10, T11 |
| FND-07 | T4, T7 |
| FND-08, FND-09 | T5, T7 |
| FND-10, FND-11, FND-26 | T7 |
| FND-12 .. FND-18 | T8 (FND-18 default also T3) |
| FND-19, FND-20 | T12 |
| FND-21, FND-24 | T2 |
| FND-22, FND-23, FND-25 | T6 |
| FND-27 | T14 |

Coverage: 27 / 27 requirements mapped.
