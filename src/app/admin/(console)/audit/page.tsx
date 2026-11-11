import type { Metadata } from "next";

import { AuditHistory } from "@/features/admin/audit/components/audit-history";

export const metadata: Metadata = { title: "Audit history" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const q = await searchParams;
  const type = one(q.entity_type);
  const id = one(q.entity_id);
  return <AuditHistory key={`${type}:${id}`} entityType={type} entityId={id} />;
}
