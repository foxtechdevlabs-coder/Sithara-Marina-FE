import type { Metadata } from "next";

import { ContentList } from "@/features/admin/content/components/content-list";
import { isContentKind } from "@/features/admin/content/utils/content-format";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const q = await searchParams;
  const tab = typeof q.tab === "string" && isContentKind(q.tab) ? q.tab : "banners";
  return (
    <ContentList
      key={tab}
      initialKind={tab}
      notice={typeof q.notice === "string" ? q.notice : undefined}
    />
  );
}
