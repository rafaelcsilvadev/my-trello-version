# Auth Specification

## Problem Statement

The foundation ships `/login` and `/signup` as placeholders, so nobody can get a token and every protected route bounces back to log in. Feature `auth` turns those routes into the real sign-up and log-in forms from the prototype (doc §4), shows the rate-limit and failure notices, and lets the user sign out. Every later feature (boards, board, card detail) needs a logged-in user to be demoed.

## Goals

- [ ] A new visitor can create an account at `/signup` and lands on `/boards` with the toast "Conta criada", without touching `localStorage` by hand.
- [ ] A returning user can log in at `/login` and lands on the `redirect` path (or `/boards`), including after a session expiry.
- [ ] A logged-in user can sign out from `/settings` and ends on `/login` with no token stored.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Language, theme and keyboard-shortcuts sections of `/settings` | Feature `settings` (6); this feature ships only the Session section |
| Breadcrumb ("Meus quadros › Quadro › Etiquetas") and shortcuts icon in the top bar | Features `boards`/`board` and `settings`; this feature ships only the logo and the Settings icon |
| Password reset, e-mail confirmation, change name/e-mail/password | The API has no endpoints for them |
| Server-side logout / token revocation | The API has no logout endpoint; the JWT stays valid until it expires |
| Sign out of every device | Doc §4: sign out ends the session only on this device |
| Show/hide password toggle | Not in the prototype |
| Social or SSO login | Not in the API |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where Sign out lives | `/settings` ships with only the Session section ("Conectado como {nome} · {e-mail}" from `GET /api/v1/me` + **Sair**); feature 6 adds the other sections | User choice; matches doc §9 with no rework later | y |
| Network or 5xx failure on log in / sign up | Alert at the top of the form, in the same spot as the 429 notice, with the existing text "Não foi possível falar com o servidor. Verifique sua conexão." Fields keep their values and the button is enabled again | User choice; one alert slot for every form-level message | y |
| How a user reaches `/settings` | Protected pages get a minimal top bar: the "task list" logo (links to `/boards`) and the Settings icon (links to `/settings`); the Settings icon is hidden on `/settings` itself | Doc §3: the icon shows on My boards and Board; without it, Sign out is reachable only by typing the URL | y |
| Client-side validation on sign up | Runs on submit with the doc §4 rules (name 1–100 after trim, e-mail format, password 8–72); no request is sent while any field is invalid | Prototype `authSubmit` validates before sending | y |
| Client-side validation on log in | None; empty or malformed values are sent and the API answer decides | Prototype does not validate log in; `LoginDto` has no format rules on purpose (no leak of register rules) | y |
| `400` on log in | Shows the generic "E-mail ou senha inválidos" alert | The API answers `400` for empty fields; the doc's error does not say which field is wrong | y |
| `400` with `errors[]` on sign up | Each `errors[].field` (`name`, `email`, `password`) shows that field's doc §4 message; unknown fields are ignored | Server rules match the client rules, so this only fires if they drift; server messages are English, so the UI uses its own | y |
| When field errors clear | Field errors stay until the next submit, which recomputes them | Prototype keeps `aErr` until `authSubmit` runs again | y |
| Values sent to the API | Name and e-mail trimmed; password sent as typed | API trims and lower-cases too; the password must match byte for byte | y |
| `redirect` on sign up | Ignored: sign up always lands on `/boards`; links between `/login` and `/signup` do not carry `redirect` | Doc §4: sign up "entra direto em Meus quadros" | y |
| Field values after a failed log in | E-mail and password keep their values | Prototype keeps `ae`/`ap` on failure | y |
| Session-expired notice | The real `/login` keeps the foundation behavior (FND-16): blue status box "Sua sessão expirou. Entre novamente." while `reason=session-expired` is in the URL | Doc §4 + prototype `isExpired` box | y |
| Sign-out side effects | Removes the token, clears the query cache and navigates to `/login` with no `redirect`, no `reason` and no toast | Doc §4 "vai para Entrar"; cache cleared so the next user sees no stale data | y |
| Texts | All labels, hints, errors and notices come from i18n keys with the PT-BR and EN texts of `design/i18n.js` | Foundation i18n rule (FE language through i18n resources) | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Sign up ⭐ MVP

