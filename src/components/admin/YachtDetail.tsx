"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { adminRoutes, userRoutes } from "@/constants/routes";
import { CommissionPanel } from "@/features/admin/fleet/components/commission-panel";
import { CrewPanel } from "@/features/admin/fleet/components/crew-panel";
import { PackagesPanel } from "@/features/admin/fleet/components/packages-panel";
import { PhotoLightbox } from "@/features/admin/fleet/components/photo-lightbox";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { usePublishBreadcrumbYacht } from "@/features/admin/fleet/hooks/use-breadcrumb-yacht";
import { useYachtStatus } from "@/features/admin/fleet/hooks/use-yacht-status";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { formatYears, kmhToKnots } from "@/features/admin/fleet/utils/yacht-form";
import { formatPaise } from "@/features/admin/pricing/utils/pricing-form";
import {
  getYacht,
  type Yacht,
  type YachtDetail as YachtData,
} from "@/services/admin/fleet.service";
import { isApiError } from "@/services/http/api-error";
import { cx } from "@/lib/cx";
import { formatTime } from "@/lib/time";

import { BODY, GRADIENT, INK, MUTED, NAVY, SAND } from "./admin-theme";
import { LoadState, Notice } from "./form-parts";

const TABS = ["Overview", "Bookings", "Availability", "Activity"] as const;
type Tab = (typeof TABS)[number];

const MODE_LABEL = (y: Yacht) =>
  y.booking_mode === "enquiry_only"
    ? "Enquiry only"
    : y.enquiry_enabled
      ? "Slots + concierge enquiry"
      : "Instant booking";

const NOTICES: Record<string, string> = {
  created:
    "Yacht created. It stays hidden from the website until it has a priced package and a photo, and you make it visible.",
  "no-photos":
    "Yacht created without photos, because photo upload isn't available right now. You can add them later in Edit yacht.",
  "no-spin":
    "Yacht created, but its 360° video couldn't be uploaded. You can add it again in Edit yacht, under Photos.",
  saved: "Changes saved.",
  published: "Yacht created and published. It is now visible on the website.",
  "not-published":
    "The yacht was created with its packages and photos, but couldn't be made visible. Open Edit yacht and switch on “Visible on website” to try again.",
};

const card = "border border-[#e3e1dc] bg-white";
const outline =
  "flex h-[50px] items-center justify-center gap-[6px] border bg-white px-[20px] text-[13px] transition-colors hover:bg-[#f2f1ee]";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
      <dd className="mt-[6px] text-[16px] leading-[22px] break-words">{value}</dd>
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

