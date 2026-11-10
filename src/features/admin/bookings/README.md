# Feature: `bookings` (admin area)

**Scope:** Booking list, booking record, office-created bookings, payments, reschedule and
cancellation.

**Routes (admin Figma screen):**

| Route                             | Screen                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `/admin/bookings`                 | A08 — "Every booking, in view."                                    |
| `/admin/bookings/new`             | A09 → A10 — new office booking, then payment                       |
| `/admin/bookings/[id]`            | A11 — "The complete charter record." (overview, payments, history) |
| `/admin/bookings/[id]/payment`    | A10 — offline payment; `?mode=link` opens A38 (payment link)       |
| `/admin/bookings/[id]/reschedule` | A12 — "A new time on the water."                                   |
| `/admin/bookings/[id]/cancel`     | A13 — "Review a change of plans."                                  |

## Backend contract (see the backend's `/docs`)

| Endpoint                                   | Used by                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| `GET /admin/bookings`                      | List: search, departure month, yacht, status / needs review  |
| `POST /admin/bookings`                     | New office booking (with `payment` = confirmed at once)      |
| `GET /admin/bookings/{id}`                 | Record, payment, reschedule and cancel screens               |
| `PATCH /admin/bookings/{id}`               | "Edit guest details"; contact after create if it differs     |
| `GET /admin/bookings/{id}/timeline`        | History tab and the latest entries on Overview               |
| `POST /admin/bookings/{id}/notes`          | Internal note (also the note typed on the forms)             |
| `POST /admin/bookings/{id}/payment-link`   | Payment link (A38)                                           |
| `POST /admin/bookings/{id}/payments`       | Offline payment for a pending office booking                 |
| `POST /admin/bookings/{id}/cancel`         | Cancellation with refund decision                            |
| `POST /admin/bookings/{id}/reschedule`     | Reschedule                                                   |
| `POST /admin/bookings/{id}/price-override` | "Change the price" (super admin, unpaid office bookings)     |
| `POST /admin/bookings/{id}/status`         | Mark completed / no-show                                     |
| `GET /admin/calendar`                      | Free slots for a date (new booking) and a month (reschedule) |
| `POST /pricing/quote`                      | Price review before creating; price check on reschedule      |
| `GET /admin/customers`                     | "Find existing customer"                                     |
| `GET /admin/addons?yacht_id=`              | Add-ons on the new booking form                              |
| `GET /admin/reports/bookings/export`       | "Export filtered results" (CSV, needs `reports:read`)        |

API functions: `src/services/admin/bookings.service.ts`. Wording, money and dates:
`utils/booking-format.ts`.

## Notes

- Amounts are paise in the API; staff type rupees (`parseRupees`).
- An offline payment must equal the booking total (no part payments). A payment link holds the
  slot for 24 hours and is emailed to the booking's contact; the link is shown so it can be copied
  if the email fails.
- When "Payment link" is chosen on a new booking, the booking is created first (pending), then the
  link is issued. If the link fails, the booking stays pending and the screen links to it.
- A reschedule can't change the price (409 `PRICE_WOULD_CHANGE`); the screen quotes the new slot
  and warns before confirming.
- Cancelling records the refund owed; the refund itself is paid on Payments & refunds.
- Enum-like fields are read as strings so a new backend value doesn't fail the page.

## Cancellation requests

| Route                                        | Screen                                                  |
| -------------------------------------------- | ------------------------------------------------------- |
| `/admin/bookings/cancellation-requests`      | Queue: awaiting (oldest first), approved, declined, all |
| `/admin/bookings/cancellation-requests/[id]` | Request with refund preview; approve or decline         |

`GET /admin/cancellation-requests`, `GET …/{id}`, `POST …/{id}/approve` (refund decision full /
partial / none, optional note shown to the customer), `POST …/{id}/reject` (reason required, shown
to the customer). Approving cancels the booking and records the refund owed; the screen then links
to refunding the captured payment. The bookings list shows how many requests wait; a booking with a
pending request shows a banner. The booking record's Payments tab lists its `refunds`.
