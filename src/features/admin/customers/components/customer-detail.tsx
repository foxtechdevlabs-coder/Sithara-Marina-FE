"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
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
import { adminRoutes } from "@/constants/routes";
import {
  formGrid,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatRupees } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  createCustomer,
  getCustomer,
  getCustomerEnquiries,
  updateCustomer,
  type CustomerDetail as Detail,
  type CustomerPatch,
} from "@/services/admin/customers.service";
import { isApiError } from "@/services/http/api-error";

import {
  bookingStateLabel,
  customerErrorMessage,
  enquiryStateLabel,
  instantDate,
  isEmail,
  localDate,
  normalisePhone,
} from "../utils/customer-format";

const TITLE = "A personal view.";

interface RecordRow {
  key: string;
  record: string;
  sort: string;
  date: string;
  state: string;
  href?: Route;
}

/** Customer record: "A personal view." (admin Figma A22). */
export function CustomerDetail({ customerId }: { customerId: string }) {
  const customer = useAdminQuery(
    (signal) => getCustomer(customerId, signal),
    `customer:${customerId}`,
  );
  if (!customer.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title={TITLE} />
        <div className="mt-[24px]">
          <LoadState
            loading={customer.loading}
            error={
              customer.error
                ? `Couldn't load the customer. ${customerErrorMessage(customer.error)}`
                : undefined
            }
            onRetry={customer.reload}
            label="Loading customer"
          />
          {Boolean(customer.error) && !customer.loading && (
            <Link
              href={adminRoutes.customers}
              className={cx(smallOutline, "mt-[18px] w-fit")}
              style={OUTLINE_STYLE}
            >
              Back to customers
            </Link>
          )}
        </div>
      </div>
    );
  }
  return <CustomerForm customer={customer.data} onSaved={customer.setData} />;
}

