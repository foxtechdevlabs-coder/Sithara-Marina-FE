# Feature: `pricing` (admin area)

**Scope:** Per-yacht slot and add-on pricing management.

**Routes:** `/admin/fleet/[yachtId]/pricing`

**Notes:** The admin edits price configuration; the backend remains the authority for calculating customer prices.

Not implemented yet. When building this feature, add only the folders you need:

```
pricing/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/admin/pricing.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
