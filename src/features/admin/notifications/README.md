# Feature: `notifications` (admin area)

**Scope:** The header bell (staff alerts, live), the notifications page (alerts, customer email
log, email templates) and the template editor.

| Where                                  | What                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Header bell (every admin page)         | Unread count; the newest alerts; open one (marks it read); mark all read |
| `/admin/notifications`                 | Alerts · Email log · Templates (`?tab=emails` / `?tab=templates`)        |
| `/admin/notifications/templates/[key]` | Edit an email: subject, heading, text, placeholders, live preview        |

## Backend contract

| Endpoint                                            | Used by                                                | Permission            |
| --------------------------------------------------- | ------------------------------------------------------ | --------------------- |
| `GET /admin/notifications`                          | Bell (newest 8 + `unread_count`), Alerts tab           | `notifications:read`  |
| `POST /admin/notifications/read`                    | Open an alert, Mark read, Mark all read                | `notifications:write` |
| `POST /admin/notifications/stream-token`            | A single-use token for the stream                      | `notifications:read`  |
| `GET /admin/notifications/stream?token=`            | Live updates (Server-Sent Events)                      | —                     |
| `GET /admin/email-log`, `GET /admin/email-log/{id}` | Email log; the email as sent (sandboxed iframe)        | `settings:read`       |
| `POST /admin/email-log/{id}/resend`                 | Resend a failed email                                  | `settings:write`      |
| `GET /admin/notification-templates[/{key}]`         | Templates list and editor                              | `settings:read`       |
| `PATCH /admin/notification-templates/{key}`         | Save (400 `INVALID_TEMPLATE` lists `details.problems`) | `settings:write`      |
| `POST /admin/notification-templates/{key}/preview`  | Live preview while typing (not saved)                  | `settings:read`       |
| `DELETE /admin/notification-templates/{key}`        | Reset to the default text                              | `settings:write`      |

## Notes

- Live updates (`hooks/use-alert-feed.ts`): every stream event reloads the list; the event format
  isn't relied on. On an error the stream reconnects with a fresh token (5 s → 60 s backoff); the
  list is also checked every minute, when the tab comes back, and after alerts are marked read
  anywhere (`sm:alerts-changed`). The bell shows "Live" while the stream is open.
- Alerts open their booking, enquiry or cancellation request; other types open this page.
- Email HTML (log and preview) is shown in an `<iframe sandbox="">`: no scripts, no same-origin access.
- A template's placeholders come from the API (`variables`); required ones are marked and
  checked by the backend.
