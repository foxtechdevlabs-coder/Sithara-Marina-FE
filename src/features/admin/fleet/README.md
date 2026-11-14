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
  changes are saved immediately. Photos are optional for creating a yacht, so a failed upload never
  blocks it: the yacht page opens with a note, and photos can be added later in Edit yacht. The
  backend needs one only before a yacht can be visible.
- The form's three booking options map to `booking_mode` + `enquiry_enabled`: Instant =
  `instant`/false, Slots + concierge = `instant`/true, Enquiry only = `enquiry_only`.
  `enquiry_enabled` only matters for `instant` yachts, so it isn't sent for `enquiry_only`.
- The add/edit form follows the admin design. Length is entered in metres and saved as whole
  feet (`length_ft`); "Home port" is saved as `departure_city`. Edit also shows saved fields the
  design leaves out (URL name, departure points, inclusions, policies).
- Cruising speed is entered in knots and saved as km/h; "Built / refit" is one input saved as
  `built_year` + `refit_year`. "Hourly rate" (`hourly_rate`) is a staff reference: customers pay the
  slot price rules, never this. "Publish yacht" also needs a region and a tagline; a draft doesn't.
- Operational status Active / Inactive is saved with `…/activate` / `…/deactivate`.
- Operating hours and packages (`utils/booking-setup.ts`) are on both the add and edit forms, and
  are saved through `PUT …/slot-types` and the price-rule endpoints; the API has no minimum-duration
  or package fields. A package's switch is the slot type's `is_active`: on with a price is bookable,
  off hides it and keeps its price. `PUT` always sends every package with its id, because one left
  out is deleted along with its prices. Turning off a visible yacht's last priced package returns
  409 `NOT_PUBLISHABLE`.
  Every charter starts at 5:00 AM or later and is back by 7:00 PM the same day, so `closes_at`
  (last return) is at most 19:00 and each package gets the hourly starts it can finish from (a
  3-hour package's last start is 4:00 PM). On edit, unchanged hours leave saved start times and
  display order alone, so slots made on Slots & pricing aren't rewritten.
- Package prices start as hourly rate × hours and stay editable. A price that no longer matches
  stays as typed when the rate changes. A saved package with no price gets rate × hours when the
  edit form opens, and the yacht page shows it with a button to save it, since a package can't be
  booked until its price is saved. Guests pay the saved package price, not `hourly_rate`.
- New yachts are always created hidden (backend rule). "Publish yacht" then makes the yacht visible
  if it has a priced package and a photo; without a price it opens Slots & pricing.
- The yacht page lists the packages read-only (`components/packages-panel.tsx`): Bookable, Hidden, or
  Needs a price. They are changed on the edit form.
- Bookings, availability, activity and "next charter" on the yacht page are not connected yet.
- Photo upload needs the storage bucket's CORS rule to allow `PUT` from the admin origin.

## 360° view (optional)

On the yacht form, under Photos (`components/yacht-spin-section.tsx`; API in
`src/services/admin/yacht-spin.service.ts`).

- Video: MP4, MOV or WebM, 2–60 seconds, up to 200 MB. Type and size are checked before upload.
  The length is read by the browser when it can; some MOV files can't be read, and the backend
  checks again. A `.mov` the browser leaves untyped is sent as `video/quicktime`.
- Frames: 36 (default) to 72, in steps of 4, sent as `frame_count`.
- Upload: `POST /admin/media/uploads` (purpose `yacht_spin_video`), PUT to `upload_url` with
  progress, then `PUT /admin/yachts/{id}/spin` `{ media_id, frame_count }`. While the attempt is
  `pending` or `processing`, `GET …/spin` is polled every 4 s until it goes live or fails.
- New yacht: the video waits in the form and is uploaded after `POST /admin/yachts` returns the
  yacht's id. If that fails, the yacht page says so (`?notice=no-spin`) and the video can be added
  in Edit yacht.
- Replacing: the live view stays up (`live`) while the new video (`attempt`) processes. A failed
  attempt shows its error and leaves the live view alone. Upload is disabled while one processes.
- Starting frame (1-based, in filming order) and reverse rotation: `PATCH …/spin`. Remove:
  `DELETE …/spin`.
- Video upload uses the same storage CORS rule as photos.
- Preview (`components/spin-viewer.tsx`, `src/lib/spin-frames.ts`): when the viewer opens it asks
  once for the frame links with `GET /yachts/{slug}/spin?size=` (`small` at 767px wide or less,
  `large` otherwise). For a hidden or inactive yacht the public endpoint answers 404, so the admin
  preview frames are used instead. Every frame is downloaded and decoded first, with progress, and
  turning is enabled only once all are ready. Frames are then drawn on a canvas from memory, so
  dragging makes no requests. A failed frame is retried three times; if frames still fail, the
  links are fetched once more (they're signed for about an hour) and the missing frames loaded
  again. Changing the starting view reuses the frames already in memory. Leaving the page cancels
  any downloads still running and frees the frames.
