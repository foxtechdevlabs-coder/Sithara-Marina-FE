"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { BODY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { searchPartners, searchYachts } from "@/components/admin/lookups";
import { SearchSelect, type SearchOption } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  formGrid,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { getYacht, setCommission, type Yacht } from "@/services/admin/fleet.service";
import {
  getPartner,
  listPartnerYachts,
  listPartners,
  setPartnerCommission,
  updatePartner,
  type Partner,
} from "@/services/admin/partners.service";

import {
  commissionErrorMessage,
  formatRate,
  parseRate,
  previewText,
  ruleRows,
} from "../utils/commission-format";

/** What a rule applies to: a partner's default rate (yachtId null), or one of its yachts. */
interface Selection {
  partnerId: string;
  yachtId: string | null;
}

/** Partners whose yachts a search by partner name also lists. */
const MATCHED_PARTNERS = 5;

const selectionValue = (s: Selection) => (s.yachtId ? `y:${s.yachtId}` : `p:${s.partnerId}`);

/** Partner / yacht picker: searches active partners and partner yachts on the server. */
function TargetPicker({
  selection,
  label,
  onChange,
}: {
  selection: Selection;
  label?: string;
  onChange: (next: Selection) => void;
}) {
  const findPartners = searchPartners({ status: "active" });
  const findYachts = searchYachts({ ownership: "partner" });
  return (
    <SearchSelect<Selection>
      id="rule-target"
      value={selectionValue(selection)}
      selectedLabel={label}
      onChange={(_, option) => option?.data && onChange(option.data)}
      load={async (search, signal) => {
        const [partners, yachts] = await Promise.all([
          findPartners(search, signal),
          findYachts(search, signal),
        ]);
        // A search by partner name also brings that partner's yachts (their own
        // names needn't match). Only for a few partners, to keep it quick.
        const matched = search ? partners.options.slice(0, MATCHED_PARTNERS) : [];
        const fleets = await Promise.all(
          matched.map((o) => listPartnerYachts(o.value, signal).catch(() => [] as Yacht[])),
        );

        // Group: each partner's default rule, then its yachts.
        const groups = new Map<
          string,
          { name: string; withDefault: boolean; yachts: Map<string, Yacht> }
        >();
        const group = (id: string, name: string) => {
          let g = groups.get(id);
          if (!g) groups.set(id, (g = { name, withDefault: false, yachts: new Map() }));
          return g;
        };
        for (const o of partners.options) group(o.value, o.data!.name).withDefault = true;
        matched.forEach((o, i) => {
          const g = group(o.value, o.data!.name);
          for (const y of fleets[i] ?? []) g.yachts.set(y.id, y);
        });
        for (const o of yachts.options) {
          const y = o.data;
          if (y?.partner) group(y.partner.id, y.partner.name).yachts.set(y.id, y);
        }

        const options: SearchOption<Selection>[] = [];
        for (const [partnerId, g] of groups) {
          if (g.withDefault)
            options.push({
              value: `p:${partnerId}`,
              label: `${g.name} · all yachts (default)`,
              description: "Partner default rate",
              data: { partnerId, yachtId: null },
            });
          for (const y of g.yachts.values())
            options.push({
              value: `y:${y.id}`,
              label: `${g.name} / ${y.name}`,
              description:
                y.commission_rate === null
                  ? "Yacht rate · uses the partner default"
                  : `Yacht rate · ${formatRate(y.commission_rate)}%`,
              data: { partnerId, yachtId: y.id },
            });
        }
        return { options, hasMore: partners.hasMore || yachts.hasMore };
      }}
      placeholder="Search partners or yachts"
      noResults="No partner or partner yacht matches."
    />
  );
}

/**
 * Commissions: "Fair value, clearly defined." (admin Figma A16). Partner
 * default rates (PUT /admin/partners/{id}/commission, agreement dates via
 * PATCH /admin/partners/{id}) and yacht rates (PUT /admin/yachts/{id}/commission),
 * with the commission report below. Only the selected partner and its yachts
 * are loaded, so the page scales with the number of partners.
 */
