# Widget render contract — `xtop-widget-api`

`xtop-widget-api` (`api/crates/widget-api/`) is the renderer contract for
widget packs (DR-2). Widgets are the visual parts drawn inside layout areas:
the kernel ships a base pack, and any other pack (blocks pack, community,
plugin) provides renderers for the same widget names or new ones.

Three pieces make up the crate:

- `state::WidgetState` — the read-only view a renderer receives;
- `glyph` — the glyph-style enums plus the **canonical** mappings to ratatui
  drawing primitives;
- `renderer::{WidgetRegistration, WidgetRenderer}` — how packs register
  renderers by widget name.

The crate root re-exports `WidgetState`, `WidgetRegistration`,
`WidgetRenderer` and the glyph **enums** (`ChartCharset`, `WidgetBorders`);
the glyph mapping helpers are reachable **only** under the `glyph` module
(`xtop_widget_api::glyph::to_color` etc. — decision D5).

Like every contract crate, it never depends on the kernel. It depends on
ratatui (for `Frame`, `Rect`, `Marker`, border sets), serde (for the glyph
enums) and `xtop-plugin-api` (for the data model its `WidgetState` methods
name).

## `WidgetState` — the renderer's view (28 methods)

Every renderer draws against this trait — never against kernel types. The
kernel implements it over its live `AppState` (`xtop/src/state/widget_state.rs`)
and the render engine hands it to the pack renderers. Read-only by design:
widgets never mutate app state.

The trait's 28 methods, grouped as in the source:

| Group | Method | Signature | Meaning |
|---|---|---|---|
| Sample | `snapshot` | `fn snapshot(&self) -> Option<&SystemSnapshot>` | current per-tick sample; `None` before the first tick |
| Theme | `theme_name` | `fn theme_name(&self) -> &str` | active theme name |
| Theme | `theme_fg` | `fn theme_fg(&self) -> &[u8; 3]` | theme foreground as an RGB triple |
| Theme | `theme_bg` | `fn theme_bg(&self) -> &[u8; 3]` | theme background as an RGB triple |
| Theme | `theme_palette` | `fn theme_palette(&self) -> &[[u8; 3]; 16]` | 16-entry palette |
| Theme | `alerts` | `fn alerts(&self) -> AlertThresholds` | current alert thresholds |
| Glyph style | `charset` | `fn charset(&self, widget: &str) -> ChartCharset` | resolved charset for a widget |
| Glyph style | `borders` | `fn borders(&self, widget: &str) -> WidgetBorders` | resolved border style for a widget |
| History | `cpu_history` | `fn cpu_history(&self) -> &[VecDeque<(f64, f64)>]` | per-core history (x, y) |
| History | `mem_history` | `fn mem_history(&self) -> &VecDeque<(f64, f64)>` | memory percent history |
| History | `net_rx_history` | `fn net_rx_history(&self) -> &VecDeque<(f64, f64)>` | summed receive **rate** history (bytes/s) |
| History | `net_tx_history` | `fn net_tx_history(&self) -> &VecDeque<(f64, f64)>` | summed transmit rate history (bytes/s) |
| History | `disk_read_history` | `fn disk_read_history(&self) -> &VecDeque<(f64, f64)>` | summed disk **read** rate history (bytes/s, aggregate across disks); default empty |
| History | `disk_write_history` | `fn disk_write_history(&self) -> &VecDeque<(f64, f64)>` | summed disk **write** rate history (bytes/s, aggregate across disks); default empty |
| History | `load_history` | `fn load_history(&self) -> &VecDeque<(f64, f64)>` | 1-minute load-average history (`load_avg.one`); default empty |
| View/control | `search_query` | `fn search_query(&self) -> &str` | active process search text |
| View/control | `process_selected_pid` | `fn process_selected_pid(&self) -> Option<u32>` | selected row, anchored by PID |
| View/control | `process_sort_label` | `fn process_sort_label(&self) -> &str` | label of the active sort column |
| View/control | `process_sort_desc` | `fn process_sort_desc(&self) -> bool` | whether the active process sorting is descending; default `false` (ascending) reproduces the pre-direction behavior for implementors that do not track a direction |
| View/control | `layout_name` | `fn layout_name(&self) -> &str` | active layout name |
| View/control | `is_searching` | `fn is_searching(&self) -> bool` | search overlay active |
| View/control | `fullscreen_label` | `fn fullscreen_label(&self) -> Option<&str>` | fullscreen widget label, `None` when not fullscreen |
| View/control | `sys_info` | `fn sys_info(&self) -> SystemInfo` | owned machine identity copy |
| View/control | `process_view` | `fn process_view(&self) -> Vec<&ProcessInfo>` | process rows the processes widget draws |
| Process mapping | `uid_to_name` | `fn uid_to_name(&self, uid: u32) -> Option<String>` | login name for a numeric uid (kernel resolves from `/etc/passwd` on unix, plus Directory Services users via `dscl` on macOS and local accounts via `Get-LocalUser` on Windows, keyed by numeric uid); default `None` — renderers fall back to the numeric uid (UX9.1) |
| Process mapping | `process_cpu_history` | `fn process_cpu_history(&self, pid: u32) -> Vec<f64>` | recent per-process CPU-usage samples (percent of one logical core), oldest → newest, ~30 samples per pid; default empty — renderers draw nothing for an empty series (UX9.1) |
| Layout options | `logical_core_count` | `fn logical_core_count(&self) -> usize` | logical processors the host reports; default `1` reproduces the pre-DR-UX1 behavior for renderers that ignore it |
| Layout options | `widget_options` | `fn widget_options(&self) -> Option<&serde_json::Value>` | `options` object of the widget being rendered (`None` when the layout node carries none); default `None`; renderers must treat `None` as default behavior |

