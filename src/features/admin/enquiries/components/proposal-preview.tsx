"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BODY } from "@/components/admin/admin-theme";
import { LoadState, Notice, OUTLINE_STYLE, PRIMARY_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  Card,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant, formatRupees } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { getEnquiry, publishProposal } from "@/services/admin/enquiries.service";

import { dayText, enquiryErrorMessage, proposalStatusLabel } from "../utils/enquiry-format";

/**
 * "A proposal ready to share." (admin Figma A44): the customer's view of a
 * proposal version, then POST /admin/proposals/{id}/publish.
 */
export function ProposalPreview({
  enquiryId,
  proposalId,
}: {
  enquiryId: string;
  proposalId?: string;
}) {
  const router = useRouter();
  const enquiry = useAdminQuery((signal) => getEnquiry(enquiryId, signal), `enquiry:${enquiryId}`);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  if (!enquiry.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A proposal ready to share." />
        <div className="mt-[24px]">
          <LoadState
            loading={enquiry.loading}
            error={
              enquiry.error
                ? `Couldn't load the proposal. ${enquiryErrorMessage(enquiry.error)}`
                : undefined
            }
            onRetry={enquiry.reload}
            label="Loading proposal"
          />
        </div>
      </div>
    );
  }
  const e = enquiry.data;
  // The chosen version, or the newest draft.
  const p =
    e.proposals.find((x) => x.id === proposalId) ?? e.proposals.find((x) => x.status === "draft");
  if (!p) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A proposal ready to share." />
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          There is no draft to send.{" "}
          <Link href={adminRoutes.enquiry(e.id)} className="underline underline-offset-2">
            Back to the enquiry
          </Link>
        </p>
      </div>
    );
  }
  const total = p.pricing.total_amount;
  const draft = p.status === "draft";

  async function send() {
    setBusy(true);
    setFailure("");
    try {
      await publishProposal(p!.id);
      router.push(`${adminRoutes.enquiry(e.id, "proposal")}&notice=sent` as Route);
    } catch (err) {
      setFailure(enquiryErrorMessage(err));
      setBusy(false);
      enquiry.reload();
    }
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A proposal ready to share."
        subtitle={`${e.reference} · Proposal v${p.version}`}
      />

      <Card
        title={
          draft
            ? "Customer view reviewed"
            : `Proposal v${p.version} · ${proposalStatusLabel(p.status)}`
        }
        className="mt-[24px] lg:max-w-[880px]"
      >
        {e.contact.full_name} · {e.contact.email}
        <br />
        {p.yacht.name} · {dayText(p.date)} · {p.start_time}–{p.end_time} · {p.slot_type_name}
        <br />
        {p.guests} guests · {total === null ? "total shown once GST is set" : formatRupees(total)}
        {p.pricing.tax_amount !== null && (
          <span className="block text-[11px]">
            Charter {formatRupees(p.pricing.charter_amount)}
            {p.pricing.addons_amount ? ` · add-ons ${formatRupees(p.pricing.addons_amount)}` : ""} ·
            GST {formatRupees(p.pricing.tax_amount)}
          </span>
        )}
        {p.inclusions.length > 0 && (
          <span className="mt-[10px] block" style={{ color: "#0d1b2a" }}>
            Includes: {p.inclusions.join(" · ")}
          </span>
        )}
        {p.message && <span className="mt-[8px] block">“{p.message}”</span>}
        {p.terms && <span className="mt-[8px] block whitespace-pre-line">Terms: {p.terms}</span>}
        <span className="mt-[8px] block">
          {p.expires_at
            ? `Valid until ${formatInstant(p.expires_at)}`
            : "Valid for 7 days after it is sent"}
        </span>
      </Card>

      {total === null && draft && (
        <Notice tone="error" className="mt-[16px] lg:max-w-[880px]">
          The total can’t be calculated until the GST rate is set in Settings, so the customer would
          see no total.
        </Notice>
      )}

      <InfoPanel title="Before sending" className="mt-[20px] lg:max-w-[880px]">
        Confirm the itinerary, inclusions, exclusions, policy and validity period. This proposal
        version stays in the enquiry history.
      </InfoPanel>

      {failure && (
        <Notice tone="error" className="mt-[16px] lg:max-w-[880px]">
          {failure}
        </Notice>
      )}

      <div className="mt-[24px] flex flex-wrap gap-[14px]">
        {draft && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={PRIMARY_STYLE}
          >
            {busy ? "Sending…" : "Send this proposal"}
          </button>
        )}
        <Link
          href={adminRoutes.enquiry(e.id)}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          {draft ? "Edit proposal" : "Back to the enquiry"}
        </Link>
      </div>
    </div>
  );
}
