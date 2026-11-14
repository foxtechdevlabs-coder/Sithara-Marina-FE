# Feature: `customers` (admin area)

**Scope:** Customer list, customer record and adding a customer.

**Routes (admin Figma screen):**

| Route                             | Screen                                                               |
| --------------------------------- | -------------------------------------------------------------------- |
| `/admin/customers`                | A21 — "The people behind each journey."                              |
| `/admin/customers/[id]`           | A22 — "A personal view." (contact details, bookings and enquiries)   |
| `/admin/customers/new`            | Add a customer (not in the design; uses `POST /admin/customers`)     |
| `/admin/bookings?customer=&name=` | "View customer bookings": the bookings list filtered to one customer |

## Backend contract (see the backend's `/docs`)

| Endpoint                       | Used by                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `GET /admin/customers`         | List and search (name, email or phone)                           |
| `POST /admin/customers`        | Add customer (409 `EMAIL_EXISTS`)                                |
| `GET /admin/customers/{id}`    | Record: details, stats and the 20 most recent bookings           |
| `PATCH /admin/customers/{id}`  | "Save contact details": name, phone, active / inactive           |
| `GET /admin/bookings`          | "Latest activity" per row; a booking reference in the search box |
| `GET /admin/enquiries?search=` | Enquiries on the record (matched by customer id or email)        |

API functions: `src/services/admin/customers.service.ts`. Wording and phone checks:
`utils/customer-format.ts`.

## Notes

- The list API has no latest booking, so each row with bookings asks `GET /admin/bookings` for
  its newest one (one small request per row, at most 20 a page).
- The customer search can't match booking references, so a search starting `SM-` looks the
  reference up in bookings and shows its customer.
- The email is the customer's sign-in and can't be changed (`UpdateCustomerDto` has no email).
- Phones are sent in E.164 (`+919876543210`); spaces, brackets and dashes are removed.
- The design's "Contact preference" and "Internal customer note" have no API fields yet. The
  account's active / inactive state takes the preference's place; there is no note field.
- Enquiries need `enquiries:read`; without it the record shows bookings only and says so.
