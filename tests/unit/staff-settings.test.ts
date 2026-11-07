import { describe, expect, it } from "vitest";

import {
  settingsChanges,
  settingsFormErrors,
  settingsFormFromSettings,
} from "@/features/admin/settings/utils/settings-form";
import {
  EMPTY_INVITE,
  PERMISSION_GROUPS,
  accessText,
  capabilitiesText,
  inviteErrors,
  inviteInput,
  missingAccessText,
  roleOf,
  roleValue,
  staffChanges,
  staffStatus,
} from "@/features/admin/staff/utils/staff-access";
import type { Settings } from "@/services/admin/settings.service";
import type { Role, Staff } from "@/services/admin/staff.service";

const settings: Settings = {
  gst_rate: 18,
  tax_label: "GST",
  weekend_days: ["sat", "sun"],
  booking_horizon_days: 180,
  timezone: "Asia/Kolkata",
  cancellation_summary: "Free until 48 hours before.",
  contact_email: "hello@sithara.test",
  contact_phone: null,
  contact_address: null,
  earliest_start_time: "05:00",
  latest_end_time: "19:00",
};
const form = settingsFormFromSettings(settings);

describe("settings form", () => {
  it("accepts what the API sent", () => {
    expect(settingsFormErrors(form)).toEqual({});
    expect(settingsChanges(form, settings)).toEqual({});
  });

  it("checks fields like the backend", () => {
    expect(settingsFormErrors({ ...form, timezone: "Mars/Base" })).toHaveProperty(
      "settings-timezone",
    );
    expect(settingsFormErrors({ ...form, taxLabel: " " })).toHaveProperty("settings-tax-label");
    expect(settingsFormErrors({ ...form, gstRate: "101" })).toHaveProperty("settings-gst");
    expect(settingsFormErrors({ ...form, contactEmail: "nope" })).toHaveProperty("settings-email");
  });

  it("sends only what changed, and null for what was emptied", () => {
    expect(settingsChanges({ ...form, gstRate: "", cancellation: " " }, settings)).toEqual({
      gst_rate: null,
      cancellation_summary: null,
    });
  });
});

const superAdmin: Role = {
  id: null,
  key: "super_admin",
  name: "Super Admin",
  description: null,
  permissions: ["staff:read", "refunds:read", "payouts:read"],
  account_count: 1,
};
const admin: Role = { ...superAdmin, key: "admin", name: "Admin", permissions: ["yachts:read"] };
const concierge: Role = {
  id: "r-1",
  key: null,
  name: "Concierge",
  description: null,
  permissions: ["bookings:read", "enquiries:read", "enquiries:write"],
  account_count: 0,
};
const person: Staff = {
  id: "s-1",
  email: "neha@sithara.test",
  full_name: "Neha P.",
  role: "admin",
  staff_role: { id: "r-1", name: "Concierge" },
  is_active: true,
  last_login_at: "2026-11-01T10:00:00.000Z",
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
};

describe("access text", () => {
  it("summarises a role for the table", () => {
    expect(accessText(superAdmin)).toBe("All operations");
    expect(accessText(concierge)).toBe("Bookings & enquiries");
    expect(accessText({ ...concierge, permissions: [] })).toBe("No access");
    expect(accessText(undefined)).toBe("—");
    expect(
      accessText({
        ...concierge,
        permissions: ["bookings:read", "enquiries:read", "yachts:read", "reports:read"],
      }),
    ).toBe("Bookings, enquiries +2 more");
  });

  it("lists what a role can do and what it can't", () => {
    expect(capabilitiesText(concierge.permissions)).toBe("View bookings · Manage enquiries");
    expect(capabilitiesText([])).toBe("No permissions yet.");
    expect(missingAccessText(concierge.permissions)).toBe(
      "No refund, payout or staff administration permission.",
    );
    expect(missingAccessText(["refunds:read"])).toBe(
      "No payout or staff administration permission.",
    );
    expect(missingAccessText(superAdmin.permissions)).toBe("");
  });

  it("offers only permissions a custom role may hold", () => {
    const offered = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.value));
    expect(offered).toHaveLength(new Set(offered).size);
    expect(offered).toHaveLength(23);
    expect(offered.filter((p) => /^staff:|settings:write|partners:bank/.test(p))).toEqual([]);
  });
});

describe("accounts", () => {
  it("works out the status", () => {
    expect(staffStatus(person)).toBe("Active");
    expect(staffStatus({ ...person, last_login_at: null })).toBe("Invited");
    expect(staffStatus({ ...person, is_active: false })).toBe("Inactive");
  });

  it("finds an account's role", () => {
    const roles = [superAdmin, admin, concierge];
    expect(roleOf(person, roles)).toBe(concierge);
    expect(roleOf({ ...person, staff_role: null }, roles)).toBe(admin);
  });

  it("requires a name, an email and a role", () => {
    expect(Object.keys(inviteErrors(EMPTY_INVITE))).toEqual([
      "invite-name",
      "invite-email",
      "invite-role",
    ]);
    expect(
      inviteErrors({ name: "Dev", email: "dev@sithara.test", role: roleValue(admin) }),
    ).toEqual({});
  });

  it("invites with a built-in or a custom role", () => {
    const draft = { name: " Dev R. ", email: " dev@sithara.test ", role: "x" };
    expect(inviteInput(draft, concierge)).toEqual({
      email: "dev@sithara.test",
      full_name: "Dev R.",
      role: "admin",
      staff_role_id: "r-1",
    });
    expect(inviteInput(draft, superAdmin)).toMatchObject({
      role: "super_admin",
      staff_role_id: null,
    });
  });

  it("sends only what changed", () => {
    expect(staffChanges(person, "Neha P.", concierge)).toEqual({});
    expect(staffChanges(person, " Neha Pillai ", concierge)).toEqual({ full_name: "Neha Pillai" });
    expect(staffChanges(person, "Neha P.", admin)).toEqual({ role: "admin", staff_role_id: null });
  });
});
