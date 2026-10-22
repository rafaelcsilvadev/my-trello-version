# Foundation Specification

## Problem Statement

The API (back-end features 0–6) is done, but there is no web client. Every screen in the prototype (`front-end/design/`) needs the same base: a React app in the pnpm workspace, the Púrpura tokens, themes, two languages, routes with an auth guard, one typed way to call the API and one way to react to its errors. Without a shared foundation each screen feature would reinvent these pieces. It must also run from a fresh clone with `docker compose up` (GL-AD-003) and be checked by CI on every PR (GL-AD-004).

## Goals

- [ ] `docker compose up` from a fresh clone serves the web app at `http://localhost:5173`, and it talks to the API at `http://localhost:3000`.
- [ ] Every API call goes through one typed client built from `@my-trello/api-contract` (GL-AD-005); a type change in the contract breaks the front-end build.
- [ ] Unit/component (Vitest) and e2e (Playwright) suites run with one command each, pass locally and run as CI jobs.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Log in, sign up and log out screens | Feature `auth`; foundation only ships placeholder pages for the routes |
| Boards, board, card detail, labels screens | Features `boards`, `board`, `card-detail`, `labels` |
| Settings screen and shortcuts dialog | Feature `settings`; foundation ships the theme and language state they will drive |
| Optimistic updates and pending items | Each screen feature applies them to its own mutations |
| Mobile app | `mobile/`, a separate app |
| Public deployment / hosting | Postponed (no public deploy yet) |
| Refresh tokens / silent re-login | The API issues one JWT with no refresh endpoint |
| Error monitoring service (Sentry etc.) | No deploy yet; nothing to monitor |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Framework and router | React + Vite + TypeScript SPA, React Router in data-router mode | User choice; matches the `CORS_ORIGINS: http://localhost:5173` already in compose | y |
| Data layer | `openapi-fetch` typed by `@my-trello/api-contract`, wrapped by TanStack Query | User choice; types come straight from GL-AD-005, Query handles cache and invalidation | y |
| Token storage | JWT in `localStorage` under one key | User choice; session survives reload and new tabs; API has no refresh token | y |
| Test stack | Vitest + Testing Library + MSW (unit/component), Playwright (e2e against the real API) | User choice | y |
| Workspace | `front-end` package added to `pnpm-workspace.yaml`, one lockfile (GL-AD-001) | Global decision | y |
| Styling | Tailwind CSS v4; the Púrpura tokens from `front-end/design/_ds/` become CSS variables mapped to Tailwind theme values | Prototype is built this way | y |
| i18n library | `i18next` + `react-i18next`; keys and PT/EN texts ported from `design/i18n.js` as each screen needs them | Market standard, interpolation and plurals built in | y |
| Initial language | Stored choice wins; otherwise `en`, regardless of `navigator.language` | User decision at spec approval: no stored language means EN | y |
| Initial theme | Stored choice wins; otherwise `system` (follows `prefers-color-scheme`) | Prototype lists Sistema as an option; least surprise | y |
| Preference storage | Theme and language in `localStorage`, one key each | Per-device preferences; the API has no user settings | y |
| API base URL | Build-time `VITE_API_URL` holds the API **origin**, default `http://localhost:3000`; contract paths already start with `/api/v1`; browser calls the API directly (CORS) | CORS for 5173 already set in compose (BE `CORS_ORIGINS`); no proxy to maintain; amended at Design after reading `schema.d.ts` paths | y |
| Docker service | `web` service in root compose: multi-stage `front-end/Dockerfile`, static build served on host port `5173` | GL-AD-003; same port as the Vite dev server so one CORS origin covers both | y |
| Session-expired trigger | A `401` on any request sent **with** a token, except the log-in and sign-up calls | Doc §4 "Sessão expirada" + note that wrong-password login is also 401 | y |
| Return path after re-login | The current path (with query) is passed to `/login` as `?redirect=`; only same-app paths starting with `/` (not `//`) are honored | Doc §4 "volta para a mesma tela"; the check blocks open redirects | y |
| Unknown route | Any path not in the route table shows a "page not found" view with a link to My boards | Not in the prototype; a SPA needs a fallback | y |
| Root path `/` | Redirects to `/boards` | Logo leads to My boards (doc §3) | y |
| Toast timing | 3 s without an action button, 7 s with one, bottom center, no undo | Doc §12 | y |
| CI | New front-end jobs in `ci.yml` (`lint`, `typecheck`, `test`, `build`, `e2e`); the `protect-main` ruleset gets the new check names afterwards | GL-AD-004; ruleset lists required check names | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Run the web app from a fresh clone ⭐ MVP

