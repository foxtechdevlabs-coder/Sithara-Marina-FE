import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AddYacht from "@/components/admin/AddYacht";
import { findYacht } from "@/components/admin/fleet-data";

export async function generateMetadata({
  params,
}: PageProps<"/admin/fleet/[yachtId]/edit">): Promise<Metadata> {
  const { yachtId } = await params;
  const yacht = findYacht(yachtId);
  return { title: yacht ? `Edit ${yacht.form.name}` : "Edit yacht" };
}

// The add-yacht form, filled with this yacht's details.
export default async function FleetYachtEditPage({
  params,
}: PageProps<"/admin/fleet/[yachtId]/edit">) {
  const { yachtId } = await params;
  const yacht = findYacht(yachtId);
  if (!yacht) notFound();
  return <AddYacht key={yacht.id} yacht={yacht} />;
}
