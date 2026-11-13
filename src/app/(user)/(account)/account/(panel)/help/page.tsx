import type { Metadata } from "next";

import { AccountHelp } from "@/features/user/account/components/account-help";

export const metadata: Metadata = { title: "Help & support" };

export default async function AccountHelpPage({ searchParams }: PageProps<"/account/help">) {
  const { booking } = await searchParams;

  return <AccountHelp bookingRef={typeof booking === "string" ? booking : undefined} />;
}
