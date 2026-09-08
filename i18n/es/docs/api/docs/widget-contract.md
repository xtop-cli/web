# Contrato de render de widgets — `xtop-widget-api`

`xtop-widget-api` (`api/crates/widget-api/`) es el contrato de renderizador
para packs de widgets (DR-2). Los widgets son las partes visuales que se
dibujan dentro de las áreas del layout: el kernel incluye un pack base, y
cualquier otro pack (pack de bloques, comunidad, plugin) proporciona
renderizadores para los mismos nombres de widget o para otros nuevos.

Tres piezas componen el crate:

- `state::WidgetState` — la vista de solo lectura que recibe un renderizador;
- `glyph` — los enums de estilo de glifos más los mapeos **canónicos** a los
  primitivos de dibujo de ratatui;
- `renderer::{WidgetRegistration, WidgetRenderer}` — cómo registran los packs
  renderizadores por nombre de widget.

La raíz del crate re-exporta `WidgetState`, `WidgetRegistration`,
`WidgetRenderer` y los **enums** de glifos (`ChartCharset`, `WidgetBorders`);
los helpers de mapeo de glifos solo son alcanzables bajo el módulo `glyph`
(`xtop_widget_api::glyph::to_color` etc. — decisión D5).

Como todo crate de contrato, nunca depende del kernel. Depende de ratatui
(por `Frame`, `Rect`, `Marker`, los conjuntos de bordes), de serde (por los
enums de glifos) y de `xtop-plugin-api` (por el modelo de datos que nombran
sus métodos de `WidgetState`).

## `WidgetState` — la vista del renderizador (28 métodos)

Cada renderizador dibuja contra este trait — nunca contra tipos del kernel.
El kernel lo implementa sobre su `AppState` vivo
(`xtop/src/state/widget_state.rs`) y el motor de renderizado se lo entrega a
los renderizadores de los packs. De solo lectura por diseño: los widgets
nunca mutan el estado de la aplicación.

Los 28 métodos del trait, agrupados como en el código fuente:

