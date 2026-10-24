# Auth Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/auth/spec.md`
**Design**: `front-end/.specs/features/auth/design.md`
**Status**: Draft

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components and `lucide-react` API is checked against the installed package's types before use (design Risks). Each task that adds UI text adds its keys to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js`, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/` (FE-AD-007).

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-007, the approved design and the spec; existing tests sampled for style: `test/unit/shared/api/client.spec.ts`, `test/unit/shared/session/session-expiry.spec.ts`, `test/unit/app/routes.spec.tsx`, `test/unit/shared/ui/toast/toast-provider.spec.tsx`, `test/e2e/foundation.e2e-spec.ts`. Guidelines found: `front-end/.specs/STATE.md` (FE-AD-005, FE-AD-006, FE-AD-007) - no coverage threshold; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `features/auth/model/` (validation, error mapping) | unit | All branches; 1:1 to spec ACs; boundaries 0/1/100/101 chars and 7/8/72/73 chars; every status branch | `front-end/test/unit/features/auth/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/auth/api/` hooks | unit (`renderHook` + MSW + `QueryClient` wrapper) | Request body shape, token stored only on success, sign-out order, error surfaces as `ApiError` | `front-end/test/unit/features/auth/api/*.spec.tsx` | `pnpm --filter front-end test` |
| `shared/session`, `shared/ui` primitives | unit (Testing Library, plain props) | Every prop branch; ARIA wiring (`aria-describedby`, `aria-invalid`, roles); disabled state | `front-end/test/unit/shared/**/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/auth/components/` | unit (Testing Library + MSW, delayed handlers for pending state) | Every AC the component owns: happy + every error branch + edge cases FAUTH-24–27 | `front-end/test/unit/features/auth/components/*.spec.tsx` | `pnpm --filter front-end test` |
| `pages/` and route table | unit (`renderApp` + memory router + MSW) | Navigation targets, `redirect`/`reason` handling, toast, layout visibility per route | `front-end/test/unit/pages/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real API) | e2e (Playwright, Chromium) | One journey: sign up → sign out → log in with `redirect`; ≤ 3 auth calls (10/min throttle) | `front-end/test/e2e/auth.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
| Dependencies, docs | none | Build gate | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Inner TDD loop only | `pnpm --filter front-end test` |
| Build | End of every task (lint and types count) | `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` |
| Full | Tasks that touch e2e | build gate `&& pnpm --filter front-end test:e2e` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. One task per branch/PR (pair-programming flow), each PR reviewed before the next task starts.

### Phase 1: Shared building blocks

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Auth model and API

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: Log-in and sign-up screens

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 4: Session and settings

```
T15 → T16 → T17 → T18
```

### Phase 5: Delivery

```
T18 → T19 → T20
```

---

## Task Breakdown

### T1: Add icon and accessible-widget dependencies

**What**: Add `lucide-react` `1.61.0` and `react-aria-components` `1.22.1` as exact-pinned dependencies of `front-end` (FE-AD-008, FE-AD-006); lockfile updated.
**Where**: `front-end/package.json`
**Depends on**: None
**Reuses**: Exact-pin style of `openapi-fetch` / `react-router`
**Requirement**: none (enables FAUTH-23, FAUTH-26)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] `pnpm --filter front-end ls lucide-react react-aria-components` prints `1.61.0` and `1.22.1`
- [x] No new peer-dependency warning for React 19
- [x] Build gate passes; test count unchanged

**Tests**: none
**Gate**: build

**Commit**: `chore(front-end): add lucide-react and react-aria-components`

---

### T2: Session context

**What**: `SessionProvider({ store, children })` and `useSession()` (throws outside the provider); `App` wraps its tree with `SessionProvider` using `services.session`.
**Where**: `front-end/src/shared/session/session-context.tsx`
**Depends on**: T1
**Reuses**: `src/shared/api/api-context.tsx` pattern
**Requirement**: design (enables FAUTH-08, FAUTH-14, FAUTH-22)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit: a child reads the same store passed to the provider; `useSession` outside the provider throws
- [x] `renderApp` test: a component inside the app gets `services.session`
- [x] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): expose the session store through context`

---

### T3: Button primitive

**What**: `Button` on RAC `Button` with `variant` (`primary` | `secondary`), `size` (`md` | `lg`), `fullWidth`; styled from `.p-btn` tokens; `isDisabled` renders native `disabled`.
**Where**: `front-end/src/shared/ui/button.tsx`
**Depends on**: T2
**Reuses**: `design/_ds/.../css/components.css:23-40`
**Requirement**: FAUTH-07, FAUTH-13 (disabled rendering)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: renders children as accessible name; `type="submit"` submits its form; `isDisabled` → `disabled` attribute and no `onPress`; variant/size classes applied
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add Púrpura button primitive`

