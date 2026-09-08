# Protocolo MCP de xtop

`xtop-extension-mcp` implementa un servidor **Model Context Protocol**
mínimo sobre **JSON-RPC 2.0**, delimitado por líneas en stdin/stdout: un
objeto JSON por línea, una respuesta por petición, sin HTTP. El kernel lo
lanza como `xtop mcp` (`McpExtension::new().run_server("mcp", ctx)`).

## Delimitación del transporte

- Cada línea de entrada se recorta; las líneas vacías se omiten.
- El JSON malformado termina el servidor con un error recuperable (el kernel
  lo reporta) — no se emite ninguna respuesta JSON-RPC, igual que en el
  bucle stdio.
- Toda petición bien formada produce exactamente un objeto de respuesta con
  `"jsonrpc": "2.0"` y el `id` de la petición repetido (echo).

## Métodos gestionados

| Método | Propósito |
|---|---|
| `initialize` | Anuncia `protocolVersion 2024-11-05`, `capabilities.tools`, `serverInfo` (`xtop`, versión = versión del crate). |
| `tools/list` | Las 12 herramientas generadas a partir de las constantes `actions::*` del plugin samurai. |
| `tools/call` | Ejecuta una herramienta contra el plugin alojado. |
| cualquier otra cosa | JSON-RPC `-32601 Method not found: <method>`. |

`notifications/initialized`, `ping`, `resources/*`, `logging`, `instructions`
y el procesamiento por lotes no están implementados — quedan fuera del
alcance de este servidor mínimo.

## Tabla de herramientas

La tabla de herramientas se **genera a partir de las constantes exportadas
del plugin samurai** (DR-6): este crate depende de `xtop-plugin-samurai` en
tiempo de compilación y mapea cada una de sus 12 constantes `actions::*` a
una herramienta MCP cuyo **nombre es la acción con `.` reemplazada por `_`**
(`system.summary` → `system_summary`, `process.alerts` → `process_alerts`,
…). No existe una segunda lista de cadenas mantenida a mano.

| Herramienta | Acción de samurai | Argumentos MCP → cadena de params |
|---|---|---|
| `system_summary` | `system.summary` | — |
| `processes_top` | `processes.top` | `count` (por defecto 10), `filter` → `count[,filter=<regex>]` |
| `processes_search` | `processes.search` | `pattern`, `fields` → `pattern[,fields=<fields>]` |
| `process_info` | `process.info` | `pid` → `"<pid>"` (obligatorio) |
| `process_kill` | `process.kill` | `pid` → `"<pid>"` (obligatorio) |
| `threshold_set` | `threshold.set` | `cpu`, `mem`, `disk` → `"<cpu>,<mem>,<disk>"` (los tres obligatorios) |
| `threshold_get` | `threshold.get` | — |
| `config_get` | `config.get` | — |
| `config_set` | `config.set` | uno de `interval_ms` / `theme` / `layout` → `"interval_ms=<ms>"` / `"theme=<name>"` / `"layout=<name>"` |
| `process_alerts` | `process.alerts` | — |
| `alerts_status` | `alerts.status` | — |
| `plugin_status` | `plugin.status` | — |

Las descripciones y los objetos JSON `inputSchema` que anuncia `tools/list`
se mantienen aquí, por herramienta; las cadenas de acciones, el id del
plugin y el mapeo de nombres de herramientas provienen del crate del plugin.

## Comportamiento de tools/call

Para cada llamada de herramienta, el servidor:

1. resuelve el nombre de la herramienta de vuelta a su constante de acción
   (nombre desconocido → `-32601 Tool not found: <name>`),
2. traduce el objeto `arguments` tipado de MCP a la sintaxis de parámetros
   de cadena del plugin (argumentos obligatorios ausentes → `-32602` con el
   nombre del argumento en el mensaje),
3. llama a `ctx.tick()` (refresca el estado del kernel y hace tick en los
   plugins alojados),
4. llama a `ctx.execute_plugin(PLUGIN_ID, <action>, <params>)` — siempre
   contra el id del plugin samurai importado del crate del plugin,
5. envuelve una respuesta JSON exitosa del plugin como
   `{"content": [{"type": "text", "text": "<plugin json>"}]}`.

## Mapeo de errores

| Código JSON-RPC | Significado | Origen |
|---|---|---|
| `-32601` | Método no encontrado / herramienta no encontrada | `method` desconocido o nombre de herramienta desconocido |
| `-32602` | Parámetros no válidos | falta un argumento obligatorio de la herramienta (pid, cpu/mem/disk o clave de configuración) |
| `-32000` | Error de servidor/ejecución | `ExtensionError` de `execute_plugin` (plugin ausente, capacidad denegada, acción fallida) |

## Ejemplo de sesión

```
-> {"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
<- {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"xtop","version":"0.1.0"}}}

-> {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"processes_search","arguments":{"pattern":"sshd","fields":"name,cmd"}}}
<- {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"[...]"}]}}
```
