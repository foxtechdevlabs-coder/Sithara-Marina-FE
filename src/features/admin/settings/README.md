# Feature: `settings` (admin area)

**Scope:** Business rules: tax, time zone, cancellation policy, contact details.

**Routes:** `/admin/settings`

## Backend contract (see the backend's `/docs`)

| Endpoint              | Used by                                      |
| --------------------- | -------------------------------------------- |
| `GET /admin/settings` | Loads the form (`settings:read`)             |
| `PUT /admin/settings` | Save, changed fields only (`settings:write`) |

API functions: `src/services/admin/settings.service.ts`. Form ↔ API mapping and validation:
`utils/settings-form.ts`.

## Notes

- The tax rate has no default, and quoting refuses until it is set.
- The design shows things the API doesn't have: Currency is fixed at INR, and the notification
  templates card is fixed text.
- `booking_horizon_days`, `weekend_days`, `earliest_start_time` and `latest_end_time` aren't on the
  form, so saving leaves their stored values alone.
- The yacht forms still use fixed 5:00 AM and 7:00 PM limits (`FIRST_START`, `LAST_RETURN`), not
  `earliest_start_time` and `latest_end_time`.
