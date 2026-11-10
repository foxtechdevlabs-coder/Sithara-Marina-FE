"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { searchYachts } from "@/components/admin/lookups";
import { MultiSearchSelect } from "@/components/admin/multi-search-select";
import type { SearchOption } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { MARINA_TIME_ZONE, marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { cx } from "@/lib/cx";
import {
  bulkConflicts,
  createBulkBlocks,
  deleteBlockBatch,
  type BlockConflict,
  type BlockReason,
  type BulkBlockInput,
  type BulkBlocksResult,
} from "@/services/admin/availability.service";
import type { Yacht } from "@/services/admin/fleet.service";
import { isApiError } from "@/services/http/api-error";

import {
  availabilityErrorMessage,
  BLOCK_REASON_OPTIONS,
  blockReasonLabel,
  instantText,
  zonedIso,
} from "../utils/availability-format";

const MAX_YACHTS = 100;
const isLocalValue = (v: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);
const toIso = (v: string) => zonedIso(v.slice(0, 10), v.slice(11, 16), MARINA_TIME_ZONE);

/**
 * Block several yachts, or the whole active fleet, at once
 * (POST /admin/availability-blocks/bulk). A conflict lists the yachts in the
 * way and offers to block the others (`skip_conflicts`).
 */
export function BulkBlockForm() {
  const day = marinaToday();
  const [scope, setScope] = useState<"chosen" | "all">("chosen");
  const [yachts, setYachts] = useState<SearchOption<Yacht>[]>([]);
  const [reason, setReason] = useState<BlockReason>("maintenance");
  const [start, setStart] = useState(`${day}T08:00`);
  const [end, setEnd] = useState(`${day}T18:00`);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [conflicts, setConflicts] = useState<BlockConflict[] | null>(null);
  const [result, setResult] = useState<BulkBlocksResult | null>(null);

  const errors: Record<string, string> = {};
  if (submitted) {
    if (scope === "chosen" && !yachts.length) errors.yachts = "Choose at least one yacht.";
    if (!isLocalValue(start)) errors.start = "Enter the start date and time.";
    if (!isLocalValue(end)) errors.end = "Enter the end date and time.";
    else if (isLocalValue(start) && end <= start) errors.end = "The end must be after the start.";
    if (note.length > 1000) errors.note = "Keep the note to 1,000 characters.";
  }
  const valid =
    (scope === "all" || yachts.length > 0) &&
    isLocalValue(start) &&
    isLocalValue(end) &&
    end > start &&
    note.length <= 1000;

  const input_: BulkBlockInput = {
    ...(scope === "all" ? { all_active: true } : { yacht_ids: yachts.map((y) => y.value) }),
    starts_at: isLocalValue(start) ? toIso(start) : "",
    ends_at: isLocalValue(end) ? toIso(end) : "",
    reason,
    ...(note.trim() ? { note: note.trim() } : {}),
  };

  async function send(skip: boolean) {
    setBusy(true);
    setFailure("");
    try {
      const saved = await createBulkBlocks({ ...input_, skip_conflicts: skip });
      setResult(saved);
      setConflicts(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (isApiError(err) && (err.code === "BLOCK_CONFLICT" || err.status === 409)) {
        setConflicts(bulkConflicts(err.body));
        window.scrollTo({ top: 0 });
      } else setFailure(availabilityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    if (new Date(toIso(end)).getTime() <= Date.now()) {
      setFailure("The block has already ended. Choose an end time in the future.");
      return;
    }
    void send(false);
  }

  if (result) return <BulkResult result={result} onAgain={() => setResult(null)} />;

  const period =
    isLocalValue(start) && isLocalValue(end)
      ? `${instantText(toIso(start), MARINA_TIME_ZONE)} – ${instantText(toIso(end), MARINA_TIME_ZONE)}`
      : "";

  if (conflicts) {
    const total = scope === "all" ? null : yachts.length;
    const free = total === null ? null : total - conflicts.length;
    return (
      <div className={pagePadding}>
        <PageHeader
          title="Some yachts already have a journey."
          subtitle={`${blockReasonLabel(reason)} · ${period}`}
        />
        <p className="mt-[20px] text-[13px] lg:max-w-[880px]">
          {conflicts.length === 1 ? "One yacht has" : `${conflicts.length} yachts have`} a booking
          or a live checkout in this period. Nothing was blocked yet.
        </p>
        <ul className="mt-[16px] grid gap-[12px] lg:max-w-[880px]">
          {conflicts.map((c) => (
            <li key={c.yacht_id} className="border border-[#dcdad5] bg-white px-[18px] py-[16px]">
              <p className="text-[18px] leading-[24px] break-words">{c.yacht_name}</p>
              <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
                {c.booking_references.length > 0 && (
                  <>
                    {c.booking_references.length === 1 ? "Booking " : "Bookings "}
                    {c.booking_references.join(", ")}
                  </>
                )}
                {c.booking_references.length > 0 && c.checkout_in_progress && " · "}
                {c.checkout_in_progress && "A customer is checking out (a 10-minute hold)"}
              </p>
            </li>
          ))}
          {!conflicts.length && (
            <li className="text-[12px]" style={{ color: BODY }}>
              A booking or checkout is in the way, but the server didn’t say where.
            </li>
          )}
        </ul>
        <InfoPanel title="Block not applied" className="mt-[18px] lg:max-w-[880px]">
          Confirmed charters are never overwritten. Block the others now and deal with these yachts
          separately, or choose another range.
        </InfoPanel>
        {failure && (
          <Notice tone="error" className="mt-[16px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}
        <div className="mt-[22px] flex flex-wrap gap-[14px]">
          <button
            type="button"
            disabled={busy || free === 0}
            onClick={() => void send(true)}
            className={cx(smallPrimary, "min-w-[160px]")}
            style={PRIMARY_STYLE}
          >
            {busy
              ? "Blocking…"
              : free === null
                ? "Block the others"
                : free === 0
                  ? "No other yachts to block"
                  : `Block the other ${free} yacht${free === 1 ? "" : "s"}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConflicts(null)}
            className={cx(smallOutline, "min-w-[160px]")}
            style={OUTLINE_STYLE}
          >
            Choose a different range
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Make room across the fleet."
        subtitle="Block several yachts, or every active yacht, for the same time. Existing charters are never overwritten."
      />

      <form onSubmit={submit} noValidate className="mt-[24px] lg:mt-[30px] lg:max-w-[880px]">
        <SegmentTabs
          label="Which yachts"
          value={scope}
          onChange={setScope}
          options={[
            { value: "chosen", label: "Chosen yachts" },
            { value: "all", label: "Every active yacht" },
          ]}
        />

        {scope === "chosen" ? (
          <div className="mt-[18px]">
            <Label htmlFor="bulk-block-yachts" required>
              Yachts
            </Label>
            <MultiSearchSelect<Yacht>
              id="bulk-block-yachts"
              values={yachts}
              onChange={setYachts}
              load={searchYachts()}
              max={MAX_YACHTS}
              placeholder="Search yachts to add"
              noResults="No yacht matches."
              invalid={errors.yachts}
            />
            <FieldError id="bulk-block-yachts" message={errors.yachts} />
          </div>
        ) : (
          <p className="mt-[16px] text-[12px]" style={{ color: BODY }}>
            Every yacht that is active when you save. Inactive yachts aren’t blocked.
          </p>
        )}

        <div className="mt-[20px] grid gap-x-[18px] gap-y-[20px] lg:grid-cols-2">
          <div>
            <Label htmlFor="bulk-block-start" required>
              Start
            </Label>
            <input
              id="bulk-block-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.currentTarget.value)}
              className={input}
              {...errorProps("bulk-block-start", errors.start)}
            />
            <FieldError id="bulk-block-start" message={errors.start} />
          </div>
          <div>
            <Label htmlFor="bulk-block-end" required>
              End
            </Label>
            <input
              id="bulk-block-end"
              type="datetime-local"
              value={end}
              min={isLocalValue(start) ? start : undefined}
              onChange={(e) => setEnd(e.currentTarget.value)}
              className={input}
              {...errorProps("bulk-block-end", errors.end)}
            />
            <FieldError id="bulk-block-end" message={errors.end} />
          </div>
          <div>
            <Label htmlFor="bulk-block-reason" required>
              Block reason
            </Label>
            <SelectBox
              id="bulk-block-reason"
              value={reason}
              onChange={(v) => setReason(v as BlockReason)}
              options={BLOCK_REASON_OPTIONS}
            />
          </div>
          <div>
            <Label htmlFor="bulk-block-note">Internal note</Label>
            <input
              id="bulk-block-note"
              value={note}
              maxLength={1000}
              placeholder="e.g. Cyclone warning for the coast"
              onChange={(e) => setNote(e.currentTarget.value)}
              className={input}
              {...errorProps("bulk-block-note", errors.note)}
            />
            <FieldError id="bulk-block-note" message={errors.note} />
          </div>
        </div>
        <p className="mt-[10px] text-[11px]" style={{ color: BODY }}>
          Times are in the marina’s time zone ({MARINA_TIME_ZONE}). The end is not included.
        </p>

        <InfoPanel title="Availability check" className="mt-[20px]">
          The server checks every yacht for confirmed bookings, unpaid bookings that still hold
          their slot, and live checkouts, including turnaround. If any are in the way, nothing is
          blocked until you choose.
        </InfoPanel>

        {failure && (
          <Notice tone="error" className="mt-[16px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[22px] flex flex-wrap gap-[14px]">
          <button
            type="submit"
            disabled={busy}
            className={cx(smallPrimary, "min-w-[160px]")}
            style={PRIMARY_STYLE}
          >
            {busy
              ? "Checking…"
              : scope === "all"
                ? "Block every active yacht"
                : `Block ${yachts.length || ""} yacht${yachts.length === 1 ? "" : "s"}`}
          </button>
          <Link
            href={adminRoutes.availability}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function BulkResult({ result, onAgain }: { result: BulkBlocksResult; onAgain: () => void }) {
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const first = result.blocks[0];

  async function removeBatch() {
    if (!result.batch_id) return;
    if (
      !window.confirm(
        `Remove all ${result.blocks.length} blocks? Those times become bookable again.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await deleteBlockBatch(result.batch_id);
      setRemoved(true);
    } catch (err) {
      setError(availabilityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title={removed ? "Bulk block removed." : "Time set aside across the fleet."}
        subtitle={
          first
            ? `${blockReasonLabel(first.reason)} · ${instantText(first.starts_at, MARINA_TIME_ZONE)} – ${instantText(first.ends_at, MARINA_TIME_ZONE)}`
            : undefined
        }
      />
      <Notice
        tone={removed ? "success" : result.blocks.length ? "success" : "error"}
        className="mt-[20px] lg:max-w-[880px]"
      >
        {removed
          ? `All ${result.blocks.length} blocks were removed; those times are bookable again.`
          : result.blocks.length
            ? `${result.blocks.length} yacht${result.blocks.length === 1 ? "" : "s"} blocked.${result.skipped.length ? ` ${result.skipped.length} skipped because of bookings.` : ""}`
            : "No yacht was blocked: every one has a booking or checkout in this period."}
      </Notice>

      {result.blocks.length > 0 && !removed && (
        <div className="mt-[22px] overflow-x-auto lg:max-w-[880px]">
          <table className="w-full border-collapse text-left text-[11px]">
            <caption className="sr-only">Blocked yachts</caption>
            <thead>
              <tr style={{ backgroundColor: SAND }}>
                {["Blocked yacht", ""].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-[12px] py-[12px] font-normal"
                    style={{ color: BODY }}
                  >
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {result.blocks.map((b) => (
                <tr key={b.id} className="border-b border-[#ebe9e4]">
                  <td className="px-[12px] py-[12px] break-words">{b.yacht.name}</td>
                  <td className="px-[12px] py-[12px] text-right">
                    <Link
                      href={adminRoutes.availabilityBlock(b.id)}
                      className="underline underline-offset-2"
                    >
                      Edit<span className="sr-only"> block on {b.yacht.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.skipped.length > 0 && (
        <section aria-labelledby="skipped" className="mt-[24px] lg:max-w-[880px]">
          <h2 id="skipped" className="text-[18px] leading-[24px]">
            Not blocked
          </h2>
          <ul className="mt-[10px] grid gap-[10px]">
            {result.skipped.map((c) => (
              <li
                key={c.yacht_id}
                className="border border-[#dcdad5] bg-white px-[16px] py-[12px] text-[12px]"
              >
                <span className="text-[14px] break-words">{c.yacht_name}</span>
                <span className="block" style={{ color: BODY }}>
                  {[
                    c.booking_references.length
                      ? `Bookings ${c.booking_references.join(", ")}`
                      : "",
                    c.checkout_in_progress ? "a checkout in progress" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <Notice tone="error" className="mt-[16px] lg:max-w-[880px]">
          {error}
        </Notice>
      )}

      <div className="mt-[24px] flex flex-wrap gap-[14px]">
        <Link
          href={adminRoutes.availabilityBlocked}
          className={cx(smallPrimary, "min-w-[150px]")}
          style={PRIMARY_STYLE}
        >
          View all blocks
        </Link>
        {result.batch_id && !removed && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void removeBatch()}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            {busy ? "Removing…" : "Remove this bulk block"}
          </button>
        )}
        <button
          type="button"
          onClick={onAgain}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Block another range
        </button>
      </div>
    </div>
  );
}
