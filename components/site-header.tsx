"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useLocale } from "./use-locale";
import { COPY, type Locale, stripSubPath } from "@/lib/i18n";
import { asset, ASSET_PREFIX } from "@/lib/asset";

const P = ASSET_PREFIX;

/** href of the same logical page in the *other* language:
 *  / ↔ /en/  ·  /docs/… ↔ /docs/es/… */
function swapPath(pathname: string | null, to: Locale): string {
  const p = stripSubPath(pathname);
  const rest = (s: string) => (s ? `${s}/` : "/");
  if (to === "es") {
    if (p.startsWith("/en/")) return `${P}/`;
    if (p.startsWith("/en")) return `${P}/`;
    if (p.startsWith("/docs/en/")) return `${P}/docs/es/${p.slice("/docs/en/".length)}`;
    if (p.startsWith("/docs/en")) return `${P}/docs/es/`;
    if (p.startsWith("/docs/")) return `${P}/docs/es/${rest(p.slice("/docs/".length))}`;
    return `${P}/`;
  }
  // to === "en"
  if (p === "/" || p === "") return `${P}/en/`;
  if (p.startsWith("/docs/es/")) return `${P}/docs/en/${p.slice("/docs/es/".length)}`;
  if (p.startsWith("/docs/es")) return `${P}/docs/en/`;
  if (p.startsWith("/docs/")) return `${P}/docs/en/${rest(p.slice("/docs/".length))}`;
  return `${P}/en/`;
}

export default function SiteHeader({ current }: { current?: "home" | "docs" }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const loc = useLocale();
  const c = COPY[loc];
  const pathname = usePathname();

  const homeHref = loc === "es" ? `${P}/` : `${P}/en/`;
  const docsHref = loc === "es" ? `${P}/docs/es/` : `${P}/docs/en/`;
  const other: Locale = loc === "es" ? "en" : "es";
  const path = stripSubPath(pathname ?? "/");
  // Anchor of each language points to the same logical page in that language
  // (self when it is already the active one).
  const esHref = loc === "es" ? `${P}${path}` : swapPath(path, "es");
  const enHref = loc === "en" ? `${P}${path}` : swapPath(path, "en");

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href={homeHref} onClick={close} aria-label="Xtop — home">
          <span className="brand-avatar shadow-br">
            <img className="theme-dark-only" src={`${asset("/img/avatar-dark.png")}`} alt="" width={30} height={30} />
            <img className="theme-light-only" src={`${asset("/img/avatar.png")}`} alt="" width={30} height={30} />
          </span>
          <span>
            xtop<span className="brand-cursor">_</span>
          </span>
        </Link>

        <nav className={open ? "nav is-open" : "nav"} aria-label="Main">
          <Link
            className="nav-link"
            href={homeHref}
            aria-current={current === "home" ? "page" : undefined}
            onClick={close}
          >
            {c.header.home}
          </Link>
          <Link
            className="nav-link"
            href={docsHref}
            aria-current={current === "docs" ? "page" : undefined}
            onClick={close}
          >
            {c.header.docs}<span className="go">→</span>
          </Link>
          <Link
            className="nav-link"
            href="https://github.com/xtop-cli"
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            {c.header.github}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </Link>

          <div className="header-actions">
            <div className="lang-toggle" role="group" aria-label="Language">
              <Link
                href={esHref}
                className={loc === "es" ? "is-active" : ""}
                aria-current={loc === "es" ? "page" : undefined}
                aria-label="Español"
                onClick={close}
              >
                ES
              </Link>
              <Link
                href={enHref}
                className={loc === "en" ? "is-active" : ""}
                aria-current={loc === "en" ? "page" : undefined}
                aria-label="English"
                onClick={close}
              >
                EN
              </Link>
            </div>
            <ThemeToggle />
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
