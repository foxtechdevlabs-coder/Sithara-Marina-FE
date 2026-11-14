import type { Metadata } from "next";

import { TemplateEditor } from "@/features/admin/notifications/components/template-editor";

export const metadata: Metadata = { title: "Email template" };

export default async function TemplatePage({
  params,
}: PageProps<"/admin/notifications/templates/[key]">) {
  const { key } = await params;
  return <TemplateEditor key={key} templateKey={key} />;
}
