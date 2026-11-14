import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/* Audit history (backend: /admin/audit-logs, needs audit:read). */

const actorSchema = z.object({ id: z.string(), full_name: z.string(), email: z.string() });

/** AuditLogResponseDto */
export const auditEntrySchema = z.object({
  id: z.string(),
  /** Null for system actions. */
  actor: actorSchema.nullable(),
  /** e.g. "yacht.update" */
  action: z.string(),
  /** e.g. "yacht" */
  entity_type: z.string(),
  entity_id: z.string(),
  created_at: z.string(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/** AuditLogDetailResponseDto — with the record before and after the change. */
export const auditDetailSchema = auditEntrySchema.extend({
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});
export type AuditDetail = z.infer<typeof auditDetailSchema>;

const listSchema = z.object({
  items: z.array(auditEntrySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export interface AuditQuery {
  page?: number;
  /** 1–100 (default 20). */
  limit?: number;
  /** Who made the change. */
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  /** On or after this date (YYYY-MM-DD, business time zone). */
  from?: string;
  /** On or before this date. */
  to?: string;
}

/** GET /admin/audit-logs — newest first. 400 INVALID_DATE_RANGE. */
export function listAuditLogs(query: AuditQuery = {}, signal?: AbortSignal) {
  return adminApiClient.get("/admin/audit-logs", {
    query: { ...query },
    schema: listSchema,
    signal,
  });
}

/** GET /admin/audit-logs/{id} */
export function getAuditLog(id: string, signal?: AbortSignal): Promise<AuditDetail> {
  return adminApiClient.get(`/admin/audit-logs/${encodeURIComponent(id)}`, {
    schema: auditDetailSchema,
    signal,
  });
}
