# Customer account: API integration status and missing endpoints

Source of truth: the backend's OpenAPI document (`GET https://sithara-backend.onrender.com/docs-json`,
"Sithara Marina API" v1), checked when this page was written. Every `/me` path in it was reviewed.

## 1. Integrated endpoints

All calls go through `src/services/http/api-client.ts` (bearer token attached automatically; one
refresh-and-retry on a 401, then the customer is sent to sign in). Services live in
`src/services/user/`; components never call `fetch`.

| Feature (route)                                                     | Endpoint(s)                                                                                                       | Service function(s)                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Overview `/account`                                                 | `GET /auth/me`, `GET /me/bookings?timeframe=upcoming\|past`, `GET /me/enquiries`                                  | `getMyProfile`, `listMyBookings`, `listMyEnquiries`                              |
| Sidebar / account menu                                              | `GET /auth/me`                                                                                                    | `getMyProfile`                                                                   |
| Profile details `/account/profile`                                  | `GET /auth/me`, `PATCH /me` (name, phone, country, billing)                                                       | `getMyProfile`, `updateMyProfile`                                                |
| Profile setup `/account/setup`                                      | `GET /auth/me`, `PATCH /me`                                                                                       | same                                                                             |
| Security `/account/security`                                        | `POST /me/password` (stores the returned access token)                                                            | `changeMyPassword`                                                               |
| Email change `/account/profile/email`                               | `POST /me/email/change`, `POST /me/email/verify`                                                                  | `requestEmailChange`, `verifyEmailChange`                                        |
| Profile photo `/account/profile` (+ sidebar)                        | `POST /me/avatar/uploads`, PUT to `upload_url`, `PUT /me/avatar`, `DELETE /me/avatar`; `avatar_url` on `/auth/me` | `uploadMyAvatar`, `removeMyAvatar`                                               |
| My bookings `/account/bookings[?tab=past]`                          | `GET /me/bookings`, `GET /me/bookings/{ref}` (cancelled ones), `GET /me/cancellation-requests?status=pending`     | `listMyBookings`, `getMyBooking`, `listMyCancellationRequests`                   |
| Booking detail `/account/bookings/{ref}`                            | `GET /me/bookings/{ref}`, `GET /yachts/{slug}` (photo, departure city, capacity)                                  | `getMyBooking`, `getYacht`                                                       |
| Invoice `/account/bookings/{ref}/invoice`                           | `GET /me/bookings/{ref}` → `GET /bookings/{id}/invoice` (UUID; PDF via `download_url`)                            | `getMyBooking`, `getBookingInvoice`                                              |
| Cancellation request + review `/account/bookings/{ref}/cancel`      | `GET /me/bookings/{ref}/cancellation-preview`, `POST /me/bookings/{ref}/cancellation-requests`                    | `getCancellationPreview`, `requestCancellation`                                  |
| Request received / status `…/cancel/received`, `…/cancel/confirmed` | `GET /me/bookings/{ref}` (`cancellation_request`, `cancellation`, `refunds`)                                      | `getMyBooking`                                                                   |
| Refund `/account/bookings/{ref}/refund`                             | `GET /me/bookings/{ref}` (`refunds`, `refunded_amount`, `refund_pending_amount`)                                  | `getMyBooking`                                                                   |
| My enquiries `/account/enquiries`                                   | `GET /me/enquiries`                                                                                               | `listMyEnquiries`                                                                |
| Enquiry detail `/account/enquiries/{ref}` (new page)                | `GET /me/enquiries/{ref}`                                                                                         | `getMyEnquiry`                                                                   |
| Proposal `/account/proposals/{id}` (new page)                       | `GET /me/proposals/{id}`, `POST /me/proposals/{id}/accept`, `POST /me/proposals/{id}/reject`                      | `getMyProposal`, `acceptProposal`, `rejectProposal`                              |
| Help & support `/account/help`                                      | `POST /me/support-requests`, `GET /me/support-requests`, `GET /me/bookings` (related journey)                     | `createSupportRequest`, `listMySupportRequests`                                  |
| Message received `/account/help/sent?ref=`                          | `GET /me/support-requests/{reference}`                                                                            | `getMySupportRequest`                                                            |
| Notification inbox (header bell, every page while signed in)        | `GET /me/notifications`, `GET /me/notifications/unread-count`, `POST /me/notifications/read`                      | `listMyNotifications`, `getMyUnreadNotificationCount`, `markMyNotificationsRead` |
| Booking opened from a notification `/account/bookings/{id}`         | `GET /bookings/{id}` (id → reference), then `GET /me/bookings/{ref}`                                              | `getMyBookingByIdOrReference`                                                    |

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
- **Notifications.** No push for customers: the badge polls the unread count every 60 s (visible
  tab only), on returning to the tab and on each page change; the panel loads 20 at a time with
  "Show older notifications". See `src/features/user/notifications/README.md`.

## 2. Country, billing and notification preferences: integrated

Read with `GET /auth/me`, saved with `PATCH /me` (`updateMyProfile`); one PATCH can carry
`name`, `phone`, `country`, `billing` and `notification_preferences` together. A 400 saves nothing.
There is no mock data left.

| Field                      | Behaviour in the UI                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `country`                  | 2-letter ISO code ("IN"), chosen from a list of country names; `null` clears it. `/account/profile`, `/account/setup`                                                                                                                                                                                                    |
| `notification_preferences` | `charter_reminders` (on by default) and `offers_and_updates` (off by default). Only the changed key is sent. No switches for booking, payment, refund or cancellation emails. `/account/notifications`, `/account/setup`                                                                                                 |
| `billing`                  | The Figma form's Address, City, State and Postal code. Sent as the full object, or `null` when all four are empty. `name` is the full name and `country` the form's Country / region; saved company name, address line 2 and GSTIN (no field in the design) are sent back unchanged. India: state required, 6-digit PIN. |

Rules live in `src/features/user/profile/utils/billing.ts`.

## 3. Missing backend APIs — PROPOSALS ONLY

> **These endpoints do not exist.** They are suggestions for the backend team, written to match
> the conventions of the existing `/me` API. Nothing in the frontend calls them.

(Notification preferences, country and billing details were proposed here and are now delivered; see §2.)

### 3.3 Profile photo — now integrated

Delivered as `POST /me/avatar/uploads` → PUT to the signed `upload_url` → `PUT /me/avatar`, plus
`DELETE /me/avatar` (JPEG/PNG/WebP ≤ 2 MB). The photo is saved as soon as it is chosen, separately
from "Save profile". `avatar_url` is a 1-hour link, so it is always read from `GET /auth/me` and
never stored in the session.

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

### 3.6 Customer notification inbox — now integrated

Delivered as `GET /me/notifications`, `GET /me/notifications/unread-count` and
`POST /me/notifications/read` (see §1). Notifications carry the booking's id (UUID), not its
reference, so the booking page also accepts an id (`getMyBookingByIdOrReference`).

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
