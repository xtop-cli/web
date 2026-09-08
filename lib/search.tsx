import type { ReactNode } from "react";
import { DOCS_INDEX, type DocHit } from "./search-data";
import { type Locale } from "./i18n";

export const MAX_HITS = 12;

const ASSET = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";

export interface NavHit {
  href: string;
  repo: string;
  path: string;
  title: string;
  snippet: string;
  score: number;
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const ESC = /[.*+?^${}()|[\]\\]/g;

function escRe(s: string): string {
  return s.replace(ESC, "\\$&");
}

/** Window of text around the first match, ≤ 150 chars, word-clipped. */
function snippet(text: string, terms: string[]): string {
  let at = -1;
  for (const t of terms) {
    const i = text.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return text.slice(0, 120) + (text.length > 120 ? "…" : "");
  let start = Math.max(0, at - 45);
  let end = Math.min(text.length, start + 150);
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    start = sp > 0 && sp < at ? sp + 1 : start;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > at) end = sp;
  }
  return (start > 0 ? "…" : "") + text.slice(start, end).trimEnd() + (end < text.length ? "…" : "");
}

/** Render a snippet with <mark> around the folded terms. */
export function highlight(text: string, terms: string[]): ReactNode[] {
  if (terms.length === 0) return [text];
  const re = new RegExp(`(${terms.map(escRe).join("|")})`, "gi");
  return text.split(re).map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="search-mark">
        {p}
      </mark>
    ) : (
      p
    )
  );
}

/**
 * Rank every doc of the given locale by weighted occurrences of the terms.
 * Title + path hits dominate; body hits break ties; title prefix adds bonus.
 */
export function searchDocs(q: string, locale: Locale): NavHit[] {
  const query = fold(q).trim();
  if (query.length < 2) return [];
  const terms = Array.from(new Set(query.split(/\s+/).filter((t) => t.length >= 2)));
  if (terms.length === 0) return [];

  const ranked: { hit: DocHit; score: number }[] = [];
  for (const hit of DOCS_INDEX) {
    if (hit.locale !== locale) continue;
    const body = hit.text;
    const hay = [fold(hit.title), " ", fold(hit.path), " ", fold(hit.label), " ", body].join(" ");
    let score = 0;
    for (const t of terms) {
      const inTitle = fold(hit.title).includes(t);
      const inPath = fold(hit.path).includes(t);
      const inLabel = fold(hit.label).includes(t);
      let count = 0;
      let idx = hay.indexOf(t);
      while (idx !== -1) {
        count++;
        idx = hay.indexOf(t, idx + 1);
      }
      score += (inTitle ? 60 : 0) + (inPath ? 25 : 0) + (inLabel ? 20 : 0) + count;
    }
    if (score > 0) ranked.push({ hit, score });
  }

  ranked.sort((a, b) => b.score - a.score || a.hit.title.length - b.hit.title.length);
  return ranked.slice(0, MAX_HITS).map(({ hit, score }) => ({
    href: `${ASSET}/docs/${locale}/${hit.slug.join("/")}/`,
    repo: hit.repo,
    path: hit.path,
    title: hit.title,
    snippet: snippet(hit.text, terms),
    score,
  }));
}
