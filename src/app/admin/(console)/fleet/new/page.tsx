import type { Metadata } from "next";

import AddYacht from "@/components/admin/AddYacht";

export const metadata: Metadata = { title: "Add yacht" };

// `?duplicate=<yachtId>` starts the form from a copy of that yacht.
export default async function FleetNewYachtPage({ searchParams }: PageProps<"/admin/fleet/new">) {
  const { duplicate } = await searchParams;
  const duplicateId = typeof duplicate === "string" ? duplicate : undefined;
  return <AddYacht key={duplicateId ?? "new"} duplicateId={duplicateId} />;
}
