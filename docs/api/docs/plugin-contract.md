# Plugin contract — `xtop-plugin-api`

`xtop-plugin-api` (`api/crates/plugin-api/`) is the shared plugin protocol
for xtop (DR-1). Two parties implement against it:

- the **host** (the `xtop` kernel) provides a `HostState` and hands plugins a
  `PluginContext` over it;
- **plugins** (the `xtop-cli/plugins` repo, e.g. `xtop-plugin-samurai`)
  implement `Plugin` and act through that context.

The crate never depends on the kernel, so every repo can consume it
standalone. It depends only on ratatui (for the `Frame` type in the widget
render closure) and serde (for `AlertThresholds`).

## Public surface

| Item | Module | Notes |
|---|---|---|
| `Plugin` trait | `plugin.rs` | core plugin trait |
| `PluginManifest` | `manifest.rs` | static metadata incl. declared capabilities |
| `PluginContext<'a>` | `context.rs` | capability-checked access to host state + plugin data dir |
| `HostState` trait | `host.rs` | read-only-plus-actions view of the kernel, implemented by the host |
| `RuntimeConfig` | `host.rs` | theme/layout/interval/hostname view |
| `AlertThresholds` | `host.rs` | serde contract type, see [data-model.md](data-model.md) |
| `SystemDataProvider` trait | `provider.rs` | data source contract (kernel sysinfo provider, plugin extras) |
| `PluginCapability` | `capability.rs` | declared + enforced capabilities |
| `PluginError` | `error.rs` | Recoverable / Fatal / UnknownAction |
| `PluginWidget` | `widget.rs` | plugin widget registration (renders over `&dyn HostState`) |
| `hex_to_rgb` | `color.rs` | `#rrggbb` → `[u8; 3]`; invalid/short inputs fall back to black per channel |
| `model` module | `model.rs` | the shared data model, see [data-model.md](data-model.md) |

Everything except `model` is also re-exported at the crate root
(`xtop_plugin_api::Plugin`, `xtop_plugin_api::PluginCapability`, ...), which
is how the example plugin in this file and `xtop-plugin-samurai` import it.

## `PluginManifest`

```rust
pub struct PluginManifest {
    pub id: String,              // stable id, e.g. "samurai"; also the data-dir name
    pub name: String,            // display name
    pub version: String,
    pub description: String,
    pub capabilities: Vec<PluginCapability>,  // what the plugin declares
}
```

The kernel reads the manifest when the plugin is registered to build the
context (capabilities) and to create the plugin's data directory under its
plugin data base. Consumers should take the version from
`env!("CARGO_PKG_VERSION")` rather than hardcoding it (M4.1 aligns samurai).

## `Plugin` trait

```rust
pub trait Plugin: Debug + Send {
    fn manifest(&self) -> PluginManifest;                                    // required

    fn on_enable(&mut self, _ctx: &mut PluginContext) -> Result<(), PluginError> { Ok(()) }
    fn on_disable(&mut self, _ctx: &mut PluginContext) -> Result<(), PluginError> { Ok(()) }
    fn on_tick(&mut self, _ctx: &mut PluginContext) -> Result<(), PluginError> { Ok(()) }
    fn on_key(&mut self, _ctx: &mut PluginContext, _key: &str) -> Result<bool, PluginError> { Ok(false) }
    fn data_provider(&self) -> Option<Box<dyn SystemDataProvider>> { None }
    fn widget(&self) -> Option<PluginWidget> { None }
    fn execute(&mut self, _ctx: &mut PluginContext, _action: &str, _params: &str)
        -> Result<String, PluginError> { Err(PluginError::UnknownAction(_action.to_string())) }
}
```

Lifecycle semantics (from the method docs):

- `manifest` — static metadata; the only method without a default.
- `on_enable` / `on_disable` — called once each, on load/enable and on
  disable/shutdown.
- `on_tick` — called on every tick (the kernel ticks at the configured
  interval; default ~1 s, and plugins such as samurai throttle their own
  work — every 5th tick — on top of that).
- `on_key` — key events as strings; return `Ok(true)` when consumed.
- `data_provider` — optional extra system data; the kernel merges the
  returned provider into the main data stream via its composite provider
  (host-side only for plugins that declared `ReadSystemInfo`).
