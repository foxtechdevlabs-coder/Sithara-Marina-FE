# Feature: `payouts` (admin area)

**Scope:** Partner statements, recording transfers already made, and the payout history.

**Routes (admin Figma screen):**

| Route                                         | Screen                                                              |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `/admin/payouts`                              | Open a statement (partner + period); recorded payouts               |
| `/admin/payouts/statement?partner=&from=&to=` | A18 "A transparent statement." → A39 "Confirm the recorded payout." |
| `/admin/payouts/[id]`                         | A recorded payout with its bookings (`?recorded=1` after saving)    |

## Backend contract (`payouts:read` / `payouts:write`)

| Endpoint                     | Used by                                          |
| ---------------------------- | ------------------------------------------------ |
| `GET /admin/payouts/summary` | The statement: lines, paid / outstanding, totals |
| `POST /admin/payouts`        | "Mark statement paid" (A39)                      |
| `GET /admin/payouts`         | Recorded payouts (filter by partner)             |
| `GET /admin/payouts/{id}`    | Payout page                                      |

## Notes

- A payout records a transfer already made; it doesn't move money.
- Only completed, unpaid bookings can be paid (`INVALID_PAYOUT` otherwise; `BOOKING_ALREADY_PAID`
  if another payout got there first, nothing saved). Payable lines start selected and can be
  left for a later transfer; the amount sent is their partner payable total, as the API requires.
- The statement's "Booking total" is the booking total incl. GST (`gross_amount`). The API has no
  charter-only basis on statements; the commission report shows that one.
- The API has no statement number, so a statement is named by partner and period.
- A paid line whose booking later stops being completed is flagged for follow-up.
