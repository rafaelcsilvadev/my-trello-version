# Auth Validation

**Date**: 2026-10-24
**Spec**: `front-end/.specs/features/auth/spec.md`
**Diff range**: `c875901^..4c77a80` scoped to `front-end/`, plus `README.md` / `README.PT.md` and `pnpm-lock.yaml` (65 commits in range, 44 touching `front-end/`; 58 files, +4416/-43). No CI or compose file changed.
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1

## Validation: Auth - PASS ✅

**Result**: PASS ✅ - 27/27 requirements met with spec-anchored evidence, 0 spec-precision gaps. Build gate green (305 unit/component tests, +153 over the feature), e2e green in CI run `40101119583` on `4c77a80` (6 Playwright tests, incl. `auth.e2e-spec.ts`). Sensor 33/33 killed (plus 2 equivalent mutants, not counted).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T20 | ✅ Done | Every "Done when" box in `tasks.md` is ticked (`grep -c -- '- \[ \]' tasks.md` → `0`). T19's local full gate was not re-run by the Verifier (no containers started); the `front-end (test:e2e)` CI job on `main` is the evidence. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/`. Test paths under `test/unit/features/auth/` are shortened to `auth/…`. "Verifier run" means a command the Verifier ran on 2026-10-24 against `4c77a80`.

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FAUTH-01 | `/signup`: Nome, E-mail, Senha, hint "Use de 8 a 72 caracteres" below Senha, "Criar conta" button, "Já tenho conta" link to `/login` | `auth/components/sign-up-form.spec.tsx:98-100` fields by PT label, `:141` Senha `aria-describedby` set, `:142` `getByText('Use de 8 a 72 caracteres')`, `:143` `textContent` `toBe('Criar conta')`; `test/unit/pages/signup-page.spec.tsx:101` `getAttribute('href')` `toBe('/login')`, `:114-117` PT link `'Já tenho conta'` | ✅ |
| FAUTH-02 | Trimmed name empty → "Informe seu nome" on Nome, no request | `auth/components/sign-up-form.spec.tsx:148` (`'   '`) → `:181` `fieldError(input())` `toBe('Informe seu nome')`, `:184` `bodies` `toHaveLength(0)`; model `auth/model/validation.spec.ts:29` `''`/`'   '` → `toEqual({ name: 'nameRequired' })` | ✅ |
| FAUTH-03 | Trimmed name > 100 → "Use até 100 caracteres", no request | `sign-up-form.spec.tsx:149-154` (101 chars) → `:181`, `:184`; boundaries `validation.spec.ts:34-35` 100 (also padded) → `toEqual({})`, `:41` 101 after trim → `nameTooLong` | ✅ |
| FAUTH-04 | Trimmed e-mail invalid → "Informe um e-mail válido", no request | `sign-up-form.spec.tsx:155-160` (`ana@x`) → `:181`, `:184`; `validation.spec.ts:55-58` `''`, `ana`, `ana@`, `ana@x`, `ana@x.c`, `a b@x.com` → `emailInvalid`, `:50` padded valid address accepted | ✅ |
| FAUTH-05 | Password < 8 or > 72 → "Use de 8 a 72 caracteres", no request | `sign-up-form.spec.tsx:161-172` (7 and 73 chars) → `:181`, `:184`; `validation.spec.ts:65-69` 7/73/padded-72 → `passwordLength`, `:76-78` 8/72/8 spaces → `toEqual({})` | ✅ |
| FAUTH-06 | `POST /api/v1/auth/register` with trimmed name, trimmed e-mail, raw password | `sign-up-form.spec.tsx:217-219` `bodies` `toEqual([{ name: 'Ana', email: 'ana@example.com', password: ' secret 123 ' }])`; hook `auth/api/mutations.spec.tsx:90` body `toEqual(signUpValues)` on `registerUrl` | ✅ (see observation 1) |
| FAUTH-07 | In flight: "Criando…" and disabled | `sign-up-form.spec.tsx:232` `textContent` `toBe('Criando…')`, `:233` `hasAttribute('disabled')` `toBe(true)` (deferred MSW) | ✅ |
| FAUTH-08 | `201` → token stored, `/boards`, toast "Conta criada" | `test/unit/pages/signup-page.spec.tsx:72` `currentUrl(router)` `toBe('/boards')`, `:73` `findByText('Account created')` (EN; PT `auth.accountCreated: 'Conta criada'` with locale-parity test), `:74` `session.getToken()` `toBe('new-token')`, `:84` `?redirect=%2Fsettings` still `/boards`; e2e `test/e2e/auth.e2e-spec.ts:24-25` | ✅ |
| FAUTH-09 | `409` `/problems/email-already-registered` → "Este e-mail já está cadastrado" on E-mail, no token | `sign-up-form.spec.tsx:275` `fieldError(emailInput())` `toBe('Este e-mail já está cadastrado')`, `:277` `aria-invalid` `'true'`, `:281` `getToken()` `toBeNull()`; model `auth/model/errors.spec.ts:36` `toEqual({ email: 'emailTaken' })`, `:42` other 409 type → `toBeNull()` | ✅ |
| FAUTH-10 | `400 errors[]` → per-field message; name: required when trimmed empty, else too long; unknown fields ignored | `sign-up-form.spec.tsx:299-302` name/email/password messages exact; `errors.spec.ts:53` blank name → `nameRequired`, `:58-60` filled → `nameTooLong`, `:66` email/password, `:72` unknown field ignored, `:78` only unknown → `null` | ✅ |
| FAUTH-11 | `/login`: E-mail, Senha, "Entrar", "Criar conta" link to `/signup` | `auth/components/log-in-form.spec.tsx:92-93` PT labels, `:116` `textContent` `toBe('Entrar')`; `test/unit/pages/login-page.spec.tsx:126` `href` `toBe('/signup')`, `:137-140` PT link `'Criar conta'` | ✅ |
| FAUTH-12 | `POST /api/v1/auth/login` with trimmed e-mail + raw password, no client validation | `log-in-form.spec.tsx:127-129` `toEqual([{ email: 'ana@example.com', password: ' secret 123 ' }])`, `:138` empty form still sends `[{ email: '', password: '' }]`; hook `mutations.spec.tsx:131` on `loginUrl` | ✅ (see observation 1) |
| FAUTH-13 | In flight: "Entrando…" and disabled | `log-in-form.spec.tsx:151` `toBe('Entrando…')`, `:152` `disabled` `toBe(true)` | ✅ |
| FAUTH-14 | `200` → token stored, navigate to `safeRedirect(redirect)` (`/boards` when absent/unsafe) | `log-in-form.spec.tsx:181` `getToken()` `toBe('new-token')`; `login-page.spec.tsx:67` `toBe('/settings')`, `:77` no redirect → `'/boards'`, `:80-89` `//evil.com`, `https://evil.com` → `'/boards'`, `:100` `historyAction` `toBe('REPLACE')`; e2e `auth.e2e-spec.ts:37,42` `/login?redirect=%2Fsettings` → `/settings` | ✅ |
| FAUTH-15 | `401`/`400` → alert "E-mail ou senha inválidos", values kept, stay on `/login`, no token | `log-in-form.spec.tsx:185-199` (`401`, `400`) `alert.textContent` `toBe('E-mail ou senha inválidos')`, values `toBe(...)`, `onSuccess` `not.toHaveBeenCalled()`, `getToken()` `toBeNull()`; route kept `test/unit/app/app.spec.tsx:111-112` URL `toBe('/login')` on login `401` | ✅ |
| FAUTH-16 | `reason=session-expired` → status box "Sua sessão expirou. Entre novamente." | `log-in-form.spec.tsx:266-268` `getByRole('status').textContent` exact PT, `:274` absent by default, `:284-286` EN; `login-page.spec.tsx:107-110` from the URL inside `[role="status"]`, `:117-119` absent without reason | ✅ |
| FAUTH-17 | `429` → "Muitas tentativas. Aguarde um minuto e tente novamente.", values kept, button enabled | Log in `log-in-form.spec.tsx:209-215` exact text, `disabled` `false`, both values kept; sign up `sign-up-form.spec.tsx:314-319` exact text, `disabled` `false`, name kept; model `errors.spec.ts:94` both forms → `rateLimited` | ✅ (see observation 2) |
| FAUTH-18 | Network or `5xx` → "Não foi possível falar com o servidor. Verifique sua conexão.", values kept, button re-enabled | Log in `log-in-form.spec.tsx:219-238` (network error, `500`) exact text, `disabled` `false`, values kept; sign up `sign-up-form.spec.tsx:323-343` (network, `500`, other `409`, bare `400`) exact text, `disabled` `false`; model `errors.spec.ts:98-100` `0/500/503` → `network` | ✅ (see observation 2) |
| FAUTH-19 | Resubmit hides previous alert and field errors before the new result | `log-in-form.spec.tsx:256-257` alert `toBeNull()` while second request pending; `sign-up-form.spec.tsx:363` previous e-mail error gone (`aria-invalid` `false`), `:367` alert `toBeNull()` while pending | ✅ |
| FAUTH-20 | `/settings` "Sessão" section with "Conectado como {name} · {email}" from `GET /api/v1/me` + "Sair" | `auth/components/session-section.spec.tsx:43` `findByText('Conectado como Demo · demo@example.com')`, `:45` heading `'Sessão'`; `test/unit/pages/settings-page.spec.tsx:40-47`; query `auth/api/queries.spec.tsx:53-54`; e2e `auth.e2e-spec.ts:43-45` EN text | ✅ |
| FAUTH-21 | `/me` loading or failed → "Sair" enabled | `session-section.spec.tsx:58` pending → `hasAttribute('disabled')` `toBe(false)`, `:82-85` after 4 failed `500` attempts `status` `toBe('error')`, `disabled` `false` | ✅ |
| FAUTH-22 | "Sair" → token removed, query cache cleared, `/login` with no query string | `auth/api/sign-out.spec.tsx:64` pathname `'/login'`, `:65` `search` `toBe('')`, `:66` token `toBeNull()`, `:67` cache `toHaveLength(0)`, `:80` no extra `/me` (`toBe(1)`); `settings-page.spec.tsx:55-61` then `/boards` → `'/login?redirect=%2Fboards'`; e2e `auth.e2e-spec.ts:31-34` | ✅ |
| FAUTH-23 | Protected pages: top bar, logo → `/boards`, Settings icon → `/settings` except on `/settings` | `test/unit/pages/protected-layout.spec.tsx:24-29` banner links `href` `'/boards'` / `'/settings'` (PT `'Configurações'`), `:36-37` on `/b/x`, `:40-48` `/settings` and `/settings/` → Settings link `toBeNull()`, `:51-55` no banner on `/login`, `/signup`; e2e `auth.e2e-spec.ts:27-28` | ✅ |
| FAUTH-24 | Enter again while in flight → no second request | `log-in-form.spec.tsx:157-172` and `sign-up-form.spec.tsx:238-253` second `submit` while pending → `bodies` `toHaveLength(1)` | ✅ |
| FAUTH-25 | Sign-up validation fails → focus first invalid field | `sign-up-form.spec.tsx:183` `document.activeElement` `toBe(input())` per case, `:200` e-mail focused when e-mail and password invalid; order `validation.spec.ts:98-113` | ✅ |
| FAUTH-26 | Field error via `aria-describedby`, `aria-invalid="true"`, alerts `role="alert"`, session box `role="status"` | `test/unit/shared/ui/text-field.spec.tsx:66` `aria-invalid` `'true'`, `:70-73` error and hint in `aria-describedby`, `:80` no `aria-invalid` without error; `sign-up-form.spec.tsx:105-110,181-182` error read through `aria-describedby`; `log-in-form.spec.tsx:193` `findByRole('alert')`, `:266` `getByRole('status')`; `test/unit/shared/ui/alert.spec.tsx:19,33` | ✅ |
| FAUTH-27 | `autocomplete` `name`/`email`/`new-password` (sign up), `email`/`current-password` (log in) | `sign-up-form.spec.tsx:136,138,140` exact values; `log-in-form.spec.tsx:113,115` exact values | ✅ |

