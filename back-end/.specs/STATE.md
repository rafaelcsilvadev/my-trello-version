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

## Open Items

### P1
- **Item**: `PasswordHasher.verify` trusts the argon2 parameters (`m`, `t`, `p`) recorded in the stored hash, with no upper bound; a stored hash with a huge `m` or `t` would exhaust memory or CPU on login.
- **Likelihood**: unrealistic / improbable. Only `PasswordHasher.hash` writes `password_hash`, with fixed parameters; the API never returns or accepts it, and the user's password does not change the parameters. Exploiting it needs write access to the database, which already allows worse attacks.
- **Decision**: accepted as is, no fix planned. Revisit only if stored hashes ever come from an external source (e.g. an import).
- **Source**: auth T4 (`src/auth/password-hasher.ts`)
- **Date**: 2026-10-15
- **Status**: accepted

## Handoff