| Grupo | Método | Firma | Significado |
|---|---|---|---|
| Muestra | `snapshot` | `fn snapshot(&self) -> Option<&SystemSnapshot>` | muestra actual por tick; `None` antes del primer tick |
| Tema | `theme_name` | `fn theme_name(&self) -> &str` | nombre del tema activo |
| Tema | `theme_fg` | `fn theme_fg(&self) -> &[u8; 3]` | primer plano del tema como tripleta RGB |
| Tema | `theme_bg` | `fn theme_bg(&self) -> &[u8; 3]` | fondo del tema como tripleta RGB |
| Tema | `theme_palette` | `fn theme_palette(&self) -> &[[u8; 3]; 16]` | paleta de 16 entradas |
| Tema | `alerts` | `fn alerts(&self) -> AlertThresholds` | umbrales de alerta actuales |
| Estilo de glifos | `charset` | `fn charset(&self, widget: &str) -> ChartCharset` | charset resuelto para un widget |
| Estilo de glifos | `borders` | `fn borders(&self, widget: &str) -> WidgetBorders` | estilo de borde resuelto para un widget |
| Historial | `cpu_history` | `fn cpu_history(&self) -> &[VecDeque<(f64, f64)>]` | historial por núcleo (x, y) |
| Historial | `mem_history` | `fn mem_history(&self) -> &VecDeque<(f64, f64)>` | historial del porcentaje de memoria |
| Historial | `net_rx_history` | `fn net_rx_history(&self) -> &VecDeque<(f64, f64)>` | historial de la **tasa** de recepción sumada (bytes/s) |
| Historial | `net_tx_history` | `fn net_tx_history(&self) -> &VecDeque<(f64, f64)>` | historial de la tasa de transmisión sumada (bytes/s) |
| Historial | `disk_read_history` | `fn disk_read_history(&self) -> &VecDeque<(f64, f64)>` | historial de la **tasa de lectura** de disco sumada (bytes/s, agregada entre discos); por defecto vacío |
| Historial | `disk_write_history` | `fn disk_write_history(&self) -> &VecDeque<(f64, f64)>` | historial de la **tasa de escritura** de disco sumada (bytes/s, agregada entre discos); por defecto vacío |
| Historial | `load_history` | `fn load_history(&self) -> &VecDeque<(f64, f64)>` | historial de la media de carga de 1 minuto (`load_avg.one`); por defecto vacío |
| Vista/control | `search_query` | `fn search_query(&self) -> &str` | texto activo de búsqueda de procesos |
| Vista/control | `process_selected_pid` | `fn process_selected_pid(&self) -> Option<u32>` | fila seleccionada, anclada por PID |
| Vista/control | `process_sort_label` | `fn process_sort_label(&self) -> &str` | etiqueta de la columna de ordenación activa |
| Vista/control | `process_sort_desc` | `fn process_sort_desc(&self) -> bool` | si la ordenación activa de procesos es descendente; por defecto `false` (ascendente) reproduce el comportamiento previo a la dirección para los implementadores que no registran una dirección |
| Vista/control | `layout_name` | `fn layout_name(&self) -> &str` | nombre del layout activo |
| Vista/control | `is_searching` | `fn is_searching(&self) -> bool` | superposición de búsqueda activa |
| Vista/control | `fullscreen_label` | `fn fullscreen_label(&self) -> Option<&str>` | etiqueta del widget a pantalla completa, `None` cuando no está a pantalla completa |
| Vista/control | `sys_info` | `fn sys_info(&self) -> SystemInfo` | copia propiedad de la identidad de la máquina |
| Vista/control | `process_view` | `fn process_view(&self) -> Vec<&ProcessInfo>` | filas de procesos que dibuja el widget de procesos |
| Mapeo de procesos | `uid_to_name` | `fn uid_to_name(&self, uid: u32) -> Option<String>` | nombre de login para un uid numérico (el kernel lo resuelve desde `/etc/passwd` en unix, más los usuarios de Directory Services vía `dscl` en macOS y las cuentas locales vía `Get-LocalUser` en Windows, indexados por uid numérico); por defecto `None` — los renderizadores recurren al uid numérico (UX9.1) |
| Mapeo de procesos | `process_cpu_history` | `fn process_cpu_history(&self, pid: u32) -> Vec<f64>` | muestras recientes de uso de CPU por proceso (porcentaje de un núcleo lógico), de más antigua a más nueva, ~30 muestras por pid; por defecto vacío — los renderizadores no dibujan nada para una serie vacía (UX9.1) |
| Opciones de layout | `logical_core_count` | `fn logical_core_count(&self) -> usize` | procesadores lógicos que reporta el host; por defecto `1` reproduce el comportamiento previo a DR-UX1 para los renderizadores que lo ignoran |
| Opciones de layout | `widget_options` | `fn widget_options(&self) -> Option<&serde_json::Value>` | objeto `options` del widget que se está renderizando (`None` cuando el nodo de layout no porta ninguno); por defecto `None`; los renderizadores deben tratar `None` como comportamiento por defecto |

