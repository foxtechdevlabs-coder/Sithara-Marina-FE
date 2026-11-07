# Feature: `yachts` (user area)

**Scope:** Yacht listing, filtering and detail views: description, gallery, crew, amenities, policies.

**Routes:** `/yachts`, `/yachts/[yachtId]`

**Notes:** Connected to the backend through `src/services/user/yachts.service.ts`. `[yachtId]` is the yacht's slug. See [docs/api-integration.md](../../../../docs/api-integration.md#yacht-catalogue).

Add only the folders you need:

```
yachts/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/yachts.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
