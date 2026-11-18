"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import { updateSessionUser } from "@/features/user/auth/session";
import { PHONE_FORMAT_HINT, toE164 } from "@/features/user/profile/utils/phone";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  getNotificationPreferences,
  getProfileExtras,
  updateMyProfile,
  updateNotificationPreferences,
  updateProfileExtras,
} from "@/services/user/profile.service";

import { fetchMyProfile, publishMyProfile } from "../my-profile";
import { accountErrorMessage } from "../utils/account-error";
import { setupInitialValues, validateSetup, type SetupField } from "../utils/setup-form";

import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  fieldErrorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "./account-ui";
import { QueryFallback } from "./query-fallback";

/** The account (GET /auth/me), plus the TEMPORARY mock country and offers preference. */
function loadSetup(signal: AbortSignal) {
  return Promise.all([
    fetchMyProfile(),
    getProfileExtras(signal),
    getNotificationPreferences(signal),
  ]);
}

interface Values {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  storiesAndOffers: boolean;
}
type FieldErrors = Partial<Record<SetupField, string>>;

/**
 * Figma C58 "Make your account your own.": the first stop after the email is
 * verified. No sidebar yet; the details can be changed later in Profile details.
 */
export function AccountSetup() {
  const query = useApiQuery(loadSetup, "account-setup");

  return (
    <>
      <AccountHeading
        heading="Make your account"
        headingSerif="your own."
        subtitle="Your email is verified. Add the details you would like us to remember."
      />
      <StatusChip className="mt-7 lg:mt-8">Email verified</StatusChip>
      {query.data ? (
        <SetupForm
          initial={setupInitialValues(
            query.data[0],
            query.data[1].country,
            query.data[2].stories_and_offers,
          )}
        />
      ) : (
        <QueryFallback query={query} loadingLabel="Loading your details" />
      )}
    </>
  );
}

function SetupForm({ initial }: { initial: Values }) {
  const id = useId();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "failed">("idle");
  const [failure, setFailure] = useState("");

  const set = (name: "fullName" | "phone" | "country") => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: FieldErrors = validateSetup(values);
    setErrors(found);
    if (Object.keys(found).length > 0 || status === "saving") return;

    setStatus("saving");
    try {
      const saved = await updateMyProfile({
        name: values.fullName.trim(),
        phone: values.phone.trim() ? toE164(values.phone) : null,
      });
      publishMyProfile(saved);
      updateSessionUser({
        id: saved.id,
        fullName: saved.fullName,
        email: saved.email,
        role: saved.role,
      });
      // TEMPORARY (mock): no endpoint stores the country or the offers preference.
      await Promise.all([
        updateProfileExtras({ country: values.country.trim() || null }),
        updateNotificationPreferences({ stories_and_offers: values.storiesAndOffers }),
      ]);
      router.push(userRoutes.account);
    } catch (error) {
      if (isApiError(error) && error.status === 400) {
        // Validation messages name the field ("phone must be …"); raw text is not shown.
        const text = getBackendErrorDetails(error).messages.join(" ");
        setErrors({
          ...(/phone/i.test(text) ? { phone: PHONE_FORMAT_HINT } : {}),
          ...(/name/i.test(text) ? { fullName: "Please check your full name." } : {}),
        });
      }
      setFailure(
        accountErrorMessage(error, "We couldn’t save your details just now. Please try again."),
      );
      setStatus("failed");
    }
  };

  const textField = (
    name: "fullName" | "phone" | "country",
    label: string,
    autoComplete: string,
    type = "text",
  ) => (
    <div>
      <label htmlFor={`${id}-${name}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        type={type}
        value={values[name]}
        autoComplete={autoComplete}
        disabled={status === "saving"}
        aria-invalid={errors[name as keyof FieldErrors] ? true : undefined}
        aria-describedby={errors[name as keyof FieldErrors] ? `${id}-${name}-error` : undefined}
        onChange={(event) => set(name)(event.target.value)}
        className={inputClass}
      />
      {errors[name as keyof FieldErrors] ? (
        <p id={`${id}-${name}-error`} className={fieldErrorClass}>
          {errors[name as keyof FieldErrors]}
        </p>
      ) : null}
    </div>
  );

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-8 lg:mt-10">
      <div className="grid max-w-[46rem] gap-x-5 gap-y-7 sm:grid-cols-2 lg:gap-y-9">
        {textField("fullName", "Full name", "name")}
        <div>
          <label htmlFor={`${id}-email`} className={labelClass}>
            Email · verified
          </label>
          <input
            id={`${id}-email`}
            type="email"
            value={values.email}
            readOnly
            className={inputClass}
          />
        </div>
        {textField("phone", "Phone · optional", "tel", "tel")}
        {textField("country", "Country / region", "country-name")}
        <fieldset>
          <legend className={labelClass}>Stories and offers · optional</legend>
          <label
            htmlFor={`${id}-stories`}
            className="border-rule text-navy-ink has-focus-visible:outline-navy-ink flex min-h-[46px] cursor-pointer items-center gap-2.5 border px-3 py-3 text-[13px] leading-snug has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
          >
            <input
              id={`${id}-stories`}
              type="checkbox"
              checked={values.storiesAndOffers}
              disabled={status === "saving"}
              onChange={(event) =>
                setValues((current) => ({ ...current, storiesAndOffers: event.target.checked }))
              }
              className="accent-navy-ink size-3.5 shrink-0"
            />
            Send occasional inspiration and offers
          </label>
        </fieldset>
      </div>

      {/* TEMPORARY: no endpoint stores the country or the offers preference yet. */}
      <p className="text-body mt-5 max-w-[46rem] text-[12px] leading-snug">
        The country and the stories-and-offers choice are kept in this browser tab only for now.
        They are not yet saved to your account, and are cleared when you sign out or close the tab.
      </p>

      <AccountNotice label="Your journeys, together" className="mt-10 max-w-[46rem] lg:mt-12">
        Bookings made with your verified email appear in your account. You can update these details
        later from Profile details.
      </AccountNotice>

      {status === "failed" ? (
        <p role="alert" className={fieldErrorClass}>
          {failure}
        </p>
      ) : null}

      <div className={cx(buttonRowClass, "mt-7")}>
        <button
          type="submit"
          disabled={status === "saving"}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {status === "saving" ? "Saving…" : "Finish setting up my account"}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </button>
        <Link href={userRoutes.home} className={secondaryButtonClass}>
          Return to the website
        </Link>
      </div>
    </form>
  );
}