---

### T4: TextField primitive

**What**: `TextField({ label, value, onChange, type?, autoComplete?, hint?, error?, inputRef? })` on RAC `TextField`/`Label`/`Input`/`Text`/`FieldError` with `validationBehavior="aria"`; `error` sets `isInvalid` and shows the message.
**Where**: `front-end/src/shared/ui/text-field.tsx`
**Depends on**: T3
**Reuses**: `.p-field`, `.p-input`, `.is-invalid`, `.p-hint`, `.p-error` (`components.css:46-59`)
**Requirement**: FAUTH-26, FAUTH-27 (field wiring)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: label names the input; hint and error are referenced by `aria-describedby`; `error` → `aria-invalid="true"` and message visible; no `error` → no `aria-invalid`; `autoComplete` and `type` forwarded; `inputRef` reaches the `<input>`
- [x] Unit: inside a `<form noValidate>`, an invalid `type="email"` value still fires `submit` (no native block)
- [x] Build gate passes; ≥ 7 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add accessible text field primitive`

---

### T5: Alert primitive

**What**: `Alert({ tone: 'danger' | 'info', icon, children })`: `danger` → `role="alert"`, red tokens; `info` → `role="status"`, blue tokens; icon rendered with `aria-hidden`.
**Where**: `front-end/src/shared/ui/alert.tsx`
**Depends on**: T4
**Reuses**: Prototype alert markup (`Task List.dc.html:141-145`)
**Requirement**: FAUTH-26 (roles)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: each tone has its role and text; icon SVG has `aria-hidden="true"`
- [x] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add alert primitive`

---

### T6: Logo

**What**: `Logo()`: purple square with `ListChecks` (`aria-hidden`) + "task list" wordmark.
**Where**: `front-end/src/shared/ui/logo.tsx`
**Depends on**: T5
**Reuses**: Prototype header (`Task List.dc.html:131-134`)
**Requirement**: FAUTH-23 (logo)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: text "task list" visible; icon `aria-hidden="true"`
- [x] Build gate passes; ≥ 1 new test

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add task list logo`

---

### T7: Sign-up validation model

**What**: `model/types.ts` (design Data Models) and `validateSignUp(values)` + `firstInvalidField(errors)` in `model/validation.ts`.
**Where**: `front-end/src/features/auth/model/validation.ts`
**Depends on**: T6
**Reuses**: Prototype `authSubmit` rules and `EMAIL_RE`
**Requirement**: FAUTH-02, FAUTH-03, FAUTH-04, FAUTH-05, FAUTH-25

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: name `""`/`"   "` → `nameRequired`; 1 and 100 chars (after trim) valid; 101 → `nameTooLong`
- [x] Unit: e-mail `ana@example.com` and `  ana@example.com ` valid; `ana`, `ana@`, `ana@x`, `ana@x.c`, `a b@x.com` → `emailInvalid`
- [x] Unit: password 7 and 73 chars → `passwordLength`; 8 and 72 valid; spaces count (not trimmed)
- [x] Unit: all valid → `{}`; `firstInvalidField` order name → email → password, `null` when none
- [x] Build gate passes; ≥ 14 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): validate sign-up fields`

---

### T8: Auth error mapping model