**User Story**: As a visitor, I want to create an account with my name, e-mail and password so that I can start using my boards right away.

**Why P1**: No account means no token, so no other screen can be used.

**Acceptance Criteria**:

1. WHEN a visitor opens `/signup` THEN the system SHALL show the fields Nome, E-mail and Senha, the hint "Use de 8 a 72 caracteres" below Senha, a "Criar conta" submit button and a "Já tenho conta" link to `/login`.  <!-- FAUTH-01 -->
2. IF the trimmed name is empty on submit THEN the system SHALL show "Informe seu nome" on the Nome field and send no request.  <!-- FAUTH-02 -->
3. IF the trimmed name is longer than 100 characters on submit THEN the system SHALL show "Use até 100 caracteres" on the Nome field and send no request.  <!-- FAUTH-03 -->
4. IF the trimmed e-mail is not a valid e-mail address on submit THEN the system SHALL show "Informe um e-mail válido" on the E-mail field and send no request.  <!-- FAUTH-04 -->
5. IF the password is shorter than 8 or longer than 72 characters on submit THEN the system SHALL show "Use de 8 a 72 caracteres" on the Senha field and send no request.  <!-- FAUTH-05 -->
6. WHEN every field is valid on submit THEN the system SHALL send `POST /api/v1/auth/register` with the trimmed name, the trimmed e-mail and the password as typed.  <!-- FAUTH-06 -->
7. WHILE the sign-up request is in flight the system SHALL show "Criando…" on the submit button and keep it disabled.  <!-- FAUTH-07 -->
8. WHEN sign up answers `201` THEN the system SHALL store the returned `accessToken`, navigate to `/boards` and show the toast "Conta criada".  <!-- FAUTH-08 -->
9. IF sign up answers `409` with type `/problems/email-already-registered` THEN the system SHALL show "Este e-mail já está cadastrado" on the E-mail field and store no token.  <!-- FAUTH-09 -->
10. IF sign up answers `400` with `errors[]` THEN the system SHALL show, for each entry whose `field` is `name`, `email` or `password`, that field's message from FAUTH-02–FAUTH-05 (name: "Informe seu nome" when the trimmed name is empty, else "Use até 100 caracteres").  <!-- FAUTH-10 -->

**Independent Test**: Against the real API, open `/signup`, submit `Ana` / a new e-mail / `password123` → URL is `/boards`, toast "Conta criada" shows and `localStorage` holds the token; submit the same e-mail again from a fresh session → "Este e-mail já está cadastrado" under E-mail.

---

### P1: Log in ⭐ MVP

**User Story**: As a returning user, I want to log in with my e-mail and password so that I get back to my boards, or to the screen I was on when my session expired.

**Why P1**: Every session after the first one starts here, and session expiry (FND-14) sends the user here.

**Acceptance Criteria**:

1. WHEN a visitor opens `/login` THEN the system SHALL show the fields E-mail and Senha, an "Entrar" submit button and a "Criar conta" link to `/signup`.  <!-- FAUTH-11 -->
2. WHEN the user submits the log-in form THEN the system SHALL send `POST /api/v1/auth/login` with the trimmed e-mail and the password as typed, with no client-side validation.  <!-- FAUTH-12 -->
3. WHILE the log-in request is in flight the system SHALL show "Entrando…" on the submit button and keep it disabled.  <!-- FAUTH-13 -->
4. WHEN log in answers `200` THEN the system SHALL store the returned `accessToken` and navigate to the `redirect` query value filtered by the foundation redirect helper (FND-10), which is `/boards` when absent or unsafe.  <!-- FAUTH-14 -->
5. IF log in answers `401` or `400` THEN the system SHALL show the alert "E-mail ou senha inválidos" at the top of the form, keep both field values, stay on `/login` and store no token.  <!-- FAUTH-15 -->
6. WHILE the URL of `/login` holds `reason=session-expired` the system SHALL show the status box "Sua sessão expirou. Entre novamente." above the fields.  <!-- FAUTH-16 -->

