# Registro de decisiones y cambios incompatibles

Este archivo registra las decisiones que dieron forma al repo api en el hito
M1 y los cambios incompatibles que los consumidores deben absorber. Las
decisiones autoritativas del ecosistema (DR-1..DR-7) viven en el ROADMAP §2
del workspace; las decisiones M1 con margen de interpretación (D1..D8) se
registraron en el informe del hito `tmp/m1-api-report.md` §8 y se reafirman
aquí en el contexto del repo, ancladas al código.

## Resumen de DR — qué implementa el repo api

| Decisión | Qué significa dentro de este repo |
|---|---|
| DR-1 | Los tipos del modelo de datos + contrato de plugins existen una sola vez, en `crates/plugin-api/src/` (`model.rs`, `host.rs`, `plugin.rs`, `context.rs`, `capability.rs`, `error.rs`, `manifest.rs`, `provider.rs`, `widget.rs`, `color.rs`). Gate de grep: ninguna definición de `AlertThresholds` fuera de `plugin-api` (M7.4). |
| DR-2 | El contrato de render de widgets existe una sola vez, en `crates/widget-api/src/` (`state.rs`, `renderer.rs`, `glyph.rs`). Los widgets del lado del plugin son `PluginWidget` de `xtop-plugin-api`, un tipo distinto — sin nombre compartido con `WidgetRegistration` de `widget-api`. Gate de grep: ningún `WidgetRegistration` fuera de `widget-api`. |
| DR-3 | Sin superficie de layout en api: los archivos de layout dirigen los widgets por nombres de cadena simples (`xtop-layout` en el repo `layouts` no necesita tipos de api). |
| DR-4 | Los tipos de extensiones existen una sola vez, en `crates/extension-api/src/`. |
| DR-5 | El contrato de efectos existe una sola vez, en `crates/effect-api/src/`: `Effect` sobre el buffer ya renderizado + `EffectManifest`. |
| DR-6 | Las constantes del ecosistema viven en el productor (id del plugin samurai/nombres de acciones en el repo `plugins`, M4), no en api. |
| DR-7 | Versiones: ratatui `0.30.2`, serde/serde_json últimos 1.x, `rust-version = "1.87"` en el workspace y en cada manifest de miembro; sin tokio/clap/chrono; las deps git de los consumidores permanecen flotantes este ciclo. |

## Decisiones M1 D1..D8 (contexto del repo)

- **D1 — El gating de capacidades fuerza lecturas `Result`.** Aplicar
  `ReadSystemInfo` a través del mismo mecanismo `check_capability` que usan
  los métodos mutantes solo es posible si las lecturas pueden fallar, así que
  `PluginContext::snapshot`, `system_info` y `top_processes` devuelven
  `Result<T, PluginError>` en lugar de valores planos (`context.rs`). Las
  denegaciones son `PluginError::Recoverable("plugin does not have required capability:
  ReadSystemInfo")`. Los consumidores se rompen a propósito; ver la tabla
  siguiente.
- **D2 — `top_processes` ordena y después trunca.** Implementado como
  `sort_by(cpu_usage desc via total_cmp)` + `truncate(n)` (`context.rs`):
  las mismas semánticas que el borrador anterior (`sort` + `take`), sin
  asignación extra, orden garantizado por el contrato y no por el productor.
  Orden estable: los empates de igual CPU conservan el orden de la
  instantánea (probado).
- **D3 — El mapeo de bordes sigue las semánticas de ratatui 0.30.2.** El
  borrador de la especificación leyó `border::EMPTY` de ratatui como "dibujo
  de caja estándar" y `border::PLAIN` como "ASCII +" — cierto para ratatui
  ≤ 0.28, erróneo desde 0.29: `EMPTY` es ahora un conjunto de espacios en
  blanco y `PLAIN` **es** el marco estándar de dibujo de caja de una línea;
  ratatui no incluye ningún conjunto ASCII. Ganaron las semánticas previstas:
  `Native → border::PLAIN` (aspecto clásico), `Rounded → border::ROUNDED`,
  `Double → border::DOUBLE`, `Plain → ASCII_BORDER`, `Ascii → ASCII_BORDER`
  (`glyph.rs`), siendo `ASCII_BORDER` un nuevo conjunto canónico exportado
  `+ - |`.
