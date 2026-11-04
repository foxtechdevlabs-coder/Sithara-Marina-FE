"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";

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
import { requestStaffPasswordReset } from "@/services/admin/auth.service";

import { authErrorMessage } from "../utils/auth-error-message";

/**
 * Staff password recovery (POST /admin/auth/forgot-password). For staff
 * members only, so it is reached from an expired staff reset link, not from
 * the admin sign-in page. The backend answers the same way for every email;
 * its message is shown as-is.
 */
export function StaffForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setSubmitting(true);
    setError("");
    try {
      setSent(await requestStaffPasswordReset(email));
    } catch (err) {
      setError(authErrorMessage(err, "email"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthLayout
      eyebrow="Sithara Marina / Staff"
      title="Reset your"
      titleAccent="password."
      intro={<p>Enter your staff email and we&rsquo;ll send you a link to set a new password.</p>}
    >
      {sent ? (
        <div role="status" className="mt-[28px] max-w-[560px]">
          <p className="text-[15px] leading-[24px]">{sent}</p>
          <p className="mt-[12px] text-[13px]" style={{ color: AUTH_BODY }}>
            The link is valid for a limited time and works once.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          aria-label="Staff password reset"
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
            className={cx(authField, "mt-[10px]")}
            style={{ borderColor: AUTH_BORDER }}
          />
          {error && <AuthError>{error}</AuthError>}
          <button
            type="submit"
            disabled={submitting}
            className={cx(authPrimaryButton, "mt-[40px]")}
            style={{ background: AUTH_GRADIENT }}
          >
            {submitting ? "Sending…" : "Email me a link"}
          </button>
        </form>
      )}
      <Link
        href={adminRoutes.login}
        className="mt-[28px] inline-block text-[12px] underline underline-offset-2 hover:opacity-70"
      >
        Back to sign in
      </Link>
    </AdminAuthLayout>
  );
}
