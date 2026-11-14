"use client";

import { ArrowRight, UserRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode, type SubmitEvent } from "react";

import {
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_TYPES,
  profileDetailsSchema,
  type CustomerProfile,
  type ProfileField,
} from "@/features/user/profile/types/profile.schema";
import { cx } from "@/lib/cx";

type FieldErrors = Partial<Record<ProfileField | "photo", string>>;

const inputClass =
  "border-field-line text-midnight placeholder:text-slate-ink/70 h-[3.25rem] w-full rounded-none border bg-white px-4 text-[13px] outline-none transition-colors focus:border-brand-950 aria-invalid:border-red-700 read-only:bg-[#fafafa] read-only:text-slate-ink";

interface FieldProps {
  name: ProfileField;
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
  }) => ReactNode;
}

function Field({ name, label, error, required, className, children }: FieldProps) {
  const id = `profile-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-midnight mb-2 block text-[11px]">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} className="mt-1.5 text-[11px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export interface ProfileDetailsFormProps {
  profile: CustomerProfile;
  className?: string;
}

/** "Your details" form: profile photo, contact details and optional billing details. */
export function ProfileDetailsForm({ profile, className }: ProfileDetailsFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ name: string; url: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoErrorId = useId();

  // Release the preview's object URL when it is replaced or the form unmounts.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  useEffect(() => {
    if (isEmailEditable) emailRef.current?.focus();
  }, [isEmailEditable]);

  function handlePhotoChange(file: File | undefined) {
    setStatus(null);
    setErrors((current) => ({ ...current, photo: undefined }));
    if (!file) {
      setPhoto(null);
      return;
    }
    const message = !PROFILE_PHOTO_TYPES.some((type) => type === file.type)
      ? "Choose a JPG or PNG image."
      : file.size > PROFILE_PHOTO_MAX_BYTES
        ? "Choose an image smaller than 5 MB."
        : null;
    if (message) {
      setErrors((current) => ({ ...current, photo: message }));
      setPhoto(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    setPhoto({ name: file.name, url: URL.createObjectURL(file) });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      Object.keys(profileDetailsSchema.shape).map((key) => [key, String(data.get(key) ?? "")]),
    );
    const result = profileDetailsSchema.safeParse(values);

    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && field in profileDetailsSchema.shape) {
          next[field as ProfileField] ??= issue.message;
        }
      }
      setErrors(next);
      setStatus(null);
      const firstInvalid = Object.keys(next)[0];
      if (firstInvalid) document.getElementById(`profile-${firstInvalid}`)?.focus();
      return;
    }

    setErrors({});
    // TODO: send `result.data` (and the photo file) to the account API once it is ready.
    setStatus("Your details have been updated.");
  }

  function handleReset() {
    setErrors({});
    setStatus(null);
    setPhoto(null);
    setIsEmailEditable(false);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onReset={handleReset}
      className={cx("text-midnight", className)}
    >
      {/* Profile photo */}
      <div className="flex items-start gap-4">
        {photo ? (
          <Image
            src={photo.url}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <UserRound aria-hidden="true" strokeWidth={1.25} className="size-8 shrink-0" />
        )}
        <div className="w-full max-w-[14rem] min-w-0">
          <label htmlFor="profile-photo" className="mb-2 block text-[10px]">
            Profile photo · optional
          </label>
          <label
            className={cx(
              "border-field-line has-focus-visible:border-brand-950 flex h-[3.25rem] cursor-pointer items-center border bg-white px-4 text-[13px] transition-colors hover:border-current",
              errors.photo && "border-red-700",
            )}
          >
            <input
              ref={photoInputRef}
              id="profile-photo"
              name="photo"
              type="file"
              accept={PROFILE_PHOTO_TYPES.join(",")}
              aria-invalid={errors.photo ? true : undefined}
              aria-describedby={errors.photo ? photoErrorId : undefined}
              onChange={(event) => handlePhotoChange(event.currentTarget.files?.[0])}
              className="sr-only"
            />
            <span className="truncate">{photo?.name ?? "Choose a JPG or PNG"}</span>
          </label>
          {errors.photo && (
            <p id={photoErrorId} className="mt-1.5 text-[11px] text-red-700">
              {errors.photo}
            </p>
          )}
        </div>
      </div>

      {/* Contact details */}
      <div className="mt-8 grid gap-x-3 gap-y-5 md:mt-9 md:grid-cols-2 md:gap-y-8">
        <Field name="fullName" label="Full name" required error={errors.fullName}>
          {(props) => (
            <input
              {...props}
              name="fullName"
              autoComplete="name"
              required
              defaultValue={profile.fullName}
              className={inputClass}
            />
          )}
        </Field>
        <Field name="email" label="Email address" error={errors.email}>
          {(props) => (
            <input
              {...props}
              ref={emailRef}
              name="email"
              type="email"
              autoComplete="email"
              readOnly={!isEmailEditable}
              defaultValue={profile.email}
              className={inputClass}
            />
          )}
        </Field>
        <Field name="phone" label="Phone number" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 9XXXX XXXXX"
              defaultValue={profile.phone}
              className={inputClass}
            />
          )}
        </Field>
        <Field name="country" label="Country / region" error={errors.country}>
          {(props) => (
            <input
              {...props}
              name="country"
              autoComplete="country-name"
              defaultValue={profile.country}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      {!isEmailEditable && (
        <button
          type="button"
          onClick={() => setIsEmailEditable(true)}
          className="focus-visible:outline-brand-950 mt-6 px-4 py-3 text-[11px] font-medium underline-offset-4 hover:underline focus-visible:outline-2"
        >
          Change email address
        </button>
      )}

      {/* Billing details */}
      <fieldset className="border-field-line mt-6 border-t pt-8 md:pt-10">
        <legend className="contents">
          <h2 className="text-[1.75rem] leading-tight tracking-[-0.02em]">
            Billing details · optional
          </h2>
        </legend>
        <div className="mt-6 grid gap-x-3 gap-y-5 md:grid-cols-2 md:gap-y-8">
          <Field name="billingAddress" label="Address" error={errors.billingAddress}>
            {(props) => (
              <input
                {...props}
                name="billingAddress"
                autoComplete="street-address"
                placeholder="Your billing address"
                defaultValue={profile.billingAddress}
                className={inputClass}
              />
            )}
          </Field>
          <Field name="city" label="City" error={errors.city}>
            {(props) => (
              <input
                {...props}
                name="city"
                autoComplete="address-level2"
                placeholder="City"
                defaultValue={profile.city}
                className={inputClass}
              />
            )}
          </Field>
          <Field name="state" label="State" error={errors.state}>
            {(props) => (
              <input
                {...props}
                name="state"
                autoComplete="address-level1"
                placeholder="State"
                defaultValue={profile.state}
                className={inputClass}
              />
            )}
          </Field>
          <Field name="postalCode" label="Postal code" error={errors.postalCode}>
            {(props) => (
              <input
                {...props}
                name="postalCode"
                autoComplete="postal-code"
                placeholder="Your postal code"
                defaultValue={profile.postalCode}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="from-brand-50 to-brand-500/80 focus-visible:outline-brand-950 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 bg-linear-to-r text-[11px] font-medium transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-[10.5rem]"
        >
          Save profile
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </button>
        <button
          type="reset"
          className="border-midnight focus-visible:outline-brand-950 inline-flex h-[3.25rem] w-full items-center justify-center border bg-white text-[11px] font-medium transition-colors hover:bg-pearl focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-[10.5rem]"
        >
          Cancel
        </button>
      </div>

      <p role="status" className="text-forest mt-4 min-h-5 text-[13px]">
        {status}
      </p>
    </form>
  );
}