**User Story**: As a developer cloning the repo, I want the web app to start with the API and database from one command so that I can try the whole project without installing Node.

**Why P1**: It is the entry point for every reviewer and for every later front-end feature.

**Acceptance Criteria**:

1. WHEN a developer runs `docker compose up` at the repository root on a fresh clone THEN the system SHALL start a `web` service that answers `GET http://localhost:5173/` with `200` and an HTML page.  <!-- FND-01 -->
2. WHEN the browser opens any app route on the `web` service (e.g. `/boards`, `/b/abc`) THEN the system SHALL serve the same app HTML with `200`, so client-side routing handles the path.  <!-- FND-02 -->
3. WHEN a developer runs `pnpm --filter front-end run dev` THEN the system SHALL serve the app with hot reload at `http://localhost:5173`.  <!-- FND-03 -->
4. The system SHALL read the API origin from `VITE_API_URL` and default to `http://localhost:3000` when it is unset, so `GET /api/v1/me` goes to `http://localhost:3000/api/v1/me`.  <!-- FND-04 -->

**Independent Test**: Run `docker compose up`, open `http://localhost:5173/boards`, see the log-in placeholder (no token yet).

---

### P1: Routes and auth guard ⭐ MVP

**User Story**: As a user, I want protected pages to require a session and public pages to stay out of my way once I'm logged in so that I always land on the right screen.

**Why P1**: Every screen feature plugs into this route table.

**Acceptance Criteria**:

1. The system SHALL declare the routes `/login`, `/signup`, `/boards`, `/b/:boardId`, `/b/:boardId/t/:cardId`, `/b/:boardId/labels` and `/settings`, each rendering a placeholder page with its own heading until its feature replaces it.  <!-- FND-05 -->
2. WHEN a user without a stored token opens a protected route (`/boards`, `/b/*`, `/settings`) THEN the system SHALL navigate to `/login?redirect=<that path and query>`.  <!-- FND-06 -->
3. WHEN a user with a stored token opens `/login` or `/signup` THEN the system SHALL navigate to `/boards`.  <!-- FND-07 -->
4. WHEN a user opens `/` THEN the system SHALL navigate to `/boards` (and from there FND-06 applies).  <!-- FND-08 -->
5. WHEN a user opens a path that matches no route THEN the system SHALL render a "page not found" view with a link to `/boards`.  <!-- FND-09 -->
6. The system SHALL expose a redirect helper that returns the `redirect` query value only when it starts with `/` and not with `//`, and returns `/boards` otherwise.  <!-- FND-10 -->

**Independent Test**: With an empty `localStorage`, open `/b/x/labels` → URL becomes `/login?redirect=%2Fb%2Fx%2Flabels`; set a token, open `/login` → URL becomes `/boards`.

---

### P1: Typed API client and session expiry ⭐ MVP

**User Story**: As a front-end developer, I want one typed client that adds the token and handles expired sessions so that screen features only deal with their own data.

**Why P1**: Every screen calls the API; a wrong 401 rule would log users out on a wrong password or never log them out at all.

**Acceptance Criteria**:

1. The system SHALL create the API client with `openapi-fetch` typed by `paths` from `@my-trello/api-contract`, so a request to an undeclared path or with a wrong body type fails `tsc`.  <!-- FND-11 -->
2. WHILE a token is stored the system SHALL send `Authorization: Bearer <token>` on every API request.  <!-- FND-12 -->
3. WHILE no token is stored the system SHALL send no `Authorization` header.  <!-- FND-13 -->
4. IF a request sent with a token receives `401` THEN the system SHALL remove the stored token, clear the query cache and navigate to `/login?redirect=<current path and query>&reason=session-expired`.  <!-- FND-14 -->
5. IF the log-in or sign-up request receives `401` THEN the system SHALL keep the current route and return the error to the caller unchanged.  <!-- FND-15 -->
6. WHEN `/login` opens with `reason=session-expired` THEN the system SHALL show the notice "Sua sessão expirou. Entre novamente." (EN: "Your session expired. Log in again.").  <!-- FND-16 -->
7. IF an API response has status ≥ 400 and a Problem Details body (`application/problem+json`) THEN the system SHALL return a typed error carrying its `status`, `type`, `title` and `detail` (and `errors` when present).  <!-- FND-17 -->
8. IF a request fails without a response (network error) or the body is not Problem Details THEN the system SHALL return a typed error with `status` `0` for a network failure or the HTTP status otherwise, and `type` `about:blank`.  <!-- FND-18 -->
9. The system SHALL provide one TanStack Query client to the whole app, with query retries disabled for `4xx` errors.  <!-- FND-19 -->

