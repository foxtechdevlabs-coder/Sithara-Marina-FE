# Feature: `booking` (user area)

**Scope:** Booking state shared across the flow (selected yacht, slot, guests, add-ons) and the confirmation view.

**Routes:** `/checkout/confirmation/[bookingId]`

**Notes:** A booking is only confirmed when the backend says so. The confirmation page must load the booking from the API, not trust client-side state.

Not implemented yet. When building this feature, add only the folders you need:

```
booking/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/booking.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
