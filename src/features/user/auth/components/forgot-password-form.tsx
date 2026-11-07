"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { AUTH_EMAIL_COOLDOWN_SECONDS, requestPasswordReset } from "@/services/user/auth.service";
import { emailSchema } from "@/validation/email";

import { useCooldown } from "../hooks/use-cooldown";
import { commonAuthErrorMessage, emailRateLimitMessage } from "../utils/auth-error-message";
import { formatCountdown } from "../utils/format-wait";
import { savePendingPasswordReset } from "../utils/pending-password-reset";
import {
  fieldErrorClass,
  formAlertClass,
  inputClass,
  labelClass,
  PRIMARY_GRADIENT,
  primaryButtonClass,
  secondaryButtonClass,
} from "./auth-form-styles";
import { InfoPanel } from "./info-panel";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "message"; message: string };

/**
 * Asks for the account email → POST /auth/forgot-password. The backend gives
 * the same neutral answer whether or not the address has an account; that
 * message is shown on /reset-password ("Check your inbox"), so the page never
 * reveals whether an account exists.
 */
export function ForgotPasswordForm() {
  const formId = useId();
  const router = useRouter();
  const inputId = `${formId}-email`;
  const errorId = `${inputId}-error`;
  const isSendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [lockedUntil, setLockedUntil] = useState(0);
  const secondsLeft = useCooldown(lockedUntil);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSendingRef.current || secondsLeft > 0) return; // ignore double submits

    const email = emailSchema.safeParse(new FormData(event.currentTarget).get("email") ?? "");
    if (!email.success) {
      setError(email.error.issues[0]?.message ?? "Enter a valid email address.");
      setStatus({ kind: "idle" });
      document.getElementById(inputId)?.focus();
      return;
    }
    setError(null);

    isSendingRef.current = true;
    setStatus({ kind: "sending" });
    try {
      const response = await requestPasswordReset({ email: email.data });
      savePendingPasswordReset({
        email: email.data,
        message: response.message,
        resendAvailableAt: Date.now() + AUTH_EMAIL_COOLDOWN_SECONDS * 1000,
      });
      router.push(userRoutes.resetPassword);
      return; // keep the form locked while navigating
    } catch (caught) {
      if (isApiError(caught) && caught.status === 400) {
        setError("Enter a valid email address.");
        document.getElementById(inputId)?.focus();
        isSendingRef.current = false;
        setStatus({ kind: "idle" });
        return;
      }
      // No readable Retry-After means no countdown: the wait is never guessed.
      const rateLimit = emailRateLimitMessage(caught, "reset");
      const retryAfter = isApiError(caught) ? caught.retryAfterSeconds : undefined;
      if (rateLimit && retryAfter !== undefined) {
        const resendAvailableAt = Date.now() + retryAfter * 1000;
        savePendingPasswordReset({ email: email.data, resendAvailableAt });
        setLockedUntil(resendAvailableAt);
      }
      isSendingRef.current = false;
      setStatus({
        kind: "message",
        message:
          rateLimit ??
          commonAuthErrorMessage(caught) ??
          "We couldn’t send a reset link right now. Please try again.",
      });
    }
  };

  const isSending = status.kind === "sending";

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={isSending}
      className="mt-10 lg:mt-[calc(var(--r)*37)]"
    >
      <div className="max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
        <label htmlFor={inputId} className={labelClass}>
          Email address
        </label>
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          disabled={isSending}
          // The limit is per address, so another address is not held back.
          onChange={() => setLockedUntil(0)}
          placeholder="ananya@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(inputClass, "mt-3.5 lg:mt-[calc(var(--r)*14)]")}
        />
        {error ? (
          <p id={errorId} className={fieldErrorClass}>
            {error}
          </p>
        ) : null}
      </div>

      {status.kind === "message" ? (
        <p role="alert" className={formAlertClass}>
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSending || secondsLeft > 0}
        className={cx(
          primaryButtonClass,
          "mt-10 w-60 px-0 lg:mt-[calc(var(--r)*67)] lg:w-[calc(var(--rw)*230)] lg:min-w-56",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        {isSending
          ? "Sending link…"
          : secondsLeft > 0
            ? `Send link · ${formatCountdown(secondsLeft)}`
            : "Send password reset link"}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      </button>

      <Link
        href={userRoutes.login}
        className={cx(
          secondaryButtonClass,
          "mt-10 w-44 lg:mt-[calc(var(--r)*41)] lg:w-[calc(var(--rw)*176)] lg:min-w-40",
        )}
      >
        Back to sign in
      </Link>

      <InfoPanel title="Your journey will wait" className="mt-10 lg:mt-[calc(var(--r)*40)]">
        If you came from checkout, you will return to your saved charter details after signing in.
        Availability is checked again before payment.
      </InfoPanel>
    </form>
  );
}