- `widget` — optional custom TUI widget; renders against the `HostState`
  view (see `PluginWidget` below).
- `execute` — named commands with string parameters, used by external agents
  (AI/CLI/IPC); returns a JSON-like string. The default answers
  `UnknownAction`.

`Debug + Send` is the whole supertrait burden: a plugin is boxed
(`Box<dyn Plugin>`) by the host manager, and the host logs failures without
crashing the app (per-plugin error isolation in the kernel's `PluginManager`).

## `PluginContext` and capability enforcement

`PluginContext<'a>` wraps a `&'a mut dyn HostState` plus the plugin's data
directory and declared capabilities. The live kernel state is only reachable
through this context. Every state-touching method checks the plugin's
declared capabilities first; a missing capability yields
`PluginError::Recoverable` with the message
`plugin does not have required capability: <Debug of the capability>` (so
denied plugins can recover — the error is not fatal).

| Method | Signature (real) | Capability required | Denied → |
|---|---|---|---|
| `snapshot` | `fn snapshot(&self) -> Result<SystemSnapshot, PluginError>` | `ReadSystemInfo` | `Recoverable` |
| `system_info` | `fn system_info(&self) -> Result<SystemInfo, PluginError>` | `ReadSystemInfo` | `Recoverable` |
| `top_processes` | `fn top_processes(&self, n: usize) -> Result<Vec<ProcessInfo>, PluginError>` | `ReadSystemInfo` | `Recoverable` |
| `kill_process` | `fn kill_process(&mut self, pid: u32) -> Result<bool, PluginError>` | `KillProcesses` | `Recoverable` |
| `set_alert_thresholds` | `fn set_alert_thresholds(&mut self, cpu: f64, mem: f64, disk: f64) -> Result<(), PluginError>` | `ModifyConfig` | `Recoverable` |
| `set_theme_by_name` | `fn set_theme_by_name(&mut self, name: &str) -> Result<bool, PluginError>` | `ModifyConfig` | `Recoverable` |
| `set_layout_by_name` | `fn set_layout_by_name(&mut self, name: &str) -> Result<bool, PluginError>` | `ModifyConfig` | `Recoverable` |
| `set_update_interval` | `fn set_update_interval(&mut self, ms: u64) -> Result<(), PluginError>` | `ModifyConfig` | `Recoverable` |
| `alerts` | `fn alerts(&self) -> AlertThresholds` | none | — |
| `config` | `fn config(&self) -> RuntimeConfig` | none | — |
| `data_dir` | `fn data_dir(&self) -> &Path` | none | — |

Contract details to rely on:

- **Reads return `Result`** (decision D1). `snapshot`, `system_info` and
  `top_processes` enforce `ReadSystemInfo` exactly like the mutating methods
  enforce theirs, so callers must handle `Err`.
- **`top_processes(n)` sorts by CPU usage descending before taking `n`**
  (`sort_by` on `cpu_usage` via `total_cmp`, then `truncate(n)` — decision
  D2). It is a stable sort: equal-CPU processes keep snapshot order. The
  guarantee does not depend on the order produced by the data source. The
  in-crate tests pin this behavior.
- **`data_dir()` is host-provided.** The path is decided by the kernel and
  passed into `PluginContext::new`; the contract deliberately does not
  prescribe a concrete location (M1.2 fixed an over-specified doc). Plugins
  may persist per-plugin state inside it; the kernel creates it on
  registration (`PluginManager::register` joins the base dir with the
  plugin id).
- `alerts`, `config` and `data_dir` are ungated reads available to every
  plugin.
- `PluginContext::new(host, plugin_data_dir: PathBuf, capabilities: Vec<PluginCapability>)`
  is public; the kernel is its only caller today.

`PluginCapability` variants (`#[non_exhaustive]`, derives `Clone, Debug,
PartialEq`): `ReadSystemInfo`, `KillProcesses`, `ModifyConfig`,
`RenderWidgets`, and `Custom(String)` for anything not covered. Two
enforcement points exist: the `check_capability` calls above (in this crate)
for context methods, and host-side filters in the kernel's `PluginManager`,
which only collects `data_provider()`s from plugins that declared
`ReadSystemInfo` and only collects `widget()`s from plugins that declared
`RenderWidgets`. `Custom(String)` has no built-in check anywhere yet — it is
the escape hatch for ecosystem-specific permissions the host may start
honoring later.

## `HostState`

The kernel-side surface a plugin may touch; the kernel implements it for its
live application state (`impl HostState for AppState` in the kernel's
`xtop/src/plugins/host.rs`). Plugins never depend on kernel types — only on
this trait. **The trait has 9 methods**:

| Method | Signature | Meaning |
|---|---|---|
| `snapshot` | `fn snapshot(&self) -> SystemSnapshot` | full sample (host may serve the cached one) |
| `system_info` | `fn system_info(&self) -> SystemInfo` | hostname/OS/kernel/desktop/shell |
| `kill_process` | `fn kill_process(&mut self, pid: u32) -> bool` | send termination; true if the signal was sent |
| `set_alert_thresholds` | `fn set_alert_thresholds(&mut self, cpu: f64, mem: f64, disk: f64)` | overwrite the three thresholds |
| `alerts` | `fn alerts(&self) -> AlertThresholds` | current thresholds |
| `config` | `fn config(&self) -> RuntimeConfig` | theme name, layout name, `interval_ms`, hostname |
| `set_theme_by_name` | `fn set_theme_by_name(&mut self, name: &str) -> bool` | true if the theme exists |
| `set_layout_by_name` | `fn set_layout_by_name(&mut self, name: &str) -> bool` | true if the layout exists |
| `set_update_interval_ms` | `fn set_update_interval_ms(&mut self, ms: u64)` | tick interval |

The in-crate tests implement a minimal `FakeHost` with all 9 methods over a
hand-built `SystemSnapshot` — the pattern to copy when writing host doubles.

## `PluginError`

```rust
pub enum PluginError {
    Recoverable(String),   // invalid params, resource busy, capability denied — plugin keeps running
    Fatal(String),         // plugin should be disabled
    UnknownAction(String), // action not understood by this plugin
}
```

`Display`: `Recoverable` prints the message verbatim, `Fatal` prints
`FATAL: <msg>`, `UnknownAction` prints `unknown action: <action>`.
`PluginError` implements `std::error::Error`. The kernel's extension host
maps it onto `ExtensionError` when forwarding plugin actions to extensions
(kernel `xtop/src/plugins/extension_host.rs`).

## `SystemDataProvider`

Source of real-time system data (`provider.rs`). Implemented by the kernel's
sysinfo provider and by plugins that contribute extra metrics; the kernel
merges plugin providers into the main stream through its composite provider.

| Method | Default |
|---|---|
| `refresh_all(&mut self)` | required |
| `snapshot(&self) -> SystemSnapshot` | required |
| `disk_io(&self) -> Vec<DiskIOInfo>` | `vec![]` |
| `batteries(&self) -> Vec<BatteryInfo>` | `vec![]` |
| `gpu_info(&self) -> Vec<GpuInfo>` | `vec![]` |
| `system_info(&self) -> SystemInfo` | `SystemInfo::default()` |
| `kill_process(&self, pid: u32) -> bool` | `false` |
| `as_any(&self) -> &dyn Any` / `as_any_mut` | required (downcast for provider composition) |
| `add_extras(&mut self, Vec<Box<dyn SystemDataProvider>>)` | no-op (composite providers override it) |

## `PluginWidget`

```rust
pub struct PluginWidget {
    pub name: String,
    pub render: Arc<dyn Fn(&mut ratatui::Frame, &dyn HostState, ratatui::prelude::Rect) + Send + Sync>,
}
```

A widget a plugin registers for TUI rendering. Its render closure draws
against the plugin's `HostState` view. This type is deliberately distinct
from `xtop-widget-api`'s `WidgetRegistration` (which draws over
`WidgetState`); the two are different contracts and must not share a name
(DR-2, M1.3 — this type was renamed from a duplicated `WidgetRegistration`).
The kernel's render engine gives plugin widgets precedence over every pack
(see [widget-contract.md](widget-contract.md)).

