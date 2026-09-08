import type { Metadata } from "next";
import Landing from "@/components/landing";
import { COPY } from "@/lib/i18n";

export const metadata: Metadata = {
  title: COPY.en.meta.title,
  description: COPY.en.meta.description,
};

export default function Page() {
  return <Landing lang="en" />;
}