export function CommissionScreen({
  initialPartner = "",
  initialYacht = "",
}: {
  initialPartner?: string;
  initialYacht?: string;
}) {
  const [picked, setPicked] = useState<Selection | null>(null);
  // Start on the yacht or partner from the URL, else the first active partner.
  const start = useAdminQuery(async (signal): Promise<Selection | null> => {
    if (initialYacht) {
      const y = await getYacht(initialYacht, signal);
      if (y.partner) return { partnerId: y.partner.id, yachtId: y.id };
    }
    if (initialPartner) return { partnerId: initialPartner, yachtId: null };
    const first = await listPartners({ limit: 1, status: "active" }, signal);
    return first.items[0] ? { partnerId: first.items[0].id, yachtId: null } : null;
  }, `commission-start:${initialPartner}:${initialYacht}`);
  const selection = picked ?? start.data ?? null;
  const partnerId = selection?.partnerId ?? "";

  const partner = useAdminQuery(
    (signal) => (partnerId ? getPartner(partnerId, signal) : Promise.resolve(null)),
    `commission-partner:${partnerId}`,
  );
  const yachts = useAdminQuery(
    (signal) =>
      partnerId
        ? listPartnerYachts(partnerId, signal).then((items) => ({ partnerId, items }))
        : Promise.resolve(null),
    `commission-partner-yachts:${partnerId}`,
  );

  const header = (
    <PageHeader
      title="Fair value, clearly defined."
      subtitle="Commission management for partner yachts."
    />
  );

  if (!selection) {
    return (
      <div className={pagePadding}>
        {header}
        <div className="mt-[24px]">
          {start.data === null && !start.loading ? (
            <p className="text-[14px]" style={{ color: BODY }}>
              There are no active partners yet.{" "}
              <Link href={adminRoutes.partnerNew} className="underline underline-offset-2">
                Add a partner
              </Link>{" "}
              to set commission rates.
            </p>
          ) : (
            <LoadState
              loading={start.loading}
              error={
                start.error
                  ? `Couldn't load partners. ${commissionErrorMessage(start.error)}`
                  : undefined
              }
              onRetry={start.reload}
              label="Loading partners"
            />
          )}
        </div>
      </div>
    );
  }

  // The hooks keep the previous partner while the next one loads: wait for the chosen one.
  const ready =
    partner.data?.id === partnerId &&
    yachts.data?.partnerId === partnerId &&
    !partner.error &&
    !yachts.error;
  const yacht = selection.yachtId
    ? (yachts.data?.items.find((y) => y.id === selection.yachtId) ?? null)
    : null;
  const pickerLabel = ready
    ? yacht
      ? `${partner.data!.name} / ${yacht.name}`
      : `${partner.data!.name} · all yachts (default)`
    : undefined;
  const picker = <TargetPicker selection={selection} label={pickerLabel} onChange={setPicked} />;

  if (!ready) {
    const error = partner.error ?? yachts.error;
    return (
      <div className={pagePadding}>
        {header}
        <div className={cx(formGrid, "mt-[24px] lg:mt-[30px] lg:max-w-[700px]")}>
          <div>
            <Label htmlFor="rule-target">Partner / yacht</Label>
            {picker}
          </div>
        </div>
        <div className="mt-[24px]">
          <LoadState
            loading={partner.loading || yachts.loading}
            error={
              error ? `Couldn't load this partner. ${commissionErrorMessage(error)}` : undefined
            }
            onRetry={() => {
              partner.reload();
              yachts.reload();
            }}
            label="Loading partner"
          />
        </div>
      </div>
    );
  }

  const target: Target = yacht
    ? { kind: "yacht", partner: partner.data!, yacht }
    : { kind: "partner", partner: partner.data! };
  return (
    <CommissionEditor
      key={targetKey(target)}
      target={target}
      partnerYachts={yachts.data!.items}
      picker={picker}
      onSaved={() => {
        partner.reload();
        yachts.reload();
      }}
    />
  );
}

