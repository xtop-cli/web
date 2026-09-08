# Contrato de plugins — `xtop-plugin-api`

`xtop-plugin-api` (`api/crates/plugin-api/`) es el protocolo de plugins
compartido de xtop (DR-1). Dos partes implementan contra él:

- el **host** (el kernel `xtop`) proporciona un `HostState` y entrega a los
  plugins un `PluginContext` sobre él;
- los **plugins** (el repo `xtop-cli/plugins`, p. ej. `xtop-plugin-samurai`)
  implementan `Plugin` y actúan a través de ese contexto.

El crate nunca depende del kernel, así que cualquier repo puede consumirlo de
forma independiente. Solo depende de ratatui (por el tipo `Frame` en la
closure de render del widget) y de serde (por `AlertThresholds`).

## Superficie pública

| Elemento | Módulo | Notas |
|---|---|---|
| trait `Plugin` | `plugin.rs` | trait central del plugin |
| `PluginManifest` | `manifest.rs` | metadatos estáticos incl. capacidades declaradas |
| `PluginContext<'a>` | `context.rs` | acceso comprobado por capacidades al estado del host + dir de datos del plugin |
| trait `HostState` | `host.rs` | vista de solo-lectura-más-acciones del kernel, implementada por el host |
| `RuntimeConfig` | `host.rs` | vista de tema/layout/intervalo/hostname |
| `AlertThresholds` | `host.rs` | tipo de contrato serde, ver [data-model.md](data-model.md) |
| trait `SystemDataProvider` | `provider.rs` | contrato de la fuente de datos (provider sysinfo del kernel, extras de plugins) |
| `PluginCapability` | `capability.rs` | capacidades declaradas + aplicadas |
| `PluginError` | `error.rs` | Recoverable / Fatal / UnknownAction |
| `PluginWidget` | `widget.rs` | registro de widget de plugin (renderiza sobre `&dyn HostState`) |
| `hex_to_rgb` | `color.rs` | `#rrggbb` → `[u8; 3]`; las entradas inválidas/cortas recurren al negro por canal |
| módulo `model` | `model.rs` | el modelo de datos compartido, ver [data-model.md](data-model.md) |

Todo excepto `model` también se re-exporta en la raíz del crate
(`xtop_plugin_api::Plugin`, `xtop_plugin_api::PluginCapability`, ...), que
es como lo importan el plugin de ejemplo de este archivo y
`xtop-plugin-samurai`.

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

El kernel lee el manifest cuando el plugin se registra para construir el
contexto (capacidades) y para crear el directorio de datos del plugin bajo su
base de datos de plugins. Los consumidores deberían tomar la versión de
`env!("CARGO_PKG_VERSION")` en lugar de fijarla a mano (M4.1 alinea a
samurai).

## Trait `Plugin`

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

Semánticas del ciclo de vida (de los docs de los métodos):

- `manifest` — metadatos estáticos; el único método sin implementación por
  defecto.
- `on_enable` / `on_disable` — se llaman una vez cada uno, al cargar/habilitar
  y al deshabilitar/apagar.
- `on_tick` — se llama en cada tick (el kernel hace tick al intervalo
  configurado; ~1 s por defecto, y los plugins como samurai dosifican su
  propio trabajo — cada 5.º tick — además de eso).
- `on_key` — eventos de tecla como cadenas; devuelve `Ok(true)` cuando se
  consume.
- `data_provider` — datos extra de sistema opcionales; el kernel fusiona el
  provider devuelto en el flujo de datos principal a través de su provider
  composite (solo en el lado del host para plugins que declararon
  `ReadSystemInfo`).
- `widget` — widget TUI personalizado opcional; renderiza contra la vista
  `HostState` (ver `PluginWidget` más abajo).
- `execute` — comandos con nombre y parámetros de cadena, usados por agentes
  externos (IA/CLI/IPC); devuelve una cadena tipo JSON. La implementación por
  defecto responde `UnknownAction`.

`Debug + Send` es toda la carga de supertraits: el manager del host encapsula
un plugin en una caja (`Box<dyn Plugin>`) y el host registra los fallos sin
tumbar la aplicación (aislamiento de errores por plugin en el `PluginManager`
del kernel).

## `PluginContext` y aplicación de capacidades

`PluginContext<'a>` envuelve un `&'a mut dyn HostState` más el directorio de
datos del plugin y sus capacidades declaradas. El estado vivo del kernel solo
es alcanzable a través de este contexto. Cada método que toca el estado
comprueba primero las capacidades declaradas del plugin; una capacidad
ausente produce `PluginError::Recoverable` con el mensaje
`plugin does not have required capability: <Debug of the capability>` (así
los plugins denegados pueden recuperarse — el error no es fatal).