Los cinco métodos bajo "Opciones de layout" y "Mapeo de procesos"
(adiciones DR-UX1/UX3/UX5/UX9.1) vienen con **implementaciones por defecto**,
así que los implementadores existentes compilan sin cambios y la salida sin
`options` es byte-idéntica al comportamiento previo a las opciones.
`logical_core_count` permite a un renderizador normalizar un uso de CPU por
proceso (o por núcleo) — una fracción de un núcleo lógico — hasta una
proporción de la CPU de toda la máquina (visualización `CpuBasis::Total`); el
kernel lo implementa desde `available_parallelism`. `widget_options` porta
las opciones de visualización por instancia desde el nodo de layout mientras
ese widget se dibuja; el valor nunca es `null`, solo es válido durante la
llamada de renderizado, y las claves desconocidas deben ignorarse.
`process_sort_desc` alimenta el marcador de dirección del widget de procesos
(`▼` descendente / `▲` ascendente) en el encabezado de la columna ordenada;
el kernel devuelve su flag vivo `cycle_sort`. Los tres métodos de historial
añadidos para la superficie de datos UX8 (`disk_read_history`,
`disk_write_history`, `load_history`) también se entregan con
implementaciones vacías por defecto: son historiales acotados que el kernel
alimenta por tick (tasas de disco agregadas en bytes/s y la media de carga de
1 minuto), y los implementadores que todavía no los registran siguen
compilando sin cambios. Los dos helpers de proceso de UX9.1 tienen por
defecto `None` / una serie vacía: `uid_to_name` resuelve un uid numérico a un
nombre de login (el mapeo uid→nombre es una preocupación de visualización y
vive deliberadamente en la vista de estado, no en el modelo de datos — los
renderizadores recurren al uid numérico), y `process_cpu_history` devuelve
las muestras de CPU por proceso acotadas (de más antigua a más nueva) para un
pequeño spark de braille, vacío para pids no registrados.

Semánticas dignas de mención:

- **El estilo de glifos está resuelto**: el kernel resuelve las
  sobrescrituras por widget contra el estilo global (`UiStyle::charset_for/borders_for`
  en la config del kernel), así que el renderizador no debe resolver nada por
  sí mismo — el contrato ya devolvió la elección efectiva para el widget
  nombrado.
- **El historial son pares `(f64, f64)`** — x (coordenada de tick/tiempo
  transcurrido) e y (valor), la forma que consumen los datasets `Chart` de
  ratatui. El historial de red registra tasas, no contadores acumulados, así
  que los gráficos muestran rendimiento; lo mismo vale para los historiales
  de tasas de lectura/escritura de disco (bytes/s agregados entre discos).
  `load_history` registra la media de carga de 1 minuto. Todos los
  historiales están acotados al `history_points` del kernel.
- **`process_view`** es la única muestra por tick filtrada por la consulta de
  búsqueda activa y ordenada por la columna elegida por el usuario; la
  selección se ancla por PID para que el resaltado y la acción de matar
  coincidan siempre en la misma fila.
- **`snapshot` devuelve una referencia** (`Option<&SystemSnapshot>`) — toma
  prestada la muestra; nunca la clones por frame. `sys_info` es la única
  copia propiedad (barata, cambia lentamente).

## `WidgetRenderer` y `WidgetRegistration`

```rust
pub type WidgetRenderer =
    Arc<dyn Fn(&mut Frame, &dyn WidgetState, Rect) + Send + Sync>;

pub struct WidgetRegistration {
    pub name: String,        // widget name as layouts use it
    pub render: WidgetRenderer,
}
```

Un pack registra un renderizador por **nombre** de widget. `WidgetRegistration`
es el tipo de registro canónico (DR-2; nada fuera de `widget-api` lo define —
gate de grep del workspace M7.4). Hoy los packs devuelven su registro
directamente como `HashMap<&'static str, WidgetRenderer>` (`registry()` en el
repo widgets); el engine resuelve `(pack, name)` en tiempo de renderizado.

## Enums de glifos y sus valores serde

Ambos enums viven en `glyph.rs`, se re-exportan en la raíz del crate y
derivan `Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize` con
`#[serde(rename_all = "snake_case")]` — estos son los valores que el kernel
persiste en la config del usuario (`UiStyle`/`WidgetStyle` en el esquema de
config del kernel).

| Enum | Variants | Por defecto | JSON (serde) |
|---|---|---|---|
| `ChartCharset` | `Braille`, `Dot`, `Block`, `HalfBlock`, `Bar` | `Braille` | `"braille"`, `"dot"`, `"block"`, `"half_block"`, `"bar"` |
| `WidgetBorders` | `Native`, `Rounded`, `Double`, `Plain`, `Ascii` | `Native` | `"native"`, `"rounded"`, `"double"`, `"plain"`, `"ascii"` |