The five methods under "Layout options" and "Process mapping" (DR-UX1/UX3/
UX5/UX9.1 additions) come with **default impls**, so existing implementors
compile unchanged and output without `options` is byte-identical to the
pre-options behavior. `logical_core_count` lets a renderer normalize a
per-process (or per-core) CPU usage — a fraction of one logical core — into
a share of the whole machine's CPU (`CpuBasis::Total` display); the kernel
implements it from `available_parallelism`. `widget_options` carries the
per-instance display options from the layout node while that widget is
drawn; the value is never `null`, is only valid during the render call, and
unknown keys must be ignored. `process_sort_desc` feeds the processes
widget's direction marker (`▼` descending / `▲` ascending) on the sorted
column header; the kernel returns its live `cycle_sort` flag. The three
History methods added for the UX8 data surface (`disk_read_history`,
`disk_write_history`, `load_history`) also ship with default empty
implementations: they are bounded histories the kernel feeds per tick
(aggregate disk rates in bytes/s and the 1-minute load average), and
implementors that do not track them yet keep compiling unchanged. The two
UX9.1 process helpers default to `None` / an empty series: `uid_to_name`
resolves a numeric uid to a login name (the uid→name mapping is a display
concern and deliberately lives on the state view, not in the data model —
renderers fall back to the numeric uid), and `process_cpu_history` returns
the bounded per-process CPU samples (oldest → newest) for a small braille
spark, empty for untracked pids.

Semantics worth noting:

- **Glyph style is resolved**: the kernel resolves per-widget overrides
  against the global style (`UiStyle::charset_for/borders_for` in the
  kernel config), so the renderer must not resolve anything itself — the
  contract already returned the effective choice for the named widget.
- **History is `(f64, f64)` pairs** — x (tick/elapsed coordinate) and y
  (value), the shape ratatui `Chart` datasets consume. Network history
  tracks rates, not cumulative counters, so charts show throughput; the
  same holds for the disk read/write rate histories (aggregate bytes/s
  across disks). `load_history` tracks the 1-minute load average. All
  histories are bounded to the kernel's `history_points`.
- **`process_view`** is the single per-tick sample filtered by the active
  search query and sorted by the user's chosen column; selection is anchored
  by PID so highlight and the kill action always agree on the same row.
- **`snapshot` returns a reference** (`Option<&SystemSnapshot>`) — borrow
  the sample; never clone it per frame. `sys_info` is the one owned copy
  (cheap, slowly changing).

