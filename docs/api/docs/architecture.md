# api — architecture

The `api` repo hosts the shared contract crates of the xtop ecosystem. Every
other repo (`xtop` kernel, `widgets`, `plugins`, `extensions`, and later
`effects`) depends on these crates; nothing redefines the types they own
(workspace ROADMAP, DR-1..DR-5). The repo never depends on the kernel.

This document covers the workspace layout, the dependency graph between the
four crates, what each crate owns, and how sibling repos consume the crates
today. The contract guides live in the sibling documents of this folder:

| Document | Scope |
|---|---|
| [data-model.md](data-model.md) | `xtop_plugin_api::model` structs, providers, snapshot lifecycle, `AlertThresholds` |
| [plugin-contract.md](plugin-contract.md) | `Plugin`, `PluginManifest`, `PluginContext`, `HostState`, capabilities, `SystemDataProvider` |
| [widget-contract.md](widget-contract.md) | `WidgetState`, renderer registration, glyph helpers (`glyph` module) |
| [extension-contract.md](extension-contract.md) | `Extension`, `ExtensionHost`, server-style model |
| [effect-contract.md](effect-contract.md) | `Effect`, `EffectManifest`, host contract |
| [changes.md](changes.md) | Decision log (DR-1..DR-7, M1 decisions D1..D8) and breaking changes |

## Workspace layout

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

Workspace facts (`Cargo.toml`):

- `resolver = "2"`; members are the four crates above.
- `[workspace.package]`: `version = "0.1.0"`, `edition = "2021"`,
  `license = "MIT"`, `rust-version = "1.87"`. Edition stays 2021 on purpose
  (the 2024 sweep is deferred, ROADMAP §7).
- `[workspace.dependencies]` (DR-7): `ratatui = "0.30.2"`,
  `serde = { version = "1", features = ["derive"] }`, `serde_json = "1"`.
  No tokio/clap/chrono anywhere in the repo.
- Every member declares `rust-version.workspace = true` (and inherits
  version/edition/license), so the 1.87 MSRV is actually enforced per
  package (decision D6).

Per-crate dependencies (member manifests):

| Crate | Dependencies | Dev-dependencies | Notes |
|---|---|---|---|
| `xtop-plugin-api` | ratatui (workspace), serde (workspace) | serde_json | model + plugin protocol |
| `xtop-widget-api` | ratatui, serde, `xtop-plugin-api = { path = "../plugin-api" }` | serde_json | path dep is the in-workspace form |
| `xtop-effect-api` | ratatui | — | only dependency is ratatui |
| `xtop-extension-api` | — | — | zero dependencies today |

All four packages declare `repository = "https://github.com/xtop-cli/api"`.

## Crate dependency graph

```
xtop-plugin-api  ──► (ratatui, serde)                    # data model, plugin protocol
      ▲
      │ path = "../plugin-api"
      │
xtop-widget-api  ──► (ratatui, serde, xtop-plugin-api)   # render contract, glyphs

xtop-effect-api  ──► (ratatui)                            # standalone
xtop-extension-api ─► (nothing)                           # standalone
```

Only one edge exists between the four crates: `widget-api` depends on
`plugin-api`, because `WidgetState` names the shared data model types
(`xtop_plugin_api::model::{SystemSnapshot, SystemInfo, ProcessInfo}` and
`AlertThresholds`) in its method signatures. The data model deliberately
lives in `plugin-api`, not in a separate neutral crate; consumers of
`widget-api`, `effect-api` or `extension-api` get the model through
`plugin-api` (or not at all, when their contract does not need it).

`effect-api` and `extension-api` are standalone: they only need ratatui's
`Buffer`/`Frame` types (effect-api) or nothing (extension-api). None of the
four crates depends on the kernel or on any sibling repo.

## What each crate owns (DR-1..DR-5)

| Decision | Owned surface | Where it lives |
|---|---|---|
| DR-1 — data model + plugin contract | `SystemSnapshot` and every `model::*` struct, `Plugin`, `HostState`, `PluginContext`, `PluginCapability`, `PluginError`, `PluginManifest`, `SystemDataProvider`, `AlertThresholds` (serde), `hex_to_rgb`, `RuntimeConfig`, `PluginWidget` | `crates/plugin-api/src/` (see the [plugin contract](plugin-contract.md)) |
| DR-2 — widget render contract | `WidgetState`, `WidgetRenderer`, `WidgetRegistration`, `ChartCharset`, `WidgetBorders`, canonical glyph helpers (`to_color`, `marker_for`, `border_for`, `ASCII_BORDER` in `glyph`) | `crates/widget-api/src/` (see the [widget contract](widget-contract.md)) |
| DR-4 — extension host | `Extension`, `ExtensionHost`, `ExtensionContext`, `ExtensionManifest`, `ExtensionError` | `crates/extension-api/src/` (see the [extension contract](extension-contract.md)) |
| DR-5 — effects | `Effect` (over the rendered ratatui `Buffer` + elapsed time), `EffectManifest` | `crates/effect-api/src/` (see the [effect contract](effect-contract.md)) |

