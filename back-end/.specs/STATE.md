# STATE — Back-end (API)

App decisions for the NestJS API. Must conform to the global decisions in `../../.specs/STATE.md`.

## Decisions

### BE-AD-001
- **Decision**: Modular NestJS layout, one module per feature (`auth`, `boards`, `lists`, `cards`, …); inside each module, business rules live in framework-free TypeScript (entities / domain services with no Nest or TypeORM imports), and data access goes through a Repository interface owned by the module.
- **Reason**: Business rules stay unit-testable without Nest or a database, and request handling stays thin and organized, borrowing DDD practices (rich entities, repositories) without full DDD/Clean layering.
- **Trade-off**: More files and mapping code than a plain Nest CRUD service; fewer guarantees than a strict layered architecture (no enforced dependency rule tooling).
- **Scope**: all back-end modules
- **Date**: 2026-10-14
- **Status**: superseded by BE-AD-005

### BE-AD-002
- **Decision**: Persistence uses TypeORM on PostgreSQL; TypeORM entity classes are infrastructure-only persistence models, mapped to and from the pure domain entities inside the repository implementation; schema changes go through TypeORM migrations (`synchronize` disabled).
- **Reason**: TypeORM is the market default for NestJS; keeping its decorators out of the domain preserves BE-AD-001.
- **Trade-off**: Duplicate model per aggregate (domain + persistence) plus mappers; TypeORM's typing is looser than Prisma/Drizzle.
- **Scope**: all back-end modules with persistence
- **Date**: 2026-10-14
- **Status**: superseded by BE-AD-005

### BE-AD-003
- **Decision**: Test strategy has three levels: unit tests for domain code (no I/O), integration tests for repositories against a real PostgreSQL started with Testcontainers, and e2e HTTP tests with supertest against the full Nest app; no coverage percentage target.
- **Reason**: Ownership rules and ordering logic depend on real SQL behavior that mocks or SQLite would hide; acceptance criteria map naturally to e2e tests.
- **Trade-off**: Integration/e2e suites need Docker and run slower than mocked tests.
- **Scope**: all back-end features
- **Date**: 2026-10-14
- **Status**: active

### BE-AD-004
- **Decision**: Every API error leaves through the single global `ProblemDetailsFilter` as RFC 9457 Problem Details (`application/problem+json`, with `requestId`); features throw framework-free domain errors that are mapped to a status and a specific `type` in one place, never building error bodies in controllers.
- **Reason**: Front-end and mobile handle every error with one code path; domain code stays free of HTTP concerns (BE-AD-001).
- **Trade-off**: Each new domain error needs a mapping entry; the health `503` body is the single documented exception.
- **Scope**: all back-end modules
- **Date**: 2026-10-14
- **Status**: active

### BE-AD-005
- **Decision**: Each feature module follows the classic NestJS layering, wired by dependency injection: `*.entity.ts` (TypeORM entity = the table), `*.repository.ts` (all queries for that entity, injected TypeORM `Repository`), `*.service.ts` (business rules), `*.controller.ts` (HTTP contract between client and service, with DTOs); one flat folder per module (`src/<module>/` + `dto/`). Persistence stays on TypeORM + PostgreSQL with migrations and `synchronize` disabled.
- **Reason**: Simple, familiar pattern that matches the size of the domain; one entity model instead of domain + ORM models + mappers; business rules stay unit-testable by injecting a mocked repository into the service.
- **Trade-off**: Services depend on TypeORM entity classes (no framework-free domain layer); swapping the ORM would touch services. Domain errors are still plain TS error classes thrown by services and mapped by the global filter (BE-AD-004).
- **Scope**: all back-end modules (supersedes BE-AD-001 and BE-AD-002)
- **Date**: 2026-10-14
- **Status**: active

