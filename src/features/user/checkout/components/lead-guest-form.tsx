"use client";

import { BODY, fieldErrorClass, inputClass, labelClass, MUTED } from "./checkout-ui";
import { FULL_NAME_MAX_LENGTH, SPECIAL_REQUESTS_MAX_LENGTH } from "../utils/contact-schema";

/** What PATCH /checkout/sessions/{id} lets the lead guest change. Email is fixed. */
export interface GuestValues {
  full_name: string;
  phone: string;
  special_requests: string;
}

export type GuestErrors = Partial<Record<keyof GuestValues, string>>;

interface LeadGuestFormProps {
  values: GuestValues;
  /** The verified address: the session's own, not editable here. */
  email: string;
  errors: GuestErrors;
  onChange: (values: GuestValues) => void;
  disabled?: boolean;
  /** After booking the details are the booking's own and cannot change. */
  readOnly?: boolean;
}

/**
 * Lead guest details. Controlled by the page, so what is typed survives the
 * section closing and reopening. Validated with the same schema as before
 * (contact-schema) when the customer pays.
 */
export function LeadGuestForm({
  values,
  email,
  errors,
  onChange,
  disabled = false,
  readOnly = false,
}: LeadGuestFormProps) {
  const set = (key: keyof GuestValues) => (value: string) => onChange({ ...values, [key]: value });
  const field = (
    key: "full_name" | "phone",
    label: string,
    props: { type?: string; autoComplete: string; placeholder?: string; maxLength?: number },
  ) => (
    <div className="min-w-0">
      <label htmlFor={`guest-${key}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`guest-${key}`}
        name={key}
        value={values[key]}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `guest-${key}-error` : undefined}
        onChange={(event) => set(key)(event.currentTarget.value)}
        className={`${inputClass} mt-[12px] read-only:bg-[#f6f8fb]`}
        {...props}
      />
      {errors[key] && (
        <p id={`guest-${key}-error`} className={fieldErrorClass}>
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <div className="grid gap-[24px]">
      <div className="grid gap-[24px] md:grid-cols-2">
        {field("full_name", "Full name", {
          autoComplete: "name",
          maxLength: FULL_NAME_MAX_LENGTH,
          placeholder: "As on your ID",
        })}
        <div className="min-w-0">
          <label htmlFor="guest-email" className={labelClass}>
            Email address
          </label>
          <input
            id="guest-email"
            type="email"
            value={email}
            readOnly
            aria-describedby="guest-email-hint"
            className={`${inputClass} mt-[12px] bg-[#f6f8fb]`}
          />
          <p id="guest-email-hint" className="mt-[8px] text-[13px] leading-[18px]" style={{ color: MUTED }}>
            {readOnly
              ? "Your confirmation is sent here."
              : "Verified for this checkout. Your confirmation is sent here."}
          </p>
        </div>
        {field("phone", "Mobile number, with country code", {
          type: "tel",
          autoComplete: "tel",
          placeholder: "+919876543210",
        })}
      </div>

      <div>
        <label htmlFor="guest-special_requests" className={labelClass}>
          Requests for the crew <span style={{ color: MUTED }}>(optional)</span>
        </label>
        <p className="mt-[4px] text-[13px] leading-[18px]" style={{ color: BODY }}>
          Dietary needs, celebrations or accessibility.
        </p>
        <textarea
          id="guest-special_requests"
          name="special_requests"
          rows={4}
          value={values.special_requests}
          readOnly={readOnly}
          disabled={disabled}
          maxLength={SPECIAL_REQUESTS_MAX_LENGTH}
          aria-invalid={Boolean(errors.special_requests)}
          onChange={(event) => set("special_requests")(event.currentTarget.value)}
          className={`${inputClass} mt-[12px] h-auto py-[14px] read-only:bg-[#f6f8fb]`}
        />
        {errors.special_requests && <p className={fieldErrorClass}>{errors.special_requests}</p>}
      </div>
    </div>
  );
}
