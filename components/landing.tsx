import Link from "next/link";
import React from "react";
import { PALETTES, PALETTE_ROLES } from "@/lib/palettes";
import { REPOS, GITHUB_ORG } from "@/lib/repos";
import { ASSET_PREFIX, asset } from "@/lib/asset";
import { COPY, type Locale } from "@/lib/i18n";

const P = ASSET_PREFIX;

const PREVIEW_H = [650, 650, 650, 650, 650, 650, 563, 563];

/* Mosaic row sizes: 1 full, 2 halves, 1 full, 1 full, 3 thirds; trailing
   incomplete rows widen to span the full grid width. */
const ROW_SIZES = [1, 2, 1, 1, 3];

function mosaicSpans(count: number): number[] {
  const spans: number[] = [];
  let i = 0;
  let row = 0;
  while (i < count) {
    const want = ROW_SIZES[row % ROW_SIZES.length];
    const take = Math.min(want, count - i);
    for (let j = 0; j < take; j++) spans.push(6 / take);
    i += take;
    row++;
  }
  return spans;
}

/* Minimal inline markup parser: `code`, **bold**, [label](url) */
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g;

/** Maps a hand-written "/docs/…" link onto the current locale (es | en). */
function docsify(href: string, docsBase: string): string {
  const clean = href.replace(/^\/docs\/(?:es|en)\//, "/docs/").replace(/^\/docs\//, "");
  return clean ? `${docsBase}/${clean}/` : `${docsBase}/`;
}

function rich(text: string, keyPrefix: string, docsBase: string) {
  const parts = text.split(TOKEN);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i}>{part.slice(1, -1)}</code>;
    const m = /^\[([^\]]+)\]\(([^)]*)\)$/.exec(part);
    if (m) {
      let href = m[2];
      if (href.startsWith("/docs/")) href = docsify(href, docsBase);
      const external = href.startsWith("http");
      return (
        <a key={i} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[1]}
        </a>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

function CodePanel({ head, hint, code }: { head: string; hint: string; code: string }) {
  return (
    <div className="install-panel">
      <div className="code-panel shadow-accent">
        <div className="install-head">
          <span style={{ color: "var(--code-accent)", fontWeight: 700 }}>$</span>
          <span style={{ color: "var(--code-fg)", fontWeight: 700, fontSize: "0.8rem" }}>{head}</span>
          <span className="os">{hint}</span>
        </div>
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
}

export default function Landing({ lang }: { lang: Locale }) {
  const c = COPY[lang];
  const docsBase = `${P}/docs/${lang === "es" ? "es" : "en"}`;
  const previewSpans = mosaicSpans(c.screenshots.items.length);

  const siteThemeSuffix = (name: string) =>
    name === "X"
      ? ` · ${c.palettes.siteDark}`
      : name === "Madrid"
        ? ` · ${c.palettes.siteLight}`
        : "";

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="kicker">{c.hero.kicker}</p>
            <h1>
              {c.hero.title[0]}
              <span className="hl">{c.hero.title[1]}</span>
              {c.hero.title[2]}
              <span className="hl-2">{c.hero.title[3]}</span>
              {c.hero.title[4]}
            </h1>
            <p className="lede">{rich(c.hero.lede, "lede", docsBase)}</p>
            <div className="hero-cta">
              <a className="btn" href="#instalar">
                {c.hero.ctaInstall}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </a>
              <Link className="btn btn-ghost" href={`${docsBase}/`}>
                {c.hero.ctaDocs}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="hero-badges">
              {c.badges.map((b, i) => (
                <span className="badge badge-neutral" key={b}>
                  <span className="badge-dot" style={{ color: ["var(--warn)", "var(--rx)", "var(--good)", "var(--tx)"][i % 4] || "var(--accent)" }} />
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-term">
            <div className="term">
              <div className="term-bar">
                <span className="term-dot term-dot-r" />
                <span className="term-dot term-dot-y" />
                <span className="term-dot term-dot-g" />
                <span className="term-title">xtop — dashboard (theme: X)</span>
              </div>
              <div className="term-body" aria-hidden="true">
                <div className="term-line"><span className="prompt">xtop</span></div>
                <div className="term-line">
                  <span className="t-dim">uptime</span>
                  <span>1h 23m</span>
                  <span className="t-dim">cpu</span>
                  <span className="t-accent">14.6%</span>
                  <span className="t-dim">mem</span>
                  <span>6.1 / 15.6 GB</span>
                </div>
                <div className="term-line">
                  <span className="t-tx">CPU</span>
                  <span className="t-good">█▇▅▂▇▅▄▂</span>
                  <span className="t-dim">max 52°C</span>
                </div>
                <div className="term-line">
                  <span className="t-rx">Memory</span>
                  <span className="t-warn">███████▌░░░</span>
                  <span className="t-dim">swap 1.2/2 GB</span>
                </div>
                <div className="term-line">
                  <span className="t-accent">Network</span>
                  <span className="t-rx">↓ 1.2 MB/s</span>
                  <span className="t-tx">↑ 340 kB/s</span>
                  <span className="t-dim">eth0</span>
                </div>
                <div className="term-line">
                  <span className="t-accent">Processes</span>
                  <span className="t-dim">sort: CPU% ▼</span>
                </div>
                <div className="term-line">
                  <span className="t-dim"> PID    NAME              CPU%   MEM  USER</span>
                </div>
                <div className="term-line">
                  <span className="t-warn">▸ 4821  rust-analyzer     12.4   840M x</span>
                </div>
                <div className="term-line">
                  <span className="t-dim">  3910  code               8.1   1.2G x</span>
                </div>
                <div className="term-line">
                  <span className="t-dim">  2731  firefox            6.9   2.3G x</span>
                </div>
                <div className="term-line">
                  <span className="t-alert">/ search_</span>
                  <span className="caret">▊</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="stats-band">
            {c.stats.map((s) => (
              <div className="stat" key={s.label}>
                <b>
                  {s.n}
                  {s.suffix && <em>{s.suffix}</em>}
                </b>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="kicker">{c.features.kicker}</p>
            <h2>{c.features.title}</h2>
            <p>{rich(c.features.note, "feat-note", docsBase)}</p>
          </div>
          <div className="features-grid">
            {c.features.items.map((f, i) => (
              <div className="feature-card" key={i}>
                <span className="feature-ico" style={{ background: "var(--surface-2)", color: ["var(--good)", "var(--rx)", "var(--tx)", "var(--warn)", "var(--alert)", "var(--accent)"][i % 6], boxShadow: "3px 3px 0 0 var(--shadow)" }}>
                  {["▚", "▞", "⇅", "◫", "⚙", "▦", "◐", "▣", "◈", "▓"][i]}
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <div className="feat-tags">
                  {f.tags.map((t) => (
                    <span className="badge badge-neutral" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SCREENSHOTS ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <p className="kicker">{c.screenshots.kicker}</p>
            <h2>{c.screenshots.title}</h2>
            <p>{rich(c.screenshots.note, "shots-note", docsBase)}</p>
          </div>
          <div className="previews-grid">
            {c.screenshots.items.map((p, i) => {
              const file = `preview${i + 1}`;
              const span = previewSpans[i];
              return (
                <figure className={`preview-card span-${span}`} key={file}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset(`/img/previews/${file}.webp`)}
                    alt={`xtop screenshot — ${p.cap}`}
                    loading="lazy"
                    width={1000}
                    height={PREVIEW_H[i] ?? 650}
                  />
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PALETTES ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <p className="kicker">{c.palettes.kicker}</p>
            <h2>{c.palettes.title}</h2>
            <p>{rich(c.palettes.note, "pal-note", docsBase)}</p>
          </div>
          <div className="palette-scroller">
            {PALETTES.map((pal) => {
              const darkSwatch = ["London", "Madrid", "Helsinki"].includes(pal.name);
              return (
                <div className="palette-card" key={pal.name}>
                  <div className="palette-card-head">
                    <h3>{pal.name}</h3>
                    <span className="sw">
                      {pal.bg} / {pal.fg}
                      {siteThemeSuffix(pal.name)}
                    </span>
                  </div>
                  <div
                    className="swatch swatch-bg shadow-br"
                    style={{ background: pal.bg, marginBottom: "6px", minHeight: "22px" }}
                    title={`background ${pal.bg}`}
                  />
                  <div className="swatches">
                    {pal.colors.map((col, j) => (
                      <span
                        key={j}
                        className="swatch"
                        style={{ background: col, boxShadow: `2px 2px 0 0 ${darkSwatch ? "rgba(0,0,0,.15)" : "rgba(0,0,0,.25)"}` }}
                        title={`slot ${j} · ${PALETTE_ROLES[j]} · ${col}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: "1.2rem", color: "var(--muted)", fontSize: "0.85rem" }}>
            {rich(c.palettes.reference, "pal-ref", docsBase)}
          </p>
        </div>
      </section>

      {/* ============ ECOSYSTEM ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <p className="kicker">{c.ecosystem.kicker}</p>
            <h2>{c.ecosystem.title}</h2>
            <p>{rich(c.ecosystem.note, "eco-note", docsBase)}</p>
          </div>
          <div className="ecosystem-grid">
            {REPOS.map((r) => (
              <Link className="repo-card" key={r.key} href={`${docsBase}/${r.key}/`}>
                <div className="row">
                  <h3><code>{r.display.toLowerCase()}</code></h3>
                  <span className="role">{r.role}</span>
                </div>
                <p>{r.description[lang]}</p>
                <div className="meta-row">
                  <span className="badge badge-neutral">{r.kind}</span>
                  {r.features.slice(0, 2).map((f) => (
                    <span className="badge badge-neutral" key={f}>{f}</span>
                  ))}
                  <span className="arrow" aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INSTALL ============ */}
      <section className="section" id="instalar" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <p className="kicker">{c.install.kicker}</p>
            <h2>{c.install.title}</h2>
            <p>{rich(c.install.note, "install-note", docsBase)}</p>
          </div>
          <div className="install-grid">
            {c.install.panels.map((p) => (
              <CodePanel key={p.head} head={p.head} hint={p.hint} code={p.code} />
            ))}
          </div>
          <div className="grid-2" style={{ marginTop: "1.6rem" }}>
            {c.install.notes.map((n, i) => (
              <div className="note-card shadow-bl" key={n.title}>
                <h3>
                  <span style={{ color: i === 0 ? "var(--good)" : "var(--warn)" }}>{i === 0 ? "▲" : "●"}</span>{" "}
                  {n.title}
                </h3>
                <p>{rich(n.body, `note-${i}`, docsBase)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ KEYS ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <p className="kicker">{c.keys.kicker}</p>
            <h2>{c.keys.title}</h2>
            <p>{rich(c.keys.note, "keys-note", docsBase)}</p>
          </div>
          <div className="keys-grid">
            {c.keys.rows.map((row) => (
              <div className="key-row" key={row.what}>
                <span className="what">{row.what}</span>
                <span>
                  {row.k.split(" / ").map((k) => (
                    <kbd key={k} style={{ marginRight: "0.25rem" }}>{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="note-card shadow-accent" style={{ padding: "clamp(1.6rem,4vw,2.6rem)", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 0.6rem", fontSize: "clamp(1.4rem,3vw,2rem)", letterSpacing: "-0.02em" }}>
              {c.cta.title}
            </h2>
            <p style={{ color: "var(--muted)", maxWidth: "620px", margin: "0 auto 1.4rem" }}>
              {rich(c.cta.body, "cta", docsBase)}
            </p>
            <div style={{ display: "flex", gap: "0.9rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a className="btn" href={GITHUB_ORG} target="_blank" rel="noopener noreferrer">
                {c.cta.github}
              </a>
              <Link className="btn btn-ghost" href={`${docsBase}/`}>
                {c.cta.docs}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
