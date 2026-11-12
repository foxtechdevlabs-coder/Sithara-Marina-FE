# Feature: `payment-link` (customer page for admin payment links)

**Route:** `/pay#token=…` (`?token=` also works). This is the page the backend's `PAYMENT_LINK_URL`
should point to. Staff issue the link from the admin booking page (`POST
/admin/bookings/{id}/payment-link`), and the customer opens it from the email.

**Flow**

1. `GET /pay` shows the booking and the amount due. A 404 `PAYMENT_LINK_NOT_FOUND` means the link is
   missing, revoked or expired.
2. `POST /bookings/{id}/payments` returns the Razorpay order (`checkout.key_id`, `checkout.order_id`).
   An attempt that's already open is returned again, so calling it twice never creates two orders.
3. Razorpay Checkout opens (`src/lib/razorpay.ts` loads `checkout.js`).
4. `POST /bookings/{id}/verify-payment` sends `{ payload }`, exactly what the modal returned, and the
   page handles `outcome`:
   - `confirmed` or `already_done`: booking confirmed.
   - `needs_review`: payment received, and staff will finish the check.
   - `failed`: the customer can try again.
   - `processing`: the page re-reads `GET /pay` every 3 s for up to a minute.

All three calls send `X-Payment-Link-Token` and no account token (`auth: false`). The token is
removed from the address bar and kept in `sessionStorage` for this tab, so a refresh still works.
The Razorpay webhook is handled by the backend only.

**States shown:** payable (with time left), paying, confirming, confirmed, already paid, payment
received (needs review), being confirmed, cancelled or refunded, time to pay passed, and invalid link.

```
payment-link/
├── components/   payment-link-page
└── utils/        token reading, customer error text, state from the summary
```

Service: `src/services/user/payment-link.service.ts`. Tests: `tests/integration/payment-link.test.ts`.
