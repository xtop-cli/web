"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchDocs, highlight } from "@/lib/search";
import { type Locale } from "@/lib/i18n";

/** Prominent full-text search with a magnifier icon. Lives at the top of the
 *  docs column (visible on every viewport); results filter as you type. */
export default function DocsTopSearch({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const raw = query.trim();
  const hits = useMemo(
    () => (raw.length >= 2 ? searchDocs(raw, locale) : []),
    [raw, locale]
  );

  const terms = useMemo(
    () =>
      Array.from(
        new Set(
          raw
            .toLowerCase()
            .split(/\s+/)
            .map((t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
            .filter((t) => t.length >= 2)
        )
      ),
    [raw]
  );

  const open = focused && raw.length >= 2;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocused(false);
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setFocused(true);
        const input = boxRef.current?.querySelector<HTMLInputElement>("input");
        input?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="docs-top-search" ref={boxRef}>
      <div className={open ? "docs-top-search-input is-open" : "docs-top-search-input"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder={locale === "es" ? "Buscar en los docs…" : "Search the docs…"}
          aria-label={locale === "es" ? "Buscar en la documentación" : "Search documentation content"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits.length > 0) window.location.href = hits[0].href;
          }}
        />
        {query && (
          <button
            type="button"
            className="docs-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setFocused(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
        <kbd className="docs-search-slash">/</kbd>
      </div>

      {open && (
        <div className="docs-search-panel">
          {hits.length > 0 ? (
            <>
              <p className="docs-search-count">
                {hits.length} {locale === "es" ? "resultados" : "results"} for “{raw}”
              </p>
              {hits.slice(0, 8).map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="docs-search-item"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="docs-search-item-head">
                    <span className="docs-search-item-title">{r.title}</span>
                    <span className="nav-file">
                      {r.repo}/{r.path}
                    </span>
                  </span>
                  <span className="docs-search-item-snippet">{highlight(r.snippet, terms)}</span>
                </Link>
              ))}
              {hits.length > 8 && (
                <p className="docs-search-more">
                  {locale === "es"
                    ? "Mostrando 8 de"
                    : "Showing 8 of"}{" "}
                  {hits.length}…
                </p>
              )}
            </>
          ) : (
            <p className="docs-search-empty">
              {locale === "es"
                ? "Sin resultados para"
                : "No matches for"}{" "}
              “{raw}”
            </p>
          )}
        </div>
      )}
    </div>
  );
}