## Helpers canónicos de glifos (`xtop_widget_api::glyph`)

Los packs NO deben reimplementar estos mapeos — los importan de aquí, para
que la misma configuración se dibuje de forma idéntica en todos los packs. El
kernel solo almacena los enums del contrato; convertirlos en glifos es
trabajo de este módulo. Los tests dentro del crate fijan cada fila de las
tablas de mapeo siguientes.

```rust
// The one canonical import path (helpers are not re-exported at the root):
use xtop_widget_api::glyph::{ASCII_BORDER, border_for, marker_for, to_color};
```

### `to_color`

```rust
pub fn to_color(palette_entry: [u8; 3]) -> ratatui::style::Color
```

Devuelve `Color::Rgb(r, g, b)` verbatim para la tripleta — las entradas de la
paleta ya son RGB de 24 bits, así que no se aplica ninguna cuantización.
Observa el parámetro `[u8; 3]` por valor (las copias privadas de los packs
toman `&[u8; 3]`; los puntos de llamada se adaptan soltando la referencia
cuando migran, M3).

### `border_for` y `ASCII_BORDER`

```rust
pub const ASCII_BORDER: ratatui::symbols::border::Set<'static> = /* + - | frame */;
pub fn border_for(borders: WidgetBorders) -> ratatui::symbols::border::Set<'static>
```

El módulo `symbols::border` de ratatui ya no incluye un conjunto ASCII (su
`PLAIN` es el marco de dibujo de caja de una línea desde ratatui 0.29), así
que el contrato proporciona el canónico. Tanto `Plain` como `Ascii` se
mapean a él; los packs no deben implementarse a mano su propia copia.
Decisiones de mapeo (un aspecto de borde por conjunto de ratatui, sin
divergencia específica de pack):

| `WidgetBorders` | `border_for` devuelve | Aspecto |
|---|---|---|
| `Native` | `ratatui::symbols::border::PLAIN` | dibujo de caja estándar de una línea (`┌─┐│└┘`), el conjunto por defecto del propio ratatui — el aspecto clásico |
| `Rounded` | `border::ROUNDED` | dibujo de caja con esquinas redondeadas |
| `Double` | `border::DOUBLE` | dibujo de caja de línea doble |
| `Plain` | `ASCII_BORDER` | marco ASCII puro `+ - \|` |
| `Ascii` | `ASCII_BORDER` | el mismo marco (`Ascii` es una grafía de config explícita de la misma intención) |

Glifos de `ASCII_BORDER` (codificados exactamente así, y afirmados por test):

| Glifo | Valor |
|---|---|
| `top_left` | `"+"` |
| `top_right` | `"+"` |
| `bottom_left` | `"+"` |
| `bottom_right` | `"+"` |
| `vertical_left` | `"\|"` |
| `vertical_right` | `"\|"` |
| `horizontal_top` | `"-"` |
| `horizontal_bottom` | `"-"` |

### `marker_for`

```rust
pub fn marker_for(charset: ChartCharset) -> ratatui::symbols::Marker
```

El mapeo refleja el marker de ratatui del mismo nombre:

| `ChartCharset` | `marker_for` devuelve |
|---|---|
| `Braille` | `Marker::Braille` |
| `Dot` | `Marker::Dot` |
| `Block` | `Marker::Block` |
| `HalfBlock` | `Marker::HalfBlock` |
| `Bar` | `Marker::Bar` |

Un pack que necesite un glifo diferente para la misma config no debe
reimplementar la tabla; diverge deliberadamente y documenta por qué.

## La regla DR-2 en la práctica: los packs importan, nunca reimplementan

Antes de que existiera este contrato, cada pack reimplementaba a mano
`to_color`, `border_for`, `marker_for` y un conjunto ASCII — y las copias ya
discrepaban (el pack base mapeaba `Plain` al `PLAIN` de dibujo de caja, el
pack de bloques lo mapeaba a su propio marco ASCII). La migración (repo
widgets, M3.3/M3.4):

