# Board Filters Specification

## Problem Statement

The board screen (features `board`, 3a, and `board-dnd`, 3b) shows every active card of every active column, and the toolbar holds only "Mostrar arquivadas". On a board with many cards the user cannot find a card by its text, see only the cards with a given label, or list what is overdue or due today. Feature `board-filters` (3c) adds the search and filters of the prototype (doc §6 "Cabeçalho", "Busca e filtros", doc §11 shortcut `/`): a search field, a label filter, a due-date filter, the result count with "Limpar filtros", the empty result, and drag turned off while any of them is active.

## Goals

- [ ] A user types part of a card title without accents or case ("lancamento") and sees only the matching cards, with the count "N tarefas".
- [ ] A user selects two labels and sees only the cards with at least one of them; the button reads "Etiquetas · 2".
- [ ] A user picks "Atrasadas" and sees only the overdue cards; picks "Vencem hoje" and sees only the cards due today.
- [ ] While any search or filter is active, no card or column can be dragged, and the notice says why.
- [ ] Opening a board always starts with no search, no filter and "Mostrar arquivadas" off.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Global search across boards | Doc §1 "Fora do escopo: busca global" |
| Filtering archived cards, the virtual column "Arquivadas" or the archived columns section | Doc §6: search and filters apply only to the active cards of the active columns |
| Keeping the search and filters in the URL or across visits | Doc §6: they reset every time the board is opened |
| Server-side search or filter endpoints | The board already loads every active card of the board (`GET /api/v1/boards/{boardId}/cards`); the API has no search parameters |
| Creating or editing labels from the filter | Labels page is feature `labels` (5); the card detail label popover is feature `card-detail` (4) |
| Sorting cards | Doc §1 "Fora do escopo: ordenação" |
| The shortcuts dialog row for `/` | Feature `settings` (6) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where filtering runs | On the client, over the cached active cards of the board | The board already holds every active card; the API has no search parameters | y |
| Search text matching | Case- and accent-insensitive substring match on the card title or description: both sides go through Unicode NFD, combining marks (U+0300–U+036F) removed, lower-cased | Doc §6; prototype `norm` (`Task List.dc.html:816`) | y |
| Search whitespace | Leading and trailing spaces are ignored; a field holding only spaces counts as no search | Avoids an "active" filter the user cannot see; the prototype does not trim, which turns the filter on for a single space | y |
| Card without a description | Matches only by title | `CardResponseDto.description` is nullable | y |
| Combining filters | A card shows only if it matches the search AND the label filter AND the due filter | Prototype `match` (`Task List.dc.html:1057`) | y |
| Label filter with several labels | A card matches if it has at least one of the selected labels | Doc §6 | y |
| Due filter options | Qualquer prazo (default, no filter) · Atrasadas · Vencem hoje · Sem prazo · Concluídas | Doc §6; i18n `anyDue`, `overdueF`, `dueTodayF`, `noDueF`, `doneF` | y |
| "Atrasadas" | Cards overdue by the existing rule: not done, with a due date before today (`isOverdue`) | Doc §2 "Atrasada"; FBV rule already on the card | y |
| "Vencem hoje" | Cards whose due date equals today, done or not | Prototype `t.due===TODAY` | y |
| "Sem prazo" | Cards with no due date, done or not | Prototype `!t.due` | y |
| "Concluídas" | Cards marked done, with or without a due date | Prototype `!!t.done` | y |
| "Today" | The same calendar date the board already reads once when it opens (`today` in the board view model) | Keeps the due filter consistent with the due labels on the cards | y |
| Live filtering | The view filters the current cache on every render: a card that stops matching after a change (marked done, created, moved) leaves the view at once, and one that starts matching appears | Prototype filters on every render; no frozen result set | y |
| Column header counter while filtering | Shows the number of matching cards in that column | Prototype `count:list.length` over the filtered list (`Task List.dc.html:1089`) | y |
| Column with no matching card while filtering | Stays in place with counter 0 and no "Arraste cards para cá" text | User choice: drag is off, so the drop hint is wrong | y |
| No matching card on the whole board | The columns area (active columns, "+ Adicionar coluna", the virtual column "Arquivadas" and the archived section) is replaced by "Nenhuma tarefa encontrada" and a **Limpar filtros** button | Prototype `showBoardCols` and `noResults` (`Task List.dc.html:1106`, `:1203`) | y |
| Board with no active column | The search and filters stay usable; the empty board block "Adicione a primeira coluna" shows as before and "Nenhuma tarefa encontrada" does not | Prototype `noResults` requires at least one column | y |
| Result count | "{n} tarefas" / "1 tarefa" (EN "{n} tasks" / "1 task"), also for zero ("0 tarefas"), in a `role="status"` element | Prototype `resultText`; i18n `nTasks`, `oneTask` | y |
| What drag "off" covers | Mouse drag of cards and column headers, and keyboard pick (Space) of cards and column headers; the keyboard help line below the board is hidden | Doc §6; prototype `canDrag`, `headDrag`, `showKbdHelp` | y |
| "Mover para…" while filtering | Stays available on every active card | User choice; it is not a drag and is the only way to move on a phone | y |
| "+ Adicionar tarefa" while filtering | Stays available; a created card that does not match leaves the view once added, and the count does not include it | Prototype keeps `canAdd`; live filtering | y |
| Shortcut `n` while filtering | Clears the search and every filter, then opens the new-card field in the first column | User choice; prototype `Task List.dc.html:979` | y |
| Shortcut `/` | Focuses the search field; goes through `useShortcut` (FE-AD-011), so it is ignored while typing in a field, while a modal is open, with Ctrl/Meta/Alt held, and while a keyboard move is in progress | Doc §11; FE-AD-011 | y |
| `/` on an archived (read-only) board | Focuses the search field: search and filters work on a read-only board | Doc §11 limits only `n` and Space on an archived board | y |
| Esc in the search field | Clears the field when it has text and keeps focus there; with an empty field it does nothing | Doc §6 "Esc limpa o campo"; prototype `onSearchKey` | y |
| Clear button inside the search field | Shown while the field has text; clears only the search; accessible name "Limpar busca" (EN "Clear search") | The prototype reuses "Limpar filtros" for this button, which clears only the search; a separate name tells screen-reader users what it does | y |
| "Limpar filtros" | Clears the search, the label filter and the due filter; leaves "Mostrar arquivadas" as is | Prototype `clearFilters` | y |
| Reset on open | Search, label filter, due filter and "Mostrar arquivadas" start empty/off every time a board is opened, including when the user goes from one board straight to another | Doc §6 | y |
| Label filter control | A button "Etiquetas" (with tag icon) that opens a menu of the board's labels as `menuitemcheckbox` items with the label chip; the button reads "Etiquetas · {n}" and uses the soft variant while labels are selected; the menu closes on Esc and on a click outside | Doc §6, §13; prototype `Task List.dc.html:331-341`, `:1195` | y |
| Label filter on a board without labels | The menu shows "Nenhuma etiqueta ainda" | Prototype `noLabelsAtAll`; i18n `noLabelsYet` | y |
| Selected label that no longer exists | Ignored: it does not filter and does not count in "Etiquetas · {n}" | Labels can be deleted elsewhere (feature `labels`, another device) | y |
| Due filter control | A select labeled "Prazo" with the five options | Prototype `Task List.dc.html:344`; doc §6 | y |
| Drag-off notice | "Arrastar fica desativado enquanto há filtros" below the toolbar, while any search or filter is active on an active board; not shown on an archived board | Prototype `showDragOff: fAct && !ro` | y |
| Phone layout | The search field takes the full width of the toolbar; the `/` key hint shows only at `md` and up | Prototype `searchW`, `isDesktop` | y |
| Texts | Every label, placeholder, option, count and notice comes from i18n keys with the PT-BR and EN texts of `design/i18n.js` (`searchBoard`, `labels`, `labelsN`, `due`, `anyDue`, `overdueF`, `dueTodayF`, `noDueF`, `doneF`, `clearFilters`, `dragOff`, `noResults`, `nTasks`, `oneTask`, `noLabelsYet`), plus the new "Limpar busca" / "Clear search" | Foundation i18n rule (FE-AD-004) | y |
| Components and state placement | Decided at Design | Spec states behavior only | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Search the board ⭐ MVP

