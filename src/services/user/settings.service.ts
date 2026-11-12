import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/** Public business settings. Contract: `<NEXT_PUBLIC_API_BASE_URL>/docs`. */
const publicSettingsSchema = z.object({
  currency: z.string(),
  tax_label: z.string(),
  /** Shown to customers before they book; the full policy is a content page. */
  cancellation_summary: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_address: z.string().nullable(),
});
export type PublicSettings = z.infer<typeof publicSettingsSchema>;

/** GET /settings/public (no credential). */
export function getPublicSettings(signal?: AbortSignal): Promise<PublicSettings> {
  return apiClient.get("/settings/public", {
    auth: false,
    timeoutMs: 60_000,
    signal,
    schema: publicSettingsSchema,
  });
}
