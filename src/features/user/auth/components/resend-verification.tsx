"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";

import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import {
  resendVerification,
  VERIFICATION_EMAIL_COOLDOWN_SECONDS,
} from "@/services/user/auth.service";
import { emailSchema } from "@/validation/email";

import { useCooldown } from "../hooks/use-cooldown";
import { emailRateLimitMessage } from "../utils/auth-error-message";
import { formatCountdown } from "../utils/format-wait";
import {
  readPendingVerification,
  savePendingVerification,
  subscribePendingVerification,
} from "../utils/pending-verification";
import { fieldErrorClass, formAlertClass, inputClass, labelClass } from "./auth-form-styles";

/** Wait before retrying after a 503 (no Retry-After is documented for it). */
const SERVICE_UNAVAILABLE_RETRY_SECONDS = 30;

type Feedback = { tone: "info" | "error"; text: string } | null;

/**
 * "Resend verification email" → POST /auth/resend-verification.
 * Uses the address from registration; when there is none (link opened in
 * another browser) it asks for it. The success message is deliberately
 * neutral: the API answers the same whether or not the email has an account.
 *
 * With `inlineAction` it renders as the text link beside that action, and only
 * asks for an address once the link is used.
 */
export function ResendVerification({ inlineAction }: { inlineAction?: ReactNode }) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const isBusyRef = useRef(false);
  const pending = useSyncExternalStore(
    subscribePendingVerification,
    readPendingVerification,
    () => null,
  );
  const [askForEmail, setAskForEmail] = useState(!inlineAction);
  const [typedEmail, setTypedEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Used only when there is no pending registration to persist the cooldown in.
  const [localAvailableAt, setLocalAvailableAt] = useState(0);

  const availableAt = pending?.resendAvailableAt ?? localAvailableAt;
  const secondsLeft = useCooldown(availableAt);

  const lockFor = (seconds: number, email: string) => {
    const at = Date.now() + seconds * 1000;
    if (pending && pending.email === email) {
      savePendingVerification({ email, resendAvailableAt: at });
    } else {
      setLocalAvailableAt(at);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusyRef.current || secondsLeft > 0) return;

    let email = pending?.email;
    if (!email) {
      if (!askForEmail) {
        setAskForEmail(true);
        return;
      }
      const parsed = emailSchema.safeParse(typedEmail);
      if (!parsed.success) {
        setEmailError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
        document.getElementById(inputId)?.focus();
        return;
      }
      email = parsed.data;
    }
    setEmailError(null);

    isBusyRef.current = true;
    setIsSending(true);
    setFeedback(null);
    try {
      await resendVerification({ email });
      lockFor(VERIFICATION_EMAIL_COOLDOWN_SECONDS, email);
      setFeedback({
        tone: "info",
        text: "If this email needs verifying, a new link is on its way. Check your inbox and spam folder.",
      });
    } catch (error) {
      const httpStatus = isApiError(error) ? error.status : undefined;
      const retryAfter = isApiError(error) ? error.retryAfterSeconds : undefined;
      const rateLimit = emailRateLimitMessage(error, "signup");

      if (rateLimit) {
        // No readable Retry-After means no countdown: the wait is never guessed.
        if (retryAfter !== undefined) lockFor(retryAfter, email);
        setFeedback({ tone: "error", text: rateLimit });
      } else if (httpStatus === 503) {
        lockFor(retryAfter ?? SERVICE_UNAVAILABLE_RETRY_SECONDS, email);
        setFeedback({
          tone: "error",
          text: "Our email service is temporarily unavailable, so no email was sent. Please try again shortly.",
        });
      } else if (httpStatus === 400) {
        setEmailError("Enter a valid email address.");
      } else {
        setFeedback({
          tone: "error",
          text: "We couldn’t send a new email right now. Please check your connection and try again.",
        });
      }
    } finally {
      isBusyRef.current = false;
      setIsSending(false);
    }
  };

  const disabled = isSending || secondsLeft > 0;

  const submitButton = (
    <button
      type="submit"
      disabled={disabled}
      className={
        inlineAction
          ? "cursor-pointer text-[0.8125rem] leading-none text-[#0d1b2a] enabled:hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:text-[#0d1b2a]/60"
          : "flex h-[3.4375rem] w-full max-w-[20rem] items-center justify-center bg-[#d9d9d9] px-4 text-[0.8125rem] text-[#0d1b2a] transition-colors enabled:hover:bg-[#cdcfd1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:text-[#0d1b2a]/60 lg:h-[max(calc(var(--r)*55),2.75rem)] lg:w-[calc(var(--rw)*319)] lg:max-w-none lg:min-w-72"
      }
    >
      {isSending
        ? "Sending a new email…"
        : secondsLeft > 0
          ? `Resend email · ${formatCountdown(secondsLeft)}`
          : inlineAction
            ? "Didn’t receive it? Resend the email"
            : "Resend verification email"}
    </button>
  );

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={isSending}
      className="mt-10 lg:mt-[calc(var(--r)*41)]"
    >
      {pending || !askForEmail ? null : (
        <div className="mb-6 max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
          <label htmlFor={inputId} className={labelClass}>
            Email address
          </label>
          <input
            id={inputId}
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus={Boolean(inlineAction)}
            value={typedEmail}
            onChange={(event) => setTypedEmail(event.target.value)}
            placeholder="ananya@example.com"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? errorId : undefined}
            className={cx(inputClass, "mt-3.5 lg:mt-[calc(var(--r)*14)]")}
          />
          {emailError ? (
            <p id={errorId} className={fieldErrorClass}>
              {emailError}
            </p>
          ) : null}
        </div>
      )}

      {inlineAction ? (
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {inlineAction}
          {submitButton}
        </div>
      ) : (
        submitButton
      )}

      <div aria-live="polite">
        {feedback ? (
          <p className={cx(formAlertClass, feedback.tone === "info" && "border-[#0d1b2a]")}>
            {feedback.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
