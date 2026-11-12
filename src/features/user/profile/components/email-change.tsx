"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
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
} from "@/features/user/account/components/account-ui";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import {
  confirmEmailChange,
  EMAIL_CODE_LENGTH,
  requestEmailChange,
} from "@/services/user/profile.service";
import { emailSchema } from "@/validation/email";

type FieldErrors = Partial<Record<"email" | "code", string>>;
type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; to: string }
  | { kind: "verifying"; to: string }
  | { kind: "error"; message: string; to: string | null };

const sentTo = (status: Status) =>
  status.kind === "sent" || status.kind === "verifying" || status.kind === "error"
    ? status.to
    : null;

/**
 * Figma C61 "A new email, securely confirmed.": a code is emailed to the new
 * address; the account keeps its current email until that code is confirmed.
 */
export function EmailChange({
  sentTo: initialSentTo,
}: {
  /** Set when Profile details already sent a code to this new address. */
  sentTo?: string;
} = {}) {
  const id = useId();
  const router = useRouter();
  const [email, setEmail] = useState(initialSentTo ?? "");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>(
    initialSentTo ? { kind: "sent", to: initialSentTo.toLowerCase() } : { kind: "idle" },
  );
  const codeSentTo = sentTo(status);
  const isBusy = status.kind === "sending" || status.kind === "verifying";

  const checkEmail = () => {
    const parsed = emailSchema.safeParse(email);
    if (parsed.success) return parsed.data;
    setErrors({ email: parsed.error.issues[0]?.message ?? "Enter a valid email address." });
    return null;
  };

  const onSendCode = async () => {
    const address = checkEmail();
    if (!address) return;
    setErrors({});
    setStatus({ kind: "sending" });
    try {
      const { sent_to } = await requestEmailChange(address);
      setCode("");
      setStatus({ kind: "sent", to: sent_to });
    } catch (error) {
      const inUse = isApiError(error) && error.status === 409;
      if (inUse) setErrors({ email: "This is already your account email." });
      setStatus(
        inUse
          ? { kind: "idle" }
          : {
              kind: "error",
              message: "We couldn’t send a code just now. Please try again.",
              to: null,
            },
      );
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = checkEmail();
    if (!address) return;
    if (codeSentTo !== address.toLowerCase()) {
      setErrors({ email: "Send a verification code to this address first." });
      return;
    }
    if (!new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(code)) {
      setErrors({ code: `Enter the ${EMAIL_CODE_LENGTH}-digit code from your new inbox.` });
      return;
    }
    setErrors({});
    setStatus({ kind: "verifying", to: codeSentTo });
    try {
      await confirmEmailChange(address, code);
      router.push(userRoutes.accountProfileSaved);
    } catch (error) {
      if (isApiError(error) && error.status === 400) {
        setErrors({ code: "That code is not right or has expired. Use the latest code we sent." });
        setStatus({ kind: "sent", to: codeSentTo });
        return;
      }
      setStatus({
        kind: "error",
        message: "We couldn’t verify your new email just now. Please try again.",
        to: codeSentTo,
      });
    }
  };

  return (
    <>
      <AccountHeading
        heading="A new email,"
        headingSerif="securely confirmed."
        subtitle="Verify the new address before it becomes your account email."
      />

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-8 lg:mt-10">
        <div className="max-w-[33rem] space-y-7 lg:space-y-9">
          <div>
            <label htmlFor={`${id}-email`} className={labelClass}>
              New email address *
            </label>
            <input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={isBusy}
              placeholder="Your new email address"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${id}-email-error` : `${id}-email-status`}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              className={inputClass}
            />
            {errors.email ? (
              <p id={`${id}-email-error`} className={fieldErrorClass}>
                {errors.email}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => void onSendCode()}
                disabled={isBusy}
                className="text-navy-ink focus-visible:outline-navy-ink min-h-11 text-[12px] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                {status.kind === "sending"
                  ? "Sending a code…"
                  : codeSentTo
                    ? "Send a new code"
                    : "Send a verification code"}
              </button>
              <p id={`${id}-email-status`} role="status" className="text-body text-[12px]">
                {codeSentTo ? `We sent a code to ${codeSentTo}.` : null}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-code`} className={labelClass}>
              Verification code
            </label>
            <input
              id={`${id}-code`}
              value={code}
              disabled={isBusy}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={EMAIL_CODE_LENGTH}
              placeholder="— — — — — —"
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={errors.code ? `${id}-code-error` : undefined}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ""));
                setErrors((current) => ({ ...current, code: undefined }));
              }}
              className={cx(inputClass, "tracking-[0.3em] placeholder:tracking-[0.2em]")}
            />
            {errors.code ? (
              <p id={`${id}-code-error`} className={fieldErrorClass}>
                {errors.code}
              </p>
            ) : null}
          </div>
        </div>

        <AccountNotice label="Your current email stays active" className="mt-8 max-w-[52rem]">
          Your account keeps using the verified address until the new address is confirmed. Use the
          latest code sent to your new inbox.
        </AccountNotice>

        {status.kind === "error" ? (
          <p role="alert" className={fieldErrorClass}>
            {status.message}
          </p>
        ) : null}

        <div className={cx(buttonRowClass, "mt-7")}>
          <button
            type="submit"
            disabled={isBusy}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            {status.kind === "verifying" ? "Verifying…" : "Verify new email"}
          </button>
          <Link href={userRoutes.accountProfile} className={secondaryButtonClass}>
            Keep current email
          </Link>
        </div>
      </form>
    </>
  );
}
