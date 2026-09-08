# xtop web

Sitio oficial y documentación del ecosistema **xtop-cli** (TUI system monitor
en Rust). Construido con **Next.js** (App Router, `output: export`) — un sitio
100% estático: HTML pre-renderizado, **ES/EN** (`/` y `/en/`), dos temas
(paleta **X** en oscuro, paleta **Madrid** en claro) y tipografía
**Hack Nerd Font**.

## Estructura

```
app/                  rutas Next.js (App Router)
  layout.tsx          raíz: tema + fuentes + header/footer
  page.tsx            landing ES (/)
  en/page.tsx         landing EN (/en/)
  docs/[[...slug]]/   alias EN de /docs (rutas históricas)
  docs/en/[[...slug]]/  documentación EN (/docs/en/…)
  docs/es/[[...slug]]/  documentación ES (/docs/es/…)
  globals.css         design system (tokens X / Madrid)
app/fonts/            Hack Nerd Font Mono (woff2, subset sin PUA)
components/           header, footer, docs-shell, doc-view, lupa de búsqueda…
docs/                 espejo EN: .md literales copiados de los repos (canónico)
  _home.md            hub de /docs/en (no se lista en la navegación)
i18n/es/docs/         traducción ES de los mismos 41 .md + _home.md
lib/                  paletas, repos, pipeline markdown, i18n, búsqueda
lib/search-data.ts    índice full-text EN+ES (AUTO-GENERADO en prebuild)
public/img/           logos, avatares y capturas (placeholders png)
```

## Por qué los docs viven en `docs/` como .md

La documentación se copia **literal** desde cada repositorio (README + `docs/`)
respetando su estructura interna. En build, `lib/docs.ts`:

- indexa `docs/` y genera una página estática por fichero:
  `docs/xtop/docs/usage.md` → `/docs/en/xtop/docs/usage/` y
  `/docs/es/xtop/docs/usage/` (los `README.md` de repo/subcarpeta se sirven
  en la ruta de su carpeta; `/docs/…` sin idioma redirige al alias EN);
- renderiza el markdown (incluido el HTML que ya contienen algunos docs) y
  **re-resuelve los enlaces relativos** entre ficheros hacia las rutas locales
  del mismo idioma; los destinos no espejados apuntan al `blob` real en GitHub;
- reescribe las capturas de `assets/previews/*.png` hacia las locales en
  `public/img/previews/` (hoy placeholders con los mismos nombres: basta
  sustituirlos por las capturas reales, sin tocar código);
- alimenta el sidebar (árbol por repo) y la navegación prev/next por repo.

La **lupa de búsqueda** (`components/docs-top-search.tsx`) se muestra arriba
del artículo en todas las páginas de docs y busca a texto completo en el
índice del idioma activo. En `prebuild` (`scripts/build-search-index.mjs`) se
genera `lib/search-data.ts`: índice estático de los 41 docs EN + 41 ES con
ranking por título/ruta/contenido, snippets y resaltado. Las transiciones de
página usan el wrapper `components/page-shell.tsx` (animación por ruta) y el
cambio de tema usa la View Transitions API cuando el navegador la soporta.

### Actualizar los docs tras un cambio en los repos

```sh
./scripts/sync-docs.sh   # copia los .md EN de los repos hermanos a ./docs
npm run build            # regenera el índice de búsqueda (prebuild)
```

La traducción ES (`i18n/es/docs/`) se actualiza a mano fichero a fichero
cuando cambie su original EN; ambos índices se regeneran solos en el build.

## Desarrollo

```sh
npm install
npm run dev     # http://localhost:3000
npm run build   # estático en ./out (listo para servir o GitHub Pages)
```

Para publicar bajo una sub-ruta (p. ej. `usuario.github.io/web`) compila con
prefijo de assets y enlaces:

```sh
NEXT_PUBLIC_ASSET_PREFIX=/web npm run build
```

(conviene además apuntar `metadataBase` y `basePath` de `next.config.mjs`).

## Temas

| Tema (oscuro, por defecto) | Tema (claro) |
|---|---|
| **X** · bg `#050505`, fg `#f7f1ff` | **Madrid** · bg `#fafafa`, fg `#1a1a1a` |

Paletas canónicas en [`xscriptor-colors/assets`](https://github.com/xscriptor-colors/assets)
y referencia de roles en `docs/xtop/docs/colors.md` (slot 1 alert, 2 good,
3 warn, 4 rx, 5 tx, 6 accent, 8 dim…). El diseño no usa bordes: las tarjetas
se separan con sombras de offset redondeadas hacia abajo (derecha o izquierda).

## Licencia

MIT — contenido de documentación © repos xtop-cli, ver `LICENSE` de cada repo.