- **D4 — Sin tipo de pegamento `EffectRegistration`.** La tarea definía un
  contrato mínimo de exactamente `Effect` + `EffectManifest` y ninguna
  superficie especulativa; no existe ningún consumidor hasta el cableado del
  kernel (M5), así que un tipo de registro sería especulativo. Omitido;
  trivial de añadir cuando llegue M5.
- **D5 — Los helpers de mapeo viven en el `glyph.rs` existente, solo glifos.**
  Las tres funciones (`to_color`, `border_for`, `marker_for`) y la const
  `ASCII_BORDER` ampliaron el módulo que ya poseía los enums; una única ruta
  de import canónica, `xtop_widget_api::glyph::{...}`, evita ambigüedades.
  Los helpers **no** se re-exportan en la raíz del crate (solo se re-exportan
  los enums). Las firmas de bordes usan `ratatui::symbols::border::Set<'static>`
  (el `Set` pelado necesita un lifetime en código real).
- **D6 — `rust-version.workspace = true` en cada miembro.** Una entrada
  `[workspace.package]` por sí sola no se hereda; el opt-in por miembro es lo
  que hace verdadero el "declarado en cada paquete" de DR-7.
- **D7 — Racional del rename sin el nombre antiguo literal.** El comentario
  de doc de `PluginWidget` explica la distinción conceptualmente
  ("`xtop-widget-api` posee el tipo canónico de registro de packs de widgets,
  el que se dibuja sobre `WidgetState`; los dos son contratos distintos y no
  deben compartir nombre") sin imprimir el símbolo eliminado
  `WidgetRegistration` — lo que además mantiene verde el gate de grep M7.4.
- **D8 — Sin derive `Default` en `AlertThresholds`.** La tarea solo pedía
  `Serialize/Deserialize`; el `Default` (90/90/90) y `Copy`/`PartialEq` de la
  copia del kernel son semánticas del lado del kernel que M2 puede solicitar
  cuando elimine su propia copia. Se evitaron derives no solicitados en un
  tipo de contrato.

## Cambios incompatibles para los consumidores

Todos los cambios siguientes aterrizan en el árbol de trabajo de api durante
M1 y llegan a los repos hermanos cuando el propietario hace push; hasta
entonces los consumidores resuelven el antiguo HEAD remoto a través de sus
deps git flotantes (ver [architecture.md](architecture.md) para el patrón
local de validación con path-dep).

| Cambio | Ancla de código | Impacto en el consumidor | Migración |
|---|---|---|---|
| Rename de `PluginWidget`: el tipo de registro de plugin-api se renombra del duplicado `WidgetRegistration` a `PluginWidget` (misma forma: `name` + closure de render sobre `&dyn HostState`) | `plugin-api/src/widget.rs`, `lib.rs`; `Plugin::widget()` devuelve `Option<PluginWidget>` | El kernel `xtop/src/plugins/manager.rs` y `state/app.rs` importan `WidgetRegistration` de `xtop_plugin_api`; el `widget()` de samurai (`plugins/plugins/xtop-plugin-samurai/src/lib.rs`) nombra el tipo antiguo | Kernel M2.3: importar `PluginWidget`; borrar el alias `PluginWidgetFn` en `ui/layout/engine.rs`; el mapa de plugins sigue siendo nombre → `PluginWidget`. Samurai M4.1. Gate de grep M7.4 |
| Las lecturas devuelven `Result`: `PluginContext::snapshot()`, `system_info()`, `top_processes()` ahora aplican `ReadSystemInfo` y devuelven `Result<_, PluginError>` | `plugin-api/src/context.rs` | Samurai llama a `ctx.snapshot()` en 5 sitios (resumen del sistema, búsqueda/top/info de procesos, analyze) y lee los valores directamente; además `process.kill`/`threshold.set`/`config.set` ya mapean `Err` | Samurai M4.1: manejar `Result` en cada punto de llamada a `ctx.snapshot()`/lectura (informe §9); el kernel M2 ejercita las mismas rutas a través de samurai + engine |
| Superficie Docker eliminada: se borran el struct `DockerInfo`, el campo `SystemSnapshot::dockers`, el método `SystemDataProvider::docker_info` y su re-export en la raíz | `plugin-api/src/model.rs` (struct + campo), `provider.rs`; el grep de docker en toda la api está vacío | El provider del kernel todavía asigna `dockers: vec![]` (`xtop/src/providers/sysinfo/provider.rs`) y el composite sigue sobrescribiendo `docker_info()` (`xtop/src/providers/composite.rs`) — esas referencias no pueden compilar contra la nueva revisión de api; nada más consumía la superficie | Kernel M2.4: eliminar la asignación siempre vacía `dockers` y la sobrescritura `docker_info` del composite |
| Canonicalización de helpers de glifos: los packs deben importar `to_color`/`border_for`/`marker_for`/`ASCII_BORDER` de `xtop_widget_api::glyph` en lugar de reimplementarlos | `widget-api/src/glyph.rs` (doc del módulo: los packs NO deben reimplementar) | El pack base `widgets/src/util.rs` implementa a mano los cuatro helpers; el pack de bloques (`widgets/packs/xtop-widget-blocks/src/lib.rs`) implementa a mano `to_color`/`ascii_border`/`border_for` (sin `marker_for` — su gráfico fija `Marker::Block`) y los dos packs ya divergen en `Plain` | Widgets M3.3 (el pack base borra sus copias; los helpers privados del pack `format_bytes`/`format_uptime`/`gauge_gradient` se quedan), M3.4 (el pack de bloques borra sus copias + el hack `const _: ChartCharset` y respeta `state.charset()`). Detalle en los puntos de llamada: el `to_color` canónico toma `[u8; 3]` por valor (las copias de los packs tomaban `&[u8; 3]`); `border_for` toma el enum, no `(state, widget, native)` |
| ratatui `0.30.2` en api (dep del workspace) mientras los consumidores fijan `0.29` | `api/Cargo.toml` (`ratatui = "0.30.2"`) | Los crates consumidores que también usan ratatui directamente compilan dos versiones de ratatui hasta que se alineen; las semánticas de `border::PLAIN` ya cambiaron en 0.29 (ver D3) | Kernel M2.6 (`Layout::vertical/horizontal` etc. + alineación crossterm), widgets M3.1, samurai M4.2. api es la referencia: ya está en 0.30.2 (M1.1). MCP (extensions) no usa ratatui — sin impacto |
| Política de `rust-version = "1.87"` + `edition 2021` | workspace + todos los manifests de miembros (D6) | Los consumidores con toolchains antiguas deben subir de versión (samurai ya necesita 1.87) | Kernel M2.8, widgets M3.1, samurai + mcp M4.8 |
| `AlertThresholds` se convierte en el tipo de contrato serde con claves simples `cpu_high`/`mem_high`/`disk_high`; sin derive `Default` (D8) | `plugin-api/src/host.rs` + test de ida y vuelta | El kernel conserva una copia local de la misma forma (`xtop/src/config/schema.rs`) con `Default` 90/90/90 y convierte en `plugins/host.rs` + `state/widget_state.rs` | Kernel M2.2: borrar `config::AlertThresholds`; persistir `xtop_plugin_api::AlertThresholds`; desaparece el marshalling manual en host.rs/widget_state.rs; las claves JSON quedan idénticas |
| El doc de `data_dir()` ya no sobre-especifica una ruta concreta | `plugin-api/src/context.rs` | Cambio solo de documentación; el comportamiento no cambia (la ruta la sigue proporcionando el host) | ninguna |
| Los enums de glifos no cambian en la raíz (`ChartCharset`, `WidgetBorders` re-exportados; claves serde snake_case `half_block`, `plain`, ...) | `widget-api/src/lib.rs`, `glyph.rs` | ninguno — el formato de persistencia de configuración es estable | ninguna |

Punteros de referencia para las migraciones: hito M2 del kernel (M2.2–M2.6,
M2.8), widgets M3 (M3.1–M3.4), plugins + extensions M4 (M4.1, M4.2, M4.8),
cableado de efectos del kernel M5.3, y los gates de grep entre repos en M7.4,
todos en el ROADMAP del workspace.
