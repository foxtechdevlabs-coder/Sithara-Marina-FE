# Feature: `dashboard` (admin area)

**Scope:** Overview statistics and summary widgets.

**Routes:** `/admin/dashboard` (UI: `src/components/admin/admin-dashboard.tsx`)

## Backend contract: `GET /admin/dashboard` (see the backend's `/docs`)

Called with `from` and `to` for the selected reporting period (the last three calendar months).
API function: `src/services/admin/dashboard.service.ts`.

| Block              | Source                                                                                                      | Needs permission |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------- |
| Confirmed bookings | `activity.confirmed`                                                                                        | `bookings:read`  |
| Revenue booked     | `revenue.booked_amount`                                                                                     | `reports:read`   |
| Utilisation        | `utilisation.percent`                                                                                       | `reports:read`   |
| Upcoming bookings  | `charters.today` + `charters.upcoming`                                                                      | `bookings:read`  |
| Needs attention    | `pending_payments` + `alerts`                                                                               | `bookings:read`  |
| Revenue over time  | `GET /admin/reports/revenue` rows, summed by weekday of departure (confirmed + completed); best day in navy | `reports:read`   |

## Notes

- A block is null when the account lacks its permission. It then shows "—" or an access message.
- `revenue.booked_amount` is booked value, not collected money, so the design's "Revenue collected"
  card reads "Revenue booked". The backend marks revenue and utilisation as provisional (OQ-19).
- `charters` and `pending_payments` aren't limited to the selected period: today's and upcoming
  charters, and all bookings awaiting payment.
- `yacht_id` and `ownership` filters exist in the API but have no control in the design yet.
- Dates are shown in `Asia/Kolkata`, the backend's business time zone for every yacht.
