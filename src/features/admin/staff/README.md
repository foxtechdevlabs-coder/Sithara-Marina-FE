# Feature: `staff` (admin area)

**Scope:** Staff accounts, invitations, roles and permissions.

**Routes:** `/admin/staff`, `/admin/staff/roles`

**Notes:** Permissions are enforced by the backend. The UI may hide actions a role cannot perform, but hiding is never a security control.

## Backend contract (see the backend's `/docs`)

| Endpoint                            | Used by                                   |
| ----------------------------------- | ----------------------------------------- |
| `GET /admin/staff`                  | Staff table (page/limit 20)               |
| `POST /admin/staff`                 | "Send invitation", after the review step  |
| `PATCH /admin/staff/{id}`           | Edit: name and role                       |
| `POST /admin/staff/{id}/deactivate` | Row action, with confirmation             |
| `POST /admin/staff/{id}/reactivate` | Row action, with confirmation             |
| `GET /admin/roles`                  | Role choices, Access column, roles page   |
| `POST /admin/roles`                 | Roles page: add                           |
| `PATCH /admin/roles/{id}`           | Roles page: edit                          |
| `DELETE /admin/roles/{id}`          | Roles page: delete (refused while in use) |

API functions: `src/services/admin/staff.service.ts`. Permission wording and form mapping:
`utils/staff-access.ts`.

## Notes

- Built-in roles have `id: null`; their value is `key`. A custom role is `role: "admin"` plus
  `staff_role_id`.
- "Invited" means active with no sign-in yet; the API has no such status.
- Only a super admin can change an account, and nobody can change their own, so those row
  actions are hidden. The API doesn't protect the last active administrator beyond that.
- The invite email links to the backend's `STAFF_INVITE_URL`, which must point at
  `/admin/set-password` on this site. The backend adds `#token=…`.
