import { AccountPageShell } from "./account-page-shell";
import { formAlertClass } from "./auth-form-styles";
import { PendingEmail } from "./pending-email";
import { RequirePendingVerification } from "./require-pending-verification";
import { VerificationHelp } from "./verification-help";

/**
 * Shown after POST /auth/register → 503 `EMAIL_DELIVERY_FAILED`: the account and
 * link were saved, only the email failed, so resending is the correct retry.
 */
export function VerifyEmailFailedPage() {
  return (
    <AccountPageShell
      headingId="verify-email-failed-heading"
      heading="We couldn’t send"
      headingSerif="your email."
      subtitle={
        <>
          Your account was created, but the verification email to <PendingEmail /> couldn’t be sent.
        </>
      }
    >
      <RequirePendingVerification />

      <p role="alert" className={formAlertClass}>
        Please try again when the timer below finishes. The new email’s link signs you in
        automatically.
      </p>

      <VerificationHelp />
    </AccountPageShell>
  );
}
