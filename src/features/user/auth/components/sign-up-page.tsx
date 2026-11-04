import { AccountPageShell } from "./account-page-shell";
import { SignUpForm } from "./sign-up-form";

/** "Keep your journeys close." create-account page. */
export function SignUpPage() {
  return (
    <AccountPageShell
      headingId="sign-up-heading"
      heading="Keep your journeys"
      headingSerif="close."
      subtitle="Create an account to revisit your bookings and personal charter proposals."
    >
      <SignUpForm />
    </AccountPageShell>
  );
}
