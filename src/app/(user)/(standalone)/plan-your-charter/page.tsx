import type { Metadata } from "next";

import PlanCharter from "@/components/user/PlanCharter";

export const metadata: Metadata = { title: "Plan your charter" };

export default function PlanCharterPage() {
  return <PlanCharter />;
}
