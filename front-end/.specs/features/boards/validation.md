# Boards Validation

**Date**: 2026-10-26
**Spec**: `front-end/.specs/features/boards/spec.md`
**Diff range**: `7b72e08..57943e8` (iteration 3). Iteration 2 covered `7b72e08..522bf47`; iteration 1 covered `7b72e08..d165846` (51 non-merge commits, first feature commit `fdc0e30`; 55 files, +4942/-57). Scope: `front-end/` plus `README.md` / `README.PT.md`. No lockfile, `package.json` or CI file changed.
**Verifier**: independent sub-agent (author ≠ verifier), iteration 3 of 3

## Validation: Boards - PASS ✅ (iteration 3)

**Result (iteration 3)**: PASS ✅. Fix 4 (`9224d2a`, PR #180, test-only) kills N5: the pending test now renders two boards and asserts that only the edited card's menu is disabled. The gate is green: 519 unit/component tests (the fix changed one test, added none), 8 e2e in CI on `57943e8`. The sensor re-ran N5 and M40 and 4 new mutations on per-card pending scope; all 6 are killed. Cumulative sensor: 68/68 non-equivalent mutants killed, 3 equivalent. All 42 FBRD requirements are covered, spec-anchored and discriminating; `spec.md` traceability is set to Verified.

See [Iteration 3](#iteration-3) for the evidence. Iterations 1 and 2 are kept below as history.

### Iteration 2 result (history)

**Result (iteration 2)**: FAIL ❌, one Minor gap left. The three test-only fix commits (`27ca400`, `4208d8a`, `96e2485`, PR #178) kill all 6 iteration-1 survivors (M40-M43, M48, M50). The gate is green: 519 unit/component tests, 8 e2e in CI on `522bf47`. Of 6 new mutations around the same wiring, 4 are killed, 1 is equivalent and 1 survives: N5 (`pendingIds.size > 0`) disables the menu of every card while any change is in flight, and no test notices, because the new pending test renders a single card. The spec asks for "that card's" menu and "one change per card at a time" (FBRD-42). Fix 4 below adds a second card to that test. Behavior is correct; the gap is a missing assertion.

Everything from "Task Completion" down to "Next steps" in the iteration-1 summary is kept as history, with status updates marked "iteration 2".

### Iteration 1 result (history)

**Result (iteration 1)**: FAIL ❌. The behavior is correct: all 42 FBRD requirements are implemented and have `file:line` evidence, and the gate is green (513 unit/component tests, +202 over the feature; 8 e2e in CI, incl. `boards.e2e-spec.ts`). The tests are not discriminating enough: 6 of 61 mutants survived (2 more are equivalent and not counted). Five survivors sit in `BoardsScreen` wiring that no screen test exercises, one sits in the form counter. The worst one (M43) would let a title-only edit silently wipe the board description, and no unit or e2e test would notice. Every gap is a missing test, not a code defect.

---

## Iteration 3

Verifier run on 2026-10-26 against `57943e8` (branch `docs/boards-validation-pass`, equal to `main`). Paths are relative to `front-end/test/unit/features/boards/components/`.

### Fix commit reviewed

`9224d2a` (`git show --stat`: 1 file, +13/-8), test-only. No test deleted, no assertion weakened: the old single-card assertion is kept for the edited card and one assertion is added for the other card.

| Fix | Test (`file:line`) | AC | Asserted value vs spec outcome | Verdict |
| --- | ------------------ | -- | ------------------------------ | ------- |
| Fix 4 | `boards-screen.spec.tsx:342-360` | FBRD-42 | Lists `[roadmap, travel]`, held `PATCH` for Roadmap → `cardMenu(/Roadmap 2027/).hasAttribute('disabled')` `toBe(true)` (`:356-358`, inside `waitFor`), then `cardMenu(/Travel/).hasAttribute('disabled')` `toBe(false)` (`:359`). Matches "that card's menu" and "one change per card at a time": the edited card is locked, the other stays usable | ✅ spec-anchored, drives the real view-model + MSW |

**`cardMenu` helper** (`boards-screen.spec.tsx:80-86`): finds the `listitem` that contains a link matching the title and returns the `Board actions` button inside it. It does not weaken other tests: `openEditDialog` (`:88-93`, used by the tests at `:305`, `:327`, `:348`) now clicks `cardMenu(/Roadmap/)` instead of the only `Board actions` button. The single-board tests render only Roadmap, so the target is the same button; with two boards the helper picks Roadmap's menu, where `getByRole` would throw on two matches. `/Roadmap/` does not match `Travel`. If no item matches, `within(undefined)` throws, so a wrong title fails loudly instead of passing. The two tests at `:252` and `:285` still use `getByRole('button', { name: 'Board actions' })` on one-card screens, unchanged.

### Gate (iteration 3)

- **Build gate** (real tree, repo root): `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` → exit 0. oxlint + Prettier clean, `tsc` clean, **52 files / 519 tests passed**, 0 failed, 0 skipped; `vite build` OK (JS 630.11 kB, same 500 kB warning as observation 1).
- **Test count**: 519 → 519 (Fix 4 rewrote one test). Feature delta stays +208 over the 311 baseline.
- **E2E**: CI run `40405069344` on `main` at `57943e8` (`success`), job `front-end (test:e2e)` (`121861236339`) `success`, log: `8 passed (52.4s)`. All 12 jobs `success`. The run on `f9337f9` (merge of PR #180, `40405024029`) was `cancelled`, superseded by the next push.

### Discrimination sensor (iteration 3)

Temporary worktree `<scratchpad>/wt3`, detached at `57943e8`. No `pnpm` command ran in it; the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked, and Vitest ran from the worktree's `front-end/` with `node ./node_modules/vitest/vitest.mjs run` (full unit suite per mutant). Unmutated sanity run: 519/519 passed. A script applied one mutation at a time (target text had to occur exactly once), ran the suite, reverted with `git checkout -- <file>` and asserted a clean tracked tree before and after each one. Afterwards: `git worktree remove --force`, `git worktree prune`; the real tree's `git status --porcelain` equals the baseline (empty) and `find … -xtype l` on the three `node_modules` found no broken links.

| # | File:line (`front-end/src/features/boards/…`) | Mutation | Failing tests | Killed? |
| - | --------------------------------------------- | -------- | ------------- | ------- |
| N5 (re-run) | `components/boards-screen.tsx:89` | `pendingIds.has(board.id)` → `pendingIds.size > 0` (every card locked while any change is in flight) | 1 (`disables only the menu of the card whose change is in flight`) | ✅ Killed |
| M40 (re-run) | `components/boards-screen.tsx:89` | `isPending={pendingIds.has(board.id)}` → `false` | 1 (same test) | ✅ Killed |
| P1 | `components/boards-screen.tsx:89` | Pending scope inverted (`!pendingIds.has(board.id)`: every other card locked, the edited one usable) | 5 (pending test, edit prefill, reopened edit, archive-last, delete from archived) | ✅ Killed |
| P2 | `components/boards-screen.tsx:89` | Pending keyed by the wrong board (`pendingIds.has(query.data[0].id)`: every card follows the first card's state) | 1 (pending test, through Travel's menu) | ✅ Killed |
| P3 | `api/mutations.ts:109` | `usePendingBoardIds` selects `board.title` instead of `board.id` | 4 (`mutations.spec` `holds the board id only while its change is pending`, two view-model change tests, pending screen test) | ✅ Killed |
| P4 | `components/board-card.tsx:117` | `isDisabled={isPending}` dropped from `ActionMenu` | 2 (`board-card.spec` pending test, pending screen test) | ✅ Killed |

Not mutated: the pending opacity (`board-card.tsx:82`) and the "Salvando…" spinner (`board-card.tsx:101-110`). The spec has no AC for them (iteration-1 Code Quality lists them as small extras), so a mutant there would not be a spec gap.

**Iteration 3 sensor result**: 6/6 killed (2 re-runs, 4 new), 0 survived, 0 equivalent.

**Cumulative sensor** (iterations 1-3): 68 non-equivalent mutations, 68 killed, 0 survived; 3 equivalent (E1, E2, E3) not counted. Earlier kills stand without a re-run: the fix commits only add or tighten tests in the suite that killed them.

### Spec-anchored status changes (iteration 3)

| AC | Iteration 2 | Iteration 3 evidence | Result |
| -- | ----------- | -------------------- | ------ |
| FBRD-42 | ⚠️ Weak (N5) | `boards-screen.spec.tsx:356-359` edited card's `Board actions` `disabled` `toBe(true)`, Travel's `toBe(false)` (N5, M40, P1-P4 killed); `board-card.spec.tsx:459-468` `isPending` → `disabled`; `mutations.spec.tsx:507-541` pending ids per board | ✅ |

**Status (iteration 3)**: 42/42 ACs matched the spec outcome and are discriminating. Spec-precision gaps: 0.

---

## Iteration 2

Verifier run on 2026-10-26 against `522bf47` (branch `docs/boards-revalidation`, equal to `main`). Paths are relative to `front-end/test/unit/features/boards/components/`.

### Fix commits reviewed

All three are test-only (`git show --stat`: +119/-1, +8, +10; the -1 is the `@testing-library/react` import split). No test deleted, no assertion weakened.

| Fix | New test (`file:line`) | AC | Asserted value vs spec outcome | Verdict |
| --- | ---------------------- | -- | ------------------------------ | ------- |
| Fix 1.1 | `boards-screen.spec.tsx:286-309` | FBRD-23, FBRD-25 | Rendered screen, menu → Edit: Name `toBe('Roadmap')`, Description `toBe('Q4 plans')`, counter `'8 / 1000'` (the board's values and matching counter, FBRD-23); title-only change → `PATCH` body `toEqual({ title: 'Roadmap 2027', description: 'Q4 plans' })` (trimmed name, description kept, FBRD-25); toast `'Board saved'` (FBRD-26) | ✅ spec-anchored, drives the real view-model + MSW |
| Fix 1.2 | `boards-screen.spec.tsx:311-332` | FBRD-41 | `400` with `errors[{ field: 'description' }]` → reopened `'Edit board'` dialog shows `'Use up to 1000 characters'` (the FBRD-41 description message) and the submitted values `'Roadmap 2027'` / `'Q4 plans'` | ✅ |
| Fix 1.3 | `boards-screen.spec.tsx:334-355` | FBRD-42 | Edit with a held `PATCH` → card shows `'Roadmap 2027'` at once, then its `Board actions` button `hasAttribute('disabled')` `toBe(true)`. Uses edit instead of the archive the fix plan named; equally valid (archive removes the card). Renders one card only, see N5 | ⚠️ discriminating for M40/N2, not for N5 |
| Fix 1.4 | `boards-screen.spec.tsx:357-372` | FBRD-18 | Create with a held `POST` → the dialog's button named `'Creating…'` has `disabled` | ✅ |
| Fix 2 | `board-form-dialog.spec.tsx:166-172` | FBRD-16 | Types `'  ab  '` → `'6 / 1000'` (raw length, spaces counted, matches the "before trim" assumption) | ✅ |
| Fix 3 | `board-card.spec.tsx:95-103` | FBRD-04 | Description element `classList.contains('line-clamp-2')` `toBe(true)` (2-line clamp). Class-level check, the only observable in jsdom | ✅ |

None of the new tests mirrors the implementation: they go through roles, labels, MSW request bodies and rendered text, not through view-model internals.

### Gate (iteration 2)

- **Build gate** (real tree, repo root): `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` → exit 0. oxlint + Prettier clean, `tsc` clean, **52 files / 519 tests passed**, 0 failed, 0 skipped; `vite build` OK (JS 630.11 kB, same 500 kB warning as observation 1).
- **Test count**: 513 → 519 (+6, one per fix item). Feature delta now +208 over the 311 baseline.
- **E2E**: CI run `40403138879` on `main` at `522bf474` (`success`), job `front-end (test:e2e)` (`121854453296`) `success`, log: `8 passed (50.4s)`. All 12 jobs `success`. The previous main run `40402885613` (`06cd571`, merge of PR #178) was `cancelled` (superseded by the next push), not failed on a test.

### Discrimination sensor (iteration 2)

Temporary worktree `<scratchpad>/wt2`, detached at `522bf47`. No `pnpm` command ran in it; the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked, and Vitest ran from the worktree's `front-end/` with `node ./node_modules/vitest/vitest.mjs run` (full unit suite per mutant). Unmutated sanity run: 519/519 passed. A script applied one mutation at a time (target text had to occur exactly once), ran the suite, reverted with `git checkout -- <file>` and asserted a clean tracked tree before the next. Afterwards: `git worktree remove --force`, `git worktree prune`; the real tree's `git status --porcelain` equals the baseline (empty) and `find … -xtype l` on the three `node_modules` found no broken links.

Re-run of the iteration-1 survivors (same mutations as the iteration-1 table):

| # | File:line (`front-end/src/features/boards/components/…`) | Mutation | Failing tests | Killed? |
| - | -------------------------------------------------------- | -------- | ------------- | ------- |
| M40 | `boards-screen.tsx:89` | `isPending={pendingIds.has(board.id)}` → `false` | 1 (`disables the card menu while its change is in flight`) | ✅ Killed |
| M41 | `boards-screen.tsx:115` | `isPending={isCreating}` → `false` | 1 (`shows Creating… on a disabled submit button…`) | ✅ Killed |
| M42 | `boards-screen.tsx:125` | `dialog.values ?? formValuesOf(dialog.board)` → `formValuesOf(dialog.board)` | 1 (`reopens the edit dialog with the submitted values after a 400`) | ✅ Killed |
| M43 | `boards-screen.tsx:147` | `description: board.description ?? ''` → `''` | 2 (edit prefill, reopened values) | ✅ Killed |
| M48 | `board-card.tsx:93` | `line-clamp-2` removed | 1 (`clamps the description to two lines`) | ✅ Killed |
| M50 | `board-form-dialog.tsx:110` | counter on `description.trim().length` | 1 (`counts the description as typed, spaces included`) | ✅ Killed |

New mutations around the same wiring (not tried in iteration 1):

| # | File:line | Mutation | Failing tests | Killed? |
| - | --------- | -------- | ------------- | ------- |
| N1 | `boards-screen.tsx:128` | Edit submits the board's old values (`submitEdit(dialog.board, formValuesOf(dialog.board))`) | 3 | ✅ Killed |
| N2 | `boards-screen.tsx:89` | Pending ids keyed wrong (`pendingIds.has(board.title)`) | 1 | ✅ Killed |
| N3 | `boards-screen.tsx:115` | Create pending inverted (`isPending={!isCreating}`) | 2 (incl. `BoardsPage lands on /b/{id}`) | ✅ Killed |
| N4 | `board-form-dialog.tsx:110` | Counter off by one (`description.length + 1`) | 7 | ✅ Killed |
| N5 | `boards-screen.tsx:89` | Every card pending while any change is in flight (`pendingIds.size > 0`) | 0 | ❌ Survived → Fix 4 |
| (E3) N6 | `boards-screen.tsx:147` | Edit prefill trims the board's title and description | 0 | Equivalent: the API trims `title` and `description` on create and edit (spec assumption "Trim"; BRD rules), so a board from `GET /api/v1/boards` never has surrounding spaces and the trim is a no-op on real data. Not counted |

**Iteration 2 sensor result**: 10/11 non-equivalent mutations killed, 1 survived (N5), 1 equivalent.

**Cumulative sensor** (iteration 1 + 2): 64 non-equivalent mutations, 63 killed, 1 survived (N5); 3 equivalent (E1, E2, E3) not counted. The iteration-1 kills stand without a re-run: the fix commits only add tests to the suite that killed them.

### Spec-anchored status changes (iteration 2)

| AC | Iteration 1 | Iteration 2 evidence | Result |
| -- | ----------- | -------------------- | ------ |
| FBRD-04 | ⚠️ Weak (M48) | `board-card.spec.tsx:95-103` `classList.contains('line-clamp-2')` `toBe(true)` | ✅ |
| FBRD-16 | ⚠️ Weak (M50) | `board-form-dialog.spec.tsx:166-172` `'  ab  '` → `'6 / 1000'` | ✅ |
| FBRD-18 | ⚠️ Weak (M41) | `boards-screen.spec.tsx:357-372` `'Creating…'` button `disabled` on the rendered screen (M41, N3 killed) | ✅ |
| FBRD-23 | ⚠️ Weak (M43) | `boards-screen.spec.tsx:296-300` Name `'Roadmap'`, Description `'Q4 plans'`, `'8 / 1000'`; `:308` `PATCH` keeps `description: 'Q4 plans'` (M43, N1 killed) | ✅ |
| FBRD-41 | ⚠️ Weak (M42) | `boards-screen.spec.tsx:326-331` reopened dialog: `'Use up to 1000 characters'`, `'Roadmap 2027'`, `'Q4 plans'` | ✅ |
| FBRD-42 | ⚠️ Weak (M40) | `boards-screen.spec.tsx:347-354` pending card's `Board actions` `disabled` (M40, N2 killed). Only one card is rendered, so locking every card (N5) passes | ⚠️ Weak (N5) |

**Status (iteration 2)**: 41/42 ACs fully discriminating; FBRD-42 still weak. Spec-precision gaps: 0 (FBRD-42 says "that card's" menu and the spec's concurrency row says "one change per card at a time", so other cards staying usable is a spec outcome).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T25 | ✅ Done | Every "Done when" box in `tasks.md` is ticked (`grep -c -- '- \[ \]' tasks.md` → `0`). T24's local full gate was not re-run by the Verifier (no containers started); the `front-end (test:e2e)` CI job on `d165846` is the evidence. |

---

## Spec-Anchored Acceptance Criteria

Paths are relative to `front-end/test/`. `boards/…` means `unit/features/boards/…`; `vm.spec` is `boards/view-models/use-boards-view-model.spec.tsx`; `screen.spec` is `boards/components/boards-screen.spec.tsx`. "Verifier run" means a command the Verifier ran on 2026-10-26 against `d165846`.

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FBRD-01 | `/boards`: heading "Meus quadros", tabs Ativos (selected) / Arquivados, `GET /api/v1/boards` | `screen.spec:77-86` heading level 1 `'My boards'`, Active `aria-selected` `toBe('true')`, Archived `'false'`; `boards/api/queries.spec.tsx:64-65` one request, `search` `toBe('')`; `vm.spec:183-186` `tab` `toBe('active')`, data `toEqual([roadmap])` | ✅ (see observation 4) |
| FBRD-02 | `?archived=true` → Arquivados selected, `GET …?archived=true` | `vm.spec:193-196` `tab` `toBe('archived')`, data `toEqual([oldPlans])`; `queries.spec.tsx:81-82` `search` `toBe('?archived=true')`; `screen.spec:131-135` archived empty state on that URL | ✅ |
| FBRD-03 | Selecting a tab writes `/boards` or `/boards?archived=true` and shows that list | `vm.spec:210-219` `location.search` `toBe('?archived=true')` then `toBe('')`; `screen.spec:112-116` click Archived → `cardTitles()` `toEqual(['Old plans'])`, `router.state.location.search` `toBe('?archived=true')`; unknown value → Ativos `vm.spec:199-204` | ✅ |
| FBRD-04 | One card per board in API order; title; description clamped to 2 lines when not empty; date line | `screen.spec:98-104` `cardTitles()` `toEqual(['Travel', 'Roadmap'])` (API order, not sorted); `boards/components/board-card.spec.tsx:87-93` description inside the link, `:95-100` `null` → `queryByText` `toBeNull()`. The 2-line clamp is not asserted (M48 survived) | ⚠️ Weak (M48) |
| FBRD-05 | "Criado em {d}" (`createdAt`, Ativos) / "Arquivado em {d}" (`archivedAt`, Arquivados); "10 out, 2026" / "Oct 10, 2026", local date | `board-card.spec.tsx:357-388` `getByText('Criado em 10 out, 2026')`, `'Arquivado em 20 out, 2026'`, `'Created Oct 10, 2026'`, `'Archived Oct 20, 2026'`; `unit/shared/i18n/format-date.spec.ts:15-45` both locales, Jan/Dec, single-digit day; `:47-50` 23:30 local → `'Oct 10, 2026'` (M57 killed in TZ `-03`) | ✅ |
| FBRD-06 | Card activation → `/b/{id}` | `board-card.spec.tsx:89` `href` `toBe('/b/${board.id}')`; `unit/pages/boards-page.spec.tsx:77-80` click → `pathname` `toBe('/b/${roadmap.id}')` | ✅ |
| FBRD-07 | Skeleton while loading | `screen.spec:89-96` `[aria-busy="true"]` `not.toBeNull()`, `queryByRole('list')` `toBeNull()`; `boards/components/boards-skeleton.spec.tsx:9` 6 placeholders | ✅ |
| FBRD-08 | Empty Ativos: "Crie seu primeiro quadro", the text, "Criar quadro" | `boards/components/boards-empty.spec.tsx:27-53` PT/EN title (heading level 2), detail and button exact; `:55-61` `onCreate` once; `screen.spec:119-129` | ✅ |
| FBRD-09 | Empty Arquivados: "Nenhum quadro arquivado" | `boards-empty.spec.tsx:69-80` exact PT/EN, no button; `screen.spec:131-139` | ✅ |
| FBRD-10 | Non-401 load failure → "Não foi possível carregar", "Verifique sua conexão e tente de novo.", "Tentar novamente" refetches | `unit/shared/ui/load-error.spec.tsx:24-49` PT/EN title, detail, button exact inside `role="alert"`, `:51-57` `onRetry` once; `screen.spec:141-183` both tabs, `Try again` → `calls` `toBe(2)` and the list shows; `vm.spec:222-242` `retryLoad` | ✅ |
| FBRD-11 | "Criar quadro" only on Ativos | `screen.spec:185-195` present on Active, `queryByRole('button', { name: 'Create board' })` `toBeNull()` on Archived (M39 killed) | ✅ |
| FBRD-12 | Modal "Novo quadro": Nome + placeholder, Descrição "(opcional)" + placeholder, "0 / 1000", Cancelar, Criar | `boards/components/board-form-dialog.spec.tsx:61-102` dialog name `'Novo quadro'`, placeholders `'Ex.: Viagem de férias'` / `'Para que serve este quadro?'`, label `'Descrição (opcional)'`, `'0 / 1000'`, both buttons (PT/EN); `screen.spec:197-207` | ✅ |
| FBRD-13 | Trimmed name empty → "Dê um nome ao quadro", no request | `board-form-dialog.spec.tsx:118-133` `''` and `'   '` → message, `aria-invalid` `'true'`, `onSubmit` `not.toHaveBeenCalled()`; `boards/model/validation.spec.ts:23-28`; `vm.spec:355-370` `bodies` `toEqual([])` (M3 killed) | ✅ |
| FBRD-14 | Trimmed name > 100 → "Use até 100 caracteres", no request | `board-form-dialog.spec.tsx:135-143` 101 chars; boundaries `validation.spec.ts:30-42` 1/100/padded 100 → `{}`, padded 101 → `nameTooLong` (M1 killed) | ✅ |
| FBRD-15 | Trimmed description > 1000 → "Use até 1000 caracteres", no request | `board-form-dialog.spec.tsx:145-156` 1001 chars → message, `aria-invalid` `'true'`, no submit; `validation.spec.ts:46-59` 1000 / padded 1000 accepted, padded 1001 rejected (M2 killed) | ✅ |
| FBRD-16 | Counter "{n} / 1000", n = characters typed (before trim) | `board-form-dialog.spec.tsx:158-164` `'7 / 1000'`, `:150` `'1001 / 1000'`. No test types surrounding spaces, so a counter on the trimmed text passes (M50 survived) | ⚠️ Weak (M50) |
| FBRD-17 | `POST /api/v1/boards` with trimmed `title`; `description` only when trimmed non-empty | `vm.spec:265-268` `'  Roadmap '` + `''` → `bodies` `toEqual([{ title: 'Roadmap' }])`; `validation.spec.ts:70-83` trimmed both, `''`/`'   '` → `not.toHaveProperty('description')`; `boards/api/mutations.spec.tsx:85-100` path + body (M4 killed) | ✅ |
| FBRD-18 | In flight: "Criando…", submit disabled | `board-form-dialog.spec.tsx:196-206` button `'Criando…'` `disabled` `true`, `fireEvent.submit` → `onSubmit` not called; `vm.spec:273-285` `isCreating` `true` while pending. The screen never checks that `isCreating` reaches the dialog (M41 survived) | ⚠️ Weak (M41) |
| FBRD-19 | `201` → modal closes, toast "Quadro criado", navigate `/b/{id}` | `vm.spec:267-270` `onCreated` `toHaveBeenCalledWith(roadmap.id)`, dialog `toEqual({ kind: 'none' })`, `getByText('Quadro criado')`; `boards-page.spec.tsx:56-71` `pathname` `toBe('/b/${created.id}')` (M56 killed); e2e `test/e2e/boards.e2e-spec.ts:30` | ✅ |
| FBRD-20 | Other failure → modal kept with values, button enabled, toast "Não foi possível salvar. Tente novamente." + "Tentar novamente" resending the same request | `vm.spec:299-309` toast exact, dialog `toEqual({ kind: 'create', values })`, retry → `bodies` `toEqual([{ title: 'Roadmap' }, { title: 'Roadmap' }])` (M26 killed); `isCreating` back to `false` asserted at `vm.spec:346-348` (M28 killed) | ✅ (see observation 6) |
| FBRD-21 | Cancelar / Esc close without a request | `board-form-dialog.spec.tsx:220-236` `onClose` once, `onSubmit` not called (M53 killed); `vm.spec:246-255` `closeDialog` → `{ kind: 'none' }` | ✅ |
| FBRD-22 | Ativos menu: Editar, Arquivar | `board-card.spec.tsx:408-414` `menuItemNames()` `toEqual(['Editar', 'Arquivar'])`; `:424-457` each item calls only its callback with the board | ✅ |
| FBRD-23 | "Editar quadro" prefilled with the board's values, matching counter, Cancelar / Salvar | `board-form-dialog.spec.tsx:104-116` given `initialValues` → `'Editar quadro'`, values, `'7 / 1000'`, `'Salvar'`. The board → form mapping in `boards-screen.tsx:146-148` has no test: dropping the description passes (M43 survived) | ⚠️ Weak (M43) |
| FBRD-24 | Edit modal uses FBRD-13..15 | `vm.spec:433-448` blank name on edit → dialog `errors: { name: 'nameRequired' }`, `changes` `toEqual([])`; the form validates the same way in both modes (`board-form-dialog.tsx:71-82`) | ✅ |
| FBRD-25 | Valid save → modal closes, card shows new values at once, `PATCH` with trimmed title and description or `null` | `vm.spec:411-425` dialog `{ kind: 'none' }` at once, cached `[0]` `toMatchObject({ title: 'Roadmap 2027', description: null })` before the held response, body `{ title: 'Roadmap 2027', description: null }`; `mutations.spec.tsx:186-214` (M5, M14, M35 killed) | ✅ |
| FBRD-26 | Edit `200` → "Quadro salvo" | `vm.spec:429` `findByText('Quadro salvo')` | ✅ |
| FBRD-27 | Arquivar → card leaves Ativos at once, `POST …/archive`, `200` → "Quadro arquivado" | `vm.spec:505-516` data `toEqual([travel])` before the held response, pending id set, `'Quadro arquivado'`, change `POST …/archive`; `mutations.spec.tsx:317-344` (M15 killed) | ✅ |
| FBRD-28 | Arquivados menu: Restaurar, Excluir definitivamente | `board-card.spec.tsx:416-422` `toEqual(['Restaurar', 'Excluir definitivamente'])` | ✅ |
| FBRD-29 | Restaurar → leaves Arquivados at once, `POST …/unarchive`, `200` → "Quadro restaurado" | `mutations.spec.tsx:398-428` archived list `toEqual([archivedBacklog])` before the response, path `…/unarchive`; `vm.spec:537-546` `'Quadro restaurado'` + request (M16 killed) | ✅ |
| FBRD-30 | After `200`, the other tab shows the API board next time | `mutations.spec.tsx:235-256` both lists `isInvalidated` `toBe(true)` after settle (M21 killed); e2e `boards.e2e-spec.ts:49-53` archived board found on the Archived tab | ✅ |
| FBRD-31 | Dialog "Excluir o quadro {name} definitivamente?", text, field, Cancelar / Excluir definitivamente | `boards/components/delete-board-dialog.spec.tsx:76-106` `alertdialog` name, text, field label, buttons exact (PT/EN) (M60 killed); `screen.spec:209-224` | ✅ |
| FBRD-32 | Field ≠ title → button disabled | `delete-board-dialog.spec.tsx:108-123` `''`, `'roadmap'`, `'Roadmap '`, `'Road'` → `disabled` `true`, click → `onConfirm` not called; `validation.spec.ts:109-117` (M6, M54 killed) | ✅ |
| FBRD-33 | Exact match → enabled | `delete-board-dialog.spec.tsx:125-134` `disabled` `false`, `onConfirm` once; e2e `boards.e2e-spec.ts:69-73` | ✅ |
| FBRD-34 | Confirm → dialog closes, card leaves at once, `DELETE /api/v1/boards/{id}` | `vm.spec:554-564` dialog `{ kind: 'none' }`, change `DELETE /api/v1/boards/${oldPlans.id}` (M37 killed); `mutations.spec.tsx:450-478` archived list without it before the response (M17 killed) | ✅ |
| FBRD-35 | `204` → "Quadro excluído definitivamente" | `vm.spec:557` `findByText('Quadro excluído definitivamente')` | ✅ |
| FBRD-36 | Cancelar / Esc close without a request | `delete-board-dialog.spec.tsx:136-153` `onClose` once, `onConfirm` not called | ✅ |
| FBRD-37 | Failed edit/archive/restore/delete → grid back to its prior state | `mutations.spec.tsx:216-233` (edit), `:346-360` (archive), `:430-446` (restore), `:480-496` (delete) list `toEqual` the snapshot after `500` (M18, M19 killed) | ✅ (see observation 2) |
| FBRD-38 | Network / `5xx` → "Não foi possível salvar. Tente novamente." + "Tentar novamente" reapplying the change | `vm.spec:470-492` edit `500` → toast, retry → two identical `PATCH` bodies (M38 killed); `:567-581` archive `500`, retry after a tab switch → two `POST …/archive`; `boards/model/errors.spec.ts:85-87` `0/500/503` → `'retry'` | ✅ |
| FBRD-39 | `409` → "Este item foi arquivado. Recarregue para ver o estado atual." + "Recarregar" refetching both lists | `vm.spec:583-603` toast exact, `Recarregar` → `fetches.active` `toBe(before + 1)`, no `Tentar novamente` (M8, M30 killed); `errors.spec.ts:89-91` | ✅ (archived refetch: M29 equivalent, see sensor) |
| FBRD-40 | `404` → saveFail toast without a button, both lists refetched | `vm.spec:605-630` toast, `fetches.archived` `toBe(before + 1)` while another change is pending, data `toEqual([])`, `queryByRole('button')` `toBeNull()` (M9, M31, M32 killed) | ✅ |
| FBRD-41 | `400 errors[]` → per-field message (title: required when trimmed empty, else too long; description: too long) in the reopened / open modal with the submitted values | `errors.spec.ts:30-81` mapping incl. blank/filled title, unknown fields, non-400 → `null` (M7, M10 killed); `vm.spec:322-334` create → dialog `errors: { name: 'nameTooLong' }`, no toast; `:459-467` edit → dialog `{ kind: 'edit', board, values: edited, errors: { description: 'descriptionTooLong' } }` (M36 killed); `board-form-dialog.spec.tsx:208-218` server errors on fields (M51 killed). The screen never renders a reopened edit dialog: showing the board's values instead of the submitted ones passes (M42 survived) | ⚠️ Weak (M42) |
| FBRD-42 | Card menu (…) disabled while its change is in flight | `board-card.spec.tsx:459-468` `isPending` → `disabled` `true`, menu not opened (M46 killed); `vm.spec:418,510` `pendingIds` `toEqual(new Set([id]))`; `mutations.spec.tsx:507-541` (M23 killed). `boards-screen.tsx:89` passing `pendingIds` to the card is untested (M40 survived) | ⚠️ Weak (M40) |

**Status**: ❌ Gaps present. 42/42 ACs have evidence and match the spec outcome; 36/42 are fully discriminating; 6 are weak (surviving mutant). Spec-precision gaps: 0.

---

## Discrimination Sensor

Run in a temporary `git worktree` (`<scratchpad>/wt`, detached `d165846`). No `pnpm` command ran in the worktree: the real `node_modules`, `front-end/node_modules` and `packages/api-contract/node_modules` were symlinked in, and Vitest ran directly (`node ./node_modules/vitest/vitest.mjs run`, full unit suite per mutant). Unmutated sanity run: 513/513 passed. A script applied each mutation alone (the target text had to occur exactly once), ran the suite, and reverted with `git checkout -- <file>`, asserting a clean worktree before the next.

| # | File:line (`front-end/src/…`) | Description | Failing tests | Killed? |
| - | ----------------------------- | ----------- | ------------- | ------- |
| M1 | `features/boards/model/validation.ts:17` | Name limit `> 100` → `>= 100` | 2 | ✅ Killed |
| M2 | `features/boards/model/validation.ts:20` | Description validated untrimmed | 1 | ✅ Killed |
| M3 | `features/boards/model/validation.ts:15` | Spaces-only name accepted | 6 | ✅ Killed |
| M4 | `features/boards/model/validation.ts:29` | Create body always sends `description` | 4 | ✅ Killed |
| M5 | `features/boards/model/validation.ts:37` | Update body sends `''` instead of `null` | 4 | ✅ Killed |
| M6 | `features/boards/model/validation.ts:43` | Delete match ignores case and spaces | 5 | ✅ Killed |
| M7 | `features/boards/model/errors.ts:20` | Server title messages swapped | 5 | ✅ Killed |
| M8 | `features/boards/model/errors.ts:50` | `409` → `retry` | 2 | ✅ Killed |
| M9 | `features/boards/model/errors.ts:48` | `404` → `retry` | 2 | ✅ Killed |
| M10 | `features/boards/model/errors.ts:52` | `400` without `errors[]` → `invalid` | 2 | ✅ Killed |
| M11 | `features/boards/model/errors.ts:46` | `401` → `retry` | 3 | ✅ Killed |
| M12 | `features/boards/api/queries.ts:18` | Active list sends `archived=false` | 1 | ✅ Killed |
| M13 | `features/boards/api/mutations.ts:34` | Create invalidates the archived list instead of the active one | 1 | ✅ Killed |
| M14 | `features/boards/api/mutations.ts:55` | Edit not patched into the cache | 3 | ✅ Killed |
| M15 | `features/boards/api/mutations.ts:73` | Archive removes from the wrong list | 3 | ✅ Killed |
| M16 | `features/boards/api/mutations.ts:83` | Restore removes from the wrong list | 1 | ✅ Killed |
| M17 | `features/boards/api/mutations.ts:97` | Delete not removed optimistically | 1 | ✅ Killed |
| M18 | `features/boards/api/mutations.ts:152` | No rollback of the active list | 2 | ✅ Killed |
| M19 | `features/boards/api/mutations.ts:153` | No rollback of the archived list | 2 | ✅ Killed |
| M20 | `features/boards/api/mutations.ts:157` | Settle refetch while another change is pending (`=== 1` → `>= 1`) | 3 | ✅ Killed |
| M21 | `features/boards/api/mutations.ts:158` | Settle invalidates only the active list | 1 | ✅ Killed |
| M22 | `features/boards/api/mutations.ts:130` | In-flight list fetch not cancelled before the patch | 2 | ✅ Killed |
| M23 | `features/boards/api/mutations.ts:108` | Pending ids keep settled changes | 5 | ✅ Killed |
| M24 | `features/boards/view-models/use-boards-view-model.ts:51` | Any `?archived` value selects Arquivados | 1 | ✅ Killed |
| M25 | `features/boards/view-models/use-boards-view-model.ts:183` | Ativos writes `?archived=false` | 1 | ✅ Killed |
| M26 | `features/boards/view-models/use-boards-view-model.ts:91` | Create retry does nothing | 1 | ✅ Killed |
| M27 | `features/boards/view-models/use-boards-view-model.ts:77` | Create `401` falls into another branch | 1 | ✅ Killed |
| M28 | `features/boards/view-models/use-boards-view-model.ts:179` | Submit stays disabled after a failed create | 1 | ✅ Killed |
| M30 | `features/boards/view-models/use-boards-view-model.ts:109` | `409` toast without Recarregar | 1 | ✅ Killed |
| M31 | `features/boards/view-models/use-boards-view-model.ts:113` | `404` does not refetch | 1 | ✅ Killed |
| M32 | `features/boards/view-models/use-boards-view-model.ts:113` | `404` toast offers Tentar novamente | 1 | ✅ Killed |
| M33 | `features/boards/view-models/use-boards-view-model.ts:104` | Change `401` shows the conflict toast | 1 | ✅ Killed |
| M34 | `features/boards/view-models/use-boards-view-model.ts:133` | No success toast for archive/restore/delete | 6 | ✅ Killed |
| M35 | `features/boards/view-models/use-boards-view-model.ts:148` | Edit dialog stays open during the request | 2 | ✅ Killed |
| M36 | `features/boards/view-models/use-boards-view-model.ts:155` | Edit `400` reopens without the submitted values (view-model state) | 1 | ✅ Killed |
| M37 | `features/boards/view-models/use-boards-view-model.ts:203` | Delete dialog stays open after confirm | 2 | ✅ Killed |
| M38 | `features/boards/view-models/use-boards-view-model.ts:163` | Edit retry drops the description | 1 | ✅ Killed |
| M39 | `features/boards/components/boards-screen.tsx:38` | Criar quadro shown on Arquivados | 1 | ✅ Killed |
| M40 | `features/boards/components/boards-screen.tsx:89` | `isPending={pendingIds.has(board.id)}` → `false` | 0 | ❌ Survived → Fix 1 |
| M41 | `features/boards/components/boards-screen.tsx:115` | `isPending={isCreating}` → `false` (no "Criando…", no disable) | 0 | ❌ Survived → Fix 1 |
| M42 | `features/boards/components/boards-screen.tsx:125` | Reopened edit dialog shows the board values, not the submitted ones | 0 | ❌ Survived → Fix 1 |
| M43 | `features/boards/components/boards-screen.tsx:147` | Edit dialog not prefilled with the description (a title-only edit then sends `description: null`) | 0 | ❌ Survived → Fix 1 |
| M44 | `features/boards/components/boards-screen.tsx:76` | Empty states swapped | 3 | ✅ Killed |
| M45 | `features/boards/components/board-card.tsx:44` | Archived card shows `createdAt` | 3 | ✅ Killed |
| M46 | `features/boards/components/board-card.tsx:117` | Card menu enabled while pending | 1 | ✅ Killed |
| M47 | `features/boards/components/board-card.tsx:85` | Card links to `/boards/{id}` | 2 | ✅ Killed |
| M48 | `features/boards/components/board-card.tsx:93` | `line-clamp-2` removed from the description | 0 | ❌ Survived → Fix 3 |
| M49 | `features/boards/components/board-form-dialog.tsx:73` | Double-submit guard removed | 1 | ✅ Killed |
| M50 | `features/boards/components/board-form-dialog.tsx:110` | Counter counts the trimmed description | 0 | ❌ Survived → Fix 2 |
| M51 | `features/boards/components/board-form-dialog.tsx:69` | Server errors not shown | 1 | ✅ Killed |
| M52 | `features/boards/components/board-form-dialog.tsx:93` | No "Criando…" label | 1 | ✅ Killed |
| M53 | `features/boards/components/board-form-dialog.tsx:41` | Esc does not close the form dialog | 1 | ✅ Killed |
| M54 | `features/boards/components/delete-board-dialog.tsx:73` | Delete enabled on any text | 3 | ✅ Killed |
| M56 | `pages/boards-page.tsx:10` | Create navigates to `/boards` instead of `/b/{id}` | 1 | ✅ Killed |
| M57 | `shared/i18n/format-date.ts:22` | UTC day instead of local | 1 | ✅ Killed |
| M58 | `shared/ui/menu.tsx:36` | Menu ignores `isDisabled` | 2 | ✅ Killed |
| M59 | `shared/ui/tabs.tsx:27` | Tabs report the old selection | 4 | ✅ Killed |
| M60 | `shared/ui/dialog.tsx:35` | `alertdialog` role dropped | 5 | ✅ Killed |
| M61 | `shared/ui/text-area-field.tsx:38` | Text area error not marked invalid | 3 | ✅ Killed |
| (E1) | `features/boards/view-models/use-boards-view-model.ts:109` | Recarregar invalidates only the active list (M29) | 0 | Equivalent: the query client keeps the default `staleTime: 0` (`src/shared/api/query-client.ts:8-17`), so the archived list refetches whenever its tab is shown again. Probe in the worktree (screen: start on Arquivados, switch to Ativos, archive → `409`, Reload, back to Arquivados) saw `fetches.archived` grow by 1 with and without the mutant. Not counted. |
| (E2) | `features/boards/components/delete-board-dialog.tsx:53` | `isConfirmed` guard in `handleSubmit` removed (M55) | 0 | Equivalent: the only way to submit is the "Excluir definitivamente" button (`type="submit"`, native `disabled` while the name differs) or Enter in the field. HTML implicit submission is blocked when the default button is disabled. Probe in headless Chromium: Enter in a form with a disabled submit button → 0 submits; same form with the button enabled → 1. Defense in depth only. Not counted. |

**Sensor depth**: P0-full (data integrity: edit, archive, restore, delete; 61 manual mutations across validation boundaries, request bodies, every `saveFailureKind` branch, the archived query parameter, optimistic patch/rollback/settle invalidation, pending ids, toasts and their actions, confirmation flows, dialogs, ARIA wiring and the screen composition)
**Result (iteration 1)**: 53/59 killed, 6 survived (2 equivalent mutants excluded) - FAIL ❌
**Iteration 2**: M40-M43, M48, M50 now killed; new N1-N4 killed, N5 survived, N6 equivalent. Cumulative 63/64 killed - FAIL ❌ (N5). See [Iteration 2](#iteration-2).
**Iteration 3**: N5 and M40 killed; new P1-P4 killed. Cumulative 68/68 killed, 3 equivalent - PASS ✅. See [Iteration 3](#iteration-3).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Small modules (`validation.ts` 44 lines, `errors.ts` 56, `queries.ts` 22); one shared optimistic helper for four hooks (`mutations.ts:120-161`); the view-model is the only one in the app and FE-AD-006 allows it for this screen |
| Surgical changes | ✅ Outside the feature: `button.tsx` (+`danger`), `text-field.tsx` (`placeholder`, exported `inputClasses`), `routes.tsx` (placeholder → `BoardsPage`), `foundation.e2e-spec.ts` (+2 lines: stub `/api/v1/boards` for the fake-token test, needed now that `/boards` calls the API), READMEs, ROADMAP, STATE |
| No scope creep | ✅ No colors, ordering, search, pagination or "Desfazer"; delete only from Arquivados; no breadcrumb or shortcuts. Extras are small: a "Salvando…" indicator on pending cards (`board-card.tsx:101-110`) and an `updatedAt` fallback when `archivedAt` is missing (`board-card.tsx:44`) |
| Matches patterns | ✅ Model/api/components/view-model layering (FE-AD-006); TanStack optimistic recipe (FE-AD-009); `shared/ui` wraps React Aria Components; decorative icons `aria-hidden`; texts from i18n keys in both locales (FE-AD-004); tests mirror `src/` (FE-AD-007); oxlint layer rule and Prettier clean |
| Spec-anchored outcome check (asserted values match spec) | ✅ Exact PT/EN strings, request paths and bodies (`{ title }` without `description`, `description: null`), query strings, toast actions, `aria-selected` / `aria-invalid` / `disabled` |
| Per-layer Coverage Expectation met (model 1:1 incl. 0/1/100/101 and 1000/1001; hooks; view-model; components; screen; page; one e2e journey) | ✅ Iteration 3: the screen wiring is tested (M40-M43 killed) and the pending state is checked with two cards, so per-card scoping is covered (N5, P1-P4 killed) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Extras map to Done-when items or edge cases (e.g. `board-card.spec.tsx:136` `updatedAt` fallback, `:145` menu outside the link, `queries.spec.tsx:100` separate caches, `mutations.spec.tsx:258` settle waits for the last change) |
| Documented guidelines followed: `front-end/.specs/STATE.md` (FE-AD-004..-009), root `.specs/STATE.md` | ✅ |

---

## Edge Cases

- [x] Description > 1000 kept, counter "1001 / 1000", submit blocked: `board-form-dialog.spec.tsx:145-156` (M2)
- [x] Spaces-only name → empty: `board-form-dialog.spec.tsx:118-133`, `validation.spec.ts:25` (M3)
- [x] Archiving the last Ativos board → Ativos empty state: `screen.spec:226-254`; e2e `boards.e2e-spec.ts:47`
- [x] Restoring / deleting the last Arquivados board → "Nenhum quadro arquivado": e2e `boards.e2e-spec.ts:53,76` (EN); no unit test at screen level
- [x] `401` on any boards request → no boards toast: `vm.spec:337-353` (create), `:632-644` (archive) (M11, M27, M33)
- [x] Tab switch while a change is in flight: `vm.spec:567-581` retry still archives the same board after switching to Arquivados; patches and rollbacks are keyed by list, not by the shown tab (`mutations.ts:129-154`)

---

## Gate Check

- **Gate command**: `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` (real tree, repo root)
- **Result**: exit 0. oxlint `--deny-warnings` + Prettier clean, `tsc --noEmit` clean, 52 test files / 513 tests passed, 0 failed, 0 skipped; `vite build` OK (JS 630.11 kB, gzip 196.56 kB; Vite warns about a chunk over 500 kB, see observation 1)
- **Full gate**: not run locally (Verifier started no containers). CI run `40396387458` on `main` at `d165846`: job `front-end (test:e2e)` (`121831162263`) `success`, step `pnpm --filter front-end run test:e2e` → `8 passed (51.2s)` (6 foundation + 1 auth + 1 boards). All other front-end jobs (`lint`, `typecheck`, `test`, `build`) `success`; `back-end (test:e2e)` was still running when checked. Static check: `boards.e2e-spec.ts` makes 1 `/api/v1/auth/*` call (sign-up at `:20`) and asserts `authCalls` `toHaveLength(1)` at `:77`
- **Test count before feature**: 311 unit/component (Vitest at `7b72e08` in the scratch worktree: 33 files / 311 tests; no dependency changed in the range) + 7 e2e
- **Test count after feature**: 513 unit/component + 8 e2e
- **Delta**: +202 unit/component, +1 e2e; no test deleted (`git diff --numstat 7b72e08..d165846 -- front-end/test` has no removed lines). No assertion weakened
- **Skipped tests**: none
- **Failures**: none

---

## Observations (non-blocking)

1. Bundle: the main JS chunk grew from 477 kB (auth) to 630 kB and now triggers Vite's 500 kB warning. Not a gate failure; worth a code-split once the board view lands.
2. FBRD-37 with overlapping changes: the rollback writes back the whole snapshot, so a failed first change can bring back a second board still in flight until the settle refetch. Already recorded as an open P1 item in `front-end/.specs/STATE.md`.
3. `400` whose `errors[]` lists only unknown fields: `mapBoardServerErrors` returns `null`, so create keeps the modal open with no message and no toast (`use-boards-view-model.ts:79-85`), and edit reopens with no message. The spec does not cover this case.
4. The PT heading "Meus quadros" and the PT tab labels are asserted only through the EN screen tests plus the locale-parity test; the PT strings exist in `pt-BR.ts:7,78-79`.
5. A retried edit that then answers `400` goes through `runChange` → `notifyFailure` and shows the generic save toast instead of reopening the dialog (`use-boards-view-model.ts:162-168`). Spec-silent.
6. FBRD-20 "button enabled again": `isCreating` returning to `false` is asserted only in the `401` test (`vm.spec:346-348`); the `500` test (`:288-310`) does not assert it. M28 is still killed.

---

## Fix Plans

Status after iteration 3: Fix 1-4 ✅ resolved. Fix 1-3 by `27ca400`, `4208d8a`, `96e2485` (PR #178); Fix 4 by `9224d2a` (PR #180). Every target mutant is killed. No open fix.

### Fix 1: Cover the BoardsScreen wiring (M40, M41, M42, M43) - ✅ Resolved in iteration 2

- **Root cause**: `boards-screen.spec.tsx` tests layout and state switches but never drives a change, a create in flight or an edit through the screen, so the props it passes to `BoardCard` and `BoardFormDialog` are unprotected. The worst case (M43) is data loss: an edit that only changes the name would send `description: null`.
- **Fix task**: In `front-end/test/unit/features/boards/components/boards-screen.spec.tsx` (renderApp + MSW) add:
  1. Edit a board with a description: the dialog shows its title and description and the matching counter; changing only the name sends `PATCH` with the original description (kills M43).
  2. Edit answering `400` with `errors[]`: the reopened dialog shows the submitted values and the field message (kills M42).
  3. Archive with a held response: that card's "Board actions" button has `disabled` until the response (kills M40).
  4. Create with a held response: the submit button reads "Creating…" and is disabled (kills M41).
- **Done when**: each new test fails with its mutant applied and passes on `main`; build gate green.
- **Priority**: Major (M43), Minor (others)

### Fix 2: Counter counts the raw description (M50) - ✅ Resolved in iteration 2

- **Fix task**: In `board-form-dialog.spec.tsx`, type a description with surrounding spaces (e.g. `'  ab  '`) and assert `'6 / 1000'`. Done when M50 is killed; gate green.
- **Priority**: Minor

### Fix 3: Assert the 2-line clamp (M48) - ✅ Resolved in iteration 2

- **Fix task**: In `board-card.spec.tsx:87-93`, assert the description element has the `line-clamp-2` class. Done when M48 is killed; gate green.
- **Priority**: Cosmetic

### Fix 4: Scope the pending menu to its own card (N5) - ✅ Resolved in iteration 3

- **Root cause**: `boards-screen.spec.tsx:334-355` renders one board, so `isPending={pendingIds.size > 0}` (every card locked while any change is in flight) passes. FBRD-42 disables "that card's" menu, and the spec allows one change per card at a time, so the other cards must stay usable.
- **Fix task**: In that test, respond with two active boards (e.g. `[travel, roadmap]`), hold the `PATCH` for Roadmap, and assert Roadmap's `Board actions` button is disabled while Travel's is not (scope with `within(...)` on each list item / link).
- **Done when**: the test fails with N5 applied (`boards-screen.tsx:89` → `pendingIds.size > 0`) and passes on `main`; build gate green.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FBRD-01..03, FBRD-05..15, FBRD-17, FBRD-19..22, FBRD-24..40 | Pending | ✅ Verified (iteration 1) |
| FBRD-04, FBRD-16, FBRD-18, FBRD-23, FBRD-41 | ❌ Needs Fix (iteration 1) | ✅ Verified (iteration 2) |
| FBRD-42 | ❌ Needs Fix (iteration 2: N5, Fix 4) | ✅ Verified (iteration 3) |

Iteration 3 is the passing iteration: `spec.md`'s traceability table now shows `Verified` for FBRD-01..FBRD-42.

---

## Summary

### Iteration 3

**Overall**: ✅ Ready

**Spec-anchored check**: 42/42 ACs matched the spec outcome and are discriminating, 0 spec-precision gaps
**Sensor**: iteration 3: 6/6 killed (N5, M40 re-run; P1-P4 new); cumulative 68/68 killed, 3 equivalent
**Gate**: 519 unit/component passed; 8 e2e passed in CI run `40405069344` on `57943e8`

**What works now**: a change in flight locks only its own card's menu, and the screen test proves it with a second card that stays usable.

**Issues found**: none. Observations 1-6 stay non-blocking.

**Next steps**: commit this report and the `spec.md` status update as one docs commit; the boards feature is done.

### Iteration 2 (history)

**Overall**: ❌ Not Ready (one Minor test gap)

**Spec-anchored check**: 42/42 ACs matched the spec outcome, 0 spec-precision gaps; 41/42 fully discriminating, FBRD-42 weak (N5)
**Sensor**: iteration 2: 10/11 killed (6/6 former survivors, 4/5 new), 1 equivalent; cumulative 63/64 killed
**Gate**: 519 unit/component passed (+6); 8 e2e passed in CI run `40403138879` on `522bf47`

**What works now**: the screen layer drives edit prefill, title-only edit keeping the description, the reopened edit dialog after `400`, the pending card menu and the in-flight create button; the counter counts raw input; the clamp is asserted.

**Issues found**: N5: a card menu locks for any pending change, not only its own (Fix 4).

**Next steps**: apply Fix 4 as one small test-only PR, then re-run the Verifier (iteration 3 of 3, the last before escalating to the user).

### Iteration 1 (history)

**Overall**: ❌ Not Ready (test gaps only)

**Spec-anchored check**: 42/42 ACs matched the spec outcome, 0 spec-precision gaps; 6 ACs weak (surviving mutants)
**Sensor**: 53/59 mutations killed, 6 survived (2 equivalent excluded)
**Gate**: 513 unit/component passed; 8 e2e passed in CI run `40396387458`

**What works**: Tabs in the URL with the archived filter; exact validation boundaries and request bodies; optimistic edit/archive/restore/delete with per-list rollback and a settle refetch that waits for the last change; every failure branch (`409` Recarregar, `404` refetch without a button, network/`5xx` retry that survives a tab switch, `400 errors[]` back into the form, `401` silent); typed-name delete confirmation; dates per locale; ARIA wiring of the new primitives; one e2e journey within the auth throttle.

**Issues found**: 6 surviving mutants: 4 in the `BoardsScreen` wiring (Fix 1), the raw counter (Fix 2), the description clamp (Fix 3).

**Next steps**: Apply Fix 1-3 as one test-only PR, then re-run the Verifier (iteration 2 of 3).
