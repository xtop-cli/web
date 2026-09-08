# Data model — `xtop_plugin_api::model`

The shared system data model lives in `xtop_plugin_api::model`
(`api/crates/plugin-api/src/model.rs`). DR-1 makes this module the single
source of truth: every struct below is defined once, here, and imported by
every other repo — never redefined.

All model structs derive `Debug, Clone`; only `SystemInfo` derives `Default`
(so providers can hand out an "empty" system info without inventing values).
None of the model types derive serde: they cross repo boundaries as plain
Rust values. Serde derives are reserved for types that are persisted or
configured: `AlertThresholds` (kernel config, see below) and the glyph enums
in `xtop-widget-api`.

Population facts in this document are grounded in the kernel's sysinfo
provider (`xtop/src/providers/sysinfo/provider.rs`) and the platform probes
under `xtop/src/providers/sysinfo/platform/`, which implement the contract's
`SystemDataProvider`. "Extras" (batteries, GPUs, per-interface IPs, thread
counts, mount options, governors) come from the platform trees; the sysinfo
crate provides the rest. Platform coverage: Linux reads `/sys` and `/proc`;
macOS implements batteries (`pmset`), interface IPs (`getifaddrs`), mount
options (`mount(8)`), thread counts (`proc_pidinfo`) and Directory Services
users (`dscl`) under `platform/macos/`; Windows implements batteries
(`GetSystemPowerStatus`), interface IPs (`GetAdaptersAddresses`), mount
options (`GetLogicalDrives`/`GetVolumeInformationW`), thread counts
(toolhelp snapshots) and local-account users (`Get-LocalUser`, numeric
RIDs) under `platform/windows/`. Fallback platforms return empty values.

## Struct inventory

| Struct | Role |
|---|---|
| `SystemSnapshot` | One sample of the whole machine, assembled once per tick. Container for every metric group below. |
| `CpuInfo` | One logical CPU core. |
| `MemoryInfo` | Physical memory totals/usage, with a percent. |
| `SwapInfo` | Swap totals/usage, with a percent. |
| `DiskInfo` | One mounted filesystem. |
| `DiskIOInfo` | Per-mount cumulative bytes and current throughput. |
| `NetworkInfo` | One network interface: cumulative bytes, current throughput, IPs. |
| `ProcessInfo` | One process, with the full forensic field set (P0/P1/P2 groups below). |
| `LoadAvg` | 1/5/15-minute load averages. |
| `BatteryInfo` | One battery (platform probe). |
| `GpuInfo` | One GPU (nvidia-smi probe, sysfs fallback). |
| `SystemInfo` | Slowly changing machine identity (hostname, OS, kernel, desktop, shell, CPU model, package power). |

`SystemSnapshot` fields: `cpus`, `memory`, `swap`, `disks`, `networks`,
`processes`, `load_avg`, `uptime`, `cpu_temp`, `disk_io`, `batteries`,
`gpus`, `sys_info`.

## What the kernel provider populates

The kernel's `SysinfoProvider` populates the snapshot as follows (line
references are to `xtop/src/providers/sysinfo/provider.rs` in the sibling
kernel repo, read-only reference):

