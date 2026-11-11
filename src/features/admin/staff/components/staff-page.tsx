"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

import { BODY, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { LoadingLogo } from "@/components/shared/loading-logo";
import { adminRoutes } from "@/constants/routes";
import { useAdminSession } from "@/features/admin/auth/components/admin-session-provider";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import {
  deactivateStaff,
  inviteStaff,
  listRoles,
  listStaff,
  reactivateStaff,
  updateStaff,
  type Role,
  type Staff,
} from "@/services/admin/staff.service";

import {
  EMPTY_INVITE,
  accessText,
  capabilitiesText,
  inviteErrors,
  inviteInput,
  missingAccessText,
  roleOf,
  roleValue,
  staffChanges,
  staffRoleValue,
  staffStatus,
  type InviteDraft,
} from "../utils/staff-access";

const PAGE_SIZE = 20;
const PAGE = "px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]";
const textAction = "text-[12px] underline underline-offset-2 hover:opacity-70 disabled:opacity-50";
const pagerButton =
  "flex h-[48px] w-[96px] items-center justify-center border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-60";

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        {title}
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[28px]" style={{ color: BODY }}>
        {text}
      </p>
    </>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside
      className="mt-[22px] px-[17px] pt-[18px] pb-[20px] lg:mt-[28px]"
      style={{ backgroundColor: SAND }}
    >
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        {title}
      </p>
      <p className="mt-[10px] text-[12px] leading-[18px]">{children}</p>
    </aside>
  );
}

/**
 * Staff ("The right access, for each role."), from the admin Figma design: the
 * staff table (cards on phones), the invitation form and its confirmation step.
 * Data: GET /admin/staff, GET /admin/roles. Only a super admin can change an
 * account, and nobody can change their own, so the row actions follow that.
 */
