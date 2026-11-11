import { redirect } from "next/navigation";

import { userRoutes } from "@/constants/routes";

/** Until the account overview exists, `/account` opens the profile details. */
export default function AccountPage() {
  redirect(userRoutes.accountProfile);
}
