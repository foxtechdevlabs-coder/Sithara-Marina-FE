# Feature: `refunds` (admin area — "Payments & refunds")

**Routes (admin Figma screen):**

| Route                                 | Screen                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `/admin/refunds`                      | A19 "Money movements, made clear." — Payments / Refunds / Exceptions     |
| `/admin/refunds/payments/[id]`        | A payment with its refunds (record or retry) and provider events         |
| `/admin/refunds/payments/[id]/refund` | A20 "A refund, carefully reviewed." → A40 "Check the refund, once more." |

`?tab=refunds` or `?tab=exceptions` opens the list on that tab. The booking record's Payments tab
links each payment here ("Refund this payment" when captured).

## Backend contract

| Endpoint                            | Used by                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `GET /admin/payments`               | Payments tab; Exceptions tab (`needs_review=true`)                 |
| `GET /admin/payments/{id}`          | Payment page and the refund form (balances)                        |
| `POST /admin/bookings/{id}/refunds` | "Confirm refund request" (with `payment_id` and `Idempotency-Key`) |
| `GET /admin/refunds`                | Refunds tab                                                        |
| `PATCH /admin/refunds/{id}`         | Record a cash / bank refund as handed back, or failed              |
| `POST /admin/refunds/{id}/retry`    | Retry a failed gateway refund                                      |

API functions: `src/services/admin/payments.service.ts`. Wording: `utils/money-format.ts`.

## Notes

- Each reviewed refund gets one idempotency key: a double click or a retry after a lost answer
  can't refund twice. Going back to edit starts a new key.
- The API has no note on a refund, so the form's "Internal note" is added to the booking's notes
  (`POST /admin/bookings/{id}/notes`). If that fails, the refund still stands and the page says so.
- Cash and bank transfer payments are refunded by staff: the form can record it as already handed
  back (`completed`), or it stays processing until recorded on the payment page.
- The amount can't exceed `refundable_amount` (captured, less refunded and pending refunds).
