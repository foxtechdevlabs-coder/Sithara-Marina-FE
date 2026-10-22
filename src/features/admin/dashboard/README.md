# Feature: `dashboard` (admin area)

**Scope:** Overview statistics and summary widgets.

**Routes:** `/admin/dashboard`

Not implemented yet. When building this feature, add only the folders you need:

```
dashboard/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/admin/dashboard.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
