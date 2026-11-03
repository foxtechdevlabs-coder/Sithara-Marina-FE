"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { adminRoutes, userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { BODY, GRADIENT, INK, MUTED, NAVY, SAND } from "./admin-theme";
import type { FleetRecord } from "./fleet-data";

const TABS = ["Overview", "Bookings", "Availability", "Activity"] as const;
type Tab = (typeof TABS)[number];

const MODE_LABEL = {
  instant: "Instant booking",
  slots: "Slots + concierge",
  enquiry: "Enquiry only",
} as const;

const card = "border border-[#e3e1dc] bg-white";
const outline =
  "flex h-[50px] items-center justify-center gap-[6px] border bg-white px-[20px] text-[13px] transition-colors hover:bg-[#f2f1ee]";

function Badge({ children, tone = "sand" }: { children: ReactNode; tone?: "sand" | "blue" }) {
  return (
    <span
      className="inline-flex h-[24px] items-center gap-[7px] px-[9px] text-[12px]"
      style={
        tone === "blue"
          ? { backgroundColor: "#e4eefa", color: "#2f5f93" }
          : { backgroundColor: SAND, color: "#3d4248" }
      }
    >
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] leading-[16px]" style={{ color: MUTED }}>
        {label}
      </dt>
      <dd className="mt-[6px] text-[16px] leading-[22px] lg:whitespace-nowrap">{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${card} px-[20px] pt-[26px] pb-[28px] sm:px-[28px]`}>
      <h2 className="text-[20px] leading-[26px]">{title}</h2>
      <div className="mt-[18px]">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tab panels                                                          */
/* ------------------------------------------------------------------ */

function OverviewTab({ yacht }: { yacht: FleetRecord }) {
  const f = yacht.form;
  const fields = "grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-4";
  return (
    <div className="flex flex-col gap-[24px]">
      <Panel title="Vessel">
        <dl className={fields}>
          <Field label="Type" value={f.type} />
          <Field label="Length" value={f.length ? `${f.length} metres` : "—"} />
          <Field label="Maximum guests" value={f.guests || "—"} />
          <Field label="Suites" value={f.suites || "—"} />
          <Field label="Crew" value={f.crew || "—"} />
          <Field label="Home port" value={f.port || "—"} />
          <Field label="Regions" value={f.regions.join(" · ") || "—"} />
          <Field
            label="Ownership"
            value={
              f.ownership === "owned" ? "Owned" : `Partner${f.partner ? ` · ${f.partner}` : ""}`
            }
          />
        </dl>
      </Panel>

      <Panel title="On the website">
        <p className="text-[12px]" style={{ color: MUTED }}>
          Card tagline
        </p>
        <p className="mt-[6px] text-[16px] leading-[24px]">{f.tagline || "—"}</p>
        <p className="mt-[22px] text-[12px]" style={{ color: MUTED }}>
          Amenities
        </p>
        <ul className="mt-[10px] flex flex-wrap gap-[8px]">
          {f.amenities.map((a) => (
            <li key={a} className="border border-[#dcdad5] px-[12px] py-[8px] text-[13px]">
              {a}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Booking & pricing">
        <dl className={fields}>
          <Field
            label="Day rate"
            value={f.rate ? `₹ ${Number(f.rate).toLocaleString("en-IN")}` : "—"}
          />
          <Field
            label="Minimum stay"
            value={`${f.minDays || 1} ${Number(f.minDays || 1) === 1 ? "day" : "days"}`}
          />
          <Field label="Deposit" value={f.deposit ? `${f.deposit}%` : "—"} />
          <Field label="GST" value={yacht.ops.gst} />
          <Field label="Embark · disembark" value={`${f.embark} · ${f.disembark}`} />
          <Field label="Booking mode" value={MODE_LABEL[f.mode]} />
        </dl>
      </Panel>
    </div>
  );
}

function BookingsTab({ yacht }: { yacht: FleetRecord }) {
  const { bookings } = yacht.ops;
  return (
    <Panel title="Upcoming charters">
      {bookings.length === 0 ? (
        <p className="text-[14px]" style={{ color: BODY }}>
          No upcoming charters.
        </p>
      ) : (
        <ul className="divide-y divide-[#eceae6] border-y border-[#eceae6]">
          {bookings.map((b) => (
            <li
              key={b.ref}
              className="grid gap-[4px] py-[14px] text-[14px] sm:grid-cols-[1.1fr_1.6fr_1fr] sm:items-center sm:gap-[16px]"
            >
              <span>
                <Link href={adminRoutes.booking(b.ref)} className="hover:underline">
                  {b.guest}
                </Link>
                <span className="block text-[12px]" style={{ color: MUTED }}>
                  {b.ref} · {b.guests} guests
                </span>
              </span>
              <span className="text-[13px]">
                {b.embark} → {b.disembark}
              </span>
              <span className="text-[13px]">
                {b.status}
                <span className="block text-[12px]" style={{ color: MUTED }}>
                  {b.payment}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={adminRoutes.bookings}
        className="mt-[18px] inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2"
      >
        All bookings
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
      </Link>
    </Panel>
  );
}

function AvailabilityTab({ yacht }: { yacht: FleetRecord }) {
  const { blockedDates, bookedNext60 } = yacht.ops;
  return (
    <Panel title="Availability">
      <p className="text-[14px] leading-[22px]" style={{ color: BODY }}>
        {bookedNext60} of available hours are booked over the next 60 days.
      </p>
      <p className="mt-[20px] text-[12px]" style={{ color: MUTED }}>
        Blocked dates
      </p>
      {blockedDates.length ? (
        <ul className="mt-[8px] flex flex-col gap-[6px] text-[14px]">
          {blockedDates.map((d) => (
            <li key={d.range}>
              {d.range} <span style={{ color: MUTED }}>· {d.reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-[8px] text-[14px]">None</p>
      )}
      <div className="mt-[22px] flex flex-wrap gap-[12px]">
        <Link href={adminRoutes.availability} className={outline} style={{ borderColor: INK }}>
          Open calendar
        </Link>
        <Link
          href={adminRoutes.availabilityBlocked}
          className={outline}
          style={{ borderColor: INK }}
        >
          Block dates
        </Link>
      </div>
    </Panel>
  );
}

function ActivityTab({ yacht }: { yacht: FleetRecord }) {
  return (
    <Panel title="Activity">
      <ol className="flex flex-col gap-[16px]">
        {yacht.ops.activity.map((a) => (
          <li key={a.when + a.what} className="border-l-2 border-[#e3e1dc] pl-[14px]">
            <p className="text-[14px]">{a.what}</p>
            <p className="mt-[2px] text-[12px]" style={{ color: MUTED }}>
              {a.who} · {a.when}
            </p>
          </li>
        ))}
      </ol>
      <Link
        href={adminRoutes.audit}
        className="mt-[18px] inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2"
      >
        Full audit history
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
      </Link>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * Admin yacht page from the Figma design: badges, gallery, key figures,
 * tabbed details, the next charter and quick actions. Dummy data for now.
 */
export default function YachtDetail({ yacht }: { yacht: FleetRecord }) {
  const f = yacht.form;
  const [tab, setTab] = useState<Tab>("Overview");
  const [active, setActive] = useState(f.status === "Active");
  const next = yacht.ops.nextCharter;

  const stats = [
    { label: "Upcoming charters", value: String(yacht.ops.upcomingCharters) },
    { label: "Booked · next 60 days", value: yacht.ops.bookedNext60 },
    { label: "Confirmed value", value: yacht.ops.confirmedValue },
    { label: "Open enquiries", value: String(yacht.ops.openEnquiries) },
  ];
  const quickActions: { label: string; href: Route }[] = [
    { label: "Add a booking manually", href: adminRoutes.bookingNew },
    { label: "Block dates for maintenance", href: adminRoutes.availabilityBlocked },
    { label: "Adjust seasonal pricing", href: adminRoutes.fleetYachtPricing(yacht.id) },
    {
      label: "Duplicate as new yacht",
      href: `${adminRoutes.fleetNew}?duplicate=${yacht.id}` as Route,
    },
  ];

  function toggleActive() {
    const verb = active ? "Deactivate" : "Reactivate";
    if (
      !window.confirm(
        `${verb} ${f.name}? ${active ? "New bookings will stop; existing bookings stay in your records." : "The yacht can take bookings again."}`,
      )
    )
      return;
    // TODO: update the yacht's status through the fleet API.
    setActive((a) => !a);
  }

  return (
    <div className="px-[20px] pt-[20px] pb-[56px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>

      <div className="mt-[14px] flex flex-col gap-[20px] xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[44px] leading-[1.1] font-normal tracking-[-1.5px] lg:text-[60px] lg:tracking-[-2px]">
            {f.name}
          </h1>
          <div className="mt-[12px] flex flex-wrap gap-[8px]">
            <Badge>
              <span
                aria-hidden="true"
                className={cx("size-[7px] rounded-full", active ? "bg-[#2e7d4f]" : "bg-[#a33]")}
              />
              {active ? "Active" : "Inactive"}
            </Badge>
            <Badge tone={f.visible ? "blue" : "sand"}>
              {f.visible ? "Visible on website" : "Hidden from website"}
            </Badge>
            <Badge>{f.ownership === "owned" ? "Owned" : "Partner-owned"}</Badge>
            <Badge>{f.mode === "slots" ? "Slots + concierge enquiry" : MODE_LABEL[f.mode]}</Badge>
            {f.featured && <Badge>Featured on homepage</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-[14px]">
          <Link
            href={userRoutes.yacht(yacht.id)}
            target="_blank"
            className={`${outline} w-[172px] whitespace-nowrap`}
            style={{ borderColor: INK }}
          >
            View public page
            <ArrowUpRight
              aria-label="(opens in a new tab)"
              strokeWidth={1.5}
              className="size-[12px]"
            />
          </Link>
          <Link
            href={adminRoutes.fleetYachtEdit(yacht.id)}
            className="flex h-[50px] w-[130px] items-center justify-center text-[13px] transition-opacity hover:opacity-90"
            style={{ background: GRADIENT }}
          >
            Edit yacht
          </Link>
        </div>
      </div>

      {/* Gallery: cover + three */}
      <div className="mt-[30px] grid grid-cols-3 gap-[10px] md:grid-cols-[2fr_1fr_1fr_1fr]">
        {yacht.photos.slice(0, 4).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- local admin previews
          <img
            key={p.src}
            src={p.src}
            alt={p.alt}
            className={cx(
              "h-full w-full object-cover",
              i === 0
                ? "col-span-3 aspect-[408/248] md:col-span-1"
                : "aspect-[198/248] max-md:aspect-square",
            )}
          />
        ))}
      </div>

      {/* Key figures */}
      <dl className="mt-[24px] grid grid-cols-2 border-t border-l border-[#e3e1dc] bg-white md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-r border-b border-[#e3e1dc] px-[20px] pt-[18px] pb-[20px] md:px-[22px]"
          >
            <dt className="text-[12px]" style={{ color: MUTED }}>
              {s.label}
            </dt>
            <dd className="mt-[6px] text-[28px] leading-[34px] tracking-[-0.5px] lg:text-[32px]">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-[38px] grid gap-[28px] xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-[32px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Yacht sections" className="flex flex-wrap gap-[12px]">
            {TABS.map((t) => {
              const on = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="yacht-tabpanel"
                  onClick={() => setTab(t)}
                  className={cx(
                    "h-[48px] w-[116px] border text-[13px] transition-colors",
                    on ? "border-transparent" : "border-[#0d1b2a] bg-white hover:bg-[#f2f1ee]",
                  )}
                  style={on ? { background: GRADIENT } : undefined}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div id="yacht-tabpanel" role="tabpanel" aria-label={tab} className="mt-[24px]">
            {tab === "Overview" && <OverviewTab yacht={yacht} />}
            {tab === "Bookings" && <BookingsTab yacht={yacht} />}
            {tab === "Availability" && <AvailabilityTab yacht={yacht} />}
            {tab === "Activity" && <ActivityTab yacht={yacht} />}
          </div>
        </div>

        <aside className="flex flex-col gap-[22px]">
          {next ? (
            <section
              aria-label="Next charter"
              className="px-[24px] pt-[22px] pb-[24px] text-white"
              style={{ backgroundColor: NAVY }}
            >
              <p className="text-[11px] tracking-[0.14em] text-white/80 uppercase">
                Next charter · in {next.inDays} days
              </p>
              <p className="mt-[16px] text-[24px] leading-[30px] tracking-[-0.4px]">{next.guest}</p>
              <p className="mt-[4px] text-[13px] text-white/85">
                {next.ref} · {next.guests} guests
              </p>
              <dl className="mt-[16px] border-t border-white/20 pt-[14px] text-[14px]">
                {[
                  ["Embark", next.embark],
                  ["Disembark", next.disembark],
                  ["Payment", next.payment],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-[3px]">
                    <dt className="text-white/80">{k}</dt>
                    <dd className={k === "Payment" ? "text-[#8fbcf0]" : ""}>{v}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href={adminRoutes.booking(next.ref)}
                className="mt-[18px] flex h-[50px] items-center justify-between border border-white/60 px-[18px] text-[14px] transition-colors hover:bg-white/10"
              >
                Open booking
                <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
              </Link>
            </section>
          ) : (
            <section
              aria-label="Next charter"
              className="px-[24px] py-[22px] text-white"
              style={{ backgroundColor: NAVY }}
            >
              <p className="text-[11px] tracking-[0.14em] text-white/80 uppercase">Next charter</p>
              <p className="mt-[12px] text-[15px]">No charters booked yet.</p>
            </section>
          )}

          <section aria-label="Quick actions" className={`${card} px-[24px] pt-[22px] pb-[6px]`}>
            <p className="text-[11px] tracking-[0.14em] uppercase" style={{ color: MUTED }}>
              Quick actions
            </p>
            <ul className="mt-[8px] divide-y divide-[#eceae6]">
              {quickActions.map((a) => (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    className="flex h-[52px] items-center justify-between text-[14px] hover:underline"
                  >
                    {a.label}
                    <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[12px]" style={{ color: MUTED }}>
            Last edited by {yacht.ops.lastEdited}
          </p>
          <button
            type="button"
            onClick={toggleActive}
            className={cx(
              "w-fit text-[13px] hover:underline",
              active ? "text-[#b3261e]" : "text-[#2e7d4f]",
            )}
          >
            {active ? "Deactivate yacht" : "Reactivate yacht"}
          </button>
        </aside>
      </div>
    </div>
  );
}
