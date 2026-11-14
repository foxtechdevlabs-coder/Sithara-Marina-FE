"use client";

import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMySupportRequest } from "@/services/user/support.service";

import { formatInstantDate } from "../utils/account-format";

import {
  AccountHeading,
  ConfirmationPanel,
  DetailRows,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "./account-ui";
import { QueryFallback } from "./query-fallback";

const HEADING = { heading: "Your message", headingSerif: "is with us." };

/**
 * Figma C57 "Your message is with us.": a support request by its reference
 * (GET /me/support-requests/{reference}), right after sending it or later.
 */
export function HelpMessageSent({ reference }: { reference: string }) {
  const query = useApiQuery(
    (signal) =>
      reference
        ? getMySupportRequest(reference, signal)
        : Promise.reject(new Error("No support reference")),
    reference,
  );
  const sent = query.data;

  if (!sent) {
    return (
      <>
        <AccountHeading {...HEADING} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your message"
          notFoundMessage="We couldn’t find this request in your account."
        />
        {query.loading ? null : (
          <Link href={userRoutes.accountHelp} className={`${secondaryButtonClass} mt-6`}>
            Back to help &amp; support
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      <AccountHeading
        {...HEADING}
        subtitle={
          <>
            Support reference {sent.reference}
            {sent.booking_reference ? (
              <>&nbsp;·&nbsp;Related booking {sent.booking_reference}</>
            ) : null}
          </>
        }
      />
      <ConfirmationPanel
        status="Message received"
        title="Your concierge has the details."
        actions={
          <>
            <Link
              href={userRoutes.accountHelp}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Back to help &amp; support
            </Link>
            {sent.booking_reference ? (
              <Link
                href={userRoutes.accountBooking(sent.booking_reference)}
                className={secondaryButtonClass}
              >
                View related booking
              </Link>
            ) : null}
          </>
        }
      >
        {sent.booking_reference
          ? "Your message is attached to the selected journey. Keep this reference if you need to follow up."
          : "Keep this reference if you need to follow up."}
        <DetailRows
          className="mt-5"
          compact
          rows={[
            { label: "Subject", value: sent.subject },
            { label: "Your message", value: sent.message },
            { label: "Sent", value: formatInstantDate(sent.created_at) },
          ]}
        />
      </ConfirmationPanel>
    </>
  );
}
