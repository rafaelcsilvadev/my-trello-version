# Settings Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `front-end/.specs/features/settings/spec.md`
**Design**: `front-end/.specs/features/settings/design.md`
**Status**: Approved

Skill scripts for this app run with `--root front-end`. `pnpm` commands run at the repository root with `--filter front-end` unless stated. Every React Aria Components and `lucide-react` API is checked against the installed package's types before use. Each task that adds UI text adds its keys under `nav.shortcuts`, `settings.language.*`, `settings.theme.*` or `settings.shortcuts.*` to `src/shared/i18n/locales/en.ts` and `pt-BR.ts` in the same commit (texts from `design/i18n.js` and the design's data-model section, FE-AD-004). Tests live in `front-end/test/unit/` mirroring `src/`, and e2e in `front-end/test/e2e/` (FE-AD-007). One task per branch and PR; the next task starts only after the review. The spec, design and tasks docs go in their own PR, merged before T1.

---

## Test Coverage Matrix

> Generated from FE-AD-005, FE-AD-006, FE-AD-007, FE-AD-011, the approved design and the spec; confirmed lessons L-001, L-011, L-018 applied (L-017 does not apply: no toast action). Existing tests sampled for style: `test/unit/pages/settings-page.spec.tsx`, `test/unit/pages/protected-layout.spec.tsx`, `test/unit/shared/theme/theme-controller.spec.tsx`, `test/unit/shared/i18n/language-controller.spec.tsx`, `test/unit/shared/keyboard/use-shortcut.spec.tsx`, `test/unit/shared/ui/dialog.spec.tsx`, `test/e2e/foundation.e2e-spec.ts`. Guidelines found: none beyond the decisions above - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `shared/` (ui, preferences, responsive) | unit (Testing Library, `renderHook`) | Every branch: modal attribute present, hook value follows `matchMedia` and its `change` event, provider returns the store and throws outside | `front-end/test/unit/shared/**/*.spec.ts(x)` | `pnpm --filter front-end test` |
| `features/settings/model/` | unit | Row list complete and ordered, one source for both views | `front-end/test/unit/features/settings/model/*.spec.ts` | `pnpm --filter front-end test` |
| `features/settings/view-models/` | unit (`renderHook` in app providers + stubbed viewport) | Every value and action; `?` guards (typing, Ctrl/Meta/Alt, other modal, phone); resize closes | `front-end/test/unit/features/settings/view-models/*.spec.tsx` | `pnpm --filter front-end test` |
| `features/settings/components/` | unit (Testing Library, plain props; composed screen with `renderApp`) | Every AC the component owns: roles, accessible names, PT-BR and EN texts, arrow keys, visibility per viewport, focus return, icon identity (L-011); the composed screen asserts every prop it passes down (L-001) | `front-end/test/unit/features/settings/components/*.spec.tsx` | `pnpm --filter front-end test` |
| `pages/`, layout | unit | Panel order on `/settings`; the layout shows the button before the Settings link on desktop only | `front-end/test/unit/pages/*.spec.tsx` | `pnpm --filter front-end test` |
| Running app (real browser) | e2e (Playwright, Chromium) | Switch language and theme and keep them after a reload; `?` opens and Esc closes the dialog; no keyboard icon at phone width | `front-end/test/e2e/settings.e2e-spec.ts` | `pnpm --filter front-end test:e2e` |
| Docs | none | Build gate | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Inner TDD loop only | `pnpm --filter front-end test` |
| Build | End of every task (lint and types count) | `pnpm --filter front-end lint && pnpm --filter front-end typecheck && pnpm --filter front-end test && pnpm --filter front-end build` |
| Full | Tasks that touch e2e | build gate `&& pnpm --filter front-end test:e2e` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. One task per branch/PR, each PR reviewed before the next task starts.

### Phase 1: Shared building blocks

```
T1 → T2 → T3
```

### Phase 2: Settings screen

```
T3 → T4 → T5
```

### Phase 3: Shortcuts dialog

```
T5 → T6 → T7
```

### Phase 4: Delivery

```
T7 → T8 → T9
```

---