| Método | Firma (real) | Capacidad requerida | Denegado → |
|---|---|---|---|
| `snapshot` | `fn snapshot(&self) -> Result<SystemSnapshot, PluginError>` | `ReadSystemInfo` | `Recoverable` |
| `system_info` | `fn system_info(&self) -> Result<SystemInfo, PluginError>` | `ReadSystemInfo` | `Recoverable` |
| `top_processes` | `fn top_processes(&self, n: usize) -> Result<Vec<ProcessInfo>, PluginError>` | `ReadSystemInfo` | `Recoverable` |
| `kill_process` | `fn kill_process(&mut self, pid: u32) -> Result<bool, PluginError>` | `KillProcesses` | `Recoverable` |
| `set_alert_thresholds` | `fn set_alert_thresholds(&mut self, cpu: f64, mem: f64, disk: f64) -> Result<(), PluginError>` | `ModifyConfig` | `Recoverable` |
| `set_theme_by_name` | `fn set_theme_by_name(&mut self, name: &str) -> Result<bool, PluginError>` | `ModifyConfig` | `Recoverable` |
| `set_layout_by_name` | `fn set_layout_by_name(&mut self, name: &str) -> Result<bool, PluginError>` | `ModifyConfig` | `Recoverable` |
| `set_update_interval` | `fn set_update_interval(&mut self, ms: u64) -> Result<(), PluginError>` | `ModifyConfig` | `Recoverable` |
| `alerts` | `fn alerts(&self) -> AlertThresholds` | ninguna | — |
| `config` | `fn config(&self) -> RuntimeConfig` | ninguna | — |
| `data_dir` | `fn data_dir(&self) -> &Path` | ninguna | — |

Detalles del contrato en los que confiar:

- **Las lecturas devuelven `Result`** (decisión D1). `snapshot`,
  `system_info` y `top_processes` aplican `ReadSystemInfo` exactamente igual
  que los métodos mutantes aplican las suyas, así que los llamadores deben
  manejar `Err`.
- **`top_processes(n)` ordena por uso de CPU descendente antes de tomar `n`**
  (`sort_by` sobre `cpu_usage` vía `total_cmp`, y después `truncate(n)` —
  decisión D2). Es una ordenación estable: los procesos con igual CPU
  conservan el orden de la instantánea. La garantía no depende del orden que
  produce la fuente de datos. Los tests dentro del crate fijan este
  comportamiento.
- **`data_dir()` lo proporciona el host.** La ruta la decide el kernel y se
  pasa a `PluginContext::new`; el contrato no prescribe deliberadamente una
  ubicación concreta (M1.2 arregló un doc sobre-especificado). Los plugins
  pueden persistir estado por plugin dentro de él; el kernel lo crea en el
  registro (`PluginManager::register` une el directorio base con el id del
  plugin).
- `alerts`, `config` y `data_dir` son lecturas sin gate disponibles para
  todos los plugins.
- `PluginContext::new(host, plugin_data_dir: PathBuf, capabilities: Vec<PluginCapability>)`
  es público; hoy el kernel es su único llamador.

Variantes de `PluginCapability` (`#[non_exhaustive]`, deriva `Clone, Debug,
PartialEq`): `ReadSystemInfo`, `KillProcesses`, `ModifyConfig`,
`RenderWidgets`, y `Custom(String)` para lo no cubierto. Existen dos puntos
de aplicación: las llamadas `check_capability` anteriores (en este crate)
para los métodos del contexto, y filtros del lado del host en el
`PluginManager` del kernel, que solo recoge `data_provider()`s de plugins que
declararon `ReadSystemInfo` y solo recoge `widget()`s de plugins que
declararon `RenderWidgets`. `Custom(String)` no tiene todavía ningún check
integrado en ningún sitio — es la vía de escape para permisos específicos del
ecosistema que el host pueda empezar a honrar más adelante.

## `HostState`

La superficie del lado del kernel que un plugin puede tocar; el kernel la
implementa para su estado de aplicación vivo (`impl HostState for AppState`
en el `xtop/src/plugins/host.rs` del kernel). Los plugins nunca dependen de
tipos del kernel — solo de este trait. **El trait tiene 9 métodos**:

| Método | Firma | Significado |
|---|---|---|
| `snapshot` | `fn snapshot(&self) -> SystemSnapshot` | muestra completa (el host puede servir la cacheada) |
| `system_info` | `fn system_info(&self) -> SystemInfo` | hostname/OS/kernel/escritorio/shell |
| `kill_process` | `fn kill_process(&mut self, pid: u32) -> bool` | enviar terminación; true si se envió la señal |
| `set_alert_thresholds` | `fn set_alert_thresholds(&mut self, cpu: f64, mem: f64, disk: f64)` | sobrescribir los tres umbrales |
| `alerts` | `fn alerts(&self) -> AlertThresholds` | umbrales actuales |
| `config` | `fn config(&self) -> RuntimeConfig` | nombre de tema, nombre de layout, `interval_ms`, hostname |
| `set_theme_by_name` | `fn set_theme_by_name(&mut self, name: &str) -> bool` | true si el tema existe |
| `set_layout_by_name` | `fn set_layout_by_name(&mut self, name: &str) -> bool` | true si el layout existe |
| `set_update_interval_ms` | `fn set_update_interval_ms(&mut self, ms: u64)` | intervalo de tick |

