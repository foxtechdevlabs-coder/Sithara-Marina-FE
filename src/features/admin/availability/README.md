# Feature: `availability` (admin area)

**Scope:** Availability calendar, slot definitions, blocked dates and unavailable slots.

**Routes:** `/admin/availability`, `/admin/availability/slots`, `/admin/availability/blocked`

Not implemented yet. When building this feature, add only the folders you need:

```
availability/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/admin/availability.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
