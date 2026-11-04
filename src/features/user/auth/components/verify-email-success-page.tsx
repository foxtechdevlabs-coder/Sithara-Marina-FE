import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { AccountPageShell } from "./account-page-shell";
import { PRIMARY_GRADIENT, primaryButtonClass } from "./auth-form-styles";
import { InfoPanel } from "./info-panel";
import { PendingEmail } from "./pending-email";
import { RequirePendingVerification } from "./require-pending-verification";

/** Shown after POST /auth/register → 201: the backend accepted the verification email. */
export function VerifyEmailSuccessPage() {
  return (
    <AccountPageShell
      headingId="verify-email-success-heading"
      heading="Check your"
      headingSerif="inbox."
      subtitle={
        <>
          We’ve sent a verification email to <PendingEmail />.
        </>
      }
    >
      <RequirePendingVerification />

      <p className="mt-10 max-w-[35rem] text-[1rem] leading-snug text-[#0d1b2a] lg:mt-[calc(var(--r)*37)] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
        Open the email and click the verification link to confirm your address. The link signs you
        in automatically.
      </p>

      <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center lg:mt-[calc(var(--r)*41)]">
        <Link
          href={userRoutes.login}
          className={cx(
            primaryButtonClass,
            "w-full max-w-[20rem] lg:w-[calc(var(--rw)*319)] lg:max-w-none lg:min-w-72",
          )}
          style={{ background: PRIMARY_GRADIENT }}
        >
          Back to sign in
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
        </Link>
        <Link
          href={userRoutes.verifyEmailPending}
          className="text-[0.8125rem] leading-none text-[#0d1b2a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a]"
        >
          Didn’t receive it? Resend the email
        </Link>
      </div>

      <InfoPanel title="Can’t find the email?" className="mt-14 lg:mt-[calc(var(--r)*52)]">
        Check your spam folder. You’ll be able to sign in with your password once your email is
        verified.
      </InfoPanel>
    </AccountPageShell>
  );
}