**What**: `mapSignUpServerErrors(err, values)` and `formAlertFor(err, form)` in `model/errors.ts` per design.
**Where**: `front-end/src/features/auth/model/errors.ts`
**Depends on**: T7
**Reuses**: `ApiError`, `isProblemType` (`src/shared/api/api-error.ts`)
**Requirement**: FAUTH-09, FAUTH-10, FAUTH-15, FAUTH-17, FAUTH-18

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: `409` + `/problems/email-already-registered` → `{ email: 'emailTaken' }`
- [x] Unit: `400` `errors[]` with `name` (empty trimmed name → `nameRequired`, else `nameTooLong`), `email` → `emailInvalid`, `password` → `passwordLength`; unknown field ignored; non-400/409 → `null`
- [x] Unit: `formAlertFor`: `429` → `rateLimited` (both forms); `0`, `500`, `503` → `network`; log in `400`/`401` → `invalidCredentials`; sign up `401` → `network`
- [x] Build gate passes; ≥ 12 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): map auth API errors to field and form messages`

---

### T9: Log-in and sign-up mutations

**What**: `api/mutations.ts` with `useSignUp()` and `useLogIn()`: `call(api.POST(...))`, `onSuccess` stores `accessToken` through `useSession()`.
**Where**: `front-end/src/features/auth/api/mutations.ts`
**Depends on**: T8
**Reuses**: `call`, `useApi`, `useSession`
**Requirement**: FAUTH-06, FAUTH-08 (token), FAUTH-12, FAUTH-14 (token)

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): sign up sends `{ name, email, password }` to `/api/v1/auth/register`; log in sends `{ email, password }` to `/api/v1/auth/login`
- [x] Unit: `201`/`200` → token stored; `401`/`409`/`429` → no token and `error` is an `ApiError` with that status
- [x] Unit: a log-in `401` does not trigger session expiry (FND-15 stays true)
- [x] Build gate passes; ≥ 6 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add log-in and sign-up mutations`

---

### T10: Current user query and sign out

**What**: `api/keys.ts` (`authKeys.me`), `api/queries.ts` (`useCurrentUser`) and `useSignOut()` in `api/sign-out.ts` (token → `navigate('/login')` → `queryClient.clear()`).
**Where**: `front-end/src/features/auth/api/queries.ts`
**Depends on**: T9
**Reuses**: `call`, `useSession`, `useQueryClient`, `useNavigate`
**Requirement**: FAUTH-20 (data), FAUTH-22

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit (MSW): `useCurrentUser` returns `name` and `email` from `GET /api/v1/me`
- [x] Unit: sign out → token `null`, location `/login` with empty search, cache empty
- [x] Unit: after sign out, no extra `GET /api/v1/me` request is sent (count handler calls)
- [x] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add current user query and sign out`

---

### T11: Auth card layout

**What**: `AuthCard({ title, subtitle, footer, children })`: `Logo` top-left, centered `max-w-105` column, `h1` title, subtitle, children, footer slot.
**Where**: `front-end/src/features/auth/components/auth-card.tsx`
**Depends on**: T10
**Reuses**: `Logo`, prototype layout (`Task List.dc.html:130-139`)
**Requirement**: FAUTH-01, FAUTH-11 (frame)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [x] Unit: title is a level-1 heading; subtitle, children and footer render
- [x] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add auth card layout`

---

### T12: Log-in form

**What**: `LogInForm({ onSuccess, sessionExpired })`: E-mail + Senha, submit "Entrar"/"Entrando…", alert slot (info session-expired box, danger form alert with `Timer` for 429 and `CircleAlert` otherwise), trimmed e-mail sent, `noValidate`, no double submit.
**Where**: `front-end/src/features/auth/components/log-in-form.tsx`
**Depends on**: T11
**Reuses**: `TextField`, `Button`, `Alert`, `useLogIn`, `formAlertFor`
**Requirement**: FAUTH-11, FAUTH-12, FAUTH-13, FAUTH-15, FAUTH-16, FAUTH-17, FAUTH-18, FAUTH-19, FAUTH-24, FAUTH-26, FAUTH-27

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: fields E-mail/Senha with `autocomplete` `email`/`current-password`; empty submit still sends the request
- [ ] Unit (delayed MSW): while pending, button shows "Entrando…" and is `disabled`; a second Enter sends no second request
- [ ] Unit: `200` → `onSuccess` once; `401` and `400` → "E-mail ou senha inválidos" (`role="alert"`), values kept, `onSuccess` not called
- [ ] Unit: `429` → rate-limit alert, button enabled; network error and `500` → `errors.network` alert, button enabled
- [ ] Unit: resubmit hides the previous alert; `sessionExpired` → `role="status"` box with "Sua sessão expirou. Entre novamente."
- [ ] Unit: PT-BR and EN texts both render (one test per language)
- [ ] Build gate passes; ≥ 12 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add log-in form`

---

### T13: Log-in page and route

**What**: `LoginPage` (AuthCard + LogInForm, footer "Criar conta" link to `/signup`; `onSuccess` → `navigate(safeRedirect(redirect), { replace: true })`) replaces `LoginPlaceholderPage` in `routes.tsx`; placeholder file deleted.
**Where**: `front-end/src/pages/login-page.tsx`
**Depends on**: T12
**Reuses**: `safeRedirect`, `renderApp`
**Requirement**: FAUTH-11 (link), FAUTH-14, FAUTH-16

**Tools**:

- MCP: `codegraph`
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): `/login?redirect=%2Fsettings` + `200` → `/settings`; no `redirect` → `/boards`; `redirect=//evil.com` → `/boards`
- [ ] Unit: `reason=session-expired` shows the status box; "Criar conta" link goes to `/signup`
- [ ] Existing route and session-expiry tests still pass (FND-07, FND-16, FND-38)
- [ ] Build gate passes; ≥ 5 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): replace login placeholder with the log-in page`

---

### T14: Sign-up form

**What**: `SignUpForm({ onSuccess })`: Nome, E-mail, Senha (hint "Use de 8 a 72 caracteres"), submit "Criar conta"/"Criando…"; validates with `validateSignUp`, focuses first invalid field, maps server errors with `mapSignUpServerErrors`, form alert via `formAlertFor`.
**Where**: `front-end/src/features/auth/components/sign-up-form.tsx`
**Depends on**: T13
**Reuses**: `TextField`, `Button`, `Alert`, `useSignUp`, auth model
**Requirement**: FAUTH-01, FAUTH-02, FAUTH-03, FAUTH-04, FAUTH-05, FAUTH-06, FAUTH-07, FAUTH-09, FAUTH-10, FAUTH-17, FAUTH-18, FAUTH-19, FAUTH-24, FAUTH-25, FAUTH-26, FAUTH-27

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit: fields, hint and `autocomplete` `name`/`email`/`new-password`
- [ ] Unit: each invalid field shows its doc message, no request sent (MSW handler call count 0), focus on first invalid field
- [ ] Unit: valid submit sends trimmed name and e-mail, raw password
- [ ] Unit (delayed MSW): "Criando…" + `disabled` while pending; second Enter sends nothing
- [ ] Unit: `201` → `onSuccess`; `409` → "Este e-mail já está cadastrado" on E-mail; `400 errors[]` → field messages; `429` and network → form alerts; resubmit clears previous errors and alert
- [ ] Build gate passes; ≥ 14 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add sign-up form`