## Task Breakdown

### T1: Shared dialog is modal to shortcuts

**What**: The shared `Dialog` renders its section with `aria-modal="true"` (same render trick as the card detail), so `useShortcut` ignores keys under every dialog. Record `FE-AD-014`.
**Where**: `front-end/src/shared/ui/dialog.tsx`
**Depends on**: None
**Reuses**: The `render` prop pattern of `card-detail.tsx:56`; `useShortcut`
**Requirement**: FSET-18, FSET-20, FSET-25

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: an open `Dialog` has an element with `role="dialog"` and `aria-modal="true"`; a closed one has none (red first)
- [x] Unit: with a `Dialog` open, `useShortcut('x', …)` does not fire on `x`; after it closes, it fires
- [x] Existing `dialog.spec.tsx` and every spec that opens a dialog still pass; no shortcut test relied on firing under a dialog
- [x] `FE-AD-014` appended to `front-end/.specs/STATE.md` (shared `Dialog` sets `aria-modal`; single-key shortcuts stay quiet under every dialog)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `fix(front-end): mark the shared dialog as aria-modal`

---

### T2: Viewport hook and test helper

**What**: `useMediaQuery(query)` over `matchMedia` with a `change` listener, `DESKTOP_QUERY`, and the `mockViewport` test helper.
**Where**: `front-end/src/shared/responsive/use-media-query.ts`
**Depends on**: T1
**Reuses**: `useSyncExternalStore`; the `mockDevice` shape of `theme-controller.spec.tsx`
**Requirement**: FSET-12, FSET-15, FSET-19, FSET-22

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit (`renderHook`): the hook returns `matches` of the stubbed query, re-renders when the `change` event flips it both ways, and removes its listener on unmount
- [x] `DESKTOP_QUERY` equals `(min-width: 48rem)`
- [x] `test/support/match-media.ts` exports `mockViewport(isDesktop)` returning `{ setDesktop(next) }`, used by the hook's own tests
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): add a reactive viewport hook`

---

### T3: Preferences context

**What**: `PreferencesProvider` and `usePreferencesStore()` in `shared/preferences/`, wired into `App` next to `SessionProvider`.
**Where**: `front-end/src/shared/preferences/preferences-context.tsx`
**Depends on**: T2
**Reuses**: `session-context.tsx`; `app.tsx`
**Requirement**: FSET-03, FSET-06 (enabler)

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [x] Unit: `usePreferencesStore` returns the exact store given to the provider, and throws `usePreferencesStore must be used inside <PreferencesProvider>` outside it
- [x] Unit: inside `renderApp`, a probe component reads the same store instance as the services (`services.preferences`)
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): expose the preferences store to components`

---

### T4: Language and theme panels

**What**: `usePreferencesViewModel`, `PreferencePanel`, the Idioma and Tema panels and their i18n keys, added to `SettingsPage` above the session panel.
**Where**: `front-end/src/features/settings/components/preference-panel.tsx`
**Depends on**: T3
**Reuses**: `SegmentedTabs`, `usePreferences`, the `SessionSection` panel classes, `LanguageController`, `ThemeController`
**Requirement**: FSET-02, FSET-03, FSET-04, FSET-05, FSET-06, FSET-07, FSET-08, FSET-09, FSET-10, FSET-24

**Tools**:

- MCP: `codegraph`, `context7`
- Skill: `accessibility`

**Done when**:

