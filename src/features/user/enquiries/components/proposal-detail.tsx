"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { CharterSummaryCard } from "@/components/user/charter-summary-card";
import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  CardTitle,
  DetailRows,
  fieldErrorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { accountErrorMessage } from "@/features/user/account/utils/account-error";
import {
  formatAmount,
  formatInstantDate,
  formatLongDate,
  formatTimeRange,
  guests,
} from "@/features/user/account/utils/account-format";
import { updateCheckoutState } from "@/features/user/checkout/utils/checkout-store";
import { useYachtInfo } from "@/features/user/customer-bookings/hooks/use-yacht-info";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import {
  acceptProposal,
  getMyProposal,
  PROPOSAL_COMMENT_MAX,
  rejectProposal,
  type Proposal,
} from "@/services/user/enquiries.service";

import { PROPOSAL_STATUS_LABELS } from "../utils/enquiry-view";

const HEADING = { heading: "A proposal,", headingSerif: "made for you." };

const DECISION_ERRORS: Record<string, string> = {
  PROPOSAL_NOT_OPEN:
    "This proposal can no longer be decided: it has expired, been replaced or already been answered.",
  SLOT_DOUBLE_BOOKED:
    "This time is no longer available. Please ask our concierge for a new proposal.",
  BUFFER_TIME_VIOLATION:
    "This time is no longer available. Please ask our concierge for a new proposal.",
  SLOT_NOT_AVAILABLE:
    "This time is no longer available. Please ask our concierge for a new proposal.",
  PRICE_NOT_AVAILABLE:
    "This charter can’t be priced right now. Please ask our concierge for a new proposal.",
};

/** One proposal (GET /me/proposals/{id}), to accept or decline while it is open. */
export function ProposalDetail({ proposalId }: { proposalId: string }) {
  const query = useApiQuery((signal) => getMyProposal(proposalId, signal), proposalId);

  if (!query.data) {
    return (
      <>
        <AccountHeading {...HEADING} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your proposal"
          notFoundMessage="We couldn’t find this proposal in your account."
        />
      </>
    );
  }

  return <ProposalBody proposal={query.data} onChange={query.setData} onReload={query.reload} />;
}

type Decision =
  | { kind: "idle" }
  | { kind: "confirm-reject" }
  | { kind: "sending"; action: "accept" | "reject" }
  | { kind: "error"; message: string }
  | { kind: "follow-up"; priceChanged: boolean };