export function StaffPage() {
  const { admin } = useAdminSession();
  const [page, setPage] = useState(1);
  const request = { page, limit: PAGE_SIZE };
  const list = useAdminQuery((signal) => listStaff(request, signal), JSON.stringify(request));
  const roles = useAdminQuery((signal) => listRoles(signal), "roles");

  const [draft, setDraft] = useState<InviteDraft>(EMPTY_INVITE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);

  const allRoles = roles.data ?? [];
  const chosenRole = allRoles.find((r) => roleValue(r) === draft.role);
  const canManage = admin?.role === "super_admin";
  const staff = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const loadError = list.error ? `Couldn't load the staff. ${fleetErrorMessage(list.error)}` : "";

  const field = (key: keyof InviteDraft, id: string) => ({
    id,
    value: draft[key],
    onChange: (e: { currentTarget: { value: string } }) => {
      const { value } = e.currentTarget;
      setDraft((d) => ({ ...d, [key]: value }));
      clearError(id);
    },
    className: input,
    autoComplete: "off",
    ...errorProps(id, errors[id]),
  });

  function clearError(id: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function review(event: FormEvent) {
    event.preventDefault();
    const found = inviteErrors(draft);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }
    setProblem("");
    setNotice("");
    setReviewing(true);
    window.scrollTo(0, 0);
  }

  async function send() {
    if (busy.current || !chosenRole) return;
    busy.current = true;
    setSending(true);
    setProblem("");
    try {
      const invited = await inviteStaff(inviteInput(draft, chosenRole));
      setNotice(
        invited.invite_sent
          ? `Invitation sent to ${invited.email}.`
          : `${invited.full_name}'s account was created, but the email couldn't be sent. They can use "Forgot password" on the sign-in page to get a new link.`,
      );
      setDraft(EMPTY_INVITE);
      setReviewing(false);
      list.reload();
      roles.reload();
    } catch (err) {
      setProblem(`Couldn't send the invitation. ${fleetErrorMessage(err)}`);
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  async function act(person: Staff, action: () => Promise<Staff>, done: string, failure: string) {
    if (busy.current) return;
    busy.current = true;
    setBusyId(person.id);
    setProblem("");
    setNotice("");
    try {
      await action();
      setNotice(done);
      setEditing(null);
      list.reload();
      roles.reload();
    } catch (err) {
      setProblem(`${failure} ${fleetErrorMessage(err, "This account")}`);
    } finally {
      busy.current = false;
      setBusyId(null);
    }
  }

  function toggleActive(person: Staff) {
    const { id, full_name: name, is_active: active } = person;
    const question = active
      ? `Deactivate ${name}? They lose access at once and are signed out. Their records and audit history stay.`
      : `Reactivate ${name}? They can sign in again.`;
    if (!window.confirm(question)) return;
    void act(
      person,
      () => (active ? deactivateStaff(id) : reactivateStaff(id)),
      `${name} is ${active ? "deactivated" : "active again"}.`,
      `Couldn't ${active ? "deactivate" : "reactivate"} ${name}.`,
    );
  }

  if (reviewing && chosenRole) {
    const missing = missingAccessText(chosenRole.permissions);
    return (
      <div className={PAGE}>
        <Heading
          title="Confirm the staff invitation."
          text="Review access before inviting a new team member."
        />
        <section className="mt-[28px] border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]">
          <h2 className="text-[20px] leading-[28px] break-words">
            {draft.email.trim()} · {chosenRole.name}
          </h2>
          <p className="mt-[10px] text-[12px] leading-[18px]" style={{ color: BODY }}>
            {draft.name.trim()}
            <br />
            {capabilitiesText(chosenRole.permissions)}
            {missing && (
              <>
                <br />
                {missing}
              </>
            )}
          </p>
        </section>
        <Note title="Role-based access">
          The invite remains pending until accepted. Role changes and deactivation are recorded in
          the staff audit history.
        </Note>
        {problem && (
          <Notice tone="error" className="mt-[20px]">
            {problem}
          </Notice>
        )}
        <div className="mt-[22px] flex flex-col items-start gap-[14px] sm:flex-row">
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending}
            className={`${primaryButton} w-[148px]`}
            style={PRIMARY_STYLE}
          >
            {sending ? "Sending…" : "Send invitation"}
          </button>
          <button
            type="button"
            onClick={() => {
              setProblem("");
              setReviewing(false);
            }}
            disabled={sending}
            className={`${outlineButton} w-[148px]`}
            style={OUTLINE_STYLE}
          >
            Edit permissions
          </button>
        </div>
      </div>
    );
  }

  const actions = (person: Staff) => {
    if (person.id === admin?.id) {
      return (
        <span className="text-[12px]" style={{ color: MUTED }}>
          You
        </span>
      );
    }
    if (!canManage) return null;
    return (
      <span className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
        <button
          type="button"
          onClick={() => setEditing(person)}
          disabled={busyId !== null}
          className={textAction}
        >
          Edit<span className="sr-only"> {person.full_name}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleActive(person)}
          disabled={busyId !== null}
          aria-busy={busyId === person.id}
          className={`${textAction} ${person.is_active ? "text-[#b3261e]" : "text-[#2e7d4f]"}`}
        >
          {person.is_active ? "Deactivate" : "Reactivate"}
          <span className="sr-only"> {person.full_name}</span>
        </button>
      </span>
    );
  };

  const roleName = (person: Staff) =>
    roleOf(person, allRoles)?.name ?? person.staff_role?.name ?? "—";
  const access = (person: Staff) => accessText(roleOf(person, allRoles));

  return (
    <div className={PAGE}>
      <Heading title="The right access, for each role." text="Staff management and permissions." />

      <p aria-live="polite" className="sr-only">
        {list.loading ? "Loading staff" : loadError || `${total} staff found`}
      </p>

      {list.error && !list.loading ? (
        <div role="alert" className="mt-[28px] flex flex-col items-start gap-[14px]">
          <p className="text-[14px]">{loadError}</p>
          <button
            type="button"
            onClick={list.reload}
            className={`${outlineButton} w-[128px]`}
            style={OUTLINE_STYLE}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <table
            aria-busy={list.loading}
            className="mt-[28px] hidden w-full border-collapse text-left text-[12px] lg:table"
          >
            <caption className="sr-only">Staff</caption>
            <thead style={{ backgroundColor: SAND }}>
              <tr className="text-[10px] tracking-[0.08em]" style={{ color: MUTED }}>
                {["Staff member", "Role", "Access", "Status"].map((h) => (
                  <th key={h} scope="col" className="h-[43px] w-[21%] px-[13px] font-normal">
                    {h}
                  </th>
                ))}
                <th scope="col" className="h-[43px] px-[13px] font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {list.loading && !list.data ? (
                <tr>
                  <td colSpan={5} className="h-[80px] px-[13px]" style={{ color: MUTED }}>
                    <LoadingLogo label="Loading staff" size="compact" />
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-[#e3e1dc] ${list.loading ? "opacity-60" : ""}`}
                  >
                    <th scope="row" className="h-[47px] px-[13px] font-normal">
                      {s.full_name}
                    </th>
                    <td className="px-[13px]">{roleName(s)}</td>
                    <td className="px-[13px]">{access(s)}</td>
                    <td className="px-[13px]">{staffStatus(s)}</td>
                    <td className="px-[13px]">{actions(s)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <ul aria-busy={list.loading} className="mt-[28px] flex flex-col gap-[22px] lg:hidden">
            {list.loading && !list.data && (
              <li style={{ color: MUTED }}>
                <LoadingLogo label="Loading staff" size="compact" />
              </li>
            )}
            {staff.map((s) => (
              <li
                key={s.id}
                className={`border border-[#e3e1dc] bg-white px-[20px] pt-[24px] pb-[20px] ${list.loading ? "opacity-60" : ""}`}
              >
                <h2 className="text-[20px] leading-[26px]">{s.full_name}</h2>
                <dl className="mt-[10px] text-[14px] leading-[20px]">
                  {[
                    ["Role", roleName(s)],
                    ["Access", access(s)],
                    ["Status", staffStatus(s)],
                  ].map(([term, value], i) => (
                    <div key={term} className={i > 0 ? "mt-[12px]" : ""}>
                      <dt className="text-[12px]" style={{ color: BODY }}>
                        {term}
                      </dt>
                      <dd className="mt-[4px]">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-[14px]">{actions(s)}</div>
              </li>
            ))}
          </ul>

          {total > PAGE_SIZE && (
            <nav
              aria-label="Staff pages"
              className="mt-[22px] flex flex-wrap items-center gap-[14px] text-[12px]"
            >
              <span style={{ color: BODY }}>
                Showing {first}–{last} of {total}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1 || list.loading}
                className={pagerButton}
                style={{ borderColor: INK }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={last >= total || list.loading}
                className={pagerButton}
                style={{ borderColor: INK }}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {editing && (
        <StaffEditor
          key={editing.id}
          person={editing}
          roles={allRoles}
          saving={busyId === editing.id}
          onCancel={() => setEditing(null)}
          onSave={(patch) =>
            Object.keys(patch).length === 0
              ? setEditing(null)
              : void act(
                  editing,
                  () => updateStaff(editing.id, patch),
                  `${editing.full_name} is updated.`,
                  `Couldn't update ${editing.full_name}.`,
                )
          }
        />
      )}

      {notice && <Notice className="mt-[20px]">{notice}</Notice>}
      {problem && (
        <Notice tone="error" className="mt-[20px]">
          {problem}
        </Notice>
      )}

      <form onSubmit={review} noValidate>
        <div className="mt-[24px] grid gap-x-[21px] gap-y-[24px] sm:grid-cols-2">
          <div>
            <Label htmlFor="invite-email" required>
              Invite email
            </Label>
            <input {...field("email", "invite-email")} type="email" maxLength={255} />
            <FieldError id="invite-email" message={errors["invite-email"]} />
          </div>
          <div>
            <Label htmlFor="invite-role" required>
              Role
            </Label>
            <SelectBox
              id="invite-role"
              value={draft.role}
              invalid={errors["invite-role"]}
              onChange={(role) => {
                setDraft((d) => ({ ...d, role }));
                clearError("invite-role");
              }}
              options={[
                { value: "", label: roles.loading ? "Loading roles…" : "Choose a role" },
                ...allRoles.map((r) => ({ value: roleValue(r), label: r.name })),
              ]}
            />
            <FieldError id="invite-role" message={errors["invite-role"]} />
          </div>
          <div>
            <Label htmlFor="invite-name" required>
              Full name
            </Label>
            <input {...field("name", "invite-name")} maxLength={255} />
            <FieldError id="invite-name" message={errors["invite-name"]} />
          </div>
        </div>

        {roles.error ? (
          <Notice tone="error" className="mt-[20px]">
            Couldn&rsquo;t load the roles. {fleetErrorMessage(roles.error)}
          </Notice>
        ) : null}

        <section
          aria-labelledby="capabilities-title"
          className="mt-[28px] border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]"
        >
          <h2 id="capabilities-title" className="text-[18px] leading-[24px]">
            Role capabilities
          </h2>
          <p className="mt-[10px] text-[12px] leading-[18px]" style={{ color: BODY }}>
            {chosenRole ? (
              <>
                {capabilitiesText(chosenRole.permissions)}
                {missingAccessText(chosenRole.permissions) && (
                  <>
                    <br />
                    {missingAccessText(chosenRole.permissions)}
                  </>
                )}
              </>
            ) : (
              "Choose a role to see what it can do."
            )}
          </p>
        </section>

        <div className="mt-[22px] flex flex-col items-start gap-[14px] sm:flex-row">
          <button type="submit" className={`${primaryButton} w-[148px]`} style={PRIMARY_STYLE}>
            Review invitation
          </button>
          <Link
            href={adminRoutes.staffRoles}
            className={`${outlineButton} w-[148px]`}
            style={OUTLINE_STYLE}
          >
            View roles
          </Link>
        </div>
      </form>

      <Note title="Keep administrative access">
        Do not remove the last active administrator. Deactivation removes future access while
        preserving authored records and audit history.
      </Note>
    </div>
  );
}

/** Changes an account's name or role. PATCH /admin/staff/{id}. */
function StaffEditor({
  person,
  roles,
  saving,
  onSave,
  onCancel,
}: {
  person: Staff;
  roles: Role[];
  saving: boolean;
  onSave: (patch: ReturnType<typeof staffChanges>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(person.full_name);
  const [role, setRole] = useState(staffRoleValue(person));
  const [error, setError] = useState("");

  function save(event: FormEvent) {
    event.preventDefault();
    const chosen = roles.find((r) => roleValue(r) === role);
    if (!name.trim()) {
      setError("Enter their full name.");
      return;
    }
    if (chosen) onSave(staffChanges(person, name, chosen));
  }

  return (
    <form
      onSubmit={save}
      noValidate
      aria-label={`Edit ${person.full_name}`}
      className="mt-[24px] border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]"
    >
      <h2 className="text-[18px] leading-[24px]">Edit {person.full_name}</h2>
      <div className="mt-[16px] grid gap-x-[21px] gap-y-[20px] sm:grid-cols-2">
        <div>
          <Label htmlFor="staff-name" required>
            Full name
          </Label>
          <input
            id="staff-name"
            value={name}
            maxLength={255}
            onChange={(e) => {
              setName(e.currentTarget.value);
              setError("");
            }}
            className={input}
            {...errorProps("staff-name", error)}
          />
          <FieldError id="staff-name" message={error} />
        </div>
        <div>
          <Label htmlFor="staff-role" hint="moving to or from Super Admin signs them out" required>
            Role
          </Label>
          <SelectBox
            id="staff-role"
            value={role}
            onChange={setRole}
            options={roles.map((r) => ({ value: roleValue(r), label: r.name }))}
          />
        </div>
      </div>
      <div className="mt-[18px] flex flex-wrap gap-[14px]">
        <button
          type="submit"
          disabled={saving}
          className={`${primaryButton} w-[148px]`}
          style={PRIMARY_STYLE}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={`${outlineButton} w-[112px]`}
          style={OUTLINE_STYLE}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
