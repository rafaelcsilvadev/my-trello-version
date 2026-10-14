# Specs — monorepo layout

Spec-Driven Development artifacts are split by scope so each app stays self-contained.

```
my-trello-version/
├── .specs/                 # GLOBAL: decisions that bind every app (no feature specs here)
│   ├── README.md           # this file
│   └── STATE.md            # GL-AD-NNN decisions
├── back-end/.specs/        # API (NestJS): BE-AD-NNN decisions + features/
├── front-end/.specs/       # Web (created when the front-end starts): FE-AD-NNN
└── mobile/.specs/          # Mobile (created when mobile starts): MB-AD-NNN
```

## Rules

- **Global vs app.** A decision goes to the root `STATE.md` only when it binds more than one app (repo layout, package manager, shared contracts). Everything else lives in the app's own `STATE.md`.
- **Feature specs live only inside an app**: `<app>/.specs/features/<feature>/{spec,context,design,tasks,validation}.md`. The root never holds features.
- **Decision IDs are prefixed by scope** so they never collide across files: `GL-AD-` (global), `BE-AD-` (back-end), `FE-AD-` (front-end), `MB-AD-` (mobile). Numbers are sequential per file and never reused.
- **Precedence.** App decisions must conform to active global decisions; an app that needs to deviate supersedes the global entry here, not locally.
- **Running the skill scripts** for an app: pass `--root <app>` (e.g. `--root back-end`).
