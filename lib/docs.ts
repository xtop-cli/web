import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { REPOS, GITHUB_ORG } from "./repos";
import { ASSET_PREFIX, asset } from "./asset";

export { ASSET_PREFIX, asset };

export type DocLocale = "en" | "es";

/** English mirror (canonical, copied from the repos) and Spanish mirror
 *  (translated) live in separate trees. */
export const DOC_ROOT = (locale: DocLocale): string =>
  path.join(process.cwd(), locale === "en" ? "docs" : "i18n/es/docs");

/** /docs/en/… and /docs/es/…; the legacy /docs/… routes render English. */
export const docsHref = (locale: DocLocale, slug: string[]): string =>
  `${ASSET_PREFIX}/docs/${locale}/${slug.join("/")}/`;

export interface DocFile {
  repo: string;
  repoDisplay: string;
  role: string;
  pathInRepo: string; // relative to the repo root, e.g. "docs/usage.md"
  slug: string[]; // url path segments under /docs/<locale>/
  title: string;
  label: string;
  kind: "root" | "docs" | "extra" | "nested";
}

export interface RepoDocs {
  repo: string;
  display: string;
  role: string;
  files: DocFile[];
}

export interface DocIndex {
  repos: RepoDocs[];
  total: number;
}

const ROOT_ORDER = ["README.md", "ROADMAP.md", "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE"];

// Curated, meaningful order per repo — mirrors each repo's own doc index.
const CURATED: Record<string, string[]> = {
  xtop: [
    "README.md",
    "docs/features.md",
    "docs/installation.md",
    "docs/usage.md",
    "docs/configuration.md",
    "docs/customization.md",
    "docs/colors.md",
    "docs/plugin.md",
    "docs/multi-repo.md",
    "docs/design.md",
    "ROADMAP.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
  ],
  api: [
    "README.md",
    "docs/architecture.md",
    "docs/data-model.md",
    "docs/plugin-contract.md",
    "docs/widget-contract.md",
    "docs/extension-contract.md",
    "docs/effect-contract.md",
    "docs/changes.md",
  ],
  widgets: ["README.md", "docs/widgets.md", "docs/authoring.md", "custom/README.md"],
  layouts: [
    "README.md",
    "docs/layout-schema.md",
    "docs/authoring.md",
    "docs/decisions.md",
    "custom/README.md",
  ],
  plugins: ["README.md", "xtop-plugin-samurai/README.md", "docs/architecture.md", "docs/rules.md"],
  extensions: [
    "README.md",
    "xtop-extension-mcp/README.md",
    "docs/architecture.md",
    "docs/mcp-protocol.md",
  ],
  effects: ["README.md", "docs/effects.md", "docs/write-effect.md"],
};

function walk(dir: string, base: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else if (name.endsWith(".md")) out.push(path.relative(base, full));
  }
  return out;
}

export function titleFromSource(source: string): string | null {
  const htmlH1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(source);
  const mdH1 = /^\s*#\s+(.+)$/m.exec(source);
  const raw = htmlH1 ? htmlH1[1] : mdH1 ? mdH1[1] : null;
  if (!raw) return null;
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function smartTitle(name: string, repoDisplay: string): string {
  if (name === "README") return repoDisplay;
  return name
    .split(/[-_]/)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function slugFor(repo: string, pathInRepo: string): string[] {
  const dir = path.posix.dirname(pathInRepo);
  const base = path.posix.basename(pathInRepo);
  const dirSegs = dir === "." ? [] : dir.split("/");
  if (base === "README.md") return [repo, ...dirSegs];
  return [repo, ...dirSegs, base.replace(/\.md$/, "")];
}

/** Build the full index of a locale's mirrored markdown files (build time). */
export function buildIndex(locale: DocLocale): DocIndex {
  const root = DOC_ROOT(locale);
  const all = walk(root, root, []);

  const repos = REPOS.map((repoMeta) => {
    const prefix = `${repoMeta.key}/`;
    const files = all.filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length));
    const curated = CURATED[repoMeta.key] ?? [];

    const ranked = files.sort((a, b) => {
      const ia = curated.indexOf(a);
      const ib = curated.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      const grade = (p: string) => (p === "README.md" ? 0 : p.startsWith("docs/") ? 1 : 2);
      if (grade(a) !== grade(b)) return grade(a) - grade(b);
      return a < b ? -1 : a > b ? 1 : 0;
    });

    const fileMetas: DocFile[] = ranked.map((rel) => {
      const full = path.join(root, repoMeta.key, rel);
      const source = readFileSync(full, "utf8");
      const base = path.posix.basename(rel);
      const dir = path.posix.dirname(rel);
      const label =
        base === "README.md"
          ? dir === "."
            ? repoMeta.display
            : smartTitle(path.posix.basename(dir), repoMeta.display)
          : smartTitle(base.replace(/\.md$/, ""), repoMeta.display);
      return {
        repo: repoMeta.key,
        repoDisplay: repoMeta.display,
        role: repoMeta.role,
        pathInRepo: rel,
        slug: slugFor(repoMeta.key, rel),
        title: titleFromSource(source) ?? label,
        label,
        kind: base === "README.md" ? (dir === "." ? "root" : "nested") : dir === "." ? "extra" : "docs",
      };
    });

    return { repo: repoMeta.key, display: repoMeta.display, role: repoMeta.role, files: fileMetas };
  });

  return { repos, total: repos.reduce((n, r) => n + r.files.length, 0) };
}

