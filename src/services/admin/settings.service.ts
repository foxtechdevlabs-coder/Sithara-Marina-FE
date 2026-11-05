import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/* Business settings (backend: /admin/settings). Needs settings:read and settings:write. */

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** SettingsResponseDto */
export const settingsSchema = z.object({
  /** Percentage. No default: quoting refuses until it is set. */
  gst_rate: z.number().nullable(),
  tax_label: z.string(),
  /** Days weekend price rules apply to. */
  weekend_days: z.array(z.enum(WEEKDAYS)),
  /** How many days ahead customers may book. */
  booking_horizon_days: z.number().nullable(),
  timezone: z.string(),
  /** Shown to customers; the full policy is a content page. */
  cancellation_summary: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_address: z.string().nullable(),
  /** HH:mm local. */
  earliest_start_time: z.string(),
  latest_end_time: z.string(),
});
export type Settings = z.infer<typeof settingsSchema>;

/** UpdateSettingsDto: only the fields sent change; null clears a field that can be empty. */
export type SettingsPatch = Partial<Settings>;

/** GET /admin/settings */
export function getSettings(signal?: AbortSignal): Promise<Settings> {
  return adminApiClient.get("/admin/settings", { schema: settingsSchema, signal });
}

/** PUT /admin/settings */
export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return adminApiClient.put("/admin/settings", { body: patch, schema: settingsSchema });
}
