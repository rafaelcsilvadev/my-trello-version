# Foundation Validation

**Date**: 2026-10-22
**Spec**: `front-end/.specs/features/foundation/spec.md`
**Diff range**: `e2eb060^..aee1d82` scoped to `front-end/`, the front-end jobs in `.github/workflows/ci.yml`, the `web` service in `docker-compose.yml`, `.dockerignore` and `pnpm-workspace.yaml` (46 commits on `front-end/`, 71 files, +4644/-1)
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1

## Validation: Foundation - PASS ✅

**Result**: PASS ✅ - 38/38 requirements met with spec-anchored evidence, 0 spec-precision gaps. Build gate green (152 unit/component tests), full gate green (5 Playwright e2e tests run locally against Docker), sensor 25/25 killed (plus 1 equivalent mutant, not counted).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T20 | ✅ Done | Every "Done when" box in `tasks.md` is ticked (`grep -c -- '- [ ]' tasks.md` → `0`). One feature commit plus one check-off commit per task in the diff range. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/` unless they start with `.github/` or `docker-compose.yml`. "Verifier run" means a command the Verifier ran on 2026-10-22 against `aee1d82`.

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FND-01 | `docker compose up` starts `web`; `GET http://localhost:5173/` → `200` + HTML | `docker-compose.yml:48-58` (`web`, `ports: "5173:8080"`). Verifier run: `docker compose up --build -d --wait web` → all three containers `Healthy`; `curl /` → `200 text/html`, `Content-Security-Policy` present; `docker compose exec web id -u` → `101` (non-root) | ✅ |
| FND-02 | Any app route → same HTML with `200` | `nginx.conf` `location /` `try_files $uri /index.html`. Verifier run: `/`, `/boards`, `/b/abc`, `/b/abc/t/def` → `200 text/html`, identical body md5 `a0aaae6b…` | ✅ |
| FND-03 | `run dev` serves with hot reload at `:5173` | `package.json:8` `"dev": "vite"`; `vite.config.ts:10-13` `port: 5173, strictPort: true`. Verifier run: dev server → `200`, HTML has `<div id="root">` and `@vite/client` (HMR client) | ✅ |
| FND-04 | Origin from `VITE_API_URL`, default `http://localhost:3000`; `/api/v1/me` → `<origin>/api/v1/me` | `test/unit/shared/config.spec.ts:7` `expect(resolveApiOrigin({})).toBe('http://localhost:3000')`, `:13` blank → default; `test/unit/shared/api/client.spec.ts:51,60` handler on `${baseUrl}/api/v1/me` receives the request (`toBe('Bearer t1')`); wiring `src/app/app-services.ts:54` `baseUrl: apiOrigin` | ✅ |
| FND-05 | 7 routes, each its own heading | `test/unit/app/routes.spec.tsx:23-34` (5 protected, `expect(await heading()).toBe(title)` + URL unchanged), `:52-60` (`/login` → `Sign in`, `/signup` → `Create account`) | ✅ |
| FND-06 | No token on protected route → `/login?redirect=<path and query>` | `test/unit/app/routes.spec.tsx:62-78` `expect(currentUrl(router)).toBe(url)` incl. `'/b/x?q=1'` → `'/login?redirect=%2Fb%2Fx%3Fq%3D1'`, `:76` protected heading `toBeNull()`; e2e `test/e2e/foundation.e2e-spec.ts:11` `toHaveURL('/login?redirect=%2Fboards')` | ✅ |
| FND-07 | Token on `/login` or `/signup` → `/boards` | `test/unit/app/routes.spec.tsx:36-41` `expect(currentUrl(router)).toBe('/boards')`; e2e `test/e2e/foundation.e2e-spec.ts:21` `toHaveURL('/boards')` | ✅ |
| FND-08 | `/` → `/boards` (then FND-06) | `test/unit/app/routes.spec.tsx:47` `toBe('/boards')` with token, `:84` `toBe('/login?redirect=%2Fboards')` without | ✅ |
| FND-09 | Unknown path → not-found view with link to `/boards` | `test/unit/app/routes.spec.tsx:92` `toBe('Page not found')`, `:99` `expect(link.getAttribute('href')).toBe('/boards')`; e2e `test/e2e/foundation.e2e-spec.ts:27-32` | ✅ |
| FND-10 | Redirect helper keeps `/…`, rejects `//…`, else `/boards` | `test/unit/shared/navigation/safe-redirect.spec.ts:7` `toBe('/b/x?q=1')`, `:10-20` `null`, `''`, `boards`, `//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:alert(1)` → `toBe('/boards')` | ✅ |
| FND-11 | Client typed by contract `paths`; undeclared path / wrong body fails `tsc` | `test/unit/shared/api/client.spec.ts:141-144` two `// @ts-expect-error` lines (`GET '/api/v1/nope'`, `POST /api/v1/boards` `{ title: 1 }`); `src/shared/api/client.ts:4,20` `createClient<paths>`; gate `typecheck` exit 0; sensor M25 | ✅ |
| FND-12 | Token stored → `Authorization: Bearer <token>` | `test/unit/shared/api/client.spec.ts:60` `expect(authorization).toBe('Bearer t1')` | ✅ |
| FND-13 | No token → no `Authorization` | `test/unit/shared/api/client.spec.ts:75` `expect(authorization).toBeNull()` | ✅ |
| FND-14 | 401 with token → token removed, cache cleared, `/login?redirect=<path+query>&reason=session-expired` | Unit: `test/unit/shared/session/session-expiry.spec.ts:35` `getToken()` `toBeNull()`, `:36` `clearCache` `toHaveBeenCalledOnce()`, `:37-39` `navigate` `toHaveBeenCalledWith('/login?redirect=%2Fb%2Fx%2Ft%2Fy%3Fq%3D1&reason=session-expired')`; trigger `test/unit/shared/api/client.spec.ts:84` `toHaveBeenCalledOnce()`. End to end: `test/unit/app/app.spec.tsx:67-71` URL `'/login?redirect=%2Fboards&reason=session-expired'`, `localStorage` token `toBeNull()`, query cache `toHaveLength(0)` | ✅ |
| FND-15 | 401 on log-in / sign-up → route kept, error returned unchanged | `test/unit/shared/api/client.spec.ts:96-117` (login/register × with/without token) `expect((err as ApiError).type).toBe('/problems/invalid-credentials')`, `onSessionExpired` `not.toHaveBeenCalled()`; `test/unit/app/app.spec.tsx:105-107` status `401`, URL `toBe('/login')`, token `toBe(TOKEN)` | ✅ |
| FND-16 | `/login?reason=session-expired` → "Sua sessão expirou. Entre novamente." / "Your session expired. Log in again." | `test/unit/app/routes.spec.tsx:110` EN text, `:118` PT text (exact strings), `:126-128` and `:135-137` absent without / with another reason; `test/unit/app/app.spec.tsx:63-66` notice after a real 401 | ✅ |
| FND-17 | Problem Details body → typed error with `status`, `type`, `title`, `detail` (+ `errors`) | `test/unit/shared/api/api-error.spec.ts:46-52` `toMatchObject({ status: 409, type: '/problems/email-taken', title: 'Conflict', detail: 'E-mail already registered', requestId: 'req-1' })`, `:72` `expect(err.errors).toEqual(errors)` | ✅ |
| FND-18 | Network failure → `status 0`; non-Problem body → HTTP status; `type 'about:blank'` | `test/unit/shared/api/api-error.spec.ts:102` `toMatchObject({ status: 0, type: 'about:blank' })`, `:82-86` HTML `500` → `status: 500, type: 'about:blank'`, `:94` JSON without `type` → `status: 502, type: 'about:blank'` | ✅ |
| FND-19 | One Query client for the app; no query retry on `4xx` | `test/unit/shared/api/query-client.spec.ts:38-48` `400/401/404/409/499` → `toHaveBeenCalledTimes(1)`, `:51-61` `0/500/503` → `toHaveBeenCalledTimes(4)`; single instance `src/app/app-services.ts:43` provided at `src/app/app.tsx:16` | ✅ |
| FND-20 | Tailwind v4 with the Púrpura color, typography, spacing, effect tokens, light + dark | `src/styles/tokens/{colors,spacing,effects}.css` byte-identical to `design/_ds/…/tokens/` (`diff -q`); `typography.css` differs only in the self-hosted variable font family names (`"Onest Variable"` etc.). Verifier run: built CSS contains `--brand` and `[data-theme=dark]`, `0` `googleapis` references | ✅ |
| FND-21 | `light` / `dark` applied regardless of device | `test/unit/shared/theme/theme-controller.spec.tsx:75` `toBe('light')` on a dark device, `:83` `toBe('dark')` on a light device; e2e `test/e2e/foundation.e2e-spec.ts:43` `toHaveAttribute('data-theme', 'dark')` | ✅ |
| FND-22 | `system` follows `prefers-color-scheme` and switches live | `test/unit/shared/theme/theme-controller.spec.tsx:91` `toBe('dark')`, `:97-101` `light` → `dark` after `device.setDark(true)` without remount, `:111-112` stops listening after leaving `system` | ✅ |
| FND-23 | Change via preferences API → applied immediately and stored | Stored: `test/unit/shared/preferences/preferences-store.spec.ts:90` `localStorage.getItem('my-trello.theme')` `toBe('light')`, `:102` language `toBe('pt-BR')`. Applied: `test/unit/shared/theme/theme-controller.spec.tsx:120-122`, `test/unit/shared/i18n/language-controller.spec.tsx:66-71`. Reload: `test/unit/app/app.spec.tsx:116-122` stored prefs applied on first render | ✅ |
| FND-24 | No stored language → `en`, whatever `navigator.language` | `test/unit/shared/preferences/preferences-store.spec.ts:51-55` `navigator.language` `pt-BR` → `toBe('en')` | ✅ |
| FND-25 | No stored theme → `system` | `test/unit/shared/preferences/preferences-store.spec.ts:47` `toEqual({ theme: 'system', language: 'en' })` | ✅ |
| FND-26 | `<html lang>` = active language | `test/unit/shared/i18n/language-controller.spec.tsx:59` `toBe('en')`, `:68` `toBe('pt-BR')`; e2e `test/e2e/foundation.e2e-spec.ts:44` `toHaveAttribute('lang', 'pt-BR')` | ✅ |
| FND-27 | Invalid stored theme/language ignored → defaults | `test/unit/shared/preferences/preferences-store.spec.ts:67-80` `blue`/`PT-BR`, `''`/`pt` → `toEqual({ theme: 'system', language: 'en' })`; `:17-35` parser cases | ✅ |
| FND-28 | Every UI text through i18n keys with PT-BR + EN; a missing key fails a unit test | `test/unit/shared/i18n/locales.spec.ts:26-28` key sets `toEqual`, `:35-39` no empty value; `src/shared/i18n/locales/pt-BR.ts` `satisfies Translation`; pages render only `t(...)` (`src/pages/*.tsx`) | ✅ |
| FND-29 | Toast at bottom center in a `role="status"` live region | `test/unit/shared/ui/toast/toast-provider.spec.tsx:20,39` text found inside `screen.getByRole('status')` (`<output aria-live="polite">`); position `src/shared/ui/toast/toast-provider.tsx:61` `fixed inset-x-0 bottom-6 … items-center` (layout not observable in jsdom) | ✅ |
| FND-30 | No action → hidden after 3 s | `test/unit/shared/ui/toast/toast-provider.spec.tsx:38-41` present at 2999 ms, `queryByText` `toBeNull()` at 3000 ms | ✅ |
| FND-31 | Action → hidden after 7 s; click runs callback and hides | `test/unit/shared/ui/toast/toast-provider.spec.tsx:52-55` present at 6999 ms, gone at 7000 ms; `:70-71` `onClick` `toHaveBeenCalledTimes(1)`, toast `toBeNull()` | ✅ |
| FND-32 | `lint`, `typecheck`, `test`, `build`, `test:e2e` scripts, non-zero on failure | `package.json:9,12-15`; every script ran with exit 0 in the gate; non-zero on failure checked by T1 Done-when and by sensor M25 (`tsc` exit 2) | ✅ |
| FND-33 | CI runs the five scripts as separate jobs, `fail-fast: false`, on PRs | `.github/workflows/ci.yml:5` `pull_request`, `:117-137` matrix `[lint, typecheck, test, build]` with `fail-fast: false` (`:121`), `:139-159` `front-end (test:e2e)`. `gh run view 39846642625`: all five front-end jobs `success`; `protect-main` requires all five names (`gh api …/rulesets/25562623`) | ✅ |
| FND-34 | `test:e2e` starts API + PostgreSQL, runs Playwright on the built app, smoke `/boards` → `/login` | `playwright.config.ts:16-21` `docker compose up --wait postgres api`, `:24` `vite build && vite preview`; smoke `test/e2e/foundation.e2e-spec.ts:6-12`. Verifier run: `pnpm --filter front-end test:e2e` → 5 passed | ✅ |
| FND-35 | Contract type change breaks front-end `typecheck` | Type-level wiring `src/shared/api/client.ts:4,20` `createClient<paths>`; sensor M25 (contract types removed → `tsc` exit 2); `front-end (typecheck)` is a required check; T19 Done-when records a red throwaway run | ✅ |
| FND-36 | Parallel 401s → one navigation, one `redirect` | `test/unit/shared/session/session-expiry.spec.ts:51-52` `clearCache` / `navigate` `toHaveBeenCalledOnce()`; `test/unit/app/app.spec.tsx:88-91` history keys `toBe(2)` and single-redirect URL | ✅ |
| FND-37 | `localStorage` throws → token and preferences in memory, app still renders | `test/unit/shared/storage/safe-storage.spec.ts:63-96` getter / `setItem` / `removeItem` throwing → values round-trip in memory, `:109` backend probed once, `:132` `not.toThrow()` after a post-probe failure; app uses it at `src/main.tsx:17` | ✅ (see observation 2) |
| FND-38 | 401 on `/login` → no second `redirect` pointing to `/login` | `test/unit/shared/session/session-expiry.spec.ts:76-78` `'/login?redirect=%2Fboards&reason=session-expired'`, `:86` `'/login?reason=session-expired'`, `:97-99` same on `/signup`, `:110-112` stale params dropped | ✅ |

