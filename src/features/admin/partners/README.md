# Feature: `partners` (admin area)

**Scope:** Yacht-owner partner list, add and edit form, agreement document, linked yachts.

**Routes:** `/admin/partners`, `/admin/partners/new`, `/admin/partners/[partnerId]`

## Backend contract (see the backend's `/docs`)

| Endpoint                                   | Used by                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `GET /admin/partners`                      | List (page/limit 20, `search`: name, contact or email) |
| `POST /admin/partners`                     | Add partner                                            |
| `GET /admin/partners/{id}`                 | Details page                                           |
| `PATCH /admin/partners/{id}`               | Save (changed fields only), activate / deactivate      |
| `PUT /admin/partners/{id}/commission`      | Default commission (empty = `null`, new bookings only) |
| `POST /admin/media/uploads` + signed `PUT` | Agreement upload (PDF/JPEG/PNG, ≤ 20 MB)               |
| `POST /admin/partners/{id}/documents`      | Attach the uploaded `media_id`                         |
| `GET /admin/partners/{id}/yachts`          | Linked yachts on the details page                      |
| `GET /admin/yachts?ownership=partner`      | Yacht names in the list (first 100 partner yachts)     |

API functions: `src/services/admin/partners.service.ts`, `media.service.ts`. Form ↔ API mapping
and validation: `utils/partner-form.ts`.

## Notes

- The list's Agreement column comes from the agreement dates: Current, Starts, Expired or Not set.
- The design shows things the API doesn't have, so they differ here until it does: "Review due"
  and "Draft", the partner status "Pending", yacht search, and the commission's "Effective" date.
- The API can't remove a document. "Replace" adds a file: the newest is the current version and
  older ones are its history. Document links are signed for one hour, so reload a page left open
  longer before opening one.
- Contact person and email are required by the design; the API allows them empty.
- Bank details (`bank_details`, `partners:bank`) aren't in the design and aren't sent.