**Independent Test**: In a component test with MSW, store a token, make the board list call return `401` → token gone, URL is `/login?redirect=%2Fboards&reason=session-expired`, notice visible; make the login call return `401` → URL unchanged, caller gets `invalid-credentials`.

---

### P1: Theme and language ⭐ MVP

**User Story**: As a user, I want the app in my language and in light or dark mode so that it is comfortable to read.

**Why P1**: Every screen renders text and colors through these; adding them later would mean touching every screen.

**Acceptance Criteria**:

1. The system SHALL style the app with Tailwind CSS v4 using the Púrpura color, typography, spacing and effect tokens from `front-end/design/_ds/` for both light and dark themes.  <!-- FND-20 -->
2. WHEN the theme is `light` or `dark` THEN the system SHALL apply that theme to the document root, regardless of the device setting.  <!-- FND-21 -->
3. WHILE the theme is `system` the system SHALL follow `prefers-color-scheme` and switch when the device setting changes, without a reload.  <!-- FND-22 -->
4. WHEN the theme or language is changed through the preferences API THEN the system SHALL apply it immediately and store it in `localStorage`, so a reload keeps it.  <!-- FND-23 -->
5. WHEN the app starts with no stored language THEN the system SHALL use `en`, whatever `navigator.language` is.  <!-- FND-24 -->
6. WHEN the app starts with no stored theme THEN the system SHALL use `system`.  <!-- FND-25 -->
7. The system SHALL set `<html lang>` to the active language (`pt-BR` or `en`).  <!-- FND-26 -->
8. IF a stored theme or language value is not one of the allowed values THEN the system SHALL ignore it and use the default from FND-24 / FND-25.  <!-- FND-27 -->
9. The system SHALL render every UI text through i18n keys with a PT-BR and an EN value; a key missing in either language fails a unit test.  <!-- FND-28 -->

**Independent Test**: Set `localStorage` theme to `dark` and language to `en`, reload → dark tokens applied, `<html lang="en">`, placeholder headings in English.

---

### P1: Toasts ⭐ MVP

**User Story**: As a user, I want short notices after actions and errors so that I know what happened.

**Why P1**: Every screen feature confirms saves and reports failures through toasts (doc §12); one shared component keeps them consistent.

**Acceptance Criteria**:

1. WHEN code calls the toast API with a message THEN the system SHALL show it at the bottom center in a live region (`role="status"`).  <!-- FND-29 -->
2. WHEN a toast has no action button THEN the system SHALL hide it after 3 seconds.  <!-- FND-30 -->
3. WHEN a toast has an action button THEN the system SHALL hide it after 7 seconds, and clicking the button SHALL run its callback and hide the toast.  <!-- FND-31 -->

**Independent Test**: In a component test with fake timers, show a plain toast → visible at 2.9 s, gone at 3 s; show one with "Tentar novamente" → visible at 6.9 s, gone at 7 s; click it → callback called once.

---

### P1: Quality gates in CI ⭐ MVP

**User Story**: As the maintainer, I want lint, type check, tests and build of the front-end to run on every PR so that a broken front-end never reaches `main`.

**Why P1**: Same guarantee the back-end already has (GL-AD-004).

**Acceptance Criteria**:

1. The system SHALL provide `lint`, `typecheck`, `test`, `build` and `test:e2e` scripts in `front-end/package.json`, each exiting non-zero on failure.  <!-- FND-32 -->
2. WHEN a pull request is opened or updated THEN CI SHALL run `lint`, `typecheck`, `test`, `build` and `test:e2e` of the front-end as separate jobs, with `fail-fast: false`.  <!-- FND-33 -->
3. WHEN `test:e2e` runs THEN the system SHALL start the API and PostgreSQL and run Playwright against the built app, with at least one smoke test that opens `/boards` without a token and lands on `/login`.  <!-- FND-34 -->
4. WHEN the `api-contract` package changes a type the front-end uses THEN the front-end `typecheck` job SHALL fail until the front-end code is updated.  <!-- FND-35 -->

**Independent Test**: Open a PR with a deliberate type error in `front-end/src` → `front-end (typecheck)` job fails, the others still report.

---

## Edge Cases

