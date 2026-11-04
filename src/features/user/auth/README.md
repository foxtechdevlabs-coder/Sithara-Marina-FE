# Feature: `auth` (user area)

**Scope:** Customer sign-in and registration forms and session helpers.

**Routes:** `/login`, `/register`, `/verify-email` (emailed link), `/verify-email/success`, `/verify-email/failed`, `/verify-email/pending`, `/forgot-password`, `/reset-password`

**Notes:** Registration, email verification (link-based, `#token=<id>.<secret>`, or `?token=` for older links) and resend are connected to the backend; sign-in and password reset are not yet. The session (tokens + user) lives in `session.ts` (sessionStorage). See [docs/api-integration.md](../../../../docs/api-integration.md#customer-authentication).

Add only the folders you need:

```
auth/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/auth.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
