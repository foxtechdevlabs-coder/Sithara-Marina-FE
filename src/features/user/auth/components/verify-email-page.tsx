import { AccountPageShell } from "./account-page-shell";
import { VerifyEmailForm } from "./verify-email-form";
import { VerifyEmailSubtitle } from "./verify-email-subtitle";

/** "One last detail, then you are in." email verification page, after registration. */
export function VerifyEmailPage() {
  return (
    <AccountPageShell
      headingId="verify-email-heading"
      heading="One last detail,"
      headingSerif="then you are in."
      subtitle={<VerifyEmailSubtitle />}
    >
      <VerifyEmailForm />
    </AccountPageShell>
  );
}
