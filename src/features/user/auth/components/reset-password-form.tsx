"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  AUTH_EMAIL_COOLDOWN_SECONDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  requestPasswordReset,
  resetPassword,
  verifyResetLink,
  type VerifyResetLinkResponse,
} from "@/services/user/auth.service";

import { useCooldown } from "../hooks/use-cooldown";
import { commonAuthErrorMessage } from "../utils/auth-error-message";
import { saveAuthFlash } from "../utils/auth-flash";
import { formatCountdown } from "../utils/format-wait";
import {
  clearPendingPasswordReset,
  readPendingPasswordReset,
  savePendingPasswordReset,
  subscribePendingPasswordReset,
} from "../utils/pending-password-reset";
import { AccountPageShell } from "./account-page-shell";
import {
  fieldErrorClass,
  formAlertClass,
  inputClass,
  labelClass,
  PRIMARY_GRADIENT,
  primaryButtonClass,
  secondaryButtonClass,
} from "./auth-form-styles";

type FieldName = "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

/**
 * - `inbox`:     no link opened yet (straight from /forgot-password)
 * - `verifying`: checking the emailed link with the backend
 * - `ready`:     link confirmed; a short-lived reset token is held in memory
 * - `invalid`:   the link or the reset session is invalid / expired / used
 * - `failed`:    the link could not be checked (network or server problem)
 */
type Mode = "loading" | "inbox" | "verifying" | "ready" | "invalid" | "failed";

type Notice = { tone: "info" | "error"; text: string } | null;

const FIELDS: readonly { name: FieldName; label: string; placeholder: string }[] = [
  { name: "newPassword", label: "New password", placeholder: "Choose a secure password" },
  { name: "confirmPassword", label: "Confirm new password", placeholder: "Re-enter your password" },
];

const SECURE_RETURN = { heading: "A secure", headingSerif: "return." };
const CHECKING_LINK = {
  ...SECURE_RETURN,
  subtitle: "We’re preparing your secure password reset.",
};
const PAGE_COPY: Record<Mode, { heading: string; headingSerif: string; subtitle: string }> = {
  loading: CHECKING_LINK,
  verifying: CHECKING_LINK,
  inbox: {
    heading: "Check your",
    headingSerif: "inbox.",
    subtitle: "If an account is associated with that address, a password reset link is on its way.",
  },
  ready: { ...SECURE_RETURN, subtitle: "Choose a new password for your account." },
  invalid: { ...SECURE_RETURN, subtitle: "This password reset link can’t be used." },
  failed: { ...SECURE_RETURN, subtitle: "We couldn’t check your reset link." },
};

const PASSWORD_RULE = `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;
const INVALID_LINK =
  "This password reset link is invalid or has expired. Each link works once — request a new one below.";

function validate(data: FormData): FieldErrors {
  const newPassword = String(data.get("newPassword") ?? "");
  const confirmPassword = String(data.get("confirmPassword") ?? "");
  const errors: FieldErrors = {};
  if (!newPassword) errors.newPassword = "Choose a new password.";
  else if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH)
    errors.newPassword = PASSWORD_RULE;
  if (!confirmPassword) errors.confirmPassword = "Re-enter your new password.";
  else if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords don’t match.";
  return errors;
}

/** One verify-reset-link call per link token, even under React StrictMode. */
const inFlight = new Map<string, Promise<VerifyResetLinkResponse>>();
function verifyLinkOnce(token: string): Promise<VerifyResetLinkResponse> {
  let request = inFlight.get(token);
  if (!request) {
    request = verifyResetLink({ token });
    inFlight.set(token, request);
  }
  return request;
}

/**
 * Reads the emailed token from `#token=…`, or from `?token=…`, then removes it
 * from the address bar to keep the secret out of history, bookmarks and the
 * Referer header. Returns `null` when the URL has no token, and `""` when the
 * link carries an empty one (a broken link, never sent to the backend).
 */
