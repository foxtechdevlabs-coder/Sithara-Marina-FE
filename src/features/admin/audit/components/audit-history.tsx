"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { input, Label, LoadState, Notice } from "@/components/admin/form-parts";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import {
  getAuditLog,
  listAuditLogs,
  type AuditEntry,
  type AuditQuery,
} from "@/services/admin/audit.service";
import { listStaff } from "@/services/admin/staff.service";
import { isApiError } from "@/services/http/api-error";

import {
  actionText,
  changedFields,
  entityTypeText,
  fieldText,
  recordHref,
  recordName,
  shortRecord,
  valueText,
  whenText,
} from "../utils/audit-format";

const PAGE_SIZE = 25;

function auditErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403) return "Your account doesn’t have access to the audit history.";
    if (error.code === "INVALID_DATE_RANGE") return "The end date is before the start date.";
  }
  return fleetErrorMessage(error, "This entry");
}

/** The record's name, looked up once and shared; a short id until then. */
function RecordCell({ entry }: { entry: AuditEntry }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void recordName(entry.entity_type, entry.entity_id).then((n) => {
      if (live) setName(n);
    });
    return () => {
      live = false;
    };
  }, [entry.entity_type, entry.entity_id]);
  const label = name ?? shortRecord(entry.entity_type, entry.entity_id);
  const href = recordHref(entry.entity_type, entry.entity_id);
  return (
    <span className="break-words">
      {href ? (
        <Link href={href} className="underline-offset-2 hover:underline">
          {label}
        </Link>
      ) : (
        label
      )}
      {name && (
        <span className="ml-[6px] text-[10px]" style={{ color: BODY }}>
          {entityTypeText(entry.entity_type)}
        </span>
      )}
    </span>
  );
}

