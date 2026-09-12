# Arquitectura multi-repo (org xtop-cli)

> Estado: **en vivo** (2026-09-04). Este documento es la localización del RFC
> de arquitectura del ecosistema: describe cómo se divide la organización
> xtop-cli en repos, cómo dependen las piezas entre sí y hacia dónde se dirige
> el diseño. La documentación detallada por área vive en la carpeta `docs/` de
> cada repo; el orden de push y el estado de los hitos viven en el
> `ROADMAP.md` raíz del workspace.

## Organización

| Repo (xtop-cli) | Rol | Contenido |
|---|---|---|
| `api` | **Contratos** | workspace con los cuatro crates de contrato: `xtop-plugin-api` (modelo de datos, traits de plugin/host, `AlertThresholds`, `PluginWidget`), `xtop-widget-api` (registro de packs + helpers de glifos), `xtop-extension-api` (host de extensiones), `xtop-effect-api` (efectos de frame) |
| `xtop` | **Kernel** | la app: binario de crate único, `src/` por áreas (commands, config, plugins, providers, state, theme, ui). Consume todos los demás repos |
| `widgets` | **Renderers** | packs de renderers de widgets contra `xtop-widget-api`: pack base `xtop-widgets` + pack alternativo `xtop-widget-blocks` (crate hermano de los crates por widget para que los consumidores git resuelvan su dependencia `xtop-widget-core`) + comunidad en `custom/` |
| `layouts` | **Disposición** | crate `xtop-layout`: modelo de layout guiado por datos + cargador JSONC + modos de layout, más `layouts/default/` (7 layouts ligados a modos + 3 extras de preset `detail_*`) y `layouts/custom/` (comunidad, instalables) |
| `plugins` | **Funcionalidad** | implementaciones de plugins contra `xtop-plugin-api` (`xtop-plugin-samurai`), los hosts de widgets en tiempo de ejecución (`xtop-plugin-wasm`, `xtop-plugin-external`) y sus crates compartidos (`xtop-wasm-contract`, `xtop-widget-replay`, `xtop-wasm-guest`) |
| `extensions` | **Hooks del kernel** | extensiones estilo servidor contra `xtop-extension-api` (`xtop-extension-mcp`) |
| `effects` | **Animación** | efectos de frame contra `xtop-effect-api` (`xtop-effect-fade`: fundido de entrada de 500 ms desde negro) |

Disposición de desarrollo local (checkouts hermanos en una carpeta, como en
este workspace):

```
/home/x/xtop-cli/
  api/  xtop/  widgets/  layouts/  plugins/  extensions/  effects/
```

## Principio de dependencia: contratos en `api`, los consumidores apuntan hacia arriba

Cada repo consumidor depende solo de los crates de contrato de `api` — nunca
del kernel — así que cada repo compila de forma independiente:

```
                ┌────────────┐
                │    api     │  pure contract crates (ratatui/serde only)
                └─────┬──────┘
          ┌───────────┼───────────────┬──────────────┐
          ▼           ▼               ▼              ▼
   ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────┐
   │  xtop    │ │ widgets/  │ │ layouts/   │ │ plugins/     │
   │ (kernel) │ │ effects/  │ │ extensions │ │ (samurai)    │
   └──────────┘ └───────────┘ └────────────┘ └──────────────┘
```

- **`api`**: tipos puros + protocolos (manifests, capacidades, errores,
  modelo de snapshot, contratos de provider/widget/extensión/efecto). Solo
  depende de `ratatui`/`serde`. Aún no publicado en crates.io (ver los
  seguimientos del Roadmap §6).
- **Kernel `xtop`**: aloja el ecosistema — implementa `HostState` /
  `WidgetState` / `ExtensionHost` para su estado en vivo, ejecuta
  `PluginManager` y el provider compuesto, renderiza los layouts resolviendo
  los nombres de widget en los packs, y maneja los efectos (tras feature).
  Compila bien sin ninguna feature opcional: `cargo build --no-default-features`
  es el núcleo puro.
- **`widgets` / `layouts` / `plugins` / `extensions` / `effects`**: consumen
  solo los tipos de `api`; cada repo compila de forma independiente y nunca
  depende del kernel.

## Modos de integración

