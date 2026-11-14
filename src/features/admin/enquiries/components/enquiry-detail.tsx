"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

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
import { searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import { zonedIso, localParts } from "@/features/admin/availability/utils/availability-format";
import {
  Card,
  formGrid,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import {
  formatInstant,
  formatRupees,
  marinaToday,
  MARINA_TIME_ZONE,
} from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { quoteOfficeBooking } from "@/services/admin/bookings.service";
import {
  createProposal,
  getEnquiry,
  reviseProposal,
  updateEnquiry,
  updateProposal,
  type EnquiryDetail as Detail,
  type Proposal,
  type ProposalInput,
} from "@/services/admin/enquiries.service";
import { getSlotTypes } from "@/services/admin/fleet.service";
import { listStaff } from "@/services/admin/staff.service";

import {
  contextEntries,
  dayText,
  enquiryErrorMessage,
  historyText,
  MANUAL_STAGES,
  parseList,
  proposalStatusLabel,
  stageLabel,
} from "../utils/enquiry-format";

type Tab = "enquiry" | "proposal" | "history";

const textarea = cx(input, "h-auto min-h-[88px] py-[12px] leading-[20px]");

/** "12 November · 8 guests · Birthday · Budget ₹2–3 lakh" etc. from the enquiry. */
function preferenceLines(e: Detail): string[] {
  const first = [
    e.preferred_date ? dayText(e.preferred_date) : null,
    e.preferred_start_time ? `from ${e.preferred_start_time}` : null,
    e.slot_type?.name ?? null,
    e.guests ? `${e.guests} guests` : null,
    e.occasion,
    e.budget ? `Budget ${e.budget}` : null,
  ].filter(Boolean);
  const second = [
    e.yacht ? `${e.yacht.name} preferred` : "Flexible on yacht",
    ...(e.destinations.length ? [e.destinations.join(", ")] : []),
    ...contextEntries(e.context),
  ];
  return [first.join(" · ") || "No date or size given", second.join(" · ")];
}

/** Enquiry: "A journey in the making." (admin Figma A29). */
export function EnquiryDetail({
  enquiryId,
  initialTab = "enquiry",
  notice,
}: {
  enquiryId: string;
  initialTab?: Tab;
  notice?: string;
}) {
  const enquiry = useAdminQuery((signal) => getEnquiry(enquiryId, signal), `enquiry:${enquiryId}`);
  const [tab, setTab] = useState<Tab>(initialTab);

  if (!enquiry.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A journey in the making." />
        <div className="mt-[24px]">
          <LoadState
            loading={enquiry.loading}
            error={
              enquiry.error
                ? `Couldn't load the enquiry. ${enquiryErrorMessage(enquiry.error)}`
                : undefined
            }
            onRetry={enquiry.reload}
            label="Loading enquiry"
          />
        </div>
      </div>
    );
  }
  const e = enquiry.data;

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A journey in the making."
        subtitle={`Enquiry ${e.reference} · ${e.contact.full_name}`}
      />
      {notice === "sent" && (
        <Notice className="mt-[18px] lg:max-w-[880px]">Proposal sent to {e.contact.email}.</Notice>
      )}

      <div className="mt-[20px] lg:mt-[26px]">
        <SegmentTabs
          label="Enquiry sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "enquiry", label: "Enquiry" },
            {
              value: "proposal",
              label: `Proposal${e.proposals.length ? ` (${e.proposals.length})` : ""}`,
            },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "enquiry" && (
        <EnquiryTab enquiry={e} onChanged={enquiry.reload} onSaved={(d) => enquiry.setData(d)} />
      )}
      {tab === "proposal" && (
        <ProposalsTab enquiry={e} onChanged={enquiry.reload} openForm={() => setTab("enquiry")} />
      )}
      {tab === "history" && <HistoryTab enquiry={e} />}
    </div>
  );
}

