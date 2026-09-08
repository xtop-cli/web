# Decision log & breaking changes

This file records the decisions that shaped the api repo in milestone M1
and the breaking changes consumers must absorb. The authoritative ecosystem
decisions (DR-1..DR-7) live in the workspace ROADMAP §2; M1's room-for-
interpretation decisions (D1..D8) were recorded in the milestone report
`tmp/m1-api-report.md` §8 and are restated here in repo context, anchored to
code.

## DR summary — what the api repo implements

| Decision | What it means inside this repo |
|---|---|
| DR-1 | Data model + plugin contract types exist once, in `crates/plugin-api/src/` (`model.rs`, `host.rs`, `plugin.rs`, `context.rs`, `capability.rs`, `error.rs`, `manifest.rs`, `provider.rs`, `widget.rs`, `color.rs`). Grep gate: no `AlertThresholds` definition outside `plugin-api` (M7.4). |
| DR-2 | Widget render contract exists once, in `crates/widget-api/src/` (`state.rs`, `renderer.rs`, `glyph.rs`). Plugin-side widgets are `xtop-plugin-api`'s `PluginWidget`, a distinct type — no shared name with `widget-api`'s `WidgetRegistration`. Grep gate: no `WidgetRegistration` outside `widget-api`. |
| DR-3 | No layout surface in api: layout files address widgets by plain string names (`xtop-layout` in the `layouts` repo needs no api types). |
| DR-4 | Extension types exist once, in `crates/extension-api/src/`. |
| DR-5 | Effect contract exists once, in `crates/effect-api/src/`: `Effect` over the rendered buffer + `EffectManifest`. |
| DR-6 | Ecosystem constants live at the producer (samurai plugin id/action names in the `plugins` repo, M4), not in api. |
| DR-7 | Versions: ratatui `0.30.2`, serde/serde_json latest 1.x, `rust-version = "1.87"` in the workspace and every member manifest; no tokio/clap/chrono; consumer git deps stay floating this cycle. |

## M1 decisions D1..D8 (repo context)

- **D1 — Capability gating forces `Result` reads.** Enforcing
  `ReadSystemInfo` through the same `check_capability` mechanism the mutating
  methods use is only possible if reads can fail, so
  `PluginContext::snapshot`, `system_info` and `top_processes` return
  `Result<T, PluginError>` instead of bare values (`context.rs`). Denials
  are `PluginError::Recoverable("plugin does not have required capability:
  ReadSystemInfo")`. Consumers break on purpose; see the table below.
- **D2 — `top_processes` sorts, then truncates.** Implemented as
  `sort_by(cpu_usage desc via total_cmp)` + `truncate(n)` (`context.rs`):
  same semantics as the earlier draft (`sort` + `take`), no extra
  allocation, ordering guaranteed by the contract, not the producer.
  Stable sort: equal-CPU ties keep snapshot order (tested).
- **D3 — Border mapping follows ratatui 0.30.2 semantics.** The spec draft
  read ratatui's `border::EMPTY` as "standard box drawing" and `border::PLAIN`
  as "ASCII +" — true for ratatui ≤ 0.28, wrong since 0.29: `EMPTY` is now a
  blank-space set and `PLAIN` **is** the standard single-line box-drawing
  frame; ratatui ships no ASCII set at all. The intended semantics won:
  `Native → border::PLAIN` (classic look), `Rounded → border::ROUNDED`,
  `Double → border::DOUBLE`, `Plain → ASCII_BORDER`, `Ascii → ASCII_BORDER`
  (`glyph.rs`), with `ASCII_BORDER` a new exported canonical `+ - |` set.
- **D4 — No `EffectRegistration` glue type.** The task defined a minimal
  contract of exactly `Effect` + `EffectManifest` and no speculative
  surface; no consumer exists until the kernel wiring (M5), so a
  registration type would be speculative. Omitted; trivial to add when M5
  lands.
- **D5 — Mapping helpers live in the existing `glyph.rs`, glyph-only.** The
  three functions (`to_color`, `border_for`, `marker_for`) and the
  `ASCII_BORDER` const extended the module that already owned the enums; one
  canonical import path, `xtop_widget_api::glyph::{...}`, avoids ambiguity.
  The helpers are **not** re-exported at the crate root (only the enums
  are). Border signatures use `ratatui::symbols::border::Set<'static>`
  (the bare `Set` needs a lifetime in real code).
- **D6 — `rust-version.workspace = true` in every member.** A
  `[workspace.package]` entry alone is not inherited; the per-member opt-in
  is what makes DR-7's "declared in every package" true.
