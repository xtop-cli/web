import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import DocsShell, { type SidebarGroup } from "@/components/docs-shell";
import DocsTopSearch from "@/components/docs-top-search";
import {
  DOC_ROOT,
  docsHref,
  getIndex,
  resolveDoc,
  renderMarkdown,
  type DocLocale,
  type DocFile,
} from "@/lib/docs";
import { REPOS, GITHUB_ORG } from "@/lib/repos";

const UI = {
  en: {
    hubTitle: "Documentation",
    hubDescription: "Index of all xtop-cli documentation, mirrored from the ecosystem repositories.",
    empty: "No results",
    source: "Source:",
    mirrored: "Mirrored from the xtop-cli repositories · MIT",
    allDocs: "All docs →",
    docs: "Docs",
  },
  es: {
    hubTitle: "Documentación",
    hubDescription:
      "Índice de toda la documentación de xtop-cli, espejada desde los repositorios del ecosistema.",
    empty: "Sin resultados",
    source: "Fuente:",
    mirrored: "Espejo de los repositorios xtop-cli · MIT",
    allDocs: "Todos los docs →",
    docs: "Docs",
  },
};

function strip(source: string): string {
  return source
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[#>*_~[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function staticParamsFor(locale: DocLocale): { slug: string[] }[] {
  const { index } = getIndex(locale);
  return [
    { slug: [] },
    ...index.repos.flatMap((r) => r.files.map((f) => ({ slug: f.slug }))),
  ];
}

export function metaFor(
  locale: DocLocale,
  slug: string[],
  canonicalOverride?: string
): Metadata {
  const ui = UI[locale];
  if (slug.length === 0) {
    return {
      title: ui.hubTitle,
      description: ui.hubDescription,
      alternates: { canonical: canonicalOverride },
    };
  }
  const resolved = resolveDoc(locale, slug);
  if (!resolved) return { title: ui.empty };
  return {
    title: resolved.file.title,
    description: strip(resolved.source).slice(0, 200),
    alternates: { canonical: canonicalOverride },
  };
}

function sidebar(locale: DocLocale): SidebarGroup[] {
  const { index } = getIndex(locale);
  return index.repos.map((r) => ({
    repo: r.repo,
    href: docsHref(locale, [r.repo]),
    count: r.files.length,
    files: r.files.map((f) => ({
      href: docsHref(locale, f.slug),
      title: f.title,
      pathInRepo: f.pathInRepo,
    })),
  }));
}

export default function DocView({ locale, slug }: { locale: DocLocale; slug: string[] }) {
  const ui = UI[locale];
  const groups = sidebar(locale);
  const { index } = getIndex(locale);

  /* ---------------- hub ---------------- */
  if (slug.length === 0) {
    const homeMd = readFileSync(path.join(DOC_ROOT(locale), "_home.md"), "utf8");
    const pseudo: DocFile = {
      repo: "home",
      repoDisplay: "Xtop",
      role: "docs",
      pathInRepo: "_home.md",
      slug: [],
      title: ui.hubTitle,
      label: ui.hubTitle,
      kind: "root",
    };
    const homeHtml = renderMarkdown(homeMd, pseudo, locale);

    return (
      <DocsShell groups={groups} activeHref={null}>
        <DocsTopSearch locale={locale} />
        <article className="doc-article">
          <div className="prose" dangerouslySetInnerHTML={{ __html: homeHtml }} />
          <div className="docs-hub-grid" style={{ marginTop: "2rem" }}>
            {REPOS.map((r) => {
              const rd = index.repos.find((x) => x.repo === r.key);
              const docHrefLocal = docsHref(locale, [r.key]);
              return (
                <div className="docs-hub-card" key={r.key}>
                  <h3>
                    <a href={docHrefLocal} style={{ color: "inherit", textDecoration: "none" }}>
                      {r.display}
                    </a>
                  </h3>
                  <p>{r.description[locale]}</p>
                  <div className="docs-hub-files">
                    {rd?.files.slice(0, 4).map((f) => (
                      <a key={f.slug.join("/")} href={docsHref(locale, f.slug)}>
                        {f.label}
                      </a>
                    ))}
                  </div>
                  <p style={{ marginTop: "0.8rem" }}>
                    <a href={`${GITHUB_ORG}/${r.name}`} target="_blank" rel="noopener noreferrer">
                      github.com/xtop-cli/{r.name} →
                    </a>
                  </p>
                  <p style={{ color: "var(--faint)", fontSize: "0.78rem", marginTop: "0.4rem" }}>
                    {rd?.files.length ?? 0} docs
                  </p>
                </div>
              );
            })}
          </div>
        </article>
      </DocsShell>
    );
  }

  /* ---------------- single doc ---------------- */
  const resolved = resolveDoc(locale, slug);
  if (!resolved) return null; // 404 handled by the route
  const { file, html } = resolved;
  const activeHref = docsHref(locale, file.slug);

  const repoMeta = REPOS.find((r) => r.key === file.repo);
  const blobHref = `${GITHUB_ORG}/${file.repo}/blob/main/${file.pathInRepo}`;

  const repoGroup = index.repos.find((r) => r.repo === file.repo);
  const flat = repoGroup?.files ?? [];
  const at = flat.findIndex((f) => f.slug.join("/") === slug.join("/"));
  const prev = at > 0 ? flat[at - 1] : null;
  const next = at >= 0 && at < flat.length - 1 ? flat[at + 1] : null;

  return (
    <DocsShell groups={groups} activeHref={activeHref}>
      <DocsTopSearch locale={locale} />
      <article className="doc-article">
        <header className="doc-head">
          <div className="doc-breadcrumb">
            <a href={docsHref(locale, [])}>Docs</a>
            <span aria-hidden="true">/</span>
            <a href={docsHref(locale, [file.repo])}>{file.repo}</a>
            {file.pathInRepo !== "README.md" && (
              <>
                <span aria-hidden="true">/</span>
                <span>{file.label}</span>
              </>
            )}
          </div>

          <div className="doc-tools">
            <span className="badge badge-accent">
              <span className="badge-dot" />
              {repoMeta ? repoMeta.role : file.role}
            </span>
            <a className="badge badge-neutral" href={blobHref} target="_blank" rel="noopener noreferrer">
              {file.pathInRepo} ↗
            </a>
            <span className="badge badge-neutral">repo: xtop-cli/{file.repo}</span>
          </div>
        </header>

        <div lang={locale} className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {(prev || next) && (
          <nav className="doc-meta" aria-label="Continue reading">
            {prev && (
              <a href={docsHref(locale, prev.slug)} className="doc-back">
                ← {prev.title}
              </a>
            )}
            {next && (
              <a
                href={docsHref(locale, next.slug)}
                className="doc-back"
                style={{ marginLeft: "auto" }}
              >
                {next.title} →
              </a>
            )}
          </nav>
        )}

        <footer className="doc-meta">
          <span>
            {ui.source} {file.pathInRepo}
          </span>
          <span aria-hidden="true">·</span>
          <span>{ui.mirrored}</span>
          <span style={{ marginLeft: "auto" }}>
            <a href={docsHref(locale, [])}>{ui.allDocs}</a>
          </span>
        </footer>
      </article>
    </DocsShell>
  );
}

