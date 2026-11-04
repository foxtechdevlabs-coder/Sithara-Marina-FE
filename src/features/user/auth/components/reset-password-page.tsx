import { AccountPageShell } from "./account-page-shell";
import { ResetPasswordForm } from "./reset-password-form";

/** "Check your inbox." reset-password page, opened from the emailed reset link. */
export function ResetPasswordPage() {
  return (
    <AccountPageShell
      headingId="reset-password-heading"
      heading="Check your"
      headingSerif="inbox."
      subtitle="If an account is associated with that address, a password reset link is on its way."
    >
      <section
        aria-labelledby="secure-return-heading"
        className="mt-11 border border-[#d6d9dc] px-5 py-6 lg:mt-[calc(var(--r)*36)] lg:px-[calc(var(--rw)*25)] lg:pt-[calc(var(--r)*24)] lg:pb-[calc(var(--r)*26)]"
      >
        <h2
          id="secure-return-heading"
          className="text-[1.375rem] leading-tight font-normal tracking-[-0.01em] lg:text-[max(calc(var(--r)*23),20px)]"
        >
          A secure return.
        </h2>
        <p className="mt-3 text-[0.8125rem] leading-snug text-[#3d434a] lg:mt-[calc(var(--r)*20)] lg:text-[max(calc(var(--r)*13),12px)]">
          Follow the link in your email to choose a new password. If the link has expired or was
          already used, request another.
        </p>
      </section>

      <ResetPasswordForm />
    </AccountPageShell>
  );
}
