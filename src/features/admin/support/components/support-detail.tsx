"use client";

import Link from "next/link";
import { useState } from "react";

import { LoadState, OUTLINE_STYLE, PRIMARY_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  Card,
  DetailList,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
  StatusTag,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { getSupportRequest } from "@/services/admin/support.service";

import {
  categoryLabel,
  gmailReplyLink,
  supportErrorMessage,
  supportStatusLabel,
} from "../utils/support-format";

const link = "underline underline-offset-2 break-words";

/** One support request (GET /admin/support-requests/{id}). Staff reply by email. */
export function SupportDetail({ requestId }: { requestId: string }) {
  const request = useAdminQuery(
    (signal) => getSupportRequest(requestId, signal),
    `support-request:${requestId}`,
  );
  const r = request.data;

  if (!r)
    return (
      <div className={pagePadding}>
        <PageHeader title="Support request" />
        <div className="mt-[24px]">
          <LoadState
            loading={request.loading}
            error={
              request.error
                ? `Couldn't load this request. ${supportErrorMessage(request.error)}`
                : undefined
            }
            onRetry={request.reload}
            label="Loading support request"
          />
          {Boolean(request.error) && (
            <Link
              href={adminRoutes.support}
              className={cx(link, "mt-[14px] inline-block text-[13px]")}
            >
              Back to support
            </Link>
          )}
        </div>
      </div>
    );

  return (
    <div className={pagePadding}>
      <PageHeader
        title={r.subject}
        subtitle={`${r.reference} · ${categoryLabel(r.category)} · Received ${formatInstant(r.created_at)}`}
      />

      <div className="mt-[24px] grid gap-[18px] lg:mt-[30px] lg:max-w-[1100px] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-[24px]">
        <Card title="Message" className="self-start">
          <p className="text-[14px] leading-[23px] break-words whitespace-pre-line text-[#0d1b2a]">
            {r.message}
          </p>
        </Card>

        <div className="grid content-start gap-[18px]">
          <Card>
            <DetailList
              items={[
                ["Reference", r.reference],
                [
                  "Status",
                  <StatusTag key="s" tone="light">
                    {supportStatusLabel(r.status)}
                  </StatusTag>,
                ],
                ["Category", categoryLabel(r.category)],
                ["Received", formatInstant(r.created_at)],
                [
                  "Customer",
                  <Link key="c" href={adminRoutes.customer(r.customer.id)} className={link}>
                    {r.customer.name}
                  </Link>,
                ],
                ["Email", r.customer.email],
                [
                  "Booking",
                  r.booking_id ? (
                    <Link key="b" href={adminRoutes.booking(r.booking_id)} className={link}>
                      {r.booking_reference ?? "View booking"}
                    </Link>
                  ) : (
                    (r.booking_reference ?? "Not linked to a booking")
                  ),
                ],
              ]}
            />
          </Card>
          <InfoPanel title="Replying">
            Reply in Gmail opens a new email to the customer, quoting {r.reference} in the subject.
            Using another mail app? Copy the email address. The customer’s name and email are as
            they were when the request was sent.
          </InfoPanel>
        </div>
      </div>

      <div className="mt-[24px] flex flex-wrap gap-[14px]">
        <a
          href={gmailReplyLink(r)}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(smallPrimary, "min-w-[170px]")}
          style={PRIMARY_STYLE}
        >
          Reply in Gmail<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <CopyEmail email={r.customer.email} />
        {r.booking_id && (
          <Link
            href={adminRoutes.booking(r.booking_id)}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Open booking
          </Link>
        )}
        <Link
          href={adminRoutes.customer(r.customer.id)}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Open customer
        </Link>
        <Link
          href={adminRoutes.support}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Back to support
        </Link>
      </div>
    </div>
  );
}

/** Copies the customer's address, for a mail app the links don't open. */
function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(email).then(
          () => setState("copied"),
          () => setState("failed"),
        )
      }
      className={cx(smallOutline, "min-w-[150px]")}
      style={OUTLINE_STYLE}
    >
      <span aria-live="polite">
        {state === "copied" ? "Email copied" : state === "failed" ? email : "Copy email"}
      </span>
    </button>
  );
}
