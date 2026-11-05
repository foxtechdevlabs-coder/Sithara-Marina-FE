"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { BODY, GRADIENT, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { cx } from "@/lib/cx";
import { getSettings, updateSettings, type Settings } from "@/services/admin/settings.service";

import {
  settingsChanges,
  settingsFormErrors,
  settingsFormFromSettings,
  type SettingsFormValues,
} from "../utils/settings-form";

const PAGE = "px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]";
const tab = "flex h-[48px] w-[148px] items-center justify-center text-[11px]";

function Heading() {
  return (
    <>
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        The way your team works.
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[28px]" style={{ color: BODY }}>
        Taxes, charter rules, notifications and staff access.
      </p>
      <nav aria-label="Settings" className="mt-[20px] flex flex-wrap gap-[14px] lg:mt-[26px]">
        <span aria-current="page" className={tab} style={{ background: GRADIENT }}>
          Business rules
        </span>
        <Link
          href={adminRoutes.notifications}
          className={`${tab} border bg-white transition-colors hover:bg-[#f2f1ee]`}
          style={{ borderColor: INK }}
        >
          Notifications
        </Link>
        <Link
          href={adminRoutes.staff}
          className={`${tab} border bg-white transition-colors hover:bg-[#f2f1ee]`}
          style={{ borderColor: INK }}
        >
          Staff
        </Link>
      </nav>
    </>
  );
}

/** Business rules, from the admin Figma design. GET and PUT /admin/settings. */
export function SettingsPage() {
  const query = useAdminQuery((signal) => getSettings(signal), "settings");

  if (!query.data) {
    return (
      <div className={PAGE}>
        <Heading />
        <LoadState
          loading={query.loading}
          label="Loading settings"
          error={query.error ? `Couldn't load the settings. ${fleetErrorMessage(query.error)}` : ""}
          onRetry={query.reload}
        />
      </div>
    );
  }
  return <SettingsForm saved={query.data} onSaved={query.setData} />;
}

function SettingsForm({
  saved,
  onSaved,
}: {
  saved: Settings;
  onSaved: (settings: Settings) => void;
}) {
  const [form, setForm] = useState<SettingsFormValues>(() => settingsFormFromSettings(saved));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);

  function change(id: string, update: Partial<SettingsFormValues>) {
    setForm((f) => ({ ...f, ...update }));
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setNotice("");
  }

  const text = (key: keyof SettingsFormValues, id: string) => ({
    id,
    value: form[key] as string,
    onChange: (e: { currentTarget: { value: string } }) =>
      change(id, { [key]: e.currentTarget.value }),
    className: input,
    ...errorProps(id, errors[id]),
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = settingsFormErrors(form);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }
    const changes = settingsChanges(form, saved);
    if (Object.keys(changes).length === 0) {
      setNotice("No changes to save.");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setProblem("");
    setNotice("");
    try {
      onSaved(await updateSettings(changes));
      setNotice("Settings saved.");
    } catch (err) {
      setProblem(`Couldn't save the settings. ${fleetErrorMessage(err)}`);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className={PAGE}>
      <Heading />

      <div className="mt-[28px] grid gap-x-[21px] gap-y-[24px] sm:grid-cols-2">
        {/* Currency has no setting in the API. */}
        <div>
          <Label htmlFor="settings-currency" hint="fixed">
            Currency
          </Label>
          <input id="settings-currency" value="INR · ₹" disabled className={input} />
        </div>
        <div>
          <Label htmlFor="settings-timezone" required>
            Operating timezone
          </Label>
          <input {...text("timezone", "settings-timezone")} autoComplete="off" />
          <FieldError id="settings-timezone" message={errors["settings-timezone"]} />
        </div>
        <div>
          <Label htmlFor="settings-tax-label" required>
            Tax name
          </Label>
          <input {...text("taxLabel", "settings-tax-label")} maxLength={50} autoComplete="off" />
          <FieldError id="settings-tax-label" message={errors["settings-tax-label"]} />
        </div>
        <div>
          <Label htmlFor="settings-gst" hint="guests can't get a price until this is set">
            Tax rate (%)
          </Label>
          <input {...text("gstRate", "settings-gst")} inputMode="decimal" autoComplete="off" />
          <FieldError id="settings-gst" message={errors["settings-gst"]} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="settings-cancellation" hint="shown to customers">
            Cancellation policy
          </Label>
          <textarea
            {...text("cancellation", "settings-cancellation")}
            rows={3}
            maxLength={2000}
            className={cx(input, "h-auto py-[14px] leading-[22px]")}
          />
          <FieldError id="settings-cancellation" message={errors["settings-cancellation"]} />
        </div>
        <div>
          <Label htmlFor="settings-email">Contact email</Label>
          <input
            {...text("contactEmail", "settings-email")}
            type="email"
            maxLength={255}
            autoComplete="off"
          />
          <FieldError id="settings-email" message={errors["settings-email"]} />
        </div>
        <div>
          <Label htmlFor="settings-phone">Contact phone</Label>
          <input
            {...text("contactPhone", "settings-phone")}
            type="tel"
            maxLength={30}
            autoComplete="off"
          />
          <FieldError id="settings-phone" message={errors["settings-phone"]} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="settings-address">Contact address</Label>
          <input
            {...text("contactAddress", "settings-address")}
            maxLength={500}
            autoComplete="off"
          />
          <FieldError id="settings-address" message={errors["settings-address"]} />
        </div>
      </div>

      <section
        aria-labelledby="templates-title"
        className="mt-[28px] border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]"
      >
        <h2 id="templates-title" className="text-[18px] leading-[24px]">
          Notification templates
        </h2>
        <p className="mt-[10px] text-[12px] leading-[18px]" style={{ color: BODY }}>
          Booking confirmation · Payment status · Enquiry update · Cancellation outcome · Refund
          status
        </p>
      </section>

      <Link
        href={adminRoutes.staff}
        className={`${outlineButton} mt-[20px] w-fit`}
        style={OUTLINE_STYLE}
      >
        Manage staff and permissions
      </Link>

      {problem && (
        <Notice tone="error" className="mt-[20px]">
          {problem}
        </Notice>
      )}
      {notice && <Notice className="mt-[20px]">{notice}</Notice>}

      <div className="mt-[20px] flex flex-col items-start gap-[14px] sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className={`${primaryButton} w-[148px]`}
          style={PRIMARY_STYLE}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        <Link
          href={adminRoutes.audit}
          className={`${outlineButton} w-[172px]`}
          style={OUTLINE_STYLE}
        >
          View audit history
        </Link>
      </div>

      <aside
        className="mt-[22px] px-[17px] pt-[18px] pb-[20px] lg:mt-[28px]"
        style={{ backgroundColor: SAND }}
      >
        <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
          Changes apply with context
        </p>
        <p className="mt-[10px] text-[12px] leading-[18px]">
          Pricing, policy and tax changes need effective dates. Confirm how existing bookings are
          affected before saving.
        </p>
      </aside>
    </form>
  );
}
