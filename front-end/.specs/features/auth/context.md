# Auth Context

**Gathered:** 2026-10-23
**Spec:** `front-end/.specs/features/auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Real `/signup` and `/login` forms (doc §4), the 429 and connection notices, and Sign out from a `/settings` page that holds only the Session section. A minimal top bar (logo + Settings icon) makes `/settings` reachable.

---

## Implementation Decisions

### Where Sign out lives

- `/settings` ships now with only the Session section: "Conectado como {nome} · {e-mail}" from `GET /api/v1/me` and the **Sair** button.
- Feature `settings` (6) adds language, theme and keyboard shortcuts to the same page later.

### Network and 5xx failures on the forms

- Shown as an alert at the top of the form, in the same slot as the 429 notice.
- Text: the existing i18n key `errors.network` ("Não foi possível falar com o servidor. Verifique sua conexão.").
- Fields keep their values; the submit button is enabled again.

### Agent's Discretion

- Top bar with logo and Settings icon on protected pages, so `/settings` is reachable without typing the URL.
- `400` on log in shows the generic invalid-credentials alert.
- `400` with `errors[]` on sign up maps each field to the doc §4 message.
- Sign up ignores `redirect` and always lands on `/boards`.
- Sign out clears token and query cache and goes to `/login` with no query string and no toast.

### Declined / Undiscussed Gray Areas → Assumptions

All logged in the spec's Assumptions table; confirmed at spec approval (2026-10-23).

---

## Specific References

- Doc `front-end/design/Task List - Documentação.md` §4 (Acesso) and §9 (Configurações → Sessão).
- Prototype `front-end/design/Task List.dc.html`: form markup (lines 130–150) and `authSubmit` (line 1014) for validation order, alert slot, blue session-expired box and red alert with icon (`timer` for 429, `circle-alert` otherwise).
- Texts: `front-end/design/i18n.js` (`errName`, `errLen100`, `errEmail`, `errPwLen`, `errEmailTaken`, `errLogin`, `errRate`, `creating`, `tAccountCreated`, `logout`).

---

## Deferred Ideas

None - discussion stayed within feature scope.
