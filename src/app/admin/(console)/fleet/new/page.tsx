import type { Metadata } from "next";

import AddYacht from "@/components/admin/AddYacht";
import { findYacht } from "@/components/admin/fleet-data";

export const metadata: Metadata = { title: "Add yacht" };

// `?duplicate=<yachtId>` starts the form from a copy of that yacht.
export default async function FleetNewYachtPage({ searchParams }: PageProps<"/admin/fleet/new">) {
  const { duplicate } = await searchParams;
  const source = typeof duplicate === "string" ? findYacht(duplicate) : undefined;
  return <AddYacht key={source?.id ?? "new"} template={source} />;
}
