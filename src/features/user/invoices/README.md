# Feature: `invoices` (user area)

**Scope:** Invoice viewing / download for a booking.

**Routes:** `/account/bookings/[bookingId]/invoice`

Not implemented yet. When building this feature, add only the folders you need:

```
invoices/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/invoices.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
