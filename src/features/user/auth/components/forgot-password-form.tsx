"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { emailSchema } from "@/validation/email";

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
 * Asks for the account email to send a password-reset link. Not wired to a
 * backend yet: the reset-request contract is undefined (docs/api-integration.md).
 * Once `src/services/user/auth.service.ts` exists, call it where marked and
 * then show /reset-password ("Check your inbox") whatever the response, so the
 * page never reveals whether an address has an account.
 */
export function ForgotPasswordForm() {
  const formId = useId();
  const inputId = `${formId}-email`;
  const errorId = `${inputId}-error`;
  const isSendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSendingRef.current) return; // ignore double submits

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
    // TODO(auth): request the reset email, then router.push(userRoutes.resetPassword).
    isSendingRef.current = false;
    setStatus({
      kind: "message",
      message:
        "Password reset emails aren’t available online yet, so no link has been sent. Please speak to our concierge for help with your account.",
    });
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
        disabled={isSending}
        className={cx(
          primaryButtonClass,
          "mt-10 w-60 px-0 lg:mt-[calc(var(--r)*67)] lg:w-[calc(var(--rw)*230)] lg:min-w-56",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        {isSending ? "Sending link…" : "Send password reset link"}
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
