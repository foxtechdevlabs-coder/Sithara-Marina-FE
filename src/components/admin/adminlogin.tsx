"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState, type SubmitEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";
import { adminRoutes } from "@/constants/routes";
import { useAdminSession } from "@/features/admin/auth/components/admin-session-provider";
import { authErrorMessage } from "@/features/admin/auth/utils/auth-error-message";
import { cx } from "@/lib/cx";

import {
  AdminAuthLayout,
  AUTH_BODY,
  AUTH_BORDER,
  AUTH_GRADIENT,
  AUTH_MUTED,
  AUTH_NOTE_BG,
  AuthError,
  AuthLabel,
  authField,
  authPrimaryButton,
} from "./admin-auth-layout";

/** Only same-site admin paths are allowed as a post-login destination. */
function safeNext(value: string | null): Route {
  return value && value.startsWith("/admin/") && !value.startsWith("//")
    ? (value as Route)
    : adminRoutes.dashboard;
}

const NOTICES = {
  expired: "Your session has ended. Please sign in again.",
  forbidden: "That account doesn't have access to the admin area.",
} as const;

/**
 * Admin sign-in ("Welcome back."), built from the Figma design.
 *
 * POST /admin/auth/login, then GET /admin/auth/me; on success it opens the
 * page the visitor was sent here from (`?next=`), or the dashboard.
 * Password recovery is not offered here: /admin/auth/forgot-password is for
 * staff members, so admins are pointed to a super admin instead.
 */
export default function AdminLogin() {
  const router = useRouter();
  const { status, signIn } = useAdminSession();
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Read ?reason= / ?next= on the client (keeps this page statically rendered).
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "expired" || reason === "forbidden") {
      queueMicrotask(() => setNotice(NOTICES[reason]));
    }
  }, []);

  // Already signed in (e.g. a restored session): skip the form.
  useEffect(() => {
    if (status === "authenticated" && !submitting) {
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    }
  }, [status, submitting, router]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // The browser's required/email checks have already passed at this point.
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await signIn(email, password);
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(authErrorMessage(err, "login"));
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthLayout
      eyebrow="Sithara Marina / Super admin"
      title="Welcome"
      titleAccent="back."
      intro={<p>Sign in to manage your charters and team.</p>}
    >
      {notice && (
        <p
          role="status"
          className="mt-[16px] text-[13px] leading-[20px]"
          style={{ color: AUTH_BODY }}
        >
          {notice}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        aria-label="Staff sign-in"
        aria-busy={submitting}
        className="mt-[28px] max-w-[560px] lg:mt-[30px]"
      >
        <AuthLabel htmlFor="email">Work email</AuthLabel>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={255}
          autoComplete="username"
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          className={cx(authField, "mt-[10px]")}
          style={{ borderColor: AUTH_BORDER }}
        />

        <div className="mt-[40px] lg:mt-[62px]">
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={error ? true : undefined}
            className={authField}
            wrapperClassName="mt-[10px]"
            style={{ borderColor: AUTH_BORDER }}
          />
        </div>

        {error && <AuthError>{error}</AuthError>}

        <button
          type="submit"
          disabled={submitting}
          className={cx(authPrimaryButton, error ? "mt-[20px]" : "mt-[40px] lg:mt-[54px]")}
          style={{ background: AUTH_GRADIENT }}
        >
          {submitting ? "Signing in…" : "Sign in securely"}
          {!submitting && <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3" />}
        </button>

        <div className="mt-[20px] w-full sm:w-[196px] lg:mt-[44px]">
          <button
            type="button"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((s) => !s)}
            className="w-full py-1 text-center text-[12px] hover:underline"
          >
            Forgot your password?
          </button>
        </div>
        {showHelp && (
          <p
            role="status"
            className="mt-2 max-w-[560px] text-[13px] leading-[20px]"
            style={{ color: AUTH_BODY }}
          >
            Ask a super admin to send you a password reset link.
          </p>
        )}
      </form>

      <aside
        className="mt-[32px] max-w-[696px] px-[20px] py-[20px] lg:mt-[44px] lg:py-[19px]"
        style={{ backgroundColor: AUTH_NOTE_BG }}
      >
        <p
          className="text-[12px] leading-[16px] tracking-[0.1em] uppercase"
          style={{ color: AUTH_MUTED }}
        >
          Authorised team access
        </p>
        <p className="mt-[12px] text-[14px] leading-[20px]">
          Keep your credentials private. Staff access follows the permissions assigned to your
          account.
        </p>
      </aside>
    </AdminAuthLayout>
  );
}
