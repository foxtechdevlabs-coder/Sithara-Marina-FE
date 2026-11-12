"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import {
  getMyProfile,
  getNotificationPreferences,
  updateMyProfile,
  updateNotificationPreferences,
} from "@/services/user/profile.service";

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

function loadSetup(signal: AbortSignal) {
  return Promise.all([getMyProfile(signal), getNotificationPreferences(signal)]);
}

interface Values {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  storiesAndOffers: boolean;
}
type FieldErrors = Partial<Record<"fullName" | "phone", string>>;

/**
 * Figma C58 "Make your account your own.": the first stop after the email is
 * verified. No sidebar yet; the details can be changed later in Profile details.
 */
export function AccountSetup() {
  const query = useApiQuery(loadSetup, "account-setup");
  const user = useAuthSession()?.user;

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
          initial={{
            // The verified session's own name and email come first.
            fullName: user?.fullName ?? query.data[0].full_name,
            email: user?.email ?? query.data[0].email,
            phone: query.data[0].phone ?? "",
            country: query.data[0].country ?? "",
            storiesAndOffers: query.data[1].stories_and_offers,
          }}
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

  const set = (name: "fullName" | "phone" | "country") => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: FieldErrors = {};
    if (!values.fullName.trim()) found.fullName = "Please enter your full name.";
    if (values.phone && !/^\+?[\d\sX()-]{7,20}$/i.test(values.phone.trim()))
      found.phone = "Please enter a phone number with its country code, e.g. +91 98765 43210.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("saving");
    try {
      await Promise.all([
        updateMyProfile({
          full_name: values.fullName.trim(),
          phone: values.phone.trim() || null,
          country: values.country.trim() || null,
        }),
        updateNotificationPreferences({ stories_and_offers: values.storiesAndOffers }),
      ]);
      router.push(userRoutes.account);
    } catch {
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

      <AccountNotice label="Your journeys, together" className="mt-10 max-w-[46rem] lg:mt-12">
        Bookings made with your verified email appear in your account. You can update these details
        later from Profile details.
      </AccountNotice>

      {status === "failed" ? (
        <p role="alert" className={fieldErrorClass}>
          We couldn’t save your details just now. Please try again.
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