**Status**: ✅ All ACs covered. 38/38 met; spec-precision gaps: 0.

---

## Discrimination Sensor

Run in a temporary `git worktree` (`<scratchpad>/wt`, detached `aee1d82`). No `pnpm` command ran in the worktree: the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked in, and Vitest ran directly (`node ./node_modules/vitest/vitest.mjs run`, full unit suite). Unmutated sanity run: 152/152 passed. Each mutation was applied alone and reverted with `git checkout -- <file>` before the next.

| # | File:line | Description | Failing tests | Killed? |
| - | --------- | ----------- | ------------- | ------- |
| M1 | `src/app/guards.ts:7` | `requireSession`: `!== null` → `=== null` | 23 | ✅ Killed |
| M2 | `src/app/guards.ts:11` | Redirect drops the query (`pathname` only) | 1 (`routes.spec` `/b/x?q=1`) | ✅ Killed |
| M3 | `src/app/guards.ts:16` | `redirectIfSession` never redirects | 2 | ✅ Killed |
| M4 | `src/shared/session/session-expiry.ts:20-22` | Once-only guard removed (parallel 401s) | 3 (incl. `app.spec` one navigation) | ✅ Killed |
| M5 | `src/shared/session/session-expiry.ts:25` | `clearCache()` removed | 4 | ✅ Killed |
| M6 | `src/shared/session/session-expiry.ts:24` | `session.clear()` removed | 5 | ✅ Killed |
| M7 | `src/shared/session/session-expiry.ts:37` | `/login` uses its own path as `redirect` (FND-38) | 4 | ✅ Killed |
| M8 | `src/shared/session/session-expiry.ts:44` | `reason=session-expired` dropped | 7 | ✅ Killed |
| M9 | `src/shared/api/client.ts:44` | 401 on login/register also expires the session | 3 | ✅ Killed |
| M10 | `src/shared/api/client.ts:43` | 401 without a token also expires the session | 1 | ✅ Killed |
| M11 | `src/shared/api/client.ts:35` | `Authorization` always sent | 2 | ✅ Killed |
| M12 | `src/shared/api/client.ts:42` | `=== 401` → `>= 401` | 3 | ✅ Killed |
| M13 | `src/shared/navigation/safe-redirect.ts:8` | `/\host` accepted | 1 | ✅ Killed |
| M14 | `src/shared/navigation/safe-redirect.ts:7` | `//host` accepted | 1 | ✅ Killed |
| M15 | `src/shared/api/query-client.ts:21` | `< 500` → `<= 500` (500 not retried) | 1 | ✅ Killed |
| M16 | `src/shared/api/api-error.ts:42` | Network error `status: 0` → `500` | 1 | ✅ Killed |
| M17 | `src/shared/ui/toast/use-toast.ts:3` | `TOAST_MS` 3000 → 3500 | 2 | ✅ Killed |
| M18 | `src/shared/ui/toast/toast-provider.tsx:75` | Action click does not hide the toast | 1 | ✅ Killed |
| M19 | `src/shared/preferences/preferences-store.ts:23` | Theme default `system` → `light` | 9 | ✅ Killed |
| M20 | `src/shared/storage/safe-storage.ts:33` | No memory fallback after a post-probe throw | 1 | ✅ Killed |
| M21 | `src/pages/login-placeholder-page.tsx:9` | Notice shown for any reason / no reason | 1 | ✅ Killed |
| M22 | `src/shared/theme/theme-controller.tsx:39` | `change` listener not registered | 1 | ✅ Killed |
| M23 | `src/shared/config.ts:8` | Trailing slash kept | 3 | ✅ Killed |
| M24 | `src/shared/i18n/language-controller.tsx:20` | `<html lang>` not set | 4 | ✅ Killed |
| M25 | `src/shared/api/client.ts:4,20` | `createClient<paths>` → `createClient<Record<string, any>>` (contract types gone); checked with `tsc --noEmit` | `tsc` exit 2 (`TS2554` in `client.spec.ts`, `app.spec.tsx`) | ✅ Killed |
| (E1) | `src/shared/api/client.ts:20` | Same change on line 20 only | `tsc` exit 0 | Equivalent: the exported `ApiClient` type (`:4`) still carries `paths`, so callers stay typed. Not counted. |