**User Story**: As a logged-in user, I want to type a word and see only the cards that mention it so that I find a card on a crowded board.

**Why P1**: Finding a card is the first need once a board grows.

**Acceptance Criteria**:

1. The system SHALL show a search field with the placeholder and accessible name "Buscar no quadro…" as the first control of the board toolbar.  <!-- FBF-01 -->
2. WHEN the user types in the search field THEN the system SHALL show only the active cards whose title or description contains the typed text, ignoring case and accents.  <!-- FBF-02 -->
3. WHEN the search field holds only spaces THEN the system SHALL show every active card, as with an empty field.  <!-- FBF-03 -->
4. WHILE the search field has text the system SHALL show a clear button named "Limpar busca" inside the field.  <!-- FBF-04 -->
5. WHEN the user activates the clear button THEN the system SHALL empty the search field and leave the label and due filters as they were.  <!-- FBF-05 -->
6. WHEN the user presses Esc in the search field with text in it THEN the system SHALL empty the field and keep focus on it.  <!-- FBF-06 -->
7. WHEN the user presses `/` while the board is open THEN the system SHALL move focus to the search field.  <!-- FBF-07 -->
8. IF the user presses `/` while typing in another field, while a modal is open, with Ctrl, Meta or Alt held, or while a keyboard move is in progress THEN the system SHALL not move focus to the search field.  <!-- FBF-08 -->

