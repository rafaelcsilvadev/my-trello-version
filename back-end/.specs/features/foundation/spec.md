# Foundation Specification

## Problem Statement

Every API feature (auth, boards, lists, cards) needs the same base: a running NestJS app, a PostgreSQL connection with migrations, one error format, request tracing, API docs and a test harness. Without a shared foundation each feature would reinvent these pieces inconsistently. It must also run from a fresh GitHub clone with a single Docker command.

## Goals

- [ ] `docker compose up` from a fresh clone starts PostgreSQL and the API, and `GET /api/v1/health` returns `200`.
- [ ] Every error response from the API uses one format (RFC 9457 Problem Details).
- [ ] Unit, integration (Testcontainers) and e2e (supertest) suites run with one command each and pass.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Domain tables / business endpoints | Belong to `auth`, `boards`, `lists`, `cards` |
| Authentication and guards | Feature `auth` |
| CORS configuration | Added when the front-end starts (first consumer) |
| CI pipeline (GitHub Actions) | Separate future work; not needed to run the project |
| Running the test suites inside Docker | Tests run on the host (`pnpm`); Testcontainers needs the host Docker daemon |
| Rate limiting | No public abuse surface yet; revisit in `auth` |
| Production deployment / hosting | Not a goal of this portfolio stage |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| API prefix | All routes under `/api/v1` | Cheap versioning from day one | y |
| Error format | RFC 9457 Problem Details, `Content-Type: application/problem+json` | Market standard | y |
| Health check | `GET /api/v1/health` checks the database | Needed by Docker healthcheck and smoke tests | y |
| Logging | pino, JSON lines, one log per request with request id | Structured, production-grade logs | y |
| Tool versions | Node `24.17.0` pinned in `.nvmrc`; `packageManager: pnpm@11.8.0` | Reproducible installs; versions found on the dev machine | y |
| Run with Docker | Root `docker-compose.yml` with `postgres` + `api`; API `Dockerfile` in `back-end/` (GL-AD-003) | One-command trial from a clone | y |
| Problem `type` for generic HTTP errors | `about:blank`, with `title` = standard HTTP reason phrase | RFC 9457 default when no specific problem type exists; features may define specific types later | y |
| Unknown body properties | Rejected with `400` | Strict contracts catch client bugs early | y |
| Request id source | Reuse incoming `X-Request-Id` when it is a non-empty string ≤ 128 chars, otherwise generate a UUID v4 | Lets a caller correlate requests; the bound blocks log abuse | y |
| Swagger availability | Served in every environment at `/api/docs` (UI) and `/api/docs-json` (spec) | Portfolio project: docs are part of the demo | y |
| Migrations in Docker | The `api` container runs pending migrations before starting the server | A fresh clone works without manual steps | y |
| Config source | Environment variables, validated at startup; `back-end/.env.example` documents every variable | Twelve-factor; fail fast on misconfiguration | y |
| Lint tool | oxlint (type-aware) + Prettier, replacing ESLint in FND-24 | Nest 12 official template ships oxlint; amended during Design | y |
| Ignored local files | Root `.gitignore` ignores `node_modules/`, `dist/`, `.env`, `.idea/`, `.codegraph/` | Keeps IDE/index/secrets out of the repo | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Run the API from a fresh clone ⭐ MVP

**User Story**: As a developer cloning the repo from GitHub, I want to start the API and its database with one command so that I can try the project without installing Node or PostgreSQL.

**Why P1**: It is the entry point for every reviewer of the portfolio and for every later feature.

**Acceptance Criteria**:

1. WHEN a developer runs `docker compose up` at the repository root on a fresh clone THEN the system SHALL start the `postgres` and `api` services and the API SHALL answer `GET /api/v1/health` with `200`.  <!-- FND-01 -->
2. WHEN the `api` container starts THEN the system SHALL apply all pending TypeORM migrations before accepting HTTP requests.  <!-- FND-02 -->
3. IF a required environment variable is missing or invalid at startup THEN the system SHALL exit with a non-zero code and log the name of each invalid variable.  <!-- FND-03 -->
4. The system SHALL serve every HTTP route under the `/api/v1` prefix.  <!-- FND-04 -->

**Independent Test**: On a clean clone, run `docker compose up`, then `curl localhost:3000/api/v1/health` returns `200`.

---

### P1: Health check ⭐ MVP

**User Story**: As an operator (or the Docker healthcheck), I want a health endpoint so that I know whether the API can reach its database.