- [x] Unit (composed with `renderApp` on `/settings`): the Idioma panel shows **Português (Brasil)** and **English** with the current language selected; clicking the other one changes the headings to that language and sets `lang` on the root element at once, and `localStorage['my-trello.language']` holds it (FSET-02, 03, 04)
- [x] Unit: the Tema panel shows **Claro**, **Escuro**, **Sistema** and the subtitle "Sistema segue o aparelho." (EN: "System follows your device."), with the stored preference selected; clicking **Escuro** sets `data-theme="dark"` and `localStorage['my-trello.theme']` (FSET-05, 06, 07)
- [x] Unit: with theme **Sistema** and a device that prefers dark, `data-theme` is `dark`; flipping the device to light flips it back (FSET-08)
- [x] Unit: ArrowRight on the selected option selects the next one and applies it (FSET-09)
- [x] Unit: with a `localStorage` that throws on write, a choice still applies and the control shows it (FSET-10)
- [x] Unit: stored values `xx` and `blue` make the controls show **English** and **Sistema** (FSET-24)
- [x] The composed page asserts every prop it passes to `PreferencePanel` (L-001); the view-model returns the store's current values after each change
- [x] Locale parity test passes with the new `settings.language.*` and `settings.theme.*` keys
- [x] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): choose language and theme on the settings screen`

---

### T5: Shortcuts panel

**What**: The `SHORTCUTS` rows, `ShortcutList`, `ShortcutsPanel` (desktop only) and its i18n keys, placed between Tema and Sessão on `SettingsPage`.
**Where**: `front-end/src/features/settings/components/shortcuts-panel.tsx`
**Depends on**: T4
**Reuses**: `useMediaQuery`, `DESKTOP_QUERY`, the panel classes of T4; `kbd` styling from the Púrpura tokens
**Requirement**: FSET-01, FSET-11, FSET-12, FSET-13

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit (model): `SHORTCUTS` lists `new`, `search`, `escape`, `move`, `help` in that order, with the keys `N`, `/`, `Esc`, translated space key, `?`
- [ ] Unit (desktop viewport): the panel titled **Atalhos de teclado** shows five rows, each a `kbd` with its description in PT-BR (FSET-11)
- [ ] Unit (phone viewport): the panel is not in the document (FSET-12)
- [ ] Unit: switching the language to English shows the English descriptions and `Space` instead of `Espaço` at once (FSET-13)
- [ ] Unit (composed `/settings`, desktop): headings in the order Idioma, Tema, Atalhos de teclado, Sessão (FSET-01); on a phone, Idioma, Tema, Sessão
- [ ] Locale parity test passes with the new `settings.shortcuts.*` keys
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): list the keyboard shortcuts on the settings screen`

---

### T6: Shortcuts dialog state and the `?` key

