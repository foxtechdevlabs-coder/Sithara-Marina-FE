"use client";

import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cx } from "@/lib/cx";

import { BODY, GRADIENT, INK, MUTED, SAND } from "./admin-theme";

/* Building blocks of the admin forms (add/edit yacht, crew, pricing), from the admin Figma design. */

export const input =
  "h-[52px] w-full border border-[#dcdad5] bg-white px-[16px] text-[14px] text-[#0d1b2a] outline-none transition-colors placeholder:text-[#a3a6aa] focus:border-[#0d1b2a] aria-[invalid=true]:border-[#b3261e] disabled:bg-[#f5f3ee] disabled:text-[#8a8d91]";
export const chip =
  "h-[44px] border px-[16px] text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a]";
export const primaryButton =
  "flex h-[52px] items-center justify-center gap-[8px] px-[24px] text-[12px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
export const outlineButton =
  "flex h-[52px] items-center justify-center gap-[6px] border bg-white px-[20px] text-[12px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-60";
export const PRIMARY_STYLE = { background: GRADIENT };
export const OUTLINE_STYLE = { borderColor: INK };

export function Label({
  htmlFor,
  children,
  required,
  hint,
  as: Tag = "label",
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  as?: "label" | "p";
}) {
  return (
    <Tag
      {...(Tag === "label" ? { htmlFor } : {})}
      className="mb-[8px] block text-[11px] leading-[16px]"
      style={{ color: BODY }}
    >
      {children}
      {required && <span aria-hidden="true"> *</span>}
      {hint && <span className="text-[#8a8d91]"> — {hint}</span>}
    </Tag>
  );
}

/** Message under a field; pair it with `aria-describedby={`${id}-error`}`. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-[6px] text-[11px] leading-[16px] text-[#9b2c2c]">
      {message}
    </p>
  );
}

/** Props that connect an input to its `FieldError`. */
export const errorProps = (id: string, message?: string) =>
  message ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

export function Section({
  id,
  number,
  title,
  children,
  aside,
}: {
  id: string;
  number?: string;
  title: string;
  children: ReactNode;
  /** Shown to the right of the title (e.g. an action). */
  aside?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-[24px] border border-[#dcdad5] bg-white px-[20px] pt-[28px] pb-[32px] sm:px-[28px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
        <h2
          id={`${id}-title`}
          className="flex items-baseline gap-[10px] text-[22px] leading-[28px]"
        >
          {number && (
            <span className="text-[11px]" style={{ color: MUTED }}>
              {number}
            </span>
          )}
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-[24px]">{children}</div>
    </section>
  );
}

export function ChipGroup({
  label,
  required,
  hint,
  options,
  selected,
  onToggle,
  multiple,
  after,
  id,
  onRemove,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Adds an × to each chip that takes it out of the list. */
  onRemove?: (value: string) => void;
  multiple?: boolean;
  after?: ReactNode;
  id?: string;
}) {
  return (
    <fieldset id={id}>
      <legend className="contents">
        <Label as="p" required={required} hint={hint}>
          {label}
        </Label>
      </legend>
      <div className="flex flex-wrap gap-[10px]" role={multiple ? "group" : "radiogroup"}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <span key={o.value} className="relative inline-flex max-w-full">
              <button
                type="button"
                role={multiple ? undefined : "radio"}
                aria-pressed={multiple ? on : undefined}
                aria-checked={multiple ? undefined : on}
                onClick={() => onToggle(o.value)}
                className={cx(
                  chip,
                  onRemove && "pr-[34px]",
                  on
                    ? "border-[#0d1b2a] bg-[#0d1b2a] text-white"
                    : "border-[#dcdad5] bg-white hover:border-[#0d1b2a]",
                )}
              >
                {o.label}
              </button>
              {onRemove && (
                <button
                  type="button"
                  aria-label={`Remove ${o.label}`}
                  onClick={() => onRemove(o.value)}
                  className={cx(
                    "absolute top-1/2 right-[6px] flex size-[24px] -translate-y-1/2 items-center justify-center transition-colors focus-visible:outline-2",
                    on
                      ? "text-white hover:bg-white/20 focus-visible:outline-white"
                      : "text-[#0d1b2a] hover:bg-[#f2f1ee] focus-visible:outline-[#0d1b2a]",
                  )}
                >
                  <X aria-hidden="true" strokeWidth={1.75} className="size-[12px]" />
                </button>
              )}
            </span>
          );
        })}
        {after}
      </div>
    </fieldset>
  );
}

export function Toggle({
  id,
  label,
  text,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[#eceae6] py-[16px] first:pt-0">
      <div>
        <label htmlFor={id} className="block text-[14px] leading-[20px]">
          {label}
        </label>
        <p
          id={`${id}-text`}
          className="mt-[2px] text-[11px] leading-[16px]"
          style={{ color: BODY }}
        >
          {text}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-text`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[#0d1b2a]" : "bg-[#d5d3cf]",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-[3px] size-[20px] rounded-full bg-white transition-[left] motion-reduce:transition-none",
            checked ? "left-[23px]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  );
}

export function SelectBox({
  id,
  value,
  onChange,
  options,
  disabled,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  disabled?: boolean;
  /** Message id of a `FieldError` for this select. */
  invalid?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.currentTarget.value)}
        className={cx(input, "cursor-pointer appearance-none pr-10")}
        {...errorProps(id, invalid)}
      >
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-[14px] size-4 -translate-y-1/2"
      />
    </div>
  );
}

/** Success or error message after an action. */
export function Notice({
  tone = "success",
  children,
  className,
}: {
  tone?: "success" | "error";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "border px-[14px] py-[10px] text-[12px] leading-[18px]",
        tone === "error"
          ? "border-[#e8c4c0] bg-[#fbf1ef] text-[#9b2c2c]"
          : "border-[#dcdad5] text-[#0d1b2a]",
        className,
      )}
      style={tone === "success" ? { backgroundColor: SAND } : undefined}
    >
      {children}
    </p>
  );
}

/** Loading and failure states of an admin page or panel. */
export function LoadState({
  loading,
  error,
  onRetry,
  label,
}: {
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  label: string;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center" style={{ color: MUTED }}>
        <Spinner label={label} />
      </div>
    );
  }
  if (!error) return null;
  return (
    <div role="alert" className="flex min-h-[200px] flex-col items-start justify-center gap-[14px]">
      <p className="text-[14px] leading-[22px]">{error}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={outlineButton} style={OUTLINE_STYLE}>
          Try again
        </button>
      )}
    </div>
  );
}
