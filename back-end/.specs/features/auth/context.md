# Auth Context

**Gathered:** 2026-10-15
**Spec:** `.specs/features/auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A visitor registers with name, email and password, logs in with email and password, and receives a JWT access token. The token authenticates every other API route; `GET /api/v1/me` returns the caller's profile. Login and register are rate-limited per IP.

---

## Implementation Decisions

### Token strategy

- Access token only: a signed JWT sent as `Authorization: Bearer <token>`.
- Lifetime configured by environment variable, default 1 hour.
- No refresh token and no server-side logout/revocation in this feature; refresh is a future feature.

### Register response

- Register logs the user in: `201` with `{ accessToken, user }`, the same shape as login.

### User fields

- `name` (1–100 characters after trim), `email`, `password` (8–72 characters).
- `GET /me` returns `id`, `name`, `email`, `createdAt`.

### Rate limiting

- Only `POST /auth/login` and `POST /auth/register`: 10 requests per minute per IP, per route; over the limit → `429` Problem Details.

### Agent's Discretion

- Password hashing algorithm and parameters (Design).
- Duplicate email → `409`; wrong email or wrong password → the same `401` (stated by the agent, not objected to).
- Email normalized with trim + lowercase.

### Declined / Undiscussed Gray Areas → Assumptions

- Specific Problem `type` URIs, JWT signing algorithm, throttler storage and timing-safe login are logged in the spec's Assumptions table.

---

## Specific References

No specific requirements - open to standard approaches.

---

## Deferred Ideas

- Refresh tokens with rotation, logout/revocation.
- Password reset, email verification, profile and password change.
