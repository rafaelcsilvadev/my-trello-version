# my-trello-version

[![ci](https://github.com/rafaelcsilvadev/my-trello-version/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rafaelcsilvadev/my-trello-version/actions/workflows/ci.yml)

**English** | [Português](README.PT.md)

> 🚧 **Work in progress.** The back-end API is feature-complete (features 0 to 6). The web front-end has its foundation in place (no screens yet). The mobile app has not started yet.

A personal take on Trello: each user signs up and manages only their own boards, lists and cards.

The project has two goals:

1. Build an API with production-grade practices: modular architecture, three test levels, standardized errors, structured logs, and everything running on Docker.
2. Show a **disciplined** way of building software with AI: spec before code, TDD, small commits, independent verification, and human review of every Pull Request.

---

## Status

| # | Feature | What it delivers | Status |
|---|---------|------------------|--------|
| 0 | `foundation` | NestJS + pnpm setup, Docker, health check, validated config, TypeORM + migrations, RFC 9457 errors, structured logs with request id, Swagger, test infrastructure | ✅ Done |
| 1 | `auth` | Sign-up, JWT login, `GET /me`, global guard, per-IP rate limit | ✅ Done |
| 2 | `boards` | CRUD of the user's boards, archive | ✅ Done |
| 3 | `lists` | CRUD of lists inside a board, reorder | ✅ Done |
| 4 | `cards` | Title, description, due date, done flag, archive, move and reorder | ✅ Done |
| 5 | `labels` | Board labels applied to cards | ✅ Done |
| 6 | `checklists` | Checklist items on a card | ✅ Done |

MVP = features 0 to 4. Full roadmap in [`back-end/.specs/ROADMAP.md`](back-end/.specs/ROADMAP.md).

Web front-end: `foundation` (app shell, routes and auth guard, typed API client, theme, PT-BR/EN i18n, toasts, Docker service, CI) `auth` (sign-up, log-in, rate-limit notice, log-out) and `boards` (active/archived tabs, create, edit, archive, restore, delete) are done. The board view comes next, one feature at a time. Roadmap in [`front-end/.specs/ROADMAP.md`](front-end/.specs/ROADMAP.md).

---

## Stack

- **Runtime:** Node.js 24, TypeScript 6, pnpm workspace (monorepo)
- **API:** NestJS 12, class-validator, Zod (environment variable validation)
- **Database:** PostgreSQL 18, TypeORM with migrations (`synchronize` disabled)
- **Auth:** JWT (`@nestjs/jwt`), passwords hashed with native argon2id from `node:crypto`, rate limiting with `@nestjs/throttler`
- **Observability:** Pino (JSON logs with request id and password redaction at any depth)
- **Docs:** Swagger / OpenAPI at `/api/docs`
- **Web:** React 19 + Vite 8, React Router 8, TanStack Query, `openapi-fetch`, Tailwind CSS v4, i18next, served by nginx in Docker
- **Tests:** Jest, Supertest, Testcontainers (real PostgreSQL in integration and e2e tests); Vitest, Testing Library, MSW and Playwright on the web app
- **Quality:** oxlint (type-aware), Prettier
- **Infra:** multi-stage Docker build + Docker Compose

## Technical highlights

- **Modular architecture.** One NestJS module per feature (`auth`, `users`, ...), layered as entity → repository → service → controller.
- **Standardized errors.** Every error leaves through a single global filter as [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457), with a `requestId`. Domain errors are mapped to HTTP status codes in one place.
- **Secure by default.** Every route requires a token. Public routes must opt out explicitly with `@Public()`. Login and sign-up are rate-limited per IP. The app refuses to boot without a valid `JWT_SECRET`. Security headers via `helmet`, CORS limited to the origins in `CORS_ORIGINS`, and JSON bodies capped at 100kb (`413` Problem Details).
- **Three test levels.** Unit (no I/O), integration (repositories against a real PostgreSQL) and e2e (HTTP against the whole app). More than 1,000 tests so far.
- **Shared API contract.** `packages/api-contract` holds TypeScript types generated from the OpenAPI document. CI regenerates them and fails if the committed contract is out of date.
- **One-command run.** `docker compose up` starts the web app, the API and the database, with no local Node or PostgreSQL install.

---

## How AI is used in this project

The code is written in pair with **[Claude Code](https://claude.com/claude-code)**, Anthropic's AI coding agent that runs in the terminal. The AI does not generate the project in one shot. It follows a fixed process, and **I make the decisions and review every Pull Request before it is merged**.

### 1. Spec before code (Spec-Driven Development)

Each feature goes through four phases, driven by the `tlc-spec-driven` skill:

| Phase | Output | File |
|-------|--------|------|
| **Specify** | Testable requirements in **EARS** notation (`WHEN ... THEN the system SHALL ...`), each with an ID (`AUTH-01`, `FND-07`, ...) | `spec.md` |
| **Context** | Product decisions discussed with me (e.g. access token only, no refresh token in this phase) | `context.md` |
| **Design** | Technical design: modules, contracts, error flow | `design.md` |
| **Tasks** | Atomic tasks, each with "Done when" criteria and linked to the requirements it covers | `tasks.md` |

Everything is versioned in [`back-end/.specs/features/`](back-end/.specs/features/). The `auth` feature, for example, has 20 acceptance criteria and 12 tasks.

### 2. Architecture decision log

Important decisions become numbered entries in `STATE.md`, with **decision, reason, trade-off and status**. Examples:

- `GL-AD-001`: pnpm monorepo with a single lockfile ([`.specs/STATE.md`](.specs/STATE.md))
- `BE-AD-004`: every error leaves as Problem Details through one global filter ([`back-end/.specs/STATE.md`](back-end/.specs/STATE.md))
- `BE-AD-006`: global JWT guard with explicit opt-out via `@Public()`

This way the AI (and any human) understands *why* the code is the way it is in future sessions, without relying on memory.

### 3. TDD and small commits

During execution, the `pair-programming` skill takes over:

- Every task follows **TDD**: failing test → minimal code → refactor.
- **One commit per task**, using Conventional Commits (`feat(auth): add login endpoint`), small enough to review in minutes.
- Tests ship in the same commit as the code they cover. Every commit builds and passes the tests.
- A feature becomes a **Pull Request** that I review before merging.

Commits made in pair with the AI carry a `Co-Authored-By: Claude` trailer, so the history shows transparently where it took part.

### 4. Independent verification (author ≠ verifier)

When a feature is done, a **separate sub-agent** that did not write the code validates the work:

- **Traceability:** every acceptance criterion must point to a real test (`file:line` + assertion). No evidence, no pass.
- **Discrimination sensor (lightweight mutation testing):** the verifier injects bugs on purpose and checks that the tests catch them. In `foundation`, 10 of 10 mutants were killed. In `auth`, 14 of 16 (the 2 survivors do not change observable behavior).
- **Report:** verdict, gaps found and a fix plan are written to `validation.md`.

Gaps become their own tasks and PRs. For example, PR #29 added edge-case tests flagged by the `auth` validation (a 254-character email, a token sent with the `Basic` scheme, etc.).

### 5. Lessons that learn from the project

Problems found during validation become **lessons**, recorded by a script in [`back-end/.specs/LESSONS.md`](back-end/.specs/LESSONS.md). Examples:

- "For every length limit, test both the largest accepted value and the first rejected one."
- "Redact sensitive keys at any nesting depth, not only at fixed paths."

A lesson only becomes a confirmed rule after it shows up in more than one feature. The process improves every cycle without piling up useless rules.

### 6. Supporting tools

- **CodeGraph (MCP):** a graph index of the codebase that the AI uses to find symbols, calls and the impact of a change without reading files blindly.
- **Custom skills:** reusable instructions that pin down the process (spec, TDD, review, commits), so the AI works the same way in every session.

### My role

- Define the scope and priorities of each feature.
- Answer product questions and approve the spec, design and tasks.
- Review and approve every Pull Request.
- Challenge and correct the AI's decisions when they don't make sense.

---

## Running the project

### With Docker (recommended)

```bash
git clone https://github.com/rafaelcsilvadev/my-trello-version.git
cd my-trello-version
docker compose up --build
```

- API: http://localhost:3000/api/v1
- Health check: http://localhost:3000/api/v1/health
- Swagger: http://localhost:3000/api/docs
- Web app: http://localhost:5173

The web image bakes `VITE_API_URL` (default `http://localhost:3000`) into the bundle at build time. To point it at another API origin, change the `VITE_API_URL` build arg of the `web` service in `docker-compose.yml` and rebuild.

To load the demo data (a user with boards, lists, cards, labels and checklists), run in another terminal:

```bash
docker compose exec api node dist/seed/seed.js
```

Then log in as `demo@example.com` / `demo1234`. Every run resets the demo account to the same data; other users are not touched.

In the web app:

1. Open http://localhost:5173. Without a session you land on `/login`.
2. Log in with the demo user above, or follow **Create account** to sign up with your own e-mail (name, e-mail, password of 8 to 72 characters). Both take you to `/boards`.
3. Open **Settings** (gear icon in the top bar) to see the signed-in account and **Sign out**.

Managing boards on `/boards`:

- **Create board** opens a form with a name (up to 100 characters) and an optional description (up to 1000). Saving takes you to the new board at `/b/{id}`; the board view itself is still a placeholder.
- Each board card has a **Board actions** menu. On the **Active** tab it offers **Edit** (same form, pre-filled) and **Archive**.
- Archived boards move to the **Archived** tab, where the menu offers **Restore** (back to **Active**) and **Delete permanently**.
- **Delete permanently** removes the board with all its columns, tasks and labels. It cannot be undone, so the button only unlocks after you type the board's name.

A page opened without a session sends you to `/login` and back to it after logging in. The API limits log-in attempts per IP; when the limit is hit, the form asks you to wait a minute.

To stop everything (add `-v` to also delete the database volume):

```bash
docker compose down
```

### Locally

Requirements: Node.js 24.17.0, pnpm 11, a reachable PostgreSQL, and Docker (for the Testcontainers-based tests).

```bash
pnpm install
cd back-end
cp .env.example .env    # set DATABASE_URL and JWT_SECRET
pnpm start:dev          # migrations run automatically on boot
```

Demo data (the seed reads the environment, not `.env`):

```bash
set -a && . ./.env && set +a && pnpm seed
```

Web app, from the repository root, with the API running (Docker or `pnpm start:dev`):

```bash
cd front-end
pnpm dev                # http://localhost:5173
```

- `VITE_API_URL` sets the API origin (default `http://localhost:3000`), e.g. `VITE_API_URL=http://localhost:4000 pnpm dev`.
- Keep port 5173: the API only accepts browser calls from the origins in `CORS_ORIGINS` (`http://localhost:5173` in `docker-compose.yml`).

### Tests

Back-end, from the repository root:

```bash
cd back-end
pnpm test               # unit
pnpm test:integration   # integration (starts PostgreSQL via Testcontainers)
pnpm test:e2e           # HTTP e2e
pnpm lint
```

Web app, from the repository root:

```bash
cd front-end
pnpm test               # unit and component (Vitest + MSW)
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium   # once, downloads the browser
pnpm test:e2e           # Playwright; starts postgres and api with docker compose
```

`test:e2e` leaves the `postgres` and `api` containers running, so the next run is faster. Stop them from the repository root with `docker compose down`.

---

## Project structure

```
my-trello-version/
├── .specs/                # monorepo-wide decisions
├── back-end/
│   ├── .specs/            # roadmap, decisions, lessons and per-feature specs
│   ├── src/               # NestJS modules (auth, users, health, errors, logging, ...)
│   ├── test/              # unit/, integration/, e2e/
│   └── Dockerfile
├── front-end/
│   ├── .specs/            # roadmap, decisions and per-feature specs
│   ├── src/               # app/, pages/, shared/, styles/
│   ├── test/              # unit/, e2e/, support/
│   ├── Dockerfile
│   └── nginx.conf
├── packages/
│   └── api-contract/      # API types generated from OpenAPI
└── docker-compose.yml
```
