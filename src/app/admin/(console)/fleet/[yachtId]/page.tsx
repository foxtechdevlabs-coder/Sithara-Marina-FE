import type { Metadata } from "next";
import { notFound } from "next/navigation";

import YachtDetail from "@/components/admin/YachtDetail";
import { findYacht } from "@/components/admin/fleet-data";

export async function generateMetadata({
  params,
}: PageProps<"/admin/fleet/[yachtId]">): Promise<Metadata> {
  const { yachtId } = await params;
  return { title: findYacht(yachtId)?.form.name ?? "Yacht" };
}

// TODO: fetch the yacht from the fleet API instead of the dummy records.
export default async function FleetYachtPage({ params }: PageProps<"/admin/fleet/[yachtId]">) {
  const { yachtId } = await params;
  const yacht = findYacht(yachtId);
  if (!yacht) notFound();
  return <YachtDetail key={yacht.id} yacht={yacht} />;
}