**Status**: ✅ All ACs covered. 27/27 met; spec-precision gaps: 0.

---

## Discrimination Sensor

Run in a temporary `git worktree` (`<scratchpad>/wt`, detached `4c77a80`). No `pnpm` command ran in the worktree: the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked in, and Vitest ran directly (`node ./node_modules/vitest/vitest.mjs run`, full unit suite per mutant). Unmutated sanity run: 305/305 passed. Each mutation was applied alone by a script and reverted with `git checkout -- <file>` before the next.

| # | File:line | Description | Failing tests | Killed? |
| - | --------- | ----------- | ------------- | ------- |
| M1 | `src/features/auth/model/validation.ts:15` | Name limit `> 100` → `>= 100` | 2 | ✅ Killed |
| M2 | `src/features/auth/model/validation.ts:22` | Password `< 8` → `<= 8` | 2 | ✅ Killed |
| M3 | `src/features/auth/model/validation.ts:22` | Password `> 72` → `>= 72` | 1 | ✅ Killed |
| M4 | `src/features/auth/model/validation.ts:18` | E-mail validated untrimmed | 1 | ✅ Killed |
| M5 | `src/features/auth/model/validation.ts:6` | `EMAIL_RE` TLD `{2,}` → `+` | 1 | ✅ Killed |
| M6 | `src/features/auth/model/validation.ts:13` | Blank (spaces-only) name accepted | 2 | ✅ Killed |
| M7 | `src/features/auth/model/errors.ts:51` | `429` no longer → `rateLimited` | 4 | ✅ Killed |
| M8 | `src/features/auth/model/errors.ts:54` | Log-in `400` no longer → `invalidCredentials` | 2 | ✅ Killed |
| M9 | `src/features/auth/model/errors.ts:54` | `form === 'logIn'` dropped (sign-up 400/401 → invalid credentials) | 3 | ✅ Killed |
| M10 | `src/features/auth/model/errors.ts:19` | Server name messages swapped | 4 | ✅ Killed |
| M11 | `src/features/auth/model/errors.ts:30` | Any `409` → `emailTaken` | 2 | ✅ Killed |
| M12 | `src/features/auth/model/errors.ts:39` | Unknown server fields not ignored | 2 | ✅ Killed |
| M13 | `src/features/auth/api/mutations.ts:15` | Sign-up token not stored | 5 | ✅ Killed |
| M14 | `src/features/auth/api/mutations.ts:25` | Log-in token stored on error too (`onSettled`) | 5 | ✅ Killed |
| M15 | `src/features/auth/api/sign-out.ts:14` | Sign out keeps the token | 4 | ✅ Killed |
| M16 | `src/features/auth/api/sign-out.ts:16` | Sign out keeps the query cache | 1 | ✅ Killed |
| M17 | `src/features/auth/api/sign-out.ts:15` | Sign out navigates with a query string | 1 | ✅ Killed |
| M18 | `src/pages/login-page.tsx:14` | `safeRedirect` bypassed (open redirect) | 2 | ✅ Killed |
| M19 | `src/pages/login-page.tsx:15` | `replace: true` → `false` | 1 | ✅ Killed |
| M20 | `src/pages/login-page.tsx:11` | Session-expired condition inverted | 8 | ✅ Killed |
| M21 | `src/features/auth/components/log-in-form.tsx:34-36` | Log-in double-submit guard removed | 1 | ✅ Killed |
| M22 | `src/features/auth/components/log-in-form.tsx:37` | Previous alert not cleared on resubmit | 1 | ✅ Killed |
| M23 | `src/features/auth/components/log-in-form.tsx:42` | Password cleared on error | 5 | ✅ Killed |
| M24 | `src/features/auth/components/sign-up-form.tsx:50` | Invalid sign-up still sends the request | 6 | ✅ Killed |
| M25 | `src/features/auth/components/sign-up-form.tsx:49` | No focus on first invalid field | 6 | ✅ Killed |
| M26 | `src/features/auth/components/sign-up-form.tsx:53` | Password trimmed before sending | 1 | ✅ Killed |
| M27 | `src/features/auth/components/sign-up-form.tsx:39-41` | Sign-up double-submit guard removed | 1 | ✅ Killed |
| M28 | `src/features/auth/components/sign-up-form.tsx:45` | Previous field errors merged instead of replaced | 1 | ✅ Killed |
| M29 | `src/features/auth/components/sign-up-form.tsx:61` | E-mail and password cleared on a form-level error | 1 | ✅ Killed |
| M30 | `src/features/auth/components/session-section.tsx:29` | "Sair" disabled while `/me` loading/failed | 2 | ✅ Killed |
| M31 | `src/pages/protected-layout.tsx:22` | Settings icon shown on `/settings` | 2 | ✅ Killed |
| M32 | `src/pages/signup-page.tsx:15` | "Conta criada" toast removed | 1 | ✅ Killed |
| M33 | `src/shared/ui/text-field.tsx:41` | `error` no longer sets `aria-invalid` | 11 | ✅ Killed |
| (E1) | `src/features/auth/components/log-in-form.tsx:39` | `email.trim()` → `email` | 0 | Equivalent: `<input type="email">` value sanitization strips leading/trailing whitespace before `onChange` (probe in the worktree: typed `'  a@b.com '` → `onChange('a@b.com')`). Real browsers apply the same HTML rule. Not counted. |
| (E2) | `src/features/auth/api/sign-out.ts:14-16` | `queryClient.clear()` moved before `navigate('/login')` | 0 | Equivalent: a probe on the real `/settings` page (`renderApp`, protected layout) counted 1 `GET /api/v1/me` both with and without the reorder. The order comment in `sign-out.ts:11-12` is not backed by an observable difference with the installed TanStack Query. Not counted. |

