# api — arquitectura

El repo `api` aloja los crates de contrato compartidos del ecosistema xtop.
Cualquier otro repo (kernel `xtop`, `widgets`, `plugins`, `extensions` y,
más adelante, `effects`) depende de estos crates; nada redefine los tipos que
poseen (ROADMAP del workspace, DR-1..DR-5). El repo nunca depende del kernel.

Este documento cubre la estructura del workspace, el grafo de dependencias
entre los cuatro crates, qué posee cada crate y cómo consumen hoy los crates
los repos hermanos. Las guías de contrato viven en los documentos hermanos de
esta carpeta:

| Documento | Alcance |
|---|---|
| [data-model.md](data-model.md) | structs de `xtop_plugin_api::model`, providers, ciclo de vida de la instantánea, `AlertThresholds` |
| [plugin-contract.md](plugin-contract.md) | `Plugin`, `PluginManifest`, `PluginContext`, `HostState`, capacidades, `SystemDataProvider` |
| [widget-contract.md](widget-contract.md) | `WidgetState`, registro de renderizadores, helpers de glifos (módulo `glyph`) |
| [extension-contract.md](extension-contract.md) | `Extension`, `ExtensionHost`, modelo tipo servidor |
| [effect-contract.md](effect-contract.md) | `Effect`, `EffectManifest`, contrato del host |
| [changes.md](changes.md) | Registro de decisiones (DR-1..DR-7, decisiones M1 D1..D8) y cambios incompatibles |

## Estructura del workspace

```
api/
  Cargo.toml              workspace root (shared deps, rust-version)
  crates/
    plugin-api/           -> xtop-plugin-api   (data model + plugin protocol)
    widget-api/           -> xtop-widget-api   (widget render contract + glyphs)
    effect-api/           -> xtop-effect-api   (frame-effect contract)
    extension-api/        -> xtop-extension-api (extension protocol)
  scripts/ci.sh           local CI: fmt | clippy | check | test
```

Hechos del workspace (`Cargo.toml`):

- `resolver = "2"`; los miembros son los cuatro crates anteriores.
- `[workspace.package]`: `version = "0.1.0"`, `edition = "2021"`,
  `license = "MIT"`, `rust-version = "1.87"`. La edition se mantiene en 2021
  a propósito (la migración a 2024 está diferida, ROADMAP §7).
- `[workspace.dependencies]` (DR-7): `ratatui = "0.30.2"`,
  `serde = { version = "1", features = ["derive"] }`, `serde_json = "1"`.
  Sin tokio/clap/chrono en ningún lugar del repo.
- Cada miembro declara `rust-version.workspace = true` (y hereda
  version/edition/license), de modo que el MSRV 1.87 se aplica de verdad por
  paquete (decisión D6).

Dependencias por crate (manifests de los miembros):

| Crate | Dependencias | Dev-dependencies | Notas |
|---|---|---|---|
| `xtop-plugin-api` | ratatui (workspace), serde (workspace) | serde_json | model + plugin protocol |
| `xtop-widget-api` | ratatui, serde, `xtop-plugin-api = { path = "../plugin-api" }` | serde_json | la path dep es la forma dentro del workspace |
| `xtop-effect-api` | ratatui | — | la única dependencia es ratatui |
| `xtop-extension-api` | — | — | cero dependencias hoy |

Los cuatro paquetes declaran `repository = "https://github.com/xtop-cli/api"`.

## Grafo de dependencias entre crates

```
xtop-plugin-api  ──► (ratatui, serde)                    # data model, plugin protocol
      ▲
      │ path = "../plugin-api"
      │
xtop-widget-api  ──► (ratatui, serde, xtop-plugin-api)   # render contract, glyphs

xtop-effect-api  ──► (ratatui)                            # standalone
xtop-extension-api ─► (nothing)                           # standalone
```