- el `util.rs` del pack base borra sus copias de
  `to_color`/`border_for`/`marker_for`/`ascii_border` e importa las
  canónicas; los helpers de formato privados del pack (`format_bytes`,
  `format_uptime`, `gauge_gradient`) siguen siendo privados del pack donde
  todavía se usan;
- el pack de bloques borra su `to_color`/`ascii_border`/`border_for`
  implementados a mano, elimina su hack de lint `const _: ChartCharset` y
  honra `state.charset(widget)` en lugar de fijar `Marker::Block`.

La divergencia de `Plain`/`Ascii` desaparece por construcción: ambas grafías
son ASCII aquí.

## Widgets de plugins vs registros de packs

El `WidgetRegistration` de `xtop-widget-api` dibuja sobre `&dyn WidgetState`
— la vista de pack. El `PluginWidget` de `xtop-plugin-api` dibuja sobre
`&dyn HostState` — la vista de plugin (ver
[plugin-contract.md](plugin-contract.md)). Son dos contratos distintos y
deliberadamente no comparten nombre (M1.3). En el motor de renderizado del
kernel el orden de resolución es: **primero los widgets de plugins, después
el pack elegido por el usuario para el nombre, y después el pack por
defecto** (kernel `ui/layout/engine.rs` + `ui/screen.rs`): los widgets de
plugins pueden sustituir cualquier nombre.

## Implementar un pack

Un pack es un crate que devuelve un registro nombre → renderizador. Los
renderizadores de widgets son funciones planas con la firma exacta
`fn(&mut Frame, &dyn WidgetState, Rect)`:

```rust
use std::collections::HashMap;
use std::sync::Arc;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders};
use ratatui::Frame;
use xtop_widget_api::glyph::{border_for, to_color};
use xtop_widget_api::{WidgetRenderer, WidgetState};

pub fn registry() -> HashMap<&'static str, WidgetRenderer> {
    let mut m: HashMap<&'static str, WidgetRenderer> = HashMap::new();
    m.insert("cpu", Arc::new(cpu::render));
    m.insert("memory", Arc::new(memory::render));
    m
}

pub mod cpu {
    use super::*;

    pub fn render(f: &mut Frame, state: &dyn WidgetState, area: Rect) {
        let Some(snap) = state.snapshot() else { return }; // None before first tick
        let fg = to_color(*state.theme_fg()); // canonical helper takes [u8; 3] by value
        let bg = to_color(*state.theme_bg());
        let block = Block::default()
            .borders(Borders::ALL)
            .border_set(border_for(state.borders("cpu")))
            .style(Style::default().fg(fg).bg(bg));
        f.render_widget(block, area);
        // Draw into block.inner(area): gauges per core from `snap.cpus`,
        // charts from state.cpu_history() with marker_for(state.charset("cpu")).
        let _ = snap;
    }
}
```

Reglas del camino para los autores de packs:

- Renderiza solo desde `WidgetState`; nunca nombres tipos del kernel. El pack
  base (`xtop-widgets`) proporciona los nombres clásicos que usan los layouts
  por defecto — `header`, `cpu`, `memory`, `storage`, `network`,
  `processes`, `disk_io`, `battery`, `gpu` — y los packs alternativos pueden
  sustituir cualquiera de ellos por nombre.
- Protégete de `snapshot() == None` (primer tick) y de áreas pequeñas/vacías;
  los renderizadores nunca deben entrar en pánico con estado pequeño/vacío.
- Usa los helpers canónicos de glifos; cualquier divergencia deliberada debe
  documentarse (p. ej. una interpretación visual alternativa de un charset).
- Las elecciones de estilo del widget llegan resueltas del contrato
  (`state.charset(name)`, `state.borders(name)`); no resuelvas la config tú
  mismo.
