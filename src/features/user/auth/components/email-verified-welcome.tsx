import { ArrowRight } from "lucide-react";

import { cx } from "@/lib/cx";
import type { AuthUser } from "@/services/user/auth.service";

import { AccountPageShell } from "./account-page-shell";
import { PRIMARY_GRADIENT, primaryButtonClass } from "./auth-form-styles";

export interface EmailVerifiedWelcomeProps {
  user: AuthUser;
  onContinue: () => void;
}

/** Rendered by /verify-email/success for the session saved after POST /auth/verify-email → 200. */
export function EmailVerifiedWelcome({ user, onContinue }: EmailVerifiedWelcomeProps) {
  const firstName = user.fullName.trim().split(/\s+/)[0];

  return (
    <AccountPageShell
      headingId="email-verified-welcome-heading"
      heading="Welcome aboard,"
      headingSerif={`${firstName}.`}
      subtitle={
        <>
          Your email <span className="break-all">{user.email}</span> has been verified.
        </>
      }
    >
      <p
        role="status"
        className="mt-10 max-w-[35rem] text-[1rem] leading-snug text-[#0d1b2a] lg:mt-[calc(var(--r)*37)] lg:w-[calc(var(--rw)*560)] lg:max-w-none"
      >
        We’re delighted to have you with us. Your account is ready, so you can start planning your
        time on the water.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className={cx(
          primaryButtonClass,
          "mt-10 w-48 px-0 lg:mt-[calc(var(--r)*41)] lg:w-[calc(var(--rw)*182)] lg:min-w-44",
        )}
        style={{ background: PRIMARY_GRADIENT }}
      >
        Continue
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      </button>
    </AccountPageShell>
  );
}
