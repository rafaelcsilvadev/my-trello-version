# Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/foundation/spec.md`
**Design**: `front-end/.specs/features/foundation/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every library API is checked against the installed package's types/docs before use (design Risks: new majors).

---

## Test Coverage Matrix

> Generated from FE-AD-005, the approved design and the spec; the back-end layout (`back-end/test/*`) was sampled for style only (no front-end tests exist yet). Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005), root `.specs/STATE.md` (GL-AD-004) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared logic (`safeStorage`, stores, `config`, `safeRedirect`, `ApiError`/`call`, `createApiClient`, `sessionExpiry`, `queryClient`) | unit | All branches; 1:1 to spec ACs; every listed edge case (FND-36, FND-37, FND-38, redirect cases) | `front-end/test/unit/**/*.spec.ts` | `pnpm --filter front-end test` |
| Components and routing (`ThemeController`, i18n, toasts, routes/guards/pages, composition root) | unit (component: Testing Library + memory router + MSW) | Every AC the component owns: happy + error paths; timers with fake clock; real providers via `renderApp` | `front-end/test/unit/**/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (built bundle + real API) | e2e (Playwright, Chromium) | Guard redirects, unknown route, theme and language from storage, served SPA fallback | `front-end/test/e2e/**/*.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
| Styles, Dockerfile, nginx, compose, CI workflow, docs | none | Build gate + the explicit command checks in each task's Done when | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Inner TDD loop only | `pnpm --filter front-end test` |
| Build | End of every task (lint and types count) | `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` |
| Full | Tasks that touch e2e, Docker or CI | build gate `&& pnpm --filter front-end test:e2e` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. One task per branch/PR (pair-programming flow), each PR reviewed before the next task starts.

### Phase 1: Scaffold

```
T1 → T2 → T3
```

### Phase 2: Shared state

```
T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 3: API layer

```
T8 → T9 → T10 → T11 → T12
```

### Phase 4: Routing and UI

```
T12 → T13 → T14 → T15 → T16
```

### Phase 5: Delivery

```
T16 → T17 → T18 → T19 → T20
```

---

## Task Breakdown

### T1: Front-end package scaffold

