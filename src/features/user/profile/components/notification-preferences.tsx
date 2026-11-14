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
import { useApiQuery } from "@/hooks/use-api-query";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/services/user/profile.service";

const OPTIONS: readonly {
  key: keyof NotificationPreferences;
  group: string;
  optional: boolean;
  label: string;
}[] = [
  {
    key: "proposal_emails",
    group: "Personal proposals",
    optional: false,
    label: "Email me about my enquiries and proposals",
  },
  {
    key: "whatsapp_updates",
    group: "WhatsApp charter updates",
    optional: true,
    label: "I agree to receive updates about my charter",
  },
  {
    key: "stories_and_offers",
    group: "Stories and offers",
    optional: true,
    label: "Send occasional inspiration and offers",
  },
];

/** Figma C55 "Stay close to your journey.": the optional message channels. */
export function NotificationSettings() {
  const query = useApiQuery(getNotificationPreferences, "notification-preferences");

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
            "Booking confirmations, payment status and important changes to your charter are sent to your registered contact details.",
          ]}
        />
      </Card>
      {query.data ? (
        <PreferencesForm saved={query.data} onSaved={query.setData} />
      ) : (
        <QueryFallback query={query} loadingLabel="Loading your preferences" />
      )}
    </>
  );
}

type Status = "idle" | "saving" | "saved" | "failed";

function PreferencesForm({
  saved,
  onSaved,
}: {
  saved: NotificationPreferences;
  onSaved: (preferences: NotificationPreferences) => void;
}) {
  const id = useId();
  const router = useRouter();
  const [values, setValues] = useState(saved);
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    try {
      const result = await updateNotificationPreferences(values);
      onSaved(result);
      setValues(result);
      setStatus("saved");
      router.push(userRoutes.accountNotificationsSaved);
    } catch {
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

      <p role="status" className="text-body mt-7 min-h-5 text-[13px]">
        {status === "saved" ? "Your preferences have been saved." : null}
      </p>
      {status === "failed" ? (
        <p role="alert" className={fieldErrorClass}>
          We couldn’t save your preferences just now. Please try again.
        </p>
      ) : null}
      <div className={`${buttonRowClass} mt-3`}>
        <button
          type="submit"
          disabled={status === "saving"}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {status === "saving" ? "Saving…" : "Save preferences"}
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
