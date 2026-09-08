# xtop api

Shared API crates for the xtop ecosystem. Kernel, plugins, widgets, effects
and extensions all depend on these crates — they define the contracts between
the core and every extension point.

## Workspace

```
crates/
  plugin-api      -> xtop-plugin-api
  widget-api      -> xtop-widget-api
  effect-api      -> xtop-effect-api
  extension-api   -> xtop-extension-api
```

## Crates

| Crate | Package | Purpose |
|---|---|---|
| `plugin-api` | `xtop-plugin-api` | Plugin protocol: manifest, capabilities, errors, lifecycle events; the shared data model (system snapshots, `AlertThresholds`, ...) |
| `widget-api` | `xtop-widget-api` | Widget renderer contract: read-only `WidgetState`, renderer registration, and the canonical glyph/style mappings (`to_color`, `border_for`, `marker_for`) |
| `effect-api` | `xtop-effect-api` | Effect contract: stateful frame effects over the rendered ratatui buffer (`Effect`, `EffectManifest`) |
| `extension-api` | `xtop-extension-api` | Extension protocol: hooks around config, layout, theme and render pipeline |

## Documentation

Detailed, code-grounded guides live in [`docs/`](docs/):

- [`docs/architecture.md`](docs/architecture.md) — workspace layout, crate dependency graph, DR-1..DR-5 ownership, ecosystem consumption (git deps, temporary path-dep pattern)
- [`docs/data-model.md`](docs/data-model.md) — every `model::*` struct, what the kernel provider populates, snapshot lifecycle, the Docker removal, the `AlertThresholds` serde contract
- [`docs/plugin-contract.md`](docs/plugin-contract.md) — `Plugin`, `PluginManifest`, `PluginContext` capability enforcement, `HostState`, `PluginError`, `SystemDataProvider`, step-by-step plugin authoring
- [`docs/widget-contract.md`](docs/widget-contract.md) — `WidgetState`, `WidgetRenderer`/`WidgetRegistration`, glyph enums + canonical helpers, pack rules
- [`docs/extension-contract.md`](docs/extension-contract.md) — `Extension`, `ExtensionHost`, `ExtensionContext`, server-style model
- [`docs/effect-contract.md`](docs/effect-contract.md) — `Effect`/`EffectManifest` and the host contract
- [`docs/changes.md`](docs/changes.md) — decision log (DR-1..DR-7, D1..D8) and breaking changes for consumers

## Consumption

The crates are **not yet published** to crates.io. They are consumed by
sibling repos as git dependencies (`git = "https://github.com/xtop-cli/api"`,
currently floating) from:

- `xtop` kernel (github.com/xtop-cli/xtop)
- `widgets` repo (github.com/xtop-cli/widgets) — live widget packs consumed
  by the kernel
- `plugins` repo (github.com/xtop-cli/plugins)
- `layouts` repo (github.com/xtop-cli/layouts)
- `effects` repo (github.com/xtop-cli/effects) — live, with planned
  `xtop-effect-*` crates
- `extensions` repo (github.com/xtop-cli/extensions)

The publish plan (crates.io + tags, then pinning consumers to the tagged
revision) is tracked in the workspace ROADMAP, §6.

## Local CI

Run from the repo root:

```
./scripts/ci.sh            # run every stage
./scripts/ci.sh fmt        # run one stage: fmt | clippy | check | test
```

Local only: this repo keeps no GitHub workflows.

## License

MIT
