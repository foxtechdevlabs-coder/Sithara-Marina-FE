"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

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

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "error"; message: string };

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Customer sign-in form. Validates on submit; submission is not wired to a
 * backend yet because the customer auth contract (endpoint, cookie/session
 * handling) is still undefined, see docs/api-integration.md. Once
 * `src/services/user/auth.service.ts` exists, call it where marked below.
 */
export function SignInForm() {
  const formId = useId();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = emailSchema.safeParse(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const nextErrors: FieldErrors = {};
    if (!email.success)
      nextErrors.email = email.error.issues[0]?.message ?? "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      setStatus({ kind: "idle" });
      return;
    }

    setStatus({ kind: "submitting" });
    // TODO(auth): replace with the auth service call once the backend contract exists.
    setStatus({
      kind: "error",
      message:
        "Online sign-in isn’t available yet. You can continue booking as a guest, or speak to our concierge.",
    });
  };

  const isSubmitting = status.kind === "submitting";
  const emailErrorId = `${formId}-email-error`;
  const passwordErrorId = `${formId}-password-error`;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={isSubmitting}
      className="mt-10 lg:mt-[calc(var(--r)*37)]"
    >
      <div className="max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
        <label htmlFor={`${formId}-email`} className={labelClass}>
          Email address
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ananya@example.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? emailErrorId : undefined}
          className={cx(inputClass, "mt-3.5 lg:mt-[calc(var(--r)*14)]")}
        />
        {errors.email ? (
          <p id={emailErrorId} className={fieldErrorClass}>
            {errors.email}
          </p>
        ) : null}

        <label
          htmlFor={`${formId}-password`}
          className={cx(labelClass, "mt-8 lg:mt-[calc(var(--r)*59)]")}
        >
          Password
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? passwordErrorId : undefined}
          className={cx(inputClass, "mt-3.5 lg:mt-[calc(var(--r)*14)]")}
        />
        {errors.password ? (
          <p id={passwordErrorId} className={fieldErrorClass}>
            {errors.password}
          </p>
        ) : null}
      </div>

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
          "mt-8 w-44 px-0 lg:mt-[calc(var(--r)*55)] lg:w-[calc(var(--rw)*176)] lg:min-w-40",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </button>

      <p className="mt-12 pl-9 text-[0.8125rem] leading-none lg:mt-[calc(var(--r)*52)]">
        <Link
          href={userRoutes.forgotPassword}
          className="text-[#0d1b2a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a]"
        >
          Forgot your password?
        </Link>
      </p>

      <Link
        href={userRoutes.register}
        className={cx(
          secondaryButtonClass,
          "mt-12 w-full max-w-[20.375rem] lg:mt-[calc(var(--r)*50)] lg:w-[calc(var(--rw)*326)] lg:max-w-none lg:min-w-72",
        )}
      >
        New to Sithara Marina? Create an account
      </Link>

      <Link
        href={userRoutes.yachts}
        className="mt-12 ml-10 inline-block text-[0.8125rem] leading-none text-[#0d1b2a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] lg:mt-[calc(var(--r)*51)]"
      >
        Continue booking as a guest
      </Link>
    </form>
  );
}
