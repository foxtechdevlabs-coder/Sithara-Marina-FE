"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import {
  ALERT_TYPES,
  getEmail,
  listAlerts,
  listEmails,
  listTemplates,
  markAlertsRead,
  resendEmail,
  TEMPLATE_KEYS,
  type AlertQuery,
  type EmailQuery,
} from "@/services/admin/notifications.service";

import {
  alertHref,
  alertTypeLabel,
  announceAlertsChanged,
  emailStatusLabel,
  notificationErrorMessage,
  severityOf,
  templateKeyLabel,
  timeAgo,
} from "../utils/notification-format";

type Tab = "alerts" | "emails" | "templates";
const PAGE_SIZE = 20;

/** Notifications: staff alerts, the customer email log and the email templates. */
export function NotificationsCenter({ initialTab = "alerts" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div className={pagePadding}>
      <PageHeader
        title="Every update, in one place."
        subtitle="Alerts for the team, emails sent to customers, and the words those emails use."
      />
      <div className="mt-[24px] lg:mt-[30px]">
        <SegmentTabs
          label="Notification sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "alerts", label: "Alerts" },
            { value: "emails", label: "Email log" },
            { value: "templates", label: "Templates" },
          ]}
        />
      </div>
      {tab === "alerts" && <AlertsTab />}
      {tab === "emails" && <EmailsTab />}
      {tab === "templates" && <TemplatesTab />}
    </div>
  );
}