Los tests dentro del crate implementan un `FakeHost` mínimo con los 9 métodos
sobre una `SystemSnapshot` construida a mano — el patrón a copiar al escribir
dobles del host.

## `PluginError`

```rust
pub enum PluginError {
    Recoverable(String),   // invalid params, resource busy, capability denied — plugin keeps running
    Fatal(String),         // plugin should be disabled
    UnknownAction(String), // action not understood by this plugin
}
```

`Display`: `Recoverable` imprime el mensaje verbatim, `Fatal` imprime
`FATAL: <msg>`, `UnknownAction` imprime `unknown action: <action>`.
`PluginError` implementa `std::error::Error`. El extension host del kernel lo
mapea a `ExtensionError` al reenviar acciones de plugins a extensiones
(kernel `xtop/src/plugins/extension_host.rs`).

## `SystemDataProvider`

Fuente de datos de sistema en tiempo real (`provider.rs`). Lo implementan el
provider sysinfo del kernel y los plugins que aportan métricas extra; el
kernel fusiona los providers de los plugins en el flujo principal a través de
su provider composite.

| Método | Por defecto |
|---|---|
| `refresh_all(&mut self)` | requerido |
| `snapshot(&self) -> SystemSnapshot` | requerido |
| `disk_io(&self) -> Vec<DiskIOInfo>` | `vec![]` |
| `batteries(&self) -> Vec<BatteryInfo>` | `vec![]` |
| `gpu_info(&self) -> Vec<GpuInfo>` | `vec![]` |
| `system_info(&self) -> SystemInfo` | `SystemInfo::default()` |
| `kill_process(&self, pid: u32) -> bool` | `false` |
| `as_any(&self) -> &dyn Any` / `as_any_mut` | requerido (downcast para la composición de providers) |
| `add_extras(&mut self, Vec<Box<dyn SystemDataProvider>>)` | no-op (los providers composite lo sobrescriben) |

## `PluginWidget`

```rust
pub struct PluginWidget {
    pub name: String,
    pub render: Arc<dyn Fn(&mut ratatui::Frame, &dyn HostState, ratatui::prelude::Rect) + Send + Sync>,
}
```

Un widget que un plugin registra para el renderizado TUI. Su closure de
render dibuja contra la vista `HostState` del plugin. Este tipo es
deliberadamente distinto del `WidgetRegistration` de `xtop-widget-api` (que
dibuja sobre `WidgetState`); son dos contratos diferentes y no deben
compartir nombre (DR-2, M1.3 — este tipo se renombró desde un
`WidgetRegistration` duplicado). El motor de renderizado del kernel da
precedencia a los widgets de los plugins sobre cualquier pack (ver
[widget-contract.md](widget-contract.md)).

## Implementar un plugin — paso a paso

Los pasos reflejan lo que `xtop-plugin-samurai`
(`plugins/plugins/xtop-plugin-samurai/src/lib.rs`) hace hoy y lo que espera
el host.

**1. Declarar la dependencia.** Los crates de plugins viven en el repo
`plugins` y consumen el crate como dependencia git (flotante durante este
ciclo; ver [architecture.md](architecture.md) para el patrón temporal de
path-dep):

```toml
[dependencies]
xtop-plugin-api = { git = "https://github.com/xtop-cli/api" }
serde_json = "1"   # for execute() responses
```

**2. Implementar `Plugin`.** Importar desde la raíz del crate (el estilo de
import real que usa samurai):

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

Observa el flujo de capacidades: como `manifest()` solo declara
`ReadSystemInfo`, `ctx.top_processes(5)` tiene éxito, mientras que
`ctx.set_alert_thresholds(...)` respondería
`PluginError::Recoverable("plugin does not have required capability: ModifyConfig")`.
Añade `PluginCapability::ModifyConfig` a las capacidades declaradas para
permitirlo.

**3. Opcional: aportar un widget o datos.** Devuelve `Some(PluginWidget)`
desde `widget()` — el kernel solo lo recoge cuando el manifest declara
`RenderWidgets` — o `Some(Box::new(my_provider))` desde `data_provider()` —
solo se recoge con `ReadSystemInfo` declarado — con el provider fusionado a
través del provider composite del kernel.

**4. Cableado del host.** El kernel registra el plugin como
`Box<dyn Plugin>` a través de su `PluginManager` (crea el dir de datos desde
el id del manifest, construye `PluginContext::new(state, dir, capabilities)`,
llama a `on_enable`), y después impulsa `on_tick` por tick, `on_key` por
tecla, `execute` por comando con nombre y `on_disable` al apagar. Los autores
de plugins no tocan `HostState`; solo ven el contexto. Escribir un doble de
test que implemente `HostState` se hace copiando el patrón `FakeHost` de los
tests dentro del crate en `context.rs`.
