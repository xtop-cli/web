# Registro de cambios

## [0.1.0] - 2026-09-04

Nota de política de versiones: el ecosistema sigue en una fase temprana —
todo está en 0.1.0. La entrada de abajo consolida en una única lista
acumulativa el trabajo del kernel posterior al refactor de este ciclo
(formato de tema v2 + motor de contraste, extras de preset, dirección de
ordenación, chrome con colores de rol, externalización del ecosistema,
superficie de datos, densidad y legibilidad).

### Superficie de datos del kernel
- Formato de tema v2: los 12 ficheros de tema incluidos llevan claves
  explícitas `background`/`foreground` de las paletas propietarias canónicas
  (los ficheros heredados caen a slot0/slot7); semilla actualizada 4 → 5.
- Motor de contraste (luminancia WCAG): al cargar, los roles de texto (fg, dim,
  accent, cebra, marcas de series) se normalizan contra el fondo del tema
  con elevaciones que preservan el tono cuando están por debajo del mínimo;
  regresión fijada (el fg de París nunca es palette[7] cuando iguala el
  fondo).
- Superficie de datos: `CpuInfo.temp_c` (la sonda coretemp de Linux rellena
  las temperaturas por núcleo donde no hay ambigüedad; los stubs de
  macOS/Windows/respaldo devuelven None) e historiales acotados de
  `WidgetState` para las tasas agregadas de lectura/escritura de disco y la
  carga media.
- `CpuInfo.frequency`, `.governor`, `.name` (provider.rs) y otras métricas
  recopiladas (state, run_time, threads, open files, disk bytes, exe_path,
  cmd, cmd_full, parent_pid) siguen fluyendo por el snapshot para los widgets
  y los plugins.
- Widgets densos: las cajas escalan los gráficos a toda la altura; vista de
  temperatura por núcleo de cpu (`show_temp`); fila de memoria disponible;
  gráficos braille duales de varias filas para network/disk_io; nuevos
  widgets `summary` y `sensors` (ambos packs); presets `detail_*`
  reconstruidos como páginas de monitor completo sin filas huérfanas en los
  tamaños habituales (reglas de teselado documentadas).

### Presets, chrome y extras de layout
- Los tres extras de preset se llaman `detail_*` (nombres de fichero
  `detail_dashboard`, `detail_network`, `detail_processes`; nombres visibles
  `Detail Dashboard`, `Detail Network`, `Detail Processes`). Superposición de
  ayuda, docs, tests y comentarios actualizados; versión de semilla subida de
  3 → 4 para que las instalaciones existentes vuelvan a sembrar las plantillas
  de layout renombradas (los ficheros sembrados antiguos se dejan intactos,
  según la política de nunca-sobrescribir).
- Presets de layout como extras (DR-UX6): el kernel incrusta los tres layouts
  de preset de referencia de `xtop-cli/layouts` después de los siete layouts
  ligados a modos; la tecla de ciclo de layout los alcanza en orden de fichero
  y vuelve al inicio, la paleta de comandos los lista por nombre, y la siembra
  de assets del primer arranque los copia como plantillas editables (versión
  de semilla 2 → 3).
- El documento de diseño del ciclo de UX se reestructura en `docs/design.md`:
  una declaración neutral de las propias reglas de diseño de xtop (roles de
  tema, conjuntos de glifos, opciones de visualización por widget, respaldos
  de ancho mínimo, reglas de color de gráficos, funcionalidades diferidas),
  con las claves de opción reconocidas por widget referenciadas de forma
  cruzada a los docs del repo de widgets. Todos los enlaces actualizados.
- Pulido del chrome del kernel (arrastre de UX5, huecos cerrados): la
  superposición de búsqueda dibuja ahora su borde con el conjunto de glifos
  configurado `style.borders`, igual que los popups de ayuda y paleta; los
  títulos conservan el rol accent, los separadores el rol dim, y no quedan
  bordes de doble línea fijos en el chrome del kernel.
- El ciclo de dirección de ordenación y las opciones de visualización por
  widget se arrastran sin cambios desde el mismo ciclo; los cambios de
  renderizado del lado de los widgets (lenguaje visual v2) aterrizan en las
  notas del changelog del repo de widgets.

### Ordenación de procesos, paleta de comandos, colores de rol
- Dirección de ordenación de procesos: la tecla de ordenación (`s`,
  configurable) alterna entre invertir el orden en la columna actual
  (arranque por defecto: CPU% descendente, sin cambios) y avanzar a la
  siguiente columna (CPU% → Mem → PID → Name), que empieza descendente —
  una pulsación invierte `▲`/`▼`, la siguiente pulsación avanza. El orden
  realmente renderizado respeta la dirección, y `process_sort_desc()` (nuevo
  método aditivo de `WidgetState`, por defecto `false`) permite al widget de
  procesos dibujar el marcador de columna.