function takeTokenFromUrl(): string | null {
  const url = new URL(window.location.href);
  const fragmentToken = new URLSearchParams(url.hash.slice(1)).get("token");
  const queryToken = url.searchParams.get("token");
  if (fragmentToken === null && queryToken === null) return null;
  url.searchParams.delete("token");
  window.history.replaceState(null, "", url.pathname + url.search);
  return fragmentToken || queryToken || "";
}

/**
 * Reset-password page. Sent here from /forgot-password it says to check the
 * inbox; the emailed link opens it as `/reset-password#token=<id>.<secret>`
 * (`?token=` is also accepted):
 * 1. the link token is read, removed from the address bar and sent once to
 *    POST /auth/verify-reset-link → `reset_token` + `expires_in`;
 * 2. only then are the password fields shown; the reset token is kept in memory
 *    only (never stored) until it expires;
 * 3. POST /auth/reset-password, then on to /login with the backend's message.
 *    The user signs in there: the backend returns no session here.
 */
export function ResetPasswordForm() {
  const formId = useId();
  const router = useRouter();
  const linkTokenRef = useRef<string | null>(null);
  const resetTokenRef = useRef<string | null>(null);
  const isBusyRef = useRef(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [expiresAt, setExpiresAt] = useState(0);
  const pending = useSyncExternalStore(
    subscribePendingPasswordReset,
    readPendingPasswordReset,
    () => null,
  );
  const resendSecondsLeft = useCooldown(pending?.resendAvailableAt ?? 0);

  const checkLink = useCallback(async (token: string) => {
    resetTokenRef.current = null;
    setMode("verifying");
    setNotice(null);
    setErrors({});
    try {
      const { reset_token, expires_in } = await verifyLinkOnce(token);
      if (linkTokenRef.current !== token) return; // a newer link took over
      resetTokenRef.current = reset_token;
      setExpiresAt(Date.now() + expires_in * 1000);
      setMode("ready");
      setNotice({
        tone: "info",
        text: `Link confirmed. Choose a new password within ${Math.max(1, Math.round(expires_in / 60))} minutes.`,
      });
    } catch (error) {
      inFlight.delete(token); // allow a manual retry for transient failures
      if (linkTokenRef.current !== token) return; // a newer link took over
      if (isApiError(error) && error.status === 400) {
        setMode("invalid");
        setNotice({ tone: "error", text: INVALID_LINK });
      } else {
        setMode("failed");
        setNotice({
          tone: "error",
          text:
            commonAuthErrorMessage(error) ?? "We couldn’t check your reset link. Please try again.",
        });
      }
    }
  }, []);

  const openLink = useCallback(
    (token: string) => {
      linkTokenRef.current = token || null;
      if (token) {
        void checkLink(token);
        return;
      }
      resetTokenRef.current = null;
      setMode("invalid");
      setNotice({ tone: "error", text: INVALID_LINK });
    },
    [checkLink],
  );

  useEffect(() => {
    // Deferred so React StrictMode's double effect run (mount → cleanup → mount)
    // cancels the first pass: the link is read and submitted exactly once.
    const timer = window.setTimeout(() => {
      if (linkTokenRef.current) return;
      const token = takeTokenFromUrl();
      if (token === null) setMode("inbox");
      else openLink(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openLink]);

  useEffect(() => {
    // A link opened in a tab already showing this page only changes the
    // #fragment, so the page does not reload. Nothing may race a password save.
    const onHashChange = () => {
      const token = takeTokenFromUrl();
      if (token === null || token === linkTokenRef.current || isBusyRef.current) return;
      openLink(token);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [openLink]);

  // The reset token is short-lived (`expires_in`); lock the form when it lapses.
  useEffect(() => {
    if (mode !== "ready" || !expiresAt) return;
    const timer = window.setTimeout(
      () => {
        if (isBusyRef.current) return;
        resetTokenRef.current = null;
        setMode("invalid");
        setNotice({
          tone: "error",
          text: "Your reset session has expired. Please request a new link.",
        });
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [mode, expiresAt]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusyRef.current || mode !== "ready" || !resetTokenRef.current) return;

    const data = new FormData(event.currentTarget);
    const nextErrors = validate(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = FIELDS.find((field) => nextErrors[field.name]);
      if (firstInvalid) document.getElementById(`${formId}-${firstInvalid.name}`)?.focus();
      return;
    }

    isBusyRef.current = true;
    setIsSaving(true);
    setNotice(null);
    try {
      const response = await resetPassword({
        reset_token: resetTokenRef.current,
        new_password: String(data.get("newPassword")),
        confirm_password: String(data.get("confirmPassword")),
      });
      resetTokenRef.current = null;
      clearPendingPasswordReset();
      saveAuthFlash(response.message);
      router.replace(userRoutes.login);
      return; // keep the form locked while navigating
    } catch (error) {
      const { code, messages } = getBackendErrorDetails(error);
      if (code === "INVALID_RESET_TOKEN") {
        resetTokenRef.current = null;
        setMode("invalid");
        setNotice({
          tone: "error",
          text: "Your reset session is no longer valid. Please request a new link.",
        });
      } else if (isApiError(error) && error.status === 400) {
        const fieldErrors: FieldErrors = {};
        for (const text of messages) {
          const property = text.split(" ")[0];
          if (property === "new_password") fieldErrors.newPassword ??= PASSWORD_RULE;
          else if (property === "confirm_password")
            fieldErrors.confirmPassword ??= text.includes("match")
              ? "Passwords don’t match."
              : PASSWORD_RULE;
        }
        setErrors(fieldErrors);
        setNotice({ tone: "error", text: "Please correct the highlighted fields." });
      } else {
        setNotice({
          tone: "error",
          text:
            commonAuthErrorMessage(error) ??
            "We couldn’t save your new password. Please try again.",
        });
      }
    } finally {
      isBusyRef.current = false;
      setIsSaving(false);
    }
  };

  const onRequestNewLink = async () => {
    if (isBusyRef.current || resendSecondsLeft > 0) return;
    const email = pending?.email;
    if (!email) {
      router.push(userRoutes.forgotPassword); // no address known in this tab
      return;
    }
    isBusyRef.current = true;
    setIsRequesting(true);
    setNotice(null);
    try {
      const response = await requestPasswordReset({ email });
      savePendingPasswordReset({
        email,
        message: response.message,
        resendAvailableAt: Date.now() + AUTH_EMAIL_COOLDOWN_SECONDS * 1000,
      });
      linkTokenRef.current = null;
      setMode("inbox");
    } catch (error) {
      if (isApiError(error) && error.status === 429) {
        savePendingPasswordReset({
          ...pending,
          email,
          resendAvailableAt:
            Date.now() + (error.retryAfterSeconds ?? AUTH_EMAIL_COOLDOWN_SECONDS) * 1000,
        });
      }
      setNotice({
        tone: "error",
        text: commonAuthErrorMessage(error) ?? "We couldn’t request a new link. Please try again.",
      });
    } finally {
      isBusyRef.current = false;
      setIsRequesting(false);
    }
  };

  const canEdit = mode === "ready" && !isSaving;
  const canRequestLink = mode === "inbox" || mode === "invalid" || mode === "failed";
  const busy = isSaving || isRequesting;
  const shownNotice: Notice =
    notice ??
    (mode === "inbox"
      ? {
          tone: "info",
          text: pending?.message
            ? `${pending.message} Open the link in that email to choose a new password.`
            : "Open the password reset link from your email to choose a new password.",
        }
      : null);

  return (
    <AccountPageShell headingId="reset-password-heading" {...PAGE_COPY[mode]}>
      {mode === "inbox" ? (
        <section
          aria-labelledby="secure-return-heading"
          className="mt-11 border border-[#d6d9dc] px-5 py-6 lg:mt-[calc(var(--r)*36)] lg:px-[calc(var(--rw)*25)] lg:pt-[calc(var(--r)*24)] lg:pb-[calc(var(--r)*26)]"
        >
          <h2
            id="secure-return-heading"
            className="text-[1.375rem] leading-tight font-normal tracking-[-0.01em] lg:text-[max(calc(var(--r)*23),20px)]"
          >
            A secure return.
          </h2>
          <p className="mt-3 text-[0.8125rem] leading-snug text-[#3d434a] lg:mt-[calc(var(--r)*20)] lg:text-[max(calc(var(--r)*13),12px)]">
            Follow the link in your email to choose a new password. If the link has expired or was
            already used, request another.
          </p>
        </section>
      ) : null}

      <form
        noValidate
        onSubmit={onSubmit}
        aria-busy={busy || mode === "verifying"}
        className="mt-11 lg:mt-[calc(var(--r)*44)]"
      >
        {mode === "ready" ? (
          <div className="max-w-[35rem] lg:w-[calc(var(--rw)*560)] lg:max-w-none">
            {FIELDS.map((field, index) => {
              const id = `${formId}-${field.name}`;
              const errorId = `${id}-error`;
              const error = errors[field.name];
              return (
                <div key={field.name} className={cx(index > 0 && "mt-8 lg:mt-[calc(var(--r)*71)]")}>
                  <label htmlFor={id} className={labelClass}>
                    {field.label}
                  </label>
                  <input
                    id={id}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    placeholder={field.placeholder}
                    disabled={!canEdit}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cx(
                      inputClass,
                      "mt-3.5 disabled:cursor-not-allowed disabled:bg-[#f4f5f6] lg:mt-[calc(var(--r)*14)]",
                    )}
                  />
                  {error ? (
                    <p id={errorId} className={fieldErrorClass}>
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <div aria-live="polite">
          {mode === "verifying" ? (
            <p className={cx(formAlertClass, "border-[#0d1b2a]")}>Checking your reset link…</p>
          ) : null}
          {shownNotice ? (
            <p
              role={shownNotice.tone === "error" ? "alert" : undefined}
              className={cx(formAlertClass, shownNotice.tone === "info" && "border-[#0d1b2a]")}
            >
              {shownNotice.text}
            </p>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col flex-wrap gap-4 min-[420px]:flex-row lg:mt-[calc(var(--r)*58)] lg:gap-[calc(var(--rw)*16)]">
          {mode === "failed" ? (
            <button
              type="button"
              onClick={() => linkTokenRef.current && void checkLink(linkTokenRef.current)}
              className={cx(
                primaryButtonClass,
                "w-full min-[420px]:w-56 lg:w-[calc(var(--rw)*223)] lg:min-w-52",
              )}
              style={{ background: PRIMARY_GRADIENT }}
            >
              Check the link again
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
            </button>
          ) : null}
          {mode === "ready" ? (
            <button
              type="submit"
              disabled={!canEdit || busy}
              className={cx(
                primaryButtonClass,
                "w-full disabled:cursor-not-allowed min-[420px]:w-56 lg:w-[calc(var(--rw)*223)] lg:min-w-52",
              )}
              style={{ background: PRIMARY_GRADIENT }}
            >
              {isSaving ? "Saving password…" : "Save password"}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
            </button>
          ) : null}
          {canRequestLink ? (
            <button
              type="button"
              onClick={() => void onRequestNewLink()}
              disabled={busy || resendSecondsLeft > 0}
              className={cx(
                secondaryButtonClass,
                "w-full disabled:cursor-wait disabled:opacity-60 min-[420px]:w-44 lg:w-[calc(var(--rw)*175)] lg:min-w-40",
              )}
            >
              {isRequesting
                ? "Requesting…"
                : resendSecondsLeft > 0
                  ? `New link · ${formatCountdown(resendSecondsLeft)}`
                  : "Request a new link"}
            </button>
          ) : null}
          <Link
            href={userRoutes.login}
            className={cx(
              secondaryButtonClass,
              "w-full min-[420px]:w-44 lg:w-[calc(var(--rw)*176)] lg:min-w-40",
            )}
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AccountPageShell>
  );
}
