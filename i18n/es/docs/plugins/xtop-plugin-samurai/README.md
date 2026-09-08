# xtop-plugin-samurai

Samurai es un plugin de monitorización y gestión del sistema preparado para
IA para [xtop](https://github.com/xtop-cli/xtop). Expone métricas del
sistema, información de procesos y configuración en tiempo de ejecución a
través de una API JSON de acciones, ejecuta diez reglas heurísticas de
detección de amenazas sobre la tabla de procesos y renderiza un pequeño
widget TUI.

El plugin es una librería que implementa el trait `Plugin` de
[`xtop-plugin-api`](https://github.com/xtop-cli/api); el kernel lo aloja a
través de un feature flag y no distribuye un binario propio.

## Funcionalidades

- API JSON de acciones sobre un único punto de entrada `execute()`: resumen
  del sistema, consultas de procesos (top por CPU, búsqueda por regex,
  información por PID), eliminación de procesos, umbrales de alerta
  (get/set), configuración en tiempo de ejecución (get/set), estado de las
  alertas y estado del plugin.
- Análisis heurístico de procesos con **10 reglas** (rutas sospechosas,
  procesos huérfanos, suplantación, escalada EUID/UID, hijos de navegadores,
  nombres de mineros/rootkits conocidos, líneas de comandos con pipe/descarga,
  recuentos altos de hilos/FD, spawn storms) — se ejecuta cada quinto tick,
  con un tope de **50 alertas** por ejecución.
- Datos de alertas y estado expuestos como JSON para scripts, agentes y la
  extensión MCP.
- Un widget de plugin llamado `samurai` para layouts TUI personalizados.

## Constantes del ecosistema

Este crate es la única fuente de verdad (DR-6) para:

- `PLUGIN_ID` — el id del plugin alojado (`"samurai"`), usado por el kernel
  y por la extensión MCP para `execute_plugin`.
- `actions::*` — los 12 nombres de acción que entiende `execute()`:
  `SYSTEM_SUMMARY`, `PROCESSES_TOP`, `PROCESSES_SEARCH`, `PROCESS_INFO`,
  `PROCESS_KILL`, `PROCESS_ALERTS`, `THRESHOLD_SET`, `THRESHOLD_GET`,
  `CONFIG_GET`, `CONFIG_SET`, `ALERTS_STATUS`, `PLUGIN_STATUS`.

## API de acciones

Toda interacción pasa por:

```rust
plugin.execute(ctx, "<action>", "<params>") // -> Result<String, PluginError>
```

La respuesta siempre es una cadena JSON. Los nombres de acción, los
parámetros y las formas de las respuestas están documentados en
[docs/architecture.md](../../docs/architecture.md); referencia rápida:

| Acción | Parámetros |
|---|---|
| `system.summary` | (ninguno) |
| `processes.top` | `count` o `count,filter=<regex>` |
| `processes.search` | `pattern` o `pattern,fields=name,cmd,user,state,exe,cwd` |
| `process.info` | `pid` |
| `process.kill` | `pid` |
| `process.alerts` | (ninguno) |
| `threshold.set` | `cpu,mem,disk` (porcentajes) |
| `threshold.get` | (ninguno) |
| `config.get` | (ninguno) |
| `config.set` | `interval_ms=<ms>`, `theme=<name>` o `layout=<name>` |
| `alerts.status` | (ninguno) |
| `plugin.status` | (ninguno) |

**Semántica de las regex.** Los patrones de búsqueda y filtrado se pasan
directamente a `regex::Regex::new` — sin envoltura `/…/`. Cada patrón es una
única regex compilada, que se compara con `is_match()` contra **cualquiera**
de los campos que selecciones (`fields=` en `processes.search`; name/cmd/exe
en el filtro de `processes.top`). Ejemplos:

```
processes.search("python|node")                    # name contains python or node
processes.search("^1000$,fields=user")             # user id match
processes.top("5,filter=nginx")                    # top 5 processes named nginx
```

## Análisis heurístico

El analizador se ejecuta **cada quinto tick** (el kernel emite un tick
aproximadamente una vez por segundo, así que más o menos cada 5 segundos) y
conserva hasta **50 alertas** por ejecución repartidas en **10 reglas**. Las
reglas y sus umbrales exactos están documentadas en
[docs/rules.md](../../docs/rules.md); resumen:

1. ejecutable desde una ruta sospechosa (`/tmp`, `/dev/shm`, `/var/tmp`, …)
2. proceso huérfano (PPID=1) que no es un demonio conocido
3. suplantación (nombre de sistema fuera de la ruta canónica, o discordancia
   entre nombre y exe)
4. escalada de privilegios EUID != UID
5. hijo desconocido de un proceso de navegador
6. nombres o patrones de comando de mineros/rootkits conocidos (`xmrig`,
   `minerd`, `pool.monero`, …)
7. líneas de comandos con pipe/descarga (`curl … | sh`, `base64 -d |`, …)
8. recuento de hilos >= 500 (que no sea un servidor/navegador en lista
   blanca)
9. descriptores de archivo abiertos >= 1000 (que no sea un
   servidor/navegador en lista blanca)
10. spawn storm: más de 5 instancias nuevas de un nombre dentro de 120 s

## Widget TUI

El plugin registra un widget llamado `samurai` (igual a `PLUGIN_ID`). Para
verlo, habilita el plugin (necesita la capacidad `RenderWidgets`) y añade
`"samurai"` a un layout:

```jsonc
{
    "name": "monitor",
    "root": {
        "direction": "vertical",
        "areas": [
            { "widget": "header", "size": 3 },
            { "widget": "samurai", "size": 6 },
            { "widget": "processes", "size": "*" }
        ]
    }
}
```

## Integración con MCP

El propio Samurai **no incluye un servidor MCP integrado**. El acceso a las
herramientas para IA lo proporciona el crate `xtop-extension-mcp` del
[repositorio de extensiones](https://github.com/xtop-cli/extensions), que el
kernel lanza con `xtop mcp`. Depende de este crate en tiempo de compilación,
dirige el plugin con `execute_plugin(PLUGIN_ID, action, params)` y deriva
sus 12 herramientas de las constantes `actions::*`; consulta
`docs/mcp-protocol.md` en ese repositorio para el mapeo del protocolo
(wire).

## Documentación

- [docs/architecture.md](../../docs/architecture.md) — ciclo de vida,
  API de acciones y sintaxis de parámetros, capacidades, widget, relación
  con MCP.
- [docs/rules.md](../../docs/rules.md) — las 10 reglas heurísticas con
  umbrales exactos y patrones de disparo.

## Desarrollo

```bash
cargo build --workspace
./scripts/ci.sh        # fmt | clippy | check | test
```

## Licencia

MIT