function Tags({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="mt-[10px] text-[14px]">{empty}</p>;
  return (
    <ul className="mt-[10px] flex flex-wrap gap-[8px]">
      {items.map((a) => (
        <li key={a} className="border border-[#dcdad5] px-[12px] py-[8px] text-[13px]">
          {a}
        </li>
      ))}
    </ul>
  );
}

/** Tabs whose data comes from APIs that are not connected yet. */
function NotConnected({
  title,
  text,
  links,
}: {
  title: string;
  text: string;
  links: { label: string; href: Route }[];
}) {
  return (
    <Panel title={title}>
      <p className="text-[14px] leading-[22px]" style={{ color: BODY }}>
        {text}
      </p>
      <div className="mt-[22px] flex flex-wrap gap-[12px]">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className={outline} style={{ borderColor: INK }}>
            {l.label}
          </Link>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Tab panels                                                          */
/* ------------------------------------------------------------------ */

function OverviewTab({ yacht, onChange }: { yacht: YachtData; onChange: (y: Yacht) => void }) {
  const fields = "grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-4";
  return (
    <div className="flex flex-col gap-[24px]">
      <Panel title="Vessel">
        <dl className={fields}>
          <Field label="Type" value={yacht.type || "—"} />
          <Field label="Length" value={yacht.length_ft ? `${yacht.length_ft} ft` : "—"} />
          <Field label="Maximum guests" value={yacht.capacity} />
          <Field label="Suites" value={yacht.suites ?? "—"} />
          <Field
            label="Built / refit"
            value={formatYears(yacht.built_year, yacht.refit_year) || "—"}
          />
          <Field
            label="Cruising speed"
            value={
              yacht.cruising_speed_kmh === null ? "—" : `${kmhToKnots(yacht.cruising_speed_kmh)} kn`
            }
          />
          <Field label="Registration no." value={yacht.registration_number || "—"} />
          <Field label="Departure city" value={yacht.departure_city || "—"} />
          <Field label="Departure points" value={yacht.departure_points.join(" · ") || "—"} />
          <Field
            label="Ownership"
            value={
              yacht.ownership_type === "own"
                ? "Owned"
                : `Partner${yacht.partner ? ` · ${yacht.partner.name}` : ""}`
            }
          />
          <Field label="URL name" value={yacht.slug} />
        </dl>
      </Panel>

      <Panel title="On the website">
        <p className="text-[12px]" style={{ color: MUTED }}>
          Card tagline
        </p>
        <p className="mt-[6px] text-[16px] leading-[24px]">{yacht.card_tagline || "—"}</p>
        <p className="mt-[22px] text-[12px]" style={{ color: MUTED }}>
          Cruising regions
        </p>
        <Tags items={yacht.cruising_regions} empty="None listed" />
        <p className="mt-[22px] text-[12px]" style={{ color: MUTED }}>
          Description
        </p>
        <p className="mt-[6px] text-[16px] leading-[24px] whitespace-pre-line">
          {yacht.description || "—"}
        </p>
        <p className="mt-[22px] text-[12px]" style={{ color: MUTED }}>
          Amenities
        </p>
        <Tags items={yacht.amenities} empty="None listed" />
        <p className="mt-[22px] text-[12px]" style={{ color: MUTED }}>
          Inclusions
        </p>
        <Tags items={yacht.inclusions} empty="None listed" />
        <p className="mt-[22px] text-[12px]" style={{ color: MUTED }}>
          Policies
        </p>
        <p className="mt-[6px] text-[14px] leading-[22px] whitespace-pre-line">
          {yacht.policies || "—"}
        </p>
      </Panel>

      <Panel title="Booking & operations">
        <dl className={fields}>
          <Field label="Booking mode" value={MODE_LABEL(yacht)} />
          <Field
            label="Operating hours"
            value={
              yacht.opens_at && yacht.closes_at
                ? `${formatTime(yacht.opens_at)} – ${formatTime(yacht.closes_at)}`
                : "Not set"
            }
          />
          <Field label="Turnaround" value={`${yacht.turnaround_minutes} min`} />
          <Field
            label="Enquiries"
            value={
              yacht.booking_mode === "enquiry_only" || yacht.enquiry_enabled ? "Accepted" : "Off"
            }
          />
          <Field
            label="Hourly rate (reference)"
            value={yacht.hourly_rate === null ? "—" : formatPaise(yacht.hourly_rate)}
          />
        </dl>
        <Link
          href={adminRoutes.fleetYachtPricing(yacht.id)}
          className="mt-[22px] inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2"
        >
          Slots &amp; pricing
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
        </Link>
      </Panel>

      <PackagesPanel yachtId={yacht.id} hourlyRate={yacht.hourly_rate} />
      <CrewPanel yacht={yacht} onSaved={onChange} />
      {yacht.ownership_type === "partner" && <CommissionPanel yacht={yacht} onSaved={onChange} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * Admin yacht page from the Figma design: badges, gallery, key figures,
 * tabbed details, crew and commission, quick actions and the activation
 * control. Data: GET /admin/yachts/{id}.
 */
export default function YachtDetail({ yachtId }: { yachtId: string }) {
  const query = useAdminQuery((signal) => getYacht(yachtId, signal), yachtId);
  const [tab, setTab] = useState<Tab>("Overview");
  const [viewing, setViewing] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const status = useYachtStatus();
  usePublishBreadcrumbYacht(query.data);

  // Message passed on from the form (?notice=created|saved).
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("notice");
    if (value && NOTICES[value]) queueMicrotask(() => setNotice(NOTICES[value]!));
  }, []);

  const yacht = query.data;
  if (!yacht) {
    return (
      <div className="px-[20px] pt-[20px] pb-[56px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
        <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
          Sithara Marina / Admin
        </p>
        <LoadState
          loading={query.loading}
          label="Loading the yacht"
          error={query.error ? `Couldn't load the yacht. ${fleetErrorMessage(query.error)}` : ""}
          onRetry={isApiError(query.error) && query.error.status === 404 ? undefined : query.reload}
        />
        {Boolean(query.error) && (
          <Link href={adminRoutes.fleet} className="text-[12px] underline underline-offset-2">
            Back to the fleet
          </Link>
        )}
      </div>
    );
  }

  /** Keeps the photos (not in mutation responses) and takes the rest from the server. */
  const update = (fresh: Yacht) => query.setData((current) => ({ ...current!, ...fresh }));

  const stats = [
    { label: "Maximum guests", value: String(yacht.capacity) },
    { label: "Length", value: yacht.length_ft ? `${yacht.length_ft} ft` : "—" },
    { label: "Suites", value: yacht.suites === null ? "—" : String(yacht.suites) },
    { label: "Photos", value: String(yacht.photos.length) },
  ];
  const quickActions: { label: string; href: Route }[] = [
    { label: "Add a booking manually", href: adminRoutes.bookingNew },
    { label: "Block dates for maintenance", href: adminRoutes.availabilityBlocked },
    { label: "Slots & pricing", href: adminRoutes.fleetYachtPricing(yacht.id) },
    {
      label: "Duplicate as new yacht",
      href: `${adminRoutes.fleetNew}?duplicate=${encodeURIComponent(yacht.id)}` as Route,
    },
  ];

  async function toggleActive() {
    const result = await status.toggle(yacht!);
    if (result) {
      setNotice("");
      update(result.yacht);
    }
  }

  return (
    <div className="px-[20px] pt-[20px] pb-[56px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>

      {notice && (
        <Notice
          tone={
            notice === NOTICES["not-published"] || notice === NOTICES["no-spin"]
              ? "error"
              : "success"
          }
          className="mt-[14px]"
        >
          {notice}
        </Notice>
      )}

      <div className="mt-[14px] flex flex-col gap-[20px] xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[44px] leading-[1.1] font-normal tracking-[-1.5px] break-words lg:text-[60px] lg:tracking-[-2px]">
            {yacht.name}
          </h1>
          <div className="mt-[12px] flex flex-wrap gap-[8px]">
            <Badge>
              <span
                aria-hidden="true"
                className={cx(
                  "size-[7px] rounded-full",
                  yacht.is_active ? "bg-[#2e7d4f]" : "bg-[#a33]",
                )}
              />
              {yacht.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge tone={yacht.is_visible ? "blue" : "sand"}>
              {yacht.is_visible ? "Visible on website" : "Hidden from website"}
            </Badge>
            <Badge>{yacht.ownership_type === "own" ? "Owned" : "Partner-owned"}</Badge>
            <Badge>{MODE_LABEL(yacht)}</Badge>
            {yacht.is_featured && <Badge>Featured on homepage</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-[14px]">
          <Link
            href={userRoutes.yacht(yacht.slug)}
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
      {yacht.photos.length ? (
        <div className="mt-[30px] grid grid-cols-3 gap-[10px] md:grid-cols-[2fr_1fr_1fr_1fr]">
          {yacht.photos.slice(0, 4).map((p, i) => {
            const more = i === 3 ? yacht.photos.length - 4 : 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setViewing(i)}
                aria-label={`View photo ${i + 1} of ${yacht.photos.length} full screen`}
                className={cx(
                  "relative block cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a]",
                  i === 0 && "col-span-3 md:col-span-1",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs from the API */}
                <img
                  src={p.url}
                  alt={`${yacht.name}, photo ${i + 1}`}
                  className={cx(
                    "h-full w-full object-cover",
                    i === 0 ? "aspect-[408/248]" : "aspect-[198/248] max-md:aspect-square",
                  )}
                />
                {more > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[#0a1a2c]/55 text-[18px] text-white">
                    +{more} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="mt-[30px] flex aspect-[408/120] max-h-[220px] w-full flex-col items-center justify-center gap-[10px] border border-[#dcdad5] text-center"
          style={{ backgroundColor: "#f5f3ee" }}
        >
          <p className="text-[14px]">No photos yet</p>
          <Link
            href={`${adminRoutes.fleetYachtEdit(yacht.id)}#gallery` as Route}
            className="text-[12px] underline underline-offset-2"
          >
            Add photos
          </Link>
        </div>
      )}

      {viewing !== null && (
        <PhotoLightbox
          photos={yacht.photos.map((p, i) => ({
            src: p.url,
            alt: `${yacht.name}, photo ${i + 1}`,
          }))}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
        />
      )}

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
            {tab === "Overview" && <OverviewTab yacht={yacht} onChange={update} />}
            {tab === "Bookings" && (
              <NotConnected
                title="Upcoming charters"
                text="This yacht's bookings will show here once the bookings section is connected."
                links={[{ label: "All bookings", href: adminRoutes.bookings }]}
              />
            )}
            {tab === "Availability" && (
              <NotConnected
                title="Availability"
                text="Blocked dates and booked hours will show here once the availability section is connected."
                links={[
                  { label: "Open calendar", href: adminRoutes.availability },
                  { label: "Block dates", href: adminRoutes.availabilityBlocked },
                ]}
              />
            )}
            {tab === "Activity" && (
              <NotConnected
                title="Activity"
                text="Changes to this yacht will show here once the audit history is connected."
                links={[{ label: "Full audit history", href: adminRoutes.audit }]}
              />
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-[22px]">
          <section
            aria-label="Next charter"
            className="px-[24px] py-[22px] text-white"
            style={{ backgroundColor: NAVY }}
          >
            <p className="text-[11px] tracking-[0.14em] text-white/80 uppercase">Next charter</p>
            <p className="mt-[12px] text-[15px] leading-[22px]">
              Upcoming charters will show here once bookings are connected.
            </p>
          </section>

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
            Last updated {formatDateTime(yacht.updated_at)}
          </p>
          {(status.message || status.error) && (
            <Notice tone={status.error ? "error" : "success"}>
              {status.error || status.message}
            </Notice>
          )}
          <button
            type="button"
            onClick={() => void toggleActive()}
            disabled={status.pendingId !== null}
            aria-busy={status.pendingId !== null}
            className={cx(
              "w-fit text-[13px] hover:underline disabled:cursor-wait disabled:opacity-60",
              yacht.is_active ? "text-[#b3261e]" : "text-[#2e7d4f]",
            )}
          >
            {status.pendingId
              ? yacht.is_active
                ? "Deactivating…"
                : "Activating…"
              : yacht.is_active
                ? "Deactivate yacht"
                : "Activate yacht"}
          </button>
        </aside>
      </div>
    </div>
  );
}
