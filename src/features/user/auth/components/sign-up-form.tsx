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

type FieldName = "fullName" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "error"; message: string };

const FIELDS: readonly {
  name: FieldName;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  placeholder: string;
}[] = [
  {
    name: "fullName",
    label: "Full name",
    type: "text",
    autoComplete: "name",
    placeholder: "Ananya Menon",
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
    placeholder: "ananya@example.com",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
    placeholder: "Choose a secure password",
  },
  {
    name: "confirmPassword",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
    placeholder: "Re-enter your password",
  },
];

function validate(data: FormData): FieldErrors {
  const text = (name: FieldName) => String(data.get(name) ?? "");
  const errors: FieldErrors = {};

  if (!text("fullName").trim()) errors.fullName = "Enter your full name.";
  const email = emailSchema.safeParse(text("email"));
  if (!email.success)
    errors.email = email.error.issues[0]?.message ?? "Enter a valid email address.";
  // Password strength rules belong to the backend contract (not defined yet);
  // only presence and confirmation are checked here.
  if (!text("password")) errors.password = "Choose a password.";
  if (!text("confirmPassword")) errors.confirmPassword = "Re-enter your password.";
  else if (text("confirmPassword") !== text("password"))
    errors.confirmPassword = "Passwords don’t match.";

  return errors;
}

/**
 * Customer registration form. Validates on submit and keeps entered values.
 * Not wired to a backend yet: the registration / email-verification contract
 * is undefined (docs/api-integration.md). Once `src/services/user/auth.service.ts`
 * exists, call it where marked below and surface its errors in `status`.
 */
export function SignUpForm() {
  const formId = useId();
  const isSubmittingRef = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current) return; // ignore double submits

    const nextErrors = validate(new FormData(event.currentTarget));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ kind: "idle" });
      const firstInvalid = FIELDS.find((field) => nextErrors[field.name]);
      if (firstInvalid) document.getElementById(`${formId}-${firstInvalid.name}`)?.focus();
      return;
    }

    isSubmittingRef.current = true;
    setStatus({ kind: "submitting" });
    // TODO(auth): call the registration service here once the backend contract exists.
    // On success, if email verification is required: savePendingVerificationEmail(email)
    // (../utils/pending-verification) and router.push(userRoutes.verifyEmail).
    isSubmittingRef.current = false;
    setStatus({
      kind: "error",
      message:
        "Online accounts aren’t available yet, so no account has been created. You can continue booking as a guest, or speak to our concierge.",
    });
  };

  const isSubmitting = status.kind === "submitting";

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={isSubmitting}
      className="mt-10 lg:mt-[calc(var(--r)*37)]"
    >
      <div className="grid gap-x-6 gap-y-7 md:grid-cols-2 lg:w-[calc(var(--rw)*1143)] lg:grid-cols-[repeat(2,calc(var(--rw)*560))] lg:gap-x-[calc(var(--rw)*23)] lg:gap-y-[calc(var(--r)*65)]">
        {FIELDS.map((field) => {
          const id = `${formId}-${field.name}`;
          const errorId = `${id}-error`;
          const error = errors[field.name];
          return (
            <div key={field.name}>
              <label htmlFor={id} className={labelClass}>
                {field.label}
              </label>
              <input
                id={id}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                inputMode={field.type === "email" ? "email" : undefined}
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

      {/* Plain text: the privacy and terms pages are not published yet. */}
      <InfoPanel title="Your privacy" className="mt-10 lg:mt-[calc(var(--r)*65)]">
        Use the privacy and terms links to review how your account information is handled. Marketing
        consent is optional and separate.
      </InfoPanel>

      {status.kind === "error" ? (
        <p role="alert" className={formAlertClass}>
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={cx(
          primaryButtonClass,
          "mt-10 w-full max-w-[16.5rem] px-0 lg:mt-[calc(var(--r)*44)] lg:w-[calc(var(--rw)*263)] lg:max-w-none lg:min-w-60",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        {isSubmitting ? "Creating account…" : "Create account & verify email"}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      </button>

      <Link
        href={userRoutes.login}
        className={cx(
          secondaryButtonClass,
          "mt-10 w-full max-w-[17rem] lg:mt-[calc(var(--r)*41)] lg:w-[calc(var(--rw)*270)] lg:max-w-none lg:min-w-60",
        )}
      >
        Already have an account? Sign in
      </Link>
    </form>
  );
}
