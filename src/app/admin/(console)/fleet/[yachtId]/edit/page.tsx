import type { Metadata } from "next";

import AddYacht from "@/components/admin/AddYacht";

export const metadata: Metadata = { title: "Edit yacht" };

// The add-yacht form, filled with this yacht's details.
export default async function FleetYachtEditPage({
  params,
}: PageProps<"/admin/fleet/[yachtId]/edit">) {
  const { yachtId } = await params;
  return <AddYacht key={yachtId} yachtId={yachtId} />;
}
