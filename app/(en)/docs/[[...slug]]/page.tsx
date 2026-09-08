import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocView, { staticParamsFor, metaFor } from "@/components/doc-view";
import { docsHref, resolveDoc, type DocLocale } from "@/lib/docs";

type PageProps = { params: Promise<{ slug?: string[] }> };
const LOCALE: DocLocale = "en";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticParamsFor(LOCALE);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  // Legacy alias: point search engines at the canonical /docs/en/… URL.
  const canonical = resolveDoc(LOCALE, slug) ? docsHref(LOCALE, slug) : docsHref(LOCALE, []);
  return metaFor(LOCALE, slug, canonical);
}

export default async function Page({ params }: PageProps) {
  const { slug = [] } = await params;
  if (slug.length > 0 && !resolveDoc(LOCALE, slug)) notFound();
  return <DocView locale={LOCALE} slug={slug} />;
}
