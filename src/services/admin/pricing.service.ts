import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Yacht price rules (backend: /admin/yachts/{id}/price-rules and
 * /admin/price-rules/{id}). Amounts are in paise, excluding GST. The backend
 * picks the rule that applies (holiday > season > weekend > base, then
 * priority); the admin only edits the rules.
 */

export const PRICE_RULE_KINDS = ["base", "weekend", "season", "holiday"] as const;
export type PriceRuleKind = (typeof PRICE_RULE_KINDS)[number];

/** PriceRuleResponseDto */
export const priceRuleSchema = z.object({
  id: z.string(),
  slot_type_id: z.string(),
  kind: z.enum(PRICE_RULE_KINDS),
  name: z.string().nullable(),
  amount: z.number(),
  included_guests: z.number().nullable(),
  extra_guest_amount: z.number().nullable(),
  /** YYYY-MM-DD */
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  priority: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PriceRule = z.infer<typeof priceRuleSchema>;

/** CreatePriceRuleDto */
export interface PriceRuleInput {
  slot_type_id: string;
  kind: PriceRuleKind;
  amount: number;
  included_guests?: number;
  extra_guest_amount?: number;
  name?: string;
  /** Required for season rules. */
  starts_on?: string;
  ends_on?: string;
  priority?: number;
  is_active?: boolean;
}

/** UpdatePriceRuleDto: any field except the slot type; null clears an optional field. */
export interface PriceRulePatch {
  kind?: PriceRuleKind;
  amount?: number;
  included_guests?: number | null;
  extra_guest_amount?: number | null;
  name?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  priority?: number;
  is_active?: boolean;
}

const yachtRules = (yachtId: string) => `/admin/yachts/${encodeURIComponent(yachtId)}/price-rules`;
const rule = (ruleId: string) => `/admin/price-rules/${encodeURIComponent(ruleId)}`;

/** GET /admin/yachts/{id}/price-rules — optionally filtered by slot type or kind. */
export function listPriceRules(
  yachtId: string,
  query: { slot_type_id?: string; kind?: PriceRuleKind } = {},
  signal?: AbortSignal,
): Promise<PriceRule[]> {
  return adminApiClient.get(yachtRules(yachtId), {
    query: { ...query },
    schema: z.array(priceRuleSchema),
    signal,
  });
}

/** POST /admin/yachts/{id}/price-rules (201) */
export function createPriceRule(yachtId: string, input: PriceRuleInput): Promise<PriceRule> {
  return adminApiClient.post(yachtRules(yachtId), { body: input, schema: priceRuleSchema });
}

/** PATCH /admin/price-rules/{id} — send only the fields that changed. */
export function updatePriceRule(ruleId: string, patch: PriceRulePatch): Promise<PriceRule> {
  return adminApiClient.patch(rule(ruleId), { body: patch, schema: priceRuleSchema });
}

/** DELETE /admin/price-rules/{id} (204) */
export async function deletePriceRule(ruleId: string): Promise<void> {
  await adminApiClient.delete(rule(ruleId));
}