**What**: `useShortcutsDialog` with `isDesktop`, `isOpen`, `open`, `close`, the `?` shortcut and the close-on-resize effect.
**Where**: `front-end/src/features/settings/view-models/use-shortcuts-dialog.ts`
**Depends on**: T5
**Reuses**: `useShortcut`, `useMediaQuery`, `mockViewport`
**Requirement**: FSET-17, FSET-18, FSET-19, FSET-20, FSET-22

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] Unit (`renderHook`, desktop): pressing `?` on `document` sets `isOpen` true (FSET-17)
- [ ] Unit: `?` does nothing while the target is an `input`, with Ctrl, Meta or Alt held, and while an element with `aria-modal="true"` exists (FSET-18)
- [ ] Unit (phone): `?` does nothing and `isDesktop` is false (FSET-19)
- [ ] Unit: pressing `?` again while `isOpen` is true leaves one open state, and `close` sets it false (FSET-20)
- [ ] Unit: flipping the viewport to phone while open sets `isOpen` false; flipping back to desktop does not reopen it (FSET-22)
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): open the shortcuts dialog state with the ? key`

---

### T7: Shortcuts dialog and top-bar button

**What**: `ShortcutsDialog` (title, rows, hint, **Fechar**), `ShortcutsButton` (`Keyboard` icon, desktop only) and its wiring in `ProtectedLayout` before the Settings link.
**Where**: `front-end/src/features/settings/components/shortcuts-button.tsx`
**Depends on**: T6
**Reuses**: `Dialog`, `Button`, `ShortcutList`, `useShortcutsDialog`, the icon link classes of `protected-layout.tsx`
**Requirement**: FSET-14, FSET-15, FSET-16, FSET-21, FSET-23, FSET-25

**Tools**:

- MCP: `codegraph`, `context7`
- Skill: `accessibility`

**Done when**:

- [ ] Unit (desktop, `renderApp` on `/boards`, `/settings` and a board): a button named "Atalhos de teclado" with the `Keyboard` icon (identity asserted, L-011) sits before the Settings link on every protected screen (FSET-14)
- [ ] Unit (phone): no such button (FSET-15)
- [ ] Unit: clicking the button opens a dialog titled **Atalhos de teclado** with the five rows and the hint "Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela" (FSET-16)
- [ ] Unit: Esc closes it and focus is back on the button; **Fechar** does the same; after opening with `?` from a focused element, closing returns focus to that element (FSET-21)
- [ ] Unit: switching the language with the dialog open shows the new language in it (FSET-23)
- [ ] Unit: with the card detail open, `?` opens nothing (FSET-25)
- [ ] The layout test asserts the button position and that `ProtectedLayout` passes no extra props (L-001)
- [ ] Locale parity test passes with `nav.shortcuts`, `settings.shortcuts.hint` and `settings.shortcuts.close`
- [ ] Build gate passes; test count only grows

**Tests**: unit
**Gate**: build

**Commit**: `feat(front-end): open the keyboard shortcuts dialog from the top bar`

---

### T8: Settings e2e

**What**: Playwright flow on the real app: switch language and theme, reload, open and close the dialog with `?`, check the phone viewport.
**Where**: `front-end/test/e2e/settings.e2e-spec.ts`
**Depends on**: T7
**Reuses**: The login and token setup of `foundation.e2e-spec.ts` and `labels.e2e-spec.ts`
**Requirement**: FSET-03, FSET-04, FSET-06, FSET-07, FSET-15, FSET-17, FSET-21

**Tools**:

- MCP: `codegraph`
- Skill: NONE

**Done when**:

- [ ] e2e: pick **English** and **Dark**; headings are English and `html[data-theme=dark]`; after a reload both hold
- [ ] e2e: press `?` on `/boards` and the dialog shows; Esc closes it
- [ ] e2e: at 390 px width the keyboard icon and the shortcuts panel are absent
- [ ] Full gate passes; test count only grows

**Tests**: e2e
**Gate**: full

**Commit**: `test(front-end): cover the settings screen end to end`

---

### T9: Docs and handoff

**What**: README (EN and PT) section for settings and the shortcuts, status lines, roadmap row 6 set to Done, STATE handoff.
**Where**: `README.md`
**Depends on**: T8
**Reuses**: The labels documentation task (T18) of the previous feature
**Requirement**: FSET-01 (documented)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `README.md` and `README.PT.md` describe language, theme, the shortcuts panel and the `?` dialog, and the work-in-progress line no longer says settings comes next
- [ ] `front-end/.specs/ROADMAP.md` row 6 reads Done; `front-end/.specs/STATE.md` handoff names the feature as done with its task count
- [ ] Build gate passes

**Tests**: none
**Gate**: build

**Commit**: `docs(front-end): document the settings screen`

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | none | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Shared dialog is modal | `shared/` | unit | unit | ✅ OK |
| T2: Viewport hook | `shared/` | unit | unit | ✅ OK |
| T3: Preferences context | `shared/` | unit | unit | ✅ OK |
| T4: Language and theme panels | `features/settings/view-models/`, `components/`, `pages/` | unit | unit | ✅ OK |
| T5: Shortcuts panel | `features/settings/model/`, `components/`, `pages/` | unit | unit | ✅ OK |
| T6: Dialog state and `?` | `features/settings/view-models/` | unit | unit | ✅ OK |
| T7: Dialog and button | `features/settings/components/`, layout | unit | unit | ✅ OK |
| T8: Settings e2e | running app | e2e | e2e | ✅ OK |
| T9: Docs | docs | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| FSET-01 | T5 |
| FSET-02 to FSET-10 | T4 |
| FSET-03, 04, 06, 07 | T8 (e2e) |
| FSET-11 to FSET-13 | T5 |
| FSET-14 to FSET-16 | T7 |
| FSET-15, 17, 21 | T8 (e2e) |
| FSET-17 to FSET-20, FSET-22 | T6 (FSET-18, 20, 25 also enabled by T1) |
| FSET-21, FSET-23, FSET-25 | T7 |
| FSET-24 | T4 |

All 25 requirements map to at least one task.
