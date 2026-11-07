import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Staff accounts and roles (backend: /admin/staff/*, /admin/roles/*). Reading
 * needs staff:read. Changing an account needs a super admin; nobody can
 * deactivate themselves or change their own role.
 */

export const STAFF_ROLES = ["admin", "super_admin"] as const;
export type StaffAccountRole = (typeof STAFF_ROLES)[number];

/** StaffResponseDto */
export const staffSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  role: z.enum(["customer", ...STAFF_ROLES]),
  /** A custom role, on admins only. */
  staff_role: z.object({ id: z.string(), name: z.string() }).nullable(),
  is_active: z.boolean(),
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Staff = z.infer<typeof staffSchema>;

const staffListSchema = z.object({
  items: z.array(staffSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type StaffList = z.infer<typeof staffListSchema>;

/** RoleResponseDto */
export const roleSchema = z.object({
  /** Null for the built-in roles, which can't be changed. */
  id: z.string().nullable(),
  /** The account role of a built-in; null for custom roles. */
  key: z.enum(STAFF_ROLES).nullable(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  account_count: z.number(),
});
export type Role = z.infer<typeof roleSchema>;

/** The role fields of InviteStaffDto and UpdateStaffDto. */
export interface StaffRoleInput {
  role: StaffAccountRole;
  staff_role_id: string | null;
}

/** InviteStaffDto */
export interface StaffInvite extends StaffRoleInput {
  email: string;
  full_name: string;
}

/** UpdateStaffDto */
export type StaffPatch = Partial<StaffRoleInput> & { full_name?: string };

/** CreateRoleDto */
export interface RoleInput {
  name: string;
  description: string | null;
  permissions: string[];
}

const staffPath = (id: string) => `/admin/staff/${encodeURIComponent(id)}`;
const rolePath = (id: string) => `/admin/roles/${encodeURIComponent(id)}`;

/** GET /admin/staff — sorted by name. */
export function listStaff(
  query: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<StaffList> {
  return adminApiClient.get("/admin/staff", {
    query: { ...query },
    schema: staffListSchema,
    signal,
  });
}

/**
 * POST /admin/staff (201) — creates the account and emails a link to set the
 * password. `invite_sent` is false if the email failed: the account exists, and
 * "Forgot password" sends a new link.
 */
export function inviteStaff(input: StaffInvite) {
  return adminApiClient.post("/admin/staff", {
    body: input,
    schema: staffSchema.extend({ invite_sent: z.boolean() }),
  });
}

/** PATCH /admin/staff/{id} — moving between admin and super admin ends their sessions. */
export function updateStaff(id: string, patch: StaffPatch): Promise<Staff> {
  return adminApiClient.patch(staffPath(id), { body: patch, schema: staffSchema });
}

/** POST /admin/staff/{id}/deactivate — blocks access and ends every session at once. */
export function deactivateStaff(id: string): Promise<Staff> {
  return adminApiClient.post(`${staffPath(id)}/deactivate`, { schema: staffSchema });
}

/** POST /admin/staff/{id}/reactivate */
export function reactivateStaff(id: string): Promise<Staff> {
  return adminApiClient.post(`${staffPath(id)}/reactivate`, { schema: staffSchema });
}

/** GET /admin/roles — the built-in roles first, then custom ones by name. */
export function listRoles(signal?: AbortSignal): Promise<Role[]> {
  return adminApiClient.get("/admin/roles", { schema: z.array(roleSchema), signal });
}

/** POST /admin/roles (201) */
export function createRole(input: RoleInput): Promise<Role> {
  return adminApiClient.post("/admin/roles", { body: input, schema: roleSchema });
}

/** PATCH /admin/roles/{id} — applies to its holders on their next request. */
export function updateRole(id: string, patch: Partial<RoleInput>): Promise<Role> {
  return adminApiClient.patch(rolePath(id), { body: patch, schema: roleSchema });
}

/** DELETE /admin/roles/{id} (204) — 409 ROLE_IN_USE while accounts hold it. */
export async function deleteRole(id: string): Promise<void> {
  await adminApiClient.delete(rolePath(id));
}
