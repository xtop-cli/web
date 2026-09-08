# Arquitectura de xtop-extension-mcp

`xtop-extension-mcp` es una **extensión de tipo servidor** construida sobre
el crate de contrato `xtop-extension-api`. Nunca se comunica directamente
con el kernel: el kernel lo aloja tras su feature `mcp-extension` y lo lanza
desde el comando `xtop mcp`.

## Uso del trait Extension

- `McpExtension` implementa el trait [`Extension`]:
  - `manifest()` declara el id `mcp`, el nombre `xtop MCP server`, la
    versión a partir de la versión del crate (`env!("CARGO_PKG_VERSION")`) y
    el único id de servidor `mcp`.
  - `run_server(server_id, ctx)` rechaza todo id de servidor distinto de
    `"mcp"` con `ExtensionError::Unknown` y, en caso contrario, ejecuta el
    bucle del servidor stdio.
- Mientras se ejecuta, la extensión maneja el kernel exclusivamente a través
  de los dos métodos de [`ExtensionContext`]:
  - `tick()` — avanzar el tick de monitorización (también hace tick en los
    plugins alojados); el servidor lo invoca antes de cada ejecución de
    `tools/call`.
  - `execute_plugin(plugin_id, action, params)` — ejecutar una acción de
    plugin; todas las llamadas a herramientas pasan por él.

## Estructura

- `src/lib.rs`:
  - `run_mcp_server(ctx)` — el bucle stdio: lee una línea cada vez, omite
    las líneas vacías, serializa y escribe la respuesta, y hace flush.
  - `handle_line(line, ctx)` — analiza una línea JSON-RPC y la despacha a
    los handlers; el JSON malformado se convierte en
    `ExtensionError::Recoverable` (el servidor se detiene); todo lo demás
    devuelve el objeto de respuesta. Se extrajo del bucle para que la capa
    JSON-RPC sea testeable sin terminal.
  - `handle_initialize` / `handle_tools_list` / `handle_tools_call` — los
    tres handlers del protocolo.
  - `TOOL_ACTIONS`, `tool_name()`, `action_for_tool()` — la tabla de
    herramientas derivada de las constantes de samurai.
- `src/tests.rs` — tests unitarios de la capa JSON-RPC contra un
  [`ExtensionHost`] mock que registra las llamadas a `execute_plugin` y
  devuelve resultados prefabricados (`tick()` no hace nada).

## Por qué depende del repositorio de plugins

Las herramientas que anuncia este servidor son las acciones del plugin
samurai. Antes de DR-6, el id de plugin `"samurai"` y las 12 cadenas de
acciones se duplicaban a mano en este crate, por lo que renombrar una acción
(o el plugin) rompía las herramientas MCP **silenciosamente en tiempo de
ejecución**. Depender de `xtop-plugin-samurai` hace que el acoplamiento sea
consistente en tiempo de compilación:

- `PLUGIN_ID` dirige cada llamada a `execute_plugin` (no hay ningún otro id
  de plugin codificado en el crate);
- `actions::*` dirige tanto la lista de herramientas (`tools/list`, orden y
  nombres) como la traducción de argumentos (`tools/call`): cada nombre de
  herramienta se resuelve de nuevo a su constante de acción antes del
  despacho;
- ahora, un renombrado en cualquiera de los dos lados hace fallar la
  compilación de la extensión en lugar de romper a un cliente de IA más
  tarde.

Compensación: la compilación de la extensión arrastra el crate del plugin
(y con él ratatui y `xtop-plugin-api`). Esto es aceptable para una extensión
de servidor alojada por el kernel; a cambio, ambos repositorios se mantienen
sincronizados.

## Relación con la documentación de samurai

- El protocolo a nivel de transporte (wire) y el mapeo de parámetros por
  herramienta están en [mcp-protocol.md](mcp-protocol.md).
- Las acciones de samurai, su ciclo de vida y la mini-sintaxis de parámetros
  están documentadas en el repositorio de plugins
  (`plugins/docs/architecture.md`); las heurísticas detrás de
  `process.alerts` / `alerts.status`, en `plugins/docs/rules.md`.

[`Extension`]: https://docs.rs/xtop-extension-api/latest/xtop_extension_api/trait.Extension.html
[`ExtensionContext`]: https://docs.rs/xtop-extension-api/latest/xtop_extension_api/struct.ExtensionContext.html
[`ExtensionHost`]: https://docs.rs/xtop-extension-api/latest/xtop_extension_api/trait.ExtensionHost.html