---

### T15: Sign-up page and route

**What**: `SignupPage` (AuthCard + SignUpForm, footer "Já tenho conta" link to `/login`; `onSuccess` → `navigate('/boards', { replace: true })` + toast `auth.accountCreated`) wired in `routes.tsx`.
**Where**: `front-end/src/pages/signup-page.tsx`
**Depends on**: T14
**Reuses**: `useToast`, `renderApp`
**Requirement**: FAUTH-01 (link), FAUTH-08

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): `201` → location `/boards`, toast "Conta criada", token stored; `?redirect=%2Fsettings` still lands on `/boards`
- [ ] Unit: "Já tenho conta" link goes to `/login`
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add sign-up page`

---

### T16: Session section

**What**: `SessionSection()`: heading "Sessão", "Conectado como {name} · {email}" when `useCurrentUser` has data, "Sair" button calling `useSignOut()` always enabled.
**Where**: `front-end/src/features/auth/components/session-section.tsx`
**Depends on**: T15
**Reuses**: `Button`, `useCurrentUser`, `useSignOut`
**Requirement**: FAUTH-20, FAUTH-21, FAUTH-22

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (MSW): text "Conectado como Demo · demo@example.com"
- [ ] Unit: while `/me` is pending and after it fails with `500`, "Sair" is enabled and no "Conectado como" text shows
- [ ] Unit: click "Sair" → token removed and location `/login`
- [ ] Build gate passes; ≥ 4 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add session section with sign out`

---

### T17: Protected layout with top bar

**What**: `ProtectedLayout`: `h-14` header with `Logo` in a `Link` to `/boards` and a `Settings` icon `Link` (`aria-label` from `nav.settings`) hidden on `/settings`; `<Outlet />`; set as the `element` of the protected pathless route.
**Where**: `front-end/src/pages/protected-layout.tsx`
**Depends on**: T16
**Reuses**: `Logo`, `requireSession` route
**Requirement**: FAUTH-23

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): on `/boards` the logo link points to `/boards` and the "Configurações" link to `/settings`
- [ ] Unit: on `/settings` the Settings link is absent; on `/login` there is no top bar
- [ ] Build gate passes; ≥ 3 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add top bar to protected pages`

---

### T18: Settings page

**What**: `SettingsPage`: `h1` "Configurações" + `SessionSection`; replaces the `/settings` placeholder in `routes.tsx`.
**Where**: `front-end/src/pages/settings-page.tsx`
**Depends on**: T17
**Reuses**: `SessionSection`
**Requirement**: FAUTH-20, FAUTH-22 (page)

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Unit (`renderApp`): `/settings` with a token shows the heading and the session text; "Sair" → `/login`, then opening `/boards` → `/login?redirect=%2Fboards`
- [ ] Build gate passes; ≥ 2 new tests

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add settings page with session section`

