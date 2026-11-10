"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { resolveYacht, searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  Card,
  formGrid,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import {
  bookingStatusLabel,
  MARINA_TIME_ZONE,
  marinaToday,
  slotText,
} from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  CALENDAR_MAX_DAYS,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  deleteBlockBatch,
  findAvailabilityBlock,
  getYachtAvailability,
  updateAvailabilityBlock,
  type AvailabilityBlock,
  type BlockReason,
  type CalendarBooking,
  type CalendarHold,
} from "@/services/admin/availability.service";

import {
  addDays,
  availabilityErrorMessage,
  BLOCK_REASON_OPTIONS,
  blockReasonLabel,
  daysBetween,
  dayText,
  findOverlaps,
  isBlockConflict,
  localParts,
  zonedIso,
} from "../utils/availability-format";

const TITLE = "Make room for maintenance.";

/** "YYYY-MM-DDTHH:mm" from a datetime-local input → ISO with the marina's offset. */
const toIso = (value: string) =>
  zonedIso(value.slice(0, 10), value.slice(11, 16), MARINA_TIME_ZONE);

const isLocalValue = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

/** An ISO instant → "YYYY-MM-DDTHH:mm" in the marina's time zone, for a datetime-local input. */
function toLocalValue(iso: string): string {
  const { date, time } = localParts(iso, MARINA_TIME_ZONE);
  return `${date}T${time}`;
}

/** New block, optionally for a yacht and day (from the calendar). */
export function NewBlock({ yacht = "", date = "" }: { yacht?: string; date?: string }) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= marinaToday() ? date : "";
  return (
    <BlockForm
      initial={{
        yachtId: yacht,
        reason: "maintenance",
        start: day ? `${day}T08:00` : "",
        end: day ? `${day}T18:00` : "",
        note: "",
      }}
    />
  );
}

/** Edit an existing block (loaded from the block list; there is no single-block endpoint). */
export function EditBlock({ blockId }: { blockId: string }) {
  const block = useAdminQuery(
    (signal) => findAvailabilityBlock(blockId, signal),
    `block:${blockId}`,
  );
  if (block.data) {
    const b = block.data;
    return (
      <BlockForm
        block={b}
        initial={{
          yachtId: b.yacht.id,
          reason: b.reason as BlockReason,
          start: toLocalValue(b.starts_at),
          end: toLocalValue(b.ends_at),
          note: b.note ?? "",
        }}
      />
    );
  }
  return (
    <div className={pagePadding}>
      <PageHeader title={TITLE} />
      <div className="mt-[24px]">
        {block.data === null && !block.loading ? (
          <>
            <p className="text-[14px]" style={{ color: BODY }}>
              This block no longer exists. It may have been removed.
            </p>
            <Link
              href={adminRoutes.availability}
              className={cx(smallOutline, "mt-[18px] w-fit")}
              style={OUTLINE_STYLE}
            >
              Back to availability
            </Link>
          </>
        ) : (
          <LoadState
            loading={block.loading}
            error={
              block.error
                ? `Couldn't load the block. ${availabilityErrorMessage(block.error)}`
                : undefined
            }
            onRetry={block.reload}
            label="Loading block"
          />
        )}
      </div>
    </div>
  );
}

interface Values {
  yachtId: string;
  reason: BlockReason;
  /** datetime-local values in the marina's time zone. */
  start: string;
  end: string;
  note: string;
}

/**
 * "Make room for maintenance." (admin Figma A07): block a date or time
 * without overwriting existing charters. A 409 BLOCK_CONFLICT shows
 * "This time already has a journey." (A36) with the bookings in the way.
 */
