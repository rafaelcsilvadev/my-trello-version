# Roadmap — Front-end (Web)

Web client for the personal Trello API (`back-end/`, features 0–6). Screens and behavior follow the prototype in `front-end/design/` (`Task List - Documentação.md`). Features are specified and delivered in order; each one gets its own spec under `features/<name>/`.

**MVP = features 0–4** (features 3 and 4 are split into 3a–3c and 4a–4c).

| # | Feature | Scope | Depends on | Status |
|---|---------|-------|------------|--------|
| 0 | `foundation` | React + Vite + TypeScript app in the pnpm workspace, Tailwind v4 with Púrpura tokens, light/dark/system theme, PT-BR/EN i18n, routes + auth guard, typed API client (`openapi-fetch` + TanStack Query) with session-expired handling, toasts, Docker service, CI jobs, test infrastructure (Vitest + Testing Library + MSW + Playwright) | back-end 0–6 | Done |
| 1 | `auth` | Sign up, log in, rate-limit notice, log out | 0 | Done |
| 2 | `boards` | My boards: active/archived tabs, create, edit, archive, restore, delete | 1 | Done |
| 3a | `board` | Board view: columns and cards, create and rename columns, archive/restore/delete columns, create cards, done flag, "Mostrar arquivadas", read-only archived board, `n` shortcut, phone layout | 2 | Done |
| 3b | `board-dnd` | Drag cards and columns with mouse and keyboard, live region, "Mover para…" | 3a | Done |
| 3c | `board-filters` | Search, label and due-date filters, `/` shortcut, drag disabled while filtering | 3b | Done |
| 4a | `card-detail` | Card detail modal/full screen: title, description, due date, done flag, applied labels (read-only), "Mover para…", archive, archived card restore/delete, archived board read-only, load states, discard dialog | 3a | Done |
| 4b | `card-checklist` | Checklist in the card detail: progress, add, edit, check, delete, reorder with mouse and keyboard | 4a | — |
| 4c | `card-labels` | Label popover in the card detail: search, apply/remove board labels, create a label, link to the labels page | 4a | — |
| 5 | `labels` | Board labels page: create, edit, delete | 4c | — |
| 6 | `settings` | Settings screen (language, theme, session) and keyboard shortcuts dialog | 1 | — |