Solo existe una arista entre los cuatro crates: `widget-api` depende de
`plugin-api`, porque `WidgetState` nombra los tipos del modelo de datos
compartido (`xtop_plugin_api::model::{SystemSnapshot, SystemInfo, ProcessInfo}`
y `AlertThresholds`) en las firmas de sus métodos. El modelo de datos vive
deliberadamente en `plugin-api`, y no en un crate neutro aparte; los
consumidores de `widget-api`, `effect-api` o `extension-api` obtienen el
modelo a través de `plugin-api` (o no lo obtienen en absoluto, cuando su
contrato no lo necesita).

`effect-api` y `extension-api` son independientes: solo necesitan los tipos
`Buffer`/`Frame` de ratatui (effect-api) o nada (extension-api). Ninguno de
los cuatro crates depende del kernel ni de ningún repo hermano.

## Qué posee cada crate (DR-1..DR-5)

| Decisión | Superficie propiedad | Dónde vive |
|---|---|---|
| DR-1 — modelo de datos + contrato de plugins | `SystemSnapshot` y cada struct de `model::*`, `Plugin`, `HostState`, `PluginContext`, `PluginCapability`, `PluginError`, `PluginManifest`, `SystemDataProvider`, `AlertThresholds` (serde), `hex_to_rgb`, `RuntimeConfig`, `PluginWidget` | `crates/plugin-api/src/` (ver el [plugin contract](plugin-contract.md)) |
| DR-2 — contrato de render de widgets | `WidgetState`, `WidgetRenderer`, `WidgetRegistration`, `ChartCharset`, `WidgetBorders`, helpers canónicos de glifos (`to_color`, `marker_for`, `border_for`, `ASCII_BORDER` en `glyph`) | `crates/widget-api/src/` (ver el [widget contract](widget-contract.md)) |
| DR-4 — host de extensiones | `Extension`, `ExtensionHost`, `ExtensionContext`, `ExtensionManifest`, `ExtensionError` | `crates/extension-api/src/` (ver el [extension contract](extension-contract.md)) |
| DR-5 — efectos | `Effect` (sobre el `Buffer` de ratatui ya renderizado + tiempo transcurrido), `EffectManifest` | `crates/effect-api/src/` (ver el [effect contract](effect-contract.md)) |

DR-2 también establece la regla de nombres: los widgets del lado del plugin
(renderizados sobre `&dyn HostState`) son el tipo distinto `PluginWidget`
exportado por `xtop-plugin-api`, mientras que `xtop-widget-api` posee el tipo
de registro de packs de widgets dibujado sobre `WidgetState`. Un gate de
grep del workspace (ROADMAP M7.4) comprueba que no exista ningún símbolo
`WidgetRegistration` fuera de `widget-api`.

Dos DR abarcan todo el ecosistema y no crean superficie de api: DR-3 mantiene
los nombres de widgets de layout como cadenas simples (`xtop-layout` vive en
el repo `layouts`, que no declara dependencia de api), y DR-6 sitúa las
constantes del ecosistema (id del plugin samurai, nombres de acciones) en el
productor — el repo `plugins` — en lugar de en api.

## Cómo consume los crates el ecosistema

Los cuatro crates **no están publicados** en crates.io (el README lo afirma;
el plan de publicación se sigue en el ROADMAP §6). Hoy cada consumidor
declara los crates como **dependencias git flotantes** —
`git = "https://github.com/xtop-cli/api"` sin `rev`/`tag` — exactamente como
prescriben para este ciclo el ROADMAP §2 (DR-7) y §6 del workspace:

| Repo | Aristas de dependencias git (desde su Cargo.toml) |
|---|---|
| `xtop` (kernel) | `xtop-plugin-api`, `xtop-extension-api`, `xtop-widget-api` (todas `git = .../api`, flotantes); además deps git sobre los repos widgets/layouts/plugins/extensions |
| `widgets` | `xtop-widget-api`, `xtop-plugin-api` (deps del workspace, git) |
| `plugins` (samurai) | `xtop-plugin-api` (dep del workspace, git) |
| `extensions` (mcp) | `xtop-extension-api` (dep del workspace, git) |
| `effects` | ninguna aún — el repo no tiene crates hasta M5 |
| `layouts` | ninguna — los archivos de layout referencian widgets por nombres de cadena simples (DR-3); no se necesitan tipos de contrato |

