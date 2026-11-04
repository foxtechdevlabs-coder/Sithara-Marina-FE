"use client";

import { useRef, useState } from "react";

import {
  activateYacht,
  deactivateYacht,
  type AffectedBooking,
  type Yacht,
} from "@/services/admin/fleet.service";

import { fleetErrorMessage } from "../utils/fleet-error-message";

export interface StatusResult {
  yacht: Yacht;
  /** After deactivating: future bookings that stay valid and need follow-up. */
  affected: AffectedBooking[];
}

/** "2 future bookings still need follow-up: SM-1, SM-2." */
export function affectedBookingsText(affected: AffectedBooking[]): string {
  if (!affected.length) return "";
  const refs = affected.map((b) => b.reference).join(", ");
  return ` ${affected.length} future ${affected.length === 1 ? "booking stays" : "bookings stay"} valid and ${affected.length === 1 ? "needs" : "need"} follow-up: ${refs}.`;
}

/**
 * Activate / deactivate a yacht after a confirmation, one request at a time.
 * POST /admin/yachts/{id}/activate and /deactivate.
 */
export function useYachtStatus() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);

  async function toggle(yacht: Pick<Yacht, "id" | "name" | "is_active">) {
    if (busy.current) return null;
    const activating = !yacht.is_active;
    const question = activating
      ? `Activate ${yacht.name}? It can take bookings again.`
      : `Deactivate ${yacht.name}? New bookings stop; existing bookings stay valid and need follow-up.`;
    if (!window.confirm(question)) return null;

    busy.current = true;
    setPendingId(yacht.id);
    setMessage("");
    setError("");
    try {
      let result: StatusResult;
      if (activating) {
        result = { yacht: await activateYacht(yacht.id), affected: [] };
      } else {
        const { affected_bookings, ...updated } = await deactivateYacht(yacht.id);
        result = { yacht: updated, affected: affected_bookings };
      }
      setMessage(
        `${yacht.name} is ${activating ? "active" : "deactivated"}.${affectedBookingsText(result.affected)}`,
      );
      return result;
    } catch (err) {
      setError(
        `Couldn't ${activating ? "activate" : "deactivate"} ${yacht.name}. ${fleetErrorMessage(err)}`,
      );
      return null;
    } finally {
      busy.current = false;
      setPendingId(null);
    }
  }

  return { toggle, pendingId, message, error };
}
