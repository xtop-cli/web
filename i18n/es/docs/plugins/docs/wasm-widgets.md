# Widgets en tiempo de ejecución WASM

`xtop-plugin-wasm` es una feature opcional del kernel que convierte módulos
`*.wasm` en widgets de plugin normales. El host carga cada módulo en proceso a
través del sandbox de [wasmi](https://github.com/wasmi-lang/wasmi), le pide un
manifest y una lista de dibujo, y reproduce la lista de dibujo sobre el frame.
Los guests nunca ven ratatui, el kernel ni la terminal: intercambian con el host
JSON definido por
[`xtop-wasm-contract`](../plugins/xtop-wasm-contract/src/lib.rs).

Como los widgets se registran por la ruta normal de plugins, un widget en
tiempo de ejecución tiene precedencia sobre cualquier pack compilado y puede
reemplazar cualquier nombre de widget, incluidos los integrados como `cpu`.

## Habilitar el host

La feature **no** forma parte de la compilación por defecto del kernel. Desde
el repositorio del kernel (`xtop/`):

```sh
cargo build --features plugin-wasm
# both runtime hosts at once:
cargo build --features plugin-wasm,plugin-external
```

Sin la feature, el directorio `wasm/` se ignora y `xtop` se comporta
exactamente igual que antes.

## Instalar widgets

Al arrancar, el host escanea la subcarpeta `wasm/` del directorio de
configuración del usuario y carga cada fichero `*.wasm` (un plugin por módulo,
rutas ordenadas):

| Plataforma | Directorio |
|---|---|
| Linux | `$XDG_CONFIG_HOME/xtop/wasm/` (por defecto `~/.config/xtop/wasm/`) |
| macOS | `~/Library/Application Support/xtop/wasm/` |
| Windows | `%APPDATA%\xtop\wasm\` |

Define `XTOP_WASM_DIR` para anular el directorio por completo:

```sh
XTOP_WASM_DIR=/opt/xtop-widgets xtop
```

Reglas de descubrimiento:

- Que falte el directorio es normal: no se registra ningún widget en tiempo de
  ejecución.
- Un módulo que no compila o no se instancia se registra en stderr y se omite;
  los demás módulos siguen cargando.
- Cuando dos módulos declaran el mismo nombre de manifest, gana el primer
  fichero por orden lexicográfico de ruta y el duplicado se registra en el log.
- El `name` del manifest (o el nombre de fichero sin extensión cuando `name`
  está vacío) pasa a ser tanto el id del plugin como el nombre del widget. Los
  layouts referencian ese nombre.

## Referenciar un widget en un layout

Los layouts viven en `<config dir>/layouts/` como ficheros `.json`/`.jsonc` y
referencian los widgets por nombre:

```jsonc
{
    "name": "WASM Demo",
    "root": {
        "direction": "vertical",
        "areas": [
            { "widget": "header", "size": 3 },
            { "widget": "wasm-clock", "size": "30%" },
            { "widget": "wasm-cpu", "size": "*" }
        ]
    }
}
```

Los widgets de plugins se resuelven antes que los packs compilados, así que un
módulo llamado `cpu` reemplaza el widget `cpu` integrado.

## ABI

Un guest es un módulo `wasm32` que exporta `memory` y las funciones de abajo.
La macro `export_widget!` de `xtop-wasm-guest` genera las cinco funciones (el
target wasm exporta `memory` automáticamente); esta tabla es el contrato para
módulos escritos a mano.

| Export | Firma | Significado |
|---|---|---|
| `memory` | — | Memoria lineal que el host lee y escribe. Obligatoria. |
| `alloc` | `(i32) -> i32` | Reserva `len` bytes en la memoria del guest; devuelve el puntero, o 0 si falla. |
| `dealloc` | `(i32, i32) -> ()` | Libera un búfer devuelto previamente por `alloc`. |
| `manifest` | `() -> i32` | Escribe el JSON del manifest y devuelve su puntero. |
| `render` | `(i32, i32) -> i32` | Analiza el JSON de `State` en `(ptr, len)`, escribe el JSON de `DrawList` y devuelve su puntero. Devuelve 0 para rechazar el payload. |
| `result_len` | `() -> i32` | Longitud en bytes del JSON escrito por la última llamada a `manifest`/`render`. |

El host llama a `manifest` una vez al cargar y a `render` una vez por tick,
luego lee `result_len` inmediatamente después de cada llamada y copia el JSON
desde la memoria del guest. El único import del host es:

| Import | Firma | Significado |
|---|---|---|
| `host.log` | `(i32, i32, i32) -> ()` | Registra `len` bytes UTF-8 en `ptr`. Niveles: `0` debug, `1` info, `2` warn, cualquier otro error. |

Cualquier otro import hace fallar la instanciación. Los guests conservan el
estado entre ticks en sus propios estáticos (el host no envía historiales).

### Manifest

`manifest()` devuelve la forma JSON de `xtop-wasm-contract::Manifest`:

| Campo | Por defecto | Notas |
|---|---|---|
| `name` | nombre de fichero sin extensión | Nombre de widget que usan los layouts. Debe ser único en el kernel en ejecución; un valor vacío recae en el nombre de fichero sin extensión. |
| `version` | `""` | Formato libre; se muestra en la acción `status`. |
| `description` | `""` | Formato libre. |
| `author` | `""` | Formato libre. |
| `max_processes` | 50 | Acotado a 1–4096; limita la lista de procesos por tick (ver [Límite de procesos](#process-cap)). |
| `api` | `""` | Versión del contrato a la que apunta el guest. Vacío o `"1"` se acepta; cualquier otro valor registra una advertencia y aun así carga. `Manifest::default()` en Rust establece `"1"`. |

### State

En cada tick el host envía un objeto `State`. Todas las coordenadas son
relativas al área del widget.

| Campo | Tipo | Notas |
|---|---|---|
| `tick` | `u64` | Contador de ticks monótono desde la carga; el primer tick es 0. |
| `unix_time` | `u64` | Tiempo Unix en segundos proporcionado por el host (los guests no pueden leer el reloj en el sandbox). |
| `width`, `height` | `u16` | Última área de widget renderizada; ambos 0 antes del primer frame. |
| `config` | objeto | `theme`, `layout`, `interval_ms`, `hostname`. |
| `alerts` | objeto | `cpu_high`, `mem_high`, `disk_high`. |
| `snapshot` | objeto | Muestra del sistema para este tick (abajo). |

`snapshot` refleja el `SystemSnapshot` del kernel:

| Miembro | Campos |
|---|---|
| `cpus[]` | `name`, `usage`, `cpu_id`, `frequency`, `governor`, `temp_c` |
| `memory` | `total`, `used`, `available`, `free`, `percent` |
| `swap` | `total`, `used`, `free`, `percent` |
| `disks[]` | `mount_point`, `total_space`, `available_space`, `used_space`, `percent`, `file_system`, `mount_options` |
| `networks[]` | `name`, `received`, `transmitted`, `rx_speed`, `tx_speed`, `ip` |
| `processes[]` | `pid`, `name`, `cpu_usage`, `memory`, `user_id`, `state`, `cmd`, `exe_path`, `parent_pid`, `cmd_full`, `start_time`, `run_time`, `effective_user_id`, `group_id`, `cwd`, `thread_count`, `open_files`, `open_files_limit`, `disk_total_read_bytes`, `disk_total_write_bytes`, `environ`, `session_id` |
| `load` | `one`, `five`, `fifteen` |
| `uptime` | segundos |
| `cpu_temp` | grados |
| `disk_io[]` | `name`, `read_bytes`, `write_bytes`, `read_speed`, `write_speed` |
| `batteries[]` | `name`, `percentage`, `state`, `time_to_full`, `time_to_empty`, `health`, `cycle_count` |
| `gpus[]` | `name`, `usage`, `temperature`, `memory_total`, `memory_used` |
| `sys` | `hostname`, `os_version`, `kernel`, `desktop_env`, `shell`, `cpu_model`, `package_power_w` |

### Lista de dibujo

`render` responde con `{"ops": [...]}` — una lista ordenada de primitivas de
dibujo. Cada `rect` es relativo al área del widget y el host lo recorta, así
que los rects sobredimensionados son seguros.

| Op | Campos | Notas |
|---|---|---|
| `block` | `rect`, `border`, `title`, `fg`, `bg` | Caja con borde. `border`: `native` (por defecto), `rounded`, `double`, `plain`, `ascii`. |
| `text` | `rect`, `spans`, `align`, `wrap` | `align`: `left` (por defecto), `center`, `right`. Un `\n` dentro de un span inicia una línea nueva. |
| `gauge` | `rect`, `ratio`, `label`, `fg`, `bg`, `border` | Medidor horizontal; `ratio` se acota a 0–1. |
| `bar` | igual que `gauge` | Medidor de una sola línea. |
| `sparkline` | `rect`, `data`, `fg`, `bg` | Los valores de `data` se redondean a enteros (los negativos pasan a 0). |
| `chart` | `rect`, `datasets`, `x_bounds`, `y_bounds`, `border`, `fg`, `bg`, `marker` | Elementos de `datasets`: `name`, `points` (pares `[x, y]`, la Y crece hacia arriba), `color`. `x_bounds`/`y_bounds` son `[min, max]`. `marker`: `braille` (por defecto), `dot`, `block`, `half_block`, `bar`. |

`rect` es `{x, y, width, height}` (todo por defecto 0). Un `span` es `{text,
fg, bg, bold, italic, underlined, dim}` con `text` obligatorio y los flags de
estilo por defecto a `false`. Los colores son arrays `[r, g, b]`; los colores
opcionales pueden ser `null` u omitirse.

Ejemplo:

```json
{"ops":[
  {"op":"block","rect":{"x":0,"y":0,"width":30,"height":8},
   "border":"rounded","title":"CPU","fg":[200,200,200],"bg":null},
  {"op":"gauge","rect":{"x":1,"y":1,"width":28,"height":3},
   "ratio":0.42,"label":"42%","fg":[123,216,143],"bg":null,"border":null}
]}
```

## Sandbox

- **Fuel**: 100.000.000 unidades de fuel por secuencia de llamada host→guest
  (una llamada `manifest` o `render` incluyendo las llamadas `alloc`, `dealloc`
  y `result_len` a su alrededor). wasmi cobra fuel por instrucción ejecutada,
  así que un bucle descontrolado se detiene con un trap en lugar de colgar el
  kernel.
- **Memoria**: tope de 64 MiB de memoria lineal por instancia de guest.
- **Imports**: solo se enlaza `host.log`; cualquier otro import hace fallar la
  instanciación.
- **Recorte**: cada rect de operación se recorta al área del widget.
- **Aislamiento**: los guests nunca tocan los tipos del kernel, ratatui ni la
  terminal.

## Recarga en caliente

En cada tick el host compara el mtime del fichero con el registrado al cargar y
reinstancia el módulo cuando ha cambiado:

- Una recarga fallida conserva el módulo anterior y su última lista de dibujo
  buena; el error se registra una vez por mensaje distinto.
- Una recarga correcta toma el `max_processes` del nuevo manifest y el nuevo
  módulo renderiza en ese mismo tick.
- Si el nuevo manifest declara un `name` distinto, el host registra una
  advertencia pero los layouts siguen referenciando el nombre original.
- La acción de depuración `reload` fuerza la comprobación de recarga incluso
  cuando el mtime no ha cambiado.

## Tick vs render

| Fase | Qué ocurre |
|---|---|
| Tick (`on_tick`) | Comprobación de recarga, construir el `State`, llamar una vez al `render` del guest, cachear el `DrawList` devuelto. |
| Render (frame) | Reproducir la lista cacheada y registrar el tamaño actual del área del widget. Nunca llama al guest. |

Consecuencias:

- Un guest lento puede retrasar un tick pero no puede bloquear un frame.
- `state.width`/`state.height` son el tamaño del área renderizada por última
  vez; ambos son 0 antes del primer frame, así que se recomiendan guardas para
  áreas pequeñas (los ejemplos retornan pronto).
- Un render fallido deja en pantalla la última lista cacheada.

## Límite de procesos

`max_processes` (campo del manifest, por defecto 50, acotado a 1–4096) limita
`snapshot.processes`. El host ordena los procesos por uso de CPU (descendente)
antes de truncar, así que el límite conserva los procesos más activos. Ponlo a
1 en widgets que nunca leen la lista de procesos para mantener pequeño el JSON
por tick.

## Acciones de depuración

El widget también expone la API estándar de acciones de plugin (`status`,
`render`, `reload`), accesible desde agentes/MCP a través de `execute_plugin`:

| Acción | Devuelve |
|---|---|
| `status` | `name`, `version`, `path`, `ticks`, `ops`, `last_error`. |
| `render` | La lista de dibujo cacheada como JSON. |
| `reload` | `{"reload":"requested"}` tras forzar una comprobación de recarga. |

## Escribir un guest en Rust

1. Crea un crate `cdylib` que dependa de `xtop-wasm-guest`:

```toml
[package]
name = "my-widget"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
# Path used inside the plugins repo; point at the repository elsewhere.
xtop-wasm-guest = { path = "../../plugins/xtop-wasm-guest" }
```

2. Añade el target wasm una vez:

```sh
rustup target add wasm32-unknown-unknown
```

3. Escribe `src/lib.rs` con `export_widget!`:

```rust
use xtop_wasm_guest::contract::{Align, DrawList, Manifest, Op, Rect, Span, State};
use xtop_wasm_guest::export_widget;

export_widget! {
    manifest: || Manifest {
        name: "my-widget".to_string(),
        description: "hello from wasm".to_string(),
        max_processes: 1,
        ..Manifest::default()
    },
    render: |state: &State| {
        let mut list = DrawList::new();
        list.push(Op::Text {
            rect: Rect::full(state.width, state.height),
            spans: vec![Span::new(format!("tick {}", state.tick))],
            align: Align::Left,
            wrap: false,
        });
        list
    },
}
```

`manifest` es un `Fn() -> Manifest` y `render` es un `Fn(&State) -> DrawList`.
Un guest que necesite estado temporal entre ticks lo conserva en un `static`
(ver [`examples/wasm/cpu`](../examples/wasm/cpu/src/lib.rs)).

4. Compila el módulo:

```sh
cargo build --release --target wasm32-unknown-unknown
```

5. Instálalo y referencia el nombre del manifest en un layout:

```sh
mkdir -p ~/.config/xtop/wasm
cp target/wasm32-unknown-unknown/release/my_widget.wasm ~/.config/xtop/wasm/
```

6. Prueba el módulo sin el kernel:

```sh
cargo run -p xtop-plugin-wasm --example inspect -- path/to/my_widget.wasm
```

`inspect` carga el módulo por el mismo camino de código que usa el kernel,
imprime el manifest y renderiza contra un estado sintético (40x12, una CPU, un
proceso) como JSON. Ejecútalo desde la raíz del repositorio `plugins`.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| El módulo no se registra; stderr muestra `failed to load` | Falta el export `memory` o una de las funciones de la ABI, o el módulo importa algo distinto de `host.log`. |
| `guest rejected the state payload` | `render` devolvió 0 (JSON de `State` inválido o lógica del guest). |
| `draw list is not valid JSON` | `result_len` no describe el JSON escrito por `render`. |
| Error de `fuel`/`trap` en `status.last_error` | El guest superó el presupuesto de 100M de fuel (bucle descontrolado). |
| `name already loaded` | Dos módulos declaran el mismo nombre de manifest; gana la primera ruta por orden lexicográfico. |
| `targets contract X (host speaks 1)` | Desajuste del `api` del manifest; el módulo carga de todos modos. |
| El nombre del widget muestra el nombre de fichero sin extensión | El `name` del manifest está vacío. |
