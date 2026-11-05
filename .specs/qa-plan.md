# QA plan (low-token)

Standing plan for every QA pass, current and future features. Keep the token cost low.

- **A. Playwright e2e (headless), first.** List the existing e2e specs, find the gaps, then write or extend specs for the missing flows (cards, labels, settings). Run them and read only the pass/fail summary and the failing errors. Specs stay in the repo and run in CI (`front-end (test:e2e)`).
- **B. Lean Chrome pass, only for what e2e can't cover (visual, responsive).** One tab, `get_page_text`/`find` before screenshots, at most 2-3 screenshots, a short fixed checklist, close the tab at the end. Browser use still needs the user's explicit yes for each QA pass; ask in one line before opening it.