**Independent Test**: Against the real API, with a seeded user, open `/login?redirect=%2Fsettings`, submit a wrong password → "E-mail ou senha inválidos" and URL unchanged; submit the right one → URL is `/settings`.

---

### P1: Form-level notices (rate limit and failures) ⭐ MVP

**User Story**: As a user, I want a clear message when the server refuses or cannot be reached so that I know whether to wait, retry or fix my input.

**Why P1**: The API throttles both routes at 10 requests per minute per IP; without the notice the form looks broken.

**Acceptance Criteria**:

1. IF log in or sign up answers `429` THEN the system SHALL show the alert "Muitas tentativas. Aguarde um minuto e tente novamente." at the top of the form, keep every field value and keep the submit button enabled.  <!-- FAUTH-17 -->
2. IF log in or sign up fails with a network error or a `5xx` status THEN the system SHALL show the alert "Não foi possível falar com o servidor. Verifique sua conexão." at the top of the form, keep every field value and re-enable the submit button.  <!-- FAUTH-18 -->
3. WHEN the user submits the form again THEN the system SHALL hide the previous form-level alert and the previous field errors before showing the new result.  <!-- FAUTH-19 -->

**Independent Test**: In a component test with MSW, answer `429` → rate-limit alert shows and the button is enabled; answer a network error → connection alert shows; submit again with `200` → no alert remains.

---

### P1: Sign out ⭐ MVP

**User Story**: As a logged-in user, I want to see which account I'm using and sign out of this device so that someone else can use it safely.

**Why P1**: On a shared device there is no other way to end the session; the API has no logout endpoint.

**Acceptance Criteria**:

1. WHEN a logged-in user opens `/settings` THEN the system SHALL show a "Sessão" section with the text "Conectado como {name} · {email}" filled from `GET /api/v1/me` and a "Sair" button.  <!-- FAUTH-20 -->
2. WHILE `GET /api/v1/me` is loading or has failed the system SHALL keep the "Sair" button enabled.  <!-- FAUTH-21 -->
3. WHEN the user clicks "Sair" THEN the system SHALL remove the stored token, clear the query cache and navigate to `/login` with no query string.  <!-- FAUTH-22 -->
4. WHILE a protected page is shown the system SHALL show a top bar with the "task list" logo linking to `/boards` and, except on `/settings`, a Settings icon button linking to `/settings`.  <!-- FAUTH-23 -->

**Independent Test**: Log in, click the Settings icon in the top bar → `/settings` shows "Conectado como Demo · demo@example.com"; click "Sair" → URL is `/login`, no token in `localStorage`, and opening `/boards` sends back to `/login?redirect=%2Fboards`.

---

## Edge Cases

