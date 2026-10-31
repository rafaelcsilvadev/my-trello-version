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
- **Decision**: The app is layered `app` → `pages` → `features/<feature>` → `shared`. Each feature is a modular MVVM module: `model/` (framework-free TS on top of the contract types, with no parallel domain model; reshaping happens through `select` mappers), `api/` (key factory, query options, mutation hooks; the only code that calls the API, so it plays the repository role), `view-models/` (`use-<screen>-view-model.ts` returning `{ state, actions }`, only for complex screens), `components/` (Views), and `index.ts` as the only public entry. A feature never imports another feature; pages compose features; `shared` imports nothing above it. oxlint `no-restricted-imports` enforces the rule. Server data lives only in the TanStack Query cache, shareable/reload-safe state in the URL, and the only global client stores are session and preferences. Optimistic updates are limited to drag and drop and toggles (superseded by FE-AD-009). Interactive primitives in `shared/ui` wrap React Aria Components; forms are controlled inputs with no form library.
- **Reason**: Each ROADMAP feature stays self-contained and reviewable; view-models keep Views testable with plain props, while skipping a repository/mapper layer avoids duplicating the contract types (the cost that made the back-end supersede BE-AD-001/002 with BE-AD-005); one source of truth per kind of state avoids stale copies of server data; React Aria provides the keyboard and focus behavior the prototype requires (drag with keyboard, dialogs, menus) without building it by hand; the forms have one or two fields, so a form library would add more than it saves.
- **Trade-off**: The UI depends on API shapes directly, so a contract change can reach components (caught by `typecheck`); deciding when a screen is "complex enough" for a view-model is a judgment call; cross-feature screens need composition at the page or a query moved to `shared`; lint overrides must be kept in sync with the folder layout; React Aria adds a dependency and its own styling API (render props / data attributes).
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active; its optimistic-update rule is superseded by FE-AD-009

### FE-AD-007
- **Decision**: Tests live outside `src/`, in `front-end/test/`, following the back-end layout: `test/unit/` mirrors `src/` (`src/app/app.tsx` → `test/unit/app/app.spec.tsx`), `test/e2e/` holds Playwright specs (`*.e2e-spec.ts`), and `test/support/` holds shared helpers (Vitest setup, `renderApp`, MSW server and handlers). Unit files are `*.spec.ts(x)` and import production code through the `@/` alias.
- **Reason**: One test layout across the repo, and `src/` holds only code that ships.
- **Trade-off**: A test sits far from its file, so a move in `src/` needs the matching move in `test/unit/`; the FE-AD-006 import rule covers `src/` only, so tests may import any layer.
- **Scope**: front-end
- **Date**: 2026-10-22
- **Status**: active

### FE-AD-008
- **Decision**: Icons come from `lucide-react`, pinned to an exact version (`1.61.0` at Design), imported by name (`import { Settings } from 'lucide-react'`) with no wrapper component. Decorative icons get `aria-hidden`; icon-only controls carry an `aria-label` from i18n.
- **Reason**: The Púrpura design system uses Lucide (stroke 2 px, `currentColor`, 14–20 px), and the package defaults already match it; per-icon imports keep only used icons in the bundle.
- **Trade-off**: The prototype's CDN `lucide-static@0.454.0` mask-based `Icon` is not reused, so an icon renamed between versions shows up as a type error on bump; the exact pin means bumps are manual.
- **Scope**: front-end
- **Date**: 2026-10-23
- **Status**: active

