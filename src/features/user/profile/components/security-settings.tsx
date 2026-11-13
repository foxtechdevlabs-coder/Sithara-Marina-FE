"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  Card,
  CardTitle,
  fieldErrorClass,
  inputClass,
  labelClass,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  SectionRule,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";
import { userRoutes } from "@/constants/routes";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/services/user/auth.service";
import { changeMyPassword } from "@/services/user/profile.service";
import { accountErrorMessage } from "@/features/user/account/utils/account-error";
import { replaceAccessToken } from "@/features/user/auth/session";
import { isApiError } from "@/services/http/api-error";

type Field = "current" | "next" | "confirm";
type FieldErrors = Partial<Record<Field, string>>;
type Status = "idle" | "saving" | "saved" | "failed";

const PASSWORD_RULE = `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;

function validate(values: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.current) errors.current = "Please enter your current password.";
  if (values.next.length < PASSWORD_MIN_LENGTH || values.next.length > PASSWORD_MAX_LENGTH)
    errors.next = PASSWORD_RULE;
  else if (values.next === values.current)
    errors.next = "Please choose a password different from your current one.";
  if (!values.confirm) errors.confirm = "Please re-enter the new password.";
  else if (values.confirm !== values.next) errors.confirm = "The passwords do not match.";
  return errors;
}

const EMPTY: Record<Field, string> = { current: "", next: "", confirm: "" };

/** Figma C54 "A secure place for your journeys.": change password, session, advice. */
export function SecuritySettings() {
  const id = useId();
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (status === "saving") return; // one change, however often it is submitted
    setStatus("saving");
    try {
      const { access_token } = await changeMyPassword({
        current_password: values.current,
        new_password: values.next,
      });
      // The change ends other sessions; this one continues with the new token.
      replaceAccessToken(access_token);
      setValues(EMPTY);
      setStatus("saved");
      router.push(userRoutes.accountSecurityUpdated);
    } catch (error) {
      if (isApiError(error) && error.code === "INVALID_CURRENT_PASSWORD") {
        setErrors({ current: "Your current password is not correct." });
        setStatus("idle");
        return;
      }
      if (isApiError(error) && error.code === "PASSWORD_UNCHANGED") {
        setErrors({ next: "Please choose a password different from your current one." });
        setStatus("idle");
        return;
      }
      setFailure(
        accountErrorMessage(error, "We couldn’t update your password just now. Please try again."),
      );
      setStatus("failed");
    }
  };

  const field = (name: Field, label: string, placeholder: string, autoComplete: string) => {
    const error = errors[name];
    return (
      <div>
        <label htmlFor={`${id}-${name}`} className={labelClass}>
          {label} *
        </label>
        <input
          id={`${id}-${name}`}
          type="password"
          value={values[name]}
          onChange={(event) => {
            setValues((current) => ({ ...current, [name]: event.target.value }));
            setStatus("idle");
          }}
          required
          placeholder={placeholder}
          autoComplete={autoComplete}
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
    <>
      <AccountHeading
        heading="A secure place"
        headingSerif="for your journeys."
        subtitle="Manage your password and account access."
      />

      <section aria-labelledby={`${id}-title`} className="mt-8 lg:mt-10">
        <CardTitle>
          <span id={`${id}-title`}>Change password</span>
        </CardTitle>
        <form
          onSubmit={(event) => void onSubmit(event)}
          noValidate
          className="mt-6 max-w-[33rem] space-y-7 lg:space-y-9"
        >
          {field("current", "Current password", "Your current password", "current-password")}
          {field("next", "New password", "Choose a secure password", "new-password")}
          {field("confirm", "Confirm new password", "Re-enter the new password", "new-password")}

          <div>
            <p role="status" className="text-body min-h-5 text-[13px]">
              {status === "saved" ? "Your password has been updated." : null}
            </p>
            {status === "failed" ? (
              <p role="alert" className={fieldErrorClass}>
                {failure}
              </p>
            ) : null}
            <div className={`${buttonRowClass} mt-3`}>
              <button
                type="submit"
                disabled={status === "saving"}
                className={primaryButtonClass}
                style={primaryButtonStyle}
              >
                {status === "saving" ? "Updating…" : "Update password"}
              </button>
              <Link href={userRoutes.forgotPassword} className={secondaryButtonClass}>
                Forgot your current password?
              </Link>
            </div>
          </div>
        </form>
      </section>

      <SectionRule className="mt-8 lg:mt-10" />

      <Card title="Your current session" className="mt-8">
        <MetaLines lines={["This device · Signed in securely"]} />
      </Card>

      <AccountNotice label="Keep your account personal" className="mt-5">
        Use a unique password and sign out on shared devices. Our team will never ask you for your
        password.
      </AccountNotice>
    </>
  );
}
