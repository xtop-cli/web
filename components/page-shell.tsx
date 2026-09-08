"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Remounts a keyed wrapper on every route change so the entrance
 *  animation (.page-enter) plays on navigation, and resets the scroll
 *  position (unless the target is an in-page anchor). */
export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div key={pathname ?? "initial"} className="page-enter">
      {children}
    </div>
  );
}