| Struct / field | Source |
|---|---|
| `CpuInfo { name, usage, cpu_id, frequency, governor, temp_c }` | sysinfo `cpus()` per core; `cpu_id` is the enumeration index; `governor` from the platform probe `read_cpu_governor(i)`; `temp_c` per-core °C from the platform probe `read_core_temps` — Linux coretemp when the sensors map onto the logical cores, `None` everywhere else (macOS and Windows have no per-core sensor source — Windows thermal zones are aggregate, read via WMI by sysinfo `Components` for `cpu_temp` — or Linux hosts without readable per-core sensors) |
| `MemoryInfo { total, used, available, free, percent }` | sysinfo memory getters; `percent = used/total*100`, `0.0` when total is 0 |
| `SwapInfo { total, used, free, percent }` | sysinfo swap getters; same percent rule |
| `DiskInfo { mount_point, total_space, available_space, used_space, percent, file_system, mount_options }` | sysinfo `Disks`; `used = total - available`; `mount_options` looked up from the platform probe `read_mount_options()` |
| `DiskIOInfo { name, read_bytes, write_bytes, read_speed, write_speed }` | sysinfo `DiskUsage`; speeds are byte deltas since the previous refresh over the elapsed time |
| `NetworkInfo { name, received, transmitted, rx_speed, tx_speed, ip }` | sysinfo `Networks`; speeds computed from deltas since the previous refresh; `ip` from `read_interface_ips()` |
| `ProcessInfo` | sysinfo `processes()` (see the P0/P1/P2 groups below) |
| `LoadAvg { one, five, fifteen }` | `System::load_average()` |
| `BatteryInfo` | platform `read_batteries()` — Linux `/sys/class/power_supply`, macOS `pmset`, Windows `GetSystemPowerStatus` (single aggregate battery); fallback platforms empty |
| `GpuInfo` | `read_gpu_info()`: shared nvidia-smi probe first, then the platform sysfs fallback when the list is empty |
| `SystemInfo { hostname, os_version, kernel, desktop_env, shell, cpu_model, package_power_w }` | host/os/kernel/desktop/shell captured **once at provider construction**: `System::host_name()`, `System::long_os_version()`, `System::kernel_version()`, `XDG_CURRENT_DESKTOP`/`DESKTOP_SESSION`, `SHELL`/`ComSpec`; cached on the provider. `cpu_model` = the sysinfo CPU **brand** string of the first logical core at construction (`System::cpus()[0].brand()`, e.g. "Intel(R) Core(TM) i7-14650HX"); sysinfo fills it on every platform it supports — an empty brand yields `None`. `package_power_w` is sampled **every refresh** from the Linux RAPL probe (see below); `None` when no readable RAPL source exists |
| `SystemInfo::package_power_w` (Linux RAPL probe) | instantaneous package power in watts, computed from Intel RAPL energy-counter **deltas** at the refresh cadence. Sources, in priority order: (1) `/sys/class/powercap/intel-rapl:<n>/energy_uj` for every domain whose `name` file reads `package-0` (one per socket; the readings are summed), falling back to the lowest-index `intel-rapl:<n>` domain when no `name` matches; (2) hwmon `energy*_input` under `/sys/class/hwmon/hwmon*/name` == `powercap`, first sensor only. Readings are in microjoules; wattage = `delta_energy_uj / 1_000_000 / elapsed_secs` with wrap-around-safe deltas (counters wrap at `max_energy_range_uj`). The first sample after boot establishes a baseline and yields `None` (no previous counter); an unreadable source (absent driver, permission denied, transient read failure) also yields `None` and resets the baseline — the value is never fabricated. macOS and Windows keep `None` (no public RAPL/package power source on either platform) and fallback platforms stub the probe to `None` |
| `SystemSnapshot::cpu_temp` | maximum temperature over sysinfo `Components` |
| `SystemSnapshot::uptime` | `System::uptime()` (seconds) |

### `ProcessInfo` — field groups

The struct carries 22 fields in groups, all populated by the kernel (the
P0/P1/P2 markers below follow the provider source):

- Base: `pid`, `name`, `cpu_usage`, `memory`, `user_id`, `state`, `cmd`
  (first argv element).
- P0 (process identity): `exe_path`, `parent_pid`, `cmd_full` (full argv).
- P1 (forensics): `start_time` (epoch seconds — the provider converts
  sysinfo's boot-relative start via `boot_epoch = now - uptime` so consumers
  compare against one clock), `run_time` (`now - start_time`),
  `effective_user_id`, `group_id`, `cwd`, `thread_count` (platform probe
  `read_thread_count`).
- P2 (resources): `open_files`, `open_files_limit`, `disk_total_read_bytes`,
  `disk_total_write_bytes`, `environ`, `session_id`.

Field count: 22 (7 base + 3 P0 + 6 P1 + 6 P2).

