import type { Metadata } from "next";

import SearchFilter from "@/components/user/SearchFilter";
import { parseFilters } from "@/components/user/yacht-search";
import { getYachtFilters } from "@/services/user/yachts.service";

export const metadata: Metadata = { title: "Find your yacht" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  // Without options the page still works, offering only "any" for each filter.
  const options = await getYachtFilters().catch(() => null);
  return <SearchFilter initialFilters={parseFilters(params)} options={options} />;
}
