import type { Metadata } from "next";

import { EmailChange } from "@/features/user/profile/components/email-change";

export const metadata: Metadata = { title: "Change email address" };

/** `?email=` when Profile details already sent a code to that new address. */
export default async function ChangeEmailPage({
  searchParams,
}: PageProps<"/account/profile/email">) {
  const { email } = await searchParams;

  return <EmailChange sentTo={typeof email === "string" && email ? email : undefined} />;
}
