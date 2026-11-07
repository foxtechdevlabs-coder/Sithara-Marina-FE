import type { Metadata } from "next";

import { NotFoundExperience } from "@/components/shared/not-found-experience";

export const metadata: Metadata = {
  title: "404 — Page not found",
  description: "The page you requested could not be found.",
};

export default function NotFound() {
  return <NotFoundExperience />;
}
