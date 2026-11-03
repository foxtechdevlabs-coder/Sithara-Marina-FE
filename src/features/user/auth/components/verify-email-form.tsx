"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import {
  fieldErrorClass,
  formAlertClass,
  labelClass,
  PRIMARY_GRADIENT,
  primaryButtonClass,
} from "./auth-form-styles";
import { InfoPanel } from "./info-panel";

const CODE_LENGTH = 6;
/** Seconds before "Resend code" unlocks; replace with the backend's value once defined. */
const RESEND_COOLDOWN_SECONDS = 30;

type Status =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "resending" }
  | { kind: "message"; message: string };

const formatSeconds = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Six-digit email verification code form. The code is one numeric input (so
 * typing, pasting, backspace and SMS/email autofill all work natively) drawn
 * as six separated slots. Not wired to a backend yet: the verify / resend
 * contract is undefined (docs/api-integration.md). Once
 * `src/services/user/auth.service.ts` exists, call it at the TODOs below.
 */
export function VerifyEmailForm() {
  const formId = useId();
  const inputId = `${formId}-code`;
  const errorId = `${inputId}-error`;
  const isBusyRef = useRef(false);
  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Digits only, capped at six. No maxLength on the input: it would truncate a pasted
    // "Code: 123 456" before the non-digits are stripped.
    setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
    if (error) setError(null);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusyRef.current) return; // ignore double submits
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);
      setStatus({ kind: "idle" });
      document.getElementById(inputId)?.focus();
      return;
    }

    isBusyRef.current = true;
    setStatus({ kind: "verifying" });
    // TODO(auth): verify { email, code }; handle invalid / expired / used codes, then
    // clearPendingVerificationEmail() and continue into the signed-in flow.
    isBusyRef.current = false;
    setStatus({
      kind: "message",
      message:
        "Email verification isn’t available online yet, so your email hasn’t been verified. Please speak to our concierge for help with your account.",
    });
  };

  const onResend = () => {
    if (isBusyRef.current || secondsLeft > 0) return;
    isBusyRef.current = true;
    setStatus({ kind: "resending" });
    // TODO(auth): request a new code; on success restart the countdown with
    // setSecondsLeft(RESEND_COOLDOWN_SECONDS) and confirm it was sent.
    isBusyRef.current = false;
    setStatus({
      kind: "message",
      message: "Sending a new code isn’t available online yet, so no new code has been sent.",
    });
  };

  const isVerifying = status.kind === "verifying";
  const isResending = status.kind === "resending";
  const canResend = secondsLeft <= 0 && !isVerifying && !isResending;
  const activeSlot = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={isVerifying || isResending}
      className="mt-10 lg:mt-[calc(var(--r)*37)]"
    >
      <label htmlFor={inputId} className={labelClass}>
        Verification code
      </label>
      <div
        className={cx(
          "relative mt-3.5 h-[3.625rem] w-full max-w-[35rem] border bg-white lg:mt-[calc(var(--r)*14)] lg:h-[calc(var(--r)*58)] lg:min-h-12 lg:w-[calc(var(--rw)*560)] lg:max-w-none",
          error ? "border-[#b42318]" : isFocused ? "border-[#0d1b2a]" : "border-[#d6d9dc]",
        )}
      >
        {/* Six visual slots; the real input sits on top with transparent text. */}
        <div aria-hidden="true" className="flex h-full items-center gap-2.5 px-4 sm:gap-3">
          {Array.from({ length: CODE_LENGTH }, (_, index) => {
            const digit = code[index];
            const isActive = isFocused && index === activeSlot && code.length < CODE_LENGTH;
            return (
              <span
                key={index}
                className="flex w-[1.125rem] flex-col items-center text-[1.125rem] leading-none text-[#0d1b2a] tabular-nums"
              >
                <span className="h-5">{digit ?? ""}</span>
                <span
                  className={cx(
                    "mt-0.5 h-px w-full",
                    isActive ? "bg-[#0d1b2a]" : digit ? "bg-transparent" : "bg-[#0d1b2a]/70",
                  )}
                />
              </span>
            );
          })}
        </div>
        <input
          id={inputId}
          name="code"
          value={code}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="absolute inset-0 h-full w-full bg-transparent px-4 text-transparent caret-transparent outline-none selection:bg-transparent"
        />
      </div>
      {error ? (
        <p id={errorId} className={fieldErrorClass}>
          {error}
        </p>
      ) : null}

      {status.kind === "message" ? (
        <p role="alert" className={formAlertClass}>
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isVerifying || isResending}
        className={cx(
          primaryButtonClass,
          "mt-10 w-48 px-0 lg:mt-[calc(var(--r)*67)] lg:w-[calc(var(--rw)*182)] lg:min-w-44",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        {isVerifying ? "Verifying…" : "Verify & continue"}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={!canResend}
        aria-live="polite"
        className="mt-10 flex h-[3.4375rem] w-full max-w-[20rem] items-center justify-center bg-[#d9d9d9] px-4 text-[0.8125rem] text-[#0d1b2a] transition-colors enabled:hover:bg-[#cdcfd1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:text-[#0d1b2a]/60 lg:mt-[calc(var(--r)*41)] lg:h-[max(calc(var(--r)*55),2.75rem)] lg:w-[calc(var(--rw)*319)] lg:max-w-none lg:min-w-72"
      >
        {isResending
          ? "Sending a new code…"
          : secondsLeft > 0
            ? `Resend code · ${formatSeconds(secondsLeft)}`
            : "Resend code"}
      </button>

      <Link
        href={userRoutes.register}
        className="mt-14 ml-10 inline-block text-[0.8125rem] leading-none text-[#0d1b2a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] lg:mt-[calc(var(--r)*64)]"
      >
        Use a different email
      </Link>

      <InfoPanel title="If your code expires" className="mt-14 lg:mt-[calc(var(--r)*52)]">
        Request a new code. Your account and booking context are kept while you verify your email.
      </InfoPanel>
    </form>
  );
}