**What**: Create the `front-end` workspace package: `package.json` (design versions; scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`), `tsconfig.json` (strict, `moduleResolution: bundler`, `jsx: react-jsx`, `verbatimModuleSyntax`), `vite.config.ts` (React plugin, `server.port 5173 strictPort`, Vitest block with `jsdom` and `include: ['test/unit/**/*.spec.{ts,tsx}']`), `index.html`, `src/main.tsx` rendering an empty `<App />`, `.oxlintrc.json` (react, react-hooks, jsx-a11y, plus the FE-AD-006 dependency rule as `no-restricted-imports` overrides per folder), `@/` → `src/` alias in `tsconfig.json` and `vite.config.ts`, prettier config; add `front-end` to `pnpm-workspace.yaml`; depend on `@my-trello/api-contract` `workspace:*`.
**Where**: `front-end/package.json` (+ `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app/app.tsx`, `test/unit/app/app.spec.tsx`, `.oxlintrc.json`, `.prettierrc.json`, `pnpm-workspace.yaml`)
**Depends on**: None
**Reuses**: `back-end/package.json` lint script shape, `packages/api-contract/tsconfig.json` strictness
**Requirement**: FND-03, FND-32

**Tools**:

- MCP: `codegraph`, WebSearch (Vite 8 / Vitest 5 config)
- Skill: `pair-programming`

**Done when**:

- [x] `pnpm install` at the root updates the single lockfile; no new lockfile appears
- [x] `pnpm --filter front-end run dev` serves `http://localhost:5173` (curl `200`, HTML contains `<div id="root">`)
- [x] Smoke component test: `<App />` renders without throwing
- [x] A deliberate lint error and a deliberate type error each make `lint` / `typecheck` exit non-zero (checked locally, not committed)
- [x] Throwaway files `src/features/a/index.ts` importing `@/features/b`, and `src/shared/x.ts` importing `@/features/a`, each make `lint` exit non-zero (checked locally, not committed)
- [x] Build gate passes; 1 test

**Tests**: unit
**Gate**: build

**Commit**: `chore(front-end): scaffold React + Vite app in the workspace`

---

### T2: API origin config

**What**: `resolveApiOrigin(env)` returns the trimmed `VITE_API_URL` without a trailing `/`, or `http://localhost:3000` when unset/blank; `apiOrigin` constant from `import.meta.env`; `vite-env.d.ts` types `VITE_API_URL`.
**Where**: `front-end/src/shared/config.ts`
**Depends on**: T1
**Reuses**: none
**Requirement**: FND-04

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: unset → `http://localhost:3000`; `""` and `"  "` → default; `"http://api.test/"` → `"http://api.test"`; `" http://api.test "` → trimmed
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): resolve the API origin from VITE_API_URL`

---

### T3: Tailwind v4 and Púrpura tokens

**What**: Copy `colors`, `typography`, `spacing`, `effects` tokens from `design/_ds/` into `src/styles/tokens/`; add `dark.css` and `labels.css` from the prototype (`Task List.dc.html:24-34`); `app.css` with `@import "tailwindcss"`, `@custom-variant dark`, the `@theme` / `@theme inline` maps (`Task List.dc.html:38-82`); self-hosted fonts via `@fontsource-variable/{outfit,onest,jetbrains-mono}`; `@tailwindcss/vite` plugin; import `app.css` in `main.tsx`.
**Where**: `front-end/src/styles/app.css` (+ `src/styles/tokens/*.css`, `vite.config.ts`, `src/main.tsx`)
**Depends on**: T2
**Reuses**: `front-end/design/_ds/*/tokens/*.css`, prototype `<style>` blocks
**Requirement**: FND-20

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] `pnpm --filter front-end build` emits CSS containing `--brand` and a `[data-theme=dark]` rule, and utility classes `bg-surface-page` / `text-text-primary` used in `App` resolve to the token variables
- [x] No request to `fonts.googleapis.com` in the built CSS
- [x] Build gate passes; test count unchanged (1)

**Tests**: none
**Gate**: build

**Commit**: `feat(front-end): add Tailwind v4 with the Púrpura tokens`

---

### T4: Safe storage

**What**: `createSafeStorage(getBackend?)` probes the backend once (set/remove a probe key); on any throw it switches to an in-memory `Map` for the rest of the session.
**Where**: `front-end/src/shared/storage/safe-storage.ts`
**Depends on**: T3
**Reuses**: none
**Requirement**: FND-37

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: with `localStorage`, `set` then `get` returns the value and the value is in `localStorage`; `remove` deletes it
- [x] Unit: when the backend getter throws, and when `setItem` throws, `set`/`get`/`remove` work in memory and never throw
- [x] Unit: `get` of a missing key → `null`
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add storage wrapper with in-memory fallback`

---

### T5: Session store

**What**: `createSessionStore(storage)` with `getToken`, `setToken`, `clear`, `subscribe` (key `my-trello.token`) and `useHasSession(store)` via `useSyncExternalStore`.
**Where**: `front-end/src/shared/session/session-store.ts`
**Depends on**: T4
**Reuses**: `safeStorage` (T4)
**Requirement**: FND-12, FND-13 (token source), FND-14 (clear)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: a token stored under `my-trello.token` before creation is returned by `getToken`; `setToken` persists; `clear` removes and `getToken` → `null`
- [x] Unit: subscribers are called on `setToken` and `clear`, and not after unsubscribe
- [x] Unit (hook): `useHasSession` re-renders `false → true → false` across `setToken` / `clear`
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add session token store`

---

### T6: Preferences store

**What**: `Theme`, `Language`, `parseTheme`, `parseLanguage`, `createPreferencesStore(storage)` (`get`, `setTheme`, `setLanguage`, `subscribe`; keys `my-trello.theme`, `my-trello.language`) and `usePreferences(store)`.
**Where**: `front-end/src/shared/preferences/preferences-store.ts`
**Depends on**: T5
**Reuses**: `safeStorage` (T4), `useSyncExternalStore` pattern from T5
**Requirement**: FND-23, FND-24, FND-25, FND-27

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: empty storage → `{ theme: 'system', language: 'en' }`, also when `navigator.language` is `pt-BR`
- [x] Unit: stored `dark` / `pt-BR` are read back; `setTheme('light')` / `setLanguage('pt-BR')` persist and notify
- [x] Unit: stored `"blue"`, `""`, `"PT-BR"`, `"pt"` are ignored and the defaults are used
- [x] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add theme and language preferences store`

---

### T7: Theme controller

**What**: `resolveTheme(pref, prefersDark)` and `<ThemeController store />` that sets `document.documentElement.dataset.theme` and listens to `matchMedia('(prefers-color-scheme: dark)')` changes only while the preference is `system`.
**Where**: `front-end/src/shared/theme/theme-controller.tsx`
**Depends on**: T6
**Reuses**: `usePreferences` (T6)
**Requirement**: FND-21, FND-22

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `resolveTheme` truth table (light/dark ignore device; system follows it)
- [x] Component: `light` with a dark device → `data-theme="light"`; `dark` with a light device → `data-theme="dark"`
- [x] Component: `system` switches `light → dark` when the mocked media query fires `change`, without remount
- [x] Component: after switching from `system` to `light`, a media `change` no longer alters `data-theme`
- [x] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): apply light, dark and system themes`

---

### T8: i18n setup

**What**: `locales/en.ts` (source, `as const`) and `locales/pt-BR.ts` (`satisfies Translation`) with the keys foundation needs (route headings, not-found, session expired, network/load errors, toast close); `createI18n(language)`, `<LanguageController store i18n />` (changes language and sets `<html lang>`), `i18next.d.ts` `CustomTypeOptions`.
**Where**: `front-end/src/shared/i18n/i18n.ts` (+ `locales/en.ts`, `locales/pt-BR.ts`, `i18next.d.ts`, `language-controller.tsx`)
**Depends on**: T7
**Reuses**: texts from `front-end/design/i18n.js` (`sessionExpired`, `myBoards`, `settings`, `loadErrTitle`, `retry`, …)
**Requirement**: FND-23 (language half), FND-24, FND-26, FND-28

**Tools**:

- MCP: WebSearch (i18next 26 / react-i18next 17 typing)
- Skill: `pair-programming`

**Done when**:

- [x] Unit: flattened key sets of `en` and `pt-BR` are equal and no value is empty (this test fails when a key is removed from either file)
- [x] Component: language `en` → `<html lang="en">` and a key renders the EN text; `setLanguage('pt-BR')` → `<html lang="pt-BR">` and PT text, without reload
- [x] A `t('missing.key')` call fails `typecheck` (checked locally with `// @ts-expect-error` in the test file)
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add PT-BR and EN translations with i18next`

---

### T9: ApiError and call()

**What**: `FieldError`, `ProblemDetails`, `class ApiError`, `call(request)` (data → value; HTTP error → Problem Details or `about:blank`; rejected fetch → `status 0`), `isProblemType(err, type)`.
**Where**: `front-end/src/shared/api/api-error.ts`
**Depends on**: T8
**Reuses**: shape of `back-end/src/errors/problem-details.ts:5`
**Requirement**: FND-17, FND-18

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: success resolves `data`; a `409` Problem body → `ApiError` with its `status`, `type`, `title`, `detail`, `requestId`; a `400` body with `errors[]` keeps `errors`
- [x] Unit: `500` with `text/html` body → `status 500`, `type 'about:blank'`; JSON body without `type` → `about:blank`
- [x] Unit: rejected promise (`TypeError: Failed to fetch`) → `status 0`, `type 'about:blank'`
- [x] Unit: `isProblemType` true for matching type, false for other type and for non-`ApiError`
- [x] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): map API failures to a typed ApiError`

---

### T10: Typed API client with auth middleware

**What**: `createApiClient({ baseUrl, getToken, onSessionExpired, fetch? })` over `openapi-fetch` `createClient<paths>`; `onRequest` adds `Authorization: Bearer` only with a token; `onResponse` calls `onSessionExpired` on `401` of an authenticated request outside `PUBLIC_AUTH_PATHS`. Test setup gains the MSW server (`test/support/setup.ts`, `test/support/msw/server.ts`, unhandled requests fail the test).
**Where**: `front-end/src/shared/api/client.ts` (+ `test/support/setup.ts`, `test/support/msw/server.ts`)
**Depends on**: T9
**Reuses**: `paths` from `@my-trello/api-contract`, `ApiError`/`call` (T9)
**Requirement**: FND-11, FND-12, FND-13, FND-14 (trigger), FND-15

**Tools**:

- MCP: WebSearch (openapi-fetch 0.17 middleware, MSW 3 `setupServer` options)
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): with token `t1`, `GET /api/v1/me` arrives at `${baseUrl}/api/v1/me` with `Authorization: Bearer t1`; without token, the header is absent
- [x] Unit: `401` on `GET /api/v1/boards` with a token → `onSessionExpired` called once; `401` without a token → not called
- [x] Unit: `401` on `POST /api/v1/auth/login` and on `POST /api/v1/auth/register` (with and without a stored token) → not called, and `call()` rejects with `type '/problems/invalid-credentials'`
- [x] Unit: `403`, `404`, `500` with a token → not called
- [x] Type check: `// @ts-expect-error` on `GET '/api/v1/nope'` and on a `POST /api/v1/boards` body with `title: 1` (`CreateBoardDto` has `title`, not `name`) (fails `typecheck` if the error disappears)
- [x] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add typed API client with bearer auth`

---

### T11: Session expiry handler

**What**: `createSessionExpiryHandler({ session, clearCache, navigate, currentLocation })` per design: no-op without a token; else clear token, clear cache, navigate to `/login?redirect=<path+search>&reason=session-expired`; on `/login` or `/signup` keep the existing `redirect` and only set `reason`.
**Where**: `front-end/src/shared/session/session-expiry.ts`
**Depends on**: T10
**Reuses**: `SessionStore` (T5)
**Requirement**: FND-14, FND-36, FND-38

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: on `/b/x/t/y?q=1` → token cleared, `clearCache` called, `navigate('/login?redirect=%2Fb%2Fx%2Ft%2Fy%3Fq%3D1&reason=session-expired')`
- [x] Unit: two calls in a row (parallel 401s) → `navigate` and `clearCache` called once
- [x] Unit: on `/login?redirect=%2Fboards` → `navigate('/login?redirect=%2Fboards&reason=session-expired')`; on `/login` with no redirect → no `redirect` param
- [x] Unit: after `setToken` again, a new expiry navigates again
- [x] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): expire the session once on 401`

---

### T12: Query client

**What**: `createQueryClient()` — queries retry up to 3 times except on `ApiError` with `4xx`; mutations do not retry.
**Where**: `front-end/src/shared/api/query-client.ts`
**Depends on**: T11
**Reuses**: `ApiError` (T9)
**Requirement**: FND-19

**Tools**:

- MCP: WebSearch (TanStack Query v5 retry options)
- Skill: `pair-programming`

**Done when**:

- [x] Unit: a query failing with `ApiError 404` runs its fn once; with `ApiError 500` and with `status 0` it runs 4 times (retry delay set to 0 in the test)
- [x] Unit: a mutation failing with `500` runs once
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add query client without 4xx retries`

---

### T13: Safe redirect helper

**What**: `safeRedirect(value)` returns `value` only when it starts with `/` and not with `//` or `/\`; otherwise `/boards`.
**Where**: `front-end/src/shared/navigation/safe-redirect.ts`
**Depends on**: T12
**Reuses**: none
**Requirement**: FND-10

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `/b/x?q=1` kept; `null`, `""`, `boards`, `//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:alert(1)` → `/boards`
- [x] Build gate passes; ≥ 8 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add open-redirect-safe redirect helper`

---

### T14: Routes, guards and placeholder pages

**What**: `createRoutes({ session })` with the seven routes, `/` → `/boards`, `*` → `NotFoundPage`; loaders `requireSession` and `redirectIfSession`; `PlaceholderPage({ titleKey })`; `LoginPlaceholderPage` shows the `sessionExpired` notice when `reason=session-expired`; test helper `renderApp({ route, token?, prefs? })` with real providers and `createMemoryRouter`.
**Where**: `front-end/src/app/routes.tsx` (+ `src/app/guards.ts`, `src/pages/placeholder-page.tsx`, `src/pages/login-placeholder-page.tsx`, `src/pages/not-found-page.tsx`, `test/support/render-app.tsx`)
**Depends on**: T13
**Reuses**: `SessionStore` (T5), i18n (T8), `safeRedirect` (T13)
**Requirement**: FND-05, FND-06, FND-07, FND-08, FND-09, FND-16

**Tools**:

- MCP: WebSearch (React Router 8 data-mode loaders, `createMemoryRouter`)
- Skill: `pair-programming`

**Done when**:

- [x] Component: with a token, each of the seven routes renders its own heading (7 cases)
- [x] Component: without a token, `/boards`, `/b/x`, `/b/x/t/y`, `/b/x/labels`, `/settings` end at `/login?redirect=<encoded path>` and the protected heading never renders
- [x] Component: with a token, `/login` and `/signup` end at `/boards`; `/` ends at `/boards` (with token) and `/login?redirect=%2Fboards` (without)
- [x] Component: `/nope/deep` renders the not-found view; its link goes to `/boards`
- [x] Component: `/login?reason=session-expired` shows "Your session expired. Log in again." in EN and "Sua sessão expirou. Entre novamente." in PT; `/login` alone does not
- [x] Build gate passes; ≥ 20 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add route table with session guards`

---

### T15: Toasts

**What**: `<ToastProvider>` with a bottom-center `role="status"` region and `useToast().show({ message, action? })`; 3 s without action, 7 s with action; clicking the action runs it and hides the toast.
**Where**: `front-end/src/shared/ui/toast/toast-provider.tsx` (+ `use-toast.ts`)
**Depends on**: T14
**Reuses**: Púrpura toast look (`design/_ds/*/css/components.css` `.p-toast`)
**Requirement**: FND-29, FND-30, FND-31

**Tools**:

- MCP: NONE
- Skill: `pair-programming`, `accessibility`

**Done when**:

- [x] Component (fake timers): plain toast visible inside `role="status"` at 2999 ms, gone at 3000 ms
- [x] Component: toast with action visible at 6999 ms, gone at 7000 ms
- [x] Component: clicking the action calls its callback once and hides the toast immediately
- [x] Component: two toasts shown back to back are both visible and each expires on its own timer
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add toast notices`

