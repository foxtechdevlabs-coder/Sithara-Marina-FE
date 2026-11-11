# Feature: `audit` (admin area — "Audit history")

**Route:** `/admin/audit` — A42 "A clear history of changes." `?entity_type=&entity_id=` shows one
record's history (`adminRoutes.auditFor`).

## Backend contract (`audit:read`)

| Endpoint                     | Used by                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `GET /admin/audit-logs`      | The list: staff (`actor_id`), dates, record type / id filters |
| `GET /admin/audit-logs/{id}` | "Changes": the record before and after, as a field table      |
| `GET /admin/staff?search=`   | The staff filter                                              |

## Notes

- Entries carry only the record's type and id. The Record column names it with one request per
  record (yacht, booking, partner, customer, payout, payment), shared across rows, and links to its
  page; other types show a short id.
- Actions such as `yacht.update` read "Updated yacht"; the raw action is the cell's tooltip.
- Money-like fields (`…amount`, `price`, `total`) in a change are shown in rupees (paise on the wire).
