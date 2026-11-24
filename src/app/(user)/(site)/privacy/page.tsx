import type { Metadata } from "next";

import { PrivacyPolicy } from "@/features/user/content/components/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Sithara Marina collects, uses and protects your personal information when you enquire, book or create an account.",
  alternates: { canonical: "/privacy" },
};

/** Linked from the footer. The text is a temporary draft until the approved policy arrives. */
export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
