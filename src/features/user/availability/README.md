# Feature: `availability` (user area)

**Scope:** Date and slot selection (two-hour, four-hour, half-day, full-day).

**Routes:** `/yachts/[yachtId]/availability`

**Notes:** Availability is **always read from the backend**. The UI may show what it was told is available, but must never decide availability itself. Slot types and durations come from the API, not hard-coded constants.

Not implemented yet. When building this feature, add only the folders you need:

```
availability/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/availability.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
