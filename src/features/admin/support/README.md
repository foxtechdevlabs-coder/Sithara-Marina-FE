# Feature: `support` (admin area)

**Scope:** Customer support requests, sent from customer accounts (`POST /me/support-requests`).

**Routes:** `/admin/support` (list) and `/admin/support/{requestId}` (one request). The sidebar
entry sits under Operations, below Customers.

**API** (`src/services/admin/support.service.ts`, needs `support:read`):

- `GET /admin/support-requests`: `page`, `limit`, `search` (reference, subject, customer name or
  email) and `category` (general, booking, payment, refund, other).
- `GET /admin/support-requests/{id}`: one request.

The backend only lets staff read requests: there's no reply, assign or close endpoint. Staff reply
from their own mail app with "Reply by email", which opens a new email with the reference in the
subject. Requests link to the customer and, when given, the booking.

```
support/
├── components/   support-list, support-detail
└── utils/        support-format: labels, preview, reply link, error messages
```

Tests: `tests/integration/admin-support.test.ts`.