function EnquiryTab({
  enquiry: e,
  onChanged,
  onSaved,
}: {
  enquiry: Detail;
  onChanged: () => void;
  onSaved: (d: Detail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string }>();
  const lines = preferenceLines(e);

  async function patch(change: Parameters<typeof updateEnquiry>[1], done: string) {
    setBusy(true);
    setNote(undefined);
    try {
      const saved = await updateEnquiry(e.id, change);
      onSaved({ ...e, ...saved });
      setNote({ tone: "success", text: done });
    } catch (err) {
      setNote({ tone: "error", text: enquiryErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const manual = (MANUAL_STAGES as readonly string[]).includes(e.status);

  return (
    <>
      <Card title="Customer preferences" className="mt-[24px] lg:max-w-[880px]">
        {lines[0]}
        <br />
        {lines[1]}
        {e.preferences && (
          <span className="mt-[8px] block whitespace-pre-line">Preferences: {e.preferences}</span>
        )}
        {e.message && (
          <span className="mt-[8px] block" style={{ color: "#0d1b2a" }}>
            “{e.message}”
          </span>
        )}
        <span className="mt-[8px] block">
          {e.contact.full_name} · {e.contact.email}
          {e.contact.phone ? ` · ${e.contact.phone}` : ""} · received {formatInstant(e.created_at)}
        </span>
      </Card>

      <div className={cx(formGrid, "mt-[24px] lg:max-w-[700px]")}>
        <div>
          <Label htmlFor="enquiry-assignee">Assigned concierge</Label>
          <SearchSelect
            id="enquiry-assignee"
            value={e.assigned_to?.id ?? ""}
            selectedLabel={e.assigned_to?.full_name}
            disabled={busy}
            onChange={(v, option) =>
              void patch(
                { assigned_to_id: v || null },
                v ? `Assigned to ${option?.label ?? "the concierge"}.` : "Unassigned.",
              )
            }
            load={async (search, signal) => {
              const staff = await listStaff(
                { limit: 20, ...(search ? { search: search.slice(0, 100) } : {}) },
                signal,
              );
              return {
                options: staff.items
                  .filter((s) => s.is_active)
                  .map((s) => ({ value: s.id, label: s.full_name, description: s.email })),
                hasMore: staff.total > staff.items.length,
              };
            }}
            clearable
            emptyLabel="Unassigned"
            placeholder="Search staff by name or email"
            noResults="No active staff member matches."
          />
        </div>
        <div>
          <Label htmlFor="enquiry-stage">Stage</Label>
          <SelectBox
            id="enquiry-stage"
            value={e.status}
            disabled={busy}
            onChange={(v) =>
              void patch(
                { status: v as (typeof MANUAL_STAGES)[number] },
                `Stage set to ${stageLabel(v)}.`,
              )
            }
            options={[
              ...(manual
                ? []
                : [{ value: e.status, label: `${stageLabel(e.status)} (from the proposal)` }]),
              ...MANUAL_STAGES.map((s) => ({ value: s, label: stageLabel(s) })),
            ]}
          />
        </div>
      </div>
      {note && (
        <Notice tone={note.tone} className="mt-[14px] lg:max-w-[700px]">
          {note.text}
        </Notice>
      )}

      <ProposalForm enquiry={e} onChanged={onChanged} />
    </>
  );
}

interface Draft {
  yachtId: string;
  yachtName: string;
  date: string;
  slotTypeId: string;
  startTime: string;
  guests: string;
  /** datetime-local in the marina's time zone; empty: 7 days after sending. */
  expires: string;
  inclusions: string;
  terms: string;
  message: string;
}

function draftFrom(e: Detail, p: Proposal | undefined): Draft {
  if (p)
    return {
      yachtId: p.yacht.id,
      yachtName: p.yacht.name,
      date: p.date,
      slotTypeId: p.slot_type_id ?? "",
      startTime: p.start_time,
      guests: String(p.guests),
      expires: p.expires_at
        ? (({ date, time }) => `${date}T${time}`)(localParts(p.expires_at, MARINA_TIME_ZONE))
        : "",
      inclusions: p.inclusions.join("\n"),
      terms: p.terms ?? "",
      message: p.message ?? "",
    };
  return {
    yachtId: e.yacht?.id ?? "",
    yachtName: e.yacht?.name ?? "",
    date: e.preferred_date ?? "",
    slotTypeId: e.slot_type?.id ?? "",
    startTime: e.preferred_start_time ?? "",
    guests: e.guests ? String(e.guests) : "",
    expires: "",
    inclusions: "",
    terms: "",
    message: "",
  };
}

/** A problem with the validity date-time (empty is fine: 7 days after sending). */
function expiryProblem(expires: string, now: number): string | null {
  if (!expires) return null;
  const ms = new Date(
    zonedIso(expires.slice(0, 10), expires.slice(11, 16), MARINA_TIME_ZONE),
  ).getTime();
  if (ms <= now) return "Choose a time in the future.";
  if (ms > now + 90 * 86_400_000) return "At most 90 days ahead.";
  return null;
}

/** The proposal being worked on: a new one, or the latest draft (POST …/proposals, PATCH /admin/proposals/{id}). */
function ProposalForm({ enquiry: e, onChanged }: { enquiry: Detail; onChanged: () => void }) {
  const router = useRouter();
  const startList = useId();
  const latest = e.proposals[0];
  const draftProposal = latest?.status === "draft" ? latest : undefined;
  const locked = latest && latest.status !== "draft";
  const closed = e.status === "closed";
  const [draft, setDraft] = useState<Draft>(() => draftFrom(e, draftProposal));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string }>();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  // When the form opened: checks the validity date during render without reading the clock.
  const [now] = useState(() => Date.now());

  const slots = useAdminQuery(
    (signal) => (draft.yachtId ? getSlotTypes(draft.yachtId, signal) : Promise.resolve(null)),
    `proposal-slots:${draft.yachtId}`,
  );
  const packages = (slots.data?.slot_types ?? []).filter(
    (t) => t.is_active || t.id === draft.slotTypeId,
  );
  const pkg = packages.find((t) => t.id === draft.slotTypeId);
  const guests = Number(draft.guests);
  // The package must be one the chosen yacht offers (the enquiry's may not be).
  const ready =
    Boolean(
      draft.yachtId &&
      pkg &&
      /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
      /^\d{2}:\d{2}$/.test(draft.startTime),
    ) &&
    Number.isInteger(guests) &&
    guests >= 1;
  const quote = useAdminQuery(
    (signal) =>
      ready
        ? quoteOfficeBooking(
            {
              yacht_id: draft.yachtId,
              slot_type_id: draft.slotTypeId,
              date: draft.date,
              start_time: draft.startTime,
              guests,
            },
            signal,
          )
        : Promise.resolve(null),
    `proposal-quote:${ready}:${draft.yachtId}:${draft.slotTypeId}:${draft.date}:${draft.startTime}:${guests}`,
  );

  const errors: Record<string, string> = {};
  if (submitted) {
    if (!draft.yachtId) errors.yacht = "Choose the yacht to propose.";
    if (!draft.date) errors.date = "Choose the departure date.";
    else if (draft.date < marinaToday()) errors.date = "The date can’t be in the past.";
    if (!pkg)
      errors.slot =
        packages.length || slots.loading
          ? "Choose a package."
          : "This yacht has no packages yet: add one under Pricing & slots.";
    if (!/^\d{2}:\d{2}$/.test(draft.startTime)) errors.start = "Enter the start time.";
    if (!Number.isInteger(guests) || guests < 1) errors.guests = "Enter the number of guests.";
    const expiry = expiryProblem(draft.expires, now);
    if (expiry) errors.expires = expiry;
    if (draft.message.length > 4000) errors.message = "Keep it to 4,000 characters.";
    if (draft.terms.length > 10000) errors.terms = "Keep it to 10,000 characters.";
  }

  const toInput = (): ProposalInput => ({
    yacht_id: draft.yachtId,
    slot_type_id: draft.slotTypeId,
    date: draft.date,
    start_time: draft.startTime,
    guests,
    inclusions: parseList(draft.inclusions),
    ...(draft.message.trim() ? { message: draft.message.trim() } : {}),
    ...(draft.terms.trim() ? { terms: draft.terms.trim() } : {}),
    ...(draft.expires
      ? {
          expires_at: zonedIso(
            draft.expires.slice(0, 10),
            draft.expires.slice(11, 16),
            MARINA_TIME_ZONE,
          ),
        }
      : {}),
  });

  async function save(then: "stay" | "preview") {
    setSubmitted(true);
    setNote(undefined);
    const valid =
      ready &&
      draft.date >= marinaToday() &&
      draft.message.length <= 4000 &&
      draft.terms.length <= 10000 &&
      !expiryProblem(draft.expires, Date.now());
    if (!valid) return;
    setBusy(true);
    try {
      const input = toInput();
      const saved = draftProposal
        ? await updateProposal(draftProposal.id, {
            ...input,
            message: draft.message.trim() || null,
            terms: draft.terms.trim() || null,
            expires_at: input.expires_at ?? null,
          })
        : await createProposal(e.id, input);
      if (then === "preview") router.push(adminRoutes.enquiryProposal(e.id, saved.id));
      else {
        setNote({
          tone: "success",
          text: `Draft v${saved.version} saved. Total ${saved.pricing.total_amount === null ? "set once GST is configured" : formatRupees(saved.pricing.total_amount)}.`,
        });
        onChanged();
      }
    } catch (err) {
      setNote({ tone: "error", text: enquiryErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function revise() {
    if (!latest) return;
    setBusy(true);
    setNote(undefined);
    try {
      const next = await reviseProposal(latest.id);
      setDraft(draftFrom(e, next));
      setNote({
        tone: "success",
        text: `Version ${next.version} drafted from version ${latest.version}. Change it, then send.`,
      });
      onChanged();
    } catch (err) {
      setNote({ tone: "error", text: enquiryErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  if (locked) {
    return (
      <section aria-labelledby="proposal-locked" className="mt-[30px] lg:max-w-[880px]">
        <h2 id="proposal-locked" className="text-[20px] leading-[26px]">
          Proposal v{latest.version} · {proposalStatusLabel(latest.status)}
        </h2>
        <p className="mt-[8px] text-[12px] leading-[18px]" style={{ color: BODY }}>
          {latest.yacht.name} · {dayText(latest.date)} · {latest.start_time}–{latest.end_time} ·{" "}
          {latest.guests} guests ·{" "}
          {latest.pricing.total_amount === null
            ? "total pending GST"
            : formatRupees(latest.pricing.total_amount)}
          {latest.sent_at ? ` · sent ${formatInstant(latest.sent_at)}` : ""}
          {latest.expires_at ? ` · valid until ${formatInstant(latest.expires_at)}` : ""}
        </p>
        {latest.decision_comment && (
          <p className="mt-[6px] text-[12px]">Customer’s comment: “{latest.decision_comment}”</p>
        )}
        {note && (
          <Notice tone={note.tone} className="mt-[14px]">
            {note.text}
          </Notice>
        )}
        {latest.status === "accepted" ? (
          <Notice className="mt-[14px]">
            The customer accepted this proposal and was sent to checkout.
          </Notice>
        ) : (
          <div className="mt-[16px] flex flex-wrap gap-[14px]">
            <button
              type="button"
              disabled={busy || closed}
              onClick={() => void revise()}
              className={cx(smallPrimary, "min-w-[170px]")}
              style={PRIMARY_STYLE}
            >
              {busy ? "Drafting…" : `Revise into version ${latest.version + 1}`}
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(ev: FormEvent) => {
        ev.preventDefault();
        void save("stay");
      }}
      aria-labelledby="proposal-form"
      className="mt-[30px]"
    >
      <h2 id="proposal-form" className="text-[20px] leading-[26px]">
        {draftProposal ? `Proposal v${draftProposal.version} · draft` : "New proposal"}
      </h2>
      {closed && (
        <Notice tone="error" className="mt-[12px] lg:max-w-[700px]">
          This enquiry is closed. Set the stage back to New or Needs details to work on a proposal.
        </Notice>
      )}
      <fieldset disabled={closed || busy} className="contents">
        <div className={cx(formGrid, "mt-[16px] lg:max-w-[700px]")}>
          <div>
            <Label htmlFor="proposal-yacht" required>
              Proposed yacht
            </Label>
            <SearchSelect
              id="proposal-yacht"
              value={draft.yachtId}
              selectedLabel={draft.yachtName || undefined}
              onChange={(v, option) =>
                setDraft((d) => ({
                  ...d,
                  yachtId: v,
                  yachtName: option?.data?.name ?? "",
                  slotTypeId: "",
                }))
              }
              load={searchYachts({ status: "active" })}
              invalid={errors.yacht}
              placeholder="Search active yachts"
              noResults="No active yacht matches."
            />
            <FieldError id="proposal-yacht" message={errors.yacht} />
          </div>
          <div>
            <Label htmlFor="proposal-date" required>
              Departure
            </Label>
            <input
              id="proposal-date"
              type="date"
              min={marinaToday()}
              value={draft.date}
              onChange={(ev) => set("date", ev.currentTarget.value)}
              className={input}
              {...errorProps("proposal-date", errors.date)}
            />
            <FieldError id="proposal-date" message={errors.date} />
          </div>
          <div>
            <Label htmlFor="proposal-slot" required>
              Package
            </Label>
            <SelectBox
              id="proposal-slot"
              value={pkg ? draft.slotTypeId : ""}
              onChange={(v) => {
                const t = packages.find((x) => x.id === v);
                setDraft((d) => ({
                  ...d,
                  slotTypeId: v,
                  startTime: d.startTime || t?.start_times[0] || "",
                }));
              }}
              disabled={!draft.yachtId || slots.loading}
              invalid={errors.slot}
              options={[
                {
                  value: "",
                  label: !draft.yachtId
                    ? "Choose a yacht first"
                    : slots.loading
                      ? "Loading packages…"
                      : packages.length
                        ? "Choose a package"
                        : "This yacht has no packages",
                },
                ...packages.map((t) => ({
                  value: t.id,
                  label: `${t.name} · ${t.duration_minutes / 60} h`,
                })),
              ]}
            />
            <FieldError id="proposal-slot" message={errors.slot} />
          </div>
          <div>
            <Label htmlFor="proposal-start" required hint="any time within charter hours">
              Start time
            </Label>
            <input
              id="proposal-start"
              type="time"
              list={startList}
              value={draft.startTime}
              onChange={(ev) => set("startTime", ev.currentTarget.value)}
              className={input}
              {...errorProps("proposal-start", errors.start)}
            />
            <datalist id={startList}>
              {(pkg?.start_times ?? []).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <FieldError id="proposal-start" message={errors.start} />
          </div>
          <div>
            <Label htmlFor="proposal-guests" required>
              Guests
            </Label>
            <input
              id="proposal-guests"
              inputMode="numeric"
              value={draft.guests}
              onChange={(ev) => set("guests", ev.currentTarget.value.replace(/\D/g, ""))}
              className={input}
              {...errorProps("proposal-guests", errors.guests)}
            />
            <FieldError id="proposal-guests" message={errors.guests} />
          </div>
          <div>
            <Label htmlFor="proposal-expires" hint="empty: 7 days after sending">
              Proposal validity
            </Label>
            <input
              id="proposal-expires"
              type="datetime-local"
              value={draft.expires}
              onChange={(ev) => set("expires", ev.currentTarget.value)}
              className={input}
              {...errorProps("proposal-expires", errors.expires)}
            />
            <FieldError id="proposal-expires" message={errors.expires} />
          </div>
          <div>
            <Label htmlFor="proposal-total">Total proposal amount</Label>
            <input
              id="proposal-total"
              readOnly
              value={
                !ready
                  ? "Choose yacht, date, package, time and guests"
                  : quote.loading
                    ? "Pricing…"
                    : quote.error
                      ? enquiryErrorMessage(quote.error)
                      : quote.data
                        ? `${formatRupees(quote.data.total_amount)} incl. GST`
                        : ""
              }
              className={cx(input, "bg-[#fbfaf8]")}
            />
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              From the yacht’s prices for that date; checked again when sent and at checkout.
            </p>
          </div>
        </div>

        <div className="mt-[20px] grid gap-y-[20px] lg:max-w-[700px]">
          <div>
            <Label htmlFor="proposal-inclusions" hint="one per line">
              Itinerary and inclusions
            </Label>
            <textarea
              id="proposal-inclusions"
              value={draft.inclusions}
              rows={3}
              placeholder={"Private coastal charter\nCrew\nSeasonal dining"}
              onChange={(ev) => set("inclusions", ev.currentTarget.value)}
              className={textarea}
            />
          </div>
          <div>
            <Label htmlFor="proposal-terms">Exclusions and policy</Label>
            <textarea
              id="proposal-terms"
              value={draft.terms}
              rows={3}
              maxLength={10000}
              placeholder="Attach the agreed charter terms and relevant exclusions."
              onChange={(ev) => set("terms", ev.currentTarget.value)}
              className={textarea}
              {...errorProps("proposal-terms", errors.terms)}
            />
            <FieldError id="proposal-terms" message={errors.terms} />
          </div>
          <div>
            <Label htmlFor="proposal-message" hint="shown to the customer">
              Message to the customer
            </Label>
            <textarea
              id="proposal-message"
              value={draft.message}
              rows={3}
              maxLength={4000}
              placeholder="A personal note to go with the proposal."
              onChange={(ev) => set("message", ev.currentTarget.value)}
              className={textarea}
              {...errorProps("proposal-message", errors.message)}
            />
            <FieldError id="proposal-message" message={errors.message} />
          </div>
        </div>

        {note && (
          <Notice tone={note.tone} className="mt-[16px] lg:max-w-[700px]">
            {note.text}
          </Notice>
        )}

        <div className="mt-[22px] flex flex-wrap gap-[14px]">
          <button type="submit" className={cx(smallPrimary, "min-w-[150px]")} style={PRIMARY_STYLE}>
            {busy ? "Saving…" : "Save proposal draft"}
          </button>
          <button
            type="button"
            onClick={() => void save("preview")}
            className={cx(smallOutline, "min-w-[170px]")}
            style={OUTLINE_STYLE}
          >
            Preview customer proposal
          </button>
        </div>
        <div className="mt-[14px]">
          <button
            type="button"
            onClick={() => void save("preview")}
            className={cx(smallPrimary, "min-w-[170px]")}
            style={PRIMARY_STYLE}
          >
            Review & send proposal
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function ProposalsTab({
  enquiry: e,
  onChanged,
  openForm,
}: {
  enquiry: Detail;
  onChanged: () => void;
  openForm: () => void;
}) {
  void onChanged;
  if (!e.proposals.length)
    return (
      <p className="mt-[24px] text-[13px]" style={{ color: BODY }}>
        No proposal yet.{" "}
        <button type="button" onClick={openForm} className="underline underline-offset-2">
          Draft one on the Enquiry tab
        </button>
        .
      </p>
    );
  return (
    <ul className="mt-[24px] grid gap-[14px] lg:max-w-[880px]">
      {e.proposals.map((p) => (
        <li key={p.id} className="border border-[#dcdad5] bg-white px-[18px] py-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
            <p className="text-[18px] leading-[24px]">
              Version {p.version} · {proposalStatusLabel(p.status)}
            </p>
            <p className="text-[15px]">
              {p.pricing.total_amount === null
                ? "Total pending GST"
                : formatRupees(p.pricing.total_amount)}
            </p>
          </div>
          <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
            {p.yacht.name} · {dayText(p.date, true)} · {p.start_time}–{p.end_time} ·{" "}
            {p.slot_type_name} · {p.guests} guests
            {p.sent_at ? ` · sent ${formatInstant(p.sent_at)}` : ""}
            {p.expires_at ? ` · valid until ${formatInstant(p.expires_at)}` : ""}
            {p.decided_at ? ` · decided ${formatInstant(p.decided_at)}` : ""}
          </p>
          {p.inclusions.length > 0 && (
            <p className="mt-[6px] text-[12px]">Includes: {p.inclusions.join(" · ")}</p>
          )}
          {p.decision_comment && (
            <p className="mt-[6px] text-[12px]">Customer’s comment: “{p.decision_comment}”</p>
          )}
          {p.status === "draft" && (
            <Link
              href={adminRoutes.enquiryProposal(e.id, p.id)}
              className={cx(smallOutline, "mt-[12px] h-[36px] w-fit")}
              style={OUTLINE_STYLE}
            >
              Preview & send →
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function HistoryTab({ enquiry: e }: { enquiry: Detail }) {
  const items = [
    { at: e.created_at, text: `Enquiry received from ${e.contact.full_name}` },
    ...e.history.map((h) => ({ at: h.created_at, text: historyText(h.action) })),
  ];
  return (
    <section aria-labelledby="enquiry-history" className="mt-[24px] lg:max-w-[880px]">
      <h2 id="enquiry-history" className="sr-only">
        History
      </h2>
      <ol className="border-l border-[#dcdad5] pl-[18px]">
        {items.map((h, i) => (
          <li key={i} className="relative pb-[16px] text-[13px]">
            <span
              aria-hidden="true"
              className="absolute top-[6px] -left-[23px] size-[9px] rounded-full bg-[#0d1b2a]"
            />
            {h.text}
            <span className="block text-[11px]" style={{ color: BODY }}>
              {formatInstant(h.at)}
            </span>
          </li>
        ))}
      </ol>
      <Link
        href={adminRoutes.auditFor("enquiry", e.id) as Route}
        className="text-[12px] underline underline-offset-2"
      >
        Full audit history for this enquiry
      </Link>
    </section>
  );
}