- La entrada "Sort" de la paleta muestra la columna actual con su marcador de
  dirección.
- Chrome del kernel con colores de rol (DR-UX3): nuevos accesores de rol de
  tema (`accent()` = ranura 6, `dim()` = ranura 8, documentados en
  `docs/colors.md`); la superposición de ayuda y los popups de búsqueda/paleta
  usan títulos/bordes accent, separadores dim y el conjunto de glifos
  `style.borders` configurado (la ayuda ya no fija bordes de doble línea); los
  medidores de la vista mínima conservan sus colores de rol con los roles
  documentados.
- Texto de la superposición de ayuda actualizado: se listan el comportamiento
  de dirección de ordenación y los layouts de preset; la sección "Layouts"
  refleja modos → presets → layouts de usuario.

### Externalización del ecosistema (ciclo monocrate completado)
- El kernel es ahora un host fino sobre el ecosistema externalizado. Consume
  los crates de contrato de `xtop-cli/api` (`xtop-plugin-api`,
  `xtop-widget-api`, `xtop-extension-api`), los packs de widgets de
  `xtop-cli/widgets`, los layouts de `xtop-cli/layouts`, el plugin samurai de
  `xtop-cli/plugins` y la extensión MCP de `xtop-cli/extensions` como
  dependencias git flotantes con feature flags opcionales.
- Eliminado el resto muerto y sin compilar `src/commands/plugins_dir_tmp/`
  del layout pre-monocrate. (Ruta escrita en scripts/audit.sh como guarda de
  ausencia.)
- `rust-version = "1.87"` declarado.

### CI solo local
- El flujo de CI de GitHub Actions (`.github/workflows/ci.yml`) se ha
  eliminado: el bloqueo es solo local (`scripts/ci.sh`, `scripts/audit.sh`) y
  no se volverá a habilitar hasta que el pipeline de releases esté 100%
  listo.

### Consolidación de contratos
- Eliminado `config::AlertThresholds`: la configuración persistida usa ahora
  `xtop_plugin_api::AlertThresholds` directamente (claves JSON idénticas
  `cpu_high`/`mem_high`/`disk_high`; valores por defecto 90/90/90 construidos
  en la capa de configuración). Código puente de marshalling manual eliminado
  de `plugins/host.rs` y `state/widget_state.rs`.
- Los registros de widgets de plugins usan `xtop_plugin_api::PluginWidget`;
  el alias duplicado `PluginWidgetFn` en `ui/layout/engine.rs` ha
  desaparecido.
- Restos de Docker eliminados (asignación `dockers: vec![]`, forwarding
  compuesto de `docker_info`) — el modelo de api ya no lleva datos de Docker.
- Las lecturas del contexto de plugin están restringidas por capacidad y son
  de tipo `Result` en el upstream; consumidores adaptados.

### Temas
- `miami` ya está incrustado y sembrado como los otros 11 temas (se
  distribuyen 12 ficheros de tema JSONC, todos en `DEFAULT_THEMES`); versión
  de semilla subida a "2" para que las instalaciones existentes reciban la
  nueva plantilla.
- Documentación y recuentos de temas corregidos en todas partes (12 temas;
  `x` compilado como respaldo de arranque).
- `theme::themes_dir()` enruta por el `config::config_dir()` consciente de la
  plataforma, así que los temas viven junto a `config.json` y los layouts
  también en macOS/Windows.

### Actualización de dependencias
- ratatui `0.29 -> 0.30.2` (API builder `Layout::vertical`/`Layout::horizontal`);
  crossterm alineado con el backend de ratatui (un único `crossterm 0.29` en
  el grafo vía `ratatui-crossterm`).

### Funcionalidades nuevas
- Los nombres de widget desconocidos en el layout activo producen una
  advertencia única en stderr por nombre (`xtop: layout '<layout>' references
  unknown widget '<name>'`).
- La feature opcional `effects` (apagada por defecto) cablea el
  `xtop-effect-fade` integrado a través de la clave de config `effect`
  ("fade" activa el fundido de entrada de 500 ms; ausente/desconocido lo
  desactiva). Las compilaciones sin la feature no arrastran dependencias
  extra.

### Docs y tubería de releases
- `docs/` refrescado: claves de configuración, arquitectura de plugins
  (plugins como crates separados, comportamiento real de
  `plugin list|install|scaffold`, extensión MCP), estado del RFC multi-repo,
  recuentos de features/temas; `colors.md` movido bajo `docs/`.
- Tabla de roles de la paleta de `docs/colors.md` corregida según el uso real
  del código (las ranuras 4/5 son el par lectura/escritura RX/TX, no
  "storage/TX"); opciones de visualización por widget documentadas en
  `docs/customization.md`; recuentos/ciclos de layouts actualizados en los
  docs.
