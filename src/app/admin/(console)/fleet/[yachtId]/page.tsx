import type { Metadata } from "next";

import YachtDetail from "@/components/admin/YachtDetail";

export const metadata: Metadata = { title: "Yacht" };

// The yacht is loaded in the browser, where the admin session lives.
export default async function FleetYachtPage({ params }: PageProps<"/admin/fleet/[yachtId]">) {
  const { yachtId } = await params;
  return <YachtDetail key={yachtId} yachtId={yachtId} />;
}