## `WidgetRenderer` and `WidgetRegistration`

```rust
pub type WidgetRenderer =
    Arc<dyn Fn(&mut Frame, &dyn WidgetState, Rect) + Send + Sync>;

pub struct WidgetRegistration {
    pub name: String,        // widget name as layouts use it
    pub render: WidgetRenderer,
}
```

A pack registers one renderer per widget **name**. `WidgetRegistration` is
the canonical registration type (DR-2; nothing outside `widget-api` defines
it — workspace grep gate M7.4). Packs today return their registry directly
as `HashMap<&'static str, WidgetRenderer>` (`registry()` in the widgets
repo); the engine resolves `(pack, name)` at render time.

## Glyph enums and their serde values

Both enums live in `glyph.rs`, are re-exported at the crate root, and derive
`Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize` with
`#[serde(rename_all = "snake_case")]` — these are the values the kernel
persists in the user config (`UiStyle`/`WidgetStyle` in the kernel config
schema).

| Enum | Variants | Default | JSON (serde) |
|---|---|---|---|
| `ChartCharset` | `Braille`, `Dot`, `Block`, `HalfBlock`, `Bar` | `Braille` | `"braille"`, `"dot"`, `"block"`, `"half_block"`, `"bar"` |
| `WidgetBorders` | `Native`, `Rounded`, `Double`, `Plain`, `Ascii` | `Native` | `"native"`, `"rounded"`, `"double"`, `"plain"`, `"ascii"` |

## Canonical glyph helpers (`xtop_widget_api::glyph`)

Packs MUST NOT re-implement these mappings — they import them here, so the
same configuration draws identically in every pack. The kernel only stores
the contract enums; turning them into glyphs is this module's job. In-crate
tests pin every row of the mapping tables below.

```rust
// The one canonical import path (helpers are not re-exported at the root):
use xtop_widget_api::glyph::{ASCII_BORDER, border_for, marker_for, to_color};
```

### `to_color`

```rust
pub fn to_color(palette_entry: [u8; 3]) -> ratatui::style::Color
```

Returns `Color::Rgb(r, g, b)` verbatim for the triple — palette entries are
already 24-bit RGB, so no quantization is applied. Note the by-value `[u8; 3]`
parameter (the packs' private copies take `&[u8; 3]`; call sites adapt by
dropping the reference when they migrate, M3).

### `border_for` and `ASCII_BORDER`

```rust
pub const ASCII_BORDER: ratatui::symbols::border::Set<'static> = /* + - | frame */;
pub fn border_for(borders: WidgetBorders) -> ratatui::symbols::border::Set<'static>
```

ratatui's `symbols::border` module no longer ships an ASCII set (its `PLAIN`
is the single-line box-drawing frame since ratatui 0.29), so the contract
provides the canonical one. Both `Plain` and `Ascii` map to it; packs must
not hand-roll their own copy. Mapping decisions (one border look per ratatui
set, no pack-specific divergence):

| `WidgetBorders` | `border_for` returns | Look |
|---|---|---|
| `Native` | `ratatui::symbols::border::PLAIN` | standard single-line box drawing (`┌─┐│└┘`), ratatui's own default set — the classic look |
| `Rounded` | `border::ROUNDED` | box drawing with rounded corners |
| `Double` | `border::DOUBLE` | double-line box drawing |
| `Plain` | `ASCII_BORDER` | pure ASCII `+ - \|` frame |
| `Ascii` | `ASCII_BORDER` | same frame (`Ascii` is an explicit config spelling of the same intent) |

`ASCII_BORDER` glyphs (coded exactly so, and asserted by test):

| Glyph | Value |
|---|---|
| `top_left` | `"+"` |
| `top_right` | `"+"` |
| `bottom_left` | `"+"` |
| `bottom_right` | `"+"` |
| `vertical_left` | `"\|"` |
| `vertical_right` | `"\|"` |
| `horizontal_top` | `"-"` |
| `horizontal_bottom` | `"-"` |

### `marker_for`

```rust
pub fn marker_for(charset: ChartCharset) -> ratatui::symbols::Marker
```

The mapping mirrors the ratatui marker of the same name:

| `ChartCharset` | `marker_for` returns |
|---|---|
| `Braille` | `Marker::Braille` |
| `Dot` | `Marker::Dot` |
| `Block` | `Marker::Block` |
| `HalfBlock` | `Marker::HalfBlock` |
| `Bar` | `Marker::Bar` |

A pack that needs a different glyph for the same config must not re-implement
the table; it diverges deliberately and documents why.

## DR-2 rule in practice: packs import, never re-implement

Before this contract existed, every pack re-implemented `to_color`,
`border_for`, `marker_for` and an ASCII set by hand — and the copies already
disagreed (the base pack mapped `Plain` to the box-drawing `PLAIN`, the
blocks pack mapped it to its own ASCII frame). The migration (widgets repo,
M3.3/M3.4):

- the base pack's `util.rs` deletes its `to_color`/`border_for`/`marker_for`/
  `ascii_border` copies and imports the canonical ones; pack-private
  formatting helpers (`format_bytes`, `format_uptime`, `gauge_gradient`)
  stay pack-private where still used;
- the blocks pack deletes its hand-rolled `to_color`/`ascii_border`/
  `border_for`, drops its `const _: ChartCharset` lint hack, and honors
  `state.charset(widget)` instead of hardcoding `Marker::Block`.

The `Plain`/`Ascii` divergence disappears by construction: both spellings
are ASCII here.

## Plugin widgets vs pack registrations

`xtop-widget-api`'s `WidgetRegistration` draws over `&dyn WidgetState` — the
pack view. `xtop-plugin-api`'s `PluginWidget` draws over `&dyn HostState` —
the plugin view (see [plugin-contract.md](plugin-contract.md)). The two are
distinct contracts and deliberately do not share a name (M1.3). In the
kernel render engine the resolution order is: **plugin widgets first, then
the user's chosen pack for the name, then the default pack** (kernel
`ui/layout/engine.rs` + `ui/screen.rs`): plugin widgets can replace any
name.

## Implementing a pack

A pack is a crate that returns a name → renderer registry. Widget renderers
are plain functions with the exact signature `fn(&mut Frame, &dyn WidgetState,
Rect)`:

```rust
use std::collections::HashMap;
use std::sync::Arc;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders};
use ratatui::Frame;
use xtop_widget_api::glyph::{border_for, to_color};
use xtop_widget_api::{WidgetRenderer, WidgetState};

pub fn registry() -> HashMap<&'static str, WidgetRenderer> {
    let mut m: HashMap<&'static str, WidgetRenderer> = HashMap::new();
    m.insert("cpu", Arc::new(cpu::render));
    m.insert("memory", Arc::new(memory::render));
    m
}

pub mod cpu {
    use super::*;

    pub fn render(f: &mut Frame, state: &dyn WidgetState, area: Rect) {
        let Some(snap) = state.snapshot() else { return }; // None before first tick
        let fg = to_color(*state.theme_fg()); // canonical helper takes [u8; 3] by value
        let bg = to_color(*state.theme_bg());
        let block = Block::default()
            .borders(Borders::ALL)
            .border_set(border_for(state.borders("cpu")))
            .style(Style::default().fg(fg).bg(bg));
        f.render_widget(block, area);
        // Draw into block.inner(area): gauges per core from `snap.cpus`,
        // charts from state.cpu_history() with marker_for(state.charset("cpu")).
        let _ = snap;
    }
}
```

Rules of the road for pack authors:

- Render only from `WidgetState`; never name kernel types. The base pack
  (`xtop-widgets`) provides the classic names used by the default layouts —
  `header`, `cpu`, `memory`, `storage`, `network`, `processes`, `disk_io`,
  `battery`, `gpu` — and alternate packs may replace any of them by name.
- Guard for `snapshot() == None` (first tick) and for small/empty areas;
  renderers must never panic on small/empty state.
- Use the canonical glyph helpers; any deliberate divergence must be
  documented (e.g. an alternate visual interpretation of a charset).
- Widget style choices come resolved from the contract
  (`state.charset(name)`, `state.borders(name)`); do not resolve config
  yourself.
