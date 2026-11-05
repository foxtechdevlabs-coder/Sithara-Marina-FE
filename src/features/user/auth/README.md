# Feature: `auth` (user area)

**Scope:** Customer sign-in and registration forms and session helpers.

**Routes:** `/login`, `/register`, `/verify-email` (emailed link), `/verify-email/success`, `/verify-email/failed`, `/verify-email/pending`, `/forgot-password`, `/reset-password`

**Notes:** Registration, email verification, resend, sign-in, password reset, refresh and logout are connected to the backend. Emailed links are token-based (`#token=<id>.<secret>`; `?token=` is also accepted). The session (tokens + user) lives in `session.ts` (sessionStorage). See [docs/api-integration.md](../../../../docs/api-integration.md#customer-authentication).

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
