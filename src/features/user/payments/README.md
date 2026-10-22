# Feature: `payments` (user area)

**Scope:** Payment hand-off and payment result handling (success, failure, cancelled).

**Routes:** Used inside `/checkout`

**Notes:** No payment-gateway SDK or card handling lives in this repo yet. Payment status is authoritative only from the backend; a failed or abandoned payment must not be shown as a confirmed booking.

Not implemented yet. When building this feature, add only the folders you need:

```
payments/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/payments.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
