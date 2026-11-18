# Feature: `notifications` (user area)

**Scope:** The notification **inbox** behind the header bell: one notification per customer email
(booking confirmed, payment failed, refunds, cancellations and cancellation requests, reschedules,
charter reminders, proposals sent).

Not to be confused with notification **preferences** (which reminders and offers the customer
agrees to): those are `/account/notifications`, in `src/features/user/profile` and
`profile.service.ts`. The panel links there as "Notification settings"; nothing here reads or
writes preferences.

```
notifications/
├── components/  notification-bell.tsx      bell, badge, panel (dropdown; full-screen sheet on phones)
├── hooks/       use-notification-inbox.ts  load, poll the count, show more, mark one / all read
└── utils/       notification-inbox.ts      pure state updates, links, time labels (unit-tested)
```

## Backend

`src/services/user/notifications.service.ts`, Swagger tag "me" (customer accounts only; 403 for
staff):

| Call                                          | Used for                              |
| --------------------------------------------- | ------------------------------------- |
| `GET /me/notifications?page&limit`            | the panel (20 per page, newest first) |
| `GET /me/notifications/unread-count`          | the badge                             |
| `POST /me/notifications/read` `{ ids }`       | opening a notification                |
| `POST /me/notifications/read` `{ all: true }` | "Mark all as read"                    |

- `title` and `body` are shown as they come. `type` only picks the icon (an unknown type gets the
  bell icon instead of breaking the list).
- **Links:** `entity_type` "booking" opens `/account/bookings/<entity_id>` (the booking page turns
  the id into the reference with `GET /bookings/:id`, see `getMyBookingByIdOrReference`);
  "proposal" opens `/account/proposals/<entity_id>`. Anything else is only marked read.
- **No push for customers.** The first page loads on sign-in and again each time the panel opens.
  The badge polls the unread count every 60 s while the tab is visible, on returning to the tab
  and on every page change.
- Read-marking shows at once and then takes the server's `unread_count`. A count or list answer
  started before a read-marking is dropped, so it can't bring an old badge back.
- Rendered by `src/components/user/site-header.tsx` only while signed in (on the right beside
  "Book yachts"; on phones beside Menu). Signing out empties the inbox.
- Guest bookings without an account get the email only, so they never appear here. A customer who
  turns off `charter_reminders` gets no reminder email and no reminder notification.