### BE-AD-006
- **Decision**: Every route requires a valid access token through the global `JwtAuthGuard` (`APP_GUARD`); public routes opt out explicitly with `@Public()`, and handlers read the caller with `@CurrentUser()`.
- **Reason**: Routes added by later features are protected by default; forgetting a decorator fails closed, not open.
- **Trade-off**: Every public route (health, register, login) must remember `@Public()`; each protected request costs one user lookup by primary key.
- **Scope**: all back-end modules
- **Date**: 2026-10-15
- **Status**: active

### BE-AD-007
- **Decision**: Domain errors extend `DomainError` (`src/errors/domain-error.ts`) and are mapped to an HTTP `status` and Problem `type` only in `src/errors/domain-error-mappings.ts`, which `ProblemDetailsFilter` consults; an unmapped `DomainError` becomes `500`.
- **Reason**: Refines BE-AD-004 with a concrete single mapping place; services throw plain errors with no HTTP knowledge.
- **Trade-off**: The mapping file imports error classes from every feature module.
- **Scope**: all back-end modules
- **Date**: 2026-10-15
- **Status**: active

### BE-AD-008
- **Decision**: Ownership is enforced in the repository: every query on a user-owned resource filters by the owner id (`findOwned(ownerId, id)`, `listOwned(ownerId, ...)`), with no unscoped finder; a resource that is missing, belongs to another user, or has a malformed id answers the same `404` with the resource's `/problems/<resource>-not-found` type. Nested resources (lists, cards) check access through the parent board's owner-scoped lookup.
- **Reason**: Single-owner product (ROADMAP); one query per lookup, and a foreign id never reveals that it exists.
- **Trade-off**: Every repository method on owned data carries an `ownerId` parameter; no shared guard does the check for free.
- **Scope**: boards, lists, cards, labels, checklists
- **Date**: 2026-10-19
- **Status**: active

### BE-AD-009
- **Decision**: Ordered children (lists in a board, cards in a list) store a contiguous 0-based `position` (`NULL` while archived), backed by `UNIQUE (parent_id, position) DEFERRABLE INITIALLY DEFERRED`; every write that changes positions runs in one transaction that first locks the parent row with `SELECT ... FOR UPDATE`, then shifts siblings with raw SQL so their `updated_at` stays unchanged.
- **Reason**: The move API takes a target index; the parent row lock serializes concurrent reorders and also serializes with parent archive/delete, which take the same row lock; the deferred constraint catches any renumbering bug at commit.
- **Trade-off**: Writes on one parent queue behind each other, and a move rewrites up to `n` sibling rows; fine at personal scale, not for very large or highly concurrent collections.
- **Scope**: lists, cards
- **Date**: 2026-10-19
- **Status**: superseded by BE-AD-010

### BE-AD-010
- **Decision**: Ordered children (lists in a board, cards in a list) store a contiguous 0-based `position` (`NULL` while archived), backed by `UNIQUE (parent_id, position) DEFERRABLE INITIALLY DEFERRED`; every write on a list or a card runs in one transaction that first locks the owning **board** row with `SELECT ... FOR UPDATE`, then shifts siblings with raw SQL so their `updated_at` stays unchanged.
- **Reason**: Supersedes BE-AD-009, which locked the direct parent: for cards that would be the list, so a cross-list move would need two ordered locks and the board-archived check would run unlocked. Locking the board gives one lock per write, and serializes card writes with list archive/delete and board archive/delete, which take the same row lock.
- **Trade-off**: Every list and card write on one board queues behind the others, and a move rewrites up to `n` sibling rows; fine at personal scale, not for very large or highly concurrent boards.
- **Scope**: lists, cards
- **Date**: 2026-10-20
- **Status**: active

