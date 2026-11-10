import type { Metadata } from "next";

import { NewBlock } from "@/features/admin/availability/components/block-form";

export const metadata: Metadata = { title: "Block a time" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function NewBlockPage({
  searchParams,
}: PageProps<"/admin/availability/blocked/new">) {
  const q = await searchParams;
  return <NewBlock yacht={one(q.yacht)} date={one(q.date)} />;
}
