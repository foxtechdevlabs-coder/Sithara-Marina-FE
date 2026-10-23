import type { Metadata } from "next";

import YachtDetails from "@/components/user/YachtDetails";

export const metadata: Metadata = { title: "Yacht details" };

// Renders dummy data for now. Once the API is ready, fetch the yacht by
// `yachtId` (from `params`) and pass it in: <YachtDetails yacht={data} />.
export default function YachtDetailPage() {
  return <YachtDetails />;
}