### BE-AD-011
- **Decision**: Rows owned by a card in another module (checklist items) are written only through `CardsService.writeActiveCard(ownerId, cardId, work, before?)`, which runs `writeLocked` (board row lock, card and list re-read, board > list > card guards) and hands `work` the transaction's `EntityManager`; the owning module binds its repository to that manager. `cards` reads such tables only with raw SQL and never imports the owning module. Ordered card children follow BE-AD-010 with `position NOT NULL` when they have no archive.
- **Reason**: One copy of the card write rules and lock, while the child's CRUD lives in its own module instead of growing `CardsService`.
- **Trade-off**: `writeActiveCard` exposes a raw `EntityManager`, so callers are trusted to write only their own tables.
- **Scope**: checklists (and any future card-owned child)
- **Date**: 2026-10-21
- **Status**: active

### BE-AD-012
- **Decision**: `configureApp` hardens every response: `helmet()` with its default headers (including the default CSP) runs right after the HTTP logger; CORS is enabled only when `CORS_ORIGINS` (comma-separated, each entry an exact `http(s)` origin, validated by Zod, empty by default) lists origins, with `credentials: false`; the JSON body limit is an explicit `100kb` and body-parser's `entity.too.large` error is translated to a `413` Problem Details, and any other `4xx` body-parser error (unsupported charset or encoding) keeps its status.
- **Reason**: Safe defaults for a public API: no cross-origin access unless configured, standard security headers on every response including errors, and an oversized body no longer answers `500`. The Swagger UI loads only same-origin scripts, so the default CSP needs no exception.
- **Trade-off**: The body limit is a constant, so raising it needs a code change; `'*'` is rejected, so every front-end origin must be listed; HSTS is sent even over plain HTTP in local runs (browsers ignore it there).
- **Scope**: all HTTP routes
- **Date**: 2026-10-21
- **Status**: active

### BE-AD-013
- **Decision**: Demo data comes from a seed CLI (`pnpm seed`, or `node dist/seed/seed.js` in the API container), never from the API boot. It uses the TypeORM CLI `DataSource`, runs pending migrations, then in one transaction deletes the demo user (`demo@example.com`, cascading to its boards) and recreates it with the fixed data in `src/seed/demo-data.ts`, written straight through the entities. The password `demo1234` is public by design; due dates are relative to the seed day.
- **Reason**: Anyone trying the project gets a populated account with one command, the front-end starts against realistic data, and production boot never writes demo rows. Resetting keeps every run identical.
- **Trade-off**: The seed skips the services, so a new domain rule is not enforced on demo data until the integration test catches it; edits made in the demo account are lost on the next run; like the migration scripts, the CLI needs `DATABASE_URL` and `JWT_SECRET` in the environment and does not read `.env`.
- **Scope**: seed (users, boards, lists, cards, labels, checklists)
- **Date**: 2026-10-21
- **Status**: active

## Open Items

### P1
- **Item**: `PasswordHasher.verify` trusts the argon2 parameters (`m`, `t`, `p`) recorded in the stored hash, with no upper bound; a stored hash with a huge `m` or `t` would exhaust memory or CPU on login.
- **Likelihood**: unrealistic / improbable. Only `PasswordHasher.hash` writes `password_hash`, with fixed parameters; the API never returns or accepts it, and the user's password does not change the parameters. Exploiting it needs write access to the database, which already allows worse attacks.
- **Decision**: accepted as is, no fix planned. Revisit only if stored hashes ever come from an external source (e.g. an import).
- **Source**: auth T4 (`src/auth/password-hasher.ts`)
- **Date**: 2026-10-15
- **Status**: accepted

### P2
- **Item**: body-parser errors other than `entity.parse.failed` and `entity.too.large` are not HttpExceptions, so they still answer `500`: an unsupported charset (`Content-Type: application/json; charset=latin1`) or `Content-Encoding` should be `415`, an aborted or mis-sized body `400`.
- **Likelihood**: low; only malformed clients send them, and the response leaks nothing beyond a generic `500`.
- **Decision**: translate any body-parser error that carries a `4xx` `status` to an `HttpException` with that status and body-parser's message.
- **Source**: hardening (`src/app.setup.ts`, `translateBodyParserError`)
- **Date**: 2026-10-21
- **Status**: resolved in the hardening PR

## Handoff

