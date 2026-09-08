# Cómo crear (autoría) un crate de widget

Un widget es un **crate**: se renderiza contra el contrato de solo lectura
[`xtop-widget-api`](https://github.com/xtop-cli/api) y expone un único punto
de entrada `render`. El kernel muestra un widget cuando un pack lo registra
por nombre; este repositorio incluye dos packs — el pack base `xtop-widgets`
(la raíz de este workspace, un *agregador* de los crates por widget) y el
pack ASCII `xtop-widget-blocks` (un hermano de los crates por widget). Los
packs de la comunidad viven en `custom/` (ver su README).

## Estructura del repositorio

```
xtop-cli/widgets/
  xtop-widget-core/              shared engine: chart, option parsers, roles,
                                 formatting/painter, plus the `testkit` feature
                                 (WidgetState double for tests)
  xtop-widget-header/            one crate per widget, each exposing
  xtop-widget-cpu/                  `pub fn render(f: &mut Frame,
  … (11 crates)                      state: &dyn WidgetState, area: Rect)`
  src/                           xtop-widgets — the aggregator pack: depends
                                 on the 11 widget crates and builds the
                                 registry (name -> renderer) the kernel uses
  xtop-widget-blocks/            the alternate ASCII pack (monolithic crate)
  custom/                        community packs (see custom/README.md)
  docs/                          this guide + the widget reference
```

## La unidad que el usuario diseña e instala: un crate

La unidad instalable y diseñable de un widget es su carpeta de crate
`xtop-widget-<name>/`. Para diseñar tu propio widget:

1. Copia un crate de widget existente (`cp -r xtop-widget-processes
   xtop-widget-mycpu`) o genera un andamiaje (el comando `widget scaffold`
   del kernel emite la misma forma).
2. Renombra el paquete en `Cargo.toml` y conserva las dependencias de
   contrato: `xtop-widget-api` + `xtop-plugin-api` (tipos de modelo) +
   `xtop-widget-core` (motor compartido) + `ratatui`; la versión sigue en
   `0.1.0` (política de versiones: todo temprano, sin incrementos).
3. Implementa `pub fn render(f: &mut Frame, state: &dyn WidgetState,
   area: Rect)` en `src/lib.rs` — dibuja tu vista dentro de `area`, protegida
   para rects diminutos, usando `xtop-widget-core` para el marco, los
   colores y los gráficos.
4. Registra el crate bajo un nombre de widget. Los crates integrados los
   registra el agregador (`xtop-widgets::registry`, `src/lib.rs`); los
   crates de la comunidad se añaden como miembros del workspace y se
   cablean en el kernel del mismo modo que los packs (ver "Semántica de
   selección de pack" más abajo) — el kernel resuelve `(pack, name)` en
   tiempo de render, de modo que un crate diseñado sustituye a un widget
   integrado por nombre sin cambiar el diseño.

Las pruebas propias del widget viven en su `#[cfg(test)] mod tests` (junto
al código) y usan el doble de prueba compartido de la feature `testkit` de
`xtop-widget-core` — declarada en los `[dev-dependencies]` del crate como
`xtop-widget-core = { features = ["testkit"] }`.

## Contrato del renderizador

Un renderizador es una función simple dibujada sobre un [`Frame`] de ratatui
dentro de un [`Rect`], que recibe el estado de la aplicación como
`&dyn WidgetState`:

```rust
// xtop-widget-api (renderer.rs)
pub type WidgetRenderer =
    Arc<dyn Fn(&mut Frame, &dyn WidgetState, Rect) + Send + Sync>;

pub struct WidgetRegistration {
    pub name: String,
    pub render: WidgetRenderer,
}
```

`WidgetRegistration` es el tipo de registro canónico y vive únicamente en
`xtop-widget-api`. Los renderizadores nunca ven tipos del kernel — cada
valor que necesitan llega a través de `WidgetState`.

## El punto de entrada `registry()`

Un *pack* expone una función que devuelve sus renderizadores por *nombre* de
widget (los nombres que usan los diseños y el modo de pantalla completa). El
agregador construye un `HashMap<&'static str, WidgetRenderer>` a partir de
sus crates de widget:

```rust
pub fn registry() -> HashMap<&'static str, WidgetRenderer> {
    let mut m: HashMap<&'static str, WidgetRenderer> = HashMap::new();
    m.insert("header", Arc::new(xtop_widget_header::render));
    m.insert("cpu", Arc::new(xtop_widget_cpu::render));
    // ... every widget the pack provides
    m
}
```

Un pack registra solo los nombres que dibuja. Los nombres que no
proporciona vuelven al pack base (ver selección de pack más abajo), así que
`xtop-widget-blocks` registra `cpu`, `memory`, `processes`, `network`,
`storage`, `disk_io`, `summary` y `sensors` en su apariencia ASCII mientras
que cualquier otro nombre conserva el renderizado base.

## Qué ofrece `WidgetState`

`WidgetState` (xtop-widget-api, `state.rs`) es la vista muestreada y de solo
lectura de la aplicación en ejecución. Sus métodos se agrupan como:

- **La muestra** — `snapshot() -> Option<&SystemSnapshot>`: una instantánea
  por tick; `None` antes del primer tick, así que los renderizadores
  comienzan con un retorno temprano.
- **Tema** — `theme_name()`, `theme_fg()`, `theme_bg()`, `theme_palette()`
  (16 entradas RGB), `alerts()` (umbrales de cpu/mem/disco).
- **Estilo de glifos, ya resuelto** — `charset(name)`, `borders(name)`
  respetan el estilo global más cualquier anulación por widget; los
  renderizadores nunca resuelven la configuración por sí mismos.
- **Historial para gráficos** — `cpu_history()` (por núcleo
  `VecDeque<(f64, f64)>`), `mem_history()`, `net_rx_history()`,
  `net_tx_history()`. Cada entrada es `(x, y)`; el eje x es el
  índice/tiempo de la muestra.
- **Mapeo de procesos (UX9.1)** — `uid_to_name(uid)` resuelve un uid
  numérico al nombre de inicio de sesión que el kernel leyó de `/etc/passwd`
  (`None` = mostrar el uid numérico) y `process_cpu_history(pid)` devuelve
  las muestras recientes de CPU por proceso (de la más antigua a la más
  nueva; vacío = no se dibuja nada).
- **Estado de vista/control** — `search_query()`, `process_selected_pid()`,
  `process_sort_label()`, `process_sort_desc()` (dirección para el marcador
  de ordenación: `true` = descendente), `layout_name()`, `is_searching()`,
  `fullscreen_label()`, `sys_info()` (incl. los lectores UX9.1 `cpu_model`
  y `package_power_w`), y `process_view()` (las filas de procesos, ya
  filtradas por la consulta de búsqueda y ordenadas por la columna del
  usuario; la selección está anclada por PID).
- **Opciones de visualización (DR-UX1)** — `widget_options()` devuelve el
  objeto `options` del nodo de diseño que se está renderizando actualmente
  (`None` = comportamiento por defecto) y `logical_core_count()` el recuento
  de procesadores lógicos del host (usado para normalizar los valores de CPU
  por proceso a un porcentaje de toda la máquina). Las claves reconocidas
  por cada widget están documentadas en
  [`docs/widgets.md`](widgets.md) ("Opciones de diseño por widget").

## El motor compartido (`xtop-widget-core`)

Los crates de widget **no** reimplementan roles de paleta, análisis de
opciones, resolución de glifos, el motor de gráficos o la rampa de
temperatura — eso vive en `xtop-widget-core`:

- `util` — formato (bytes/velocidades/uptime/usado-libre), constantes de
  roles de paleta, `gauge_gradient`, la rampa de temperatura (`temp_color`),
  `resolved_charset`/`resolved_borders`, `draw_frame` (el prólogo de marco
  estándar de widget) y el lienzo de búfer directo `Painter`.
- `options` — helpers de análisis para el JSON `options` del diseño más los
  tipos de selección de núcleo/gráfico de cpu.
- `chart` — el motor de gráficos coloreado por celda (historiales) y los
  helpers de chispa de una fila (`spark_cells`, etc.) para braille por fila.
- `testkit` (feature de cargo, solo de desarrollo) — el doble de
  `WidgetState` + los helpers de terminal fuera de pantalla para pruebas.

El mapeo canónico de glifos (colores, bordes, marcadores de gráfico) vive en
el crate de contrato — los packs no deben **reimplementarlo**:

```rust
use xtop_widget_api::glyph::{border_for, marker_for, to_color, ASCII_BORDER};
```

(`to_color`/`border_for`/`marker_for` se omiten deliberadamente de la
reexportación en la raíz del crate; la ruta de importación `glyph` de arriba
es la única canónica.)

- `to_color([u8; 3]) -> Color` — convierte una entrada de la paleta del tema
  a un color de ratatui (`Color::Rgb` tal cual).
- `border_for(WidgetBorders) -> Set<'static>` — el marco de bordes para la
  elección de bordes por widget resuelta. `Native` → el marco estándar de
  una línea con box-drawing (`border::PLAIN`, la apariencia por defecto de
  ratatui); `Rounded` → `border::ROUNDED`; `Double` → `border::DOUBLE`;
  `Plain` y `Ascii` → `ASCII_BORDER` (el conjunto puro `+ - |`).
- `marker_for(ChartCharset) -> Marker` — el marcador de gráfico de ratatui
  del mismo nombre (`Braille`, `Dot`, `Block`, `HalfBlock`, `Bar`).
- `ASCII_BORDER` — el marco ASCII canónico, exportado para los casos que
  necesitan el conjunto en sí.

Como el mapeo es canónico, la misma configuración dibuja de forma idéntica
en cada pack. Un pack que quiera un glifo genuinamente distinto para la
misma configuración diverge deliberadamente y documenta por qué; no debe
copiar la tabla de mapeo. El pack de bloques conserva su propia apariencia
en las etiquetas del medidor de CPU (un relleno ASCII `#`) mientras que los
marcadores de gráfico respetan `state.charset(name)` igual que el pack
base.

## Patrón de acceso a los colores del tema

Los widgets pintan desde los arrays del tema, convirtiendo las entradas a
través de `to_color`:

```rust
let fg = to_color(*state.theme_fg()); // contract returns &[u8; 3]
let bg = to_color(*state.theme_bg());
// palette entries by index; indices used by this repo's widgets:
let accent = to_color(state.theme_palette()[6]); // processes accent
let dim = to_color(state.theme_palette()[8]);    // processes zebra rows
```

Los colores de los medidores eligen índices de paleta a partir de los
umbrales de `state.alerts()` mediante `xtop_widget_core::util::gauge_gradient`.
Los índices son *roles* semánticos (DR-UX3): la tabla de roles vive en
`xtop-widget-core/src/util.rs` (0 bg, 1 alert, 2 good, 3 warn, 4
lectura/descarga, 5 escritura/subida, 6 acento, 7 fg, 8 dim, 9–15 rampa de
series múltiples) y `docs/widgets.md` la repite. Los packs pueden usar los
mismos números pero no deben inventar ranuras no documentadas.

## Semántica de selección de pack (contrato del kernel)

El motor del kernel resuelve `(pack, name)` en tiempo de render, tal como se
implementa en `xtop/src/ui/layout/engine.rs`:

- Los packs se compilan en el binario del kernel en una lista ordenada por
  precedencia que comienza con el pack integrado `default`
  (`xtop_widgets::registry`); los packs adicionales (p. ej. `blocks`) se
  compilan detrás de features de Cargo del kernel.
- Para cada nombre de widget el motor pregunta a la configuración de estilo
  qué pack lo proporciona: una anulación por widget
  (`style.widgets.<name>.pack`) gana sobre el `style.pack` global; cuando no
  se elige ningún pack, el nombre se resuelve contra el pack `default`.
- Si el pack elegido no registra ese nombre (o el nombre del pack es
  desconocido), el motor vuelve al pack `default`.
- Los widgets de plugins (renderizados sobre la vista `HostState` del
  plugin) se comprueban primero y tienen precedencia sobre cualquier pack.

Así, un pack que quiera sustituir al `cpu` integrado registra un
renderizador bajo `"cpu"`, el usuario selecciona el pack, y cualquier nombre
que el pack no proporcione conserva su renderizado base.

## Instalar un crate diseñado (flujo del kernel UX9.2)

El comando `widget` del kernel refleja los comandos de plugins:

- `widget scaffold <name>` emite una plantilla de crate de un solo widget
  (la forma de los crates `xtop-widget-<name>` de este repositorio:
  manifiesto con las cuatro dependencias de contrato + `src/lib.rs` con
  `render` + una prueba que usa el testkit).
- `widget list` muestra los crates integrados y sus nombres de registro.
- `widget install <path>` añade el crate al manifiesto y a la tabla de
  packs, de modo que `xtop` renderiza el widget bajo su nombre registrado
  desde el siguiente lanzamiento — los diseños lo seleccionan exactamente
  igual que un widget integrado.
