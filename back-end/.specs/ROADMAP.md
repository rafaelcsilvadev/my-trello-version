# Roadmap — Back-end (API)

Personal, single-owner Trello: each user registers and manages only their own boards. Features are specified and delivered in order; each one gets its own spec under `features/<name>/`.

**MVP = features 0–4.**

| # | Feature | Scope | Depends on | Status |
|---|---------|-------|------------|--------|
| 0 | `foundation` | NestJS + pnpm setup, Docker (API + PostgreSQL via root compose), request id + structured logs, health check, config, TypeORM + migrations, standard error format, Swagger/OpenAPI, test infrastructure (Testcontainers + supertest) | — | Done |
| 1 | `auth` | Register, login (JWT), `GET /me` | 0 | Done |
| 2 | `boards` | CRUD of the user's boards, archive | 1 | Done |
| 3 | `lists` | CRUD of lists inside a board, reorder | 2 | In progress |
| 4 | `cards` | Title, description, due date, done flag, archive, move between lists and reorder | 3 | Pending |
| 5 | `labels` | Board-level labels, apply to cards | 4 | Pending |
| 6 | `checklists` | Checklist items on a card | 4 | Pending |