**Independent Test**: On a board with a card "Lançamento do app", press `/`, type "LANCAMENTO": only that card shows. Press Esc: every card is back.

---

### P1: Filter by label ⭐ MVP

**User Story**: As a logged-in user, I want to pick one or more labels and see only the cards that carry them so that I focus on one kind of work.

**Why P1**: Labels exist to group work; filtering by them is how the grouping pays off.

**Acceptance Criteria**:

1. The system SHALL show a button "Etiquetas" in the board toolbar that opens a menu listing every label of the board as a `menuitemcheckbox` with the label's name and color.  <!-- FBF-09 -->
2. WHEN the user checks one or more labels THEN the system SHALL show only the active cards that carry at least one checked label.  <!-- FBF-10 -->
3. WHILE one or more labels are checked the system SHALL show the button text "Etiquetas · {n}", with {n} the number of checked labels, in the soft variant.  <!-- FBF-11 -->
4. WHEN the user unchecks every label THEN the system SHALL show every active card again and the button text "Etiquetas".  <!-- FBF-12 -->
5. WHEN the user presses Esc or clicks outside the open label menu THEN the system SHALL close the menu and keep the checked labels.  <!-- FBF-13 -->
6. WHERE the board has no labels the system SHALL show "Nenhuma etiqueta ainda" inside the label menu.  <!-- FBF-14 -->
7. IF a checked label no longer exists on the board THEN the system SHALL ignore it for filtering and leave it out of {n}.  <!-- FBF-15 -->

**Independent Test**: On "Product launch", open Etiquetas, check "Feature" and "Bug": only cards with Feature or Bug show and the button reads "Etiquetas · 2".

---

### P1: Filter by due date ⭐ MVP

**User Story**: As a logged-in user, I want to see only the overdue cards, the ones due today, the ones without a due date or the finished ones so that I plan my day.

