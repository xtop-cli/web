# xtop api

Crates de API compartidos para el ecosistema xtop. El kernel, los plugins,
los widgets, los efectos y las extensiones dependen todos de estos crates —
definen los contratos entre el núcleo y cada punto de extensión.

## Workspace

```
crates/
  plugin-api      -> xtop-plugin-api
  widget-api      -> xtop-widget-api
  effect-api      -> xtop-effect-api
  extension-api   -> xtop-extension-api
```

## Crates

| Crate | Package | Propósito |
|---|---|---|
| `plugin-api` | `xtop-plugin-api` | Protocolo de plugins: manifest, capacidades, errores, eventos del ciclo de vida; el modelo de datos compartido (instantáneas del sistema, `AlertThresholds`, ...) |
| `widget-api` | `xtop-widget-api` | Contrato del renderizador de widgets: `WidgetState` de solo lectura, registro de renderizadores y los mapeos canónicos de glifos/estilos (`to_color`, `border_for`, `marker_for`) |
| `effect-api` | `xtop-effect-api` | Contrato de efectos: efectos de frame con estado sobre el buffer de ratatui ya renderizado (`Effect`, `EffectManifest`) |
| `extension-api` | `xtop-extension-api` | Protocolo de extensiones: hooks alrededor de la configuración, el layout, el tema y el pipeline de renderizado |

## Documentación

Guías detalladas y ancladas al código en [`docs/`](docs/):

- [`docs/architecture.md`](docs/architecture.md) — estructura del workspace, grafo de dependencias entre crates, propiedad de DR-1..DR-5, consumo del ecosistema (deps git, patrón temporal de path-dep)
- [`docs/data-model.md`](docs/data-model.md) — cada struct de `model::*`, qué rellena el provider del kernel, ciclo de vida de la instantánea, la eliminación de Docker, el contrato serde de `AlertThresholds`
- [`docs/plugin-contract.md`](docs/plugin-contract.md) — `Plugin`, `PluginManifest`, aplicación de capacidades de `PluginContext`, `HostState`, `PluginError`, `SystemDataProvider`, autoría de plugins paso a paso
- [`docs/widget-contract.md`](docs/widget-contract.md) — `WidgetState`, `WidgetRenderer`/`WidgetRegistration`, enums de glifos + helpers canónicos, reglas de los packs
- [`docs/extension-contract.md`](docs/extension-contract.md) — `Extension`, `ExtensionHost`, `ExtensionContext`, modelo tipo servidor
- [`docs/effect-contract.md`](docs/effect-contract.md) — `Effect`/`EffectManifest` y el contrato del host
- [`docs/changes.md`](docs/changes.md) — registro de decisiones (DR-1..DR-7, D1..D8) y cambios incompatibles para consumidores

## Consumo

Los crates **aún no están publicados** en crates.io. Los consumen los repos
hermanos como dependencias git (`git = "https://github.com/xtop-cli/api"`,
actualmente flotantes) desde:

- kernel `xtop` (github.com/xtop-cli/xtop)
- repo `widgets` (github.com/xtop-cli/widgets) — packs de widgets en vivo
  consumidos por el kernel
- repo `plugins` (github.com/xtop-cli/plugins)
- repo `layouts` (github.com/xtop-cli/layouts)
- repo `effects` (github.com/xtop-cli/effects) — en vivo, con crates
  `xtop-effect-*` planificados
- repo `extensions` (github.com/xtop-cli/extensions)

El plan de publicación (crates.io + tags, y después fijar a los consumidores
a la revisión etiquetada) se sigue en el ROADMAP del workspace, §6.

## CI local

Ejecutar desde la raíz del repo:

```
./scripts/ci.sh            # run every stage
./scripts/ci.sh fmt        # run one stage: fmt | clippy | check | test
```

Solo local: este repo no conserva flujos de trabajo de GitHub.

## Licencia

MIT