/** Target of a rule: a partner's default rate, or one of its yachts. */
type Target =
  { kind: "partner"; partner: Partner } | { kind: "yacht"; partner: Partner; yacht: Yacht };

const targetKey = (t: Target) => (t.kind === "partner" ? `p:${t.partner.id}` : `y:${t.yacht.id}`);

function CommissionEditor({
  target,
  partnerYachts,
  picker,
  onSaved,
}: {
  target: Target;
  partnerYachts: Yacht[];
  picker: ReactNode;
  onSaved: () => void;
}) {
  const partner = target.partner;
  const currentRate =
    target.kind === "partner" ? partner.default_commission_rate : target.yacht.commission_rate;

  const [rate, setRate] = useState(formatRate(currentRate));
  const [from, setFrom] = useState(partner.agreement_effective_from ?? "");
  const [until, setUntil] = useState(partner.agreement_valid_till ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();

  const parsed = parseRate(rate);
  const errors: { rate?: string; until?: string } = {};
  if (submitted) {
    if (parsed === undefined) errors.rate = "Enter a percentage from 0 to 100, up to two decimals.";
    if (target.kind === "partner" && from && until && until < from)
      errors.until = "The end can’t be before the start.";
  }
  // The rate that applies: a yacht with no rate of its own uses the partner's.
  const effective =
    parsed === undefined
      ? null
      : (parsed ?? (target.kind === "yacht" ? partner.default_commission_rate : null));
  const yachtsOfPartner = partnerYachts;

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setNotice(undefined);
    if (parsed === undefined) return;
    if (target.kind === "partner" && from && until && until < from) return;
    setBusy(true);
    try {
      const rateChanged = parsed !== currentRate;
      if (target.kind === "partner") {
        if (rateChanged) await setPartnerCommission(partner.id, parsed);
        const datesChanged =
          (from || null) !== partner.agreement_effective_from ||
          (until || null) !== partner.agreement_valid_till;
        if (datesChanged)
          await updatePartner(partner.id, {
            agreement_effective_from: from || null,
            agreement_valid_till: until || null,
          });
        if (!rateChanged && !datesChanged) {
          setNotice({ tone: "success", text: "Nothing to save: the rule is unchanged." });
          return;
        }
      } else {
        if (!rateChanged) {
          setNotice({ tone: "success", text: "Nothing to save: the rule is unchanged." });
          return;
        }
        await setCommission(target.yacht.id, parsed);
      }
      setNotice({
        tone: "success",
        text: "Commission rule saved. It applies to new bookings; confirmed bookings keep the rate they were confirmed with.",
      });
      onSaved();
    } catch (err) {
      setNotice({ tone: "error", text: commissionErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const rules = ruleRows(partner, yachtsOfPartner, marinaToday());

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Fair value, clearly defined."
        subtitle="Commission management for partner yachts."
      />

      <form onSubmit={save} noValidate className="mt-[24px] lg:mt-[30px]">
        <div className={cx(formGrid, "lg:max-w-[700px]")}>
          <div>
            <Label htmlFor="rule-target">Partner / yacht</Label>
            {picker}
          </div>
          <div>
            <Label htmlFor="rule-type">Commission type</Label>
            <SelectBox
              id="rule-type"
              value="percentage"
              onChange={() => {}}
              disabled
              options={[{ value: "percentage", label: "Percentage" }]}
            />
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              Rates are a percentage of the charter.
            </p>
          </div>
          <div>
            <Label htmlFor="rule-rate">Commission rate</Label>
            <div className="relative">
              <input
                id="rule-rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.currentTarget.value)}
                placeholder={target.kind === "yacht" ? "Uses the partner’s rate" : "e.g. 15"}
                className={cx(input, "pr-[36px]")}
                {...errorProps("rule-rate", errors.rate)}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[13px]"
                style={{ color: BODY }}
              >
                %
              </span>
            </div>
            <FieldError id="rule-rate" message={errors.rate} />
            {!errors.rate && (
              <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
                {target.kind === "yacht"
                  ? `Leave empty to use ${partner.name}’s default (${formatRate(partner.default_commission_rate) ? `${formatRate(partner.default_commission_rate)}%` : "none set"}).`
                  : "Yachts without a rate of their own use this one. Empty removes it."}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="rule-basis">Calculation basis</Label>
            <SelectBox
              id="rule-basis"
              value="charter"
              onChange={() => {}}
              disabled
              options={[{ value: "charter", label: "Charter amount excluding tax" }]}
            />
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              Add-ons and GST aren’t commissioned.
            </p>
          </div>
          <div>
            <Label htmlFor="rule-from">Effective from</Label>
            <input
              id="rule-from"
              type="date"
              value={from}
              disabled={target.kind === "yacht"}
              onChange={(e) => setFrom(e.currentTarget.value)}
              className={input}
            />
          </div>
          <div>
            <Label htmlFor="rule-until">Effective until</Label>
            <input
              id="rule-until"
              type="date"
              value={until}
              min={from || undefined}
              disabled={target.kind === "yacht"}
              onChange={(e) => setUntil(e.currentTarget.value)}
              className={input}
              {...errorProps("rule-until", errors.until)}
            />
            <FieldError id="rule-until" message={errors.until} />
          </div>
        </div>
        <p className="mt-[10px] text-[11px] lg:max-w-[700px]" style={{ color: BODY }}>
          {target.kind === "yacht"
            ? `The dates are ${partner.name}’s agreement period; change them on the partner’s default rule.`
            : "The dates are the partner’s agreement period."}{" "}
          A change applies to new bookings only.
        </p>

        <InfoPanel title="Calculation preview" className="mt-[24px]">
          {previewText(effective)}
        </InfoPanel>

        <div className="mt-[24px]">
          <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
            <caption className="sr-only">Commission rules for {partner.name}</caption>
            <thead>
              <tr className="bg-[#f4efe8]">
                {["Rule", "Yacht", "Effective period", "Priority"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="w-1/4 px-[12px] py-[12px] font-normal"
                    style={{ color: BODY }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rules.map((r) => (
                <tr key={r.key} className="border-b border-[#ebe9e4]">
                  <td className="px-[12px] py-[12px]">{r.rule}</td>
                  <td className="px-[12px] py-[12px]">{r.yacht}</td>
                  <td className="px-[12px] py-[12px]">{r.period}</td>
                  <td className="px-[12px] py-[12px]">{r.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="grid gap-[14px] lg:hidden">
            {rules.map((r) => (
              <li key={r.key} className="border border-[#dcdad5] bg-white px-[16px] py-[18px]">
                <p className="text-[18px] leading-[24px]">{r.rule}</p>
                <dl className="text-[12px]">
                  {(
                    [
                      ["Yacht", r.yacht],
                      ["Effective period", r.period],
                      ["Priority", r.priority],
                    ] as const
                  ).map(([t, v]) => (
                    <div key={t} className="mt-[10px]">
                      <dt className="text-[10px]" style={{ color: BODY }}>
                        {t}
                      </dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </div>

        {notice && (
          <Notice tone={notice.tone} className="mt-[20px] lg:max-w-[880px]">
            {notice.text}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button
            type="submit"
            disabled={busy}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={PRIMARY_STYLE}
          >
            {busy ? "Saving…" : "Save commission rule"}
          </button>
          <Link
            href={adminRoutes.partner(partner.id)}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            View partner
          </Link>
          <Link
            href={adminRoutes.commissionsFor(partner.id)}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            Back to commission earned
          </Link>
        </div>
      </form>
    </div>
  );
}
