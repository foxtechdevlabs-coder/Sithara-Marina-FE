# Feature: `pricing` (admin area)

**Scope:** A yacht's operating hours, slot types and price rules ("Slots & pricing").

**Routes:** `/admin/fleet/[yachtId]/pricing`

## Backend contract (see the backend's `/docs`)

| Endpoint                              | Used by                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `GET /admin/yachts/{id}/slot-types`   | Load hours + slot types                                         |
| `PUT /admin/yachts/{id}/slot-types`   | Save — replaces the whole setup; removed types lose their rules |
| `GET /admin/yachts/{id}/price-rules`  | List rules (grouped by slot type on screen)                     |
| `POST /admin/yachts/{id}/price-rules` | Add rule                                                        |
| `PATCH /admin/price-rules/{id}`       | Edit rule — changed fields only; emptied optionals → null       |
| `DELETE /admin/price-rules/{id}`      | Delete rule (with confirmation)                                 |

API functions: `src/services/admin/pricing.service.ts` and the slot-type calls in
`fleet.service.ts`. Validation mirrors the backend (`utils/pricing-form.ts`).

**Notes:** Amounts are paise on the wire and rupees on screen, excluding GST. The backend picks the
applicable rule (holiday > season > weekend > base, then priority); the frontend never calculates
prices.
