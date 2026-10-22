# STATE — Front-end (Web)

Decisions for the web app. They must conform to the global decisions in the root `.specs/STATE.md` (GL-AD-NNN).

## Decisions

### FE-AD-001
- **Decision**: The web app is a React + Vite + TypeScript SPA in the pnpm workspace (`front-end/`), routed by React Router in data-router mode; route guards are loaders that `redirect()`.
- **Reason**: Everything sits behind login, so SSR adds nothing; Vite on 5173 matches the CORS origin already configured; loaders guard before render.
- **Trade-off**: No SSR/SEO; screens show a loading state on first paint.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

### FE-AD-002
- **Decision**: Every API call goes through one `openapi-fetch` client typed by `paths` from `@my-trello/api-contract`, wrapped by TanStack Query in screens; `call()` turns every failure into one `ApiError` (Problem Details fields, `status: 0` for network errors). A `401` on a request that carried a token (except log-in and sign-up) expires the session once: token cleared, cache cleared, navigate to `/login?redirect=…&reason=session-expired`.
- **Reason**: Contract changes break the build (GL-AD-005); screens handle one error type; the wrong-password `401` never logs anyone out.
- **Trade-off**: Error bodies are not typed by the contract, so `ApiError` mirrors `back-end/src/errors/problem-details.ts` by hand.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

### FE-AD-003
- **Decision**: The JWT and the theme/language preferences live in `localStorage` (keys `my-trello.token`, `my-trello.theme`, `my-trello.language`) behind a wrapper that falls back to memory when storage throws. With no stored language the app uses `en`; with no stored theme it uses `system`.
- **Reason**: Sessions survive reload and new tabs without a refresh-token endpoint; preferences are per device.
- **Trade-off**: A token in `localStorage` is readable by injected script; mitigated by React escaping, a CSP and the 1 h token lifetime.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

### FE-AD-004
- **Decision**: Styling is Tailwind CSS v4 over the Púrpura tokens copied from `front-end/design/_ds/` into `src/styles/tokens/`; dark mode is `[data-theme=dark]` on `<html>` (`@custom-variant dark`). UI text comes only from i18next keys with an EN source file and a PT-BR file that must have the same keys (type check + unit test).
- **Reason**: Matches the prototype one to one; the design folder stays a read-only reference.
- **Trade-off**: Token updates in the design folder must be copied by hand.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

### FE-AD-005
- **Decision**: Tests have two levels: Vitest + Testing Library + MSW for units and components (real providers and a memory router via `renderApp`), and Playwright (Chromium) for e2e against the real API started by `docker compose`. CI runs `lint`, `typecheck`, `test`, `build` as a `front-end` matrix and `test:e2e` as its own job.
- **Reason**: Component tests stay fast and deterministic; e2e proves the real contract and CORS.
- **Trade-off**: The e2e job builds the API image on every run.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

## Handoff

Foundation: Specify and Design approved; tasks.md approved (20 tasks), T1 next. Execute runs one task per branch/PR (pair-programming), after the spec/design/tasks docs PR.
