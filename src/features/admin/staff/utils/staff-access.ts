import type {
  Role,
  Staff,
  StaffInvite,
  StaffPatch,
  StaffRoleInput,
} from "@/services/admin/staff.service";

/** Permissions a custom role may hold, grouped for the role form (CreateRoleDto). */
export const PERMISSION_GROUPS: {
  area: string;
  permissions: { value: string; label: string }[];
}[] = [
  { area: "Bookings", permissions: perms("bookings") },
  { area: "Enquiries", permissions: perms("enquiries") },
  { area: "Yachts", permissions: perms("yachts") },
  { area: "Customers", permissions: perms("customers") },
  { area: "Partners", permissions: perms("partners") },
  { area: "Payments", permissions: [{ value: "payments:write", label: "Manage" }] },
  { area: "Refunds", permissions: perms("refunds") },
  { area: "Payouts", permissions: perms("payouts") },
  {
    area: "Content",
    permissions: [...perms("cms"), { value: "cms:delete", label: "Delete" }],
  },
  { area: "Notifications", permissions: perms("notifications") },
  { area: "Reports", permissions: [{ value: "reports:read", label: "View" }] },
  { area: "Audit history", permissions: [{ value: "audit:read", label: "View" }] },
  { area: "Settings", permissions: [{ value: "settings:read", label: "View" }] },
];

function perms(prefix: string) {
  return [
    { value: `${prefix}:read`, label: "View" },
    { value: `${prefix}:write`, label: "Manage" },
  ];
}

/** Areas in the order the Access column lists them. */
const AREAS: [prefix: string, name: string][] = [
  ["bookings", "bookings"],
  ["enquiries", "enquiries"],
  ["yachts", "yachts"],
  ["customers", "customers"],
  ["partners", "partners"],
  ["payments", "payments"],
  ["refunds", "refunds"],
  ["payouts", "payouts"],
  ["cms", "content"],
  ["notifications", "notifications"],
  ["reports", "reports"],
  ["audit", "audit history"],
  ["settings", "settings"],
  ["staff", "staff"],
];

const heldAreas = (permissions: string[]) =>
  AREAS.filter(([prefix]) => permissions.some((p) => p.startsWith(`${prefix}:`)));

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The Access column: "Bookings & enquiries". */
export function accessText(role: Role | undefined) {
  if (!role) return "—";
  if (role.key === "super_admin") return "All operations";
  const names = heldAreas(role.permissions).map(([, name]) => name);
  if (names.length === 0) return "No access";
  if (names.length > 3) return `${capitalise(names[0]!)}, ${names[1]} +${names.length - 2} more`;
  const last = names.pop()!;
  return capitalise(names.length ? `${names.join(", ")} & ${last}` : last);
}

/** "View bookings · Manage enquiries" */
export function capabilitiesText(permissions: string[]) {
  const held = heldAreas(permissions).map(([prefix, name]) => {
    const manages = permissions.some((p) => p.startsWith(`${prefix}:`) && !p.endsWith(":read"));
    return `${manages ? "Manage" : "View"} ${name}`;
  });
  return held.join(" · ") || "No permissions yet.";
}

const SENSITIVE: [prefix: string, noun: string][] = [
  ["refunds", "refund"],
  ["payouts", "payout"],
  ["staff", "staff administration"],
];

const notHeld = (permissions: string[]) =>
  SENSITIVE.filter(([prefix]) => !permissions.some((p) => p.startsWith(`${prefix}:`))).map(
    ([, noun]) => noun,
  );

/** "No refund, payout or staff administration permission.", or "" if it holds them all. */
export function missingAccessText(permissions: string[]) {
  const names = notHeld(permissions);
  if (names.length === 0) return "";
  const last = names.pop()!;
  return `No ${names.length ? `${names.join(", ")} or ${last}` : last} permission.`;
}

/** A role's value in a select: its id, or the account role of a built-in. */
export const roleValue = (role: Pick<Role, "id" | "key">) => role.id ?? role.key ?? "";

/** The role an account holds, from GET /admin/roles. */
export const roleOf = (staff: Staff, roles: Role[]) =>
  roles.find((r) => (staff.staff_role ? r.id === staff.staff_role.id : r.key === staff.role));

/** The value `roleValue` gives the account's current role. */
export const staffRoleValue = (staff: Staff) => staff.staff_role?.id ?? staff.role;

export const roleInput = (role: Role): StaffRoleInput =>
  role.key ? { role: role.key, staff_role_id: null } : { role: "admin", staff_role_id: role.id };

/** Active, or Invited until the first sign-in; the API has no invited status of its own. */
export function staffStatus(staff: Pick<Staff, "is_active" | "last_login_at">) {
  if (!staff.is_active) return "Inactive";
  return staff.last_login_at ? "Active" : "Invited";
}

export interface InviteDraft {
  name: string;
  email: string;
  /** A `roleValue`. */
  role: string;
}

export const EMPTY_INVITE: InviteDraft = { name: "", email: "", role: "" };

export function inviteErrors(draft: InviteDraft) {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  if (!name) errors["invite-name"] = "Enter their full name.";
  else if (name.length > 255) errors["invite-name"] = "Use 255 characters or fewer.";
  if (!email) errors["invite-email"] = "Enter an email address.";
  else if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors["invite-email"] = "Enter a valid email address.";
  }
  if (!draft.role) errors["invite-role"] = "Choose a role.";
  return errors;
}

export const inviteInput = (draft: InviteDraft, role: Role): StaffInvite => ({
  email: draft.email.trim(),
  full_name: draft.name.trim(),
  ...roleInput(role),
});

/** What changed on an account; `role` is the role chosen on the form. */
export function staffChanges(staff: Staff, name: string, role: Role): StaffPatch {
  return {
    ...(name.trim() !== staff.full_name ? { full_name: name.trim() } : {}),
    ...(roleValue(role) !== staffRoleValue(staff) ? roleInput(role) : {}),
  };
}