### FE-AD-009
- **Decision**: Every change to an existing entity (edit, archive, restore, delete, move, toggle) is optimistic: the mutation hook in `api/` cancels the related queries, snapshots them and patches the TanStack Query cache in `onMutate`, writes the snapshot back in `onError`, and invalidates on settle only when no other mutation with the same key is pending. Create waits for the server (the button shows the pending label) because the screen needs the server id. Failure feedback follows doc §10: network/`5xx` → "Não foi possível salvar" with Tentar novamente; `409` → conflict toast with Recarregar; `404` → plain save-fail toast and refetch. Supersedes the optimistic-update rule of FE-AD-006.
- **Reason**: Doc §10 makes every change optimistic; limiting it to drag and drop and toggles made the approved boards spec (FBRD-25/27/29/34/37) break FE-AD-006, and features 3–5 hit the same rule. Patching the cache keeps one source of truth for server data, as FE-AD-006 requires.
- **Trade-off**: Each mutation hook carries snapshot/rollback code and a test for the failure path; the screen can show a state the server later rejects for up to one request round-trip.
- **Scope**: front-end
- **Date**: 2026-10-26
- **Status**: active

### FE-AD-010
- **Decision**: An optimistic change describes each cache patch as `{ key, apply, revert }`. `onMutate` runs `apply` on each query it touches; `onError` runs `revert` on the current cache, which puts back only that item (its old field values, or the item re-inserted at its old index). No whole-query snapshot is written back. Refines FE-AD-009.
- **Reason**: Writing back a whole snapshot brings back items that an overlapping change already moved or removed (open item P1, boards T14). Board drag and drop (3b) makes overlapping changes common.
- **Trade-off**: Each change carries a hand-written `revert` and a test for it. `boards` keeps the snapshot rollback until P1 is fixed.
- **Scope**: front-end (features `board` onward; `boards` when P1 is fixed)
- **Date**: 2026-10-27
- **Status**: active

### FE-AD-011
- **Decision**: Single-key shortcuts go through `useShortcut(key, handler, { enabled })` in `src/shared/keyboard/use-shortcut.ts`. The hook ignores the key when Ctrl, Meta or Alt is held, when focus is in an `input`, `textarea`, `select` or `[contenteditable]`, and while an `[aria-modal="true"]` element is open.
- **Reason**: `n` (board), `/` (board-filters) and `?` (settings) need the same guards; one hook keeps them consistent.
- **Trade-off**: Shortcuts are global `keydown` listeners on `document`; a screen has to disable its own while it cannot act on them (e.g. an archived board).
- **Scope**: front-end
- **Date**: 2026-10-27
- **Status**: active

### FE-AD-012
- **Decision**: Drag and drop uses no library. The mouse uses native HTML5 drag events (`draggable`, `dragstart`, `dragover`, `drop`, `dragend`); the keyboard follows doc §6 (Space picks, arrows move, Space or Enter drops, Esc cancels) as a state machine over pure position functions in the feature's `model/`, with its own `role="status"` live region. Touch has no drag: touch users move items through menus ("Mover para…").
- **Reason**: The doc's keyboard model is semantic (column and index), while libraries move by coordinates (`@dnd-kit`) or use another key model (React Aria: Enter, then Tab between targets); `@dnd-kit/core` has had no release since 2024-12. HTML5 drag matches the prototype and never starts from touch, so it cannot fight the phone snap scroll.
- **Trade-off**: No drag animations beyond CSS; the native drag ghost image; every new draggable list (checklist in `card-detail`) writes its own keyboard handlers on the shared pattern.
- **Scope**: front-end
- **Date**: 2026-10-28
- **Status**: active

### FE-AD-013
- **Decision**: Features that read and patch the same cached data stay in one feature folder. The card detail (4a), its checklist (4b) and its label popover (4c) live in `features/board`, as `card-detail-*` files, and reuse the board's query keys and optimistic pipeline (`useOptimisticBoardViewChange`, `BOARD_VIEW_CHANGE_KEY`). The card route `t/:cardId` is a child of `b/:boardId`, so the board stays mounted under the detail.
- **Reason**: FE-AD-006 forbids one feature importing another; the detail must patch the board's card lists at once (FE-AD-009) and share one settle refetch with board changes. Moving the cache layer to `shared/` would put board domain code there and cost several refactor PRs.
- **Trade-off**: `features/board` grows large; the ROADMAP still tracks 4a–4c as separate features with their own specs.
- **Scope**: front-end (features `card-detail`, `card-checklist`, `card-labels`)
- **Date**: 2026-10-30
- **Status**: active

