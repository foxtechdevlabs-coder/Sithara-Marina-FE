import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentEditor } from "@/features/admin/content/components/content-editor";
import { isContentKind } from "@/features/admin/content/utils/content-format";

export const metadata: Metadata = { title: "Edit content" };

export default async function EditContentPage({
  params,
}: PageProps<"/admin/content/[kind]/[itemId]">) {
  const { kind, itemId } = await params;
  if (!isContentKind(kind)) notFound();
  return <ContentEditor key={`${kind}:${itemId}`} kind={kind} itemId={itemId} />;
}