- IF two requests receive `401` at the same time THEN the system SHALL navigate to `/login` once and keep a single `redirect` value.  <!-- FND-36 -->
- IF `localStorage` is unavailable (throws on access) THEN the system SHALL keep the token and preferences in memory for the session and still render.  <!-- FND-37 -->
- WHEN a `401` arrives while the user is already on `/login` THEN the system SHALL not add a second `redirect` pointing to `/login`.  <!-- FND-38 -->
- IF the `redirect` query value is `//evil.com`, `https://evil.com` or empty THEN the system SHALL use `/boards` (covered by FND-10).

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | FND-10 (redirect value), FND-27 (stored preferences) |
| Failure / partial-failure states | FND-17, FND-18 (typed errors), FND-37 (no storage) |
| Idempotency / retry / duplicate handling | FND-19 (no retry on 4xx), FND-36 (one redirect for parallel 401s) |
| Auth boundaries & rate limits | FND-06, FND-07, FND-12–FND-15; the rate-limit notice itself is feature `auth` |
| Concurrency / ordering | FND-36 |
| Data lifecycle / expiry | FND-14 (token removed on expiry); N/A otherwise because the client stores no domain data beyond the query cache |
| Observability | N/A because there is no deploy or monitoring service yet (Out of Scope) |
| External-dependency failure | FND-18 (API unreachable) |
| State-transition integrity | FND-06, FND-07, FND-14 (logged-out ⇄ logged-in transitions) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FND-01 | P1: Run the web app | Validate | ✅ Verified |
| FND-02 | P1: Run the web app | Validate | ✅ Verified |
| FND-03 | P1: Run the web app | Validate | ✅ Verified |
| FND-04 | P1: Run the web app | Validate | ✅ Verified |
| FND-05 | P1: Routes and auth guard | Validate | ✅ Verified |
| FND-06 | P1: Routes and auth guard | Validate | ✅ Verified |
| FND-07 | P1: Routes and auth guard | Validate | ✅ Verified |
| FND-08 | P1: Routes and auth guard | Validate | ✅ Verified |
| FND-09 | P1: Routes and auth guard | Validate | ✅ Verified |
| FND-10 | P1: Routes and auth guard | Validate | ✅ Verified |
| FND-11 | P1: Typed API client | Validate | ✅ Verified |
| FND-12 | P1: Typed API client | Validate | ✅ Verified |
| FND-13 | P1: Typed API client | Validate | ✅ Verified |
| FND-14 | P1: Typed API client | Validate | ✅ Verified |
| FND-15 | P1: Typed API client | Validate | ✅ Verified |
| FND-16 | P1: Typed API client | Validate | ✅ Verified |
| FND-17 | P1: Typed API client | Validate | ✅ Verified |
| FND-18 | P1: Typed API client | Validate | ✅ Verified |
| FND-19 | P1: Typed API client | Validate | ✅ Verified |
| FND-20 | P1: Theme and language | Validate | ✅ Verified |
| FND-21 | P1: Theme and language | Validate | ✅ Verified |
| FND-22 | P1: Theme and language | Validate | ✅ Verified |
| FND-23 | P1: Theme and language | Validate | ✅ Verified |
| FND-24 | P1: Theme and language | Validate | ✅ Verified |
| FND-25 | P1: Theme and language | Validate | ✅ Verified |
| FND-26 | P1: Theme and language | Validate | ✅ Verified |
| FND-27 | P1: Theme and language | Validate | ✅ Verified |
| FND-28 | P1: Theme and language | Validate | ✅ Verified |
| FND-29 | P1: Toasts | Validate | ✅ Verified |
| FND-30 | P1: Toasts | Validate | ✅ Verified |
| FND-31 | P1: Toasts | Validate | ✅ Verified |
| FND-32 | P1: Quality gates in CI | Validate | ✅ Verified |
| FND-33 | P1: Quality gates in CI | Validate | ✅ Verified |
| FND-34 | P1: Quality gates in CI | Validate | ✅ Verified |
| FND-35 | P1: Quality gates in CI | Validate | ✅ Verified |
| FND-36 | Edge cases | Validate | ✅ Verified |
| FND-37 | Edge cases | Validate | ✅ Verified |
| FND-38 | Edge cases | Validate | ✅ Verified |

**Coverage:** 38 total, 38 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] From a fresh clone, `docker compose up` then opening `http://localhost:5173/boards` shows the log-in placeholder in under 2 minutes after images are built.
- [ ] All front-end CI jobs are green on the foundation PR.
- [ ] Every FND-NN has at least one test that fails when its behavior is removed (Verifier sensor).
