"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import { registerUser, VERIFICATION_EMAIL_COOLDOWN_SECONDS } from "@/services/user/auth.service";
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
import { useCooldown } from "../hooks/use-cooldown";
import { emailRateLimitMessage } from "../utils/auth-error-message";
import { formatCountdown } from "../utils/format-wait";
import { readPendingVerification, savePendingVerification } from "../utils/pending-verification";
import { InfoPanel } from "./info-panel";

type FieldName = "fullName" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "error"; message: ReactNode };

/** Password length documented by POST /auth/register. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const PASSWORD_RULE = `Use between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;

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
  const password = text("password");
  if (!password) errors.password = "Choose a password.";
  else if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.password = PASSWORD_RULE;
  if (!text("confirmPassword")) errors.confirmPassword = "Re-enter your password.";
  else if (text("confirmPassword") !== password) errors.confirmPassword = "Passwords don’t match.";

  return errors;
}

/**
 * Maps the backend's 400 validation messages ("fullName must not be blank",
 * "property phone should not exist", …) onto the form's fields.
 */
function fieldErrorsFromBackend(messages: string[]): { fields: FieldErrors; unmapped: boolean } {
  const fields: FieldErrors = {};
  let unmapped = false;
  for (const message of messages) {
    const property = message.split(" ")[0];
    if (property === "fullName") fields.fullName ??= "Enter your full name.";
    else if (property === "email") fields.email ??= "Enter a valid email address.";
    else if (property === "password") fields.password ??= PASSWORD_RULE;
    else if (property === "confirmPassword")
      fields.confirmPassword ??= message.includes("match")
        ? "Passwords don’t match."
        : PASSWORD_RULE;
    else unmapped = true;
  }
  return { fields, unmapped };
}

/**
 * Customer registration form → POST /auth/register. On 201 the account is
 * saved but unverified: the email (never the password) is handed to a
 * /verify-email/* status page, chosen here from the response because the
 * backend does not redirect: 201 → pending, `EMAIL_DELIVERY_FAILED` → failed.
 */
export function SignUpForm() {
  const formId = useId();
  const router = useRouter();
  const isSubmittingRef = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lockedUntil, setLockedUntil] = useState(0);
  const secondsLeft = useCooldown(lockedUntil);

  const focusFirstInvalid = (fieldErrors: FieldErrors) => {
    const firstInvalid = FIELDS.find((field) => fieldErrors[field.name]);
    if (firstInvalid) document.getElementById(`${formId}-${firstInvalid.name}`)?.focus();
  };

  const goToEmailStatus = (
    route: typeof userRoutes.verifyEmailFailed | typeof userRoutes.verifyEmailPending,
    email: string,
    cooldownSeconds: number,
  ) => {
    savePendingVerification({
      email,
      resendAvailableAt: Date.now() + cooldownSeconds * 1000,
    });
    router.push(route);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current || secondsLeft > 0) return; // ignore double submits

    const data = new FormData(event.currentTarget);
    const nextErrors = validate(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ kind: "idle" });
      focusFirstInvalid(nextErrors);
      return;
    }

    const email = emailSchema.parse(String(data.get("email")));
    isSubmittingRef.current = true;
    setStatus({ kind: "submitting" });

    try {
      await registerUser({
        fullName: String(data.get("fullName")).trim(),
        email,
        password: String(data.get("password")),
        confirmPassword: String(data.get("confirmPassword")),
      });
      goToEmailStatus(userRoutes.verifyEmailPending, email, VERIFICATION_EMAIL_COOLDOWN_SECONDS);
      return; // keep the button disabled while navigating
    } catch (error) {
      const { code, messages } = getBackendErrorDetails(error);
      const httpStatus = isApiError(error) ? error.status : undefined;
      const retryAfter = isApiError(error) ? error.retryAfterSeconds : undefined;
      const rateLimit = emailRateLimitMessage(error, "signup");

      if (code === "EMAIL_DELIVERY_FAILED") {
        // The account and link were saved; only the email failed.
        goToEmailStatus(
          userRoutes.verifyEmailFailed,
          email,
          retryAfter ?? VERIFICATION_EMAIL_COOLDOWN_SECONDS,
        );
        return;
      }

      let message: ReactNode;
      if (httpStatus === 400) {
        const { fields, unmapped } = fieldErrorsFromBackend(messages);
        setErrors(fields);
        focusFirstInvalid(fields);
        message = unmapped
          ? "Some details couldn’t be accepted. Please check the form and try again."
          : "Please correct the highlighted fields.";
      } else if (code === "EMAIL_EXISTS" || httpStatus === 409) {
        message = (
          <>
            An account with this email is already verified.{" "}
            <Link href={userRoutes.login} className="underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href={userRoutes.forgotPassword} className="underline">
              reset your password
            </Link>
            .
          </>
        );
      } else if (rateLimit) {
        // Registering and resending share one signup cooldown, kept where the
        // pending page reads it. No readable Retry-After means no countdown.
        const known = readPendingVerification();
        const resendAvailableAt =
          retryAfter !== undefined
            ? Date.now() + retryAfter * 1000
            : known?.email === email
              ? known.resendAvailableAt
              : undefined;
        savePendingVerification({ email, resendAvailableAt });
        if (retryAfter !== undefined) setLockedUntil(Date.now() + retryAfter * 1000);
        message = (
          <>
            {rateLimit}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => router.push(userRoutes.verifyEmailPending)}
            >
              Go to email verification
            </button>
          </>
        );
      } else if (httpStatus === 503) {
        message =
          "Our email service is temporarily unavailable, so we couldn’t complete your registration. Please try again in a few minutes.";
      } else if (isApiError(error) && error.kind === "timeout") {
        // The server may have saved the account before the response was lost.
        message =
          "Our server took too long to respond, so we couldn’t confirm your registration. If a verification email arrives, use its link; otherwise please try again in a moment.";
      } else if (isApiError(error) && error.kind === "network") {
        // No response reached the page: offline, DNS, server down, or the request was
        // blocked by the backend's CORS policy. Browsers do not let scripts tell these
        // apart, so the message covers them without guessing.
        message =
          typeof navigator !== "undefined" && !navigator.onLine
            ? "You appear to be offline, so your registration wasn’t sent. Check your internet connection and try again."
            : "We couldn’t connect to the Sithara Marina server, so your registration didn’t go through. Please check your connection and try again. If this keeps happening, the service may be temporarily unavailable.";
      } else {
        message = "Something went wrong while creating your account. Please try again.";
      }

      isSubmittingRef.current = false;
      setStatus({ kind: "error", message });
    }
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
                disabled={isSubmitting}
                // The limit is per address, so another address is not held back.
                onChange={field.name === "email" ? () => setLockedUntil(0) : undefined}
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
        disabled={isSubmitting || secondsLeft > 0}
        className={cx(
          primaryButtonClass,
          "mt-10 w-full max-w-[16.5rem] px-0 lg:mt-[calc(var(--r)*44)] lg:w-[calc(var(--rw)*263)] lg:max-w-none lg:min-w-60",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        {isSubmitting
          ? "Creating account…"
          : secondsLeft > 0
            ? `Create account · ${formatCountdown(secondsLeft)}`
            : "Create account & verify email"}
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
