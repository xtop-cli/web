# xtop-extension-mcp

Extensión de servidor MCP (Model Context Protocol) para
[xtop](https://github.com/xtop-cli/xtop). Expone el plugin samurai de xtop
(monitorización del sistema, consultas y control de procesos, alertas
heurísticas) como herramientas MCP a través de un servidor stdio JSON-RPC
2.0. Cualquier IA compatible con MCP — Claude Desktop, Cline, etc. — puede
conectarse:

```json
{
  "mcpServers": {
    "xtop": {
      "command": "xtop",
      "args": ["mcp"]
    }
  }
}
```

## Resumen del protocolo

- JSON-RPC 2.0 sobre stdin/stdout, un objeto JSON por línea.
- Gestiona `initialize`, `tools/list` y `tools/call`; cualquier otra cosa se
  responde con `-32601`. Los fallos de ejecución se mapean a `-32000`, y los
  argumentos ausentes, a `-32602`.
- El JSON malformado detiene el servidor con un error recuperable (no se
  emite ninguna respuesta).
- Detalles del protocolo (wire) y un ejemplo de sesión:
  [docs/mcp-protocol.md](../../docs/mcp-protocol.md).

## Herramientas

El servidor expone las 12 acciones de samurai como 12 herramientas. La tabla
de herramientas se genera a partir de las constantes exportadas por
`xtop-plugin-samurai` (DR-6): nombre de herramienta = acción con `.`
reemplazada por `_`:

| Herramienta | Acción de samurai | Argumentos |
|---|---|---|
| `system_summary` | `system.summary` | — |
| `processes_top` | `processes.top` | `count` (por defecto 10), `filter` (regex) |
| `processes_search` | `processes.search` | `pattern` (regex), `fields` (`name,cmd,user,state,exe,cwd`) |
| `process_info` | `process.info` | `pid` |
| `process_kill` | `process.kill` | `pid` |
| `threshold_set` | `threshold.set` | `cpu`, `mem`, `disk` |
| `threshold_get` | `threshold.get` | — |
| `config_get` | `config.get` | — |
| `config_set` | `config.set` | `interval_ms` / `theme` / `layout` |
| `process_alerts` | `process.alerts` | — |
| `alerts_status` | `alerts.status` | — |
| `plugin_status` | `plugin.status` | — |

Los argumentos tipados se traducen a la sintaxis de parámetros de cadena del
plugin antes de cada llamada a `execute_plugin` (consulta
[docs/mcp-protocol.md](../../docs/mcp-protocol.md)).

## Acoplamiento con samurai

Este crate depende de `xtop-plugin-samurai` en tiempo de compilación:

- cada llamada de herramienta apunta a `PLUGIN_ID`; no existe ningún otro id
  de plugin;
- `actions::*` dirige la tabla de herramientas y la traducción de argumentos.

Un renombrado del id del plugin o de una acción ahora rompe esta compilación
en lugar de romper a los clientes MCP en tiempo de ejecución. Arquitectura y
justificación: [docs/architecture.md](../../docs/architecture.md).

## Cómo lo lanza el kernel

`xtop mcp` (kernel, feature `mcp-extension`) construye `McpExtension::new()`
y llama a `run_server("mcp", ctx)` con un contexto de host que resuelve
`execute_plugin` contra los plugins alojados por el kernel.

## Desarrollo

```bash
cargo build --workspace
./scripts/ci.sh        # fmt | clippy | check | test
```

## Licencia

MIT
