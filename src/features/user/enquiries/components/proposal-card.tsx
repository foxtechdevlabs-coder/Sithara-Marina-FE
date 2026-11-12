"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { userRoutes } from "@/constants/routes";
import {
  fieldErrorClass,
  inputClass,
  labelClass,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  SummaryRows,
  textLinkClass,
  type SummaryRow,
} from "@/features/user/checkout/components/checkout-ui";
import { continueProposalCheckout } from "@/features/user/checkout/utils/checkout-store";
import { DetailGrid, StatusPill } from "@/features/user/profile/components/account-ui";
import { accountErrorMessage, isConflict } from "@/features/user/profile/utils/account-error-message";
import {
  formatClockTime,
  formatDateTime,
  formatDay,
  formatMinorUnits,
} from "@/features/user/yachts/utils/yacht-view";
import {
  acceptProposal,
  PROPOSAL_COMMENT_MAX_LENGTH,
  rejectProposal,
  type Proposal,
} from "@/services/user/enquiries.service";

import { PROPOSAL_STATUS } from "./enquiry-labels";

type Decision = "accept" | "reject";

const money = (amount: number, currency: string) => formatMinorUnits(amount, currency) ?? "";

/** The proposal's own figures, as the backend sent them. Nothing is added up here. */
function priceRows({ pricing }: Proposal): SummaryRow[] {
  const { currency } = pricing;
  return [
    { label: "Charter", value: money(pricing.charter_amount, currency) },
    ...pricing.addons.map((addon) => ({
      label: addon.quantity > 1 ? `${addon.name} × ${addon.quantity}` : addon.name,
      value: money(addon.amount, currency),
    })),
    ...(pricing.addons.length > 0
      ? [{ label: "Add-ons total", value: money(pricing.addons_amount, currency) }]
      : []),
    { label: "Subtotal", value: money(pricing.subtotal, currency) },
    {
      label: pricing.tax_rate === null ? "GST" : `GST (${pricing.tax_rate}%)`,
      value: pricing.tax_amount === null ? "Confirmed at checkout" : money(pricing.tax_amount, currency),
    },
    {
      label: "Total",
      value:
        pricing.total_amount === null ? "Confirmed at checkout" : money(pricing.total_amount, currency),
      strong: true,
    },
  ];
}

interface ProposalCardProps {
  proposal: Proposal;
  /** A closed enquiry takes no more answers. */
  enquiryClosed: boolean;
  /** Called after a decision so the page reloads the backend's state. */
  onChanged: () => void;
  /** Link to the proposal's own page (left out on that page). */
  showPermalink?: boolean;
  /** Link back to the enquiry (shown on the proposal's own page). */
  showEnquiryLink?: boolean;
}

/**
 * One proposal: charter, terms and pricing, with Accept and Reject only while
 * it is open. Accepting hands the backend's checkout session to the existing
 * checkout, which re-reads today's totals before anything is paid.
 */
