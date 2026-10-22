# Feature: `auth` (user area)

**Scope:** Customer sign-in and registration forms and session helpers.

**Routes:** `/login`, `/register`

**Notes:** Do not choose a token storage strategy until the backend auth contract is defined. Prefer httpOnly cookies set by the backend over storing tokens in `localStorage`.

Not implemented yet. When building this feature, add only the folders you need:

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
