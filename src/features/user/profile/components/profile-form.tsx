"use client";

import { ArrowRight, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

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
import { accountErrorMessage } from "@/features/user/account/utils/account-error";
import { updateSessionUser } from "@/features/user/auth/session";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  getMyProfile,
  getProfileExtras,
  requestEmailChange,
  updateMyProfile,
  updateProfileExtras,
  type AccountUser,
  type ProfileExtras,
} from "@/services/user/profile.service";
import { emailSchema } from "@/validation/email";

import { PHONE_FORMAT_HINT, toE164 } from "../utils/phone";

const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** PATCH /me: `name` up to 255 characters. */
const NAME_MAX = 255;

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

interface ProfileData {
  user: AccountUser;
  /** TEMPORARY (mock): no endpoint stores country or billing details. */
  extras: ProfileExtras;
}

const toValues = ({ user, extras }: ProfileData): Values => ({
  fullName: user.fullName,
  email: user.email,
  phone: user.phone ?? "",
  country: extras.country ?? "",
  address: extras.billing.address ?? "",
  city: extras.billing.city ?? "",
  state: extras.billing.state ?? "",
  postalCode: extras.billing.postal_code ?? "",
});

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.fullName.trim()) errors.fullName = "Please enter your full name.";
  else if (values.fullName.trim().length > NAME_MAX)
    errors.fullName = `Please use up to ${NAME_MAX} characters.`;
  const email = emailSchema.safeParse(values.email);
  if (!email.success)
    errors.email = email.error.issues[0]?.message ?? "Enter a valid email address.";
  if (values.phone.trim() && !toE164(values.phone)) errors.phone = PHONE_FORMAT_HINT;
  if (values.postalCode && !/^[A-Za-z0-9 -]{3,10}$/.test(values.postalCode.trim()))
    errors.postalCode = "Please check the postal code.";
  return errors;
}

const orNull = (value: string) => value.trim() || null;

const isSameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function loadProfile(signal: AbortSignal): Promise<ProfileData> {
  const [user, extras] = await Promise.all([getMyProfile(signal), getProfileExtras(signal)]);
  return { user, extras };
}

/**
 * Figma C52 "Your details, kept personal.": name and phone (PATCH /me), the
 * email address (its own verification flow) and — TEMPORARY, kept in this
 * browser only — country and billing details, which no endpoint stores yet.
 */
export function ProfileDetails() {
  const query = useApiQuery(loadProfile, "my-profile");

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

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "failed"; message: string };

function ProfileForm({
  profile,
  onSaved,
}: {
  profile: ProfileData;
  onSaved: (profile: ProfileData) => void;
}) {
  const id = useId();
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => toValues(profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const isSubmitting = useRef(false);
  const currentEmail = profile.user.email;

  const set = (name: keyof Values) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setStatus({ kind: "idle" });
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
    if (isSubmitting.current) return; // one save, however often it is submitted
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    isSubmitting.current = true;
    setStatus({ kind: "saving" });
    let saved: AccountUser;
    try {
      saved = await updateMyProfile({
        name: values.fullName.trim(),
        phone: values.phone.trim() ? toE164(values.phone) : null,
      });
      const extras = await updateProfileExtras({
        country: orNull(values.country),
        billing: {
          address: orNull(values.address),
          city: orNull(values.city),
          state: orNull(values.state),
          postal_code: orNull(values.postalCode),
        },
      });
      onSaved({ user: saved, extras });
      updateSessionUser({
        id: saved.id,
        fullName: saved.fullName,
        email: saved.email,
        role: saved.role,
      });
    } catch (error) {
      isSubmitting.current = false;
      if (isApiError(error) && error.status === 400) {
        // Validation messages name the field ("phone must be …").
        const text = getBackendErrorDetails(error).messages.join(" ");
        setErrors({
          ...(/phone/i.test(text) ? { phone: PHONE_FORMAT_HINT } : {}),
          ...(/name/i.test(text) ? { fullName: "Please check your full name." } : {}),
        });
        setStatus({ kind: "failed", message: "Please check your name and phone number." });
        return;
      }
      setStatus({
        kind: "failed",
        message: accountErrorMessage(
          error,
          "We couldn’t save your details just now. Please try again.",
        ),
      });
      return;
    }

    // A new email only replaces the current one once its link is confirmed (Figma C61).
    if (!isSameEmail(values.email, currentEmail)) {
      try {
        const newEmail = values.email.trim();
        const result = await requestEmailChange(newEmail);
        router.push(
          result.verification_required
            ? userRoutes.accountProfileEmailFor(newEmail)
            : userRoutes.accountProfileSaved,
        );
      } catch (error) {
        isSubmitting.current = false;
        setErrors({
          email: accountErrorMessage(error, "We couldn’t start the change of email.", {
            EMAIL_EXISTS: "This email is already used by another account.",
            EMAIL_UNCHANGED: "This is already your account email.",
            EMAIL_DELIVERY_FAILED: "We couldn’t send an email to this address. Please check it.",
          }),
        });
        setStatus({
          kind: "failed",
          message: "Your other details were saved; your email address was not changed.",
        });
      }
      return;
    }
    router.push(userRoutes.accountProfileSaved);
  };

  const emailChanged = !isSameEmail(values.email, currentEmail);

  const onCancel = () => {
    setValues(toValues(profile));
    setErrors({});
    setPhotoName(null);
    setStatus({ kind: "idle" });
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
          {/* No photo upload endpoint yet: the file is checked here but not sent. */}
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
              We will email a confirmation link to this address. {currentEmail} stays active until
              then.
            </p>
          ) : null}
        </div>
        {field("phone", "Phone number", {
          autoComplete: "tel",
          type: "tel",
          placeholder: "+91 98765 43210",
        })}
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

      {status.kind === "failed" ? (
        <p role="alert" className={`${fieldErrorClass} mt-8`}>
          {status.message}
        </p>
      ) : null}

      <div className={`${buttonRowClass} mt-8`}>
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {status.kind === "saving" ? "Saving…" : "Save profile"}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={status.kind === "saving"}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