export function ProposalCard({
  proposal,
  enquiryClosed,
  onChanged,
  showPermalink = false,
  showEnquiryLink = false,
}: ProposalCardProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  // Read once: the backend still decides with its own clock (409 PROPOSAL_NOT_OPEN).
  const [openedAt] = useState(() => Date.now());

  const expired = proposal.expires_at !== null && Date.parse(proposal.expires_at) <= openedAt;
  const open = proposal.status === "sent" && !expired && !enquiryClosed;
  const status = PROPOSAL_STATUS[expired && proposal.status === "sent" ? "expired" : proposal.status];
  const resumable = proposal.status === "accepted" && proposal.checkout_session_id !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (decision && !dialog.open) dialog.showModal();
    if (!decision && dialog.open) dialog.close();
  }, [decision]);

  const closeDialog = () => {
    if (busy) return;
    setDecision(null);
    setComment("");
    setError(null);
  };

  async function confirm() {
    if (!decision || inFlight.current) return;
    if (comment.length > PROPOSAL_COMMENT_MAX_LENGTH) {
      setError(`Please keep your comment under ${PROPOSAL_COMMENT_MAX_LENGTH} characters.`);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const body = comment.trim() ? { comment: comment.trim() } : {};
    try {
      if (decision === "accept") {
        const accepted = await acceptProposal(proposal.id, body);
        if (accepted.next_step === "checkout" && accepted.checkout_session_id) {
          // The existing checkout takes over: it loads the session, places the
          // hold and shows today's totals, which must be accepted before paying.
          continueProposalCheckout(accepted.checkout_session_id, accepted.price_changed);
          router.push(userRoutes.checkout);
          return; // stays busy while navigating
        }
        setOutcome(
          "Thank you, you’ve accepted this proposal. This yacht isn’t booked online, so our team will contact you to arrange the booking.",
        );
      } else {
        await rejectProposal(proposal.id, body);
        setOutcome("You’ve declined this proposal. Our concierge can prepare another one for you.");
      }
      setDecision(null);
      setComment("");
      onChanged();
    } catch (failure) {
      setError(
        accountErrorMessage(
          failure,
          decision === "accept"
            ? "We couldn’t accept this proposal just now."
            : "We couldn’t decline this proposal just now.",
          "We couldn’t find this proposal on your account.",
        ),
      );
      if (isConflict(failure)) onChanged(); // show the backend's current status
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <article className="border border-[#e3e5e8]">
      <header className="flex flex-wrap items-start justify-between gap-[12px] border-b border-[#e3e5e8] p-[20px] sm:p-[28px]">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">
            Proposal · version {proposal.version}
          </p>
          <p className="mt-[6px] text-[24px] leading-[30px] break-words">{proposal.yacht.name}</p>
          <p className="mt-[2px] text-[14px] text-[#4a4f55]">
            {proposal.slot_type_name} · {formatDay(proposal.date)}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </header>

      <div className="grid gap-[32px] p-[20px] sm:p-[28px] lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="min-w-0">
          <DetailGrid
            items={[
              { label: "Package", value: proposal.slot_type_name },
              { label: "Date", value: formatDay(proposal.date) },
              {
                label: "Time",
                value: `${formatClockTime(proposal.start_time)} – ${formatClockTime(proposal.end_time)}`,
              },
              { label: "Guests", value: String(proposal.guests) },
              {
                label: proposal.status === "sent" ? "Open until" : "Expiry",
                value: proposal.expires_at ? formatDateTime(proposal.expires_at) : "No expiry set",
              },
              ...(proposal.sent_at ? [{ label: "Sent", value: formatDateTime(proposal.sent_at) }] : []),
              ...(proposal.decided_at
                ? [{ label: "Answered", value: formatDateTime(proposal.decided_at) }]
                : []),
            ]}
          />

          {proposal.inclusions.length > 0 && (
            <div className="mt-[24px]">
              <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">Included</p>
              <ul className="mt-[8px] grid gap-[6px] text-[15px] leading-[23px] sm:grid-cols-2">
                {proposal.inclusions.map((item) => (
                  <li key={item} className="flex gap-[10px]">
                    <span aria-hidden="true" className="mt-[9px] size-[5px] shrink-0 bg-[#0d1b2a]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {proposal.message && (
            <div className="mt-[24px]">
              <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">
                A note from the marina
              </p>
              <p className="mt-[8px] text-[15px] leading-[24px] whitespace-pre-line">{proposal.message}</p>
            </div>
          )}
          {proposal.terms && (
            <div className="mt-[24px]">
              <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">Terms</p>
              <p className="mt-[8px] text-[14px] leading-[22px] whitespace-pre-line text-[#4a4f55]">
                {proposal.terms}
              </p>
            </div>
          )}
          {proposal.decision_comment && (
            <p className="mt-[24px] text-[14px] leading-[22px] text-[#4a4f55]">
              <span className="text-[#7a7f85]">Your comment: </span>
              {proposal.decision_comment}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">Pricing</p>
          <SummaryRows rows={priceRows(proposal)} />
          <p className="mt-[10px] text-[12px] leading-[18px] text-[#7a7f85]">
            Prices are checked again when you accept and at checkout. You always see the final total
            before you pay.
          </p>
        </div>
      </div>

      <footer className="border-t border-[#e3e5e8] p-[20px] sm:p-[28px]">
        {outcome && (
          <p role="status" className="mb-[16px] text-[15px] leading-[24px]">
            {outcome}
          </p>
        )}
        {error && !decision && <Notice alert>{error}</Notice>}
        <div className="flex flex-wrap items-center gap-[14px]">
          {open && (
            <>
              <button
                type="button"
                onClick={() => setDecision("accept")}
                className={primaryButtonClass}
                style={primaryButtonStyle}
              >
                Accept proposal
              </button>
              <button
                type="button"
                onClick={() => setDecision("reject")}
                className={secondaryButtonClass}
              >
                Decline
              </button>
            </>
          )}
          {resumable && (
            <button
              type="button"
              onClick={() => {
                continueProposalCheckout(proposal.checkout_session_id as string, false);
                router.push(userRoutes.checkout);
              }}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Continue to checkout
            </button>
          )}
          {!open && !resumable && proposal.status === "sent" && (
            <p className="text-[14px] text-[#4a4f55]">
              This proposal can no longer be answered. Our concierge can send a new one.
            </p>
          )}
          {showPermalink && (
            <Link href={userRoutes.accountProposal(proposal.id)} className={`${textLinkClass} text-[14px]`}>
              Open this proposal
            </Link>
          )}
          {showEnquiryLink && (
            <Link
              href={userRoutes.accountEnquiry(proposal.enquiry_reference)}
              className={`${textLinkClass} text-[14px]`}
            >
              Enquiry {proposal.enquiry_reference}
            </Link>
          )}
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        aria-labelledby={`decision-${proposal.id}`}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        className="m-auto w-[min(560px,calc(100vw-2rem))] max-w-none bg-white p-0 text-[#0d1b2a] backdrop:bg-[#0b1a2e]/60"
      >
        <div className="p-[24px] sm:p-[32px]">
          <h3 id={`decision-${proposal.id}`} className="text-[26px] leading-[32px]">
            {decision === "accept" ? "Accept this proposal?" : "Decline this proposal?"}
          </h3>
          <p className="mt-[10px] text-[15px] leading-[24px] text-[#4a4f55]">
            {decision === "accept"
              ? "You’ll go on to checkout, where today’s price is confirmed and the charter is held while you pay."
              : "Our concierge will be told. You can ask for a new proposal at any time."}
          </p>
          <label htmlFor={`comment-${proposal.id}`} className={`${labelClass} mt-[20px]`}>
            Comment <span className="text-[#7a7f85]">(optional)</span>
          </label>
          <textarea
            id={`comment-${proposal.id}`}
            rows={4}
            value={comment}
            maxLength={PROPOSAL_COMMENT_MAX_LENGTH}
            disabled={busy}
            onChange={(event) => setComment(event.currentTarget.value)}
            className={`${inputClass} mt-[12px] h-auto py-[14px]`}
          />
          {error && (
            <p role="alert" className={fieldErrorClass}>
              {error}
            </p>
          )}
          <div className="mt-[24px] flex flex-wrap gap-[14px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              {busy
                ? decision === "accept"
                  ? "Accepting…"
                  : "Declining…"
                : decision === "accept"
                  ? "Accept and continue"
                  : "Decline proposal"}
            </button>
            <button type="button" disabled={busy} onClick={closeDialog} className={secondaryButtonClass}>
              Keep it open
            </button>
          </div>
        </div>
      </dialog>
    </article>
  );
}
