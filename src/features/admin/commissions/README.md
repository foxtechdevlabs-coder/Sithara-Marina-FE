# Feature: `commissions` (admin area)

**Scope:** Commission rules for partner yachts, and the commission each partner has earned.

**Routes:**

| Route                    | Screen                                                                            |
| ------------------------ | --------------------------------------------------------------------------------- |
| `/admin/commissions`     | "Commission earned": the commission report, all partners or `?partner=` one       |
| `/admin/commissions/new` | A16 "Fair value, clearly defined." rule form; `?partner=` or `?yacht=` preselects |

"Add custom commission" on the report opens the form on the partner being viewed.

## Backend contract

| Endpoint                              | Used by                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `GET /admin/partners?status=active`   | The partner / yacht picker                                   |
| `GET /admin/yachts?ownership=partner` | Partner yachts and their own rates                           |
| `PUT /admin/partners/{id}/commission` | The partner's default rate (yachts without their own use it) |
| `PATCH /admin/partners/{id}`          | "Effective from / until" = the partner's agreement dates     |
| `PUT /admin/yachts/{id}/commission`   | A yacht's own rate (wins over the partner's)                 |
| `GET /admin/reports/commission`       | "Commission earned" for the selected partner, with export    |

## Notes

- Only percentage rates exist, on the charter amount excluding GST and add-ons, so "Commission
  type" and "Calculation basis" are shown but fixed.
- Dates belong to the partner's agreement; a yacht rule shows them read-only.
- The API keeps no history of rates, so the rule table lists the current rules only. An agreement
  whose end date has passed shows as "Historical". Each booking keeps the rate snapshotted when its
  payment was confirmed (see the report).
- A rate change affects new bookings only.
