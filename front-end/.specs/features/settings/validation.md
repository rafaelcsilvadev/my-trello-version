# Settings Validation

**Date**: 2026-11-04
**Spec**: `front-end/.specs/features/settings/spec.md`
**Diff range**: `2a4d3f8^..HEAD` (`2a4d3f8` settings spec docs through `e7060a5`, branch `feat/settings-T9`, front-end paths only: 32 files, +1429/-15)
**Verifier**: independent sub-agent (author != verifier)

## Validation: PASS

Result: PASS. All 25 FSET requirements have a `file:line` assertion on the spec-defined value. Gate green (lint, typecheck, 2106 unit tests, build, 47 e2e). Sensor: 9 mutants run (including 1 compound), 8 killed, 1 survived as a semantically equivalent mutant (M1; its compound M1b is killed). Three minor, non-blocking gaps are listed at the end.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T9 | Done | All "Done when" boxes `[x]` in `tasks.md` (9 tick commits `9125a23`..`e7060a5`) |

## Gate

| Step | Result |
| ---- | ------ |
| `pnpm --filter front-end lint` | exit 0 |
| `pnpm --filter front-end typecheck` | exit 0 |
| `pnpm --filter front-end test` | 2106 passed, 0 failed, 0 skipped |
| `pnpm --filter front-end build` | exit 0 (chunk-size warning only) |
| `pnpm --filter front-end test:e2e` | 47 passed (3 from `settings.e2e-spec.ts`) |

Test integrity: no test deleted in the range (diff is additive except 15 changed lines); `protected-layout.spec.tsx` and `settings-page.spec.tsx` were extended, not weakened.

---

## Spec-Anchored Acceptance Criteria

