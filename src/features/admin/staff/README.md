# Feature: `staff` (admin area)

**Scope:** Staff accounts, roles and permissions.

**Routes:** `/admin/staff`, `/admin/staff/roles`

**Notes:** Permissions are enforced by the backend. The UI may hide actions a role cannot perform, but hiding is never a security control.

Not implemented yet. When building this feature, add only the folders you need:

```
staff/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/admin/staff.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