function AlertsTab() {
  const [show, setShow] = useState<"all" | "unread">("all");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const query: AlertQuery = {
    page,
    limit: PAGE_SIZE,
    ...(show === "unread" ? { unread_only: true } : {}),
    ...(type ? { type: type as AlertQuery["type"] } : {}),
  };
  const list = useAdminQuery(
    (signal) => listAlerts(query, signal),
    `alerts:${JSON.stringify(query)}`,
  );
  const rows = list.data?.items ?? [];

  async function mark(input: { ids: string[] } | { all: true }) {
    setBusy(true);
    setProblem("");
    try {
      await markAlertsRead(input);
      announceAlertsChanged();
      list.reload();
    } catch (err) {
      setProblem(notificationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Alerts" className="mt-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-[14px]">
        <div className="grid w-full gap-[14px] sm:w-auto sm:grid-cols-2">
          <div className="sm:w-[220px]">
            <Label htmlFor="alerts-show">Show</Label>
            <SelectBox
              id="alerts-show"
              value={show}
              onChange={(v) => {
                setShow(v as "all" | "unread");
                setPage(1);
              }}
              options={[
                { value: "all", label: "All alerts" },
                { value: "unread", label: "Unread only" },
              ]}
            />
          </div>
          <div className="sm:w-[240px]">
            <Label htmlFor="alerts-type">Type</Label>
            <SelectBox
              id="alerts-type"
              value={type}
              onChange={(v) => {
                setType(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "Every type" },
                ...ALERT_TYPES.map((t) => ({ value: t, label: alertTypeLabel(t) })),
              ]}
            />
          </div>
        </div>
        {(list.data?.unread_count ?? 0) > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void mark({ all: true })}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Mark all {list.data!.unread_count} read
          </button>
        )}
      </div>

      {problem && (
        <Notice tone="error" className="mt-[14px]">
          {problem}
        </Notice>
      )}

      <div className="mt-[18px]">
        {!list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error
                ? `Couldn't load alerts. ${notificationErrorMessage(list.error)}`
                : undefined
            }
            onRetry={list.reload}
            label="Loading alerts"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {show === "unread" ? "No unread alerts. You’re all caught up." : "No alerts yet."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <ul className="grid gap-[10px]">
              {rows.map((a) => {
                const sev = severityOf(a.severity);
                const href = alertHref(a.entity_type, a.entity_id);
                return (
                  <li
                    key={a.id}
                    className="flex gap-[12px] border bg-white px-[16px] py-[14px] lg:px-[20px]"
                    // Per-side properties only: mixing `borderColor` with a `borderLeft`
                    // shorthand makes React re-apply them in the wrong order on re-render.
                    style={{
                      borderTopColor: a.read_at ? "#e3e1dc" : "#0d1b2a",
                      borderRightColor: a.read_at ? "#e3e1dc" : "#0d1b2a",
                      borderBottomColor: a.read_at ? "#e3e1dc" : "#0d1b2a",
                      borderLeftColor: sev.color,
                      borderLeftWidth: 3,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-[8px] text-[14px]">
                        <span className={cx("break-words", !a.read_at && "font-medium")}>
                          {a.title}
                        </span>
                        {!a.read_at && (
                          <span
                            className="px-[6px] py-[1px] text-[10px]"
                            style={{ backgroundColor: SAND }}
                          >
                            Unread
                          </span>
                        )}
                      </p>
                      {a.body && (
                        <p
                          className="mt-[4px] text-[12px] leading-[18px] break-words"
                          style={{ color: BODY }}
                        >
                          {a.body}
                        </p>
                      )}
                      <p className="mt-[6px] text-[11px]" style={{ color: MUTED }}>
                        <span style={{ color: sev.color }}>{sev.label}</span> ·{" "}
                        {alertTypeLabel(a.type)} · {timeAgo(a.created_at, now)} ·{" "}
                        {formatInstant(a.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-[8px] text-[12px]">
                      {href && (
                        <Link
                          href={href}
                          onClick={() => !a.read_at && void mark({ ids: [a.id] })}
                          className="underline underline-offset-2"
                        >
                          Open
                        </Link>
                      )}
                      {!a.read_at && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mark({ ids: [a.id] })}
                          className="underline underline-offset-2 disabled:opacity-50"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager
              page={page}
              total={list.data.total}
              limit={PAGE_SIZE}
              busy={list.loading}
              onPage={setPage}
            />
          </div>
        )}
      </div>
    </section>
  );
}

const STATUS_TONE: Record<string, string> = {
  sent: "#22382c",
  failed: "#b3261e",
  queued: "#a86a12",
  sending: "#2f6fb5",
};

/** The email as sent, in a sandboxed frame (GET /admin/email-log/{id}). */
function EmailBody({ id }: { id: string }) {
  const detail = useAdminQuery((signal) => getEmail(id, signal), `email:${id}`);
  if (!detail.data)
    return (
      <LoadState
        loading={detail.loading}
        error={
          detail.error
            ? `Couldn't load the email. ${notificationErrorMessage(detail.error)}`
            : undefined
        }
        onRetry={detail.reload}
        label="Loading email"
      />
    );
  return (
    <iframe
      title={`Email: ${detail.data.subject}`}
      sandbox=""
      srcDoc={detail.data.body_html}
      className="h-[420px] w-full border border-[#e3e1dc] bg-white"
    />
  );
}

function EmailsTab() {
  const searchId = useId();
  const [status, setStatus] = useState("");
  const [template, setTemplate] = useState("");
  const [recipient, setRecipient] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const search = useDebounced(recipient.trim());
  const query: EmailQuery = {
    page,
    limit: PAGE_SIZE,
    ...(status ? { status: status as EmailQuery["status"] } : {}),
    ...(template ? { template_key: template as EmailQuery["template_key"] } : {}),
    ...(search ? { recipient: search.slice(0, 200) } : {}),
  };
  const list = useAdminQuery(
    (signal) => listEmails(query, signal),
    `emails:${JSON.stringify(query)}`,
  );
  const rows = list.data?.items ?? [];

  async function resend(id: string) {
    setBusy(id);
    setNotice(undefined);
    try {
      await resendEmail(id);
      setNotice({ tone: "success", text: "Queued to send again." });
      list.reload();
    } catch (err) {
      setNotice({ tone: "error", text: notificationErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Email log" className="mt-[22px]">
      <div className="grid gap-[14px] sm:grid-cols-2 lg:max-w-[880px] lg:grid-cols-3">
        <div>
          <Label htmlFor={searchId}>Recipient</Label>
          <input
            id={searchId}
            type="search"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.currentTarget.value);
              setPage(1);
            }}
            placeholder="Part of the email address"
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="emails-status">Status</Label>
          <SelectBox
            id="emails-status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "Every status" },
              ...["sent", "failed", "queued", "sending"].map((s) => ({
                value: s,
                label: emailStatusLabel(s),
              })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="emails-template">Email</Label>
          <SelectBox
            id="emails-template"
            value={template}
            onChange={(v) => {
              setTemplate(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "Every email" },
              ...TEMPLATE_KEYS.map((k) => ({ value: k, label: templateKeyLabel(k) })),
            ]}
          />
        </div>
      </div>

      {notice && (
        <Notice tone={notice.tone} className="mt-[14px]">
          {notice.text}
        </Notice>
      )}

      <div className="mt-[18px]">
        {!list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error
                ? `Couldn't load the email log. ${notificationErrorMessage(list.error)}`
                : undefined
            }
            onRetry={list.reload}
            label="Loading email log"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {status || template || search
              ? "No emails match these filters."
              : "No emails sent yet."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">Email log</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["When", "Email", "Recipient", "Subject", "Status", ""].map((h, i) => (
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
                {rows.map((m) => {
                  const expanded = open === m.id;
                  return (
                    <Fragment key={m.id}>
                      <tr
                        className={cx(
                          "border-b border-[#ebe9e4] align-top",
                          expanded && "border-b-0",
                        )}
                      >
                        <td className="px-[12px] py-[12px] whitespace-nowrap">
                          {formatInstant(m.sent_at ?? m.created_at)}
                        </td>
                        <td className="px-[12px] py-[12px]">{templateKeyLabel(m.template_key)}</td>
                        <td className="max-w-[200px] px-[12px] py-[12px] break-all">
                          {m.recipient}
                        </td>
                        <td className="max-w-[260px] px-[12px] py-[12px] break-words">
                          {m.subject}
                        </td>
                        <td className="px-[12px] py-[12px]">
                          <span style={{ color: STATUS_TONE[m.status] ?? BODY }}>
                            {emailStatusLabel(m.status)}
                          </span>
                          {m.attempts > 1 && (
                            <span className="block text-[10px]" style={{ color: MUTED }}>
                              {m.attempts} attempts
                            </span>
                          )}
                          {m.last_error && (
                            <span className="block text-[10px] text-[#9b2c2c]">{m.last_error}</span>
                          )}
                          {m.status === "queued" && m.next_attempt_at && (
                            <span className="block text-[10px]" style={{ color: MUTED }}>
                              next try {formatInstant(m.next_attempt_at)}
                            </span>
                          )}
                        </td>
                        <td className="px-[12px] py-[12px] text-right whitespace-nowrap">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setOpen(expanded ? null : m.id)}
                            className="inline-flex items-center gap-[4px] underline underline-offset-2"
                          >
                            {expanded ? "Hide" : "View"}
                            <ChevronDown
                              aria-hidden="true"
                              className={cx("size-[12px]", expanded && "rotate-180")}
                            />
                          </button>
                          {m.status === "failed" && (
                            <button
                              type="button"
                              disabled={busy === m.id}
                              onClick={() => void resend(m.id)}
                              className="ml-[12px] underline underline-offset-2 disabled:opacity-50"
                            >
                              {busy === m.id ? "Sending…" : "Resend"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-[#ebe9e4]">
                          <td colSpan={6} className="bg-[#fcfbf9] px-[12px] pt-[4px] pb-[14px]">
                            <EmailBody id={m.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            <ul className="grid gap-[12px] lg:hidden">
              {rows.map((m) => {
                const expanded = open === m.id;
                return (
                  <li key={m.id} className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
                    <p className="text-[14px] break-words">{m.subject}</p>
                    <p className="mt-[4px] text-[12px] break-all" style={{ color: BODY }}>
                      {m.recipient}
                    </p>
                    <p className="mt-[4px] text-[11px]" style={{ color: MUTED }}>
                      {templateKeyLabel(m.template_key)} ·{" "}
                      {formatInstant(m.sent_at ?? m.created_at)} ·{" "}
                      <span style={{ color: STATUS_TONE[m.status] ?? BODY }}>
                        {emailStatusLabel(m.status)}
                      </span>
                      {m.last_error ? ` · ${m.last_error}` : ""}
                    </p>
                    <div className="mt-[10px] flex gap-[14px] text-[12px]">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : m.id)}
                        className="underline underline-offset-2"
                      >
                        {expanded ? "Hide email" : "View email"}
                      </button>
                      {m.status === "failed" && (
                        <button
                          type="button"
                          disabled={busy === m.id}
                          onClick={() => void resend(m.id)}
                          className="underline underline-offset-2"
                        >
                          {busy === m.id ? "Sending…" : "Resend"}
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <div className="mt-[10px]">
                        <EmailBody id={m.id} />
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
              onPage={setPage}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TemplatesTab() {
  const list = useAdminQuery((signal) => listTemplates(signal), "templates");
  if (!list.data)
    return (
      <div className="mt-[22px]">
        <LoadState
          loading={list.loading}
          error={
            list.error
              ? `Couldn't load the templates. ${notificationErrorMessage(list.error)}`
              : undefined
          }
          onRetry={list.reload}
          label="Loading templates"
        />
      </div>
    );
  const groups = [
    { audience: "customer", title: "To customers" },
    { audience: "staff", title: "To the team" },
  ];
  return (
    <section aria-label="Email templates" className="mt-[22px]">
      {groups.map((g) => {
        const items = list.data!.items.filter((t) => t.audience === g.audience);
        if (!items.length) return null;
        return (
          <div key={g.audience} className="mt-[6px] mb-[22px]">
            <h2 className="text-[18px] leading-[24px]">{g.title}</h2>
            <ul className="mt-[10px] grid gap-[10px] lg:grid-cols-2">
              {items.map((t) => (
                <li
                  key={t.key}
                  className="flex flex-col border border-[#e3e1dc] bg-white px-[18px] py-[16px]"
                >
                  <p className="flex flex-wrap items-baseline gap-x-[8px] text-[15px]">
                    {t.name}
                    <span
                      className="px-[6px] py-[1px] text-[10px]"
                      style={{ backgroundColor: t.is_customised ? "#dfe9f6" : SAND }}
                    >
                      {t.is_customised ? "Customised" : "Default text"}
                    </span>
                  </p>
                  <p className="mt-[4px] flex-1 text-[12px] leading-[18px]" style={{ color: BODY }}>
                    {t.description}
                  </p>
                  <p className="mt-[6px] text-[11px] break-words" style={{ color: MUTED }}>
                    Subject: {t.subject}
                    {t.updated_at ? ` · edited ${formatInstant(t.updated_at)}` : ""}
                  </p>
                  <Link
                    href={adminRoutes.notificationTemplate(t.key)}
                    className={cx(smallPrimary, "mt-[12px] h-[36px] w-fit")}
                    style={PRIMARY_STYLE}
                  >
                    Edit email
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <InfoPanel title="About templates" className="mt-[4px]">
        Emails use the brand layout; only the subject, heading and text change here. Placeholders
        such as {"{{ booking_reference }}"} are filled in for each customer when the email is sent.
      </InfoPanel>
    </section>
  );
}
