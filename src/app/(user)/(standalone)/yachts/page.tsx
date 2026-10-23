import type { Metadata } from "next";

import OurYachts from "@/components/user/OurYachts";

export const metadata: Metadata = { title: "Our yachts" };

// Renders dummy data for now. Once the API is ready, fetch the fleet here and
// pass it in: <OurYachts yachts={data} />.
export default function YachtsPage() {
  return <OurYachts />;
}
