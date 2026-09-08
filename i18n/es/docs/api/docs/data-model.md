# Modelo de datos — `xtop_plugin_api::model`

El modelo de datos compartido del sistema vive en `xtop_plugin_api::model`
(`api/crates/plugin-api/src/model.rs`). DR-1 convierte este módulo en la
única fuente de verdad: cada struct siguiente se define una sola vez, aquí,
y lo importa cualquier otro repo — nunca se redefine.

Todos los structs del modelo derivan `Debug, Clone`; solo `SystemInfo`
deriva `Default` (para que los providers puedan entregar una "información de
sistema" vacía sin inventar valores). Ninguno de los tipos del modelo deriva
serde: cruzan las fronteras entre repos como valores Rust planos. Los derives
de serde están reservados para los tipos que se persisten o se configuran:
`AlertThresholds` (config del kernel, ver más abajo) y los enums de glifos de
`xtop-widget-api`.

Los hechos de población de este documento se fundamentan en el provider
sysinfo del kernel (`xtop/src/providers/sysinfo/provider.rs`) y en las sondas
de plataforma bajo `xtop/src/providers/sysinfo/platform/`, que implementan el
`SystemDataProvider` del contrato. Los "extras" (baterías, GPUs, IPs por
interfaz, recuentos de hilos, opciones de montaje, governors) provienen de
los árboles de plataforma; el crate sysinfo aporta el resto. Cobertura de
plataformas: Linux lee `/sys` y `/proc`; macOS implementa baterías (`pmset`),
IPs de interfaz (`getifaddrs`), opciones de montaje (`mount(8)`), recuentos
de hilos (`proc_pidinfo`) y usuarios de Directory Services (`dscl`) bajo
`platform/macos/`; Windows implementa baterías (`GetSystemPowerStatus`), IPs
de interfaz (`GetAdaptersAddresses`), opciones de montaje
(`GetLogicalDrives`/`GetVolumeInformationW`), recuentos de hilos (instantáneas
toolhelp) y usuarios de cuentas locales (`Get-LocalUser`, RIDs numéricos)
bajo `platform/windows/`. Las plataformas de respaldo devuelven valores
vacíos.

## Inventario de structs

| Struct | Rol |
|---|---|
| `SystemSnapshot` | Una muestra de toda la máquina, ensamblada una vez por tick. Contenedor de cada grupo de métricas siguiente. |
| `CpuInfo` | Un núcleo de CPU lógico. |
| `MemoryInfo` | Totales/uso de la memoria física, con un porcentaje. |
| `SwapInfo` | Totales/uso del swap, con un porcentaje. |
| `DiskInfo` | Un sistema de archivos montado. |
| `DiskIOInfo` | Bytes acumulados por montaje y rendimiento actual. |
| `NetworkInfo` | Una interfaz de red: bytes acumulados, rendimiento actual, IPs. |
| `ProcessInfo` | Un proceso, con el conjunto completo de campos forenses (grupos P0/P1/P2 siguientes). |
| `LoadAvg` | Medias de carga de 1/5/15 minutos. |
| `BatteryInfo` | Una batería (sonda de plataforma). |
| `GpuInfo` | Una GPU (sonda nvidia-smi, respaldo sysfs). |
| `SystemInfo` | Identidad de la máquina que cambia lentamente (hostname, SO, kernel, escritorio, shell, modelo de CPU, potencia del paquete). |

Campos de `SystemSnapshot`: `cpus`, `memory`, `swap`, `disks`, `networks`,
`processes`, `load_avg`, `uptime`, `cpu_temp`, `disk_io`, `batteries`,
`gpus`, `sys_info`.

## Qué rellena el provider del kernel

El `SysinfoProvider` del kernel rellena la instantánea como sigue (las
referencias de línea remiten a `xtop/src/providers/sysinfo/provider.rs` del
repo hermano del kernel, referencia de solo lectura):

| Struct / campo | Fuente |
|---|---|
| `CpuInfo { name, usage, cpu_id, frequency, governor, temp_c }` | `cpus()` de sysinfo por núcleo; `cpu_id` es el índice de enumeración; `governor` desde la sonda de plataforma `read_cpu_governor(i)`; `temp_c` °C por núcleo desde la sonda de plataforma `read_core_temps` — coretemp de Linux cuando los sensores se corresponden con los núcleos lógicos, `None` en cualquier otro caso (macOS y Windows no tienen fuente de sensor por núcleo — las zonas térmicas de Windows son agregadas, se leen vía WMI por los `Components` de sysinfo para `cpu_temp` — ni los hosts Linux sin sensores por núcleo legibles) |
| `MemoryInfo { total, used, available, free, percent }` | getters de memoria de sysinfo; `percent = used/total*100`, `0.0` cuando total es 0 |
| `SwapInfo { total, used, free, percent }` | getters de swap de sysinfo; la misma regla de porcentaje |
| `DiskInfo { mount_point, total_space, available_space, used_space, percent, file_system, mount_options }` | `Disks` de sysinfo; `used = total - available`; `mount_options` se consulta desde la sonda de plataforma `read_mount_options()` |
| `DiskIOInfo { name, read_bytes, write_bytes, read_speed, write_speed }` | `DiskUsage` de sysinfo; las velocidades son deltas de bytes desde el refresh anterior sobre el tiempo transcurrido |
| `NetworkInfo { name, received, transmitted, rx_speed, tx_speed, ip }` | `Networks` de sysinfo; las velocidades se calculan a partir de deltas desde el refresh anterior; `ip` desde `read_interface_ips()` |
| `ProcessInfo` | `processes()` de sysinfo (ver los grupos P0/P1/P2 siguientes) |
| `LoadAvg { one, five, fifteen }` | `System::load_average()` |
| `BatteryInfo` | `read_batteries()` de plataforma — Linux `/sys/class/power_supply`, macOS `pmset`, Windows `GetSystemPowerStatus` (una única batería agregada); plataformas de respaldo vacías |
| `GpuInfo` | `read_gpu_info()`: primero la sonda compartida nvidia-smi y luego el respaldo sysfs de plataforma cuando la lista está vacía |
| `SystemInfo { hostname, os_version, kernel, desktop_env, shell, cpu_model, package_power_w }` | host/so/kernel/escritorio/shell capturados **una vez en la construcción del provider**: `System::host_name()`, `System::long_os_version()`, `System::kernel_version()`, `XDG_CURRENT_DESKTOP`/`DESKTOP_SESSION`, `SHELL`/`ComSpec`; almacenados en caché en el provider. `cpu_model` = la cadena **brand** de CPU de sysinfo del primer núcleo lógico en la construcción (`System::cpus()[0].brand()`, p. ej. "Intel(R) Core(TM) i7-14650HX"); sysinfo la rellena en todas las plataformas que soporta — una brand vacía produce `None`. `package_power_w` se muestrea **en cada refresh** desde la sonda RAPL de Linux (ver más abajo); `None` cuando no existe ninguna fuente RAPL legible |
| `SystemInfo::package_power_w` (sonda RAPL de Linux) | potencia instantánea del paquete en vatios, calculada a partir de **deltas** de los contadores de energía RAPL de Intel a la cadencia del refresh. Fuentes, por orden de prioridad: (1) `/sys/class/powercap/intel-rapl:<n>/energy_uj` para cada dominio cuyo archivo `name` lee `package-0` (uno por socket; las lecturas se suman), con respaldo al dominio `intel-rapl:<n>` de índice más bajo cuando ningún `name` coincide; (2) `energy*_input` de hwmon bajo `/sys/class/hwmon/hwmon*/name` == `powercap`, solo el primer sensor. Las lecturas están en microjulios; los vatios = `delta_energy_uj / 1_000_000 / elapsed_secs` con deltas a prueba de wraparound (los contadores dan la vuelta en `max_energy_range_uj`). La primera muestra tras el arranque establece una línea base y produce `None` (sin contador previo); una fuente ilegible (driver ausente, permiso denegado, fallo de lectura transitorio) también produce `None` y reinicia la línea base — el valor nunca se fabrica. macOS y Windows mantienen `None` (ninguna fuente RAPL/potencia de paquete pública en ninguna de las dos plataformas) y las plataformas de respaldo ponen la sonda a `None` |
| `SystemSnapshot::cpu_temp` | temperatura máxima sobre los `Components` de sysinfo |
| `SystemSnapshot::uptime` | `System::uptime()` (segundos) |

### `ProcessInfo` — grupos de campos

El struct lleva 22 campos agrupados, todos rellenados por el kernel (los
marcadores P0/P1/P2 siguientes siguen el código fuente del provider):

- Base: `pid`, `name`, `cpu_usage`, `memory`, `user_id`, `state`, `cmd`
  (primer elemento de argv).
- P0 (identidad del proceso): `exe_path`, `parent_pid`, `cmd_full` (argv
  completo).
- P1 (forense): `start_time` (segundos de época — el provider convierte el
  inicio relativo al arranque de sysinfo mediante `boot_epoch = now - uptime`
  para que los consumidores comparen contra un único reloj), `run_time`
  (`now - start_time`), `effective_user_id`, `group_id`, `cwd`,
  `thread_count` (sonda de plataforma `read_thread_count`).
- P2 (recursos): `open_files`, `open_files_limit`,
  `disk_total_read_bytes`, `disk_total_write_bytes`, `environ`,
  `session_id`.

Recuento de campos: 22 (7 base + 3 P0 + 6 P1 + 6 P2).

Las necesidades de la fila de procesos UX9.1 (programa + comando + nombre de
usuario) quedan totalmente cubiertas por este conjunto — no se añadió ningún
campo: `cmd`/`cmd_full`/`exe_path` portan el programa y su línea de comandos,
y `user_id` (además de `effective_user_id`) porta el uid numérico como
cadena. El mapeo uid → nombre de login **no** forma parte del modelo de datos
(es un mapeo de visualización): los widgets lo resuelven a través de
`WidgetState::uid_to_name(uid)` (widget-api; el kernel lee `/etc/passwd` en
unix, además de los usuarios de Directory Services en macOS y las cuentas
locales en Windows, indexados por el uid numérico — Windows expone el RID
numérico del SID como `user_id`)
y se quedan con el uid numérico cuando no existe ningún nombre. Las muestras
de CPU por proceso recientes que dibuja un spark de braille también viven en
la vista del widget, no en el modelo: `WidgetState::process_cpu_history(pid)`
devuelve la serie por pid acotada que el kernel alimenta cada tick (ver
widget-contract.md).

Dos reglas de orden se aplican a `snapshot().processes`:

1. El provider pre-ordena por `cpu_usage` descendente y trunca hasta un tope
   (`DEFAULT_MAX_PROCESSES = 200`, sobrescribible mediante
   `XTOP_MAX_PROCESSES`) para que el trabajo por tick siga siendo acotado.
2. El `PluginContext::top_processes(n)` del contrato re-ordena y trunca por
   sí mismo, así que la garantía orientada al plugin ("top n por CPU") nunca
   depende del orden del productor (ver [plugin-contract.md](plugin-contract.md)).

## Ciclo de vida de la instantánea

Se produce una `SystemSnapshot` por tick de monitorización:

1. El kernel hace tick al intervalo configurado (por defecto
   `update_interval_ms` = 1000 en el `Config` por defecto del kernel;
   `AppState::on_tick` en `xtop/src/state/app.rs`).
2. `provider.refresh_all()` refresca sysinfo, los discos, las redes y los
   components, y registra los contadores de bytes como líneas base para el
   cálculo de la tasa *siguiente* (mapas `prev_net_*`, `prev_disk_*` y
   `last_refresh`).
3. `provider.snapshot()` ensambla los structs anteriores en una
   `SystemSnapshot`.
4. El kernel guarda en caché la muestra en `AppState` (`last_snapshot`) y
   cada widget/acción de ese frame lee la misma muestra cacheada
   (`AppState::snapshot_cache()`); la ruta de renderizado nunca vuelve a
   muestrear el sistema. Los buffers de historial (CPU por núcleo, porcentaje
   de memoria, *tasas* rx/tx de red sumadas) se alimentan desde la misma
   muestra.
5. Los handlers de tick de los plugins se ejecutan después contra un
   `PluginContext` cuyos métodos de lectura devuelven la misma familia de
   instantáneas.

Antes del primer tick no hay muestra: la vista de widgets
(`WidgetState::snapshot()`) devuelve `None`, y la vista de host de plugins
(`HostState::snapshot()`) recurre a forzar una muestra nueva (`AppState::snapshot()`
clona la caché o muestrea una vez).

## Eliminado deliberadamente — superficie Docker

M1.4 eliminó del contrato la superficie muerta del modelo de Docker:

- el struct `DockerInfo` (estaba en `model.rs`),
- el campo `SystemSnapshot::dockers`,
- el método por defecto `SystemDataProvider::docker_info` y su re-export en
  la raíz.

Motivo: nada en el ecosistema los consumía. El provider sysinfo del kernel
siempre asignaba un `dockers: vec![]` vacío, y ningún widget, plugin o
extensión leía el campo ni el método. Un grep en todo el repo de
"docker"/"DockerInfo" está ahora vacío dentro de `api`.

El árbol de trabajo del kernel todavía contiene las referencias obsoletas
(`dockers: vec![]` en `xtop/src/providers/sysinfo/provider.rs` y la
sobrescritura de `docker_info()` en `xtop/src/providers/composite.rs`); esas
son eliminaciones del lado del kernel registradas como M2.4 y desaparecerán
cuando el kernel empiece a consumir esta revisión del contrato (ver
[changes.md](changes.md)).

## `AlertThresholds` — contrato serde

`AlertThresholds` vive en `xtop_plugin_api::host` (no en `model`) y se
re-exporta en la raíz del crate. Deriva `Debug, Clone, Serialize,
Deserialize` (M1.2) — y deliberadamente nada más: no se añadieron `Default`,
`Copy` ni `PartialEq` al tipo de contrato (decisión D8); el kernel conserva
sus propios valores por defecto hasta que M2 adopte el tipo de api.

```rust
pub struct AlertThresholds {
    pub cpu_high: f64,
    pub mem_high: f64,
    pub disk_high: f64,
}
```

Contrato serde: nombres de campo simples, **sin atributos rename**. Las
claves JSON son exactamente `cpu_high`, `mem_high`, `disk_high` — las mismas
claves que el kernel persiste hoy en su config JSON (`Config.alerts` en
`xtop/src/config/schema.rs` usa un layout de struct idéntico; M2.2 sustituye
esa copia del kernel por este tipo). El test de ida y vuelta dentro del crate
fija la forma serializada exacta:

```json
{"cpu_high":90.0,"mem_high":85.5,"disk_high":88.0}
```
