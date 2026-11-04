"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import {
  AdminAuthLayout,
  AUTH_BODY,
  AUTH_BORDER,
  AUTH_GRADIENT,
  AuthError,
  AuthLabel,
  authField,
  authPrimaryButton,
} from "@/components/admin/admin-auth-layout";
import { adminRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { resetPassword, verifyResetLink, type ResetToken } from "@/services/admin/auth.service";
import { isApiError } from "@/services/http/api-error";

import { authErrorMessage } from "../utils/auth-error-message";

const MIN = 8;
const MAX = 128;

/**
 * Emailed links are single use, so each one is verified at most once per page
 * load (React may run effects twice in development).
 */
const verifications = new Map<string, Promise<ResetToken>>();
function verifyOnce(token: string) {
  let pending = verifications.get(token);
  if (!pending) {
    pending = verifyResetLink(token);
    verifications.set(token, pending);
  }
  return pending;
}

/** The link token from this page load (kept so a re-run effect still finds it). */
let pageLinkToken: string | null = null;

/** Reads `#token=…` from the emailed link, then removes it from the address bar. */
function takeTokenFromUrl(): string | null {
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
  if (token) {
    pageLinkToken = token;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return token ?? pageLinkToken;
}

type State =
  | { step: "verifying" }
  | { step: "invalid"; reason: "missing" | "invalid" | "expired" }
  | { step: "error"; message: string }
  | { step: "form"; resetToken: string; expiresAt: number }
  | { step: "done"; message: string };

/**
 * Staff password reset, opened from the emailed link
 * (`<this page>#token=…`). Exchanges the link for a short-lived reset token
 * (POST /admin/auth/verify-reset-link), then sets the new password
 * (POST /admin/auth/reset-password). Afterwards the staff member signs in.
 */
export function StaffResetPassword() {
  const [state, setState] = useState<State>({ step: "verifying" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const verify = (token: string | null) => {
      if (!token) {
        queueMicrotask(() => active && setState({ step: "invalid", reason: "missing" }));
        return;
      }
      queueMicrotask(() => active && setState({ step: "verifying" }));
      verifyOnce(token).then(
        (result) => {
          if (active)
            setState({
              step: "form",
              resetToken: result.reset_token,
              expiresAt: Date.now() + result.expires_in * 1000,
            });
        },
        (err) => {
          if (!active) return;
          if (isApiError(err) && err.status === 400)
            setState({ step: "invalid", reason: "invalid" });
          else setState({ step: "error", message: authErrorMessage(err, "reset") });
        },
      );
    };
    verify(takeTokenFromUrl());
    // A newer link opened while this page is showing only changes the #fragment.
    const onHashChange = () => {
      if (window.location.hash.includes("token=")) {
        setError("");
        verify(takeTokenFromUrl());
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      active = false;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.step !== "form") return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("new_password") ?? "");
    const confirmPassword = String(data.get("confirm_password") ?? "");
    if (newPassword !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }
    if (Date.now() >= state.expiresAt) {
      setState({ step: "invalid", reason: "expired" });
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const message = await resetPassword({
        resetToken: state.resetToken,
        newPassword,
        confirmPassword,
      });
      setState({ step: "done", message });
    } catch (err) {
      if (isApiError(err) && err.code === "INVALID_RESET_TOKEN") {
        setState({ step: "invalid", reason: "expired" });
      } else {
        setError(authErrorMessage(err, "reset"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const requestNewLink = (
    <Link
      href={adminRoutes.forgotPassword}
      className="mt-[28px] inline-flex h-[56px] w-full items-center justify-center gap-[6px] text-[12px] transition-opacity hover:opacity-90 sm:w-[196px]"
      style={{ background: AUTH_GRADIENT }}
    >
      Request a new link
      <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3" />
    </Link>
  );

  let body: ReactNode;
  switch (state.step) {
    case "verifying":
      body = (
        <p role="status" className="mt-[28px] text-[14px]" style={{ color: AUTH_BODY }}>
          Checking your reset link…
        </p>
      );
      break;
    case "invalid":
      body = (
        <div role="alert" className="mt-[28px] max-w-[560px]">
          <p className="text-[15px] leading-[24px]">
            {state.reason === "missing"
              ? "This page needs the link from your password reset email."
              : state.reason === "expired"
                ? "This reset session has expired."
                : "This reset link is invalid, has already been used or has expired."}{" "}
            Request a new link and open it from the latest email.
          </p>
          {requestNewLink}
        </div>
      );
      break;
    case "error":
      body = (
        <div className="mt-[28px] max-w-[560px]">
          <AuthError>{state.message}</AuthError>
          <p className="mt-[12px] text-[13px]" style={{ color: AUTH_BODY }}>
            Reload this page from the link in your email to try again.
          </p>
        </div>
      );
      break;
    case "done":
      body = (
        <div role="status" className="mt-[28px] max-w-[560px]">
          <p className="text-[15px] leading-[24px]">{state.message}</p>
          <Link
            href={adminRoutes.login}
            className="mt-[28px] inline-flex h-[56px] w-full items-center justify-center gap-[6px] text-[12px] transition-opacity hover:opacity-90 sm:w-[176px]"
            style={{ background: AUTH_GRADIENT }}
          >
            Sign in
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3" />
          </Link>
        </div>
      );
      break;
    case "form":
      body = (
        <form
          onSubmit={handleSubmit}
          aria-label="Set a new password"
          aria-busy={submitting}
          className="mt-[28px] max-w-[560px] lg:mt-[30px]"
        >
          <AuthLabel htmlFor="new_password">New password</AuthLabel>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={MIN}
            maxLength={MAX}
            autoComplete="new-password"
            aria-describedby="password-rules"
            className={cx(authField, "mt-[10px]")}
            style={{ borderColor: AUTH_BORDER }}
          />
          <p id="password-rules" className="mt-[8px] text-[12px]" style={{ color: AUTH_BODY }}>
            {MIN}–{MAX} characters.
          </p>

          <div className="mt-[32px]">
            <AuthLabel htmlFor="confirm_password">Confirm new password</AuthLabel>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={MIN}
              maxLength={MAX}
              autoComplete="new-password"
              className={cx(authField, "mt-[10px]")}
              style={{ borderColor: AUTH_BORDER }}
            />
          </div>

          {error && <AuthError>{error}</AuthError>}

          <button
            type="submit"
            disabled={submitting}
            className={cx(authPrimaryButton, "mt-[40px]")}
            style={{ background: AUTH_GRADIENT }}
          >
            {submitting ? "Saving…" : "Set new password"}
          </button>
        </form>
      );
      break;
  }

  return (
    <AdminAuthLayout
      eyebrow="Sithara Marina / Staff"
      title="Set a new"
      titleAccent="password."
      intro={<p>Choose a new password for your staff account.</p>}
    >
      {body}
    </AdminAuthLayout>
  );
}
