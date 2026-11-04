# Feature: `fleet` (admin area)

**Scope:** Yacht list, create and edit forms, yacht page, photos, crew, commission.

**Routes:** `/admin/fleet`, `/admin/fleet/new` (`?duplicate=<id>`), `/admin/fleet/[yachtId]`,
`/admin/fleet/[yachtId]/edit`

## Backend contract (see the backend's `/docs`)

| Endpoint                                   | Used by                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| `GET /admin/yachts`                        | Fleet list (page/limit 20, `status`, `visibility`, `search`) |
| `POST /admin/yachts`                       | Add yacht (always created hidden)                            |
| `GET /admin/yachts/{id}`                   | Yacht page, edit form, duplicate                             |
| `PATCH /admin/yachts/{id}`                 | Edit form — only changed fields; emptied fields sent as null |
| `POST /admin/yachts/{id}/activate`         | List row action, yacht page (with confirmation)              |
| `POST /admin/yachts/{id}/deactivate`       | Same; shows `affected_bookings` references                   |
| `PUT /admin/yachts/{id}/crew`              | Crew panel on the yacht page (replaces the whole list)       |
| `PUT /admin/yachts/{id}/commission`        | Commission panel (partner yachts; empty = `null`)            |
| `POST /admin/media/uploads` + signed `PUT` | Photo upload (JPEG/PNG/WebP, ≤ 10 MB)                        |
| `POST /admin/yachts/{id}/photos`           | Attach uploaded `media_ids`                                  |
| `PATCH /admin/yachts/{id}/photos/order`    | Drag / "Use in search" (first = cover)                       |
| `DELETE /admin/yachts/{id}/photos/{id}`    | Remove photo (with confirmation)                             |
| `GET /admin/partners?status=active`        | Partner picker for partner-owned yachts                      |

API functions: `src/services/admin/fleet.service.ts`, `media.service.ts`. Form ↔ API mapping and
validation (mirrors the backend DTO rules): `utils/yacht-form.ts`. Error wording:
`utils/fleet-error-message.ts`.

## Notes

- Data is loaded in the browser (`hooks/use-admin-query.ts`), because the admin session lives there.
- On create, photos are queued and uploaded after `POST /admin/yachts` succeeds. On edit, photo
  changes are saved immediately.
- The form's three booking options map to `booking_mode` + `enquiry_enabled`: Instant =
  `instant`/false, Slots + concierge = `instant`/true, Enquiry only = `enquiry_only`/true.
- The add/edit form follows the admin design. Length is entered in metres and saved as whole
  feet (`length_ft`); "Home port" is saved as `departure_city`. Edit also shows saved fields the
  design leaves out (URL name, departure points, inclusions, policies).
- Design fields with **no backend field yet** are shown, marked "Not saved yet", and never sent:
  registration no., cruising regions, crew (count), built / refit, cruising speed, card tagline,
  day rate, minimum days, deposit %, embark / disembark time, and the "Under maintenance" status.
  Operational status Active / Inactive is saved with `…/activate` / `…/deactivate`.
- New yachts are always created hidden (backend rule). "Publish yacht" creates the yacht and opens
  Slots & pricing, since a yacht needs a priced slot type before it can be visible.
- Bookings, availability, activity and "next charter" on the yacht page are not connected yet.
- Photo upload needs the storage bucket's CORS rule to allow `PUT` from the admin origin.
