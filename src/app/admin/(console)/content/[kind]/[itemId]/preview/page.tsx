import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPreview } from "@/features/admin/content/components/content-preview";
import { isContentKind } from "@/features/admin/content/utils/content-format";

export const metadata: Metadata = { title: "Preview content" };

export default async function PreviewContentPage({
  params,
}: PageProps<"/admin/content/[kind]/[itemId]/preview">) {
  const { kind, itemId } = await params;
  if (!isContentKind(kind)) notFound();
  return <ContentPreview kind={kind} itemId={itemId} />;
}
