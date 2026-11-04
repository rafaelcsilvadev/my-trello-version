# Settings Specification

## Problem Statement

The `/settings` route already renders the **Sessão** panel (feature `auth`), but the user cannot change the language or the theme from the screen, cannot read the keyboard shortcuts, and the `?` key does nothing. The preferences store, the theme and language controllers and the `useShortcut` hook exist; no UI uses them yet. Feature `settings` (6) finishes the screen from the prototype (doc §9) and adds the shortcuts dialog (doc §11) to the top bar.

## Goals

- [ ] A user switches the language between Português (Brasil) and English on the settings screen and every text changes at once, with no reload.
- [ ] A user switches the theme between Claro, Escuro and Sistema and the app repaints at once.
- [ ] Both choices survive a reload.
- [ ] A desktop user reads the five shortcuts on the settings screen and in a dialog opened by the top-bar keyboard icon or the `?` key.
- [ ] A phone user sees neither the shortcuts panel nor the keyboard icon.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| The **Sessão** panel (name, e-mail, **Sair**) | Delivered by feature `auth` (`SessionSection`); this feature only keeps it on the page and in order |
| Storing language or theme on the server | FE-AD-003 keeps preferences in `localStorage`; the API has no preferences endpoint |
| Remapping or disabling shortcuts | Not in the prototype |
| New shortcuts | The five of doc §11 are the whole list |
| Language detection from the browser | The store default stays English (`parseLanguage`); not in the prototype |
| Keyboard-icon or `?` on the login and signup screens | Those screens are outside the protected layout; the prototype shows the icon only inside the app |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where `?` and the keyboard icon work | Every screen of the protected layout (boards, board, labels, settings), desktop only | User choice (A): one place in the layout; the dialog also works on `/b/{id}/labels` | y |
| What "desktop" means | Viewport width ≥ 48rem, the same `(min-width: 48rem)` query the board uses for the side-by-side columns (`SIDE_BY_SIDE`) | User choice (A): no new breakpoint; the phone layout switches at the same width | y |
| Shortcut rows | `N` New task in the first column · `/` Search this board · `Esc` Close the innermost layer · `Space` (EN) / `Espaço` (PT-BR) Pick up and drop the focused card, column or item · `?` Show shortcuts | Doc §11 and prototype `shortcutRows` | y |
| Same list in both places | The settings panel and the dialog render the same rows from one source; the dialog adds the hint line "Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela" (EN: "Keyboard: Space picks up the focused card, column or item · arrows move · Space drops · Esc cancels") under the rows | Prototype `shortcutRows` and `kbdHelp`; one source avoids drift | y |
| Controls | Two segmented controls (the existing `SegmentedTabs`): language **Português (Brasil)** · **English**, theme **Claro** · **Escuro** · **Sistema**, under a heading each; the theme panel carries the subtitle "Sistema segue o aparelho." (EN: "System follows your device.") | Doc §9; prototype lines 565–572 | y |
| How a choice applies | The control calls `setLanguage` / `setTheme` on the preferences store; the existing controllers (`language-controller`, `theme-controller`) react and write `localStorage`. No new persistence code | FE-AD-003; the store is the single source | y |
| Storage unavailable | A choice still applies for the session and is lost on reload (the `SafeStorage` memory fallback) | FE-AD-003 | y |
| Files | A new `features/settings` module holds the two panels, the shortcuts panel, the dialog and the top-bar button. `pages/settings-page.tsx` composes them with `SessionSection` from `features/auth`; `ProtectedLayout` renders the button and the `?` hook from `features/settings` | FE-AD-006 forbids imports between features; pages and layouts may compose features | y |
| `?` guards | `useShortcut('?', …)`: ignored with Ctrl/Meta/Alt held, while typing in a field, and while another `aria-modal` is open (FE-AD-011). The dialog being open counts as a modal, so `?` cannot stack a second one | FE-AD-011 | y |
| Dialog | The shared `Dialog`, titled **Atalhos de teclado**, width 420 px, one **Fechar** button; Esc and the button close it and focus returns to the element that had it before (the icon, or the previous element for `?`) | Prototype `dlg.isShortcuts`; doc §13 dialogs restore focus | y |
| Icon button | `Keyboard` icon (lucide, FE-AD-008), accessible name "Atalhos de teclado" (EN: "Keyboard shortcuts"), placed before the Settings icon; it stays visible on `/settings` | Prototype line 192; doc §3 | y |
| Resize while open | If the viewport drops below 48rem with the dialog open, the dialog closes | Avoids a desktop-only dialog on a phone layout | n |
| Segmented control semantics | The existing `SegmentedTabs` (React Aria `Tabs`) is reused for both controls; arrow keys move the selection and select it at once | Reuse over a new radio component; keeps the Púrpura look | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Language and theme ⭐ MVP