## Open Items

### P1
- **Item**: The optimistic rollback writes back the whole snapshot of both board lists. When two changes overlap and the first one fails while the second is still pending, the snapshot taken by the first one still holds the second board, so that board reappears (e.g. archive A and B at once; A fails → B is back in Ativos) until the settle refetch.
- **Likelihood**: low; it needs two changes in flight at once and the first one failing. The screen fixes itself on the next refetch, and the second change still reaches the server.
- **Decision**: fix in a future task. Each rollback undoes only its own board (re-insert at its original index, or restore its previous version) instead of the whole list.
- **Source**: boards T14 (`src/features/boards/api/mutations.ts`, `useOptimisticBoardChange`)
- **Date**: 2026-10-26
- **Status**: open

### P2
- **Item**: A failed background refetch replaces the whole board with the "Não foi possível carregar" block, even when the cache still holds the board. `useBoardViewModel` sets `status = 'error'` whenever any query `isError` (`use-board-view-model.ts:139`), and every failed write refetches all board queries. With the API unreachable, a failed move shows its toast and then the board disappears behind the load error, so the user loses the board they were editing.
- **Likelihood**: medium; any network drop or API outage while the board is open, after a failed write or a window-focus refetch. Recovery is one click on **Tentar novamente** once the API is back.
- **Decision**: fix in a future task. Show the load error only when there is no data to show (first load); a failed refetch with cached data keeps the board and relies on the write's toast.
- **Source**: board-dnd manual UAT in Chrome (API container stopped during a card move)
- **Date**: 2026-10-28
- **Status**: resolved in the board refetch fix PR (`use-board-view-model.ts` shows the load error only when a failed query has no data)

## Handoff

Auth: done. All 20 tasks merged, one PR each (T1–T20); README documents signing up and logging in. Validation: PASS (`features/auth/validation.md`, 27/27 FAUTH requirements verified, 33/33 mutants killed, 2 equivalent). Foundation: done and validated (`features/foundation/validation.md`). Boards: done. All 25 tasks merged, one PR each (T1–T25); README documents managing boards. Validation: PASS after 3 iterations (`features/boards/validation.md`, 42/42 FBRD requirements verified, 68/68 mutants killed, 3 equivalent); the fixes were test-only (PRs #178, #180). Board: done. All 44 tasks merged, one PR each (T1–T44); README documents using a board. Validation: PASS after 4 iterations (`features/board/validation.md`, 58/58 FBV requirements verified); the fixes were test-only except FBV-58 (PR #229). Board-dnd: done. All 24 tasks merged, one PR each (T1–T24); README documents moving cards and columns. Validation: PASS after 2 iterations (`features/board-dnd/validation.md`, 43/43 FDND requirements verified, 30/30 mutants killed); the fix was test-only (PR #267). Open item P2 (board load error on a failed refetch) resolved in PR #270. Open item P1 (boards snapshot rollback) is still open. Board-filters: done. All 23 tasks merged, one PR each (T1–T23); README documents searching and filtering a board. Validation: PASS after 2 iterations (`features/board-filters/validation.md`, 42/42 FBF requirements verified, 45/45 mutants killed); the fixes were test-only (PRs #297, #298, #299). Card-detail: done. All 27 tasks merged, one PR each (T1–T27); README documents the card detail. Validation: PASS after 2 iterations (`features/card-detail/validation.md`, 53/53 FCD requirements verified); the fixes were test-only except FCD-34 (PR #332). Follow-up fix: the modal stays inside the viewport (PR #335). Card-checklist: done. All 21 tasks merged, one PR each (T1–T21); README documents the card checklist. Validation pending. Next: validate `card-checklist`, then specify `card-checklist-dnd` (roadmap 4b2).
