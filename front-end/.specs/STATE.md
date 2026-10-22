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

### FE-AD-006
- **Decision**: The app is layered `app` → `pages` → `features/<feature>` → `shared`. Each feature is a modular MVVM module: `model/` (framework-free TS on top of the contract types, with no parallel domain model; reshaping happens through `select` mappers), `api/` (key factory, query options, mutation hooks; the only code that calls the API, so it plays the repository role), `view-models/` (`use-<screen>-view-model.ts` returning `{ state, actions }`, only for complex screens), `components/` (Views), and `index.ts` as the only public entry. A feature never imports another feature; pages compose features; `shared` imports nothing above it. oxlint `no-restricted-imports` enforces the rule. Server data lives only in the TanStack Query cache, shareable/reload-safe state in the URL, and the only global client stores are session and preferences. Optimistic updates are limited to drag and drop and toggles. Interactive primitives in `shared/ui` wrap React Aria Components; forms are controlled inputs with no form library.
- **Reason**: Each ROADMAP feature stays self-contained and reviewable; view-models keep Views testable with plain props, while skipping a repository/mapper layer avoids duplicating the contract types (the cost that made the back-end supersede BE-AD-001/002 with BE-AD-005); one source of truth per kind of state avoids stale copies of server data; React Aria provides the keyboard and focus behavior the prototype requires (drag with keyboard, dialogs, menus) without building it by hand; the forms have one or two fields, so a form library would add more than it saves.
- **Trade-off**: The UI depends on API shapes directly, so a contract change can reach components (caught by `typecheck`); deciding when a screen is "complex enough" for a view-model is a judgment call; cross-feature screens need composition at the page or a query moved to `shared`; lint overrides must be kept in sync with the folder layout; React Aria adds a dependency and its own styling API (render props / data attributes).
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

### FE-AD-007
- **Decision**: Tests live outside `src/`, in `front-end/test/`, following the back-end layout: `test/unit/` mirrors `src/` (`src/app/app.tsx` → `test/unit/app/app.spec.tsx`), `test/e2e/` holds Playwright specs (`*.e2e-spec.ts`), and `test/support/` holds shared helpers (Vitest setup, `renderApp`, MSW server and handlers). Unit files are `*.spec.ts(x)` and import production code through the `@/` alias.
- **Reason**: One test layout across the repo, and `src/` holds only code that ships.
- **Trade-off**: A test sits far from its file, so a move in `src/` needs the matching move in `test/unit/`; the FE-AD-006 import rule covers `src/` only, so tests may import any layer.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

## Handoff

Foundation: done. All 20 tasks merged, one PR each (T1–T20); README documents running and testing the web app. Validation: PASS (`features/foundation/validation.md`, 38/38 FND requirements verified, 25/25 mutants killed). Next: feature 1 `auth` (sign up, log in, rate-limit notice, log out), starting at Specify.