**Why P1**: Overdue and due-today lists are the daily use of due dates.

**Acceptance Criteria**:

1. The system SHALL show a select "Prazo" in the board toolbar with the options "Qualquer prazo", "Atrasadas", "Vencem hoje", "Sem prazo" and "Concluídas", with "Qualquer prazo" selected when the board opens.  <!-- FBF-16 -->
2. WHEN the user selects "Atrasadas" THEN the system SHALL show only the active cards that are not done and have a due date before today.  <!-- FBF-17 -->
3. WHEN the user selects "Vencem hoje" THEN the system SHALL show only the active cards whose due date is today, done or not.  <!-- FBF-18 -->
4. WHEN the user selects "Sem prazo" THEN the system SHALL show only the active cards with no due date.  <!-- FBF-19 -->
5. WHEN the user selects "Concluídas" THEN the system SHALL show only the active cards marked done.  <!-- FBF-20 -->
6. WHEN the user selects "Qualquer prazo" THEN the system SHALL stop filtering by due date.  <!-- FBF-21 -->

**Independent Test**: With one card due yesterday (not done), one due today and one without a due date, pick each option and see exactly the expected card.

---

### P1: Filtered board view ⭐ MVP

**User Story**: As a logged-in user, I want to see how many cards match, clear everything in one click, and understand why I cannot drag so that a filtered board never confuses me.

**Why P1**: Without the count, the clear action and the drag lock, a filtered board looks broken.

**Acceptance Criteria**:

1. The system SHALL show a card only if it matches the search, the label filter and the due filter at the same time.  <!-- FBF-22 -->
2. The system SHALL apply the search and filters only to the active cards of the active columns, and SHALL leave the virtual column "Arquivadas" and the archived columns section unfiltered.  <!-- FBF-23 -->
3. WHILE a search or filter is active the system SHALL show the number of matching cards as "{n} tarefas" ("1 tarefa" for one) in a `role="status"` element, and a **Limpar filtros** button, in the toolbar.  <!-- FBF-24 -->
4. WHEN the user activates **Limpar filtros** THEN the system SHALL empty the search, uncheck every label, set the due filter to "Qualquer prazo" and leave "Mostrar arquivadas" as it was.  <!-- FBF-25 -->
5. WHILE a search or filter is active the system SHALL show in each column header the number of matching cards in that column.  <!-- FBF-26 -->
6. WHILE a search or filter is active, a column with no matching card SHALL show no cards and no "Arraste cards para cá" text.  <!-- FBF-27 -->
7. WHEN a search or filter is active and no active card matches on a board with at least one active column THEN the system SHALL replace the columns area, including "+ Adicionar coluna" and the archived views, with "Nenhuma tarefa encontrada" and a **Limpar filtros** button.  <!-- FBF-28 -->
8. WHEN a change makes a card match or stop matching (done toggled, card created, card moved, refetch) THEN the system SHALL show or hide that card and update the counts at once.  <!-- FBF-29 -->

**Independent Test**: Filter "Atrasadas" on a board with two overdue cards: the toolbar says "2 tarefas"; mark one done: it disappears and the count says "1 tarefa"; click Limpar filtros: every card is back.

---

### P1: Drag off while filtering ⭐ MVP

**User Story**: As a logged-in user, I want drag to stop while the board is filtered so that I never drop a card at a position computed from a partial list.

**Why P1**: A drop among hidden cards would land at a position the user cannot see.

**Acceptance Criteria**:

1. WHILE a search or filter is active on an active board the system SHALL show the notice "Arrastar fica desativado enquanto há filtros" below the toolbar.  <!-- FBF-30 -->
2. WHILE a search or filter is active the system SHALL not start a mouse drag of a card or a column header.  <!-- FBF-31 -->
3. WHILE a search or filter is active, pressing Space on a focused card or column header SHALL not pick it.  <!-- FBF-32 -->
4. WHILE a search or filter is active the system SHALL hide the keyboard help line below the board.  <!-- FBF-33 -->
5. WHILE a search or filter is active on an active board the system SHALL keep "Mover para…" in the menu of every active card.  <!-- FBF-34 -->
6. WHEN the search and every filter are cleared THEN the system SHALL let cards and columns be dragged and picked again and hide the notice.  <!-- FBF-35 -->
7. WHILE the board is archived the system SHALL keep the search and filters usable and SHALL not show the drag-off notice.  <!-- FBF-36 -->

**Independent Test**: Type a search: the notice shows, a card cannot be dragged and Space on it does nothing, yet its menu still offers "Mover para…". Clear: dragging works again.

---

### P1: Reset and shortcut `n` ⭐ MVP

**User Story**: As a logged-in user, I want every board to open unfiltered and `n` to show the card I create so that I never miss cards because of a filter I forgot.

**Why P1**: Doc §6 makes the reset part of the board's contract.

**Acceptance Criteria**:

1. WHEN a board is opened, including straight from another board, THEN the system SHALL start with an empty search, no checked label, "Qualquer prazo" and "Mostrar arquivadas" off.  <!-- FBF-37 -->
2. WHEN the user presses `n` on an active board with a search or filter active THEN the system SHALL clear the search and every filter and then open the new-card field in the first active column.  <!-- FBF-38 -->
3. WHILE a search or filter is active the system SHALL keep "+ Adicionar tarefa" in every active column.  <!-- FBF-39 -->

**Independent Test**: Filter a board, go to Meus quadros and open it again: nothing is filtered. Filter again and press `n`: filters clear and the field opens in the first column.

---

### P1: Toolbar layout and accessibility ⭐ MVP

**User Story**: As a user on a phone or with a screen reader, I want the toolbar to fit and to be announced so that search and filters work for me too.

**Why P1**: The board already supports phone and keyboard users (3a, 3b); the toolbar must not regress that.

**Acceptance Criteria**:

1. The system SHALL show the toolbar controls in this order: search, Etiquetas, Prazo, "Mostrar arquivadas", then the count and **Limpar filtros**, inside an element with `role="search"`.  <!-- FBF-40 -->
2. WHILE the viewport is below `md` the system SHALL give the search field the full toolbar width and hide the `/` key hint.  <!-- FBF-41 -->
3. The system SHALL render every toolbar text, option, count, notice and empty-result text from i18n keys in PT-BR and EN.  <!-- FBF-42 -->

**Independent Test**: At 375 px the search field spans the toolbar and the `/` hint is gone; switch the language to EN and every toolbar text reads in English.

---

## Edge Cases