/** What changed in one entry (GET /admin/audit-logs/{id}). */
function Changes({ id }: { id: string }) {
  const detail = useAdminQuery((signal) => getAuditLog(id, signal), `audit:${id}`);
  if (!detail.data)
    return (
      <LoadState
        loading={detail.loading}
        error={
          detail.error ? `Couldn't load the change. ${auditErrorMessage(detail.error)}` : undefined
        }
        onRetry={detail.reload}
        label="Loading change"
      />
    );
  const d = detail.data;
  const fields = changedFields(d.before, d.after);
  const kind =
    !d.before && d.after ? "Created with" : d.before && !d.after ? "Removed; it had" : "Changed";
  if (!fields.length)
    return (
      <p className="text-[12px]" style={{ color: BODY }}>
        No field values were recorded for this action.
      </p>
    );
  return (
    <div>
      <p className="text-[11px]" style={{ color: BODY }}>
        {kind} {fields.length} {fields.length === 1 ? "field" : "fields"}
        {d.actor ? ` · by ${d.actor.full_name} (${d.actor.email})` : " · by the system"}
      </p>
      <div className="mt-[8px] overflow-x-auto">
        <table className="w-full border-collapse text-left text-[11px]">
          <caption className="sr-only">Changed fields</caption>
          <thead>
            <tr>
              {["Field", "Before", "After"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-[#e3e1dc] px-[8px] py-[6px] font-normal"
                  style={{ color: BODY }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.field} className="align-top">
                <td className="px-[8px] py-[6px] whitespace-nowrap">{fieldText(f.field)}</td>
                <td className="max-w-[320px] px-[8px] py-[6px] break-words" style={{ color: BODY }}>
                  {valueText(f.field, f.before)}
                </td>
                <td className="max-w-[320px] px-[8px] py-[6px] break-words">
                  {valueText(f.field, f.after)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Audit history: "A clear history of changes." (admin Figma A42). GET
 * /admin/audit-logs with staff, date and record filters; a row opens what
 * changed (GET /admin/audit-logs/{id}).
 */
export function AuditHistory({
  entityType = "",
  entityId = "",
}: {
  /** Opened from a record: show only its history. */
  entityType?: string;
  entityId?: string;
}) {
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [record, setRecord] = useState({ type: entityType, id: entityId });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const badRange = Boolean(from && to && to < from);
  const query: AuditQuery = {
    page,
    limit: PAGE_SIZE,
    ...(actorId ? { actor_id: actorId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(record.type ? { entity_type: record.type } : {}),
    ...(record.id ? { entity_id: record.id } : {}),
  };
  const list = useAdminQuery(
    (signal) => (badRange ? Promise.resolve(null) : listAuditLogs(query, signal)),
    `audit:${JSON.stringify(query)}:${badRange}`,
  );
  const rows = list.data?.items ?? [];
  const reset = () => {
    setPage(1);
    setOpen(null);
  };

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A clear history of changes."
        subtitle="Audit history · Staff access follows permissions."
      />

      <div className="mt-[24px] grid gap-x-[16px] gap-y-[18px] sm:grid-cols-2 lg:mt-[30px] lg:max-w-[880px] lg:grid-cols-3">
        <div>
          <Label htmlFor="audit-staff">Staff</Label>
          <SearchSelect
            id="audit-staff"
            value={actorId}
            onChange={(v) => {
              setActorId(v);
              reset();
            }}
            load={async (search, signal) => {
              const staff = await listStaff(
                { limit: 20, ...(search ? { search: search.slice(0, 100) } : {}) },
                signal,
              );
              return {
                options: staff.items.map((s) => ({
                  value: s.id,
                  label: s.full_name,
                  description: s.email,
                })),
                hasMore: staff.total > staff.items.length,
              };
            }}
            clearable
            emptyLabel="All staff"
            placeholder="Search staff by name or email"
            noResults="No staff member matches."
          />
        </div>
        <div>
          <Label htmlFor="audit-from">From</Label>
          <input
            id="audit-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.currentTarget.value);
              reset();
            }}
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="audit-to">To</Label>
          <input
            id="audit-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.currentTarget.value);
              reset();
            }}
            className={input}
          />
        </div>
      </div>

      {(record.type || record.id) && (
        <p className="mt-[14px] text-[12px]" style={{ color: BODY }}>
          Showing the history of{" "}
          {record.id
            ? shortRecord(record.type || "record", record.id)
            : `every ${entityTypeText(record.type).toLowerCase()}`}
          .{" "}
          <button
            type="button"
            onClick={() => {
              setRecord({ type: "", id: "" });
              reset();
            }}
            className="underline underline-offset-2"
          >
            Show everything
          </button>
        </p>
      )}

      <div className="mt-[24px]">
        {badRange ? (
          <Notice tone="error">The “To” date is before the “From” date.</Notice>
        ) : !list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error ? `Couldn't load the history. ${auditErrorMessage(list.error)}` : undefined
            }
            onRetry={list.reload}
            label="Loading history"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {actorId || from || to || record.type
              ? "No changes match these filters."
              : "No changes recorded yet."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            {/* Desktop table */}
            <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">Audit history</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["When", "Staff", "Action", "Record", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="px-[12px] py-[12px] font-normal"
                      style={{ color: BODY }}
                    >
                      {h || <span className="sr-only">Changes</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((e) => {
                  const expanded = open === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr className={cx("border-b border-[#ebe9e4]", expanded && "border-b-0")}>
                        <td className="px-[12px] py-[12px] whitespace-nowrap">
                          {whenText(e.created_at)}
                        </td>
                        <td
                          className="max-w-[200px] px-[12px] py-[12px] break-words"
                          title={e.actor?.email}
                        >
                          {e.actor?.full_name ?? "System"}
                        </td>
                        <td className="px-[12px] py-[12px]" title={e.action}>
                          {actionText(e.action)}
                        </td>
                        <td className="max-w-[240px] px-[12px] py-[12px]">
                          <RecordCell entry={e} />
                        </td>
                        <td className="px-[12px] py-[12px] text-right">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={`audit-${e.id}`}
                            onClick={() => setOpen(expanded ? null : e.id)}
                            className="inline-flex items-center gap-[4px] underline underline-offset-2"
                          >
                            {expanded ? "Hide" : "Changes"}
                            <ChevronDown
                              aria-hidden="true"
                              className={cx(
                                "size-[12px] transition-transform",
                                expanded && "rotate-180",
                              )}
                            />
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr id={`audit-${e.id}`} className="border-b border-[#ebe9e4]">
                          <td colSpan={5} className="bg-[#fcfbf9] px-[12px] pt-[4px] pb-[14px]">
                            <Changes id={e.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Phone cards */}
            <ul className="grid gap-[12px] lg:hidden">
              {rows.map((e) => {
                const expanded = open === e.id;
                return (
                  <li key={e.id} className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
                    <p className="text-[15px]">{actionText(e.action)}</p>
                    <p className="mt-[4px] text-[12px]">
                      <RecordCell entry={e} />
                    </p>
                    <p className="mt-[4px] text-[11px]" style={{ color: BODY }}>
                      {whenText(e.created_at)} · {e.actor?.full_name ?? "System"}
                    </p>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`audit-m-${e.id}`}
                      onClick={() => setOpen(expanded ? null : e.id)}
                      className="mt-[10px] inline-flex items-center gap-[4px] text-[12px] underline underline-offset-2"
                    >
                      {expanded ? "Hide changes" : "View changes"}
                      <ChevronDown
                        aria-hidden="true"
                        className={cx("size-[12px]", expanded && "rotate-180")}
                      />
                    </button>
                    {expanded && (
                      <div id={`audit-m-${e.id}`} className="mt-[10px]">
                        <Changes id={e.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <Pager
              page={page}
              total={list.data.total}
              limit={PAGE_SIZE}
              busy={list.loading}
              onPage={(p) => {
                setPage(p);
                setOpen(null);
              }}
            />
          </div>
        )}
      </div>

      <InfoPanel title="About the history" className="mt-[24px]">
        Every change staff make to bookings, yachts, prices, partners, payouts and settings is
        recorded here with who made it and when. Entries can’t be edited or removed.{" "}
        <Link href={adminRoutes.staff} className="underline underline-offset-2">
          Staff and permissions
        </Link>
      </InfoPanel>
    </div>
  );
}