DR-2 also states the naming rule: plugin-side widgets (rendered over
`&dyn HostState`) are the distinct `PluginWidget` type exported by
`xtop-plugin-api`, while `xtop-widget-api` owns the widget-pack registration
type drawn over `WidgetState`. A workspace grep gate (ROADMAP M7.4) checks
that no `WidgetRegistration` symbol exists outside `widget-api`.

Two DRs are ecosystem-wide and do not create api surface: DR-3 keeps layout
widget names as plain strings (`xtop-layout` lives in the `layouts` repo,
which declares no api dependency), and DR-6 puts ecosystem constants (samurai
plugin id, action names) at the producer — the `plugins` repo — instead of in
api.

## How the ecosystem consumes the crates

The four crates are **not published** to crates.io (the README states this;
the publish plan is tracked in ROADMAP §6). Today every consumer declares the
crates as **floating git dependencies** — `git = "https://github.com/xtop-cli/api"`
with no `rev`/`tag` — exactly as the workspace ROADMAP §2 (DR-7) and §6
prescribe for this cycle:

| Repo | Git dependency edges (from its Cargo.toml) |
|---|---|
| `xtop` (kernel) | `xtop-plugin-api`, `xtop-extension-api`, `xtop-widget-api` (all `git = .../api`, floating); plus git deps on widgets/layouts/plugins/extensions repos |
| `widgets` | `xtop-widget-api`, `xtop-plugin-api` (workspace deps, git) |
| `plugins` (samurai) | `xtop-plugin-api` (workspace dep, git) |
| `extensions` (mcp) | `xtop-extension-api` (workspace dep, git) |
| `effects` | none yet — repo has no crates until M5 |
| `layouts` | none — layout files reference widgets by plain string names (DR-3); no contract types needed |

Consequences of the floating form:

- A consumer build resolves whatever the remote default branch of
  `github.com/xtop-cli/api` points at. Changes made in a local working tree
  of `api` are **not** visible to sibling repos until the owner pushes.
- Cargo caches the fetched git revision, so local consumer builds are
  reproducible only up to the last fetched remote HEAD.
- Nothing can break silently from a publish/tag change because nothing is
  published yet; the follow-up (publish the four crates to crates.io + tags,
  then pin every consumer to the tagged api revision — or move consumers to
  the published versions) is ROADMAP §6 step 7.

### Temporary path-dependency pattern (local multi-repo development)

Sibling repos validate against the *local* api working tree through temporary
path dependencies (ROADMAP §5, M8.1/M8.2; workspace AGENTS.md). Two forms are
used, depending on the goal:

1. **Per-repo development**: replace the floating git dep in the consumer's
   manifest with a path into this repo, or keep the git declaration and
   override it with a `[patch]` section. Both point into
   `api/crates/<crate>`:

   ```toml
   # widgets/Cargo.toml — temporary (validate against the local api tree)
   [patch."https://github.com/xtop-cli/api"]
   xtop-widget-api  = { path = "../api/crates/widget-api" }
   xtop-plugin-api  = { path = "../api/crates/plugin-api" }
   ```

   A direct path dep works the same way when the consumer has no git
   declaration to patch:

   ```toml
   xtop-plugin-api = { path = "../api/crates/plugin-api" }   # temporary
   ```

   Absolute `file://` URLs into `api/crates/<crate>` are equivalent. The
   repos sit side by side in the workspace, so `../api/...` relative paths
   are the norm.

2. **Combined verification (M8.1)**: a scratch workspace under the workspace
   `tmp/verify-ws` wires *all* repos together with path deps, so
   `cargo test`/clippy across the whole ecosystem proves one combined
   compile.

Both forms are temporary by rule: **every manifest is restored to its
floating git deps before the owner pushes** (M8.2; final manifest state must
be exactly what the owner pushes). A `[patch]` section is the least invasive
form because restoring means deleting the section.

## Repo hygiene and local CI

- CI is local only: `./scripts/ci.sh [fmt|clippy|check|test]` from the repo
  root (fmt check, clippy `-D warnings`, workspace check/test). No GitHub
  workflows exist or are added (workspace rule).
- The workspace carries 16 tests (plugin-api 5, widget-api 9, effect-api 2;
  extension-api none yet) covering capability gating, `top_processes`
  ordering, the `AlertThresholds` serde contract, the glyph mapping tables
  and a fake-frame effect test. `cargo doc --workspace --no-deps` builds
  warning-free.
- Grep gates that must stay green (ROADMAP M7.4): no `WidgetRegistration`
  outside `widget-api`, no `AlertThresholds` definition outside
  `plugin-api`, no `PluginWidgetFn`, no `plugins_dir_tmp`. No "docker"
  symbol exists anywhere in this repo (M1.4).

## Publish plan (pointer)

The push order and the publish/pin follow-up live in the workspace
ROADMAP, §6: api is pushed first (contracts first — everything depends on
it); crates.io publication of the four crates plus tags, and the pinning of
consumer git deps, are step 7.
