# Feature: `auth` (admin area)

**Scope:** admin sign-in, the admin session, and staff password recovery.

**Routes:** `/admin/login`, `/admin/reset-password`, `/admin/set-password`,
`/admin/forgot-password`

## Backend contract (`/admin/auth/*`, see the backend's `/docs`)

| Endpoint                             | Used by                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `POST /admin/auth/login`             | `/admin/login` → `AdminSessionProvider.signIn`                                    |
| `POST /admin/auth/refresh`           | `services/admin/admin-session.ts` (automatic)                                     |
| `POST /admin/auth/logout`            | Sidebar "Sign out" → `AdminSessionProvider.signOut`                               |
| `GET /admin/auth/me`                 | Session restore + `RequireAdmin` guard, sidebar name/role                         |
| `POST /admin/auth/forgot-password`   | `/admin/forgot-password` — **staff only**, not linked from the admin sign-in page |
| `POST /admin/auth/verify-reset-link` | `/admin/reset-password` (emailed link `#token=…`)                                 |
| `POST /admin/auth/reset-password`    | `/admin/reset-password`                                                           |

API functions live in `src/services/admin/auth.service.ts`.

## Session

- Tokens come back in the response body (`access_token`, `refresh_token`, `expires_in`) and are
  kept in `localStorage` (`sm.admin.session`) so reloads and new tabs stay signed in.
- `src/services/admin/admin-api-client.ts` (same `createHttpClient` and base URL as `apiClient`)
  sends `Authorization: Bearer …`, refreshes shortly before expiry, and on a 401 refreshes once and
  retries.
- Refresh tokens rotate (each works once), so only one refresh runs at a time — within a tab and
  across tabs (Web Locks); other tabs reuse the new pair.
- A refused refresh clears the session; the console redirects to
  `/admin/login?reason=expired&next=…`. Sign-out in one tab signs out all tabs.
- `RequireAdmin` is a UI guard only; the backend enforces access on every admin endpoint.

## Backend configuration this relies on

The backend emails staff reset links as `${ADMIN_PASSWORD_RESET_URL}#token=…`. Point it at this
app's page: `http://localhost:3001/admin/reset-password` locally, or the deployed frontend's
`/admin/reset-password`.

The backend's CORS settings must allow each frontend origin (the hosted backend allows
`http://localhost:3001`; add the deployed frontend's origin too).
