"use client";

import Link from "next/link";
import { useState } from "react";

export interface SidebarFile {
  href: string;
  title: string;
  pathInRepo: string;
}

export interface SidebarGroup {
  repo: string;
  href: string;
  count: number;
  files: SidebarFile[];
}

export default function DocsShell({
  groups,
  activeHref,
  children,
}: {
  groups: SidebarGroup[];
  activeHref: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const list = (
    <>
      {groups.map((g) => (
        <div className="nav-group" key={g.repo}>
          <div className="nav-group-title">
            <Link href={g.href} onClick={close} className="grow">
              <span style={{ color: "var(--accent)" }}>/</span>
              {g.repo}
            </Link>
            <span className="badge badge-neutral">{g.count}</span>
          </div>
          {g.files.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className={activeHref === f.href ? "nav-item is-active" : "nav-item"}
              aria-current={activeHref === f.href ? "page" : undefined}
              onClick={close}
              title={f.pathInRepo}
            >
              <span className="nav-file" aria-hidden="true">
                {f.pathInRepo.endsWith("/README.md") || f.pathInRepo === "README.md" ? "~" : "·"}
              </span>
              <span className="nav-title">{f.title}</span>
            </Link>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <div className="docs-body container">
      <button type="button" className="docs-menu-btn" onClick={() => setOpen(true)} aria-label="Open docs index">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        Docs
      </button>

      <div className={open ? "docs-backdrop" : "docs-backdrop docs-backdrop-hidden"} onClick={close} aria-hidden="true" />
      <aside id="docs-aside" className={open ? "docs-aside is-open" : "docs-aside"} aria-label="Documentation index">
        {list}
      </aside>

      <div className="docs-main">{children}</div>
    </div>
  );
}