The UX9.1 process row needs (program + command + user name) are fully
covered by this set — no fields were added: `cmd`/`cmd_full`/`exe_path`
carry the program and its command line, and `user_id` (plus
`effective_user_id`) carries the numeric uid as a string. The uid → login
name mapping is **not** part of the data model (it is a display mapping):
widgets resolve it through `WidgetState::uid_to_name(uid)` (widget-api; the
kernel reads `/etc/passwd` on unix, plus Directory Services users on macOS
and local accounts on Windows, keyed by the numeric uid — Windows exposes
the SID's numeric RID as `user_id`)
and fall back to the numeric uid when no name exists. The recent per-process
CPU samples a braille spark draws also live on the widget view, not in the
model: `WidgetState::process_cpu_history(pid)` returns the bounded per-pid
series the kernel feeds each tick (see widget-contract.md).

Two ordering rules apply to `snapshot().processes`:

1. The provider pre-sorts by `cpu_usage` descending and truncates to a cap
   (`DEFAULT_MAX_PROCESSES = 200`, overridable through `XTOP_MAX_PROCESSES`)
   so per-tick work stays bounded.
2. The contract's `PluginContext::top_processes(n)` re-sorts and truncates
   itself, so the plugin-facing guarantee ("top n by CPU") never depends on
   producer ordering (see [plugin-contract.md](plugin-contract.md)).

## Snapshot lifecycle

One `SystemSnapshot` is produced per monitoring tick:

1. The kernel ticks at the configured interval (default `update_interval_ms`
   = 1000 in the kernel's `Config` default; `AppState::on_tick` in
   `xtop/src/state/app.rs`).
2. `provider.refresh_all()` refreshes sysinfo, disks, networks and
   components, and records the byte counters as baselines for the *next*
   rate computation (`prev_net_*`, `prev_disk_*` maps and `last_refresh`).
3. `provider.snapshot()` assembles the structs above into one
   `SystemSnapshot`.
4. The kernel caches the sample on `AppState` (`last_snapshot`) and every
   widget/action in that frame reads the same cached sample
   (`AppState::snapshot_cache()`); the render path never resamples the
   system. History buffers (per-core CPU, memory percent, summed network
   rx/tx *rates*) are pushed from the same sample.
5. Plugin tick handlers then run against a `PluginContext` whose read methods
   return the same snapshot family.

Before the first tick there is no sample: the widget view
(`WidgetState::snapshot()`) returns `None`, and the plugin host view
(`HostState::snapshot()`) falls back to forcing one fresh sample
(`AppState::snapshot()` clones the cache or samples once).

## Deliberately removed — Docker surface

M1.4 removed the dead Docker model surface from the contract:

- `DockerInfo` struct (was in `model.rs`),
- `SystemSnapshot::dockers` field,
- `SystemDataProvider::docker_info` default method and its root re-export.

Reason: nothing in the ecosystem consumed them. The kernel's sysinfo
provider always assigned an empty `dockers: vec![]`, and no widget, plugin
or extension read the field or the method. A repo-wide grep for
"docker"/"DockerInfo" is now empty inside `api`.

The kernel working tree still contains the stale references
(`dockers: vec![]` in `xtop/src/providers/sysinfo/provider.rs` and the
`docker_info()` override in `xtop/src/providers/composite.rs`); those are
kernel-side removals tracked as M2.4 and will disappear when the kernel
starts consuming this revision of the contract (see
[changes.md](changes.md)).

## `AlertThresholds` — serde contract

`AlertThresholds` lives in `xtop_plugin_api::host` (not in `model`) and is
re-exported at the crate root. It derives `Debug, Clone, Serialize,
Deserialize` (M1.2) — and deliberately nothing else: no `Default`, `Copy`
or `PartialEq` were added to the contract type (decision D8); the kernel
keeps its own defaults until M2 adopts the api type.

```rust
pub struct AlertThresholds {
    pub cpu_high: f64,
    pub mem_high: f64,
    pub disk_high: f64,
}
```

Serde contract: plain field names, **no rename attributes**. The JSON keys
are exactly `cpu_high`, `mem_high`, `disk_high` — the same keys the kernel
persists in its JSON config today (`Config.alerts` in
`xtop/src/config/schema.rs` uses an identical struct layout; M2.2 replaces
that kernel copy with this type). The in-crate round-trip test pins the exact
serialized form:

```json
{"cpu_high":90.0,"mem_high":85.5,"disk_high":88.0}
```