function ProposalBody({
  proposal,
  onChange,
  onReload,
}: {
  proposal: Proposal;
  onChange: (proposal: Proposal) => void;
  onReload: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const yacht = useYachtInfo(proposal.yacht?.slug);
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<Decision>({ kind: "idle" });
  const isSending = useRef(false);
  const { pricing } = proposal;
  const amount = (value: number) => formatAmount(value, pricing.currency);
  const isOpen = proposal.status === "sent";
  const commentError =
    comment.length > PROPOSAL_COMMENT_MAX
      ? `Please keep your comment under ${PROPOSAL_COMMENT_MAX} characters.`
      : null;

  const decide = async (action: "accept" | "reject") => {
    if (isSending.current || commentError) return; // one decision, however often it is clicked
    isSending.current = true;
    setDecision({ kind: "sending", action });
    try {
      if (action === "reject") {
        onChange(await rejectProposal(proposal.id, comment));
        setDecision({ kind: "idle" });
        return;
      }
      const result = await acceptProposal(proposal.id, comment);
      onChange(result.proposal);
      if (result.next_step === "checkout" && result.checkout_session_id) {
        // Continue in the existing checkout, on the session the backend started.
        updateCheckoutState({
          draft: null,
          contact: null,
          sessionId: result.checkout_session_id,
          awaitingVerification: false,
          checkoutToken: null,
          bookingId: null,
        });
        router.push(userRoutes.checkout);
        return;
      }
      setDecision({ kind: "follow-up", priceChanged: result.price_changed });
    } catch (error) {
      setDecision({
        kind: "error",
        message: accountErrorMessage(
          error,
          "We couldn’t send your decision just now. Please try again.",
          DECISION_ERRORS,
        ),
      });
      onReload(); // the proposal may have changed (e.g. expired) meanwhile
    } finally {
      isSending.current = false;
    }
  };

  const sending = decision.kind === "sending";

  return (
    <>
      <AccountHeading
        {...HEADING}
        subtitle={`Enquiry ${proposal.enquiry_reference} · Proposal ${proposal.version}`}
      />
      <StatusChip tone={isOpen ? "forest" : "pearl"} className="mt-7 lg:mt-8">
        {PROPOSAL_STATUS_LABELS[proposal.status]}
      </StatusChip>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,21.5rem)] xl:gap-8">
        <article className="min-w-0">
          <DetailRows
            rows={[
              { label: "Yacht", value: proposal.yacht?.name ?? "Charter" },
              { label: "Date", value: formatLongDate(proposal.date) },
              {
                label: "Charter time",
                value: `${formatTimeRange(proposal.start_time, proposal.end_time)} · ${proposal.slot_type_name}`,
              },
              { label: "Your company", value: guests(proposal.guests) },
              ...(proposal.expires_at && isOpen
                ? [{ label: "Open until", value: formatInstantDate(proposal.expires_at) }]
                : []),
            ]}
          />

          {proposal.inclusions.length ? (
            <section className="mt-8">
              <CardTitle>Included</CardTitle>
              <ul className="text-body mt-3 list-disc space-y-1 pl-5 text-[13px] leading-[1.5]">
                {proposal.inclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {proposal.message ? (
            <AccountNotice label="A note from our concierge" className="mt-8">
              {proposal.message}
            </AccountNotice>
          ) : null}
          {proposal.terms ? (
            <AccountNotice label="Terms" className="mt-5">
              {proposal.terms}
            </AccountNotice>
          ) : null}
          {proposal.decision_comment && !isOpen ? (
            <AccountNotice label="Your comment" className="mt-5">
              {proposal.decision_comment}
            </AccountNotice>
          ) : null}
        </article>

        <div className="min-w-0">
          <CharterSummaryCard
            tone="dark"
            yachtName={proposal.yacht?.name ?? "Charter"}
            subtitle={[yacht?.departureCity, proposal.slot_type_name].filter(Boolean).join(" · ")}
            imageUrl={yacht?.imageUrl}
            facts={[
              { label: "Departure", value: formatLongDate(proposal.date) },
              { label: "Time", value: formatTimeRange(proposal.start_time, proposal.end_time) },
              { label: "Your company", value: guests(proposal.guests) },
            ]}
            prices={[
              { label: "Private charter", value: amount(pricing.charter_amount) },
              ...pricing.addons.map((addon) => ({
                label: addon.quantity > 1 ? `${addon.name} · ${addon.quantity}` : addon.name,
                value: amount(addon.amount),
              })),
              ...(pricing.tax_amount !== null
                ? [
                    {
                      label: pricing.tax_rate === null ? "GST" : `GST (${pricing.tax_rate}%)`,
                      value: amount(pricing.tax_amount),
                    },
                  ]
                : []),
            ]}
            total={pricing.total_amount === null ? null : amount(pricing.total_amount)}
            note="All amounts in INR. The price is checked again when you accept and at checkout."
          />
        </div>
      </div>

      {decision.kind === "follow-up" ? (
        <AccountNotice label="Thank you — proposal accepted" className="mt-8">
          Our concierge will contact you to complete your booking.
          {decision.priceChanged
            ? " Today’s price differs from the proposal; we will confirm it with you."
            : ""}
        </AccountNotice>
      ) : null}

      {isOpen ? (
        <section aria-labelledby={`${id}-decide`} className="mt-10 max-w-[40rem]">
          <CardTitle>
            <span id={`${id}-decide`}>Your decision</span>
          </CardTitle>
          <label htmlFor={`${id}-comment`} className={cx(labelClass, "mt-5")}>
            A comment for our concierge · optional
          </label>
          <textarea
            id={`${id}-comment`}
            value={comment}
            rows={2}
            disabled={sending}
            aria-invalid={commentError ? true : undefined}
            aria-describedby={commentError ? `${id}-comment-error` : undefined}
            onChange={(event) => setComment(event.target.value)}
            className={cx(inputClass, "h-auto min-h-[55px] resize-y py-4 leading-snug")}
          />
          {commentError ? (
            <p id={`${id}-comment-error`} className={fieldErrorClass}>
              {commentError}
            </p>
          ) : null}
          {decision.kind === "error" ? (
            <p role="alert" className={fieldErrorClass}>
              {decision.message}
            </p>
          ) : null}
          {decision.kind === "confirm-reject" ? (
            <p role="status" className="text-body mt-4 text-[13px]">
              Decline this proposal? You can still ask our concierge for a new one.
            </p>
          ) : null}

          <div className={cx(buttonRowClass, "mt-6")}>
            <button
              type="button"
              onClick={() => void decide("accept")}
              disabled={sending}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              {sending && decision.action === "accept" ? "Accepting…" : "Accept proposal"}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                decision.kind === "confirm-reject"
                  ? void decide("reject")
                  : setDecision({ kind: "confirm-reject" })
              }
              disabled={sending}
              className={secondaryButtonClass}
            >
              {sending && decision.action === "reject"
                ? "Declining…"
                : decision.kind === "confirm-reject"
                  ? "Yes, decline"
                  : "Decline"}
            </button>
          </div>
        </section>
      ) : null}

      <div className={cx(buttonRowClass, "mt-8")}>
        <Link
          href={userRoutes.accountEnquiry(proposal.enquiry_reference)}
          className={secondaryButtonClass}
        >
          Back to enquiry
        </Link>
      </div>
    </>
  );
}