**Sensor depth**: P0-full (auth path; 33 manual mutations across validation boundaries, every error-mapping branch incl. `429`, token-on-success-only, sign-out side effects, safe redirect, double submit, focus, ARIA wiring and the settings session section)
**Result**: 33/33 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Small modules (`validation.ts` 32 lines, `errors.ts` 58, `sign-out.ts` 18); no form library, no view-model (FE-AD-006 allows one only for complex screens) |
| Surgical changes | ✅ Outside `front-end/` only `README.md`, `README.PT.md` and `pnpm-lock.yaml`; foundation tests changed only where the placeholder headings became the real titles (`routes.spec.tsx`, `app.spec.tsx`) plus one new T2 test |
| No scope creep | ✅ `/settings` holds only the Session section; top bar has only logo + Settings icon, as the spec's Out of Scope requires |
| Matches patterns | ✅ `SessionProvider` mirrors `api-context.tsx`; `shared/ui` primitives wrap React Aria Components; decorative icons `aria-hidden` (FE-AD-008); tests under `test/unit/` mirror `src/` (FE-AD-007). Minor: `ALERT_KEYS` and the alert markup are duplicated in `log-in-form.tsx:13-17` and `sign-up-form.tsx:14-18` (non-blocking) |
| Spec-anchored outcome check (asserted values match spec) | ✅ Exact PT/EN strings, request bodies, URLs (`/login` + empty search, `/login?redirect=%2Fboards`), token values and `historyAction` asserted |
| Per-layer Coverage Expectation met (model 1:1 incl. 0/1/100/101 and 7/8/72/73 boundaries; hooks; components happy + every error branch + FAUTH-24..27; pages; one e2e journey) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Extras map to Done-when items or edge cases (e.g. `errors.spec.ts:111` unexpected log-in `404` → `network`, `protected-layout.spec.tsx:40` trailing slash, `text-field.spec.tsx:148` native validity kept clean for T4) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-002, -004..-008), root `.specs/STATE.md` (GL-AD) | ✅ Lint (oxlint `no-restricted-imports` layer rule) and Prettier clean |

