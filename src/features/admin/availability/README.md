# Feature: `availability` (admin area)

**Scope:** One yacht's availability calendar, and availability blocks (maintenance, private use,
weather and other time that can't be booked).

**Routes (admin Figma screen):**

| Route                              | Screen                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| `/admin/availability`              | "Room for every journey." — month calendar and schedule for one yacht |
| `/admin/availability/blocked`      | List of blocks (upcoming / all, by yacht and reason)                  |
| `/admin/availability/blocked/new`  | A07 — "Make room for maintenance."; a 409 shows A36 (conflict)        |
| `/admin/availability/blocked/[id]` | A07 — edit or remove a block                                          |
| `/admin/availability/slots`        | Placeholder (slot types and prices live under each yacht's pricing)   |

The calendar takes `?yacht=&month=YYYY-MM&date=YYYY-MM-DD&notice=` so other screens can link to a
yacht and day. "Block a time" passes `?yacht=&date=` to the new block form.

## Backend contract (see the backend's `/docs`)

| Endpoint                                 | Used by                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `GET /admin/calendar`                    | The month view; the form's live "Availability check"; A36 detail |
| `GET /admin/availability-blocks`         | Block list; loading a block to edit (no single-block endpoint)   |
| `POST /admin/availability-blocks`        | New block (409 `BLOCK_CONFLICT` → A36)                           |
| `PATCH /admin/availability-blocks/{id}`  | Edit block (the yacht can't change)                              |
| `DELETE /admin/availability-blocks/{id}` | Remove block                                                     |

API functions: `src/services/admin/availability.service.ts`. Time zones, wording and the overlap
check: `utils/availability-format.ts`.

## Notes

- Staff type times in the marina's time zone (Asia/Kolkata). They are sent as ISO instants with
  that offset (`zonedIso`), e.g. `2026-11-17T08:00:00+05:30`. `ends_at` is exclusive.
- The backend refuses a block over a confirmed booking, a pending booking that still holds its
  slot, or a live checkout hold, including the yacht's turnaround either side. The form checks
  the same thing first with the calendar (at most 42 days), so staff see the conflict before saving.
- A date is shown as unavailable when it has a block, or (today onwards) no free package window.
- Reasons are read as strings so a new backend value doesn't fail the page.

## Bulk blocks

`/admin/availability/blocked/bulk` blocks chosen yachts (1–100) or every active yacht
(`POST /admin/availability-blocks/bulk`). It first sends `skip_conflicts: false`; a 409
`BLOCK_CONFLICT` lists the yachts in the way (`details.conflicts`: booking references, live
checkout) and offers "Block the others" (`skip_conflicts: true`). The result shows what was blocked
and skipped and can remove the whole bulk block (`DELETE /admin/availability-blocks/batches/{id}`).
Blocks from a bulk block carry `batch_id`: the list tags them "Bulk", and their edit page can
remove just that yacht's block or the whole bulk block.
