"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardTitle,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import {
  formatLongDate,
  formatTimeRange,
  guests,
} from "@/features/user/account/utils/account-format";
import { userRoutes } from "@/constants/routes";
import type { BookingSummary } from "@/services/user/customer-bookings.service";

import { useYachtInfo } from "../hooks/use-yacht-info";
import { CUSTOMER_STATUS_LABELS } from "../utils/booking-view";

/** A booking in the "My bookings" list: title, details, photo, status and its link. */
export function BookingCard({
  booking,
  actionLabel,
  isFirst = false,
  status,
}: {
  booking: BookingSummary;
  actionLabel: string;
  /** The first card's photo is likely above the fold. */
  isFirst?: boolean;
  /** Replaces the booking status, e.g. "Cancellation under review" (pearl). */
  status?: string;
}) {
  const yacht = useYachtInfo(booking.yacht.slug);

  return (
    <Card as="article">
      <CardTitle>
        {booking.yacht.name}&nbsp;·&nbsp;{formatLongDate(booking.date)}
      </CardTitle>
      <MetaLines
        lines={[
          [
            formatTimeRange(booking.start_time, booking.end_time),
            yacht?.departureCity,
            guests(booking.guest_count),
          ]
            .filter(Boolean)
            .join(" · "),
          booking.reference,
        ]}
      />
      {yacht?.imageUrl ? (
        <div className="bg-pearl relative mt-4 aspect-[4/3] w-full overflow-hidden sm:aspect-[2.75/1]">
          <Image
            src={yacht.imageUrl}
            alt={`${booking.yacht.name} at sea`}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            preload={isFirst}
            // Backend photo hosts are not in next.config's image allow-list.
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}
      <StatusChip className="mt-3" tone={status ? "pearl" : "forest"}>
        {status ?? CUSTOMER_STATUS_LABELS[booking.status]}
      </StatusChip>
      <Link
        href={userRoutes.accountBooking(booking.reference)}
        className={`${primaryButtonClass} mt-2`}
        style={primaryButtonStyle}
      >
        {actionLabel}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </Link>
    </Card>
  );
}
