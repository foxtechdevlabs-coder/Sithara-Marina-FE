# Feature: `availability` (user area)

**Scope:** Date, duration and start-time selection, shown by `YachtReservation` with the navy booking card.

**Routes:** `/yachts/[yachtId]` (`#reserve`), `/yachts/[yachtId]/availability`

**Notes:** Availability is **always read from the backend**. The UI may show what it was told is available, but must never decide availability itself. Slot types and durations come from the API, not hard-coded constants.

Connected to the calendar, slots, add-ons and quote endpoints. It books nothing: it hands the selection to checkout. Add only the folders you need:

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
