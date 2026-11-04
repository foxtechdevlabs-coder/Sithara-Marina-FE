"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { verifyEmail, type VerifyEmailResponse } from "@/services/user/auth.service";

import { saveAuthSession } from "../session";
import {
  clearPendingVerification,
  readPendingVerification,
  subscribePendingVerification,
} from "../utils/pending-verification";
import { formAlertClass, PRIMARY_GRADIENT, primaryButtonClass } from "./auth-form-styles";
import { InfoPanel } from "./info-panel";
import { ResendVerification } from "./resend-verification";

/** Where a newly verified customer lands. There is no account area yet. */
const AFTER_VERIFICATION_ROUTE = userRoutes.home;

type Mode = "loading" | "check-inbox" | "verifying" | "verified" | "invalid" | "failed";

/**
 * Verification tokens are single use, so one token is only ever submitted
 * once per page load — even when React StrictMode runs effects twice.
 */
const inFlight = new Map<string, Promise<VerifyEmailResponse>>();
function verifyOnce(token: string): Promise<VerifyEmailResponse> {
  let request = inFlight.get(token);
  if (!request) {
    request = verifyEmail({ token });
    inFlight.set(token, request);
  }
  return request;
}

/**
 * Email verification, matching the backend contract: the user clicks the link
 * in the verification email, which opens this page as
 * `/verify-email?token=<id>.<secret>`. The token is read, removed from the
 * address bar, and sent to POST /auth/verify-email. Opened without a token
 * (straight after registering) the page explains the email and offers resend.
 *
 * The backend has no six-digit code endpoint, so there is no code input.
 */
export function VerifyEmailForm() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const pending = useSyncExternalStore(
    subscribePendingVerification,
    readPendingVerification,
    () => null,
  );

  const submitToken = useCallback(
    async (token: string) => {
      setMode("verifying");
      try {
        const response = await verifyOnce(token);
        saveAuthSession(response);
        clearPendingVerification();
        setMode("verified");
        router.replace(AFTER_VERIFICATION_ROUTE);
      } catch (error) {
        inFlight.delete(token); // allow a manual retry for transient failures
        setMode(isApiError(error) && error.status === 400 ? "invalid" : "failed");
      }
    },
    [router],
  );

  useEffect(() => {
    // Deferred so React StrictMode's double effect run (mount → cleanup → mount)
    // cancels the first pass: the link is read and submitted exactly once.
    const timer = window.setTimeout(() => {
      if (tokenRef.current) return;
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token");
      if (!token) {
        setMode("check-inbox");
        return;
      }
      // Keep the secret out of history, bookmarks and screenshots of the address bar.
      url.searchParams.delete("token");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      tokenRef.current = token;
      void submitToken(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [submitToken]);

  return (
    <div className="mt-10 lg:mt-[calc(var(--r)*37)]">
      <div aria-live="polite" className="max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
        {mode === "verifying" ? (
          <p className="text-[1rem] text-[#0d1b2a]">Verifying your email…</p>
        ) : null}
        {mode === "verified" ? (
          <p className="text-[1rem] text-[#0d1b2a]">
            Your email is verified and you’re signed in. Taking you onward…
          </p>
        ) : null}
        {mode === "invalid" ? (
          <p role="alert" className={cx(formAlertClass, "mt-0")}>
            This verification link is invalid or has expired. Each link can be used only once.
            Request a new verification email below.
          </p>
        ) : null}
        {mode === "failed" ? (
          <p role="alert" className={cx(formAlertClass, "mt-0")}>
            We couldn’t verify your email right now. Please check your connection and try again.
          </p>
        ) : null}
        {mode === "check-inbox" ? (
          <>
            {pending?.notice === "delivery-failed" ? (
              <p role="alert" className={cx(formAlertClass, "mt-0")}>
                Your account was created, but we couldn’t deliver the verification email. Request a
                new one when the timer below finishes — the new email’s link signs you in
                automatically.
              </p>
            ) : pending ? (
              <p className="text-[1rem] leading-snug text-[#0d1b2a]">
                We’ve sent a verification link to your email. Open it to confirm your address — the
                link signs you in automatically.
              </p>
            ) : (
              <p className="text-[1rem] leading-snug text-[#0d1b2a]">
                Open the verification link we emailed you to confirm your address. Need a new one?
                Enter your email below.
              </p>
            )}
          </>
        ) : null}
      </div>

      {mode === "failed" ? (
        <button
          type="button"
          onClick={() => tokenRef.current && void submitToken(tokenRef.current)}
          className={cx(
            primaryButtonClass,
            "mt-10 w-48 px-0 lg:mt-[calc(var(--r)*41)] lg:w-[calc(var(--rw)*182)] lg:min-w-44",
          )}
          style={{ background: PRIMARY_GRADIENT }}
        >
          Try again
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
        </button>
      ) : null}

      {mode === "check-inbox" || mode === "invalid" ? <ResendVerification /> : null}

      {mode === "check-inbox" || mode === "invalid" ? (
        <>
          <Link
            href={userRoutes.register}
            className="mt-14 ml-10 inline-block text-[0.8125rem] leading-none text-[#0d1b2a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] lg:mt-[calc(var(--r)*64)]"
          >
            Use a different email
          </Link>

          <InfoPanel title="If your link expires" className="mt-14 lg:mt-[calc(var(--r)*52)]">
            Request a new verification email. Each link works once, and your account is kept while
            you verify your email.
          </InfoPanel>
        </>
      ) : null}
    </div>
  );
}
