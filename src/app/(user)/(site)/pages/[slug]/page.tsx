import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ContentPage } from "@/features/user/content/components/content-page";
import { isApiError } from "@/services/http/api-error";
import { getContentPage, getHomeContent } from "@/services/user/content.service";

/** Edits and newly published pages appear within a minute, without a deploy. */
export const revalidate = 60;

/**
 * One request per visit, shared by the metadata and the page. A 404 (no published
 * page with this slug, e.g. unpublished) shows the site's not-found page; any
 * other failure reaches error.tsx rather than inventing content.
 */
const loadPage = cache(async (slug: string) => {
  try {
    return await getContentPage(slug);
  } catch (error) {
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }
});

/** The published pages (GET /content/home `pages`) are prepared ahead; others on first visit. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    return (await getHomeContent()).pages.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  return {
    title: page.title,
    ...(page.summary ? { description: page.summary } : {}),
    alternates: { canonical: `/pages/${encodeURIComponent(page.slug)}` },
  };
}

export default async function ContentPageRoute({ params }: PageProps<"/pages/[slug]">) {
  const { slug } = await params;
  return <ContentPage page={await loadPage(slug)} />;
}
