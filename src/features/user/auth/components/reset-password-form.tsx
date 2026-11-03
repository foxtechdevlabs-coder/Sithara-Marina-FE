"use client";

import { ArrowRight } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { cx } from "@/lib/cx";

import {
  fieldErrorClass,
  formAlertClass,
  inputClass,
  labelClass,
  PRIMARY_GRADIENT,
  primaryButtonClass,
  secondaryButtonClass,
} from "./auth-form-styles";

type FieldName = "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "requesting" }
  | { kind: "message"; message: string };

const FIELDS: readonly { name: FieldName; label: string; placeholder: string }[] = [
  { name: "newPassword", label: "New password", placeholder: "Choose a secure password" },
  { name: "confirmPassword", label: "Confirm new password", placeholder: "Re-enter your password" },
];

/** Shown instead of a result until the reset endpoints exist. */
const NOT_AVAILABLE =
  "Online password reset isn’t available yet, so your password hasn’t been changed. Please speak to our concierge for help with your account.";

function validate(data: FormData): FieldErrors {
  const newPassword = String(data.get("newPassword") ?? "");
  const confirmPassword = String(data.get("confirmPassword") ?? "");
  const errors: FieldErrors = {};
  // Strength rules belong to the backend contract (not defined yet).
  if (!newPassword) errors.newPassword = "Choose a new password.";
  if (!confirmPassword) errors.confirmPassword = "Re-enter your new password.";
  else if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords don’t match.";
  return errors;
}

/**
 * New-password form for the emailed reset link. Not wired to a backend yet:
 * the reset contract (request endpoint, link token parameter, confirm
 * endpoint) is undefined, see docs/api-integration.md. Once
 * `src/services/user/auth.service.ts` exists, read the token from the link,
 * call the service at the TODOs below and redirect to /login on success.
 */
export function ResetPasswordForm() {
  const formId = useId();
  const isBusyRef = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusyRef.current) return; // ignore double submits

    const nextErrors = validate(new FormData(event.currentTarget));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ kind: "idle" });
      const firstInvalid = FIELDS.find((field) => nextErrors[field.name]);
      if (firstInvalid) document.getElementById(`${formId}-${firstInvalid.name}`)?.focus();
      return;
    }

    isBusyRef.current = true;
    setStatus({ kind: "saving" });
    // TODO(auth): confirm the reset with the link token, then router.push(userRoutes.login).
    isBusyRef.current = false;
    setStatus({ kind: "message", message: NOT_AVAILABLE });
  };

  const onRequestNewLink = () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setStatus({ kind: "requesting" });
    // TODO(auth): request another reset email. Whatever the response, show the same
    // neutral confirmation so the page never reveals whether an account exists.
    isBusyRef.current = false;
    setStatus({
      kind: "message",
      message:
        "Requesting a new link online isn’t available yet. Please speak to our concierge for help with your account.",
    });
  };

  const isSaving = status.kind === "saving";
  const isRequesting = status.kind === "requesting";

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={isSaving || isRequesting}
      className="mt-11 lg:mt-[calc(var(--r)*44)]"
    >
      <div className="max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
        {FIELDS.map((field, index) => {
          const id = `${formId}-${field.name}`;
          const errorId = `${id}-error`;
          const error = errors[field.name];
          return (
            <div key={field.name} className={cx(index > 0 && "mt-8 lg:mt-[calc(var(--r)*71)]")}>
              <label htmlFor={id} className={labelClass}>
                {field.label}
              </label>
              <input
                id={id}
                name={field.name}
                type="password"
                autoComplete="new-password"
                placeholder={field.placeholder}
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
          );
        })}
      </div>

      {status.kind === "message" ? (
        <p role="alert" className={formAlertClass}>
          {status.message}
        </p>
      ) : null}

      <div className="mt-10 flex flex-col gap-4 min-[420px]:flex-row lg:mt-[calc(var(--r)*58)] lg:gap-[calc(var(--rw)*16)]">
        <button
          type="submit"
          disabled={isSaving || isRequesting}
          className={cx(
            primaryButtonClass,
            "w-full min-[420px]:w-56 lg:w-[calc(var(--rw)*223)] lg:min-w-52",
          )}
          style={{ background: PRIMARY_GRADIENT }}
        >
          {isSaving ? "Saving password…" : "Save password & sign in"}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
        </button>
        <button
          type="button"
          onClick={onRequestNewLink}
          disabled={isSaving || isRequesting}
          className={cx(
            secondaryButtonClass,
            "w-full disabled:cursor-wait disabled:opacity-60 min-[420px]:w-44 lg:w-[calc(var(--rw)*175)] lg:min-w-40",
          )}
        >
          {isRequesting ? "Requesting…" : "Request a new link"}
        </button>
      </div>
    </form>
  );
}
