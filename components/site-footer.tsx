"use client";

import Link from "next/link";
import { REPOS, XSCRIPTOR } from "@/lib/repos";
import { asset, ASSET_PREFIX } from "@/lib/asset";
import { useLocale } from "./use-locale";
import { COPY } from "@/lib/i18n";

const P = ASSET_PREFIX;
const doc = (loc: "es" | "en", slug: string) => `${P}/docs/${loc}/${slug}/`;

export default function SiteFooter() {
  const loc = useLocale();
  const c = COPY[loc];
  const homeHref = loc === "es" ? `${P}/` : `${P}/en/`;
  const repoSite = (key: string) => `${P}/docs/${loc === "es" ? "es" : "en"}/${key}/`;

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link className="brand" href={homeHref}>
                <span className="brand-logo shadow-br">
                  <img className="theme-dark-only" src={`${asset("/img/logo-dark.png")}`} alt="" width={30} height={30} />
                  <img className="theme-light-only" src={`${asset("/img/logo.png")}`} alt="" width={30} height={30} />
              </span>
              <span>
                xtop<span className="brand-cursor">_</span>
              </span>
            </Link>
            <p>{c.footer.about}</p>
          </div>

          <div className="footer-col">
            <h4>{c.footer.ecosystem}</h4>
            <ul>
              {REPOS.map((r) => (
                <li key={r.key}>
                  <Link href={repoSite(r.key)}>{r.display}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>{c.footer.docs}</h4>
            <ul>
              <li><Link href={doc(loc, "xtop/docs/installation")}>{c.footer.quick.installation}</Link></li>
              <li><Link href={doc(loc, "xtop/docs/usage")}>{c.footer.quick.usage}</Link></li>
              <li><Link href={doc(loc, "xtop/docs/configuration")}>{c.footer.quick.configuration}</Link></li>
              <li><Link href={doc(loc, "xtop/docs/colors")}>{c.footer.quick.colors}</Link></li>
              <li><Link href={doc(loc, "xtop/ROADMAP")}>{c.footer.quick.roadmap}</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{c.footer.resources}</h4>
            <ul>
              <li><a href="https://github.com/xtop-cli" target="_blank" rel="noopener noreferrer">github.com/xtop-cli</a></li>
              <li><a href={XSCRIPTOR.colors} target="_blank" rel="noopener noreferrer">xscriptor-colors/assets</a></li>
              <li><a href={XSCRIPTOR.dev} target="_blank" rel="noopener noreferrer">xscriptor.io</a></li>
              <li><a href={XSCRIPTOR.github} target="_blank" rel="noopener noreferrer">github.com/xscriptor</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{c.footer.license}</span>
          <span>
            {c.footer.themeNote}{" "}
            <a href={XSCRIPTOR.colors} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>
              xscriptor-colors
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
