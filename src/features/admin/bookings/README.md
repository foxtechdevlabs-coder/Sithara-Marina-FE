# Feature: `bookings` (admin area)

**Scope:** Booking list, booking details and office-created (manual) bookings.

**Routes:** `/admin/bookings`, `/admin/bookings/new`, `/admin/bookings/[bookingId]`

**Notes:** Office-created bookings go through the same backend availability and hold rules as online bookings.

Not implemented yet. When building this feature, add only the folders you need:

```
bookings/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/admin/bookings.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