| Nivel | Mecanismo | Uso |
|---|---|---|
| En compilación (hoy) | dependencias git de Cargo + feature flags opcionales | Cada integración: plugin samurai, extensión mcp, pack blocks, efecto fade |
| En desarrollo | `xtop plugin install <name>` (clona, automodifica el `Cargo.toml` del kernel, ejecuta `cargo check`) | Primeros pasos con un repo de plugins |
| Widgets en tiempo de ejecución (hoy, opt-in) | features del kernel `plugin-wasm` (módulos `.wasm` en sandbox vía wasmi) y `plugin-external` (un proceso auxiliar por widget sobre líneas JSON), descubiertos en los directorios de configuración `wasm/` y `external/` | Código de widgets de terceros sin recompilar el kernel — ver `customization.md` ("Runtime Widgets") |
| En ejecución (futuro, RFC) | descubrimiento binario/ABI de `xtop-plugin-*` / `xtop-effect-*` / `xtop-extension-*` en los directorios de configuración + `XTOP_*_DEV_DIR` | Terceros sin recompilar — ver la lista diferida del ROADMAP raíz §7 |

El kernel nunca requiere ningún repo externo en tiempo de ejecución: las
piezas opcionales del ecosistema son Cargo features (`plugin-samurai`,
`mcp-extension`, `widget-blocks`, `effects`, `plugin-wasm`, `plugin-external`);
los crates de contrato (los
cuatro crates `xtop-*-api` más `xtop-widgets` y `xtop-layout`) son
incondicionales porque el chrome y las vistas de estado del kernel están
escritos contra ellos.

## Flujo de desarrollo (deps de path temporales)

Los repos del ecosistema se editan antes de subirlos. Para compilar un
consumidor contra el estado hermano aún no subido, su `Cargo.toml` reemplaza
temporalmente la dependencia git por una dependencia de path
(`path = "../api/crates/plugin-api"`, `path = "../widgets"`, ...), o — cuando
el manifest del propio consumidor debe permanecer intacto — una sección
`[patch."https://github.com/xtop-cli/<repo>"]` temporal redirige las fuentes
git a los checkouts hermanos. Todas las anulaciones temporales se eliminan
antes de que el propietario haga push; los manifests finales llevan las deps
git flotantes mostradas arriba.

## Por qué existe la división

El kernel fue originalmente un workspace de crates propiedad del kernel
(`xtop-core`/`xtop-tui`/`xtop-cli`), y luego un monocrate con plugins dentro.
Cada eje de personalización creció hasta tener su propio repo para que:

- un contribuidor pueda publicar un pack de widgets, un layout, un plugin, una
  extensión o un efecto sin tocar la base de código del kernel;
- cada repo compile contra los contratos de api por sí solo (comprobable de
  forma aislada, sin importar el kernel);
- el kernel siga siendo un host fino: el modelo de métricas, los layouts y los
  renderers de widgets vienen todos de los crates del ecosistema.

Reglas de fuente única que mantienen honesta la división (ver la sección de
"decisions" del ROADMAP raíz):

- el modelo de métricas y el protocolo de plugins existen solo en
  `xtop-plugin-api`;
- el registro de widgets y el mapeo de glifos/estilo existen solo en
  `xtop-widget-api` (el widget del lado del plugin es
  `xtop_plugin_api::PluginWidget`);
- las constantes del ecosistema viven en el productor (`xtop-plugin-samurai`
  exporta `PLUGIN_ID` y sus 12 nombres de acción; `xtop-extension-mcp`
  construye su tabla de herramientas a partir de ellos).

## Fases

1. **F0 (hecho)**: org `xtop-cli`, repos creados, clones locales en una carpeta.
2. **F1 (hecho)**: crates de contrato de `api` extraídos del modelo de dominio
   del kernel; el kernel y sus hermanos los consumen.
3. **F2 (hecho)**: samurai movido al repo `plugins`; MCP movido a
   `extensions`; las features del kernel apuntan a los repos hermanos vía
   deps git.
4. **F3 (hecho)**: workspace `effects` con el efecto fade; el kernel lo cablea
   detrás de la feature opcional `effects`.
5. **F4 (hecho)**: contrato del host de extensiones + `xtop-extension-mcp`
   como primera extensión estilo servidor.
6. **F5 (pendiente)**: publicar los crates de api en crates.io; etiquetar y
   fijar las deps git; CI por repo y releases del kernel (ver el ROADMAP raíz
   §6/§7).

## Temas abiertos de RFC

- Descubrimiento dinámico en ejecución (carga por ABI o por directorio) —
  diferido explícitamente en el ROADMAP raíz §7 hasta que el modelo de
  features en compilación deje de ser coherente.
- Publicación: esquema de versionado para los crates de contrato y la
  estrategia de fijación de cada consumidor.