---

## Edge Cases

- [x] FAUTH-24 no double submit: `log-in-form.spec.tsx:157-172`, `sign-up-form.spec.tsx:238-253` (sensor M21, M27)
- [x] FAUTH-25 focus first invalid field: `sign-up-form.spec.tsx:183,200` (M25)
- [x] FAUTH-26 ARIA wiring: `text-field.spec.tsx:54-82`, `alert.spec.tsx:12-38` (M33)
- [x] FAUTH-27 `autocomplete`: `sign-up-form.spec.tsx:136-140`, `log-in-form.spec.tsx:113-115`
- [x] `redirect=//evil.com` / `https://evil.com` → `/boards`: `login-page.spec.tsx:80-91` (M18)
- [x] Stored token on `/login` or `/signup` → `/boards` (FND-07): `test/unit/app/routes.spec.tsx:36-41`, still green
- [x] Log-in `401` is not session expiry (FND-15): `mutations.spec.tsx:161-171` `onSessionExpired` `not.toHaveBeenCalled()`, token kept; `app.spec.tsx:97-114`

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root)
- **Result**: exit 0. oxlint `--deny-warnings` + Prettier clean, `tsc --noEmit` clean, 33 test files / 305 tests passed, 0 failed, 0 skipped; `vite build` OK (JS 477.18 kB, gzip 150.45 kB)
- **Full gate**: not run locally (Verifier started no containers). CI run `40101119583` on `main` at `4c77a80`: all 12 jobs `success`; `front-end (test:e2e)` (job `120893293108`) step `pnpm --filter front-end run test:e2e` → `6 passed (1.1m)` (5 foundation + 1 auth). Static check: `test/e2e/auth.e2e-spec.ts` triggers exactly 2 `/api/v1/auth/*` requests (register at `:22`, login at `:40`) and asserts `authCalls.length` `toBeLessThanOrEqual(3)` at `:46`
- **Test count before feature**: 152 (Vitest run at `c875901^` in the scratch worktree: 15 files / 152 tests) + 5 e2e
- **Test count after feature**: 305 unit/component + 6 e2e
- **Delta**: +153 unit/component, +1 e2e; no test deleted. Foundation assertions changed only from placeholder headings to the real titles (`'Sign in'` → `'Good to see you again'`, `'Create account'` → `'Create your account'`, `'Entrar'` → `'Bom te ver de novo'`); not weakened
- **Skipped tests**: none
- **Failures**: none

