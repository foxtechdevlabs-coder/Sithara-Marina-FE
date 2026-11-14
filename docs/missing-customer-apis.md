# Customer account: API integration status and missing endpoints

Source of truth: the backend's OpenAPI document (`GET https://sithara-backend.onrender.com/docs-json`,
"Sithara Marina API" v1), checked when this page was written. Every `/me` path in it was reviewed.

## 1. Integrated endpoints

All calls go through `src/services/http/api-client.ts` (bearer token attached automatically; one
refresh-and-retry on a 401, then the customer is sent to sign in). Services live in
`src/services/user/`; components never call `fetch`.

| Feature (route)                                                     | Endpoint(s)                                                                                                   | Service function(s)                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Overview `/account`                                                 | `GET /auth/me`, `GET /me/bookings?timeframe=upcoming\|past`, `GET /me/enquiries`                              | `getMyProfile`, `listMyBookings`, `listMyEnquiries`            |
| Sidebar / account menu                                              | `GET /auth/me`                                                                                                | `getMyProfile`                                                 |
| Profile details `/account/profile`                                  | `GET /auth/me`, `PATCH /me` (`name`, `phone` only)                                                            | `getMyProfile`, `updateMyProfile`                              |
| Profile setup `/account/setup`                                      | `GET /auth/me`, `PATCH /me`                                                                                   | same                                                           |
| Security `/account/security`                                        | `POST /me/password` (stores the returned access token)                                                        | `changeMyPassword`                                             |
| Email change `/account/profile/email`                               | `POST /me/email/change`, `POST /me/email/verify`                                                              | `requestEmailChange`, `verifyEmailChange`                      |
| My bookings `/account/bookings[?tab=past]`                          | `GET /me/bookings`, `GET /me/bookings/{ref}` (cancelled ones), `GET /me/cancellation-requests?status=pending` | `listMyBookings`, `getMyBooking`, `listMyCancellationRequests` |
| Booking detail `/account/bookings/{ref}`                            | `GET /me/bookings/{ref}`, `GET /yachts/{slug}` (photo, departure city, capacity)                              | `getMyBooking`, `getYacht`                                     |
| Invoice `/account/bookings/{ref}/invoice`                           | `GET /me/bookings/{ref}` → `GET /bookings/{id}/invoice` (UUID; PDF via `download_url`)                        | `getMyBooking`, `getBookingInvoice`                            |
| Cancellation request + review `/account/bookings/{ref}/cancel`      | `GET /me/bookings/{ref}/cancellation-preview`, `POST /me/bookings/{ref}/cancellation-requests`                | `getCancellationPreview`, `requestCancellation`                |
| Request received / status `…/cancel/received`, `…/cancel/confirmed` | `GET /me/bookings/{ref}` (`cancellation_request`, `cancellation`, `refunds`)                                  | `getMyBooking`                                                 |
| Refund `/account/bookings/{ref}/refund`                             | `GET /me/bookings/{ref}` (`refunds`, `refunded_amount`, `refund_pending_amount`)                              | `getMyBooking`                                                 |
| My enquiries `/account/enquiries`                                   | `GET /me/enquiries`                                                                                           | `listMyEnquiries`                                              |
| Enquiry detail `/account/enquiries/{ref}` (new page)                | `GET /me/enquiries/{ref}`                                                                                     | `getMyEnquiry`                                                 |
| Proposal `/account/proposals/{id}` (new page)                       | `GET /me/proposals/{id}`, `POST /me/proposals/{id}/accept`, `POST /me/proposals/{id}/reject`                  | `getMyProposal`, `acceptProposal`, `rejectProposal`            |
| Help & support `/account/help`                                      | `POST /me/support-requests`, `GET /me/support-requests`, `GET /me/bookings` (related journey)                 | `createSupportRequest`, `listMySupportRequests`                |
| Message received `/account/help/sent?ref=`                          | `GET /me/support-requests/{reference}`                                                                        | `getMySupportRequest`                                          |

Notes on how the UI uses them:

- **Dynamic parameters.** `{ref}` is always the booking's / enquiry's `reference` from a list or
  detail response; `{id}` (proposals) is the proposal's `id` from `GET /me/enquiries/{ref}`;
  `{reference}` (support) is the `reference` returned by `POST /me/support-requests`. The invoice
  call uses the booking's `id` (UUID) from `GET /me/bookings/{ref}`. Nothing is hard-coded.
- **Cancellation.** There is no simulation: what is shown (request pending / approved / rejected,
  refund decided / on its way / given back / failed) is read from `GET /me/bookings/{ref}` every
  time. The form's reason and note are sent as the one `reason` field (≤ 1000 characters).
