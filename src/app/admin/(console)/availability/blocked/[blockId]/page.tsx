import type { Metadata } from "next";

import { EditBlock } from "@/features/admin/availability/components/block-form";

export const metadata: Metadata = { title: "Edit availability block" };

export default async function EditBlockPage({
  params,
}: PageProps<"/admin/availability/blocked/[blockId]">) {
  const { blockId } = await params;
  return <EditBlock key={blockId} blockId={blockId} />;
}
