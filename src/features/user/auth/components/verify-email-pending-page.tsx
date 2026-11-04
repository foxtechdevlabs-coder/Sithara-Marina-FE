import { AccountPageShell } from "./account-page-shell";
import { VerificationHelp } from "./verification-help";
import { VerifyEmailSubtitle } from "./verify-email-subtitle";

/** "One last detail, then you are in." — the account exists but is not verified yet. */
export function VerifyEmailPendingPage() {
  return (
    <AccountPageShell
      headingId="verify-email-pending-heading"
      heading="One last detail,"
      headingSerif="then you are in."
      subtitle={<VerifyEmailSubtitle />}
    >
      <p className="mt-10 max-w-[35rem] text-[1rem] leading-snug text-[#0d1b2a] lg:mt-[calc(var(--r)*37)] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
        Your email verification is still pending. Open the link we emailed you to confirm your
        address — it signs you in automatically. Need a new one? Request it below.
      </p>

      <VerificationHelp />
    </AccountPageShell>
  );
}