Consecuencias de la forma flotante:

- Una compilación de consumidor resuelve lo que apunte la rama por defecto
  remota de `github.com/xtop-cli/api`. Los cambios hechos en un árbol de
  trabajo local de `api` **no** son visibles para los repos hermanos hasta
  que el propietario hace push.
- Cargo cachea la revisión git descargada, así que las compilaciones locales
  de los consumidores solo son reproducibles hasta el último HEAD remoto
  descargado.
- Nada puede romperse en silencio por un cambio de publicación/tag porque
  nada está publicado todavía; el paso siguiente (publicar los cuatro crates
  en crates.io + tags, y después fijar cada consumidor a la revisión de api
  etiquetada — o mover los consumidores a las versiones publicadas) es el
  paso 7 del ROADMAP §6.

### Patrón temporal de path-dependency (desarrollo multi-repo local)

Los repos hermanos validan contra el árbol de trabajo *local* de api a través
de path dependencies temporales (ROADMAP §5, M8.1/M8.2; AGENTS.md del
workspace). Se usan dos formas, según el objetivo:

1. **Desarrollo por repo**: sustituir la dep git flotante del manifest del
   consumidor por un path a este repo, o conservar la declaración git y
   sobrescribirla con una sección `[patch]`. Ambas apuntan a
   `api/crates/<crate>`:

   ```toml
   # widgets/Cargo.toml — temporary (validate against the local api tree)
   [patch."https://github.com/xtop-cli/api"]
   xtop-widget-api  = { path = "../api/crates/widget-api" }
   xtop-plugin-api  = { path = "../api/crates/plugin-api" }
   ```

   Una path dep directa funciona igual cuando el consumidor no tiene una
   declaración git que parchear:

   ```toml
   xtop-plugin-api = { path = "../api/crates/plugin-api" }   # temporary
   ```

   Las URLs absolutas `file://` a `api/crates/<crate>` son equivalentes. Los
   repos están lado a lado en el workspace, así que las rutas relativas
   `../api/...` son la norma.

2. **Verificación combinada (M8.1)**: un workspace de prueba bajo el
   `tmp/verify-ws` del workspace conecta *todos* los repos con path deps, de
   modo que `cargo test`/clippy en todo el ecosistema demuestran una única
   compilación combinada.

Ambas formas son temporales por regla: **cada manifest se restaura a sus
deps git flotantes antes de que el propietario haga push** (M8.2; el estado
final del manifest debe ser exactamente el que el propietario publica). Una
sección `[patch]` es la forma menos invasiva porque restaurar consiste en
borrar la sección.

## Higiene del repo y CI local

- El CI es solo local: `./scripts/ci.sh [fmt|clippy|check|test]` desde la
  raíz del repo (check de fmt, clippy `-D warnings`, check/test del
  workspace). No existen ni se añaden flujos de trabajo de GitHub (regla del
  workspace).
- El workspace lleva 16 tests (plugin-api 5, widget-api 9, effect-api 2;
  extension-api ninguno todavía) que cubren el gating de capacidades, el
  orden de `top_processes`, el contrato serde de `AlertThresholds`, las
  tablas de mapeo de glifos y un test de efecto con frame falso.
  `cargo doc --workspace --no-deps` compila sin warnings.
- Gates de grep que deben permanecer verdes (ROADMAP M7.4): ningún
  `WidgetRegistration` fuera de `widget-api`, ninguna definición de
  `AlertThresholds` fuera de `plugin-api`, ningún `PluginWidgetFn`, ningún
  `plugins_dir_tmp`. No existe ningún símbolo "docker" en este repo (M1.4).

## Plan de publicación (referencia)

El orden de push y el paso de publicar/fijar viven en el ROADMAP §6 del
workspace: api se publica primero (los contratos primero — todo depende de
ella); la publicación en crates.io de los cuatro crates más los tags, y la
fijación de las deps git de los consumidores, son el paso 7.
