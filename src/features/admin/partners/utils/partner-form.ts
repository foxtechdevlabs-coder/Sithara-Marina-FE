import { parseRate } from "@/features/admin/fleet/utils/yacht-form";
import type { Yacht } from "@/services/admin/fleet.service";
import type {
  Partner,
  PartnerDocument,
  PartnerInput,
  PartnerPatch,
} from "@/services/admin/partners.service";

export interface PartnerFormValues {
  name: string;
  contact: string;
  email: string;
  phone: string;
  /** Percentage as typed; empty means no rate. */
  commission: string;
  /** YYYY-MM-DD, from a date field; empty means not set. */
  agreementFrom: string;
  agreementTill: string;
}

export const EMPTY_PARTNER_FORM: PartnerFormValues = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  commission: "",
  agreementFrom: "",
  agreementTill: "",
};

export const partnerFormFromPartner = (p: Partner): PartnerFormValues => ({
  name: p.name,
  contact: p.contact_name ?? "",
  email: p.email ?? "",
  phone: p.phone ?? "",
  commission: p.default_commission_rate === null ? "" : String(p.default_commission_rate),
  agreementFrom: p.agreement_effective_from?.slice(0, 10) ?? "",
  agreementTill: p.agreement_valid_till?.slice(0, 10) ?? "",
});

/** Field errors keyed by input id. Contact and email are required by the design, not the API. */
export function partnerFormErrors(form: PartnerFormValues) {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  const contact = form.contact.trim();
  const email = form.email.trim();
  if (!name) errors["partner-name"] = "Enter the partner's name.";
  else if (name.length > 200) errors["partner-name"] = "Use 200 characters or fewer.";
  if (!contact) errors["partner-contact"] = "Enter a contact person.";
  else if (contact.length > 200) errors["partner-contact"] = "Use 200 characters or fewer.";
  if (!email) errors["partner-email"] = "Enter an email address.";
  else if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors["partner-email"] = "Enter a valid email address.";
  }
  if (form.phone.trim().length > 30) errors["partner-phone"] = "Use 30 characters or fewer.";
  if (parseRate(form.commission) === undefined) {
    errors["partner-commission"] = "Enter a percentage from 0 to 100, with up to 2 decimals.";
  }
  if (form.agreementFrom && form.agreementTill && form.agreementTill < form.agreementFrom) {
    errors["partner-valid"] = "This can't be before the effective date.";
  }
  return errors;
}

const orNull = (value: string) => value.trim() || null;

/** POST /admin/partners body. Call after `partnerFormErrors` finds nothing. */
export function partnerInput(form: PartnerFormValues): PartnerInput {
  return {
    name: form.name.trim(),
    contact_name: orNull(form.contact),
    email: orNull(form.email),
    phone: orNull(form.phone),
    default_commission_rate: parseRate(form.commission) ?? null,
    agreement_effective_from: orNull(form.agreementFrom),
    agreement_valid_till: orNull(form.agreementTill),
  };
}

const formDate = (date: string | null) => date?.slice(0, 10) ?? null;

/** The details that changed. The commission has its own request. */
export function partnerChanges(form: PartnerFormValues, partner: Partner): PartnerPatch {
  const next = partnerInput(form);
  return {
    ...(next.name !== partner.name ? { name: next.name } : {}),
    ...(next.contact_name !== partner.contact_name ? { contact_name: next.contact_name } : {}),
    ...(next.email !== partner.email ? { email: next.email } : {}),
    ...(next.phone !== partner.phone ? { phone: next.phone } : {}),
    ...(next.agreement_effective_from !== formDate(partner.agreement_effective_from)
      ? { agreement_effective_from: next.agreement_effective_from }
      : {}),
    ...(next.agreement_valid_till !== formDate(partner.agreement_valid_till)
      ? { agreement_valid_till: next.agreement_valid_till }
      : {}),
  };
}

/** The new commission rate, or undefined when it hasn't changed. */
export function commissionChange(form: PartnerFormValues, partner: Partner) {
  const rate = parseRate(form.commission);
  return rate === partner.default_commission_rate ? undefined : rate;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/** The API has no agreement versions, so the newest document counts as the current one. */
export const newestFirst = (documents: PartnerDocument[]) =>
  [...documents].sort((a, b) => b.created_at.localeCompare(a.created_at));

/** Today in the marina's time zone, YYYY-MM-DD. */
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** The list's Agreement column, from the agreement's dates. */
export function agreementText(
  partner: Pick<Partner, "agreement_effective_from" | "agreement_valid_till">,
  now = today(),
) {
  const from = formDate(partner.agreement_effective_from);
  const till = formDate(partner.agreement_valid_till);
  if (!from && !till) return "Not set";
  if (till && till < now) return `Expired · ${formatDate(till)}`;
  if (from && from > now) return `Starts · ${formatDate(from)}`;
  return till ? `Current · ${formatDate(till)}` : "Current";
}

/** A title for an uploaded file: its name without the extension. */
export const documentTitle = (filename: string) =>
  (filename.replace(/\.[^.]+$/, "").trim() || filename).slice(0, 200);

export const yachtStatusText = (y: Pick<Yacht, "is_active" | "is_visible">) =>
  y.is_active ? `${y.is_visible ? "Visible" : "Hidden"} · Active` : "Inactive";

/** A yacht's own rate, else the partner's default. */
export function yachtCommissionText(y: Pick<Yacht, "commission_rate">, defaultRate: number | null) {
  if (y.commission_rate !== null) return `${y.commission_rate}%`;
  return defaultRate === null ? "—" : `${defaultRate}% · Partner default`;
}
