"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearSession,
  hasSession,
  onSessionChange,
  type SessionEndReason,
} from "@/services/admin/admin-session";
import { getCurrentAdmin, login, logout, type AdminProfile } from "@/services/admin/auth.service";
import { ApiError, isApiError } from "@/services/http/api-error";

export type AdminSessionStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  /** A session exists but the server could not be reached to confirm it. */
  | "offline";

export type SessionEnd = SessionEndReason | "forbidden";

interface AdminSessionValue {
  status: AdminSessionStatus;
  admin: AdminProfile | null;
  /** Why the last session ended, for the sign-in screen. */
  endReason: SessionEnd | null;
  /** POST /admin/auth/login, then GET /admin/auth/me. */
  signIn: (email: string, password: string) => Promise<AdminProfile>;
  /** POST /admin/auth/logout, then forgets the session. */
  signOut: () => Promise<void>;
  /** Re-checks the session with GET /admin/auth/me. */
  reload: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

/** The console is for the admin and super_admin roles only. */
const isConsoleRole = (admin: AdminProfile) =>
  admin.role === "admin" || admin.role === "super_admin";

/** Error thrown by `signIn` when the account is not an admin. */
const notAnAdmin = () =>
  new ApiError("Not an admin or super admin account", { kind: "http", status: 403 });

/**
 * Admin session for the whole admin area: restores it on load with
 * GET /admin/auth/me (refreshing the access token when needed), and follows
 * expiry and sign-out from any tab.
 */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [endReason, setEndReason] = useState<SessionEnd | null>(null);

  const signedOut = useCallback((reason: SessionEnd | null) => {
    setEndReason(reason);
    setAdmin(null);
    setStatus("unauthenticated");
  }, []);

  const reload = useCallback(async () => {
    if (!hasSession()) {
      signedOut(null);
      return;
    }
    // A retry from "offline" keeps its screen until there is an answer.
    setStatus((current) => (current === "offline" ? current : "loading"));
    try {
      const profile = await getCurrentAdmin();
      if (!isConsoleRole(profile)) {
        clearSession("signed-out");
        signedOut("forbidden");
        return;
      }
      setAdmin(profile);
      setStatus("authenticated");
    } catch (error) {
      if (isApiError(error) && error.isForbidden) {
        clearSession("signed-out");
        signedOut("forbidden");
      } else if (hasSession()) {
        // Network or server trouble: keep the session and let the user retry.
        setStatus("offline");
      } else {
        signedOut("expired");
      }
    }
  }, [signedOut]);

  useEffect(() => {
    // Restore once on load. Tokens live in localStorage, so this runs client-side.
    queueMicrotask(() => void reload());
    return onSessionChange((reason) => {
      if (reason) signedOut(reason);
      else void reload(); // signed in from another tab
    });
  }, [reload, signedOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    await login(email, password);
    let profile: AdminProfile;
    try {
      profile = await getCurrentAdmin();
    } catch (error) {
      if (isApiError(error) && error.isForbidden) clearSession("signed-out");
      throw error;
    }
    if (!isConsoleRole(profile)) {
      clearSession("signed-out");
      throw notAnAdmin();
    }
    setEndReason(null);
    setAdmin(profile);
    setStatus("authenticated");
    return profile;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      signedOut("signed-out");
    }
  }, [signedOut]);

  const value = useMemo(
    () => ({ status, admin, endReason, signIn, signOut, reload }),
    [status, admin, endReason, signIn, signOut, reload],
  );
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession must be used inside <AdminSessionProvider>");
  return value;
}

/** Display label for an admin role. */
export function roleLabel(role: AdminProfile["role"]): string {
  if (role === "super_admin") return "Super administrator";
  if (role === "admin") return "Administrator";
  return "Customer";
}