**Sensor depth**: P0-full (auth guard, session store/expiry, safe redirect and auth middleware are auth-critical; 12 of 25 mutations target them)
**Result**: 25/25 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Small single-purpose modules (`safe-redirect.ts` 13 lines, `guards.ts` 17, `session-expiry.ts` 46); no speculative options |
| Surgical changes | ✅ Outside `front-end/` the diff touches only `pnpm-workspace.yaml` (+1), the `web` compose service, `.dockerignore` and the two new CI jobs |
| No scope creep | ✅ Placeholder pages only; no screen logic. `safeRedirect` is not consumed yet; FND-10 asks only that it be exposed, and feature `auth` uses it |
| Matches patterns | ✅ Stores share the `subscribe` + `useSyncExternalStore` shape (`session-store.ts`, `preferences-store.ts`); FE-AD-006 layer rule enforced by `.oxlintrc.json`; tests live under `test/` (FE-AD-007) |
| Spec-anchored outcome check (asserted values match spec) | ✅ Exact URLs, header values, timings (2999/3000, 6999/7000 ms) and notice strings asserted |
| Per-layer Coverage Expectation met (shared logic 1:1; components happy + error; e2e guard, unknown route, prefs, CORS) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Extra cases map to Done-when items (e.g. `config.spec.ts:25` multiple slashes, `safe-storage.spec.ts:113` post-probe failure → FND-37) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-005..007), root `.specs/STATE.md` (GL-AD-001, -003, -004, -005) | ✅ |

