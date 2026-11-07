"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { userRoutes } from "@/constants/routes";
import { takeTokenFromUrl } from "@/features/user/auth/components/verify-email-page";
import { saveAuthSession, useAuthSession } from "@/features/user/auth/session";
import { PaymentStep } from "@/features/user/payments/components/payment-step";
import { isApiError } from "@/services/http/api-error";
import {
  verifyCheckoutSession,
  type VerifiedCheckoutSession,
} from "@/services/user/checkout.service";

import { checkoutErrorMessage } from "../utils/checkout-error-message";
import { clearCheckoutState, updateCheckoutState, useCheckoutState } from "../utils/checkout-store";
import {
  CheckoutPage,
  Loading,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  textLinkClass,
} from "./checkout-ui";
import { ContactStep } from "./contact-step";
import { ReviewStep } from "./review-step";

const HEADING = { heading: "Checkout", headingSerif: "" };

type LinkStatus =
  | { kind: "checking" } // the URL has not been read yet
  | { kind: "none" }
  | { kind: "verifying" }
  | { kind: "invalid" }
  | { kind: "failed"; message: string };

/** Link tokens are single use, so each is submitted once per page load. */
const verifications = new Map<string, Promise<VerifiedCheckoutSession>>();
function verifyOnce(token: string): Promise<VerifiedCheckoutSession> {
  let request = verifications.get(token);
  if (!request) {
    request = verifyCheckoutSession(token);
    verifications.set(token, request);
  }
  return request;
}

/** Saves what the link granted. The customer is not signed in unless the backend says so. */
function applyVerification(result: VerifiedCheckoutSession): boolean {
  const { access, access_token, refresh_token, checkout_token } = result;
  if (access === "customer_session") {
    if (!access_token || !refresh_token) return false;
    saveAuthSession({ access_token, refresh_token });
  }
  if (access === "checkout_token" && !checkout_token) return false;

  updateCheckoutState({
    sessionId: result.checkout_session_id,
    awaitingVerification: false,
    checkoutToken: access === "checkout_token" ? (checkout_token ?? null) : null,
    bookingId: null,
  });
  return true;
}

function EmptyCheckout() {
  return (
    <CheckoutPage {...HEADING}>
      <Notice>
        You haven’t chosen a charter yet.{" "}
        <Link href={userRoutes.yachts} className={textLinkClass}>
          See our yachts
        </Link>
      </Notice>
    </CheckoutPage>
  );
}

function VerificationPending({ email }: { email: string | undefined }) {
  return (
    <CheckoutPage heading="Check your" headingSerif="inbox">
      <Notice>
        We’ve sent a link to {email ?? "your email address"}. Open it to verify your checkout and
        continue. Your charter isn’t held until then.
      </Notice>
      <Notice>
        Can’t find it? Check your spam folder, or{" "}
        <button
          type="button"
          className={textLinkClass}
          onClick={() => updateCheckoutState({ sessionId: null, awaitingVerification: false })}
        >
          change your details and send it again
        </button>
        .
      </Notice>
    </CheckoutPage>
  );
}

/** The verified email has an account: the session opens only with that account's sign-in. */
function SignInRequired() {
  const next = encodeURIComponent(userRoutes.checkout);
  return (
    <CheckoutPage heading="Welcome" headingSerif="back">
      <Notice>
        This email already has an account. Sign in to pick up your checkout. Your selections are
        saved.
      </Notice>
      <Link
        href={`${userRoutes.login}?next=${next}`}
        className={`${primaryButtonClass} mt-[24px]`}
        style={primaryButtonStyle}
      >
        Sign in to continue
      </Link>
    </CheckoutPage>
  );
}

/**
 * Checkout from selection to booking. Which step shows is decided by what the
 * stored state and the backend already know, so a refresh resumes where the
 * customer was. Emailed links open this page too: `#token=…`, or `?token=…`.
 */
export function CheckoutFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const state = useCheckoutState();
  const authSession = useAuthSession();
  const [link, setLink] = useState<LinkStatus>({ kind: "checking" });
  const tokenRef = useRef<string | null>(null);

  const submitToken = useCallback(
    async (token: string) => {
      setLink({ kind: "verifying" });
      try {
        const applied = applyVerification(await verifyOnce(token));
        if (!applied) {
          setLink({ kind: "failed", message: "We received an unexpected response." });
          return;
        }
        setLink({ kind: "none" });
        if (pathname !== userRoutes.checkout) router.replace(userRoutes.checkout);
      } catch (error) {
        verifications.delete(token); // allow a manual retry for transient failures
        if (isApiError(error) && error.status === 400) {
          setLink({ kind: "invalid" }); // INVALID_TOKEN: one answer for every bad link
          return;
        }
        setLink({
          kind: "failed",
          message: checkoutErrorMessage(error, "We couldn’t verify your checkout."),
        });
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    // Deferred so StrictMode's double effect run cancels the first pass.
    const timer = window.setTimeout(() => {
      if (tokenRef.current !== null) return;
      const token = takeTokenFromUrl();
      if (token === null) {
        setLink({ kind: "none" });
        return;
      }
      tokenRef.current = token;
      void submitToken(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [submitToken]);

  useEffect(() => {
    // A newer link opened on this page only changes the #fragment, so nothing
    // reloads. Nothing may race a verification already running.
    const onHashChange = () => {
      if (link.kind === "verifying") return;
      const token = takeTokenFromUrl();
      if (token === null || token === tokenRef.current) return;
      tokenRef.current = token;
      void submitToken(token);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [link.kind, submitToken]);

  if (!state || link.kind === "checking" || link.kind === "verifying") {
    return (
      <CheckoutPage {...HEADING}>
        <Loading
          label={link.kind === "verifying" ? "Verifying your checkout" : "Loading your checkout"}
        />
      </CheckoutPage>
    );
  }

  if (link.kind === "invalid") {
    return (
      <CheckoutPage {...HEADING}>
        <Notice alert>
          This checkout link is invalid, has expired or has already been used. If you’ve already
          opened it, go back to that tab, or start again from{" "}
          <Link href={userRoutes.yachts} className={textLinkClass} onClick={clearCheckoutState}>
            our yachts
          </Link>
          .
        </Notice>
      </CheckoutPage>
    );
  }

  if (link.kind === "failed") {
    return (
      <CheckoutPage {...HEADING}>
        <Notice alert>{link.message}</Notice>
        <button
          type="button"
          className={`${secondaryButtonClass} mt-[24px]`}
          onClick={() => tokenRef.current !== null && void submitToken(tokenRef.current)}
        >
          Try again
        </button>
      </CheckoutPage>
    );
  }

  const { draft, contact, sessionId, awaitingVerification, checkoutToken, bookingId } = state;

  if (bookingId) return <PaymentStep bookingId={bookingId} checkoutToken={checkoutToken} />;
  if (awaitingVerification) return <VerificationPending email={contact?.email} />;
  if (sessionId) {
    if (!checkoutToken && !authSession) return <SignInRequired />;
    return <ReviewStep sessionId={sessionId} checkoutToken={checkoutToken} />;
  }
  if (draft) return <ContactStep draft={draft} saved={contact} />;
  return <EmptyCheckout />;
}