---

### T16: Composition root

**What**: `main.tsx` wires storage → session + preferences → query client → browser router → expiry handler → API client (`ApiProvider` / `useApi`) → `<App>` with `QueryClientProvider`, `I18nextProvider`, `ToastProvider`, `ThemeController`, `LanguageController`, `RouterProvider`. `renderApp` (T14) is switched to the same `createAppServices()` factory so tests and app share the wiring.
**Where**: `front-end/src/app/app-services.ts` (+ `src/main.tsx`, `src/app/app.tsx`, `src/shared/api/api-context.tsx`, `test/support/render-app.tsx`)
**Depends on**: T15
**Reuses**: every store/client from T2–T15
**Requirement**: FND-14 (end to end), FND-16, FND-19, FND-36

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Component (MSW): token stored, a test page on `/boards` calls `useApi().GET('/api/v1/boards')` through `useQuery`; API answers `401` → URL `/login?redirect=%2Fboards&reason=session-expired`, notice visible, `localStorage` has no token, query cache empty
- [x] Component: two parallel queries both answering `401` → one navigation (router history grows by one entry)
- [x] Component: `POST /api/v1/auth/login` answering `401` from `/login` → URL unchanged, token untouched
- [x] Component: stored `dark` + `pt-BR` → `data-theme="dark"`, `lang="pt-BR"`, PT heading on first render
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): wire providers and services in the composition root`

---

### T17: Docker image and compose service

**What**: Multi-stage `front-end/Dockerfile` (node base with workspace manifests incl. `packages/api-contract`, `pnpm install --filter front-end...`, `ARG VITE_API_URL`, build; runtime `nginxinc/nginx-unprivileged:1.31.7-alpine` on `8080`), `front-end/nginx.conf` (`try_files $uri /index.html`, CSP `default-src 'self'; connect-src 'self' <api origin>`, long cache for `/assets/`), compose `web` service (`ports: "5173:8080"`, `depends_on: api`); `.dockerignore` keeps `front-end/design` out.
**Where**: `front-end/Dockerfile` (+ `front-end/nginx.conf`, `docker-compose.yml`, `.dockerignore`)
**Depends on**: T16
**Reuses**: `back-end/Dockerfile` stages and cache mounts
**Requirement**: FND-01, FND-02

**Tools**:

- MCP: NONE
- Skill: `pair-programming`, `security-best-practices`

**Done when**:

- [ ] `docker compose up --build -d` then `curl -i http://localhost:5173/` → `200`, `text/html`, `Content-Security-Policy` header present
- [ ] `curl -i http://localhost:5173/b/abc/t/def` → `200` with the same HTML; `curl -I` on a built `/assets/*.js` → `200` with `Cache-Control` long-lived
- [ ] Container runs as non-root (`docker compose exec web id -u` ≠ `0`)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `feat(front-end): serve the app from an nginx container in compose`

