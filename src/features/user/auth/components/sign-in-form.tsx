"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import { loginUser } from "@/services/user/auth.service";
import { emailSchema } from "@/validation/email";

import { safeNextPath, saveAuthSession, useAuthSession } from "../session";
import { commonAuthErrorMessage } from "../utils/auth-error-message";
import { consumeAuthFlash } from "../utils/auth-flash";

import {
  fieldErrorClass,
  formAlertClass,
  inputClass,
  labelClass,
  PRIMARY_GRADIENT,
  primaryButtonClass,
  secondaryButtonClass,
} from "./auth-form-styles";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "signedIn" }
  | { kind: "error"; message: ReactNode }
  | { kind: "notice"; message: string };

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Customer sign-in form → POST /auth/login. On success the session is stored
 * (../session) and the user returns to `?next=` (same-site paths only) or the
 * home page. The backend answers 401 "Invalid email or password" for wrong
 * credentials and for unverified accounts alike, so the message covers both.
 */
export function SignInForm() {
  const formId = useId();
  const router = useRouter();
  const session = useAuthSession();
  const isSubmittingRef = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    // One-time notice from a redirect (password reset done, session expired).
    // Deferred so StrictMode's double effect run reads (and removes) it once.
    const timer = window.setTimeout(() => {
      const flash = consumeAuthFlash();
      if (flash) setStatus({ kind: "notice", message: flash });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current) return; // ignore double submits

    const data = new FormData(event.currentTarget);
    const email = emailSchema.safeParse(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const nextErrors: FieldErrors = {};
    if (!email.success)
      nextErrors.email = email.error.issues[0]?.message ?? "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password || !email.success) {
      setStatus({ kind: "idle" });
      document.getElementById(`${formId}-${nextErrors.email ? "email" : "password"}`)?.focus();
      return;
    }

    isSubmittingRef.current = true;
    setStatus({ kind: "submitting" });
    try {
      const response = await loginUser({ email: email.data, password });
      saveAuthSession(response);
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace((next ?? userRoutes.home) as Route);
      isSubmittingRef.current = false;
      setStatus({ kind: "signedIn" });
      return;
    } catch (error) {
      let message: ReactNode = commonAuthErrorMessage(error);
      if (isApiError(error) && error.status === 401) {
        message = (
          <>
            The email or password is incorrect. If you registered recently, confirm your email first
            using the link we sent —{" "}
            <Link href={userRoutes.verifyEmailPending} className="underline">
              request a new verification email
            </Link>
            .
          </>
        );
      } else if (isApiError(error) && error.status === 400) {
        const fieldErrors: FieldErrors = {};
        for (const text of getBackendErrorDetails(error).messages) {
          const property = text.split(" ")[0];
          if (property === "email") fieldErrors.email = "Enter a valid email address.";
          else if (property === "password") fieldErrors.password = "Enter your password.";
        }
        setErrors(fieldErrors);
        message = "Please check your email and password.";
      }
      isSubmittingRef.current = false;
      setStatus({
        kind: "error",
        message: message ?? "We couldn’t sign you in. Please try again.",
      });
    }
  };

  // Stays locked while navigating away, unless Logout in the header ended the
  // session first: that cancels the redirect and leaves the visitor on this form.
  const isSubmitting =
    status.kind === "submitting" || (status.kind === "signedIn" && session !== null);
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
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
      {status.kind === "notice" ? (
        <p role="status" className={cx(formAlertClass, "border-[#0d1b2a]")}>
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
