<span class="kicker">xtop-cli / documentación</span>

# Documentación

Toda la documentación del ecosistema **xtop-cli** concentrada en un solo
lugar. Estas páginas son un espejo fiel de los `README.md` y los ficheros
`docs/` de cada repositorio, traducido al español; el original en inglés
vive en [/docs/en](/docs/en/). Nada de este espejo se ha reescrito: si
cambia un repo, cambia su documentación.

El ecosistema se divide en siete repositorios con una única regla de
dependencia: cada consumidor depende solo de los crates de contratos de
[`api`](/docs/es/api/) — nunca del kernel — así que cada repo compila de
forma independiente.

| Repo | Rol | Contenido |
|---|---|---|
| [`xtop`](/docs/es/xtop/) | kernel | la aplicación: binario de un solo crate; consume al resto de repos |
| [`api`](/docs/es/api/) | contratos | `xtop-plugin-api` · `xtop-widget-api` · `xtop-effect-api` · `xtop-extension-api` |
| [`widgets`](/docs/es/widgets/) | renderers | packs de widgets sobre `xtop-widget-api` (pack por defecto + blocks) |
| [`layouts`](/docs/es/layouts/) | disposición | `xtop-layout`: modelo de layout, loader JSONC, modos y presets |
| [`plugins`](/docs/es/plugins/) | funcionalidad | implementaciones de plugins (primer miembro: `xtop-plugin-samurai`) |
| [`extensions`](/docs/es/extensions/) | hooks del kernel | extensiones de tipo servidor (primera: `xtop-extension-mcp`) |
| [`effects`](/docs/es/effects/) | animación | efectos de frame (primero: `xtop-effect-fade`) |

## Por dónde empezar

Si vienes de fuera del código, el orden natural es:

1. **Qué es** → [features](/docs/es/xtop/docs/features/) y el
   [README del kernel](/docs/es/xtop/)
2. **Instalarlo** → [installation](/docs/es/xtop/docs/installation/) — Linux,
   Windows, macOS y build desde el código fuente
3. **Usarlo** → [usage](/docs/es/xtop/docs/usage/) — keybindings, módulos,
   layouts adaptativos
4. **Configurarlo** → [configuration](/docs/es/xtop/docs/configuration/) y
   [customization](/docs/es/xtop/docs/customization/) (temas y layouts JSONC)
5. **Colores** → [colors](/docs/es/xtop/docs/colors/) — las 12 paletas
6. **Programar** → contratos en [api](/docs/es/api/), packs en
   [authoring de widgets](/docs/es/widgets/docs/authoring/), plugins y MCP en
   [plugins](/docs/es/plugins/) y
   [protocolo MCP de extensions](/docs/es/extensions/docs/mcp-protocol/)

> Nota: los enlaces entre ficheros se resuelven automáticamente hacia la
> ruta local equivalente cuando el destino está espejado aquí; el resto
> apunta al `blob` real en GitHub.

## Espejos

| Repositorio | Ficheros |
|---|---|
| `xtop-cli/api` | `README.md`, `docs/*.md` |
| `xtop-cli/effects` | `README.md`, `docs/*.md` |
| `xtop-cli/extensions` | `README.md`, `docs/*.md`, `extensions/xtop-extension-mcp/README.md` |
| `xtop-cli/layouts` | `README.md`, `docs/*.md`, `layouts/custom/README.md` |
| `xtop-cli/plugins` | `README.md`, `docs/*.md`, `plugins/xtop-plugin-samurai/README.md` |
| `xtop-cli/widgets` | `README.md`, `docs/*.md`, `custom/README.md` |
| `xtop-cli/xtop` | `README.md`, `docs/*.md`, `ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md` |
