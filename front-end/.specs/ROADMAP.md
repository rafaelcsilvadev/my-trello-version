# Roadmap — Front-end (Web)

Web client for the personal Trello API (`back-end/`, features 0–6). Screens and behavior follow the prototype in `front-end/design/` (`Task List - Documentação.md`). Features are specified and delivered in order; each one gets its own spec under `features/<name>/`.

**MVP = features 0–4** (feature 3 is split into 3a–3c).

| # | Feature | Scope | Depends on | Status |
|---|---------|-------|------------|--------|
| 0 | `foundation` | React + Vite + TypeScript app in the pnpm workspace, Tailwind v4 with Púrpura tokens, light/dark/system theme, PT-BR/EN i18n, routes + auth guard, typed API client (`openapi-fetch` + TanStack Query) with session-expired handling, toasts, Docker service, CI jobs, test infrastructure (Vitest + Testing Library + MSW + Playwright) | back-end 0–6 | Done |
| 1 | `auth` | Sign up, log in, rate-limit notice, log out | 0 | Done |
| 2 | `boards` | My boards: active/archived tabs, create, edit, archive, restore, delete | 1 | Done |
| 3a | `board` | Board view: columns and cards, create and rename columns, archive/restore/delete columns, create cards, done flag, "Mostrar arquivadas", read-only archived board, `n` shortcut, phone layout | 2 | Done |
| 3b | `board-dnd` | Drag cards and columns with mouse and keyboard, live region, "Mover para…" | 3a | Done |
| 3c | `board-filters` | Search, label and due-date filters, `/` shortcut, drag disabled while filtering | 3b | Done |
| 4 | `card-detail` | Card detail: title, description, due date, done flag, checklist, apply labels | 3a | — |
| 5 | `labels` | Board labels page: create, edit, delete | 4 | — |
| 6 | `settings` | Settings screen (language, theme, session) and keyboard shortcuts dialog | 1 | — |
