# xtop web

Official site and documentation for the **xtop-cli** ecosystem (a TUI system
monitor written in Rust). Built with **Next.js** (App Router, `output: export`)
— a fully static site: pre-rendered HTML, **ES/EN** (`/` and `/en/`), two themes
(palette **X** in dark mode, palette **Madrid** in light mode) and **Hack Nerd
Font** typography.

## Repository layout

```
app/                  Next.js routes (App Router)
  layout.tsx          root: theme + fonts + header/footer + icon metadata
  page.tsx            ES landing (/)
  en/page.tsx         EN landing (/en/)
  docs/[[...slug]]/   EN alias of /docs (legacy routes)
  docs/en/[[...slug]]/  EN documentation (/docs/en/…)
  docs/es/[[...slug]]/  ES documentation (/docs/es/…)
  globals.css         design system (X / Madrid tokens)
app/fonts/            Hack Nerd Font Mono (woff2, PUA-free subset)
components/           header, footer, docs-shell, doc-view, docs search…
public/img/           logos, avatars and screenshots
public/img/previews/  web-optimized capture gallery (webp)
public/favicon.ico    favicon served at the site root
docs/                 EN mirror: literal .md copies from the repos (canonical)
  _home.md            /docs/en hub (hidden from navigation)
i18n/es/docs/         ES translation of the same .md files + _home.md
lib/                  palettes, repos, markdown pipeline, i18n, search
lib/search-data.ts    full-text EN+ES index (AUTO-GENERATED in prebuild)
.github/workflows/    deploy.yml — build + publish to GitHub Pages on main
```

## Why docs live in `docs/` as .md

Documentation is copied **literally** from each repository (README + `docs/`),
keeping its internal structure. During the build, `lib/docs.ts`:

- indexes `docs/` and generates one static page per file:
  `docs/xtop/docs/usage.md` → `/docs/en/xtop/docs/usage/` and
  `/docs/es/xtop/docs/usage/` (repo/subfolder `README.md` files are served at
  their folder route; language-less `/docs/…` routes render the EN alias);
- renders the markdown (including the HTML already present in some docs) and
  **re-resolves relative links** between files to local same-language routes;
  non-mirrored targets point to the real `blob` on GitHub;
- rewrites captures referenced as `assets/previews/*.png` from the repos to
  the local optimized files in `public/img/previews/` (`previewN.webp`, same
  basename — swap or add captures without touching code);
- feeds the sidebar (per-repo tree) and per-repo prev/next navigation.

The **docs search** (`components/docs-top-search.tsx`) sits above the article
on every docs page and does a full-text search over the active language index.
In `prebuild` (`scripts/build-search-index.mjs`) it generates
`lib/search-data.ts`: a static index of the EN + ES docs with title/path/
content ranking, snippets and highlighting. Page transitions use the wrapper
`components/page-shell.tsx` (route animation) and theme toggling uses the View
Transitions API when the browser supports it.

### Refreshing docs after a repo change

```sh
./scripts/sync-docs.sh   # copies EN .md files from the sibling repos into ./docs
npm run build            # regenerates the search index (prebuild)
```

The ES translation (`i18n/es/docs/`) is updated by hand, file by file, when
its EN original changes; both indexes regenerate automatically on build.

## Development

```sh
npm install
npm run dev     # http://localhost:3000
npm run build   # static export into ./out (ready to serve or deploy)
```

Deploying under a sub-path (e.g. `user.github.io/web`) is handled by the build
prefix. Next.js's own assets (`/_next/…`) are prefixed via `assetPrefix`, while
the app's URLs (`/img/…`, `/docs/…`) are prefixed through the
`NEXT_PUBLIC_ASSET_PREFIX` env var at build time:

```sh
PAGES_BASE_PATH=/web NEXT_PUBLIC_ASSET_PREFIX=/web npm run build
```

`PAGES_BASE_PATH` drives `assetPrefix` in `next.config.mjs` (leave both unset
for a root-domain/local build). The GitHub Actions workflow
(`.github/workflows/deploy.yml`) runs this automatically on pushes to `main`
and publishes the site with the GitHub Pages actions using the base path
reported by `actions/configure-pages`.

## Live site

The site is served from the `main` branch as a project page of the
`xtop-cli` organization (requires **Settings → Pages → Source: GitHub Actions**
in the repository):

- <https://xtop-cli.github.io/web/>

## Themes

| Dark (default) | Light |
|---|---|
| **X** · bg `#050505`, fg `#f7f1ff` | **Madrid** · bg `#fafafa`, fg `#1a1a1a` |

Canonical palettes live in [`xscriptor-colors/assets`](https://github.com/xscriptor-colors/assets)
and the role reference in `docs/xtop/docs/colors.md` (slot 1 alert, 2 good,
3 warn, 4 rx, 5 tx, 6 accent, 8 dim…). The design uses no borders: cards are
separated by rounded offset shadows cast down-right (or down-left).

## License

MIT — documentation content © xtop-cli repos, see each repo's `LICENSE`.
