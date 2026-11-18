import type { FormEvent } from "react";

/*
 * What number and phone fields keep as they're typed or pasted. Anything else,
 * such as letters, is dropped, so the field never shows it. The form still
 * checks the value (a minimum, a range) when it's sent.
 */

/** Whole numbers: digits only. */
export const digitsOnly = (text: string) => text.replace(/\D/g, "");

/** Keeps digits, the separators in `extra`, and one "." with up to two decimals after it. */
function decimal(text: string, extra: string) {
  const kept = text.replace(new RegExp(`[^\\d.${extra}]`, "g"), "");
  const dot = kept.indexOf(".");
  if (dot < 0) return kept;
  return (
    kept.slice(0, dot + 1) +
    kept
      .slice(dot + 1)
      .replace(/\D/g, "")
      .slice(0, 2)
  );
}

/** Rupee amounts: digits, "," and one "." with up to two decimals ("20,000.50"). */
export const amountCharacters = (text: string) => decimal(text, ",");

/** Percentages: digits and one "." with up to two decimals ("12.5"). */
export const percentCharacters = (text: string) => decimal(text, "");

/** Years: digits, spaces and "/" ("2019 / 2024"). */
export const yearsCharacters = (text: string) => text.replace(/[^\d\s/]/g, "");

/**
 * Phone numbers: digits, spaces, "-", "(" and ")", and one "+" at the start.
 */
export function phoneCharacters(text: string): string {
  const kept = text.replace(/[^\d\s()+-]/g, "");
  const plus = kept.trimStart().startsWith("+");
  return (plus ? "+" : "") + kept.replace(/\+/g, "").trimStart();
}

/**
 * For an uncontrolled input (`defaultValue`): applies `filter` as the user
 * types. Use as `onInput={keepOnly(phoneCharacters)}`.
 */
export const keepOnly =
  (filter: (text: string) => string) => (event: FormEvent<HTMLInputElement>) => {
    const el = event.currentTarget;
    const next = filter(el.value);
    if (next !== el.value) el.value = next;
  };