function BlockForm({ initial, block }: { initial: Values; block?: AvailabilityBlock }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  // Name of the chosen yacht, for the conflict screen.
  const [pickedName, setPickedName] = useState("");
  const yachtName = block?.yacht.name ?? (pickedName || "This yacht");

  const rangeReady =
    Boolean(values.yachtId) &&
    isLocalValue(values.start) &&
    isLocalValue(values.end) &&
    values.end > values.start;
  const startIso = rangeReady ? toIso(values.start) : "";
  const endIso = rangeReady ? toIso(values.end) : "";

  // Bookings and holds around the range (the day before covers turnaround over midnight).
  const checkFrom = rangeReady ? addDays(values.start.slice(0, 10), -1) : "";
  const lastDay = rangeReady ? values.end.slice(0, 10) : "";
  const checkTo =
    rangeReady && daysBetween(checkFrom, lastDay) >= CALENDAR_MAX_DAYS
      ? addDays(checkFrom, CALENDAR_MAX_DAYS - 1)
      : lastDay;
  const partialCheck = rangeReady && checkTo !== lastDay;
  const calendar = useAdminQuery(
    (signal) =>
      rangeReady
        ? getYachtAvailability(values.yachtId, checkFrom, checkTo, signal)
        : Promise.resolve(null),
    `block-check:${values.yachtId}:${checkFrom}:${checkTo}`,
  );
  const calYacht = calendar.data?.yacht ?? null;
  const overlaps = calYacht && rangeReady ? findOverlaps(calYacht, startIso, endIso) : null;
  const otherBlocks =
    calYacht && rangeReady
      ? calYacht.blocks.filter(
          (b) =>
            b.id !== block?.id &&
            new Date(b.starts_at) < new Date(endIso) &&
            new Date(b.ends_at) > new Date(startIso),
        )
      : [];

  const errors: Partial<Record<keyof Values, string>> = {};
  if (submitted) {
    if (!values.yachtId) errors.yachtId = "Choose the yacht.";
    if (!isLocalValue(values.start)) errors.start = "Enter the start date and time.";
    if (!isLocalValue(values.end)) errors.end = "Enter the end date and time.";
    else if (isLocalValue(values.start) && values.end <= values.start)
      errors.end = "The end must be after the start.";
    if (values.note.length > 1000) errors.note = "Keep the note to 1,000 characters.";
  }

  const calendarHref = adminRoutes.availabilityFor(
    values.yachtId,
    (isLocalValue(values.start) ? values.start : marinaToday()).slice(0, 7),
    isLocalValue(values.start) ? values.start.slice(0, 10) : "",
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure("");
    const ok =
      values.yachtId &&
      isLocalValue(values.start) &&
      isLocalValue(values.end) &&
      values.end > values.start &&
      values.note.length <= 1000;
    if (!ok) return;
    if (new Date(toIso(values.end)).getTime() <= Date.now()) {
      setFailure("The block has already ended. Choose an end time in the future.");
      return;
    }
    setBusy(true);
    const note = values.note.trim();
    try {
      if (block) {
        await updateAvailabilityBlock(block.id, {
          starts_at: toIso(values.start),
          ends_at: toIso(values.end),
          reason: values.reason,
          note: note || null,
        });
      } else {
        await createAvailabilityBlock({
          yacht_id: values.yachtId,
          starts_at: toIso(values.start),
          ends_at: toIso(values.end),
          reason: values.reason,
          ...(note ? { note } : {}),
        });
      }
      router.push(
        adminRoutes.availabilityFor(
          values.yachtId,
          values.start.slice(0, 7),
          values.start.slice(0, 10),
          "block-saved",
        ),
      );
    } catch (err) {
      setBusy(false);
      if (isBlockConflict(err)) {
        calendar.reload();
        setConflict(true);
        window.scrollTo({ top: 0 });
      } else {
        setFailure(availabilityErrorMessage(err));
      }
    }
  }

  async function remove(wholeBatch = false) {
    if (!block) return;
    setBusy(true);
    setFailure("");
    try {
      if (wholeBatch && block.batch_id) await deleteBlockBatch(block.batch_id);
      else await deleteAvailabilityBlock(block.id);
      const start = toLocalValue(block.starts_at);
      router.push(
        adminRoutes.availabilityFor(
          block.yacht.id,
          start.slice(0, 7),
          start.slice(0, 10),
          "block-removed",
        ),
      );
    } catch (err) {
      setBusy(false);
      setConfirmRemove(false);
      setFailure(availabilityErrorMessage(err));
    }
  }

  if (conflict) {
    return (
      <ConflictView
        yachtName={yachtName}
        bookings={overlaps?.bookings ?? []}
        holds={overlaps?.holds ?? []}
        checking={calendar.loading}
        onBack={() => setConflict(false)}
      />
    );
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title={TITLE}
        subtitle={
          block
            ? `Edit the ${blockReasonLabel(block.reason).toLowerCase()} block on ${block.yacht.name}. Existing charters are never overwritten.`
            : "Block a date or time without overwriting existing charters."
        }
      />

      <form onSubmit={save} noValidate className="mt-[24px] lg:mt-[30px]">
        <div className={formGrid}>
          <div>
            <Label htmlFor="block-yacht" required={!block}>
              Yacht
            </Label>
            {block ? (
              <input id="block-yacht" value={block.yacht.name} disabled className={input} />
            ) : (
              <SearchSelect
                id="block-yacht"
                value={values.yachtId}
                onChange={(v, option) => {
                  set("yachtId", v);
                  setPickedName(option?.data?.name ?? "");
                }}
                load={searchYachts()}
                resolve={resolveYacht}
                invalid={errors.yachtId}
                placeholder="Search yachts by name"
                noResults="No yacht matches."
              />
            )}
            <FieldError id="block-yacht" message={errors.yachtId} />
          </div>
          <div>
            <Label htmlFor="block-reason" required>
              Block reason
            </Label>
            <SelectBox
              id="block-reason"
              value={values.reason}
              onChange={(v) => set("reason", v as BlockReason)}
              options={
                BLOCK_REASON_OPTIONS.some((o) => o.value === values.reason)
                  ? BLOCK_REASON_OPTIONS
                  : [
                      { value: values.reason, label: blockReasonLabel(values.reason) },
                      ...BLOCK_REASON_OPTIONS,
                    ]
              }
            />
          </div>
          <div>
            <Label htmlFor="block-start" required>
              Start
            </Label>
            <input
              id="block-start"
              type="datetime-local"
              value={values.start}
              onChange={(e) => {
                const start = e.currentTarget.value;
                // Keep the end after the start: move it to the same day when it was before.
                setValues((v) => ({
                  ...v,
                  start,
                  end:
                    isLocalValue(start) && (!v.end || v.end <= start)
                      ? start.slice(11) < "18:00"
                        ? `${start.slice(0, 10)}T18:00`
                        : `${addDays(start.slice(0, 10), 1)}T00:00`
                      : v.end,
                }));
              }}
              className={input}
              {...errorProps("block-start", errors.start)}
            />
            <FieldError id="block-start" message={errors.start} />
          </div>
          <div>
            <Label htmlFor="block-end" required>
              End
            </Label>
            <input
              id="block-end"
              type="datetime-local"
              value={values.end}
              min={isLocalValue(values.start) ? values.start : undefined}
              onChange={(e) => set("end", e.currentTarget.value)}
              className={input}
              {...errorProps("block-end", errors.end)}
            />
            <FieldError id="block-end" message={errors.end} />
          </div>
          <div>
            <Label htmlFor="block-note">Internal note</Label>
            <input
              id="block-note"
              value={values.note}
              maxLength={1000}
              onChange={(e) => set("note", e.currentTarget.value)}
              placeholder="e.g. Engine and safety inspection."
              className={input}
              {...errorProps("block-note", errors.note)}
            />
            <FieldError id="block-note" message={errors.note} />
          </div>
        </div>
        <p className="mt-[10px] text-[11px]" style={{ color: BODY }}>
          Times are in the marina’s time zone ({MARINA_TIME_ZONE}). The end is not included: a block
          ending at 18:00 frees the yacht from 18:00.
        </p>

        <InfoPanel title="Availability check" className="mt-[24px] lg:max-w-[880px]">
          {!rangeReady ? (
            "Choose the yacht, start and end to check this range against bookings and holds."
          ) : calendar.loading ? (
            "Checking bookings and holds in this range…"
          ) : calendar.error ? (
            <>
              Couldn’t check this range ({availabilityErrorMessage(calendar.error)}). The server
              checks it again when you save.{" "}
              <button type="button" onClick={calendar.reload} className="underline">
                Check again
              </button>
            </>
          ) : overlaps && (overlaps.bookings.length || overlaps.holds.length) ? (
            <>
              {overlaps.bookings.map((b) => (
                <span key={b.id} className="block">
                  <Link
                    href={adminRoutes.bookingReschedule(b.id)}
                    className="underline underline-offset-2 hover:no-underline"
                    title={`Reschedule ${b.reference}`}
                  >
                    {b.reference}
                  </Link>{" "}
                  ({bookingStatusLabel(b.status).toLowerCase()},{" "}
                  {dayText(b.date).replace(/ \d{4}$/, "")} · {slotText(b)}) overlaps this range or
                  its turnaround.
                </span>
              ))}
              {overlaps.holds.map((h) => (
                <span key={h.id} className="block">
                  A checkout payment hold ({dayText(h.date).replace(/ \d{4}$/, "")} · {slotText(h)})
                  overlaps this range until {localParts(h.expires_at, MARINA_TIME_ZONE).time}.
                </span>
              ))}
              <span className="mt-[4px] block">
                The block can’t be saved over a booking or a live hold. Choose another range, or
                manage the booking first.
              </span>
            </>
          ) : (
            <>
              No confirmed charter overlaps this range. If a booking or hold conflicts, review the
              affected records before applying the block.
              {otherBlocks.length > 0 && (
                <span className="mt-[4px] block">
                  It overlaps {otherBlocks.length === 1 ? "an existing block" : "existing blocks"} (
                  {otherBlocks.map((b) => blockReasonLabel(b.reason).toLowerCase()).join(", ")}).
                </span>
              )}
              {partialCheck && (
                <span className="mt-[4px] block">
                  Only the first {CALENDAR_MAX_DAYS} days were checked here; the server checks the
                  whole range when you save.
                </span>
              )}
            </>
          )}
        </InfoPanel>

        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button
            type="submit"
            disabled={busy}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={PRIMARY_STYLE}
          >
            {busy && !confirmRemove ? "Saving…" : "Save availability block"}
          </button>
          <Link
            href={calendarHref}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            Cancel
          </Link>
          {block && !confirmRemove && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
              className={cx(smallOutline, "min-w-[118px]")}
              style={OUTLINE_STYLE}
            >
              Remove block
            </button>
          )}
        </div>

        {block && confirmRemove && (
          <div
            role="alertdialog"
            aria-labelledby="remove-title"
            className="mt-[20px] border border-[#dcdad5] bg-white px-[18px] py-[18px] lg:max-w-[580px]"
          >
            <p id="remove-title" className="text-[14px]">
              Remove this block?
            </p>
            <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
              The time becomes bookable again straight away.
              {block.batch_id &&
                " This block was created with other yachts in a bulk block: remove only this yacht's, or the whole bulk block."}
            </p>
            <div className="mt-[14px] flex flex-wrap gap-[10px]">
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className={smallPrimary}
                style={PRIMARY_STYLE}
              >
                {busy ? "Removing…" : block.batch_id ? "Remove this yacht’s block" : "Remove block"}
              </button>
              {block.batch_id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(true)}
                  className={smallOutline}
                  style={OUTLINE_STYLE}
                >
                  Remove the whole bulk block
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemove(false)}
                className={smallOutline}
                style={OUTLINE_STYLE}
              >
                Keep block
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

/** "This time already has a journey." (admin Figma A36) */
function ConflictView({
  yachtName,
  bookings,
  holds,
  checking,
  onBack,
}: {
  yachtName: string;
  bookings: CalendarBooking[];
  holds: CalendarHold[];
  checking: boolean;
  onBack: () => void;
}) {
  const day = (date: string) => dayText(date).replace(/ \d{4}$/, "");
  const first = bookings[0];
  return (
    <div className={pagePadding}>
      <PageHeader
        title="This time already has a journey."
        subtitle={
          bookings.length || !holds.length
            ? "The block overlaps an existing confirmed booking."
            : "The block overlaps a customer’s checkout, which is holding the slot while they pay."
        }
      />

      <div className="mt-[24px] grid gap-[14px] lg:mt-[30px] lg:max-w-[880px]">
        {checking ? (
          <p className="text-[12px]" style={{ color: BODY }}>
            Finding the affected booking…
          </p>
        ) : (
          <>
            {bookings.map((b) => (
              <Card
                key={b.id}
                title={
                  <Link
                    href={adminRoutes.booking(b.id)}
                    className="underline-offset-4 hover:underline"
                  >
                    {b.reference} · {bookingStatusLabel(b.status)}
                  </Link>
                }
              >
                {yachtName} · {day(b.date)} · {slotText(b)}
                <br />
                {b.contact_name} · {b.guest_count} {b.guest_count === 1 ? "guest" : "guests"}
              </Card>
            ))}
            {holds.map((h) => (
              <Card key={h.id} title="Checkout in progress">
                {yachtName} · {day(h.date)} · {slotText(h)}
                <br />
                Held until {localParts(h.expires_at, MARINA_TIME_ZONE).time}; the slot is free again
                then if payment isn’t completed.
              </Card>
            ))}
            {!bookings.length && !holds.length && (
              <Card>
                A booking or checkout hold is in this range or its turnaround time. Open the
                calendar for this yacht to see it.
              </Card>
            )}
          </>
        )}
      </div>

      <InfoPanel title="Block not applied" className="mt-[20px] lg:max-w-[880px]">
        A confirmed charter cannot be silently overwritten. Choose another range or manage the
        affected booking through an authorised workflow.
      </InfoPanel>

      <div className="mt-[24px] flex flex-wrap gap-[14px]">
        <button
          type="button"
          onClick={onBack}
          className={cx(smallPrimary, "min-w-[150px]")}
          style={PRIMARY_STYLE}
        >
          Choose a different range
        </button>
        {first && (
          <Link
            href={adminRoutes.booking(first.id)}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Review affected booking
          </Link>
        )}
      </div>
    </div>
  );
}
