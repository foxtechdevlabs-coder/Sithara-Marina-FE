import type { Metadata } from "next";

import { HelpMessageSent } from "@/features/user/account/components/help-message-sent";

export const metadata: Metadata = { title: "Message received" };

export default async function HelpMessageSentPage({
  searchParams,
}: PageProps<"/account/help/sent">) {
  const { ref } = await searchParams;

  return <HelpMessageSent reference={typeof ref === "string" ? ref : ""} />;
}
