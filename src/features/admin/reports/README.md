# Feature: `reports` (admin area)

**Routes (admin Figma screen):**

| Route                     | Screen                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `/admin/reports`          | A23 "A clearer perspective." — period, yacht / partner, Revenue · Bookings · Utilisation |
| `/admin/reports/export`   | A37 "Your report is being prepared." — `?type=&from=&to=&yacht=&partner=&scope=`         |
| `/admin/reports/detailed` | Every report with rows, all filters and export (`?type=` opens one tab)                  |

A23 tiles: collected revenue = `revenue.summary.net_amount` (captured less refunds; falls back to
`collected_amount`), completed charters = `bookings.summary.by_status.completed`, utilisation =
`utilisation.summary.percent`. The table joins `revenue.by_yacht`, `bookings.by_yacht` and the
utilisation rows per yacht. "Revenue over time" is the dashboard's weekday chart, narrowed to the
chosen yacht or partner.

## Backend contract (`reports:read`)

| Endpoint                           | Used by                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `GET /admin/reports/{type}`        | Summary tiles, breakdowns and the paged rows of each tab    |
| `GET /admin/reports/{type}/export` | "Export CSV" / "Export Excel" (whole period, ≤ 20,000 rows) |

API functions: `src/services/admin/reports.service.ts`. Shared pieces (tiles, tables, export,
pager) are in `components/report-parts.tsx` and are also used by the Commissions page.

## Notes

- Rows are rendered from the `columns` the backend sends, formatted by column type (money,
  percent, date…), so a new column shows up without a front-end change.
- Each report accepts only its own filters (`REPORT_FILTERS`); the screen drops the others, since
  the backend answers 400 to a filter a report doesn't take.
- The dashboard's revenue chart uses `GET /admin/reports/revenue` too.
- Revenue and utilisation figures are provisional on the backend (OQ-19).
