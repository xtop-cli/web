# Widgets en tiempo de ejecución externos

`xtop-plugin-external` es una feature opcional del kernel que convierte procesos
auxiliares en widgets de plugin. El host lanza un proceso por descriptor e
intercambia **un objeto JSON por línea** por stdin/stdout: entran peticiones
(`manifest`, `render`, `shutdown`) y salen respuestas (`manifest`, `draw`,
`log`). El guest puede ser cualquier programa en cualquier lenguaje con un
runtime.

El proceso se ejecuta con los permisos de tu usuario y **es** el sandbox. Usa
los [widgets WASM](wasm-widgets.md) cuando quieras un guest en proceso y con
capacidades limitadas.

## Habilitar el host

La feature **no** forma parte de la compilación por defecto del kernel. Desde
el repositorio del kernel (`xtop/`):

```sh
cargo build --features plugin-external
# both runtime hosts at once:
cargo build --features plugin-wasm,plugin-external
```

Sin la feature, el directorio `external/` se ignora.

## Descriptores

Al arrancar, el host escanea la subcarpeta `external/` del directorio de
configuración del usuario y lee cada descriptor `*.json` (un plugin por
fichero, rutas ordenadas):

| Plataforma | Directorio |
|---|---|
| Linux | `$XDG_CONFIG_HOME/xtop/external/` (por defecto `~/.config/xtop/external/`) |
| macOS | `~/Library/Application Support/xtop/external/` |
| Windows | `%APPDATA%\xtop\external\` |

Define `XTOP_EXTERNAL_DIR` para anular el directorio por completo:

```sh
XTOP_EXTERNAL_DIR=/opt/xtop-widgets xtop
```

Campos del descriptor:

| Campo | Obligatorio | Por defecto | Notas |
|---|---|---|---|
| `name` | no | nombre de fichero sin extensión | Nombre de widget que usan los layouts. |
| `description` | no | `""` | Puede ser reemplazada por la `description` del manifest. |
| `command` | sí | — | array de argv, p. ej. `["python3", "/path/widget.py"]`. Se recomiendan rutas absolutas porque el directorio de trabajo del hijo no es el del descriptor. |
| `timeout_ms` | no | 2000 | Timeout de lectura por respuesta, acotado a 100–60000. |
| `max_processes` | no | 50 | Acotado a 1–4096. Cuando el valor del descriptor es el por defecto (50) y el manifest pide otro valor, gana el manifest. |

Ejemplo:

```json
{
  "name": "lua-clock",
  "description": "UTC clock in Lua",
  "command": ["lua5.4", "/home/me/widgets/lua-clock/widget.lua"],
  "timeout_ms": 2000,
  "max_processes": 1
}
```

Un descriptor con JSON inválido o un `command` vacío se omite con una línea de
log. Un proceso que no arranca o no responde a la petición inicial `manifest`
también se omite.

## Protocolo

Del host al guest (`Request`):

| Línea | Significado |
|---|---|
| `{"type":"manifest"}` | Pide el manifest; se envía una vez al cargar. |
| `{"type":"render","state":{...}}` | Pide una lista de dibujo; se envía una vez por tick. |
| `{"type":"shutdown"}` | Pide al proceso que salga limpiamente. |

Del guest al host (`Response`):

| Línea | Significado |
|---|---|
| `{"type":"manifest","manifest":{...}}` | Respuesta a `manifest`. |
| `{"type":"draw","ops":[...]}` | Respuesta a `render`. |
| `{"type":"log","message":"..."}` | Diagnóstico de formato libre; el host lo imprime en stderr como `[external:<name>] ...`. |

Reglas:

- El guest debe responder a cada petición con exactamente una respuesta que no
  sea `log`. Las líneas `log` pueden enviarse en cualquier momento y se omiten
  mientras se espera.
- Las líneas en blanco del guest se ignoran.
- No escribas nada que no sean líneas JSON en stdout; los diagnósticos en bruto
  van a stderr (el host lo hereda).
- Ante `shutdown`, o ante EOF en stdin, sal limpiamente con estado 0. El host
  escribe `{"type":"shutdown"}` y luego mata y recolecta al hijo sin esperar a
  que el guest salga por su cuenta.
- Una línea de respuesta malformada hace fallar la petición actual; el host lo
  registra una vez y conserva la última lista de dibujo cacheada.

La respuesta `manifest` debe deserializarse como
[`xtop-wasm-contract::Manifest`](wasm-widgets.md#manifest): `name` es el único
campo sin valor por defecto. El host usa `description` y, cuando el descriptor
deja `max_processes` en el valor por defecto, `max_processes`. La identidad del
widget viene del descriptor, no de `manifest.name`.

El payload `state` y las operaciones de la lista de dibujo son exactamente las
documentadas para los widgets WASM: ver [State](wasm-widgets.md#state) y
[Lista de dibujo](wasm-widgets.md#draw-list).

### Ejemplo de sesión

```
host -> {"type":"manifest"}
guest <- {"type":"manifest","manifest":{"name":"lua-clock","version":"0.1.0","description":"UTC clock","max_processes":1,"api":"1"}}
host -> {"type":"render","state":{...}}
guest <- {"type":"log","message":"tick 7"}
guest <- {"type":"draw","ops":[{"op":"block","rect":{"x":0,"y":0,"width":40,"height":12},"border":"rounded","title":"lua-clock"},{"op":"text","rect":{"x":1,"y":1,"width":38,"height":1},"spans":[{"text":"22:13:20","bold":true}],"align":"center"}]}
host -> {"type":"shutdown"}
```

## Ciclo de vida

| Fase | Qué ocurre |
|---|---|
| Carga | Lanza el proceso, envía `manifest`, espera hasta `timeout_ms` la respuesta. |
| Tick | Construye el `State`, envía `render`, omite las líneas `log` hasta la respuesta `draw` o el timeout, cachea la lista de dibujo. |
| Render | Reproduce la lista de dibujo cacheada; nunca se toca el proceso durante un frame. |
| Apagado | Envía `{"type":"shutdown"}`, luego mata y recolecta al hijo (al deshabilitar el plugin y al soltarlo). |

No hay recarga en caliente: los descriptores y los scripts se leen una vez al
arrancar, y la acción `reload` devuelve un error pidiendo un reinicio.

## Timeouts y fallos

- Cada espera de respuesta usa el `timeout_ms` del descriptor; un timeout se
  registra una vez por mensaje distinto.
- Ante cualquier fallo de tick (timeout, línea malformada, salida inesperada)
  la última lista de dibujo válida permanece en pantalla y el siguiente tick
  reintenta.
- Un proceso que sale no se relanza; las peticiones posteriores fallan con
  `process exited unexpectedly`.
- `max_processes` limita `snapshot.processes` tras ordenar por uso de CPU
  (descendente), igual que el host WASM.

## Acciones de depuración

| Acción | Devuelve |
|---|---|
| `status` | `name`, `path`, `command`, `ticks`, `ops`, `timeout_ms`, `last_error`. |
| `render` | La lista de dibujo cacheada como JSON. |
| `reload` | Error: los widgets externos se recargan reiniciando xtop. |

## Ejemplos

- [`examples/external/lua-clock/`](../examples/external/lua-clock/) — Lua 5.4 / LuaJIT.
- [`examples/external/lua-histogram/`](../examples/external/lua-histogram/) — histograma de Lua + estadística.
- [`examples/external/python-cpu/`](../examples/external/python-cpu/) — Python 3 (solo stdlib).
- [`examples/external/python-cpu-chart/`](../examples/external/python-cpu-chart/) — gráfico estadístico en Python (media móvil, ±σ, percentiles).
- [`examples/external/python-mem-regression/`](../examples/external/python-mem-regression/) — regresión por mínimos cuadrados en Python con R² y proyección.
- [`examples/external/node-clock/`](../examples/external/node-clock/) — Node.js (solo stdlib).

Consulta [`examples/external/README.md`](../examples/external/README.md) para
ver descriptores, pruebas manuales del protocolo con un `State` sintético y
comprobaciones de robustez.
