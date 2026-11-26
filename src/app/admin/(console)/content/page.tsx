import type { Metadata } from "next";

import { ContentList } from "@/features/admin/content/components/content-list";
import { isContentTab } from "@/features/admin/content/utils/content-format";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const q = await searchParams;
  const tab = typeof q.tab === "string" && isContentTab(q.tab) ? q.tab : "banners";
  return (
    <ContentList
      key={tab}
      initialKind={tab}
      notice={typeof q.notice === "string" ? q.notice : undefined}
    />
  );
}
