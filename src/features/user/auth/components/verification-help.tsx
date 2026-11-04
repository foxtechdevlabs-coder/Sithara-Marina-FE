import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { secondaryButtonClass } from "./auth-form-styles";
import { InfoPanel } from "./info-panel";
import { ResendVerification } from "./resend-verification";

/** Resend form and ways out, shared by the pending, failed and invalid-link states. */
export function VerificationHelp() {
  return (
    <>
      <ResendVerification />

      <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center lg:mt-[calc(var(--r)*41)]">
        <Link
          href={userRoutes.login}
          className={cx(
            secondaryButtonClass,
            "w-full max-w-[20rem] lg:w-[calc(var(--rw)*319)] lg:max-w-none lg:min-w-72",
          )}
        >
          Back to sign in
        </Link>
        <Link
          href={userRoutes.register}
          className="text-[0.8125rem] leading-none text-[#0d1b2a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a]"
        >
          Use a different email
        </Link>
      </div>

      <InfoPanel title="If your link expires" className="mt-14 lg:mt-[calc(var(--r)*52)]">
        Request a new verification email. Each link works once, and your account is kept while you
        verify your email.
      </InfoPanel>
    </>
  );
}
