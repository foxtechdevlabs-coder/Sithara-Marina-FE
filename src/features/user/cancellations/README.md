# Feature: `cancellations` (user area)

**Scope:** Cancellation requests for a booking.

**Routes:** `/account/bookings/[reference]/cancel` (preview and request), `/account/cancellations` (history)

**Notes:** Eligibility and refund amounts are decided by the backend according to the cancellation policy; the UI only presents them.

Connected to `GET /me/bookings/{ref}/cancellation-preview`, `POST /me/bookings/{ref}/cancellation-requests` and `GET /me/cancellation-requests` (`src/services/user/cancellations.service.ts`). A request is only a request: staff decide. Add only the folders you need:

```
cancellations/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/cancellations.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
