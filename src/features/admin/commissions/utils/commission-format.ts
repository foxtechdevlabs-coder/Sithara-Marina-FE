import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";

/* Rates, preview and rule wording of the commission screen. */

/** 15 → "15", 12.5 → "12.5", null → "" */
export const formatRate = (rate: number | null | undefined) =>
  rate === null || rate === undefined ? "" : String(Number(rate.toFixed(2)));

/**
 * A typed rate: a number from 0 to 100 with up to two decimals, null for an
 * empty field (remove the rate), undefined when invalid.
 */
export function parseRate(text: string): number | null | undefined {
  const t = text.trim().replace(/%$/, "").trim();
  if (!t) return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 0 && n <= 100 ? n : undefined;
}

const inr = (rupees: number) => `₹ ${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** "Charter basis ₹ 1,00,000 × 15% = ₹ 15,000 commission. Partner gross payable ₹ 85,000 …" */
export function previewText(rate: number | null, basis = 1_00_000): string {
  if (rate === null)
    return `No rate applies, so no commission is taken: on a charter basis of ${inr(basis)} the partner gross payable is ${inr(basis)}.`;
  const commission = Math.round(basis * rate) / 100;
  return `Charter basis ${inr(basis)} × ${formatRate(rate)}% = ${inr(commission)} commission. Partner gross payable ${inr(basis - commission)} before settlement adjustments.`;
}

const dayMonth = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

/** "01 Nov–31 Dec", "From 01 Nov", "Until 31 Oct", "No end date". */
export function agreementPeriod(from: string | null, until: string | null): string {
  if (from && until) return `${dayMonth(from)}–${dayMonth(until)}`;
  if (from) return `From ${dayMonth(from)}`;
  if (until) return `Until ${dayMonth(until)}`;
  return "No dates set";
}

export interface RuleRow {
  key: string;
  rule: string;
  yacht: string;
  period: string;
  priority: string;
}

/**
 * The partner's rules, strongest first: a yacht's own rate wins over the
 * partner's default. An agreement that has ended reads "Historical".
 */
export function ruleRows(
  partner: {
    default_commission_rate: number | null;
    agreement_effective_from: string | null;
    agreement_valid_till: string | null;
  },
  yachts: { id: string; name: string; commission_rate: number | null }[],
  today: string,
): RuleRow[] {
  const period = agreementPeriod(partner.agreement_effective_from, partner.agreement_valid_till);
  const ended = Boolean(partner.agreement_valid_till && partner.agreement_valid_till < today);
  const own = yachts.filter((y) => y.commission_rate !== null);
  const rest = yachts.filter((y) => y.commission_rate === null);
  const rows: RuleRow[] = own.map((y) => ({
    key: `y-${y.id}`,
    rule: `Yacht rate · ${formatRate(y.commission_rate)}%`,
    yacht: y.name,
    period,
    priority: ended ? "Historical" : "1",
  }));
  rows.push({
    key: "partner",
    rule:
      partner.default_commission_rate === null
        ? "Partner agreement · no rate"
        : `Partner agreement · ${formatRate(partner.default_commission_rate)}%`,
    yacht: !yachts.length
      ? "No yachts yet"
      : own.length
        ? rest.length
          ? rest.map((y) => y.name).join(", ")
          : "None (every yacht has its own rate)"
        : yachts.map((y) => y.name).join(", "),
    period,
    priority: ended ? "Historical" : own.length ? "2" : "1",
  });
  return rows;
}

/** A short message for a failed commission request. */
export function commissionErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "INVALID_PARTNER") return "Commission can only be set on partner yachts.";
    if (error.status === 403) return "Your account doesn’t have permission to change commission.";
  }
  return fleetErrorMessage(error, "This partner");
}
