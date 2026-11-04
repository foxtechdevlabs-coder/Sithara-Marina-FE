import { AccountPageShell } from "./account-page-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

/** "A fresh start, simply arranged." request a password-reset link. */
export function ForgotPasswordPage() {
  return (
    <AccountPageShell
      headingId="forgot-password-heading"
      heading="A fresh start,"
      headingSerif="simply arranged."
      subtitle="We will send a secure link to help you return to your account."
    >
      <ForgotPasswordForm />
    </AccountPageShell>
  );
}