function CustomerForm({
  customer: c,
  onSaved,
}: {
  customer: Detail;
  onSaved: (next: Detail) => void;
}) {
  const [name, setName] = useState(c.full_name);
  const [phone, setPhone] = useState(c.phone ?? "");
  const [active, setActive] = useState(c.is_active);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();

  const enquiries = useAdminQuery(
    (signal) => getCustomerEnquiries({ id: c.id, email: c.email }, signal),
    `customer-enquiries:${c.id}`,
  );

  const phoneValue = normalisePhone(phone);
  const errors: { name?: string; phone?: string } = {};
  if (submitted) {
    if (!name.trim()) errors.name = "Enter the customer’s name.";
    if (phoneValue === null)
      errors.phone = "Use international format with the country code, e.g. +91 98765 43210.";
  }

  const patch: CustomerPatch = {};
  if (name.trim() !== c.full_name) patch.full_name = name.trim();
  if (phoneValue !== null && (phoneValue || null) !== c.phone) patch.phone = phoneValue || null;
  if (active !== c.is_active) patch.is_active = active;
  const changed = Object.keys(patch).length > 0;

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setNotice(undefined);
    if (!name.trim() || phoneValue === null) return;
    if (!changed) {
      setNotice({ tone: "success", text: "Nothing to save: the details are unchanged." });
      return;
    }
    setBusy(true);
    try {
      const saved = await updateCustomer(c.id, patch);
      onSaved({ ...c, ...saved });
      setName(saved.full_name);
      setPhone(saved.phone ?? "");
      setActive(saved.is_active);
      setSubmitted(false);
      setNotice({
        tone: "success",
        text:
          patch.is_active === false
            ? "Saved. The account is inactive: the customer is signed out and can’t sign in."
            : "Contact details saved.",
      });
    } catch (err) {
      setNotice({ tone: "error", text: customerErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const rows: RecordRow[] = [
    ...c.recent_bookings.map((b) => ({
      key: `b-${b.id}`,
      record: `${b.reference} · ${b.yacht.name}`,
      sort: b.starts_at,
      date: instantDate(b.starts_at),
      state: bookingStateLabel(b.status),
      href: adminRoutes.booking(b.id),
    })),
    ...(enquiries.data ?? []).map((e) => ({
      key: `e-${e.id}`,
      record: `${e.reference} · ${e.status === "proposal_sent" ? "Proposal" : "Enquiry"}`,
      sort: e.preferred_date ?? e.created_at,
      date: e.preferred_date ? localDate(e.preferred_date) : instantDate(e.created_at),
      state: enquiryStateLabel(e.status),
    })),
  ].sort((a, b) => b.sort.localeCompare(a.sort));
  const enquiriesForbidden = isApiError(enquiries.error) && enquiries.error.status === 403;

  return (
    <div className={pagePadding}>
      <PageHeader title={TITLE} subtitle={`Customer ${c.full_name}`} />

      <form onSubmit={save} noValidate className="mt-[24px] lg:mt-[30px]">
        <div className={cx(formGrid, "lg:max-w-[700px]")}>
          <div>
            <Label htmlFor="customer-name" required>
              Name
            </Label>
            <input
              id="customer-name"
              value={name}
              maxLength={255}
              autoComplete="off"
              onChange={(e) => setName(e.currentTarget.value)}
              className={input}
              {...errorProps("customer-name", errors.name)}
            />
            <FieldError id="customer-name" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="customer-email">Email</Label>
            <input
              id="customer-email"
              value={c.email}
              readOnly
              aria-describedby="customer-email-note"
              className={cx(input, "bg-[#fbfaf8]")}
            />
            <p id="customer-email-note" className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              {c.email_verified_at
                ? `Verified ${instantDate(c.email_verified_at)}. The email is the sign-in and can’t be changed here.`
                : "Not verified yet. The email is the sign-in and can’t be changed here."}
            </p>
          </div>
          <div>
            <Label htmlFor="customer-phone">Phone</Label>
            <input
              id="customer-phone"
              type="tel"
              value={phone}
              autoComplete="off"
              placeholder="+91 98765 43210"
              onChange={(e) => setPhone(e.currentTarget.value)}
              className={input}
              {...errorProps("customer-phone", errors.phone)}
            />
            <FieldError id="customer-phone" message={errors.phone} />
          </div>
          <div>
            <Label htmlFor="customer-active">Account</Label>
            <SelectBox
              id="customer-active"
              value={active ? "active" : "inactive"}
              onChange={(v) => setActive(v === "active")}
              options={[
                { value: "active", label: "Active · can sign in and book" },
                { value: "inactive", label: "Inactive · sign-in blocked" },
              ]}
            />
            {c.is_active && !active && (
              <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
                Saving signs the customer out everywhere. Their bookings are kept.
              </p>
            )}
          </div>
        </div>

        {/* Bookings and enquiries */}
        <div className="mt-[30px] lg:mt-[34px]">
          <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
            <caption className="sr-only">Bookings and enquiries</caption>
            <thead>
              <tr style={{ backgroundColor: SAND }}>
                {["Record", "Date", "State"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="w-1/3 px-[12px] py-[12px] font-normal"
                    style={{ color: BODY }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-[#ebe9e4]">
                  <td className="px-[12px] py-[12px]">
                    {r.href ? (
                      <Link href={r.href} className="underline-offset-2 hover:underline">
                        {r.record}
                      </Link>
                    ) : (
                      r.record
                    )}
                  </td>
                  <td className="px-[12px] py-[12px]">{r.date}</td>
                  <td className="px-[12px] py-[12px]">{r.state}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr className="border-b border-[#ebe9e4]">
                  <td colSpan={3} className="px-[12px] py-[12px]" style={{ color: BODY }}>
                    {enquiries.loading ? "Loading records…" : "No bookings or enquiries yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <ul className="grid gap-[12px] lg:hidden">
            {rows.map((r) => (
              <li key={r.key} className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
                <p className="text-[15px]">
                  {r.href ? (
                    <Link href={r.href} className="underline underline-offset-2">
                      {r.record}
                    </Link>
                  ) : (
                    r.record
                  )}
                </p>
                <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
                  {r.date} · {r.state}
                </p>
              </li>
            ))}
            {!rows.length && (
              <li className="text-[12px]" style={{ color: BODY }}>
                {enquiries.loading ? "Loading records…" : "No bookings or enquiries yet."}
              </li>
            )}
          </ul>

          <p className="mt-[12px] text-[11px] leading-[17px]" style={{ color: BODY }}>
            {c.booking_count} {c.booking_count === 1 ? "booking" : "bookings"} ·{" "}
            {c.stats.upcoming_count} upcoming · {c.stats.completed_count} completed ·{" "}
            {c.stats.cancelled_count} cancelled · {formatRupees(c.stats.total_booked_amount)} booked
            {c.booking_count > c.recent_bookings.length &&
              ` · showing the ${c.recent_bookings.length} most recent`}
            {enquiriesForbidden
              ? " · Enquiries need the enquiries permission"
              : enquiries.error && !enquiries.loading
                ? " · Enquiries couldn’t be loaded"
                : ""}
          </p>
        </div>

        {notice && (
          <Notice tone={notice.tone} className="mt-[20px] lg:max-w-[700px]">
            {notice.text}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
          <button
            type="submit"
            disabled={busy}
            className={cx(smallPrimary, "min-w-[118px]")}
            style={PRIMARY_STYLE}
          >
            {busy ? "Saving…" : "Save contact details"}
          </button>
          <Link
            href={adminRoutes.bookingsForCustomer(c.id, c.full_name)}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            View customer bookings
          </Link>
        </div>
      </form>
    </div>
  );
}

/** Add a customer (POST /admin/customers). They sign in later with this email. */
export function NewCustomer() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  const phoneValue = normalisePhone(phone);
  const errors: { name?: string; email?: string; phone?: string } = {};
  if (submitted) {
    if (!name.trim()) errors.name = "Enter the customer’s name.";
    if (!isEmail(email)) errors.email = "Enter a valid email address.";
    if (phoneValue === null)
      errors.phone = "Use international format with the country code, e.g. +91 98765 43210.";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure("");
    if (!name.trim() || !isEmail(email) || phoneValue === null) return;
    setBusy(true);
    try {
      const created = await createCustomer({
        full_name: name.trim(),
        email: email.trim(),
        ...(phoneValue ? { phone: phoneValue } : {}),
      });
      router.push(adminRoutes.customer(created.id));
    } catch (err) {
      setFailure(customerErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A new guest on board."
        subtitle="Add a customer for an office booking. They can sign in later with this email."
      />
      <form onSubmit={save} noValidate className="mt-[24px] lg:mt-[30px]">
        <div className={cx(formGrid, "lg:max-w-[700px]")}>
          <div>
            <Label htmlFor="new-name" required>
              Name
            </Label>
            <input
              id="new-name"
              value={name}
              maxLength={255}
              onChange={(e) => setName(e.currentTarget.value)}
              className={input}
              {...errorProps("new-name", errors.name)}
            />
            <FieldError id="new-name" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="new-email" required>
              Email
            </Label>
            <input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className={input}
              {...errorProps("new-email", errors.email)}
            />
            <FieldError id="new-email" message={errors.email} />
          </div>
          <div>
            <Label htmlFor="new-phone">Phone</Label>
            <input
              id="new-phone"
              type="tel"
              value={phone}
              placeholder="+91 98765 43210"
              onChange={(e) => setPhone(e.currentTarget.value)}
              className={input}
              {...errorProps("new-phone", errors.phone)}
            />
            <FieldError id="new-phone" message={errors.phone} />
          </div>
        </div>
        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[700px]">
            {failure}
          </Notice>
        )}
        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button
            type="submit"
            disabled={busy}
            className={cx(smallPrimary, "min-w-[118px]")}
            style={PRIMARY_STYLE}
          >
            {busy ? "Adding…" : "Add customer"}
          </button>
          <Link
            href={adminRoutes.customers}
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
