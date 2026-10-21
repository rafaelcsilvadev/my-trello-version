# Front-end prototype

Reference prototype for the web front-end, exported from Claude Design. It is a design reference, not production code: the front-end recreates its screens and behavior in the real stack.

- `Task List.dc.html`: the prototype (all screens, states and a control bar to switch between them).
- `Task List - Documentação.md`: behavior spec in PT-BR (screens, rules, messages, shortcuts, sample data).
- `i18n.js`: every UI text in PT-BR and EN.
- `support.js`: prototype runtime.
- `_ds/`: Púrpura Design System (tokens, components, styles).

The prototype matches the back-end API as of features 0–6: same fields, limits, archive lifecycle and the demo seed data (`back-end/src/seed/demo-data.ts`). Styling uses Tailwind CSS v4 mapped to the Púrpura tokens.
