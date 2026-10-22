import { redirect } from "next/navigation";

import { adminRoutes } from "@/constants/routes";

/** `/admin` has no page of its own; send staff to the dashboard overview. */
export default function AdminIndexPage() {
  redirect(adminRoutes.dashboard);
}