- **D7 — Rename rationale without the literal old name.** The
  `PluginWidget` doc comment explains the distinction conceptually
  ("`xtop-widget-api` owns the canonical widget-pack registration type, the
  one drawn over `WidgetState`; the two are distinct contracts and must not
  share a name") without printing the removed `WidgetRegistration` symbol —
  which also keeps the M7.4 grep gate green.
- **D8 — No `Default` derive on `AlertThresholds`.** The task only asked for
  `Serialize/Deserialize`; the kernel copy's `Default` (90/90/90) and
  `Copy`/`PartialEq` are kernel-side semantics that M2 can request when it
  removes its own copy. Unrequested derives on a contract type were avoided.

## Breaking changes for consumers

All changes below land in the api working tree during M1 and reach the
sibling repos when the owner pushes; until then consumers resolve the old
remote HEAD through their floating git deps (see
[architecture.md](architecture.md) for the local path-dep validation
pattern).

| Change | Code anchor | Consumer impact | Migration |
|---|---|---|---|
| `PluginWidget` rename: plugin-api's registration type renamed from the duplicated `WidgetRegistration` to `PluginWidget` (same shape: `name` + render closure over `&dyn HostState`) | `plugin-api/src/widget.rs`, `lib.rs`; `Plugin::widget()` returns `Option<PluginWidget>` | Kernel `xtop/src/plugins/manager.rs` and `state/app.rs` import `WidgetRegistration` from `xtop_plugin_api`; samurai's `widget()` (`plugins/plugins/xtop-plugin-samurai/src/lib.rs`) names the old type | Kernel M2.3: import `PluginWidget`; delete the `PluginWidgetFn` alias in `ui/layout/engine.rs`; plugin map stays name → `PluginWidget`. Samurai M4.1. Grep gate M7.4 |
| Reads return `Result`: `PluginContext::snapshot()`, `system_info()`, `top_processes()` now enforce `ReadSystemInfo` and return `Result<_, PluginError>` | `plugin-api/src/context.rs` | Samurai calls `ctx.snapshot()` at 5 sites (system summary, process search/top/info, analyze) and reads values directly; also `process.kill`/`threshold.set`/`config.set` already map `Err` | Samurai M4.1: handle `Result` at every `ctx.snapshot()`/read call site (report §9); kernel M2 exercises the same paths through samurai + engine |
| Docker surface removed: `DockerInfo` struct, `SystemSnapshot::dockers` field, `SystemDataProvider::docker_info` method and root re-export deleted | `plugin-api/src/model.rs` (struct + field), `provider.rs`; api-wide grep for docker is empty | Kernel provider still assigns `dockers: vec![]` (`xtop/src/providers/sysinfo/provider.rs`) and composite still overrides `docker_info()` (`xtop/src/providers/composite.rs`) — those references cannot compile against the new api revision; nothing else consumed the surface | Kernel M2.4: drop the always-empty `dockers` assignment and the composite `docker_info` override |
| Glyph helper canonicalization: packs must import `to_color`/`border_for`/`marker_for`/`ASCII_BORDER` from `xtop_widget_api::glyph` instead of re-implementing | `widget-api/src/glyph.rs` (module doc: packs MUST NOT re-implement) | Base pack `widgets/src/util.rs` hand-rolls all four helpers; the blocks pack (`widgets/packs/xtop-widget-blocks/src/lib.rs`) hand-rolls `to_color`/`ascii_border`/`border_for` (no `marker_for` — its chart hardcodes `Marker::Block`) and the two packs already diverge on `Plain` | Widgets M3.3 (base pack deletes its copies; pack-private `format_bytes`/`format_uptime`/`gauge_gradient` stay), M3.4 (blocks pack deletes its copies + `const _: ChartCharset` hack and honors `state.charset()`). Call-site detail: canonical `to_color` takes `[u8; 3]` by value (pack copies took `&[u8; 3]`); `border_for` takes the enum, not `(state, widget, native)` |
| ratatui `0.30.2` in api (workspace dep) while consumers pin `0.29` | `api/Cargo.toml` (`ratatui = "0.30.2"`) | Consumer crates that also use ratatui directly compile two ratatui versions until aligned; `border::PLAIN` semantics changed in 0.29 already (see D3) | Kernel M2.6 (`Layout::vertical/horizontal` etc. + crossterm alignment), widgets M3.1, samurai M4.2. api is the reference: already on 0.30.2 (M1.1). MCP (extensions) uses no ratatui — unaffected |
| `rust-version = "1.87"` + `edition 2021` policy | workspace + all member manifests (D6) | Consumers on older toolchains must bump (samurai already needs 1.87) | Kernel M2.8, widgets M3.1, samurai + mcp M4.8 |
| `AlertThresholds` becomes the serde contract type with plain keys `cpu_high`/`mem_high`/`disk_high`; no `Default` derive (D8) | `plugin-api/src/host.rs` + round-trip test | Kernel keeps a same-shaped local copy (`xtop/src/config/schema.rs`) with `Default` 90/90/90 and converts in `plugins/host.rs` + `state/widget_state.rs` | Kernel M2.2: delete `config::AlertThresholds`; persist `xtop_plugin_api::AlertThresholds`; hand-marshalling in host.rs/widget_state.rs goes away; JSON keys stay identical |
| `data_dir()` doc no longer over-specifies a concrete path | `plugin-api/src/context.rs` | Doc-only change; behavior unchanged (path still host-provided) | none |
| Glyph enums unchanged at the root (`ChartCharset`, `WidgetBorders` re-exported; serde snake_case keys `half_block`, `plain`, ...) | `widget-api/src/lib.rs`, `glyph.rs` | none — config persistence format is stable | none |

Reference pointers for the migrations: kernel milestone M2 (M2.2–M2.6,
M2.8), widgets M3 (M3.1–M3.4), plugins + extensions M4 (M4.1, M4.2, M4.8),
kernel effect wiring M5.3, and the cross-repo grep gates in M7.4, all in the
workspace ROADMAP.