Paths under `front-end/test/`. Unit tests render in PT-BR unless noted.

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FSET-01 | Panel order Idioma, Tema, Atalhos (desktop), Sessão | `unit/features/settings/components/shortcuts-panel.spec.tsx:113` `expect(h2s()).toEqual(['Idioma','Tema','Atalhos de teclado','Sessão'])`; phone `:120` without Atalhos | PASS |
| FSET-02 | Options PT-BR/English, current selected | `unit/pages/settings-page.spec.tsx:104-105` `expect(selected('Português (Brasil)')).toBe('true')` / `selected('English')` `'false'`; tablist named `:103` | PASS |
| FSET-03 | Every text changes at once, no reload | `unit/pages/settings-page.spec.tsx:116-122` h1 `Settings`, h2 `Language`, `lang` `'en'` after click; `unit/features/settings/components/shortcuts-panel.spec.tsx:87-106` panel texts in EN | PASS |
| FSET-04 | Stored under `my-trello.language` | `unit/pages/settings-page.spec.tsx:123` `expect(localStorage.getItem('my-trello.language')).toBe('en')`; reload `e2e/settings.e2e-spec.ts:43-48` | PASS |
| FSET-05 | Claro/Escuro/Sistema, current selected, subtitle | `unit/pages/settings-page.spec.tsx:134-138` (`Sistema segue o aparelho.` at `:135`, `selected('Claro')` `'true'`); EN subtitle `:145` | PASS |
| FSET-06 | `data-theme` applied at once | `unit/pages/settings-page.spec.tsx:157` `expect(document.documentElement.dataset.theme).toBe('dark')`; `e2e/settings.e2e-spec.ts:36` | PASS |
| FSET-07 | Stored under `my-trello.theme` | `unit/pages/settings-page.spec.tsx:158` `expect(localStorage.getItem('my-trello.theme')).toBe('dark')`; reload `e2e/settings.e2e-spec.ts:44` | PASS |
| FSET-08 | Sistema follows device dark mode | `unit/pages/settings-page.spec.tsx:168` `toBe('dark')`, then `:170` `toBe('light')` after `device.setDark(false)` | PASS |
| FSET-09 | Arrow key selects neighbor | `unit/pages/settings-page.spec.tsx:180-183` `keyDown ArrowRight` -> `selected('Escuro')` `'true'` and `data-theme` `'dark'` | PASS |
| FSET-10 | Choice applies when storage unavailable | `unit/pages/settings-page.spec.tsx:187-198` `setItem` throws; `data-theme` `'dark'` and `selected('Escuro')` `'true'` | PASS |
| FSET-11 | Five rows `N`, `/`, `Esc`, `Espaço`, `?` with descriptions | `unit/features/settings/components/shortcuts-panel.spec.tsx:53` keys `toEqual(['N','/','Esc','Espaço','?'])`, `:57-63` descriptions; order/keys in `unit/features/settings/model/shortcuts.spec.ts:6-16` | PASS |
| FSET-12 | No panel under 48rem | `unit/features/settings/components/shortcuts-panel.spec.tsx:70-73` heading `null`, `:73` `document.querySelector('kbd')` `null`; `e2e/settings.e2e-spec.ts:91-93` | PASS |
| FSET-13 | Descriptions and `Space` in new language at once | `unit/features/settings/components/shortcuts-panel.spec.tsx:93-106` keys include `'Space'`, descriptions in EN | PASS |
| FSET-14 | Keyboard icon button on desktop, before Settings icon | `unit/features/settings/components/shortcuts-button.spec.tsx:90` `button.querySelector('svg.lucide-keyboard')` not null at `/boards`, `/settings`, `/b/{id}`; `unit/pages/protected-layout.spec.tsx:34` `expect(button.nextElementSibling).toBe(settings)` | PASS |
| FSET-15 | No icon under 48rem | `unit/features/settings/components/shortcuts-button.spec.tsx:97-99` `queryByRole('button',{name:'Atalhos de teclado'})` `toBeNull()`; `e2e/settings.e2e-spec.ts:88-90` | PASS |
| FSET-16 | Click opens dialog with five rows + hint | `unit/features/settings/components/shortcuts-button.spec.tsx:111-122` kbd list `toEqual([...])`, five descriptions, `getByText(HINT_PT)`, `Fechar` button | PASS |
| FSET-17 | `?` opens the same dialog | `unit/features/settings/view-models/use-shortcuts-dialog.spec.tsx:37` `isOpen` `toBe(true)`; integration `unit/features/settings/components/shortcuts-button.spec.tsx:156-159` `keyDown '?'` -> dialog named `Atalhos de teclado`; `e2e/settings.e2e-spec.ts:65-68` | PASS |
| FSET-18 | No open while typing or with Ctrl/Meta/Alt | `unit/features/settings/view-models/use-shortcuts-dialog.spec.tsx:46` (input) and `:56` (`it.each` ctrl/meta/alt) `isOpen` `toBe(false)` | PASS (hook level only; guard code is shared `useShortcut`) |
| FSET-19 | No open under 48rem | `unit/features/settings/view-models/use-shortcuts-dialog.spec.tsx:74-75` `isDesktop` and `isOpen` `toBe(false)`; `e2e/settings.e2e-spec.ts:95-97` `getByRole('dialog')` count 0 | PASS |
| FSET-20 | No second dialog while open | `unit/features/settings/view-models/use-shortcuts-dialog.spec.tsx:60-66` open `aria-modal` blocks `?`; `unit/shared/ui/dialog.spec.tsx` asserts the shared Dialog renders `aria-modal` and quiets single-key shortcuts (killed M4); the `:78-87` test alone is weak (see gaps) | PASS (indirect) |
| FSET-21 | Esc/Fechar close, focus returns | `unit/features/settings/components/shortcuts-button.spec.tsx:134-135` and `:147-148` `expect(document.activeElement).toBe(button)`; `?` path `:163` `toBe(link)`; `e2e/settings.e2e-spec.ts:70-72` | PASS |
| FSET-22 | Dialog closes when viewport drops below 48rem | `unit/features/settings/view-models/use-shortcuts-dialog.spec.tsx:102-106` `isOpen` `toBe(false)` after `setDesktop(false)` and stays false after return | PASS (hook level only) |
| FSET-23 | Dialog changes language while open | `unit/features/settings/components/shortcuts-button.spec.tsx:173-182` dialog `Keyboard shortcuts`, `Show shortcuts`, `Close`, kbd contains `Space` | PASS |
| FSET-24 | Unknown stored values fall back to English/Sistema | `unit/pages/settings-page.spec.tsx:210-211` `selected('English')` and `selected('System')` `'true'` | PASS |
| FSET-25 | `?` with card detail open opens nothing | `unit/features/settings/components/shortcuts-button.spec.tsx:198-200` `queryByRole('dialog',{name:'Atalhos de teclado'})` `toBeNull()` and `getAllByRole('dialog')` length 1 | PASS |

