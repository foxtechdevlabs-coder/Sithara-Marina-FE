# Feature: `checkout` (user area)

**Scope:** Guest details, optional add-ons, tax and total review, terms acceptance, hand-off to payment.

**Routes:** `/checkout`

**Notes:** The backend places a **ten-minute hold** on the selected slot. Checkout should display the hold expiry returned by the API (not a locally invented timer) and handle hold expiry and abandoned checkouts by returning the customer to slot selection. Prices, taxes and totals are calculated by the backend and only displayed here.

Not implemented yet. When building this feature, add only the folders you need:

```
checkout/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/checkout.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