**User Story**: As a user, I want to pick the language and the theme on the settings screen so that the app speaks and looks the way I like.

**Why P1**: The screen exists only to hold these choices; the controllers are already built.

**Acceptance Criteria**:

1. WHEN the user opens `/settings` THEN the screen SHALL show, in this order, the panels **Idioma**, **Tema**, **Atalhos de teclado** (desktop only) and **Sessão**.
2. The **Idioma** panel SHALL offer the options **Português (Brasil)** and **English**, with the current language selected.
3. WHEN the user selects the other language THEN the app SHALL render every visible text in that language at once, without a reload.
4. WHEN the user selects a language THEN the app SHALL store it under `my-trello.language`, so the next load starts in it.
5. The **Tema** panel SHALL offer **Claro**, **Escuro** and **Sistema** with the current preference selected, and the subtitle "Sistema segue o aparelho.".
6. WHEN the user selects a theme THEN the app SHALL apply it at once (`data-theme` on the root element) without a reload.
7. WHEN the user selects a theme THEN the app SHALL store it under `my-trello.theme`.
8. WHILE the theme preference is **Sistema**, the app SHALL follow the device's dark-mode setting.
9. WHEN the user presses an arrow key on a focused option THEN the control SHALL select the neighboring option.
10. IF `localStorage` is unavailable THEN the app SHALL still apply the language or theme chosen for the rest of the session.

**Independent Test**: Open `/settings`, pick English then Dark; the screen is in English and dark; reload; both hold.

---

### P1: Shortcuts panel ⭐ MVP

**User Story**: As a desktop user, I want to see the keyboard shortcuts on the settings screen so that I learn them.

**Why P1**: The prototype's settings screen lists them (doc §9).

**Acceptance Criteria**:

1. WHERE the viewport is at least 48rem wide the **Atalhos de teclado** panel SHALL list the five shortcuts `N`, `/`, `Esc`, `Space` (`Espaço` in PT-BR) and `?`, each with its description.
2. WHERE the viewport is narrower than 48rem the settings screen SHALL NOT render the **Atalhos de teclado** panel.
3. WHEN the language changes THEN the panel SHALL show the descriptions (and the `Espaço` / `Space` key) in the new language at once.

**Independent Test**: At 1280 px the five rows show; at 390 px the panel is gone.

---

### P1: Shortcuts dialog ⭐ MVP

**User Story**: As a desktop user, I want to open the shortcuts from anywhere in the app so that I do not have to leave my board.

**Why P1**: Doc §11 defines `?` and the top-bar icon.

**Acceptance Criteria**:

1. WHERE the viewport is at least 48rem wide, every protected screen SHALL show a **Atalhos de teclado** icon button in the top bar, before the Settings icon.
2. WHERE the viewport is narrower than 48rem the top bar SHALL NOT show the keyboard icon button.
3. WHEN the user activates the icon button THEN the app SHALL open the **Atalhos de teclado** dialog with the five rows and the keyboard hint line.
4. WHEN the user presses `?` outside a text field, with no other modal open, on a viewport at least 48rem wide THEN the app SHALL open the same dialog.
5. IF the user presses `?` while typing in a field, or with Ctrl, Meta or Alt held, THEN the app SHALL NOT open the dialog.
6. IF the viewport is narrower than 48rem THEN pressing `?` SHALL NOT open the dialog.
7. WHILE the dialog is open, pressing `?` SHALL NOT open a second dialog.
8. WHEN the user presses Esc or **Fechar** THEN the dialog SHALL close and focus SHALL return to the element that had it before the dialog opened.
9. WHEN the viewport drops below 48rem while the dialog is open THEN the dialog SHALL close.

**Independent Test**: On a board press `?`; the dialog lists the five rows; Esc closes it and focus is back where it was.

---

## Edge Cases

- WHEN the user changes the language while the shortcuts dialog is open THEN the dialog SHALL show the new language at once.
- IF the stored language or theme value is not one of the known values THEN the app SHALL fall back to English and **Sistema** (existing `parseLanguage` / `parseTheme`) and the controls SHALL show those.
- WHILE the card detail modal is open, pressing `?` SHALL NOT open the dialog (FE-AD-011 modal guard).

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FSET-01 | P1: Language and theme (screen order) | Design | Pending |
| FSET-02 | P1: Language and theme (language options) | Design | Pending |
| FSET-03 | P1: Language and theme (language applies) | Design | Pending |
| FSET-04 | P1: Language and theme (language persists) | Design | Pending |
| FSET-05 | P1: Language and theme (theme options and subtitle) | Design | Pending |
| FSET-06 | P1: Language and theme (theme applies) | Design | Pending |
| FSET-07 | P1: Language and theme (theme persists) | Design | Pending |
| FSET-08 | P1: Language and theme (system theme) | Design | Pending |
| FSET-09 | P1: Language and theme (arrow keys) | Design | Pending |
| FSET-10 | P1: Language and theme (storage unavailable) | Design | Pending |
| FSET-11 | P1: Shortcuts panel (desktop rows) | Design | Pending |
| FSET-12 | P1: Shortcuts panel (hidden on phone) | Design | Pending |
| FSET-13 | P1: Shortcuts panel (language change) | Design | Pending |
| FSET-14 | P1: Shortcuts dialog (icon on desktop) | Design | Pending |
| FSET-15 | P1: Shortcuts dialog (no icon on phone) | Design | Pending |
| FSET-16 | P1: Shortcuts dialog (icon opens it) | Design | Pending |
| FSET-17 | P1: Shortcuts dialog (`?` opens it) | Design | Pending |
| FSET-18 | P1: Shortcuts dialog (`?` guards) | Design | Pending |
| FSET-19 | P1: Shortcuts dialog (`?` off on phone) | Design | Pending |
| FSET-20 | P1: Shortcuts dialog (no second dialog) | Design | Pending |
| FSET-21 | P1: Shortcuts dialog (close and focus) | Design | Pending |
| FSET-22 | P1: Shortcuts dialog (closes on resize) | Design | Pending |
| FSET-23 | Edge: language change with the dialog open | Design | Pending |
| FSET-24 | Edge: unknown stored values | Design | Pending |
| FSET-25 | Edge: `?` with the card detail open | Design | Pending |

**ID format:** `FSET-NN`. Numbering follows the order of the criteria above (story criteria first, then edge cases).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 25 total, 0 mapped to tasks, 25 unmapped ⚠️ (tasks come next)

---

## Success Criteria

- [ ] A user changes language and theme in under 5 seconds and both hold after a reload.
- [ ] Every one of the 25 requirements has a test that fails when its behavior is removed.
- [ ] No text of the settings screen or the dialog is hardcoded; PT-BR and EN keys match (the existing i18n key-parity test passes).
