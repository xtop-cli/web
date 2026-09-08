# Arquitectura del plugin Samurai

`xtop-plugin-samurai` es el plugin de monitorización de seguridad del
ecosistema: implementa el contrato [`Plugin`] de `xtop-plugin-api`, ejecuta
diez reglas heurísticas sobre la tabla de procesos, expone todo a través de
una API JSON de acciones y renderiza un widget TUI. Nunca depende del kernel,
solo del crate del contrato.

El id canónico y los nombres de acción son constantes exportadas
(`PLUGIN_ID`, `actions::*`) y son la única fuente de la tabla de herramientas
de `xtop-extension-mcp` (DR-6).

## Ciclo de vida

El kernel aloja el plugin a través de `xtop-plugin-api`:

| Hook | Comportamiento |
|---|---|
| `manifest()` | id `samurai` (= `PLUGIN_ID`), nombre `Samurai`, versión a partir de la versión del crate (`env!("CARGO_PKG_VERSION")`), descripción, capacidades: `ReadSystemInfo`, `KillProcesses`, `ModifyConfig`, `RenderWidgets`. |
| `on_enable()` | marca el plugin como habilitado. |
| `on_disable()` | marca el plugin como deshabilitado. |
| `on_tick()` | cuenta los ticks; **cada quinto tick** reemplaza la lista de alertas con una ejecución de análisis nueva (`tick_count % 5 == 0`). Los errores de análisis se propagan como `PluginError` en lugar de ser ignorados. |
| `execute(action, params)` | API JSON de acciones (más abajo); siempre registra `last_action`/`last_action_result`. |

El plugin arranca habilitado y reporta su propio estado a través de
`plugin.status`.

## API de acciones

`execute(ctx, action, params)` devuelve una cadena JSON (o
`PluginError::{Recoverable, UnknownAction}`). Los parámetros usan la
mini-sintaxis que se muestra a continuación: cadenas simples, analizadas a
mano para cada acción.

| Acción | Parámetros | Notas |
|---|---|---|
| `system.summary` | — | Promedio de CPU, memoria en GB/porcentaje, recuentos de procesos/disco/interfaces, tiempo de actividad (uptime), hostname, recuento actual de alertas. |
| `processes.top` | `count` o `count,filter=<regex>` | El recuento se establece en 10 por defecto cuando no se puede analizar; `0` es un error. La regex del filtro opcional se compara con `is_match` contra **cualquiera** de name, cmd, exe. |
| `processes.search` | `pattern` o `pattern,fields=a,b` | `pattern` es una única regex compilada; se compara con `is_match` contra **cualquier** campo listado. Campos: `name`, `cmd`, `user`, `state`, `exe`, `cwd` (por defecto `name`; los campos desconocidos se ignoran). Se ordena por CPU desc, con un tope de 100 resultados. |
| `process.info` | `pid` | JSON completo de un proceso; error cuando el PID no existe. |
| `process.kill` | `pid` | Requiere `KillProcesses`. |
| `process.alerts` | — | El array completo de alertas de la última ejecución de análisis. |
| `threshold.set` | `cpu,mem,disk` | Tres porcentajes separados por comas; requiere `ModifyConfig`. |
| `threshold.get` | — | Umbrales actuales `cpu_high`/`mem_high`/`disk_high`. |
| `config.get` | — | theme, layout, interval_ms, hostname. |
| `config.set` | `interval_ms=<ms>` o `theme=<name>` o `layout=<name>` | Requiere `ModifyConfig`; cualquier otra cosa es un error de análisis. |
| `alerts.status` | — | Totales y recuentos por severidad, más las 5 alertas principales. |
| `plugin.status` | — | habilitado, recuento de ticks, última acción/resultado, recuentos de alertas activas y críticas. |

Las entradas JSON de procesos incluyen: `pid`, `name`, `cpu`, `mem_bytes`,
`state`, `user`, `cmd`, `exe`, `ppid`, `threads`, `run_time`, `cwd`.

## Análisis heurístico

- Se ejecuta **cada quinto tick** (los ticks del kernel duran ~1 s por
  defecto, así que aproximadamente cada 5 segundos de tiempo real; la
  frecuencia de ticks la decide el kernel).
- Diez reglas con los umbrales exactos y las listas de patrones documentados
  en [rules.md](rules.md); como máximo **50 alertas** por ejecución.
- Lee la tabla de procesos a través de `PluginContext::snapshot()`, con
  acceso controlado por capacidad (`ReadSystemInfo`).
- El historial de spawn storms (`spawn_history`) persiste entre ejecuciones
  dentro de la instancia del plugin.

## Widget

El plugin registra un widget de plugin llamado `samurai` (el mismo
`PLUGIN_ID`). Renderiza un panel con borde con el título Samurai y dos
líneas de estado del agente. Para que el widget aparezca, el plugin debe
estar habilitado (feature del host + capacidad `RenderWidgets`) y un layout
debe hacer referencia a un widget llamado `samurai`; el kernel renderiza los
widgets de los plugins antes que los widgets integrados del pack.

## Relación con xtop-extension-mcp

El servidor MCP **ya no vive en este repositorio**: es `xtop-extension-mcp`,
en el [repositorio de extensiones](https://github.com/xtop-cli/extensions),
que el kernel lanza como `xtop mcp`. La extensión:

- depende de este crate en tiempo de compilación y usa `PLUGIN_ID` para
  `execute_plugin(PLUGIN_ID, …)`;
- construye su tabla de 12 herramientas a partir de las constantes
  `actions::*` (nombre de herramienta = acción con `.` → `_`);
- traduce los argumentos MCP tipados a la mini-sintaxis de parámetros
  anterior y mapea los fallos de ejecución a errores JSON-RPC.

Consulta el `mcp-protocol.md` de la extensión para el mapeo a nivel de
protocolo (wire).

[`Plugin`]: https://docs.rs/xtop-plugin-api/latest/xtop_plugin_api/trait.Plugin.html