---

## Observations (non-blocking)

1. FAUTH-06 / FAUTH-12 "trimmed e-mail": the tests type a padded e-mail, but `<input type="email">` already strips surrounding whitespace, so the component's `.trim()` is never exercised (equivalent mutant E1). Outcome is still correct in jsdom and browsers. The sign-up name trim is exercised (`sign-up-form.spec.tsx:211,218` sends `'  Ana  '`, expects `'Ana'`).
2. FAUTH-17 / FAUTH-18 "keep every field value" on sign up: the `429` test asserts only the name value (`sign-up-form.spec.tsx:319`) and the network/5xx test asserts none. Mutant M29 (e-mail and password cleared on a form-level error) is still killed through the FAUTH-19 resubmit test, so behavior is protected, but the assertion is indirect. Log in asserts both values for every branch.
3. Sign-out order (E2): `sign-out.ts:11-12` says the cache is cleared last so the page's queries do not refetch without a token; no test or probe shows a difference. Harmless, but the comment's rationale is unproven.
4. `tasks.md` T19 says the e2e checks "Connected as"; the test and `en.ts` use "Signed in as", which matches `design/i18n.js:95` (`signedInAs`). Wording slip in `tasks.md` only.
5. FAUTH-08 toast is asserted in EN (`'Account created'`); the PT text `'Conta criada'` is covered only by the locale-parity test. Same for FAUTH-20 EN in e2e vs PT in unit.

