"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import {
  AccountHeading,
  buttonRowClass,
  Card,
  fieldErrorClass,
  labelClass,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { fetchMyProfile, publishMyProfile } from "@/features/user/account/my-profile";
import { accountErrorMessage } from "@/features/user/account/utils/account-error";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  notificationPreferencesOf,
  updateMyProfile,
  type AccountUser,
  type NotificationPreferences,
} from "@/services/user/profile.service";

/*
 * Only the two emails the customer controls get a switch. Booking, payment,
 * refund and cancellation emails always go, so they have none.
 */
const OPTIONS: readonly {
  key: keyof NotificationPreferences;
  group: string;
  optional: boolean;
  label: string;
}[] = [
  {
    key: "charter_reminders",
    group: "Charter reminders",
    optional: false,
    label: "Email me a reminder the day before my charter",
  },
  {
    key: "offers_and_updates",
    group: "Offers and updates",
    optional: true,
    label: "Send occasional inspiration and offers",
  },
];

/** Figma C55 "Stay close to your journey.": the optional message channels. */
export function NotificationSettings() {
  const query = useApiQuery(fetchMyProfile, "notification-preferences");

  return (
    <>
      <AccountHeading
        heading="Stay close"
        headingSerif="to your journey."
        subtitle="Choose how you hear from Sithara Marina."
      />
      <Card title="Essential charter updates" className="mt-8 lg:mt-10">
        <MetaLines
          lines={[
            "Booking confirmations, payment and refund updates and cancellation notices are always sent to your registered contact details.",
          ]}
        />
      </Card>
      {query.data ? (
        <PreferencesForm user={query.data} />
      ) : (
        <QueryFallback query={query} loadingLabel="Loading your preferences" />
      )}
    </>
  );
}

type Status = "idle" | "saving" | "failed";

function PreferencesForm({ user }: { user: AccountUser }) {
  const id = useId();
  const router = useRouter();
  const saved = notificationPreferencesOf(user);
  const [values, setValues] = useState(saved);
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "saving") return;

    // PATCH only the keys that changed.
    const changed: Partial<NotificationPreferences> = {};
    for (const { key } of OPTIONS) {
      if (values[key] !== saved[key]) changed[key] = values[key];
    }
    if (Object.keys(changed).length === 0) {
      router.push(userRoutes.accountNotificationsSaved);
      return;
    }

    setStatus("saving");
    try {
      publishMyProfile(await updateMyProfile({ notification_preferences: changed }));
      router.push(userRoutes.accountNotificationsSaved);
    } catch (error) {
      setFailure(
        accountErrorMessage(error, "We couldn’t save your preferences just now. Please try again."),
      );
      setStatus("failed");
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-6 max-w-[33rem]">
      <div className="space-y-7 lg:space-y-9">
        {OPTIONS.map((option) => (
          <fieldset key={option.key}>
            <legend className={labelClass}>
              {option.group}
              {option.optional ? <span className="ml-2">optional</span> : null}
            </legend>
            <label
              htmlFor={`${id}-${option.key}`}
              className="border-rule text-navy-ink has-focus-visible:outline-navy-ink flex min-h-[46px] cursor-pointer items-center gap-2.5 border px-3 py-3 text-[13px] leading-snug has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                id={`${id}-${option.key}`}
                type="checkbox"
                checked={values[option.key]}
                disabled={status === "saving"}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [option.key]: event.target.checked }));
                  setStatus("idle");
                }}
                className="accent-navy-ink size-3.5 shrink-0"
              />
              {option.label}
            </label>
          </fieldset>
        ))}
      </div>

      {status === "failed" ? (
        <p role="alert" className={`${fieldErrorClass} mt-7`}>
          {failure}
        </p>
      ) : null}
      <div className={`${buttonRowClass} mt-7`}>
        <button
          type="submit"
          disabled={status === "saving"}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {status === "saving" ? "Saving…" : "Save my choices"}
        </button>
        <button
          type="button"
          disabled={status === "saving"}
          onClick={() => {
            setValues(saved);
            setStatus("idle");
          }}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
