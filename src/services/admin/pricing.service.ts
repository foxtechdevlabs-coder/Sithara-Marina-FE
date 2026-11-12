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

/** fixed: `amount` is the whole charter price. percent: the base price moved by `percent` (not for base rules). */
export const PRICE_ADJUSTMENTS = ["fixed", "percent"] as const;
export type PriceAdjustment = (typeof PRICE_ADJUSTMENTS)[number];

/** Percent rules: -90 to +500, up to 2 decimals (20 = 20% more, -20 = 20% less). */
export const PERCENT_MIN = -90;
export const PERCENT_MAX = 500;

/** PriceRuleResponseDto */
export const priceRuleSchema = z.object({
  id: z.string(),
  /** Older responses may not carry it. */
  yacht_id: z.string().optional(),
  slot_type_id: z.string(),
  kind: z.enum(PRICE_RULE_KINDS),
  name: z.string().nullable(),
  /** Older responses had no adjustment: those rules are fixed. */
  adjustment: z.enum(PRICE_ADJUSTMENTS).default("fixed"),
  /** Fixed rules: paise excl. GST. Null for percent rules. */
  amount: z.number().nullable(),
  /** Percent rules: the change to the base price. Null for fixed rules. */
  percent: z.number().nullable().default(null),
  /** Set on rules created together by POST /admin/price-rules/bulk. */
  batch_id: z.string().nullable().default(null),
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

/** PriceRuleListResponseDto */
const priceRuleListSchema = z.object({
  items: z.array(priceRuleSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/** The backend's largest page size for price rules. */
const PRICE_RULES_PAGE_SIZE = 100;

/** CreatePriceRuleDto */
export interface PriceRuleInput {
  slot_type_id: string;
  kind: PriceRuleKind;
  /** Default fixed; percent isn't allowed for base rules. */
  adjustment?: PriceAdjustment;
  /** Fixed rules only (required for them). */
  amount?: number;
  /** Percent rules only (required for them). */
  percent?: number;
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
  /** Switching to percent needs `percent` (clears amount and guest pricing); to fixed needs `amount`. */
  adjustment?: PriceAdjustment;
  amount?: number;
  percent?: number;
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

/**
 * GET /admin/yachts/{id}/price-rules — optionally filtered by slot type or kind.
 * The endpoint is paginated; this reads every page, as all callers need the full list.
 */
export async function listPriceRules(
  yachtId: string,
  query: { slot_type_id?: string; kind?: PriceRuleKind } = {},
  signal?: AbortSignal,
): Promise<PriceRule[]> {
  const rules: PriceRule[] = [];
  for (let page = 1; ; page++) {
    const { items, total } = await adminApiClient.get(yachtRules(yachtId), {
      query: { ...query, page, limit: PRICE_RULES_PAGE_SIZE },
      schema: priceRuleListSchema,
      signal,
    });
    rules.push(...items);
    if (items.length === 0 || rules.length >= total) return rules;
  }
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
