"use client";

import { useRef, useState, type FormEvent } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { cx } from "@/lib/cx";
import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
  type Role,
} from "@/services/admin/staff.service";

import { PERMISSION_GROUPS, capabilitiesText } from "../utils/staff-access";

const textAction = "text-[12px] underline underline-offset-2 hover:opacity-70 disabled:opacity-50";

/**
 * Roles and permissions. Built-in roles can't be changed; custom ones can, and
 * can't hold staff management, settings changes or bank details.
 * GET, POST /admin/roles and PATCH, DELETE /admin/roles/{id}.
 */
export function RolesPage() {
  const query = useAdminQuery((signal) => listRoles(signal), "roles");
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(role: Role) {
    if (!role.id || !window.confirm(`Delete the ${role.name} role?`)) return;
    setDeleting(role.id);
    setProblem("");
    setNotice("");
    try {
      await deleteRole(role.id);
      setNotice(`${role.name} deleted.`);
      if (editing !== "new" && editing?.id === role.id) setEditing(null);
      query.reload();
    } catch (err) {
      setProblem(`Couldn't delete ${role.name}. ${fleetErrorMessage(err, "This role")}`);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        Roles and permissions.
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[28px]" style={{ color: BODY }}>
        What each role can do. Changes apply to its staff on their next action.
      </p>

      {!query.data ? (
        <LoadState
          loading={query.loading}
          label="Loading roles"
          error={query.error ? `Couldn't load the roles. ${fleetErrorMessage(query.error)}` : ""}
          onRetry={query.reload}
        />
      ) : (
        <>
          <ul className="mt-[28px] flex flex-col gap-[14px]">
            {query.data.map((role) => (
              <li
                key={role.id ?? role.key}
                className="border border-[#e3e1dc] bg-white px-[16px] pt-[18px] pb-[18px]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-[16px] gap-y-[6px]">
                  <h2 className="text-[18px] leading-[24px]">{role.name}</h2>
                  <p className="text-[12px]" style={{ color: MUTED }}>
                    {role.id ? "Custom" : "Built in"} · {role.account_count}{" "}
                    {role.account_count === 1 ? "account" : "accounts"}
                  </p>
                </div>
                {role.description && (
                  <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
                    {role.description}
                  </p>
                )}
                <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
                  {capabilitiesText(role.permissions)}
                </p>
                {role.id && (
                  <div className="mt-[10px] flex gap-[14px]">
                    <button type="button" onClick={() => setEditing(role)} className={textAction}>
                      Edit<span className="sr-only"> {role.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(role)}
                      disabled={deleting !== null}
                      className={`${textAction} text-[#b3261e]`}
                    >
                      Delete<span className="sr-only"> {role.name}</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {problem && (
            <Notice tone="error" className="mt-[20px]">
              {problem}
            </Notice>
          )}
          {notice && <Notice className="mt-[20px]">{notice}</Notice>}

          {editing ? (
            <RoleForm
              key={editing === "new" ? "new" : (editing.id ?? "")}
              role={editing === "new" ? undefined : editing}
              onCancel={() => setEditing(null)}
              onSaved={(saved) => {
                setEditing(null);
                setProblem("");
                setNotice(`${saved.name} saved.`);
                query.reload();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNotice("");
                setEditing("new");
              }}
              className={`${primaryButton} mt-[22px] w-[148px]`}
              style={PRIMARY_STYLE}
            >
              Add role
            </button>
          )}
        </>
      )}
    </div>
  );
}

function RoleForm({
  role,
  onSaved,
  onCancel,
}: {
  role?: Role;
  onSaved: (role: Role) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!name.trim()) found["role-name"] = "Enter a name for the role.";
    if (permissions.length === 0) found["role-permissions"] = "Choose at least one permission.";
    setErrors(found);
    if (Object.keys(found).length > 0 || busy.current) return;

    busy.current = true;
    setSaving(true);
    setProblem("");
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      permissions,
    };
    try {
      onSaved(await (role?.id ? updateRole(role.id, input) : createRole(input)));
    } catch (err) {
      setProblem(`Couldn't save the role. ${fleetErrorMessage(err, "This role")}`);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      noValidate
      aria-label={role ? `Edit ${role.name}` : "Add role"}
      className="mt-[22px] border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]"
    >
      <h2 className="text-[18px] leading-[24px]">{role ? `Edit ${role.name}` : "Add role"}</h2>
      <div className="mt-[16px] grid gap-x-[21px] gap-y-[20px] sm:grid-cols-2">
        <div>
          <Label htmlFor="role-name" required>
            Role name
          </Label>
          <input
            id="role-name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.currentTarget.value)}
            className={input}
            autoComplete="off"
            {...errorProps("role-name", errors["role-name"])}
          />
          <FieldError id="role-name" message={errors["role-name"]} />
        </div>
        <div>
          <Label htmlFor="role-description">Description</Label>
          <input
            id="role-description"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.currentTarget.value)}
            className={input}
            autoComplete="off"
          />
        </div>
      </div>

      <fieldset id="role-permissions" className="mt-[20px]">
        <legend className="contents">
          <Label as="p" required hint="staff, settings changes and bank details can't be given">
            Permissions
          </Label>
        </legend>
        <ul className="divide-y divide-[#eceae6] border-y border-[#eceae6]">
          {PERMISSION_GROUPS.map((group) => (
            <li
              key={group.area}
              className="flex flex-wrap items-center gap-x-[20px] gap-y-[6px] py-[10px] text-[13px]"
            >
              <span className="w-full sm:w-[160px]">{group.area}</span>
              {group.permissions.map((p) => (
                <label key={p.value} className="inline-flex items-center gap-[6px]">
                  <input
                    type="checkbox"
                    aria-label={`${p.label} ${group.area}`}
                    checked={permissions.includes(p.value)}
                    onChange={(e) => {
                      const { checked } = e.currentTarget;
                      setPermissions((held) =>
                        checked ? [...held, p.value] : held.filter((v) => v !== p.value),
                      );
                    }}
                    className="size-[15px] accent-[#0d1b2a]"
                  />
                  {p.label}
                </label>
              ))}
            </li>
          ))}
        </ul>
        <FieldError id="role-permissions" message={errors["role-permissions"]} />
      </fieldset>

      {problem && (
        <Notice tone="error" className="mt-[16px]">
          {problem}
        </Notice>
      )}
      <div className={cx("mt-[18px] flex flex-wrap gap-[14px]")}>
        <button
          type="submit"
          disabled={saving}
          className={`${primaryButton} w-[148px]`}
          style={PRIMARY_STYLE}
        >
          {saving ? "Saving…" : "Save role"}
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