---

## Fix Plans

None blocking. Optional hardening (Minor):

### Fix 1 (optional): Assert all sign-up field values on form-level errors

- **Root cause**: Observation 2 - FAUTH-17/18 value retention on sign up is asserted indirectly.
- **Fix task**: In `test/unit/features/auth/components/sign-up-form.spec.tsx`, add `emailInput().value` / `passwordInput().value` assertions to the `429` test (`:307-321`) and the network/5xx table test (`:323-344`). Done when: both tests assert name, e-mail and password values; gate green.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FAUTH-01..FAUTH-27 | In Tasks | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 27/27 ACs matched the spec outcome, 0 spec-precision gaps
**Sensor**: 33/33 mutations killed (2 equivalent mutants excluded)
**Gate**: 305 unit/component passed; 6 e2e passed in CI run `40101119583`

**What works**: Sign-up validation with exact boundaries and focus; server error mapping (409, 400 `errors[]`, 429, network/5xx, log-in 400/401); token stored only on success; safe `redirect` with history replace; session-expired box; no double submit; ARIA wiring; settings Session section with always-enabled Sair; sign out clears token and cache and lands on bare `/login`; top bar with Settings icon hidden on `/settings`; e2e journey within the auth throttle.

**Issues found**: none blocking (see Observations; optional Fix 1).

**Next steps**: close the feature; optionally apply Fix 1 and fix the T19 wording in `tasks.md`.
