# Feature: `customer-bookings` (user area)

**Scope:** Customer booking history and individual booking details.

**Routes:** `/account/bookings`, `/account/bookings/[bookingId]`

Not implemented yet. When building this feature, add only the folders you need:

```
customer-bookings/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/customer-bookings.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