---

## Edge Cases

- [x] FND-36 parallel 401s → one navigation: `session-expiry.spec.ts:42-53`, `app.spec.tsx:74-92`
- [x] FND-37 storage throws → memory fallback: `safe-storage.spec.ts:62-135`
- [x] FND-38 401 on `/login` → no `redirect` to `/login`: `session-expiry.spec.ts:68-113`
- [x] Redirect `//evil.com`, `https://evil.com`, empty → `/boards`: `safe-redirect.spec.ts:10-20`

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root)
- **Result**: exit 0. Lint clean (oxlint + Prettier), `tsc --noEmit` clean, 15 test files / 152 tests passed, 0 failed, 0 skipped; `vite build` OK
- **Full gate**: `pnpm --filter front-end test:e2e` run locally (Docker 29.9.0): 5 passed, 0 failed. Secondary evidence: CI run `39846642625` on `main` (`aee1d82`) green, all five front-end jobs `success`
- **Test count before feature**: 0 (no front-end package)
- **Test count after feature**: 152 unit/component + 5 e2e
- **Delta**: +157
- **Skipped tests**: none
- **Failures**: none

Compose services started by the Verifier (`postgres`, `api`, `web`) were stopped with `docker compose down` (volumes kept).

---

## Observations (non-blocking)

1. FND-29 "bottom center" is asserted only by code inspection (`toast-provider.tsx:61`); jsdom has no layout. The live-region half is test-asserted.
2. FND-37 "still render" has no app-level test with a throwing `localStorage`. The contract it relies on (the storage wrapper never throws) is tested and killed by M20, and the composition root uses that wrapper, so the gap is indirect coverage, not missing behavior.
3. FND-01/02/03 have no automated test (Coverage Matrix: none). They were verified by the Verifier's own commands above.

---

## Fix Plans

None.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FND-01..FND-38 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 38/38 ACs matched the spec outcome, 0 spec-precision gaps
**Sensor**: 25/25 mutations killed (1 equivalent mutant excluded)
**Gate**: 152 unit/component passed; 5 e2e passed

**What works**: SPA served by nginx in compose with SPA fallback and CSP; dev server on 5173; typed `openapi-fetch` client with bearer middleware; once-only session expiry with safe `redirect`; route table with guards; theme/language stores with storage fallback; i18n parity test; toasts with exact timers; five required CI checks.

**Issues found**: none blocking.

**Next steps**: close the feature; feature `auth` consumes `safeRedirect` and the login placeholder.
