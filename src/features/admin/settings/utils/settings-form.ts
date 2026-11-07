import { parseRate } from "@/features/admin/fleet/utils/yacht-form";
import type { Settings, SettingsPatch } from "@/services/admin/settings.service";

export interface SettingsFormValues {
  timezone: string;
  taxLabel: string;
  /** Percentage as typed; empty means not set. */
  gstRate: string;
  cancellation: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

export const settingsFormFromSettings = (s: Settings): SettingsFormValues => ({
  timezone: s.timezone,
  taxLabel: s.tax_label,
  gstRate: s.gst_rate === null ? "" : String(s.gst_rate),
  cancellation: s.cancellation_summary ?? "",
  contactEmail: s.contact_email ?? "",
  contactPhone: s.contact_phone ?? "",
  contactAddress: s.contact_address ?? "",
});

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Field errors keyed by input id, following the backend's rules. */
export function settingsFormErrors(form: SettingsFormValues) {
  const errors: Record<string, string> = {};
  const timezone = form.timezone.trim();
  const taxLabel = form.taxLabel.trim();
  const email = form.contactEmail.trim();

  if (!timezone) errors["settings-timezone"] = "Enter a time zone, e.g. Asia/Kolkata.";
  else if (!isTimeZone(timezone)) {
    errors["settings-timezone"] = "Enter a valid time zone, e.g. Asia/Kolkata.";
  }
  if (!taxLabel) errors["settings-tax-label"] = "Enter a tax name, e.g. GST.";
  else if (taxLabel.length > 50) errors["settings-tax-label"] = "Use 50 characters or fewer.";
  if (parseRate(form.gstRate) === undefined) {
    errors["settings-gst"] = "Enter a percentage from 0 to 100, with up to 2 decimals.";
  }
  if (form.cancellation.trim().length > 2000) {
    errors["settings-cancellation"] = "Use 2,000 characters or fewer.";
  }
  if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors["settings-email"] = "Enter a valid email address.";
  }
  if (form.contactPhone.trim().length > 30) {
    errors["settings-phone"] = "Use 30 characters or fewer.";
  }
  if (form.contactAddress.trim().length > 500) {
    errors["settings-address"] = "Use 500 characters or fewer.";
  }
  return errors;
}

const orNull = (value: string) => value.trim() || null;

/** The fields that changed, ready for PUT /admin/settings. Call after the form is valid. */
export function settingsChanges(form: SettingsFormValues, saved: Settings): SettingsPatch {
  const next: SettingsPatch = {
    timezone: form.timezone.trim(),
    tax_label: form.taxLabel.trim(),
    gst_rate: parseRate(form.gstRate) ?? null,
    cancellation_summary: orNull(form.cancellation),
    contact_email: orNull(form.contactEmail),
    contact_phone: orNull(form.contactPhone),
    contact_address: orNull(form.contactAddress),
  };
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== saved[key as keyof Settings]),
  ) as SettingsPatch;
}
