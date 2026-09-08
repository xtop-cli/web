"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localeFromPath, type Locale } from "@/lib/i18n";

/** Resolves the site locale from the URL (after hydration) and keeps
 *  `document.documentElement.lang` in sync. Defaults to Spanish. */
export function useLocale(): Locale {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale | null>(null);

  useEffect(() => {
    const loc = localeFromPath(pathname);
    setLocale(loc);
    document.documentElement.lang = loc === "en" ? "en" : "es";
  }, [pathname]);

  return locale ?? localeFromPath(pathname) ?? "es";
}
