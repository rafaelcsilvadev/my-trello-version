# STATE — Global

Decisions that bind every app in the monorepo. App-specific decisions live in `<app>/.specs/STATE.md`. See `README.md` for the layout rules.

## Decisions

### GL-AD-001
- **Decision**: The repository is a pnpm workspace monorepo with one root `pnpm-workspace.yaml` and a single lockfile; apps live in `back-end/`, `front-end/` and `mobile/`.
- **Reason**: One install and one CI pipeline, and a shared package (e.g. API contract types) can be added later without restructuring.
- **Trade-off**: Apps are not fully independent: a dependency bump touches the shared lockfile and tooling versions (Node, pnpm) are aligned across apps.
- **Scope**: all apps
- **Date**: 2026-10-14
- **Status**: active

### GL-AD-002
- **Decision**: SDD artifacts are split by scope: global decisions in the root `.specs/STATE.md`, and each app keeps its own `.specs/` with its own `STATE.md` and `features/`; decision IDs are prefixed by scope (`GL-`, `BE-`, `FE-`, `MB-`).
- **Reason**: Keeps API, web and mobile specs from mixing while giving cross-app decisions a single source of truth.
- **Trade-off**: Two `STATE.md` files must be read when starting work on an app (root + app).
- **Scope**: all apps
- **Date**: 2026-10-14
- **Status**: active

### GL-AD-003
- **Decision**: The whole project runs with Docker from a fresh clone: a root `docker-compose.yml` orchestrates PostgreSQL and every runnable app, and each app owns its `Dockerfile` inside its directory.
- **Reason**: Anyone cloning from GitHub can try the project with one command (`docker compose up`) and no local Node/PostgreSQL install.
- **Trade-off**: Dockerfiles and compose config must be maintained per app; mobile (Expo) cannot fully run in a container, so it is the exception and will be handled when mobile starts.
- **Scope**: all apps (back-end and front-end in compose; mobile excluded)
- **Date**: 2026-10-14
- **Status**: active

### GL-AD-004
- **Decision**: One GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every pull request (any base branch) and on pushes to `main`. A matrix runs each back-end script (`lint`, `build`, `test`, `test:integration`, `test:e2e`) as its own parallel job with `fail-fast: false`; integration and e2e use Testcontainers on the runner's Docker daemon.
- **Reason**: Every PR is checked before review, and each script shows up as a separate status check, so one failure never hides another.
- **Trade-off**: Each matrix job repeats checkout, setup and install, and two jobs pull the PostgreSQL image; actions are pinned to major tags, not commit SHAs.
- **Scope**: all apps (front-end and mobile add their own jobs when they start)
- **Date**: 2026-10-21
- **Status**: active

### GL-AD-005
- **Decision**: The API contract lives in the workspace package `packages/api-contract` (`@my-trello/api-contract`). The back-end `openapi:export` script writes the OpenAPI document with Nest preview mode (no database, no secrets), and `openapi-typescript` turns it into `src/schema.d.ts`; both generated files are committed. A CI job (`api-contract`) regenerates them and fails on any diff.
- **Reason**: Front-end and mobile import the same types the API serves, and a contract change shows up in the PR diff instead of breaking a client at runtime.
- **Trade-off**: Types only, no runtime client yet (the front-end picks one, e.g. `openapi-fetch`); every DTO change needs `pnpm --filter @my-trello/api-contract run generate`. `openapi-typescript` 7.13 declares a `typescript ^5` peer while the repo uses TypeScript 6, so pnpm warns about an unmet peer; generation and type checks pass.
- **Scope**: all apps
- **Date**: 2026-10-21
- **Status**: active

## Handoff