- **Proposal accepted → checkout.** `next_step: "checkout"` hands `checkout_session_id` to the
  existing checkout (`/checkout`); `staff_follow_up` shows that the concierge will continue.
- **Support subject.** The backend requires `subject`; the Figma form has no subject field, so it
  is composed from the chosen category and booking reference (e.g. "My booking or arrival ·
  SM-2026-0042"). A repeat within 5 minutes (`created: false`) shows that earlier request.
- **Lists** request `limit=100` (the backend maximum) and show the first page only.

## 2. Still on TEMPORARY mock data

Kept in this browser tab only (`src/services/user/mocks/`, `sessionStorage`), clearly separated in
`profile.service.ts` under "TEMPORARY (mock)":

| Feature                              | Route                                      | Why                                               |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------- |
| Notification preferences             | `/account/notifications`, `/account/setup` | No endpoint in the OpenAPI document               |
| Country / region and billing details | `/account/profile`, `/account/setup`       | `PATCH /me` accepts only `name` and `phone`       |
| Profile photo                        | `/account/profile`                         | No upload endpoint; the file is checked, not sent |

## 3. Missing backend APIs — PROPOSALS ONLY

> **These endpoints do not exist.** They are suggestions for the backend team, written to match
> the conventions of the existing `/me` API. Nothing in the frontend calls them.

### 3.1 Notification preferences

- **Routes:** `/account/notifications`, `/account/setup` ("Stories and offers")
- **Proposed:** `GET /me/notification-preferences`, `PATCH /me/notification-preferences`
- **PATCH body (all optional):**
  ```json
  { "proposal_emails": true, "whatsapp_updates": false, "stories_and_offers": false }
  ```
- **Response (both):** the same object with every field present.
- **Why:** the Figma screens C55 / C64 / C58 let customers choose optional channels (WhatsApp
  consent, marketing). Consent must be stored server-side to be honoured by the messages the
  backend sends.

### 3.2 Country and billing details

- **Route:** `/account/profile` (C52 "Billing details · optional"), `/account/setup`
- **Proposed:** extend `PATCH /me` (and the `UserDto` it returns, and `GET /auth/me`) with:
  ```json
  {
    "country": "India",
    "billing": { "address": "…", "city": "Kochi", "state": "Kerala", "postal_code": "682001" }
  }
  ```
  (all nullable; `null` clears a value)
- **Why:** the invoice shows the customer's name, email and phone only; GST invoices for
  customers who need a billing address can't carry one today.

### 3.3 Profile photo

- **Route:** `/account/profile`
- **Proposed:** `POST /me/avatar` (`multipart/form-data`, field `file`, JPG/PNG ≤ 5 MB) →
  `{ "avatar_url": "https://…" }`; `DELETE /me/avatar` → 204; and `avatar_url` on `UserDto`.
- **Why:** C52 offers an optional profile photo.

### 3.4 A documented `GET /auth/me` response

- **Route:** every account page (name, email, phone).
- **Proposed:** document `200` as `UserDto` (`id`, `fullName`, `email`, `phone`, `role`), the shape
  `PATCH /me` returns. The frontend currently assumes this (and also accepts `{ "user": UserDto }`).

### 3.5 A cancellation request reference

- **Route:** `…/cancel/received` (C22 shows "Reference CAN-SM-1048")
- **Proposed:** add `reference` (e.g. `"CAN-2026-0042"`) to the cancellation request object returned by
  `POST /me/bookings/{ref}/cancellation-requests`, `GET /me/cancellation-requests` and
  `cancellation_request` in `GET /me/bookings/{ref}`.
- **Why:** customers quote a reference to the concierge. Until then the screen names the booking
  reference and the request date instead.

## 4. Questions for the backend team

1. **Email-change link target.** `POST /me/email/verify` takes the `<id>.<secret>` token from the
   emailed link, but the OpenAPI document doesn't say which frontend URL that link opens. The
   frontend handles `/account/profile/email#token=<id>.<secret>` (`?token=` also works) and lets the
   customer paste the link. Please point the email at that URL. (The page requires a signed-in
   customer; a signed-out visitor is sent to sign in first and should open the link again after.)
2. **`GET /bookings/{id}/invoice` security.** The document lists no security scheme, yet it answers
   404 for other customers' bookings. The frontend sends the customer's bearer token.
3. **Booking images.** `GET /me/bookings[/{ref}]` carries no yacht photo, departure point or
   capacity; the frontend fetches them from `GET /yachts/{slug}`, which fails for yachts hidden
   since. A `yacht.primary_image_url` on the booking would avoid the extra call.
4. **`cancellation` / `cancellation_request` nullability** on `GET /me/bookings/{ref}` is not marked
   in the document; the frontend accepts `null` for both.
