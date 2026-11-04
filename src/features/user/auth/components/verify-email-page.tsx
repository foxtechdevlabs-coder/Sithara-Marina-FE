"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { verifyEmail, type AuthUser, type VerifyEmailResponse } from "@/services/user/auth.service";

import { readAuthSession, saveAuthSession } from "../session";
import { commonAuthErrorMessage } from "../utils/auth-error-message";
import { clearPendingVerification } from "../utils/pending-verification";
import { AccountPageShell } from "./account-page-shell";
import { formAlertClass, PRIMARY_GRADIENT, primaryButtonClass } from "./auth-form-styles";
import { EmailVerifiedWelcome } from "./email-verified-welcome";
import { VerificationHelp } from "./verification-help";
import { VerifyEmailSubtitle } from "./verify-email-subtitle";

type Status =
  | { kind: "loading" }
  | { kind: "verifying" }
  | { kind: "verified"; user: AuthUser }
  | { kind: "invalid" }
  | { kind: "failed"; message: string };

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
 * Reads the emailed token from `#token=…`, or from `?token=…` for older links,
 * then removes it from the address bar to keep the secret out of history,
 * bookmarks and screenshots.
 */
function takeTokenFromUrl(): string | null {
  const url = new URL(window.location.href);
  const token =
    new URLSearchParams(url.hash.slice(1)).get("token") ?? url.searchParams.get("token");
  if (token !== null) {
    url.searchParams.delete("token");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  return token;
}

/**
 * Email verification callback: the link in the verification email opens this
 * page as `/verify-email#token=<id>.<secret>` (`?token=` is also accepted).
 * The token is read, removed from the address bar (never stored) and sent to
 * POST /auth/verify-email. Success signs the user in and shows the Welcome
 * screen, which is local state so it cannot be reached any other way. Without
 * a token there is nothing to verify, so the page hands over to the pending
 * page, or home after a refresh of the Welcome screen.
 *
 * The backend has no six-digit code endpoint, so there is no code input.
 */
export function VerifyEmailPage() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  const submitToken = useCallback(async (token: string) => {
    setStatus({ kind: "verifying" });
    try {
      const response = await verifyOnce(token);
      saveAuthSession(response);
      clearPendingVerification();
      setStatus({ kind: "verified", user: response.user });
    } catch (error) {
      inFlight.delete(token); // allow a manual retry for transient failures
      if (isApiError(error) && error.status === 400) {
        // INVALID_TOKEN is one answer for malformed, expired and used links.
        setStatus({ kind: "invalid" });
        return;
      }
      setStatus({
        kind: "failed",
        message:
          commonAuthErrorMessage(error) ?? "We couldn’t verify your email. Please try again.",
      });
    }
  }, []);

  useEffect(() => {
    // Deferred so React StrictMode's double effect run (mount → cleanup → mount)
    // cancels the first pass: the link is read and submitted exactly once.
    const timer = window.setTimeout(() => {
      if (tokenRef.current !== null) return;
      const token = takeTokenFromUrl();
      if (token === null) {
        router.replace(readAuthSession() ? userRoutes.home : userRoutes.verifyEmailPending);
        return;
      }
      tokenRef.current = token;
      void submitToken(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router, submitToken]);

  useEffect(() => {
    // A newer link opened while this page is showing only changes the #fragment,
    // so the page does not reload. Only a failed attempt can be replaced: nothing
    // may race a request in flight or take the user off the Welcome screen.
    const onHashChange = () => {
      const token = takeTokenFromUrl();
      const canRetry = status.kind === "invalid" || status.kind === "failed";
      if (token === null || token === tokenRef.current || !canRetry) return;
      tokenRef.current = token;
      void submitToken(token);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [status.kind, submitToken]);

  if (status.kind === "verified") {
    return (
      <EmailVerifiedWelcome user={status.user} onContinue={() => router.replace(userRoutes.home)} />
    );
  }

  return (
    <AccountPageShell
      headingId="verify-email-heading"
      heading="One last detail,"
      headingSerif="then you are in."
      subtitle={<VerifyEmailSubtitle />}
    >
      <div className="mt-10 lg:mt-[calc(var(--r)*37)]">
        <div aria-live="polite" className="max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
          {status.kind === "verifying" ? (
            <p className="text-[1rem] text-[#0d1b2a]">Verifying your email…</p>
          ) : null}
          {status.kind === "invalid" ? (
            <p role="alert" className={cx(formAlertClass, "mt-0")}>
              This verification link is invalid, has expired or has already been used. If you’ve
              already verified your email,{" "}
              <Link href={userRoutes.login} className="underline">
                sign in
              </Link>
              . Otherwise, request a new verification email below.
            </p>
          ) : null}
          {status.kind === "failed" ? (
            <p role="alert" className={cx(formAlertClass, "mt-0")}>
              {status.message}
            </p>
          ) : null}
        </div>

        {status.kind === "failed" ? (
          <button
            type="button"
            onClick={() => tokenRef.current !== null && void submitToken(tokenRef.current)}
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

        {status.kind === "invalid" ? <VerificationHelp /> : null}
      </div>
    </AccountPageShell>
  );
}