---

### T18: Playwright e2e smoke suite

**What**: `playwright.config.ts` (`webServer`: compose `postgres` + `api` reused when `http://localhost:3000/api/v1/health` answers, 180 s timeout; `vite preview --port 5173 --strictPort`; Chromium), `test:e2e` script, `test/e2e/foundation.e2e-spec.ts`.
**Where**: `front-end/test/e2e/foundation.e2e-spec.ts` (+ `front-end/playwright.config.ts`, `front-end/package.json`)
**Depends on**: T17
**Reuses**: none
**Requirement**: FND-34, FND-06, FND-07, FND-09, FND-21, FND-26

**Tools**:

- MCP: `claude-in-chrome` (manual check of the built app), WebSearch (Playwright 1.64 webServer array)
- Skill: `pair-programming`, `playwright-skill`

**Done when**:

- [ ] e2e: `/boards` without a token → URL `/login?redirect=%2Fboards`
- [ ] e2e: with a token in `localStorage`, `/login` → `/boards`
- [ ] e2e: `/nope` shows the not-found view
- [ ] e2e: `localStorage` theme `dark` + language `pt-BR` → `html[data-theme=dark][lang=pt-BR]`
- [ ] e2e: the API health URL answers `200` with an `Access-Control-Allow-Origin: http://localhost:5173` header for a request with that `Origin` (CORS proof)
- [ ] Full gate passes; ≥ 5 e2e tests

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): add Playwright e2e smoke suite`

---

### T19: Front-end CI jobs

**What**: In `ci.yml`, a `front-end` matrix job (`script: [lint, typecheck, test, build]`, `fail-fast: false`, names `front-end (<script>)`) and a `front-end-e2e` job named `front-end (test:e2e)` (install, `playwright install --with-deps chromium`, `test:e2e`); after the first green run, add the five check names to the `protect-main` ruleset (with the user's go-ahead).
**Where**: `.github/workflows/ci.yml`
**Depends on**: T18
**Reuses**: `back-end` job steps in `ci.yml`
**Requirement**: FND-33, FND-35

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] The PR shows five green front-end checks next to the existing six
- [ ] A throwaway commit with a type error in `front-end/src` turns `front-end (typecheck)` red while the other front-end checks still report (then reverted, not merged)
- [ ] `protect-main` required checks list the five new names (`gh api` read-back)
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: full

**Commit**: `ci: run front-end lint, types, tests, build and e2e`

---

### T20: Front-end docs

**What**: Front-end section in `README.md` and `README.PT.md` (run with compose, dev server, `VITE_API_URL`, scripts, e2e and how to stop its compose services); roadmap status `Done`; STATE handoff.
**Where**: `README.md` (+ `README.PT.md`, `front-end/.specs/ROADMAP.md`, `front-end/.specs/STATE.md`)
**Depends on**: T19
**Reuses**: back-end README sections
**Requirement**: none (docs; design Risks: build-time `VITE_API_URL`, compose left running)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Every command in the new README section runs as written on a fresh clone
- [ ] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document running and testing the web app`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3
Phase 2:  T4 → T5 → T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12
Phase 4:  T13 → T14 → T15 → T16
Phase 5:  T17 → T18 → T19 → T20
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Scaffold | Package config files, one empty app | ⚠️ Cohesive (nothing builds until all config exists) |
| T2: API origin | 1 function | ✅ Granular |
| T3: Tailwind + tokens | Style files only | ⚠️ Cohesive (copied tokens + one entry CSS) |
| T4: Safe storage | 1 function | ✅ Granular |
| T5: Session store | 1 store + its hook | ✅ Granular |
| T6: Preferences store | 1 store + parsers | ✅ Granular |
| T7: Theme controller | 1 component + 1 pure function | ✅ Granular |
| T8: i18n | Setup + 2 locale files + controller | ⚠️ Cohesive (locales are data; one i18n concern) |
| T9: ApiError | 1 class + 1 function | ✅ Granular |
| T10: API client | 1 factory + test MSW setup | ⚠️ Cohesive (MSW setup is first needed here) |
| T11: Session expiry | 1 function | ✅ Granular |
| T12: Query client | 1 factory | ✅ Granular |
| T13: Safe redirect | 1 function | ✅ Granular |
| T14: Routes | Route table + guards + 3 tiny pages + test helper | ⚠️ Cohesive (pages are placeholders; guards untestable without the table) |
| T15: Toasts | 1 provider + its hook | ✅ Granular |
| T16: Composition root | Wiring only | ⚠️ Cohesive (one wiring concern) |
| T17: Docker | Dockerfile + nginx + compose entry | ⚠️ Cohesive (one service) |
| T18: e2e | Config + 1 spec | ✅ Granular |
| T19: CI | 1 file | ✅ Granular |
| T20: Docs | Docs only | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | App shell component | unit | unit | ✅ OK |
| T2 | Shared logic | unit | unit | ✅ OK |
| T3 | Styles | none | none | ✅ OK |
| T4 | Shared logic | unit | unit | ✅ OK |
| T5 | Shared logic + hook | unit | unit | ✅ OK |
| T6 | Shared logic + hook | unit | unit | ✅ OK |
| T7 | Component | unit | unit | ✅ OK |
| T8 | Component + locale data | unit | unit | ✅ OK |
| T9 | Shared logic | unit | unit | ✅ OK |
| T10 | Shared logic | unit | unit | ✅ OK |
| T11 | Shared logic | unit | unit | ✅ OK |
| T12 | Shared logic | unit | unit | ✅ OK |
| T13 | Shared logic | unit | unit | ✅ OK |
| T14 | Routing + pages | unit | unit | ✅ OK |
| T15 | Component | unit | unit | ✅ OK |
| T16 | Composition root | unit | unit | ✅ OK |
| T17 | Dockerfile, nginx, compose | none | none | ✅ OK |
| T18 | Running app | e2e | e2e | ✅ OK |
| T19 | CI workflow | none | none | ✅ OK |
| T20 | Docs | none | none | ✅ OK |

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FND-01, FND-02 | T17 |
| FND-03 | T1 |
| FND-04 | T2 |
| FND-05, FND-08 | T14 |
| FND-06, FND-07, FND-09 | T14, T18 |
| FND-10 | T13 |
| FND-11, FND-12, FND-13, FND-15 | T10 |
| FND-14 | T10, T11, T16 |
| FND-16 | T14, T16 |
| FND-17, FND-18 | T9 |
| FND-19 | T12, T16 |
| FND-20 | T3 |
| FND-21, FND-22 | T7 (FND-21 also T18) |
| FND-23 | T6, T8 |
| FND-24 | T6, T8 |
| FND-25, FND-27 | T6 |
| FND-26 | T8, T18 |
| FND-28 | T8 |
| FND-29, FND-30, FND-31 | T15 |
| FND-32 | T1 (all scripts by T18) |
| FND-33, FND-35 | T19 |
| FND-34 | T18 |
| FND-36 | T11, T16 |
| FND-37 | T4 |
| FND-38 | T11 |

**Coverage:** 38 total, 38 mapped to tasks, 0 unmapped.