## Implementing a plugin — step by step

The steps mirror what `xtop-plugin-samurai` (`plugins/plugins/xtop-plugin-samurai/src/lib.rs`)
does today and what the host expects.

**1. Declare the dependency.** Plugin crates live in the `plugins` repo and
consume the crate as a git dependency (floating during this cycle; see
[architecture.md](architecture.md) for the temporary path-dep pattern):

```toml
[dependencies]
xtop-plugin-api = { git = "https://github.com/xtop-cli/api" }
serde_json = "1"   # for execute() responses
```

**2. Implement `Plugin`.** Import from the crate root (the real import style
used by samurai):

```rust
use std::fmt::Debug;
use xtop_plugin_api::model::ProcessInfo;
use xtop_plugin_api::{
    Plugin, PluginCapability, PluginContext, PluginError, PluginManifest,
};

#[derive(Debug, Default)]
pub struct Watchdog {
    ticks: u64,
}

impl Plugin for Watchdog {
    fn manifest(&self) -> PluginManifest {
        PluginManifest {
            id: "watchdog".to_string(),
            name: "Watchdog".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            description: "reports the top CPU consumers every 5 ticks".to_string(),
            capabilities: vec![PluginCapability::ReadSystemInfo],
        }
    }

    fn on_enable(&mut self, _ctx: &mut PluginContext) -> Result<(), PluginError> {
        self.ticks = 0;
        Ok(())
    }

    fn on_tick(&mut self, ctx: &mut PluginContext) -> Result<(), PluginError> {
        self.ticks += 1;
        if self.ticks % 5 == 0 {
            let top = ctx.top_processes(5)?; // Result: ReadSystemInfo is checked
            let names: Vec<(String, f64)> =
                top.iter().map(|p| (p.name.clone(), p.cpu_usage)).collect();
            eprintln!("[watchdog] top: {names:?}");
        }
        Ok(())
    }

    fn on_key(&mut self, _ctx: &mut PluginContext, key: &str) -> Result<bool, PluginError> {
        if key == "w" {
            eprintln!("[watchdog] ticks: {}", self.ticks);
            Ok(true) // consumed
        } else {
            Ok(false)
        }
    }

    fn execute(
        &mut self,
        ctx: &mut PluginContext,
        action: &str,
        params: &str,
    ) -> Result<String, PluginError> {
        match action {
            "status" => Ok(format!(r#"{{"ticks":{}}}"#, self.ticks)),
            "alert.set" => {
                // params: "cpu,mem,disk"; every set_* returns Result
                let parts: Vec<&str> = params.split(',').collect();
                if parts.len() != 3 {
                    return Err(PluginError::Recoverable(
                        "expected cpu,mem,disk".to_string(),
                    ));
                }
                let cpu = parts[0]
                    .parse::<f64>()
                    .map_err(|e| PluginError::Recoverable(format!("invalid cpu: {e}")))?;
                let mem = parts[1]
                    .parse::<f64>()
                    .map_err(|e| PluginError::Recoverable(format!("invalid mem: {e}")))?;
                let disk = parts[2]
                    .parse::<f64>()
                    .map_err(|e| PluginError::Recoverable(format!("invalid disk: {e}")))?;
                ctx.set_alert_thresholds(cpu, mem, disk)?;
                Ok(r#"{"set":true}"#.to_string())
            }
            _ => Err(PluginError::UnknownAction(action.to_string())),
        }
    }
}
```

Note the capability flow: because `manifest()` declares only
`ReadSystemInfo`, `ctx.top_processes(5)` succeeds, while
`ctx.set_alert_thresholds(...)` would come back as
`PluginError::Recoverable("plugin does not have required capability: ModifyConfig")`.
Add `PluginCapability::ModifyConfig` to the declared capabilities to allow
it.

**3. Optional: contribute a widget or data.** Return `Some(PluginWidget)`
from `widget()` — the kernel collects it only when the manifest declares
`RenderWidgets` — or `Some(Box::new(my_provider))` from `data_provider()` —
collected only with `ReadSystemInfo` declared — with the provider merged via
the kernel's composite provider.

**4. Host wiring.** The kernel registers the plugin as
`Box<dyn Plugin>` through its `PluginManager` (creates the data dir from the
manifest id, builds `PluginContext::new(state, dir, capabilities)`, calls
`on_enable`), then drives `on_tick` per tick, `on_key` per key, `execute`
per named command, and `on_disable` on shutdown. Plugin authors do not touch
`HostState`; they only ever see the context. Writing a test double that
implements `HostState` is done by copying the `FakeHost` pattern from the
in-crate tests in `context.rs`.
