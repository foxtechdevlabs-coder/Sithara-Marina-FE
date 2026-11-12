import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentEditor } from "@/features/admin/content/components/content-editor";
import { isContentKind } from "@/features/admin/content/utils/content-format";

export const metadata: Metadata = { title: "New content" };

export default async function NewContentPage({ params }: PageProps<"/admin/content/[kind]/new">) {
  const { kind } = await params;
  if (!isContentKind(kind)) notFound();
  return <ContentEditor key={kind} kind={kind} />;
}
