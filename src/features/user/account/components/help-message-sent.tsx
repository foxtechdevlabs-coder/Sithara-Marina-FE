"use client";

import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getSupportMessage } from "@/services/user/support.service";

import {
  AccountHeading,
  ConfirmationPanel,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "./account-ui";
import { QueryFallback } from "./query-fallback";

const HEADING = { heading: "Your message", headingSerif: "is with us." };

/** Figma C57 "Your message is with us.": the support reference to keep. */
export function HelpMessageSent({ reference }: { reference: string }) {
  const query = useApiQuery((signal) => getSupportMessage(reference, signal), reference);
  const sent = query.data;

  if (!sent) {
    return (
      <>
        <AccountHeading {...HEADING} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your message"
          notFoundMessage="We couldn’t find this message. If you sent one, our concierge has it — you can also call us on +91 97245 53452."
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
            {sent.booking_id ? (
              <Link
                href={userRoutes.accountBooking(sent.booking_id)}
                className={secondaryButtonClass}
              >
                View related booking
              </Link>
            ) : null}
          </>
        }
      >
        {sent.booking_id
          ? "Your message is attached to the selected journey. Keep this reference if you need to follow up."
          : "Keep this reference if you need to follow up."}
      </ConfirmationPanel>
    </>
  );
}
