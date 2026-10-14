# STATE — Back-end (API)

App decisions for the NestJS API. Must conform to the global decisions in `../../.specs/STATE.md`.

## Decisions

### BE-AD-001
- **Decision**: Modular NestJS layout, one module per feature (`auth`, `boards`, `lists`, `cards`, …); inside each module, business rules live in framework-free TypeScript (entities / domain services with no Nest or TypeORM imports), and data access goes through a Repository interface owned by the module.
- **Reason**: Business rules stay unit-testable without Nest or a database, and request handling stays thin and organized, borrowing DDD practices (rich entities, repositories) without full DDD/Clean layering.
- **Trade-off**: More files and mapping code than a plain Nest CRUD service; fewer guarantees than a strict layered architecture (no enforced dependency rule tooling).
- **Scope**: all back-end modules
- **Date**: 2026-10-14
- **Status**: active

### BE-AD-002
- **Decision**: Persistence uses TypeORM on PostgreSQL; TypeORM entity classes are infrastructure-only persistence models, mapped to and from the pure domain entities inside the repository implementation; schema changes go through TypeORM migrations (`synchronize` disabled).
- **Reason**: TypeORM is the market default for NestJS; keeping its decorators out of the domain preserves BE-AD-001.
- **Trade-off**: Duplicate model per aggregate (domain + persistence) plus mappers; TypeORM's typing is looser than Prisma/Drizzle.
- **Scope**: all back-end modules with persistence
- **Date**: 2026-10-14
- **Status**: active

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

## Handoff