- WHEN the board has no active column THEN the toolbar SHALL stay usable and the empty board block SHALL show instead of "Nenhuma tarefa encontrada" (FBF-28).
- WHEN "Mostrar arquivadas" is on and a filter is active THEN archived cards and columns SHALL show unfiltered (FBF-23), unless no active card matches (FBF-28).
- WHEN a created card does not match the active filters THEN it SHALL leave the view once added and the count SHALL not include it (FBF-29, FBF-39).
- WHEN a card's done toggle fails while "Concluídas" is selected THEN the rollback SHALL bring the card back into the matching set and into view (FBF-29).
- IF the labels query fails THEN the board load error rules of `board` apply (FBV-10); the label filter has no separate error state.
- IF a checked label is deleted elsewhere THEN it SHALL stop filtering (FBF-15).
- WHEN the user searches a text that only matches an accented title ("acao" vs "Ação") THEN the card SHALL match (FBF-02).

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | Search is free text, trimmed (FBF-03); no length limit because nothing is sent to the server; the due filter is a fixed list (FBF-16); unknown label ids are ignored (FBF-15) |
| Failure / partial-failure states | N/A because filtering sends no request; failures of writes made while filtered follow `board`/`board-dnd` and only change what matches (FBF-29) |
| Idempotency / retry / duplicate handling | N/A because filtering is a pure view over the cache |
| Auth boundaries & rate limits | N/A because no new request is made; the board queries keep their existing auth |
| Concurrency / ordering | Live filtering over the cache shows optimistic changes and rollbacks at once (FBF-29); drag is off while filtering so no move is computed from a partial list (FBF-31, FBF-32) |
| Data lifecycle / expiry | Filters live only while the board is open and reset on every open (FBF-37) |
| Observability | N/A because the web client has no logging or metrics pipeline |
| External-dependency failure | N/A because filtering does not call the API |
| State-transition integrity | Drag on/off follows whether any filter is active (FBF-31–FBF-35); archived board keeps filters without the drag notice (FBF-36) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FBF-01 | P1: Search the board | - | Verified |
| FBF-02 | P1: Search the board | - | Verified |
| FBF-03 | P1: Search the board | - | Verified |
| FBF-04 | P1: Search the board | - | Verified |
| FBF-05 | P1: Search the board | - | Verified |
| FBF-06 | P1: Search the board | - | Verified |
| FBF-07 | P1: Search the board | - | Verified |
| FBF-08 | P1: Search the board | - | Verified |
| FBF-09 | P1: Filter by label | - | Verified |
| FBF-10 | P1: Filter by label | - | Verified |
| FBF-11 | P1: Filter by label | - | Verified |
| FBF-12 | P1: Filter by label | - | Verified |
| FBF-13 | P1: Filter by label | - | Verified |
| FBF-14 | P1: Filter by label | - | Verified |
| FBF-15 | P1: Filter by label | - | Verified |
| FBF-16 | P1: Filter by due date | - | Verified |
| FBF-17 | P1: Filter by due date | - | Verified |
| FBF-18 | P1: Filter by due date | - | Verified |
| FBF-19 | P1: Filter by due date | - | Verified |
| FBF-20 | P1: Filter by due date | - | Verified |
| FBF-21 | P1: Filter by due date | - | Verified |
| FBF-22 | P1: Filtered board view | - | Verified |
| FBF-23 | P1: Filtered board view | - | Verified |
| FBF-24 | P1: Filtered board view | - | Verified |
| FBF-25 | P1: Filtered board view | - | Verified |
| FBF-26 | P1: Filtered board view | - | Verified |
| FBF-27 | P1: Filtered board view | - | Verified |
| FBF-28 | P1: Filtered board view | - | Verified |
| FBF-29 | P1: Filtered board view | - | Verified |
| FBF-30 | P1: Drag off while filtering | - | Verified |
| FBF-31 | P1: Drag off while filtering | - | Verified |
| FBF-32 | P1: Drag off while filtering | - | Verified |
| FBF-33 | P1: Drag off while filtering | - | Verified |
| FBF-34 | P1: Drag off while filtering | - | Verified |
| FBF-35 | P1: Drag off while filtering | - | Verified |
| FBF-36 | P1: Drag off while filtering | - | Verified |
| FBF-37 | P1: Reset and shortcut `n` | - | Verified |
| FBF-38 | P1: Reset and shortcut `n` | - | Verified |
| FBF-39 | P1: Reset and shortcut `n` | - | Verified |
| FBF-40 | P1: Toolbar layout and accessibility | - | Verified |
| FBF-41 | P1: Toolbar layout and accessibility | - | Verified |
| FBF-42 | P1: Toolbar layout and accessibility | - | Verified |

**Coverage:** 42 total, 0 mapped to tasks, 42 unmapped ⚠️ (mapped at Tasks)

---

## Success Criteria

- [ ] A user finds any card on a board by a word of its title or description, typed without accents or case.
- [ ] Every filter combination shows exactly the cards the rules above select, and the count matches what is on screen.
- [ ] Zero drags start while a search or filter is active.
- [ ] The Verifier marks all FBF requirements met with discriminating tests.