Spec-precision gaps: none (every AC states exact texts or attribute values).

## Edge cases and Success Criteria

- Edge cases: FSET-23, FSET-24, FSET-25 above, all PASS.
- "No hardcoded text; PT/EN keys match": existing i18n key-parity test passes inside the 2106 unit tests (settings keys added to both `pt-BR.ts` and `en.ts`).
- "Every requirement has a test that fails when its behavior is removed": confirmed for 8 of the 25 by the sensor below; the rest by the assertions above.

---

## Discrimination Sensor

Isolated temporary git worktree (`scratchpad/wt`, detached at HEAD) with `node_modules` symlinked and `vitest` called directly (no `pnpm`). Worktree removed afterwards, `git worktree list` shows only the real tree, `git status --porcelain` of the real tree identical to the baseline, `find */node_modules -maxdepth 2 -xtype l` empty. Baseline in the worktree: 361 passed in the 46 settings, pages and shared files run.

| # | Fault (file) | Targets | Result |
| - | ------------ | ------- | ------ |
| M1 | `useShortcut('?', open, { enabled: true })` (`src/features/settings/view-models/use-shortcuts-dialog.ts`) | FSET-19 | SURVIVED, equivalent: the render-time `if (!isDesktop && isOpen) setIsOpen(false)` and `ShortcutsButton` returning `null` mask it, so no behavior differs |
| M1b | M1 plus remove the phone-close guard | FSET-19, FSET-22 | KILLED (`does nothing on a phone (FSET-19)`, `closes when the viewport turns phone... (FSET-22)`) |
| M2 | Remove the phone-close guard | FSET-22 | KILLED (1 test) |
| M3 | Remove `if (!isDesktop) return null` (`shortcuts-panel.tsx`) | FSET-12 | KILLED (2 tests) |
| M4 | Remove `aria-modal="true"` (`src/shared/ui/dialog.tsx`) | FSET-20, FSET-25 guard | KILLED (2 tests in `dialog.spec.tsx`) |
| M5 | `setLanguage('pt-BR')` instead of the chosen id (`language-panel.tsx`) | FSET-03, FSET-04 | KILLED (2 tests) |
| M6 | `/` key label changed to `S` (`model/shortcuts.ts`) | FSET-11, FSET-16 | KILLED (4 tests) |
| M7 | Remove `<ShortcutsButton />` (`pages/protected-layout.tsx`) | FSET-14, FSET-16, FSET-21 | KILLED (8 tests) |
| M8 | `setTheme('light')` instead of the chosen id (`theme-panel.tsx`) | FSET-06, FSET-07, FSET-09, FSET-10 | KILLED (3 tests) |

Totals: 9 injected, 8 killed, 1 survived (equivalent, no fix task).

---

## Code Quality Check

- Scope: only `features/settings`, layout/page composition, i18n keys, `Dialog` aria-modal fix, `PreferencesProvider`, `useMediaQuery` and test support; no unrelated files.
- Follows existing patterns (view-model hooks, feature `index.ts`, no cross-feature imports; `pages` compose `features/auth` and `features/settings`).
- Tests are in `front-end/test/`, apart from `src/`.

## Gaps (non-blocking, ranked)

All three closed in PR #448 (`test/settings-verify-gaps`).

1. FSET-20, **closed**. The hook test that could not fail (`use-shortcuts-dialog.spec.tsx`, "keeps one open state on a second ?") was replaced by "closes with close". `shortcuts-button.spec.tsx` now presses `?` with the shortcuts dialog open and asserts a single `dialog`.
2. FSET-18 and FSET-22, **closed**. `shortcuts-button.spec.tsx` now types `?` in a real `<input>` (no dialog) and shrinks the viewport with the rendered dialog open (dialog closes). These tests passed on first run (behavior already existed); no mutation run against them.
3. Dialog width 420 px, **closed**. The shared `Dialog` has `size="narrow"` (`w-105`, 420 px); the shortcuts dialog uses it. `dialog.spec.tsx` asserts the class for both sizes (jsdom has no layout).
