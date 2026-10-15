# Auth Specification

## Problem Statement

Every board, list and card belongs to one user, so the API must know who is calling before any domain feature can exist. Users need to create an account, log in, and send a credential with each request. Without authentication the API cannot enforce single-owner data (ROADMAP: personal, single-owner Trello).

## Goals

- [ ] A visitor can register and immediately call `GET /api/v1/me` with the returned token.
- [ ] Every API route except register, login, health and docs rejects requests without a valid token with `401`.
- [ ] Login and register resist brute force with a per-IP rate limit.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Refresh tokens, logout, token revocation | Access-token-only MVP (context.md); future feature |
| Password reset / forgot password | Needs email delivery; future feature |
| Email verification | Needs email delivery; future feature |
| Profile update, password change, account deletion | Not needed for the MVP |
| OAuth / social login | Not needed for the MVP |
| Roles and permissions | Single-owner product; no shared boards |
| Rate limiting on routes other than login and register | No abuse surface identified yet |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Token strategy | Access token only, JWT Bearer | Smallest MVP scope | y |
| Token lifetime | `JWT_EXPIRES_IN` env var, default `1h` | Short-lived tokens limit damage of a leaked token | y |
| JWT signing | HS256 with `JWT_SECRET` env var (required, ≥ 32 characters) | Single API issues and verifies tokens; no key distribution needed | y |
| Register response | `201` with `{ accessToken, user }` | One step fewer for clients | y |
| User fields | `name` 1–100 chars (trimmed), `email` ≤ 254 chars, `password` 8–72 chars | 72 keeps bcrypt usable; 254 is the practical email max | y |
| Email normalization | Trim + lowercase before storing and comparing | `A@x.com` and `a@x.com` are the same account | y |
| Duplicate email | `409` | Clear feedback for a registration form; enumeration risk accepted for a personal app | y |
| Wrong credentials | Same `401` body for unknown email and wrong password | Login does not reveal which accounts exist | y |
| Problem `type` for auth errors | Relative URIs: `/problems/email-already-registered`, `/problems/invalid-credentials`; other 401/429 use `about:blank` | RFC 9457 allows relative references; specific types only where clients branch on them | y |
| Rate limit | 10 requests / 60 s per IP, counted per route, on login and register only | Blocks brute force without hurting normal use | y |
| Rate-limit storage | In-memory (single API instance) | One container in compose; shared store not needed yet | y |
| Password hashing | One-way adaptive hash; algorithm chosen in Design | Implementation detail | y |
| Timing on unknown email | Login runs a hash comparison even when the email does not exist | Response time does not reveal registered emails | y |
| Default route protection | A global guard requires a token; routes opt out explicitly (register, login, health, docs) | New routes in later features are protected by default | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Register ⭐ MVP

**User Story**: As a visitor, I want to create an account with my name, email and password so that I can keep my own boards.

