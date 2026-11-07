"use client";

import { Plus, X } from "lucide-react";

import { BODY } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  SelectBox,
  Toggle,
  errorProps,
  input,
} from "@/components/admin/form-parts";
import { TimeInput } from "@/components/admin/time-input";

import {
  FIRST_START,
  LAST_RETURN,
  PACKAGES,
  customHourOptions,
  followsRate,
  packageHoursId,
  packagePriceId,
  packageSwitch,
  priceForHours,
  type BookingSetupDraft,
  type PackageDraft,
} from "../utils/booking-setup";

let customKey = 0;

/** Operating hours, minimum duration and packages, on the add and edit yacht forms. */
export function BookingSetupFields({
  draft,
  hourlyRate,
  errors,
  onChange,
  onClearError,
}: {
  draft: BookingSetupDraft;
  /** Paise per hour; package prices start from this. */
  hourlyRate: number | null;
  errors: Record<string, string>;
  onChange: (draft: BookingSetupDraft) => void;
  onClearError: (id: string) => void;
}) {
  const setPackage = (key: string, update: Partial<PackageDraft>) =>
    onChange({
      ...draft,
      packages: draft.packages.map((p) => (p.key === key ? { ...p, ...update } : p)),
    });
  const removePackage = (key: string) =>
    onChange({ ...draft, packages: draft.packages.filter((p) => p.key !== key) });
  const addCustom = () => {
    const hours = customHourOptions(draft)[0];
    if (hours === undefined) return;
    const key = `custom-${customKey++}`;
    onChange({
      ...draft,
      packages: [
        ...draft.packages,
        { key, hours, custom: true, enabled: true, price: priceForHours(hourlyRate, hours) },
      ],
    });
  };

  const timeField = (id: string, key: "firstStart" | "lastReturn", label: string, hint: string) => (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <TimeInput
        id={id}
        label={label}
        min={FIRST_START}
        max={LAST_RETURN}
        value={draft[key]}
        onChange={(value) => {
          onChange({ ...draft, [key]: value });
          onClearError(id);
        }}
        error={errors[id]}
      />
      <FieldError id={id} message={errors[id]} />
    </div>
  );

  const priceField = (pkg: PackageDraft) => {
    const id = packagePriceId(pkg.key);
    return (
      <div>
        <Label htmlFor={id} hint="excl. GST">
          Base price (₹)
        </Label>
        <input
          id={id}
          inputMode="decimal"
          className={input}
          placeholder="40000"
          value={pkg.price}
          onChange={(e) => {
            setPackage(pkg.key, { price: e.currentTarget.value.replace(/[^\d.,]/g, "") });
            onClearError(id);
          }}
          {...errorProps(id, errors[id])}
        />
        <FieldError id={id} message={errors[id]} />
      </div>
    );
  };

  const row = "grid gap-x-[20px] gap-y-[10px] sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start";
  const customs = draft.packages.filter((p) => p.custom);

  return (
    <div className="mt-[28px] border-t border-[#eceae6] pt-[24px]">
      <h3 className="text-[15px] leading-[22px]">Operating hours &amp; packages</h3>
      <p className="mt-[4px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        Guests can start on the hour, and every charter must be back by the last return, the same
        day.
      </p>

      <div className="mt-[18px] grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-3">
        {timeField("booking-first-start", "firstStart", "First start time", "from 5:00 AM")}
        {timeField("booking-last-return", "lastReturn", "Last return", "by 7:00 PM")}
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="booking-minimum">Minimum duration</Label>
          <input id="booking-minimum" className={input} value="1 hour" disabled readOnly />
        </div>
      </div>

      {draft.lastReturn > LAST_RETURN && (
        <p className="mt-[10px] text-[12px] leading-[18px] text-[#9b2c2c]">
          This yacht&rsquo;s last return is after 7:00 PM. Change it to 7:00 PM or earlier.
        </p>
      )}

      <ul className="mt-[22px] flex flex-col gap-[14px]">
        {PACKAGES.map(({ hours, title, tag }) => {
          const pkg = draft.packages.find((p) => p.key === String(hours))!;
          return (
            <li key={hours} className={row}>
              <Toggle
                id={`package-${pkg.key}`}
                label={title}
                text={tag}
                checked={pkg.enabled}
                onChange={(enabled) => {
                  setPackage(pkg.key, packageSwitch(pkg, enabled, hourlyRate));
                  onClearError(packagePriceId(pkg.key));
                }}
              />
              {priceField(pkg)}
            </li>
          );
        })}
        {customs.map((pkg, i) => {
          const hoursId = packageHoursId(pkg.key);
          const remove = (
            <button
              type="button"
              onClick={() => {
                // A saved package is deleted with its prices when the form is saved.
                if (
                  pkg.id &&
                  !window.confirm(`Delete "${pkg.name}"? Its prices are deleted when you save.`)
                )
                  return;
                removePackage(pkg.key);
                onClearError(hoursId);
                onClearError(packagePriceId(pkg.key));
              }}
              aria-label={`Remove custom package ${i + 1}`}
              className="flex size-[28px] shrink-0 items-center justify-center hover:bg-[#f2f1ee]"
            >
              <X aria-hidden="true" strokeWidth={1.75} className="size-[14px]" />
            </button>
          );

          // Saved: switched on or off like the fixed packages.
          if (pkg.id) {
            return (
              <li key={pkg.key} className={row}>
                <div className="flex items-start gap-[8px]">
                  <div className="min-w-0 flex-1">
                    <Toggle
                      id={`package-${pkg.key}`}
                      label={pkg.name ?? `${pkg.hours} hours`}
                      text="Custom"
                      checked={pkg.enabled}
                      onChange={(enabled) => setPackage(pkg.key, { enabled })}
                    />
                  </div>
                  {remove}
                </div>
                {priceField(pkg)}
              </li>
            );
          }

          return (
            <li key={pkg.key} className={row}>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={hoursId}>Custom package</Label>
                  <span className="-mt-[8px]">{remove}</span>
                </div>
                <SelectBox
                  id={hoursId}
                  value={String(pkg.hours)}
                  onChange={(value) => {
                    const hours = Number(value);
                    setPackage(pkg.key, {
                      hours,
                      ...(followsRate(pkg, hourlyRate)
                        ? { price: priceForHours(hourlyRate, hours) }
                        : {}),
                    });
                    onClearError(hoursId);
                  }}
                  options={customHourOptions(draft, pkg).map((h) => ({
                    value: String(h),
                    label: `${h} hours`,
                  }))}
                  invalid={errors[hoursId]}
                />
                <FieldError id={hoursId} message={errors[hoursId]} />
              </div>
              {priceField(pkg)}
            </li>
          );
        })}
      </ul>

      {customHourOptions(draft).length > 0 && (
        <button
          type="button"
          onClick={addCustom}
          className="mt-[16px] inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2 hover:opacity-70"
        >
          <Plus aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
          Add custom package
        </button>
      )}

      <p className="mt-[14px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        Prices are worked out from the hourly rate × hours, and you can change any of them. Switched
        on with a price, guests can see and book a package. Switched off, it is hidden and keeps its
        price. Weekend, season and holiday prices are set on Slots &amp; pricing.
      </p>
    </div>
  );
}