**Why P1**: Docker compose readiness and smoke tests depend on it.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/v1/health` and the database answers THEN the system SHALL return `200` with body `{ "status": "ok", "checks": { "database": "up" } }`.  <!-- FND-05 -->
2. IF the database does not answer within 3 seconds during `GET /api/v1/health` THEN the system SHALL return `503` with body `{ "status": "error", "checks": { "database": "down" } }`.  <!-- FND-06 -->

**Independent Test**: e2e test against a Testcontainers PostgreSQL returns `200`; stopping the container makes the same call return `503`.

---

### P1: Standard error format ⭐ MVP

**User Story**: As an API client (front-end, mobile), I want every error in one predictable shape so that I can handle errors with a single code path.

**Why P1**: Every later feature returns errors; the contract must exist before them.

**Acceptance Criteria**:

1. The system SHALL return every error response (status ≥ 400) with `Content-Type: application/problem+json` and a body containing `type`, `title`, `status`, `detail`, `instance` (the request path) and `requestId`.  <!-- FND-07 -->
2. IF a request body fails validation THEN the system SHALL return `400` with an `errors` array where each item has `field` (property path) and `message`.  <!-- FND-08 -->
3. IF a request body contains a property not declared in the endpoint contract THEN the system SHALL return `400` listing that property in `errors`.  <!-- FND-09 -->
4. WHEN a client calls a route that does not exist THEN the system SHALL return `404` in Problem Details format.  <!-- FND-10 -->
5. IF an unhandled exception occurs THEN the system SHALL return `500` with `detail` = `"An unexpected error occurred."` and SHALL NOT include the stack trace or exception message in the body.  <!-- FND-11 -->
6. IF an unhandled exception occurs THEN the system SHALL log it at `error` level with the stack trace and the `requestId`.  <!-- FND-12 -->

**Independent Test**: e2e tests call an unknown route, send an invalid body to a test-only validation route, and trigger a test-only throwing route; each response matches the Problem Details shape.

---

### P1: Request tracing and structured logs ⭐ MVP

**User Story**: As a developer debugging an issue, I want every request to carry an id that appears in its logs and responses so that I can follow one request end to end.

**Why P1**: Cheap to add now, expensive to retrofit; error bodies (FND-07) depend on it.

**Acceptance Criteria**:

1. WHEN a request arrives with an `X-Request-Id` header that is a non-empty string of at most 128 characters THEN the system SHALL use that value as the request id.  <!-- FND-13 -->
2. WHEN a request arrives without a valid `X-Request-Id` header THEN the system SHALL generate a UUID v4 as the request id.  <!-- FND-14 -->
3. The system SHALL return the request id in the `X-Request-Id` response header of every response.  <!-- FND-15 -->
4. WHEN a request completes THEN the system SHALL write one JSON log line containing `requestId`, HTTP method, request URL (path plus query string), status code and duration in milliseconds.  <!-- FND-16 -->
5. The system SHALL redact the `Authorization` header and any `password` field as `"[REDACTED]"` in every log line.  <!-- FND-17 -->
6. The system SHALL use the log level given by the `LOG_LEVEL` environment variable, defaulting to `info`.  <!-- FND-18 -->

**Independent Test**: e2e test sends a request with `X-Request-Id: abc` and asserts the response header; a log-capture test asserts the JSON line fields and redaction.

---

### P1: API documentation ⭐ MVP

**User Story**: As an API client developer or portfolio reviewer, I want interactive API docs so that I can explore and call the endpoints.

**Why P1**: Documents the contract every later feature extends.

**Acceptance Criteria**:

1. WHEN a client calls `GET /api/docs` THEN the system SHALL return the Swagger UI HTML page with `200`.  <!-- FND-19 -->
2. WHEN a client calls `GET /api/docs-json` THEN the system SHALL return a valid OpenAPI 3 JSON document with `200` that includes the health endpoint.  <!-- FND-20 -->

**Independent Test**: e2e test fetches `/api/docs-json` and asserts `openapi` starts with `3.` and `paths` contains `/api/v1/health`.

---

### P1: Test and quality harness ⭐ MVP

**User Story**: As a developer, I want one command per test level and for lint so that every feature is verified the same way.

**Why P1**: BE-AD-003 requires three test levels; every later task's gate runs these commands.

**Acceptance Criteria**:

1. WHEN a developer runs `pnpm test` in `back-end/` THEN the system SHALL run unit tests without requiring Docker or a database.  <!-- FND-21 -->
2. WHEN a developer runs `pnpm test:integration` in `back-end/` THEN the system SHALL start a PostgreSQL container via Testcontainers, apply migrations, run the integration tests and stop the container.  <!-- FND-22 -->
3. WHEN a developer runs `pnpm test:e2e` in `back-end/` THEN the system SHALL boot the full Nest app against a Testcontainers PostgreSQL and run HTTP tests with supertest.  <!-- FND-23 -->
4. WHEN a developer runs `pnpm lint` in `back-end/` THEN the system SHALL run oxlint (type-aware) and Prettier checks and exit non-zero on any violation.  <!-- FND-24 -->
5. IF Docker is not available when `pnpm test:integration` or `pnpm test:e2e` runs THEN the system SHALL fail with a message stating that Docker is required.  <!-- FND-25 -->

**Independent Test**: Run each command on a clean checkout; each exits `0`.

---

## Edge Cases

- IF the `X-Request-Id` header is longer than 128 characters THEN the system SHALL ignore it and generate a UUID v4 (covered by FND-14).
- IF the request body is malformed JSON THEN the system SHALL return `400` in Problem Details format with `detail` stating the body is not valid JSON.  <!-- FND-26 -->
- IF PostgreSQL is not ready when the `api` container starts THEN the system SHALL wait for the `postgres` healthcheck before starting the `api` service.  <!-- FND-27 -->

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | FND-08, FND-09, FND-13, FND-26 |
| Failure / partial-failure states | FND-03, FND-06, FND-11, FND-27 |
| Idempotency / retry / duplicate handling | N/A because foundation exposes no state-changing endpoints |
| Auth boundaries & rate limits | N/A because auth is feature `auth`; rate limiting is out of scope |
| Concurrency / ordering | N/A because foundation has no shared mutable state |
| Data lifecycle / expiry | N/A because foundation stores no data |
| Observability | FND-12, FND-15, FND-16, FND-17, FND-18 |
| External-dependency failure | FND-06 (database), FND-25 (Docker for tests) |
| State-transition integrity | N/A because foundation has no stateful entities |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FND-01 | P1: Run the API from a fresh clone | Tasks | In Tasks |
| FND-02 | P1: Run the API from a fresh clone | Tasks | In Tasks |
| FND-03 | P1: Run the API from a fresh clone | Tasks | In Tasks |
| FND-04 | P1: Run the API from a fresh clone | Tasks | In Tasks |
| FND-05 | P1: Health check | Tasks | In Tasks |
| FND-06 | P1: Health check | Tasks | In Tasks |
| FND-07 | P1: Standard error format | Tasks | In Tasks |
| FND-08 | P1: Standard error format | Tasks | In Tasks |
| FND-09 | P1: Standard error format | Tasks | In Tasks |
| FND-10 | P1: Standard error format | Tasks | In Tasks |
| FND-11 | P1: Standard error format | Tasks | In Tasks |
| FND-12 | P1: Standard error format | Tasks | In Tasks |
| FND-13 | P1: Request tracing and structured logs | Tasks | In Tasks |
| FND-14 | P1: Request tracing and structured logs | Tasks | In Tasks |
| FND-15 | P1: Request tracing and structured logs | Tasks | In Tasks |
| FND-16 | P1: Request tracing and structured logs | Tasks | In Tasks |
| FND-17 | P1: Request tracing and structured logs | Tasks | In Tasks |
| FND-18 | P1: Request tracing and structured logs | Tasks | In Tasks |
| FND-19 | P1: API documentation | Tasks | In Tasks |
| FND-20 | P1: API documentation | Tasks | In Tasks |
| FND-21 | P1: Test and quality harness | Tasks | In Tasks |
| FND-22 | P1: Test and quality harness | Tasks | In Tasks |
| FND-23 | P1: Test and quality harness | Tasks | In Tasks |
| FND-24 | P1: Test and quality harness | Tasks | In Tasks |
| FND-25 | P1: Test and quality harness | Tasks | In Tasks |
| FND-26 | Edge case: malformed JSON | Tasks | In Tasks |
| FND-27 | Edge case: database not ready | Tasks | In Tasks |

**Coverage:** 27 total, 27 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A fresh clone reaches a `200` health check with `docker compose up` and no other manual step.
- [ ] Every error-path e2e test receives a Problem Details body with `requestId`.
- [ ] `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` and `pnpm lint` all exit `0`.
