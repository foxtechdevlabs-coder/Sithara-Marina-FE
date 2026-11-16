import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import {
  AccountHeading,
  ConfirmationPanel,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";
import {
  DEVICE_ONLY_DETAILS_NOTE,
  DEVICE_ONLY_PREFERENCES_NOTE,
} from "@/features/user/account/utils/device-only";

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
        Your name, phone number and email are saved to your account. Existing booking records remain
        available in your booking history. {DEVICE_ONLY_DETAILS_NOTE}
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

/**
 * Figma C64 "Your preferences, saved." TEMPORARY wording: no endpoint stores
 * the preferences yet, so the page says they are kept in this tab only.
 */
export function PreferencesSaved() {
  return (
    <>
      <AccountHeading
        heading="Your preferences,"
        headingSerif="noted."
        subtitle="Your choices are kept in this browser tab for now."
      />
      <ConfirmationPanel
        status="Kept in this tab"
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
        Your essential charter updates will continue. {DEVICE_ONLY_PREFERENCES_NOTE}
      </ConfirmationPanel>
    </>
  );
}