- VERSION de `install.sh` sincronizada con la versión del crate; eliminadas
  las afirmaciones de build-dep de OpenSSL (el crate no tiene dependencia
  openssl); comentario placeholder de `install.ps1` eliminado.
- `ROADMAP.md` del kernel sincronizado con el estado implementado (fases 4-6
  y los elementos de refactor R2/R3); `scripts/audit.sh` ampliado con las
  guardas de directorio muerto y de semillas de temas.
- Versión del crate fijada a `0.1.0` (VERSION del instalador sincronizada)
  según la política de versiones del ecosistema: mantenerse temprano, sin más
  subidas.

## Historial anterior

### [0.0.1] - 2026-06-18

#### Config: Persistencia de Layouts Personalizados
- `Config` ahora tiene campo `layout_name` que almacena el nombre del layout seleccionado (soporta layouts mas alla de los 7 built-in `LayoutMode`)
- En configuraciones existentes, `layout_name` es opcional (`#[serde(default)]`) y se usa como respaldo `layout_mode`
- `save_config` guarda el nombre del layout actual por su indice en `layout_defs`, permitiendo restaurar layouts personalizados al reiniciar
- `AppState::new` prioriza `config.layout_name` si no es vacio, con fallback a `layout_index_from_mode`
- Config se guarda automaticamente al seleccionar tema o layout desde la paleta de comandos

#### Paleta de Comandos: Soporte macOS
- Agregada ruta directa para `ctrl+p` en el bucle de eventos, independiente del sistema de keybindings (soluciona problemas donde crossterm reporta la tecla con distinto casing o el keybinding no se resuelve)
- `key_event_to_str` aplica `to_ascii_lowercase()` al caracter cuando Ctrl esta activo, normalizando `"ctrl+P"` a `"ctrl+p"`
- Agregado `"ctrl+P"` como variante alternativa en el keybinding por defecto
- Debug output de teclas en compilaciones debug (`cargo build` sin `--release`) para diagnosticar problemas: `[key] 'ctrl+p'`

#### Plugins: Seguridad y Arquitectura
- `PluginContext` ahora verifica capabilities antes de ejecutar acciones sensibles: `kill_process`, `set_alert_thresholds`, `set_theme_by_name`, `set_layout_by_name`, `set_update_interval` requieren `KillProcesses` o `ModifyConfig` segun corresponda
- `PluginCapability::Custom` migrado de `&'static str` a `String` para flexibilidad
- `PluginManifest` usa `String` en vez de `&'static str`, permitiendo plugins que generen metadata dinamicamente
- `#[non_exhaustive]` agregado a `PluginCapability` para evolucion segura del enum

#### PluginManager: Robustez
- `with_plugin_manager_mut()` reemplaza el patron inseguro `take()` + `Some()` que podia perder el manager si una ruta de error no lo restauraba. Todos los callers migrados: `on_tick`, manejo de teclas, shutdown, y MCP server
- `register()` ahora devuelve `Result<(), PluginError>` en vez de `Result<(), String>`, consistente con el resto del sistema
- Metodo `build_context()` elimina la duplicacion de construccion de `PluginContext` en 5 metodos distintos
- `data_dir` del plugin ahora apunta al directorio del plugin (`plugins/<id>/`), no a `plugins/<id>/config.json`

#### Capabilities: Validacion Real
- `collect_widgets()` solo acepta widgets si el plugin declara `RenderWidgets`
- `collect_data_providers()` solo acepta providers si el plugin declara `ReadSystemInfo`
- `PluginContext` inyecta las capabilities declaradas y verifica en cada metodo sensible

#### MCP Server
- Migrado de `take()`/`Some()` a `with_plugin_manager_mut()` para seguridad
- Eliminado doble `tick_all()` innecesario en el handler de herramientas

#### Sistema de Providers
- `SystemDataProvider` ahora tiene metodo `add_extras()` con default no-op, eliminando la necesidad de `downcast_mut::<CompositeProvider>()`
- `kill_process()` verifica que el UID del proceso coincida con el usuario actual antes de enviar SIGTERM
- Limite de procesos configurable via `SysinfoProvider::max_processes` (default 200)
- Eliminados `NoopBatteryProvider`, `NoopGpuProvider`, `NoopDockerProvider` — codigo muerto no utilizado

#### Sentinel: Calidad de Datos
- Migracion completa de construccion manual de JSON (`format!` con strings escapados) a `serde_json::json!()` — elimina riesgo de inyeccion JSON y corrupcion por caracteres especiales

#### TUI
- `LayoutConstraint::Fill` mapeado correctamente a `ratatui::Constraint::Fill(1)` en vez de `Min(0)`