**Why P1**: No other feature can be used without an account.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/auth/register` with a valid `name`, `email` and `password` THEN the system SHALL create the user and return `201` with body `{ "accessToken": <JWT>, "user": { "id", "name", "email", "createdAt" } }`.  <!-- AUTH-01 -->
2. IF the normalized email already belongs to a user THEN the system SHALL return `409` with `type` `/problems/email-already-registered` and SHALL NOT create a user.  <!-- AUTH-02 -->
3. IF `name` is empty after trimming or longer than 100 characters THEN the system SHALL return `400` with an `errors` item for `name`.  <!-- AUTH-03 -->
4. IF `email` is not a valid email address or is longer than 254 characters THEN the system SHALL return `400` with an `errors` item for `email`.  <!-- AUTH-04 -->
5. IF `password` is shorter than 8 or longer than 72 characters THEN the system SHALL return `400` with an `errors` item for `password`.  <!-- AUTH-05 -->
6. WHEN the system stores or looks up an email THEN it SHALL use the email trimmed and lowercased.  <!-- AUTH-06 -->
7. The system SHALL store passwords only as a one-way salted hash and SHALL NOT include the password or its hash in any response body.  <!-- AUTH-07 -->

**Independent Test**: e2e test registers a user, receives `201` with a token, and a second register with the same email in another case returns `409`.

---

### P1: Login ⭐ MVP

**User Story**: As a registered user, I want to log in with my email and password so that I get a token to use the app.

**Why P1**: Returning users need a way back in.

**Acceptance Criteria**:

1. WHEN a client calls `POST /api/v1/auth/login` with an email and password matching a user THEN the system SHALL return `200` with body `{ "accessToken": <JWT>, "user": { "id", "name", "email", "createdAt" } }`.  <!-- AUTH-08 -->
2. IF the email does not belong to a user or the password does not match THEN the system SHALL return `401` with `type` `/problems/invalid-credentials` and `detail` `"Invalid email or password."`, identical in both cases.  <!-- AUTH-09 -->
3. IF `email` or `password` is missing or not a string THEN the system SHALL return `400` with an `errors` item for each invalid field.  <!-- AUTH-10 -->

**Independent Test**: e2e test registers, logs in with the same email in upper case and receives `200`; a wrong password returns `401`.

---

### P1: Access token and current user ⭐ MVP

**User Story**: As a logged-in user, I want my token to authenticate my requests and to fetch my profile so that clients can show who is logged in.

**Why P1**: Boards, lists and cards depend on knowing the caller.

**Acceptance Criteria**:

1. The system SHALL issue access tokens as JWTs signed with HS256 using `JWT_SECRET`, with claim `sub` = user id and `exp` = issue time + `JWT_EXPIRES_IN` (default `1h`).  <!-- AUTH-11 -->
2. IF `JWT_SECRET` is missing or shorter than 32 characters at startup THEN the system SHALL exit with a non-zero code and log the variable name (FND-03).  <!-- AUTH-12 -->
3. WHEN a client calls `GET /api/v1/me` with header `Authorization: Bearer <valid token>` THEN the system SHALL return `200` with body `{ "id", "name", "email", "createdAt" }` of the token's user.  <!-- AUTH-13 -->
4. IF a request to a protected route has no `Authorization` header, a header not in `Bearer <token>` form, a token with an invalid signature, or an expired token THEN the system SHALL return `401` in Problem Details format with `type` `about:blank`.  <!-- AUTH-14 -->
5. IF a valid token's `sub` does not match an existing user THEN the system SHALL return `401` in Problem Details format with `type` `about:blank`.  <!-- AUTH-15 -->
6. The system SHALL require a valid access token on every route except `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/health`, `/api/docs` and `/api/docs-json`.  <!-- AUTH-16 -->

**Independent Test**: e2e test calls `/me` with the token from register (`200`), without a token (`401`), and with a token signed by another secret (`401`).

---

### P1: Rate limit on login and register ⭐ MVP

**User Story**: As the owner of an account, I want repeated login attempts to be throttled so that my password cannot be brute-forced.

**Why P1**: Chosen in discuss; login is the main public attack surface.

**Acceptance Criteria**:

1. IF one IP sends more than 10 requests within 60 seconds to `POST /api/v1/auth/login` THEN the system SHALL answer the extra requests with `429` in Problem Details format and a `Retry-After` header.  <!-- AUTH-17 -->
2. IF one IP sends more than 10 requests within 60 seconds to `POST /api/v1/auth/register` THEN the system SHALL answer the extra requests with `429` in Problem Details format and a `Retry-After` header.  <!-- AUTH-18 -->
3. The system SHALL count login and register requests in separate limits.  <!-- AUTH-19 -->

**Independent Test**: e2e test sends 11 login requests from the same client; the 11th returns `429`, and a register request right after still returns a non-429 status.

---

## Edge Cases

- IF two register requests with the same normalized email arrive concurrently THEN the system SHALL create exactly one user and answer the other with `409` (database unique constraint).  <!-- AUTH-20 -->
- IF a register or login body contains a property not declared in the contract THEN the system SHALL return `400` (covered by FND-09).
- WHEN a register request is rejected (`400`, `409`) THEN the system SHALL NOT return a token (covered by AUTH-02 to AUTH-05).

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-10 |
| Failure / partial-failure states | AUTH-02 (no user on conflict), AUTH-12 |
| Idempotency / retry / duplicate handling | AUTH-02, AUTH-20 |
| Auth boundaries & rate limits | AUTH-14, AUTH-15, AUTH-16, AUTH-17, AUTH-18, AUTH-19 |
| Concurrency / ordering | AUTH-20 |
| Data lifecycle / expiry | AUTH-11 (token expiry); account deletion out of scope |
| Observability | Covered by FND-16 and FND-17 (request logs, `Authorization` and `password` redacted) |
| External-dependency failure | N/A because auth adds no external dependency beyond the database, whose failure surfaces as FND-11 `500` |
| State-transition integrity | N/A because users have no status transitions in this feature |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Register | - | Pending |
| AUTH-02 | P1: Register | - | Pending |
| AUTH-03 | P1: Register | - | Pending |
| AUTH-04 | P1: Register | - | Pending |
| AUTH-05 | P1: Register | - | Pending |
| AUTH-06 | P1: Register | - | Pending |
| AUTH-07 | P1: Register | - | Pending |
| AUTH-08 | P1: Login | - | Pending |
| AUTH-09 | P1: Login | - | Pending |
| AUTH-10 | P1: Login | - | Pending |
| AUTH-11 | P1: Access token and current user | - | Pending |
| AUTH-12 | P1: Access token and current user | - | Pending |
| AUTH-13 | P1: Access token and current user | - | Pending |
| AUTH-14 | P1: Access token and current user | - | Pending |
| AUTH-15 | P1: Access token and current user | - | Pending |
| AUTH-16 | P1: Access token and current user | - | Pending |
| AUTH-17 | P1: Rate limit on login and register | - | Pending |
| AUTH-18 | P1: Rate limit on login and register | - | Pending |
| AUTH-19 | P1: Rate limit on login and register | - | Pending |
| AUTH-20 | Edge case: concurrent register | - | Pending |

**Coverage:** 20 total, 0 mapped to tasks, 20 unmapped ⚠️

---

## Success Criteria

- [ ] Register → `/me` works end to end in one e2e test with no manual step.
- [ ] Every protected-route e2e test without a valid token receives a `401` Problem Details body.
- [ ] `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` and `pnpm lint` all exit `0`.