---

### T19: Auth e2e journey

**What**: One Playwright test: sign up a unique e-mail → `/boards` + toast → Settings icon → "Sair" → `/login`; open `/settings` → `/login?redirect=%2Fsettings`; log in → `/settings` shows "Connected as" (EN default). Three auth calls total.
**Where**: `front-end/test/e2e/auth.e2e-spec.ts`
**Depends on**: T18
**Reuses**: `foundation.e2e-spec.ts` setup
**Requirement**: FAUTH-08, FAUTH-14, FAUTH-20, FAUTH-22, FAUTH-23

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] Full gate passes locally against `docker compose`; the `front-end (e2e)` CI job passes
- [ ] The test makes ≤ 3 calls to `/api/v1/auth/*`

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the auth journey end to end`

---

### T20: Docs and roadmap

**What**: README front-end section explains signing up / logging in (demo user from the seed), ROADMAP marks `auth` as Done.
**Where**: `README.md`
**Depends on**: T19
**Reuses**: Existing front-end README section
**Requirement**: none

**Tools**:

- MCP: NONE
- Skill: `pair-programming`

**Done when**:

- [ ] README steps reproduce a log in from a fresh clone
- [ ] `front-end/.specs/ROADMAP.md` row 1 status is Done
- [ ] Build gate passes

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document signing up and logging in`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6
Phase 2:  T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15
Phase 4:  T16 → T17 → T18
Phase 5:  T19 → T20
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 manifest (+ lockfile) | ✅ Granular |
| T2 | 1 context + 1-line wiring in `App` | ✅ Cohesive |
| T3–T6 | 1 primitive each | ✅ Granular |
| T7 | 2 functions + types, one file | ✅ Cohesive |
| T8 | 2 functions, one file | ✅ Cohesive |
| T9 | 2 hooks, one file | ✅ Cohesive |
| T10 | query + keys + sign-out hook | ⚠️ 3 small files, one concern (session data) |
| T11, T12, T14, T16 | 1 component each | ✅ Granular |
| T13, T15, T17, T18 | 1 page + its route line | ✅ Cohesive |
| T19 | 1 e2e spec | ✅ Granular |
| T20 | 2 doc files | ✅ Cohesive |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start | ✅ Match |
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
| T1 | Dependencies | none | none | ✅ OK |
| T2 | `shared/session` | unit | unit | ✅ OK |
| T3–T6 | `shared/ui` | unit | unit | ✅ OK |
| T7, T8 | `features/auth/model` | unit | unit | ✅ OK |
| T9, T10 | `features/auth/api` | unit | unit | ✅ OK |
| T11, T12, T14, T16 | `features/auth/components` | unit | unit | ✅ OK |
| T13, T15, T17, T18 | `pages/` + route table | unit | unit | ✅ OK |
| T19 | Running app | e2e | e2e | ✅ OK |
| T20 | Docs | none | none | ✅ OK |

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FAUTH-01 | T11, T14, T15 |
| FAUTH-02–05 | T7, T14 |
| FAUTH-06 | T9, T14 |
| FAUTH-07 | T3, T14 |
| FAUTH-08 | T9, T15, T19 |
| FAUTH-09, FAUTH-10 | T8, T14 |
| FAUTH-11 | T11, T12, T13 |
| FAUTH-12 | T9, T12 |
| FAUTH-13 | T3, T12 |
| FAUTH-14 | T9, T13, T19 |
| FAUTH-15 | T8, T12 |
| FAUTH-16 | T12, T13 |
| FAUTH-17, FAUTH-18 | T8, T12, T14 |
| FAUTH-19 | T12, T14 |
| FAUTH-20 | T10, T16, T18, T19 |
| FAUTH-21 | T16 |
| FAUTH-22 | T10, T16, T18, T19 |
| FAUTH-23 | T6, T17, T19 |
| FAUTH-24 | T12, T14 |
| FAUTH-25 | T7, T14 |
| FAUTH-26 | T4, T5, T12, T14 |
| FAUTH-27 | T4, T12, T14 |

**Coverage:** 27 total, 27 mapped to tasks, 0 unmapped
