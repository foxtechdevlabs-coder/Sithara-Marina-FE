"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

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
import { accountErrorMessage } from "@/features/user/account/utils/account-error";
import { takeTokenFromUrl } from "@/features/user/auth/components/verify-email-page";
import { updateSessionUser } from "@/features/user/auth/session";
import { cx } from "@/lib/cx";
import { requestEmailChange, verifyEmailChange } from "@/services/user/profile.service";
import { emailSchema } from "@/validation/email";

type FieldErrors = Partial<Record<"email" | "link", string>>;
type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "verifying" }
  | { kind: "error"; message: string };

const REQUEST_ERRORS = {
  EMAIL_UNCHANGED: "This is already your account email.",
  EMAIL_EXISTS: "This email is already used by another account.",
  EMAIL_DELIVERY_FAILED: "We couldn’t send an email to this address. Please check it.",
  SERVICE_UNAVAILABLE: "Emails can’t be sent just now. Please try again in a few minutes.",
};
const VERIFY_ERRORS = {
  INVALID_TOKEN:
    "This link is not valid, has expired or was already used. Please use the latest link we sent.",
  EMAIL_EXISTS: "This email was taken by another account in the meantime.",
};

/**
 * The `<id>.<secret>` token from a pasted confirmation link (`#token=` or
 * `?token=`), or the pasted token itself.
 */
function tokenFrom(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const match = /[#?&]token=([^&#\s]+)/.exec(value);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return /^[^\s./]+\.[^\s./]+$/.test(value) ? value : null;
}

/**
 * Figma C61 "A new email, securely confirmed.": POST /me/email/change emails a
 * confirmation link to the new address; POST /me/email/verify confirms it.
 * The current email stays active until then. Opened from that link
 * (`#token=…`), the page confirms it at once; the link can also be pasted.
 */
export function EmailChange({
  sentTo: initialSentTo,
}: {
  /** Set when Profile details already asked for a link to this new address. */
  sentTo?: string;
} = {}) {
  const id = useId();
  const router = useRouter();
  const [email, setEmail] = useState(initialSentTo ?? "");
  const [sentTo, setSentTo] = useState<string | null>(initialSentTo?.toLowerCase() ?? null);
  const [link, setLink] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const isBusy = status.kind === "sending" || status.kind === "verifying";
  const inFlight = useRef(false);

  const verify = async (token: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setErrors({});
    setStatus({ kind: "verifying" });
    try {
      const user = await verifyEmailChange(token);
      updateSessionUser({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      });
      router.push(userRoutes.accountProfileSaved);
    } catch (error) {
      inFlight.current = false;
      setStatus({ kind: "idle" });
      setErrors({
        link: accountErrorMessage(
          error,
          "We couldn’t confirm your new email just now.",
          VERIFY_ERRORS,
        ),
      });
    }
  };

  // Opened from the emailed link: confirm it straight away (the token is
  // removed from the address bar and never stored).
  const verifyRef = useRef(verify);
  useEffect(() => {
    verifyRef.current = verify;
  });
  useEffect(() => {
    const token = takeTokenFromUrl();
    if (token) void verifyRef.current(token);
  }, []);

  const onSendLink = async () => {
    if (inFlight.current) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message ?? "Enter a valid email address." });
      return;
    }
    inFlight.current = true;
    setErrors({});
    setStatus({ kind: "sending" });
    try {
      const result = await requestEmailChange(parsed.data);
      if (!result.verification_required) {
        router.push(userRoutes.accountProfileSaved);
        return;
      }
      setSentTo(parsed.data.toLowerCase());
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "idle" });
      setErrors({
        email: accountErrorMessage(
          error,
          "We couldn’t send a confirmation link just now.",
          REQUEST_ERRORS,
        ),
      });
    } finally {
      inFlight.current = false;
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = tokenFrom(link);
    if (!token) {
      setErrors({
        link: sentTo
          ? "Open the link in the email we sent, or paste the whole link here."
          : "First send a confirmation link to your new address.",
      });
      return;
    }
    void verify(token);
  };

  return (
    <>
      <AccountHeading
        heading="A new email,"
        headingSerif="securely confirmed."
        subtitle="Verify the new address before it becomes your account email."
      />

      <form onSubmit={onSubmit} noValidate className="mt-8 lg:mt-10">
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
                onClick={() => void onSendLink()}
                disabled={isBusy}
                className="text-navy-ink focus-visible:outline-navy-ink min-h-11 text-[12px] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                {status.kind === "sending"
                  ? "Sending a link…"
                  : sentTo
                    ? "Send a new link"
                    : "Send a confirmation link"}
              </button>
              <p id={`${id}-email-status`} role="status" className="text-body text-[12px]">
                {sentTo ? `We sent a confirmation link to ${sentTo}.` : null}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-link`} className={labelClass}>
              Verification link
            </label>
            <input
              id={`${id}-link`}
              value={link}
              disabled={isBusy}
              autoComplete="off"
              placeholder="Paste the link from your email"
              aria-invalid={errors.link ? true : undefined}
              aria-describedby={errors.link ? `${id}-link-error` : `${id}-link-hint`}
              onChange={(event) => {
                setLink(event.target.value);
                setErrors((current) => ({ ...current, link: undefined }));
              }}
              className={cx(inputClass)}
            />
            {errors.link ? (
              <p id={`${id}-link-error`} role="alert" className={fieldErrorClass}>
                {errors.link}
              </p>
            ) : (
              <p id={`${id}-link-hint`} className="text-body mt-2 text-[12px]">
                Opening the link in the email confirms it here automatically.
              </p>
            )}
          </div>
        </div>

        <AccountNotice label="Your current email stays active" className="mt-8 max-w-[52rem]">
          Your account keeps using the verified address until the new address is confirmed. Use the
          latest link sent to your new inbox.
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