let cache: {
  en: { index: DocIndex; byPath: Map<string, DocFile> };
  es: { index: DocIndex; byPath: Map<string, DocFile> };
} | undefined;

export function getIndex(
  locale: DocLocale
): { index: DocIndex; byPath: Map<string, DocFile> } {
  if (!cache) cache = { en: load("en"), es: load("es") };
  return cache[locale];
}

function load(locale: DocLocale) {
  const index = buildIndex(locale);
  const byPath = new Map<string, DocFile>();
  for (const repo of index.repos)
    for (const f of repo.files) byPath.set(`${f.repo}/${f.pathInRepo}`, f);
  return { index, byPath };
}

export function resolveDoc(
  locale: DocLocale,
  slug: string[]
): { file: DocFile; source: string; html: string } | null {
  const { byPath } = getIndex(locale);
  const repo = slug[0];
  const dir = slug.slice(1).join("/");
  const candidates = [dir ? `${dir}.md` : "", `${dir ? dir + "/" : ""}README.md`].filter(Boolean);
  let file: DocFile | null = null;
  let rel: string | null = null;
  for (const c of candidates) {
    const hit = byPath.get(`${repo}/${c}`);
    if (hit) {
      file = hit;
      rel = c;
      break;
    }
  }
  if (!file || !rel) return null;
  const source = readFileSync(path.join(DOC_ROOT(locale), repo, rel), "utf8");
  return { file, source, html: renderMarkdown(source, file, locale) };
}

/** Markdown -> styled html, with cross-links and assets re-resolved to the site. */
export function renderMarkdown(source: string, file: DocFile, locale: DocLocale): string {
  const html = marked.parse(source, { gfm: true }) as string;
  const repo = file.repo;
  const dir = path.posix.dirname(file.pathInRepo);
  const byPath = getIndex(locale).byPath;

  const rewriteHref = (href: string): string => {
    const clean = href.replace(/^\.\//, "");
    if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
    if (clean.startsWith("mailto:")) return clean;
    if (clean === "" || clean === "#") return href;
    if (clean.startsWith("/")) {
      if (clean.startsWith("/docs/")) {
        // absolute site links (authored in _home.md etc.)
        const normalized = clean
          .replace(/^\/docs\/(?:en|es)\//, "/docs/")
          .replace(/\/$/, "")
          .replace(/^\/docs\/?/, "");
        const parts = normalized.split("/").filter(Boolean);
        if (parts.length === 0) return `${ASSET_PREFIX}/docs/${locale}/`;
        return docsHref(locale, parts);
      }
      return clean;
    }

    const [target, anchor] = clean.split("#", 2);
    const suffix = anchor !== undefined ? `#${anchor}` : "";
    if (target === "") return suffix || href;

    const joined = path.posix.normalize(path.posix.join(dir, target)).replace(/^\.\.\//, "");
    const resolve = (p: string): string | null => {
      const withMd = p.endsWith(".md") ? p : p.endsWith("/") ? `${p}README.md` : p;
      const hit = byPath.get(`${repo}/${withMd}`);
      if (hit) return docsHref(locale, hit.slug);
      const dirCandidates = [`${withMd}.md`, `${withMd}/README.md`];
      for (const dc of dirCandidates) {
        const hit2 = byPath.get(`${repo}/${dc}`);
        if (hit2) return docsHref(locale, hit2.slug);
      }
      return null;
    };
    const local = resolve(joined);
    if (local) return `${local}${suffix}`;
    return `${GITHUB_ORG}/${repo}/blob/main/${joined}${suffix}`;
  };

  const rewriteImg = (src: string): string => {
    // previews referenced from the kernel README/docs: serve the local file.
    // The local captures live as optimized webp under /img/previews/ sharing
    // the original basenames (previewN), so docs resolve them by name.
    const m = /assets\/previews\/([^"')]+)\.(?:png|jpg|jpeg|gif|webp)$/i.exec(src);
    if (m) return `${asset(`/img/previews/${m[1]}.webp`)}`;
    const mm = /assets\/previews\/([^"')]+)\.(?:png|jpg|jpeg|webp)/i.exec(src);
    if (mm) return `${asset(`/img/previews/${mm[1]}.webp`)}`;
    return src;
  };

  const out = html
    .replace(/href="([^"]*)"/g, (m, h: string) => `href="${rewriteHref(h)}"`)
    .replace(/src="([^"]*)"/g, (m, s: string) => `src="${rewriteImg(s)}"`)
    .replace(/<img /g, '<img loading="lazy" ');

  // wrap tables so wide ones can scroll
  return out.replace(/<table([^>]*)>([\s\S]*?)<\/table>/g, (m, attrs: string, inner: string) => {
    if (inner.includes("<table")) return m;
    return `<div class="table-wrap"><table${attrs}>${inner}</table></div>`;
  });
}
