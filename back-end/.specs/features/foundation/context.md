# Foundation Context

**Gathered:** 2026-10-14
**Spec:** `back-end/.specs/features/foundation/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Runnable NestJS API skeleton with PostgreSQL (TypeORM + migrations), Docker compose for a one-command run, `/api/v1` prefix, RFC 9457 errors, request id + pino logs, health check, Swagger, and the three test levels plus lint. No domain tables or business endpoints.

---

## Implementation Decisions

### API contract

- All routes under `/api/v1` (versioning from day one).
- Errors follow RFC 9457 Problem Details.

### Operations

- `GET /api/v1/health` checks the database.
- Logs with pino as JSON, carrying a request id.
- Node `24.17.0` and pnpm `11.8.0` pinned (`.nvmrc`, `packageManager`).
- The project runs entirely in Docker from a GitHub clone (GL-AD-003).

### Agent's Discretion

- Problem `type` value for generic errors, unknown-property policy, request id bounds, Swagger paths, migration-on-start, config validation, `.gitignore` contents — chosen defaults logged in the spec's Assumptions table (confirmed by the user on 2026-10-14).

### Declined / Undiscussed Gray Areas → Assumptions

- CORS, CI, rate limiting and tests-inside-Docker were not discussed; recorded as Out of Scope in the spec.

---

## Specific References

- RFC 9457 (Problem Details for HTTP APIs).

---

## Deferred Ideas

- CI pipeline (GitHub Actions).
- CORS, when the front-end starts.