#### Infraestructura
- `config_dir()` centralizada en `xtop_core::infrastructure::config::config_dir()` — eliminada duplicacion en 5 modulos
- CI workflow creado en `.github/workflows/ci.yml`: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`

### [0.2.0] - 2026-06-03

#### Refactorizacion Total del Proyecto
- Migrado a workspace multi-crate: `xtop-core`, `xtop-tui`, `xtop-cli`
- Eliminado el monolito `src/` — ahora cada capa vive en su propio crate
- Eliminadas 5 dependencias muertas: `serde`, `serde_json`, `clap`, `chrono`, `tokio` (se redujo de ~84 a ~55 crates)
- Eliminado codigo muerto: `InputMode`, `show_help`, `swap_history`, `process_table_state`, `graph_colors()`
- Eliminados todos los `#[allow(dead_code)]`

#### Nueva Arquitectura Hexagonal
- Capa de Dominio (`xtop-core/domain/`): modelos de datos puros + trait `SystemDataProvider`
- Capa de Aplicacion (`xtop-core/application/`): `AppState`, `MetricsHistory` (con `VecDeque`), `LayoutMode`, `EffectiveLayout`
- Capa de Infraestructura (`xtop-core/infrastructure/`): `SysinfoProvider`, `theme_loader`, `config`, providers stub
- Capa de Presentacion (`xtop-tui/`): terminal, render widgets separados, format helpers
- Binary (`xtop-cli/`): entry point con inyeccion de dependencias

#### Layout Responsive
- `detect_effective_layout(width, height, mode)` adapta el layout automaticamente:
  - **Dashboard** (>100x30): layout completo 2-columnas
  - **Compact** (>80x24): mas compacto
  - **Vertical** (<80): todo apilado
  - **Minimal** (<60 ancho o <18 alto): solo CPU + Mem + procesos
  - **Too Small** (<40x8): mensaje de advertencia

#### Nuevos Layouts (7 modos, ciclo con `l`)
| Modo | Descripcion |
|------|-------------|
| Dashboard | Default, 2-columnas con graficos |
| Vertical | Apilado, para terminales estrechas |
| Horizontal | 4 columnas: CPU/Mem/Storage/Network |
| CPU Focus | CPU grande + procesos |
| Memory Focus | Memoria grande con chart + procesos |
| Network Focus | Network + Disk I/O lado a lado + procesos |
| Process Focus | Stats pequenos + procesos maximizados |

#### Full Screen (`f` / `F`)
- `f` activa/desactiva modo fullscreen
- `F` cicla entre widgets (CPU, Memory, Storage, Network, Processes, Disk I/O, GPU, Battery, salir)
- Widget seleccionado ocupa toda la terminal (menos header)

#### Busqueda de Procesos (`/`)
- Filtrado en tiempo real por nombre de proceso
- `Enter` confirma el filtro, `Esc` cancela, `Backspace` borra
- Overlay centrado con indicador `/query_`

#### Ayuda en Pantalla (`?`)
- Muestra todas las keybindings disponibles
- Cierra con `Esc` o `?` otra vez

#### Nuevas Metricas
- **Disk I/O**: velocidad de lectura/escritura por disco (bytes/s) con widget dedicado
- **Per-interface Network**: RX/TX y velocidad por interfaz de red
- **GPU**, **Battery**, **Docker** stubs preparados para implementacion futura

#### Alertas por Threshold
- **CPU > 90%**: color cambia a rojo
- **Memoria > 90%**: color rojo + icono de advertencia en el titulo
- Thresholds configurables en `AlertThresholds` (cpu_high, mem_high, disk_high)

#### Mejoras de Codigo
- `Vec` + `remove(0)` reemplazado por `VecDeque` con `pop_front()` (O(1))
- Helper `format_bytes()` elimina repeticion de `1024.0 / 1024.0 / 1024.0`
- Helper `format_uptime()` para formato legible de tiempo activo
- `MetricsHistory::set_max_points()` para configurar puntos del historico

#### Configuracion Persistente
- `~/.config/xtop/config.json`: guarda tema, layout, intervalo, history_points, alerts
- `~/.config/xtop/themes/*.json`: temas personalizados por el usuario
- Guardado automatico al salir con `q`
- Temas built-in (13) se fusionan con temas personalizados

#### Tests
- 39 tests unitarios (de 0): layout detection, history, themes, format helpers, config
- CI workflow `.github/workflows/ci.yml`: check, fmt, clippy, test, build

#### Keybindings Completos
| Tecla | Accion |
|-------|--------|
| `q` | Salir (guarda config) |
| `?` | Ayuda |
| `t` / `T` | Siguiente/anterior tema |
| `l` | Siguiente layout |
| `f` / `F` | Toggle fullscreen / ciclar widget |
| `/` | Buscar procesos |
| `Esc` | Cancelar busqueda / cerrar ayuda |