- IF the user presses Enter again while a log-in or sign-up request is in flight THEN the system SHALL send no second request.  <!-- FAUTH-24 -->
- WHEN sign-up validation fails THEN the system SHALL move focus to the first invalid field.  <!-- FAUTH-25 -->
- The system SHALL link each field error to its input with `aria-describedby`, mark the input `aria-invalid="true"`, and render form-level alerts with `role="alert"` and the session-expired box with `role="status"`.  <!-- FAUTH-26 -->
- The system SHALL set `autocomplete` to `name`, `email` and `new-password` on the sign-up fields and to `email` and `current-password` on the log-in fields.  <!-- FAUTH-27 -->
- IF the `redirect` value on `/login` is `//evil.com` or `https://evil.com` THEN the system SHALL navigate to `/boards` after log in (covered by FAUTH-14 through FND-10).
- WHEN a user with a stored token opens `/login` or `/signup` THEN the system SHALL navigate to `/boards` (covered by FND-07).
- IF a log-in `401` arrives THEN the system SHALL not treat it as session expiry (covered by FND-15).

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | FAUTH-02–FAUTH-05, FAUTH-10 (sign up); log in deliberately unvalidated (FAUTH-12) |
| Failure / partial-failure states | FAUTH-09, FAUTH-15, FAUTH-17, FAUTH-18, FAUTH-21 |
| Idempotency / retry / duplicate handling | FAUTH-07, FAUTH-13, FAUTH-24 (no double submit); retry is a new submit (FAUTH-19) |
| Auth boundaries & rate limits | FAUTH-14 (safe redirect), FAUTH-17 (429), FAUTH-22 (sign out); guard and expiry covered by FND-06, FND-07, FND-14, FND-15 |
| Concurrency / ordering | FAUTH-24; parallel 401s covered by FND-36 |
| Data lifecycle / expiry | FAUTH-08, FAUTH-14 (token stored), FAUTH-22 (token and cache removed) |
| Observability | N/A because there is no deploy or monitoring service yet |
| External-dependency failure | FAUTH-18 (API unreachable or 5xx), FAUTH-21 (`/me` failed) |
| State-transition integrity | Logged-out → logged-in (FAUTH-08, FAUTH-14), logged-in → logged-out (FAUTH-22) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FAUTH-01 | P1: Sign up | Tasks | In Tasks |
| FAUTH-02 | P1: Sign up | Tasks | In Tasks |
| FAUTH-03 | P1: Sign up | Tasks | In Tasks |
| FAUTH-04 | P1: Sign up | Tasks | In Tasks |
| FAUTH-05 | P1: Sign up | Tasks | In Tasks |
| FAUTH-06 | P1: Sign up | Tasks | In Tasks |
| FAUTH-07 | P1: Sign up | Tasks | In Tasks |
| FAUTH-08 | P1: Sign up | Tasks | In Tasks |
| FAUTH-09 | P1: Sign up | Tasks | In Tasks |
| FAUTH-10 | P1: Sign up | Tasks | In Tasks |
| FAUTH-11 | P1: Log in | Tasks | In Tasks |
| FAUTH-12 | P1: Log in | Tasks | In Tasks |
| FAUTH-13 | P1: Log in | Tasks | In Tasks |
| FAUTH-14 | P1: Log in | Tasks | In Tasks |
| FAUTH-15 | P1: Log in | Tasks | In Tasks |
| FAUTH-16 | P1: Log in | Tasks | In Tasks |
| FAUTH-17 | P1: Form-level notices | Tasks | In Tasks |
| FAUTH-18 | P1: Form-level notices | Tasks | In Tasks |
| FAUTH-19 | P1: Form-level notices | Tasks | In Tasks |
| FAUTH-20 | P1: Sign out | Tasks | In Tasks |
| FAUTH-21 | P1: Sign out | Tasks | In Tasks |
| FAUTH-22 | P1: Sign out | Tasks | In Tasks |
| FAUTH-23 | P1: Sign out | Tasks | In Tasks |
| FAUTH-24 | Edge cases | Tasks | In Tasks |
| FAUTH-25 | Edge cases | Tasks | In Tasks |
| FAUTH-26 | Edge cases | Tasks | In Tasks |
| FAUTH-27 | Edge cases | Tasks | In Tasks |

**Coverage:** 27 total, 27 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] The Playwright e2e suite signs up a new user, signs out, logs back in and lands on the `redirect` path, against the real API and PostgreSQL.
- [ ] Every FAUTH requirement has at least one test whose assertion matches the spec text (message, URL or stored token).
- [ ] Both forms work in PT-BR and EN with the texts of `design/i18n.js`.
