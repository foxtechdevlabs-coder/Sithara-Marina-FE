"use client";

import { ArrowRight, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ChangeEvent, type FormEvent } from "react";

import {
  AccountHeading,
  buttonRowClass,
  CardTitle,
  fieldErrorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  SectionRule,
  secondaryButtonClass,
  textButtonClass,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { isApiError } from "@/services/http/api-error";
import {
  getMyProfile,
  requestEmailChange,
  updateMyProfile,
  type CustomerProfile,
} from "@/services/user/profile.service";
import { emailSchema } from "@/validation/email";

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

interface Values {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}
type FieldErrors = Partial<Record<keyof Values | "photo", string>>;

const toValues = (profile: CustomerProfile): Values => ({
  fullName: profile.full_name,
  email: profile.email,
  phone: profile.phone ?? "",
  country: profile.country ?? "",
  address: profile.billing.address ?? "",
  city: profile.billing.city ?? "",
  state: profile.billing.state ?? "",
  postalCode: profile.billing.postal_code ?? "",
});

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.fullName.trim()) errors.fullName = "Please enter your full name.";
  else if (values.fullName.trim().length > 120)
    errors.fullName = "Please use up to 120 characters.";
  const email = emailSchema.safeParse(values.email);
  if (!email.success)
    errors.email = email.error.issues[0]?.message ?? "Enter a valid email address.";
  if (values.phone && !/^\+?[\d\sX()-]{7,20}$/i.test(values.phone.trim()))
    errors.phone = "Please enter a phone number with its country code, e.g. +91 98765 43210.";
  if (values.postalCode && !/^[A-Za-z0-9 -]{3,10}$/.test(values.postalCode.trim()))
    errors.postalCode = "Please check the postal code.";
  return errors;
}

const orNull = (value: string) => value.trim() || null;

const isSameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Figma "Your details, kept personal.": profile and optional billing details. */
export function ProfileDetails() {
  const query = useApiQuery(getMyProfile, "my-profile");

  return (
    <>
      <AccountHeading
        heading="Your details,"
        headingSerif="kept personal."
        subtitle="Update your profile and preferred contact details."
      />
      {query.data ? (
        <ProfileForm profile={query.data} onSaved={query.setData} />
      ) : (
        <QueryFallback query={query} loadingLabel="Loading your details" />
      )}
    </>
  );
}

type Status = "idle" | "saving" | "saved" | "failed";

function ProfileForm({
  profile,
  onSaved,
}: {
  profile: CustomerProfile;
  onSaved: (profile: CustomerProfile) => void;
}) {
  const id = useId();
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => toValues(profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const set = (name: keyof Values) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setStatus("idle");
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrors((current) => ({ ...current, photo: undefined }));
    if (!file) return setPhotoName(null);
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      event.target.value = "";
      setPhotoName(null);
      setErrors((current) => ({ ...current, photo: "Please choose a JPG or PNG under 5 MB." }));
      return;
    }
    setPhotoName(file.name);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("saving");
    try {
      const saved = await updateMyProfile({
        full_name: values.fullName.trim(),
        phone: orNull(values.phone),
        country: orNull(values.country),
        billing: {
          address: orNull(values.address),
          city: orNull(values.city),
          state: orNull(values.state),
          postal_code: orNull(values.postalCode),
        },
      });
      onSaved(saved);

      // A new email only replaces the current one once its code is confirmed (Figma C61).
      if (!isSameEmail(values.email, profile.email)) {
        const { sent_to } = await requestEmailChange(values.email.trim());
        router.push(userRoutes.accountProfileEmailFor(sent_to));
        return;
      }
      setValues(toValues(saved));
      setStatus("saved");
      router.push(userRoutes.accountProfileSaved);
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        setErrors({ email: "This email can’t be used. Please choose another address." });
        setStatus("idle");
        return;
      }
      setStatus("failed");
    }
  };

  const emailChanged = !isSameEmail(values.email, profile.email);

  const onCancel = () => {
    setValues(toValues(profile));
    setErrors({});
    setPhotoName(null);
    setStatus("idle");
  };

  const field = (
    name: keyof Values,
    label: string,
    options: {
      required?: boolean;
      placeholder?: string;
      autoComplete?: string;
      type?: string;
    } = {},
  ) => {
    const error = errors[name];
    return (
      <div>
        <label htmlFor={`${id}-${name}`} className={labelClass}>
          {label}
          {options.required ? " *" : null}
        </label>
        <input
          id={`${id}-${name}`}
          type={options.type ?? "text"}
          value={values[name]}
          onChange={set(name)}
          required={options.required}
          placeholder={options.placeholder}
          autoComplete={options.autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-${name}-error` : undefined}
          className={inputClass}
        />
        {error ? (
          <p id={`${id}-${name}-error`} className={fieldErrorClass}>
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-8 max-w-[56rem]">
      <div className="flex items-start gap-5">
        <UserRound
          aria-hidden="true"
          strokeWidth={1.25}
          className="text-navy-ink mt-5 size-7 shrink-0"
        />
        <div className="w-full max-w-[12.5rem]">
          <p className={labelClass} id={`${id}-photo-label`}>
            Profile photo · optional
          </p>
          <label className="border-rule text-navy-ink focus-within:outline-navy-ink flex h-[50px] cursor-pointer items-center border px-4 text-[13px] focus-within:outline-2 focus-within:outline-offset-2">
            <span className="truncate">{photoName ?? "Choose a JPG or PNG"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={onPhoto}
              aria-labelledby={`${id}-photo-label`}
              aria-describedby={errors.photo ? `${id}-photo-error` : undefined}
              className="sr-only"
            />
          </label>
          {errors.photo ? (
            <p id={`${id}-photo-error`} className={fieldErrorClass}>
              {errors.photo}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:gap-y-9">
        {field("fullName", "Full name", { required: true, autoComplete: "name" })}
        <div>
          {field("email", "Email address", { autoComplete: "email", type: "email" })}
          {emailChanged && !errors.email ? (
            <p className="text-body mt-2 text-[12px] leading-snug" role="status">
              We will send a code to confirm this address. {profile.email} stays active until then.
            </p>
          ) : null}
        </div>
        {field("phone", "Phone number", { autoComplete: "tel", type: "tel" })}
        {field("country", "Country / region", { autoComplete: "country-name" })}
      </div>

      <Link href={userRoutes.accountProfileEmail} className={`${textButtonClass} mt-6`}>
        Change email address
      </Link>

      <SectionRule className="mt-6 mb-8" />

      <CardTitle>
        Billing details <span className="text-body">· optional</span>
      </CardTitle>
      <div className="mt-6 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:gap-y-9">
        {field("address", "Address", {
          placeholder: "Your billing address",
          autoComplete: "street-address",
        })}
        {field("city", "City", { autoComplete: "address-level2" })}
        {field("state", "State", { autoComplete: "address-level1" })}
        {field("postalCode", "Postal code", {
          placeholder: "Your postal code",
          autoComplete: "postal-code",
        })}
      </div>

      <p role="status" className="text-body mt-8 min-h-5 text-[13px]">
        {status === "saved" ? "Your profile has been saved." : null}
      </p>
      {status === "failed" ? (
        <p role="alert" className={fieldErrorClass}>
          We couldn’t save your details just now. Please try again.
        </p>
      ) : null}

      <div className={`${buttonRowClass} mt-4`}>
        <button
          type="submit"
          disabled={status === "saving"}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {status === "saving" ? "Saving…" : "Save profile"}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={status === "saving"}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
