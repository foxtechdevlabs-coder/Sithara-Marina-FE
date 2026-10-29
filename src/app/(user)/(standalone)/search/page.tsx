import type { Metadata } from "next";

import SearchFilter from "@/components/user/SearchFilter";
import { DEFAULT_FILTERS, hasSearchParams, parseFilters } from "@/components/user/yacht-search";

export const metadata: Metadata = { title: "Find your yacht" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  // Keep the visitor's selections (e.g. from the home search bar); otherwise start from the defaults.
  const initialFilters = hasSearchParams(params) ? parseFilters(params) : DEFAULT_FILTERS;
  return <SearchFilter initialFilters={initialFilters} />;
}
