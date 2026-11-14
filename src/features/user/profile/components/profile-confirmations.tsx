import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import {
  AccountHeading,
  ConfirmationPanel,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";

/*
 * Where the profile, security and notification forms land after a save
 * (Figma C53, C62, C64). Static, so Server Components.
 */

/** Figma C53 "Your details, up to date." */
export function ProfileSaved() {
  return (
    <>
      <AccountHeading
        heading="Your details,"
        headingSerif="up to date."
        subtitle="Your profile changes have been saved."
      />
      <ConfirmationPanel
        status="Profile updated"
        title="A little detail, taken care of."
        actions={
          <>
            <Link
              href={userRoutes.account}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Back to my account
            </Link>
            <Link href={userRoutes.accountBookings} className={secondaryButtonClass}>
              View my bookings
            </Link>
          </>
        }
      >
        Your contact and billing preferences are ready for your next journey. Existing booking
        records remain available in your booking history.
      </ConfirmationPanel>
    </>
  );
}

/** Figma C62 "Your password, updated." */
export function PasswordUpdated() {
  return (
    <>
      <AccountHeading
        heading="Your password,"
        headingSerif="updated."
        subtitle="Your new password has been saved."
      />
      <ConfirmationPanel
        status="Password updated"
        title="A secure return."
        actions={
          <>
            <Link
              href={userRoutes.accountSecurity}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Back to security
            </Link>
            <Link href={userRoutes.account} className={secondaryButtonClass}>
              My account
            </Link>
          </>
        }
      >
        Use your new password the next time you sign in. Keep it private and unique to your account.
      </ConfirmationPanel>
    </>
  );
}

/** Figma C64 "Your preferences, saved." */
export function PreferencesSaved() {
  return (
    <>
      <AccountHeading
        heading="Your preferences,"
        headingSerif="saved."
        subtitle="Your communication preferences have been updated."
      />
      <ConfirmationPanel
        status="Preferences saved"
        title="Thoughtfully in touch."
        actions={
          <>
            <Link
              href={userRoutes.accountNotifications}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Back to notifications
            </Link>
            <Link href={userRoutes.account} className={secondaryButtonClass}>
              My account
            </Link>
          </>
        }
      >
        Your essential charter updates will continue. Optional messages follow your selected
        preferences.
      </ConfirmationPanel>
    </>
  );
}
