"use client";

import { useRef, useState } from "react";

import { BODY } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { setCommission, type Yacht } from "@/services/admin/fleet.service";

import { fleetErrorMessage } from "../utils/fleet-error-message";

/** A percentage from 0 to 100 with at most 2 decimals (backend IsRate), or null. */
export function parseRate(value: string): number | null | undefined {
  const clean = value.trim().replace(/%$/, "").trim();
  if (clean === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return undefined;
  const rate = Number(clean);
  return rate <= 100 ? rate : undefined;
}

/**
 * Commission on a partner yacht's bookings: PUT /admin/yachts/{id}/commission
 * with `{ commission_rate }` (a percentage, or null to remove the rate). The
 * backend applies it to new bookings only. Needs the partners:write permission.
 */
export function CommissionPanel({
  yacht,
  onSaved,
}: {
  yacht: Pick<Yacht, "id" | "commission_rate" | "partner">;
  onSaved: (yacht: Yacht) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function save(rate: number | null) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setProblem("");
    try {
      onSaved(await setCommission(yacht.id, rate));
      setEditing(false);
      setNotice(rate === null ? "Commission rate removed." : "Commission rate saved.");
    } catch (err) {
      setProblem(`Couldn't save the commission. ${fleetErrorMessage(err)}`);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const current = yacht.commission_rate;

  return (
    <section
      aria-labelledby="commission-title"
      className="border border-[#e3e1dc] bg-white px-[20px] pt-[26px] pb-[28px] sm:px-[28px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
        <h2 id="commission-title" className="text-[20px] leading-[26px]">
          Commission
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setValue(current === null ? "" : String(current));
              setError("");
              setProblem("");
              setNotice("");
              setEditing(true);
            }}
            className="text-[13px] underline underline-offset-2 hover:opacity-70"
          >
            {current === null ? "Set rate" : "Change rate"}
          </button>
        )}
      </div>

      {notice && !editing && <Notice className="mt-[16px]">{notice}</Notice>}

      {!editing ? (
        <dl className="mt-[18px]">
          <dt className="text-[12px]" style={{ color: BODY }}>
            Commission rate{yacht.partner ? ` · ${yacht.partner.name}` : ""}
          </dt>
          <dd className="mt-[6px] text-[16px] leading-[22px]">
            {current === null ? "No rate set for this yacht" : `${current}%`}
          </dd>
        </dl>
      ) : (
        <form
          noValidate
          aria-busy={saving}
          onSubmit={(e) => {
            e.preventDefault();
            const rate = parseRate(value);
            if (rate === undefined) {
              setError("Enter a percentage from 0 to 100, with up to 2 decimals.");
              document.getElementById("commission-rate")?.focus();
              return;
            }
            void save(rate);
          }}
          className="mt-[18px] max-w-[365px]"
        >
          <Label htmlFor="commission-rate" hint="leave empty to remove the rate">
            Commission rate (%)
          </Label>
          <input
            id="commission-rate"
            inputMode="decimal"
            className={input}
            placeholder="12.5"
            value={value}
            onChange={(e) => {
              setValue(e.currentTarget.value);
              setError("");
            }}
            {...errorProps("commission-rate", error)}
          />
          <FieldError id="commission-rate" message={error} />
          <p className="mt-[10px] text-[11px] leading-[16px]" style={{ color: BODY }}>
            Applies to new bookings only; existing bookings keep their rate.
          </p>
          {problem && (
            <Notice tone="error" className="mt-[14px]">
              {problem}
            </Notice>
          )}
          <div className="mt-[16px] flex flex-wrap gap-[12px]">
            <button type="submit" disabled={saving} className={primaryButton} style={PRIMARY_STYLE}>
              {saving ? "Saving…" : "Save rate"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className={outlineButton}
              style={OUTLINE_STYLE}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
