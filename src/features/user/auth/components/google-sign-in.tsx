"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getPublicEnv } from "@/config/env";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import { signInWithGoogle } from "@/services/user/auth.service";

import { safeNextPath, saveAuthSession } from "../session";
import { commonAuthErrorMessage } from "../utils/auth-error-message";

import { formAlertClass } from "./auth-form-styles";

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";


/** The part of Google Identity Services this page uses. */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        ux_mode?: "popup" | "redirect";
        context?: "signin" | "signup" | "use";
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        itp_support?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
          logo_alignment?: "left" | "center";
          width?: number;
          locale?: string;
        },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptPromise: Promise<GoogleIdentity> | null = null;

/** Loads the Google Identity Services script once per page. */
function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  scriptPromise ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google?.accounts?.id ? resolve(window.google) : reject(new Error("GSI missing"));
    script.onerror = () => reject(new Error("GSI failed to load"));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null; // a later visit may try again
    throw error;
  });
  return scriptPromise;
}

/** Text for a failed POST /auth/google, from the documented error codes. */
function googleErrorMessage(error: unknown): string {
  const { code } = getBackendErrorDetails(error);
  switch (code) {
    case "INVALID_GOOGLE_TOKEN":
      return "Google sign-in didn’t go through. Please try again, and make sure your Google account’s email is verified.";
    case "ACCOUNT_DEACTIVATED":
      return "This account has been deactivated. Please contact Sithara Marina for help.";
    case "GOOGLE_SIGN_IN_NOT_ALLOWED":
      return "This email belongs to a staff account. Staff sign in through the admin area.";
    case "GOOGLE_ACCOUNT_MISMATCH":
      return "An account with this email is already linked to a different Google account. Sign in with that Google account, or use your email and password.";
    case "GOOGLE_SIGN_IN_NOT_CONFIGURED":
      return "Sign in with Google isn’t available right now. Please use your email and password.";
  }
  return (
    commonAuthErrorMessage(error) ??
    (isApiError(error) && error.kind === "validation"
      ? "We couldn’t read the answer from our server. Please try again."
      : "We couldn’t sign you in with Google. Please try again.")
  );
}

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "signingIn" }
  | { kind: "error"; message: string }
  | { kind: "unavailable" };

export interface GoogleSignInProps {
  /** `signup` labels the button "Sign up with Google". */
  context: "signin" | "signup";
  className?: string;
}

/**
 * "Sign in with Google" (Google Identity Services, popup). Google hands the page an
 * ID token; it is sent as-is to POST /auth/google, and only the backend's answer
 * (tokens and user) signs the customer in, through the same session store as the
 * email sign-in, so the header updates at once. Then on to `?next=` or Home.
 * Closing Google's window just leaves the button ready. Not shown at all when
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 */
export function GoogleSignIn({ context, className }: GoogleSignInProps) {
  const clientId = getPublicEnv().NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    if (!clientId) return;
    let active = true;

    const onCredential = async ({ credential }: { credential?: string }) => {
      if (!active || busyRef.current) return;
      if (!credential) {
        setStatus({ kind: "error", message: "Google didn’t return your sign-in. Please try again." });
        return;
      }
      busyRef.current = true;
      setStatus({ kind: "signingIn" });
      try {
        const response = await signInWithGoogle({ id_token: credential });
        saveAuthSession(response);
        const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
        router.replace((next ?? userRoutes.home) as Route);
      } catch (error) {
        busyRef.current = false;
        if (active) setStatus({ kind: "error", message: googleErrorMessage(error) });
      }
    };

    loadGoogleIdentity().then(
      (google) => {
        const parent = buttonRef.current;
        if (!active || !parent) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => void onCredential(response),
          ux_mode: "popup",
          context,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });
        google.accounts.id.renderButton(parent, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: context === "signup" ? "signup_with" : "signin_with",
          logo_alignment: "center",
          // Google allows 200–400px; follow the column, within those limits.
          width: Math.round(Math.min(400, Math.max(200, parent.clientWidth || 320))),
        });
        setStatus({ kind: "ready" });
      },
      () => {
        if (active) setStatus({ kind: "unavailable" });
      },
    );

    return () => {
      active = false;
    };
  }, [clientId, context, router]);



  if (!clientId) return null;

  return (
    <div className={className}>
      <div
        aria-hidden="true"
        className="flex items-center gap-4 text-[0.75rem] leading-none tracking-[0.12em] text-[#3d434a] uppercase"
      >
        <span className="h-px flex-1 bg-[#d6d9dc]" />
        or
        <span className="h-px flex-1 bg-[#d6d9dc]" />
      </div>

      {status.kind === "unavailable" ? (
        <p role="status" className={cx(formAlertClass, "border-[#0d1b2a]")}>
          Sign in with Google couldn’t load just now. Please use your email and password, or try
          again later.
        </p>
      ) : (
        <div
          aria-busy={status.kind === "loading" || status.kind === "signingIn"}
          className={cx(
            "mt-6 min-h-11 max-w-[400px] transition-opacity",
            status.kind === "signingIn" && "pointer-events-none opacity-50",
          )}
        >
          <div ref={buttonRef} />
        </div>
      )}

      <p aria-live="polite" className={status.kind === "signingIn" ? "mt-3 text-[0.8125rem]" : "sr-only"}>
        {status.kind === "signingIn" ? "Signing you in with Google…" : ""}
      </p>
      {status.kind === "error" ? (
        <p role="alert" className={formAlertClass}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
