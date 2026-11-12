# Feature: `pricing` (admin area)

**Scope:** A yacht's operating hours, slot types and price rules ("Slots & pricing", reached from
the yacht under Yachts). The fleet-wide "Pricing & slots" module was removed.

| Route                            | Screen                                    |
| -------------------------------- | ----------------------------------------- |
| `/admin/fleet/[yachtId]/pricing` | One yacht: slot setup and its price rules |

## Backend contract (see the backend's `/docs`; `yachts:read` / `yachts:write`)

| Endpoint                              | Used by                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `GET /admin/yachts/{id}/slot-types`   | Load hours + slot types                                         |
| `PUT /admin/yachts/{id}/slot-types`   | Save — replaces the whole setup; removed types lose their rules |
| `GET /admin/yachts/{id}/price-rules`  | List rules (grouped by slot type on screen)                     |
| `POST /admin/yachts/{id}/price-rules` | Add a fixed or percent rule                                     |
| `PATCH /admin/price-rules/{id}`       | Edit — changed fields only; emptied optionals → null            |
| `DELETE /admin/price-rules/{id}`      | Delete rule (with confirmation)                                 |

API functions: `src/services/admin/pricing.service.ts` and the slot-type calls in
`fleet.service.ts`. Validation mirrors the backend (`utils/pricing-form.ts`).

## Notes

- Amounts are paise on the wire and rupees on screen, excluding GST. The backend picks the
  applicable rule (holiday > season > weekend > base, then priority) and calculates every price;
  the "₹ 40,000 base becomes …" line under a percent field is only an illustration.
- `adjustment`: `fixed` (`amount`, with optional guest pricing) or `percent` (`percent`, −90 to
  +500, up to 2 decimals, a change to the base price). Base rules are always fixed. Switching
  sends the field the new kind needs; the backend clears the other.
- Rules from before fixed / percent existed are read as fixed (`amount` may now be null).
- Rules created in bulk elsewhere carry `batch_id`; they show "from a bulk rule" and can be edited
  or deleted one at a time here.
