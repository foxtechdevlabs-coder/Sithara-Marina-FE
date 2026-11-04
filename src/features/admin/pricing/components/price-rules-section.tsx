"use client";

import { Plus } from "lucide-react";
import { useRef, useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  Section,
  SelectBox,
  Toggle,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { cx } from "@/lib/cx";
import type { SlotType } from "@/services/admin/fleet.service";
import {
  PRICE_RULE_KINDS,
  createPriceRule,
  deletePriceRule,
  updatePriceRule,
  type PriceRule,
  type PriceRuleKind,
} from "@/services/admin/pricing.service";
import { isApiError } from "@/services/http/api-error";

import {
  draftFromRule,
  emptyRuleDraft,
  formatPaise,
  toRuleInput,
  toRulePatch,
  validateRuleDraft,
  type PriceRuleDraft,
} from "../utils/pricing-form";

const KIND_LABEL: Record<PriceRuleKind, string> = {
  base: "Base",
  weekend: "Weekend",
  season: "Season",
  holiday: "Holiday",
};
const KIND_TEXT: Record<PriceRuleKind, string> = {
  base: "The everyday price.",
  weekend: "Replaces the base price at weekends.",
  season: "Applies between two dates (both required).",
  holiday: "Takes precedence over every other kind.",
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** The add / edit form for one price rule. */
function RuleForm({
  slotTypes,
  rule,
  initial,
  saving,
  problem,
  onCancel,
  onSubmit,
}: {
  slotTypes: SlotType[];
  /** The rule being edited; undefined when adding. */
  rule?: PriceRule;
  initial: PriceRuleDraft;
  saving: boolean;
  problem: string;
  onCancel: () => void;
  onSubmit: (draft: PriceRuleDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = rule ? `rule-${rule.id}` : "rule-new";
  const set = <K extends keyof PriceRuleDraft>(key: K, value: PriceRuleDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };
  const fieldId = (key: string) => `${id}-${key}`;
  const money = (v: string) => v.replace(/[^\d.,]/g, "");

  return (
    <form
      noValidate
      aria-busy={saving}
      aria-label={rule ? "Edit price rule" : "New price rule"}
      onSubmit={(e) => {
        e.preventDefault();
        const found = validateRuleDraft(draft);
        setErrors(found);
        const first = Object.keys(found)[0];
        if (first) {
          document.getElementById(fieldId(first))?.focus();
          return;
        }
        onSubmit(draft);
      }}
      className="border border-[#0d1b2a] px-[16px] pt-[16px] pb-[18px] sm:px-[20px]"
      style={{ backgroundColor: "#fcfbf9" }}
    >
      <p className="text-[11px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        {rule ? "Edit price rule" : "New price rule"}
      </p>
      <div className="mt-[14px] grid gap-x-[16px] gap-y-[16px] sm:grid-cols-2 md:grid-cols-3">
        <div>
          <Label htmlFor={fieldId("slotTypeId")} required>
            Slot type
          </Label>
          <SelectBox
            id={fieldId("slotTypeId")}
            value={draft.slotTypeId}
            onChange={(v) => set("slotTypeId", v)}
            // A rule stays with its slot type; to move it, add a new rule instead.
            disabled={Boolean(rule)}
            options={[
              { value: "", label: "Choose a slot type" },
              ...slotTypes.map((t) => ({ value: t.id, label: t.name })),
            ]}
            invalid={errors.slotTypeId}
          />
          <FieldError id={fieldId("slotTypeId")} message={errors.slotTypeId} />
        </div>
        <div>
          <Label htmlFor={fieldId("kind")} required>
            Kind
          </Label>
          <SelectBox
            id={fieldId("kind")}
            value={draft.kind}
            onChange={(v) => set("kind", v as PriceRuleKind)}
            options={PRICE_RULE_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          />
          <p className="mt-[6px] text-[11px] leading-[16px]" style={{ color: BODY }}>
            {KIND_TEXT[draft.kind]}
          </p>
        </div>
        <div>
          <Label htmlFor={fieldId("name")} hint="optional">
            Name
          </Label>
          <input
            id={fieldId("name")}
            className={input}
            maxLength={100}
            placeholder="e.g. Diwali week"
            value={draft.name}
            onChange={(e) => set("name", e.currentTarget.value)}
            {...errorProps(fieldId("name"), errors.name)}
          />
          <FieldError id={fieldId("name")} message={errors.name} />
        </div>
        <div>
          <Label htmlFor={fieldId("amount")} required hint="per charter, excl. GST">
            Price (₹)
          </Label>
          <input
            id={fieldId("amount")}
            inputMode="decimal"
            className={input}
            placeholder="40000"
            value={draft.amount}
            onChange={(e) => set("amount", money(e.currentTarget.value))}
            {...errorProps(fieldId("amount"), errors.amount)}
          />
          <FieldError id={fieldId("amount")} message={errors.amount} />
        </div>
        <div>
          <Label htmlFor={fieldId("includedGuests")} hint="covered by the price">
            Included guests
          </Label>
          <input
            id={fieldId("includedGuests")}
            inputMode="numeric"
            className={input}
            maxLength={4}
            placeholder="10"
            value={draft.includedGuests}
            onChange={(e) => set("includedGuests", e.currentTarget.value.replace(/\D/g, ""))}
            {...errorProps(fieldId("includedGuests"), errors.includedGuests)}
          />
          <FieldError id={fieldId("includedGuests")} message={errors.includedGuests} />
        </div>
        <div>
          <Label htmlFor={fieldId("extraGuestAmount")} hint="per extra guest, excl. GST">
            Extra guest (₹)
          </Label>
          <input
            id={fieldId("extraGuestAmount")}
            inputMode="decimal"
            className={input}
            placeholder="1500"
            value={draft.extraGuestAmount}
            onChange={(e) => set("extraGuestAmount", money(e.currentTarget.value))}
            {...errorProps(fieldId("extraGuestAmount"), errors.extraGuestAmount)}
          />
          <FieldError id={fieldId("extraGuestAmount")} message={errors.extraGuestAmount} />
        </div>
        <div>
          <Label
            htmlFor={fieldId("startsOn")}
            required={draft.kind === "season"}
            hint={draft.kind === "season" ? undefined : "optional"}
          >
            First date
          </Label>
          <input
            id={fieldId("startsOn")}
            type="date"
            className={input}
            value={draft.startsOn}
            onChange={(e) => set("startsOn", e.currentTarget.value)}
            {...errorProps(fieldId("startsOn"), errors.startsOn)}
          />
          <FieldError id={fieldId("startsOn")} message={errors.startsOn} />
        </div>
        <div>
          <Label
            htmlFor={fieldId("endsOn")}
            required={draft.kind === "season"}
            hint={draft.kind === "season" ? "inclusive" : "optional, inclusive"}
          >
            Last date
          </Label>
          <input
            id={fieldId("endsOn")}
            type="date"
            className={input}
            min={draft.startsOn || undefined}
            value={draft.endsOn}
            onChange={(e) => set("endsOn", e.currentTarget.value)}
            {...errorProps(fieldId("endsOn"), errors.endsOn)}
          />
          <FieldError id={fieldId("endsOn")} message={errors.endsOn} />
        </div>
        <div>
          <Label htmlFor={fieldId("priority")} hint="higher wins between rules of one kind">
            Priority
          </Label>
          <input
            id={fieldId("priority")}
            inputMode="numeric"
            className={input}
            maxLength={5}
            value={draft.priority}
            onChange={(e) => set("priority", e.currentTarget.value.replace(/[^\d-]/g, ""))}
            {...errorProps(fieldId("priority"), errors.priority)}
          />
          <FieldError id={fieldId("priority")} message={errors.priority} />
        </div>
      </div>
      <div className="mt-[16px] max-w-[460px]">
        <Toggle
          id={fieldId("active")}
          label="Active"
          text="Inactive rules are kept but not used for prices."
          checked={draft.active}
          onChange={(v) => set("active", v)}
        />
      </div>
      {problem && (
        <Notice tone="error" className="mt-[12px]">
          {problem}
        </Notice>
      )}
      <div className="mt-[16px] flex flex-wrap gap-[12px]">
        <button type="submit" disabled={saving} className={primaryButton} style={PRIMARY_STYLE}>
          {saving ? "Saving…" : rule ? "Save rule" : "Add rule"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={outlineButton}
          style={OUTLINE_STYLE}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * Price rules of one yacht, grouped by slot type. Amounts are paise on the
 * wire and rupees on screen. POST /admin/yachts/{id}/price-rules,
 * PATCH /admin/price-rules/{id}, DELETE /admin/price-rules/{id}.
 */
export function PriceRulesSection({
  yachtId,
  slotTypes,
  rules,
  onRulesChange,
}: {
  yachtId: string;
  slotTypes: SlotType[];
  rules: PriceRule[];
  onRulesChange: (rules: PriceRule[]) => void;
}) {
  /** "new" or the id of the rule being edited. */
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formProblem, setFormProblem] = useState("");
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const busy = useRef(false);

  const open = (target: string) => {
    setEditing(target);
    setFormProblem("");
    setProblem("");
    setNotice("");
  };

  /** NOT_PUBLISHABLE here means the yacht would lose its last active base price. */
  const ruleError = (err: unknown, action: string) =>
    isApiError(err) && err.code === "NOT_PUBLISHABLE"
      ? `Couldn't ${action} the rule: this yacht is visible on the website and needs at least one active base price. Hide the yacht first, or add another base price.`
      : `Couldn't ${action} the rule. ${fleetErrorMessage(err, "This price rule")}`;

  async function submit(draft: PriceRuleDraft) {
    if (busy.current) return;
    const rule = rules.find((r) => r.id === editing);
    let patch = {};
    if (rule) {
      patch = toRulePatch(draft, rule);
      if (!Object.keys(patch).length) {
        setEditing(null);
        setNotice("No changes to save.");
        return;
      }
    }
    busy.current = true;
    setSaving(true);
    setFormProblem("");
    try {
      if (rule) {
        const saved = await updatePriceRule(rule.id, patch);
        onRulesChange(rules.map((r) => (r.id === saved.id ? saved : r)));
        setNotice("Price rule saved.");
      } else {
        const created = await createPriceRule(yachtId, toRuleInput(draft));
        onRulesChange([...rules, created]);
        setNotice("Price rule added.");
      }
      setEditing(null);
    } catch (err) {
      setFormProblem(ruleError(err, rule ? "save" : "add"));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function remove(rule: PriceRule) {
    if (busy.current) return;
    const label = rule.name
      ? `"${rule.name}"`
      : `this ${KIND_LABEL[rule.kind].toLowerCase()} price`;
    if (!window.confirm(`Delete ${label} (${formatPaise(rule.amount)})? This can't be undone.`))
      return;
    busy.current = true;
    setDeletingId(rule.id);
    setProblem("");
    setNotice("");
    try {
      await deletePriceRule(rule.id);
      onRulesChange(rules.filter((r) => r.id !== rule.id));
      setNotice("Price rule deleted.");
    } catch (err) {
      setProblem(ruleError(err, "delete"));
    } finally {
      busy.current = false;
      setDeletingId(null);
    }
  }

  const known = new Set(slotTypes.map((t) => t.id));
  const groups = [
    ...slotTypes.map((t) => ({ id: t.id, title: t.name, inactive: !t.is_active })),
    // Rules whose slot type is not in the current setup (should not happen, but never hide data).
    ...(rules.some((r) => !known.has(r.slot_type_id))
      ? [{ id: "", title: "Other slot types", inactive: false }]
      : []),
  ];

  const rowsFor = (groupId: string) =>
    rules
      .filter((r) => (groupId ? r.slot_type_id === groupId : !known.has(r.slot_type_id)))
      .sort(
        (a, b) =>
          PRICE_RULE_KINDS.indexOf(a.kind) - PRICE_RULE_KINDS.indexOf(b.kind) ||
          b.priority - a.priority,
      );

  return (
    <Section
      id="price-rules"
      number="02"
      title="Price rules"
      aside={
        slotTypes.length > 0 &&
        editing !== "new" && (
          <button
            type="button"
            onClick={() => open("new")}
            className="inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2 hover:opacity-70"
          >
            <Plus aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
            Add price rule
          </button>
        )
      }
    >
      <p className="-mt-[12px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        Prices are per charter and exclude GST. When several rules match a date, holiday beats
        season, season beats weekend, and weekend beats base; priority breaks ties.
      </p>

      {(problem || notice) && (
        <Notice tone={problem ? "error" : "success"} className="mt-[14px]">
          {problem || notice}
        </Notice>
      )}

      {editing === "new" && (
        <div className="mt-[18px]">
          <RuleForm
            slotTypes={slotTypes}
            initial={emptyRuleDraft(slotTypes.length === 1 ? slotTypes[0]!.id : "")}
            saving={saving}
            problem={formProblem}
            onCancel={() => setEditing(null)}
            onSubmit={(d) => void submit(d)}
          />
        </div>
      )}

      {slotTypes.length === 0 ? (
        <p className="mt-[18px] text-[13px]" style={{ color: BODY }}>
          Add a slot type above first; each price belongs to a slot type.
        </p>
      ) : (
        groups.map((g) => {
          const rows = rowsFor(g.id);
          return (
            <div key={g.id || "other"} className="mt-[26px]">
              <h3 className="flex items-baseline gap-[8px] text-[15px] leading-[22px]">
                {g.title}
                {g.inactive && (
                  <span className="text-[11px]" style={{ color: MUTED }}>
                    · not bookable
                  </span>
                )}
              </h3>
              {rows.length === 0 ? (
                <p className="mt-[8px] text-[13px]" style={{ color: BODY }}>
                  No prices yet
                  {g.id
                    ? " — guests can't book this slot type until it has an active base price."
                    : "."}
                </p>
              ) : (
                <ul className="mt-[10px] divide-y divide-[#eceae6] border-y border-[#eceae6]">
                  {rows.map((r) => (
                    <li key={r.id} className="py-[12px]">
                      {editing === r.id ? (
                        <RuleForm
                          slotTypes={slotTypes}
                          rule={r}
                          initial={draftFromRule(r)}
                          saving={saving}
                          problem={formProblem}
                          onCancel={() => setEditing(null)}
                          onSubmit={(d) => void submit(d)}
                        />
                      ) : (
                        <div className="grid gap-[6px] text-[13px] sm:grid-cols-[1.3fr_1fr_1.4fr_auto] sm:items-center sm:gap-[16px]">
                          <span>
                            <span
                              className="mr-[8px] inline-block px-[7px] py-[1px] text-[11px]"
                              style={{ backgroundColor: SAND }}
                            >
                              {KIND_LABEL[r.kind]}
                            </span>
                            {r.name ?? ""}
                            {!r.is_active && (
                              <span className="ml-[6px] text-[11px]" style={{ color: MUTED }}>
                                (inactive)
                              </span>
                            )}
                          </span>
                          <span className="text-[15px]">{formatPaise(r.amount)}</span>
                          <span className="text-[12px]" style={{ color: BODY }}>
                            {r.included_guests !== null && `${r.included_guests} guests incl.`}
                            {r.extra_guest_amount !== null &&
                              ` · ${formatPaise(r.extra_guest_amount)} per extra guest`}
                            {r.starts_on &&
                              ` · ${formatDate(r.starts_on)}${r.ends_on ? ` – ${formatDate(r.ends_on)}` : " onwards"}`}
                            {!r.starts_on && r.ends_on && ` · until ${formatDate(r.ends_on)}`}
                            {r.priority !== 0 && ` · priority ${r.priority}`}
                          </span>
                          <span className="flex gap-[14px]">
                            <button
                              type="button"
                              onClick={() => open(r.id)}
                              disabled={deletingId !== null}
                              className="text-[12px] underline underline-offset-2 hover:opacity-70"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(r)}
                              disabled={deletingId !== null}
                              aria-busy={deletingId === r.id}
                              className={cx(
                                "text-[12px] text-[#b3261e] underline underline-offset-2 hover:opacity-70",
                                deletingId !== null && "opacity-50",
                              )}
                            >
                              {deletingId === r.id ? "Deleting…" : "Delete"}
                            </button>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </Section>
  );
}
