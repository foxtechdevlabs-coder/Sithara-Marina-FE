# Feature: `fleet` (admin area)

**Scope:** Yacht list, create and edit forms, yacht overview.

**Routes:** `/admin/fleet`, `/admin/fleet/new`, `/admin/fleet/[yachtId]`, `/admin/fleet/[yachtId]/edit`

**Notes:** Must distinguish **company-owned** and **partner-owned** yachts; the ownership model comes from the backend.

Not implemented yet. When building this feature, add only the folders you need:

```
fleet/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/admin/fleet.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
