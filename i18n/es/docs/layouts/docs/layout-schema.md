# Esquema del archivo de diseño (JSONC)

Descripción formal, basada en código, del formato de diseño que consume
`xtop-layout` (crate `xtop-layout` v0.1.0). El esquema *no* se hace cumplir
por un `.schema.json` separado: lo implementan el modelo serde y el visitor
manual en `src/model.rs`, más el eliminador de comentarios JSONC en
`src/loader.rs`. Este documento refleja ese código exactamente, así que es
autoritativo para los colaboradores y para el comando `xtop layout check`
del kernel (que ejecuta la misma función `parse_layout_err` de
`src/loader.rs`).

## Convenciones de archivo

- Un diseño por archivo. El nombre de visualización del diseño es el campo
  `"name"` dentro del archivo, no el nombre del archivo.
- Los archivos pueden usar `.jsonc` o `.json`; JSONC (comentarios
  permitidos) es la convención en todas partes de este repositorio.
- Los valores por defecto integrados viven en `layouts/default/` y se
  embeben en el binario a través de `DEFAULT_LAYOUT_SOURCES` en
  `src/loader.rs` (10 archivos: siete valores por defecto ligados a modos +
  tres extras de preajuste `detail_*`).
- Los diseños de usuario viven en el directorio de configuración de la
  plataforma bajo `layouts/` — ver `docs/authoring.md` para las rutas
  concretas por plataforma.
- Un directorio se carga con `load_layouts_from_dir`: cada entrada
  `*.json`/`*.jsonc` se analiza; los archivos que fallan al analizarse se
  saltan y se informan en stderr (ver `docs/authoring.md`).
- Los nombres de diseño deben ser únicos entre valores por defecto y
  archivos de usuario: `merge_layouts` hace coincidir los nombres con
  igualdad de cadena exacta y sensible a mayúsculas.

## Estructura del documento

Un documento de diseño es un único objeto JSON con exactamente dos claves:

```jsonc
{
  "name": "My Layout",
  "root": {
    "direction": "vertical",
    "areas": [
      { "widget": "header", "size": 3 },
      { "widget": "cpu", "size": "60%" },
      { "widget": "processes", "size": "*" }
    ]
  }
}
```

| Clave | Tipo | Requerida | Significado |
|---|---|---|---|
| `name` | string | sí | Nombre de visualización mostrado en la paleta de la TUI; usado para la coincidencia de modos y anulaciones. Ausente → error `missing field \`name\``. |
| `root` | objeto de zona | sí | El árbol de diseño. Ausente → error `missing field \`root\``. |

Cualquier otra clave de nivel superior se rechaza (el deserializador
personalizado solo acepta `name`/`root`; error `unknown field ...`). Dentro
de `root` y dentro de cada objeto de zona el analizador es permisivo: las
claves extra se ignoran silenciosamente, solo se leen las claves de la tabla
inferior.

La raíz usa la misma gramática de objeto que cada zona (abajo). Su clave
`size` se analiza y valida como la de cualquier otra zona, **pero el valor
se descarta**: un `LayoutDef` conserva solo el nodo raíz, así que la raíz
siempre abarca toda la zona de render del terminal que el kernel le da.

## Objetos de zona

Cada zona de una división (y la raíz) es un objeto JSON:

```jsonc
{
  "size": <size>,          // optional, see "size" below
  "widget": "name",        // leaf: a widget instance
  "options": { ... },      // optional, only with "widget" (see below)
  // -- or --
  "direction": "vertical", // container: nested split
  "areas": [ <area>, ... ] // children of the split (only with "direction")
}
```

| Clave | Tipo | Significado |
|---|---|---|
| `size` | número, string u omitido | Restricción que esta zona obtiene de su división padre (ver abajo). Omitido ≡ `"*"` (fill). |
| `widget` | string | Id de widget; ver `docs/authoring.md` para los ids que existen. |
| `options` | objeto JSON | Opciones de visualización opcionales por widget (DR-UX1); solo significativas junto con `widget`. Passthrough: este crate almacena y serializa el objeto tal cual y nunca lo interpreta — el kernel se lo entrega al renderizador del widget, que es dueño de la semántica (ver "`options` de widget" abajo). |
| `direction` | string | Dirección de la división: `"vertical"` o `"horizontal"`, sin distinción de mayúsculas (se compara `direction.to_lowercase()`, así que se aceptan `"Vertical"`, `"VERTICAL"`, etc.; cualquier otra cosa → error `invalid direction: <value>`). |
| `areas` | array de objetos de zona | Hijos de una división. Opcional; ausente/vacío → una división vacía que se analiza pero no renderiza nada. |

Debe estar presente exactamente una de `widget` y `direction`; si no, el
archivo se rechaza con `layout area must have 'widget' or 'direction'`. Si
*ambas* están presentes la zona se analiza, `widget` gana y las claves de
división (`direction`, `areas`) se ignoran. Las claves extra de un objeto de
zona se ignoran (el deserializador de struct no habilita
`deny_unknown_fields`).

### `options` de widget — opciones de visualización por widget

Cada *instancia* de widget puede llevar un objeto JSON `options` que
refina cómo se dibuja esa instancia:

```jsonc
{
  "widget": "processes",
  "options": { "cpu": "total", "show_memory": false }
}
```

Semántica, exactamente como se implementa en `src/model.rs`
(`LayoutAreaRaw`):

- `options` es opcional; una clave ausente y un `null` explícito ambos
  deserializan a `None` (el widget se renderiza con su comportamiento por
  defecto).
- El valor debe ser un objeto JSON; es un **passthrough**: el modelo lo
  almacena como `serde_json::Value` y nunca interpreta su contenido. Las
  claves desconocidas dentro del objeto se preservan tal cual a través del
  análisis y la re-serialización (el orden de claves dentro de `options`
  puede normalizarse al orden del mapa de serde_json; el contenido no
  cambia).
- Los renderizadores son dueños de la semántica: cada widget documenta las
  claves que reconoce (ver los docs del repositorio de widgets). Las
  opciones en nodos de división, o en una zona donde `direction` gana, se
  analizan pero se ignoran.
- La igualdad de `LayoutDef`/`LayoutNode` y el serializador espejo incluyen
  `options`; un widget sin opciones se serializa **byte-idénticamente** al
  formato pre-DR-UX1 (la clave `options` solo se emite cuando está
  presente), así que los archivos de diseño existentes y sus viajes de ida
  y vuelta no cambian.
- La zona raíz sigue la misma gramática; las `options` de una hoja de widget
  raíz se conservan en el nodo como las de cualquier otra zona (el `size`
  de la raíz sigue descartándose).

### `size` — sintaxis de restricciones

El valor crudo se deserializa como número JSON o cadena JSON (`SizeRaw` en
`src/model.rs`), y luego se convierte a una restricción:

| Grafía JSONC | Restricción | Efecto en el kernel |
|---|---|---|
| *(omitido)* | Fill | Tomar el espacio restante |
| número desnudo `3` | `Length(3)` | `3` filas fijas (división vertical) o columnas (división horizontal) |
| `"45%"` | `Percentage(45)` | `45%` del contenedor padre |
| `"*"` | Fill | Tomar el espacio restante |

Detalles de análisis, exactamente como se implementa en
`TryFrom<LayoutAreaRaw>`:

- **Número desnudo**: deserializado como `u16` — debe ser un entero entre `0`
  y `65535`. Las fracciones (`3.5`), los negativos y los valores fuera de
  rango fallan la deserialización JSON del enum sin etiquetar (`data did not
  match any variant of untagged enum SizeRaw`).
- **`"*"`**: la cadena exacta, comprobada *antes* de la rama de porcentaje.
  Cualquier otra cadena que termine en `%` va a la rama de porcentaje.
- **`"NN%"`**: todos los caracteres `%` finales se recortan
  (`trim_end_matches('%')`, así que `"45%%"` se analiza como `45`), luego el
   resto se analiza como `u16`; el fallo produce
   `invalid percentage: <value>`. El número analizado **no** se comprueba
   contra `100` por rango —
  cualquier cosa `0..=65535` se acepta sintácticamente; el kernel entrega el
  valor al motor de restricciones de la TUI, así que los porcentajes por
  encima de `100` son posibles pero no significan nada allí. `"%"` solo
  falla (`invalid percentage: %`).
- **Cualquier otra cadena** (ni `"*"`, ni termina en `%`, o vacía) → error
  `invalid size constraint: <value>`.

Las zonas Fill las resuelve el renderizador del kernel con igual peso
(`Constraint::Fill(1)` en `xtop/src/ui/layout/engine.rs`): cuando varios
hermanos usan `"*"` (u omiten `size`), el espacio sobrante se comparte por
igual.

## Semántica de dirección

El formato es agnóstico al framework de UI; el motor de render del kernel
mapea cada división a un layout de TUI de la misma dirección:

- `"direction": "vertical"` — los hijos se apilan **de arriba a abajo**;
  cada zona abarca el ancho completo y recibe una altura según su `size`.
- `"direction": "horizontal"` — los hijos se colocan **de izquierda a
  derecha**; cada zona abarca la altura completa y recibe una anchura según
  su `size`.

Traducción de restricciones (kernel `ui/layout/engine.rs`):
`Length(n)` → `Constraint::Length(n)`, `Percentage(p)` →
`Constraint::Percentage(p)`, Fill → `Constraint::Fill(1)`. Los porcentajes
son relativos a la división contenedora **completa** (las longitudes fijas
NO se restan primero — una cabecera `Length(3)` junto a un hijo `"60%"`
hace que el porcentaje mida el 60% de toda la división, no el 60% del
sobrante). El motor de restricciones siempre embaldosa el padre
completamente: las Lengths se tallan exactamente y **las zonas Fill absorben
cada fila/columna restante** (varios Fills lo comparten por igual). Los
porcentajes se satisfacen exactamente cuando ninguna Length fija de la misma
división se pasa de reclamar la zona (pilas de porcentaje puro que suman
100); en cuanto las Lengths se sientan junto a los porcentajes, las demandas
exceden la zona y el solucionador las relaja de formas no especificadas —
por eso cada preajuste integrado mantiene las Lengths solo junto a Fills, y
expresa las partes de filas con pilas de porcentaje puro ("Reglas de
embaldosado" abajo).

### Reglas de embaldosado: construir divisiones sin bandas huérfanas

Como los porcentajes miden la división completa y los Fills absorben el
resto, una división deja una *banda huérfana* (filas/columnas que ninguna
caja cubre) solo cuando no tiene un hermano Fill ni hijos de porcentaje que
sumen 100. Los preajustes integrados siguen dos reglas, y los usuarios de
`xtop layout check` deberían también:

1. **Pilas de porcentaje puro**: hijos con tamaño `"p1%"`, `"p2%"`, ... con
   `p1 + p2 + ... = 100` embaldosan la división exactamente en cada tamaño
   de terminal — no se necesita Fill, no se mezcla ninguna Length fija.
2. **Pilas de Length + Fill**: una cabecera/tira fija (`size: 3`, `size: 8`)
   se sienta junto a un hermano `"*"`/Fill, que absorbe el sobrante. Los
   porcentajes no deben aparecer junto a Lengths en la misma división
   (medirían la división completa y se pasarían de reclamar).
3. **Fill junto a porcentajes** está bien cuando los porcentajes suman
   menos de 100 — el Fill absorbe el resto (p. ej. `"*"` + `"36%"` → la caja
   Fill recibe el otro 64%). Mantén la demanda de porcentajes bajo 100 o el
   Fill muere de hambre hasta cero.

UX8.5 aplica estas reglas a cada preajuste `detail_*` para que ninguna pila
deje una banda vacía en la parte inferior del terminal en los tamaños
comunes (100x34, 80x24, 120x40); la prueba unitaria
`test_detail_presets_split_coverage_full_tiling` recorre cada división de
cada preajuste de detalle y las hace cumplir, y `docs/authoring.md` ("Guía
de densidad") muestra las filas trabajadas.

## Dialecto JSONC

Los comentarios se eliminan antes del análisis JSON con
`strip_jsonc_comments` en `src/loader.rs` (el archivo se analiza luego con
`serde_json`, que solo acepta JSON estricto):

- Comentarios de línea `//` — hasta el siguiente salto de línea.
- Comentarios de bloque `/* ... */` — no anidables; un comentario de bloque
  sin terminar consume silenciosamente el resto del archivo.
- El eliminador es consciente de cadenas: los marcadores de comentario
  dentro de un literal de cadena no inician un comentario. Tanto `"` como
  `'` se registran como posibles delimitadores de cadena (se respetan los
  escapes), pero solo `"..."` es JSON válido, así que usa comillas dobles
  para cada valor.
- **Las comas finales no se soportan** (el eliminador no las quita;
  `serde_json` las rechaza). Mantén la sintaxis JSON estricta por lo demás.

## Forma canónica (re)serializada

`LayoutDef` implementa un serializador espejo, así que los diseños
re-serializados salen con la misma gramática y estas grafías exactas:
números `size` para longitudes fijas, cadenas `"NN%"` para porcentajes,
`"*"` para fill (el fill siempre se escribe explícitamente), y luego o bien
`widget` (seguido de `options` cuando el nodo lleva una) o `direction` +
`areas`.

## Valores por defecto embebidos

`DEFAULT_LAYOUT_SOURCES` en `src/loader.rs` embebe diez archivos. Los
primeros siete son los **valores por defecto ligados a modos** en orden de
paleta (índice 0–6); después tres **extras de preajuste** (índice 7–9)
llevan las variantes `detail_*` (DR-UX6). Los extras se añaden *después* de
los valores por defecto ligados a modos para que los índices de modo nunca
se muevan; son diseños ordinarios con un `"name"` que no se mapea a ningún
`LayoutMode` (abordados por nombre desde la paleta y alcanzables desde la
tecla de ciclo de diseño del kernel después de los modos). El orden de
ranuras y los nombres están cubiertos por pruebas unitarias
(`test_default_layouts_count_and_order`,
`test_preset_extras_parse_with_widget_options`,
`test_detail_presets_split_coverage_full_tiling`,
`test_detail_presets_reference_registry_widget_names`):

| Ranura | Archivo | `"name"` | Estructura raíz | Ids de widget usados |
|---|---|---|---|---|
| 0 | `dashboard.jsonc` | `Dashboard` | vertical: `header` (3) → división `horizontal` (45%, cpu 50% + división vertical de memory/storage/network) → `processes` (52%) | header, cpu, memory, storage, network, processes |
| 1 | `vertical.jsonc` | `Vertical` | vertical: `header` (3), `cpu` (8), `memory` (8), `storage` (6), `network` (5), `processes` (*) | header, cpu, memory, storage, network, processes |
| 2 | `horizontal.jsonc` | `Horizontal` | vertical: `header` (3) → división `horizontal` (*) de cpu/memory/storage/network (25% cada uno) | header, cpu, memory, storage, network |
| 3 | `cpu_focus.jsonc` | `CPU Focus` | vertical: `header` (3), `cpu` (60%), `processes` (*) | header, cpu, processes |
| 4 | `memory_focus.jsonc` | `Memory Focus` | vertical: `header` (3), `memory` (60%), `processes` (*) | header, memory, processes |
| 5 | `network_focus.jsonc` | `Network Focus` | vertical: `header` (3) → división `horizontal` (50%) de `network` + `disk_io` (50% cada uno) → `processes` (*) | header, network, disk_io, processes |
| 6 | `process_focus.jsonc` | `Process Focus` | vertical: `header` (3) → división `horizontal` (8) de cpu/memory/storage/network (25% cada uno) → `processes` (*) | header, cpu, memory, storage, network, processes |
| 7 | `detail_dashboard.jsonc` | `Detail Dashboard` | vertical: `header` (3) → cuerpo (`*`) dividido en una banda de monitor (58%) de una división `horizontal` (`cpu` `*` con `options` {cores/show_freq} + columna lateral 36% de `summary` 42% / `sensors` 58%) y `processes` de ancho completo (42%, `options` {cpu: total}) | header, cpu, summary, sensors, processes |
| 8 | `detail_network.jsonc` | `Detail Network` | vertical: `header` (3) → cuerpo (`*`) dividido en una banda de network (70%) de una división `horizontal` (`network` 60% `options` {ifaces: all} + columna lateral 40% de `summary` 30% / `disk_io` 40% / `memory` 30%) y `processes` (30%, `options` {cpu: total}) | header, network, disk_io, summary, memory, processes |
| 9 | `detail_processes.jsonc` | `Detail Processes` | vertical: `header` (3) → cuerpo (`*`) dividido en una tira de estadísticas (división `horizontal`, 8 filas: `summary` 20% / `cpu` 28% / `memory` 18% / `storage` 17% / `network` 17%) y `processes` (`*`, `options` {cpu: both}) | header, summary, cpu, memory, storage, network, processes |

Se referencian nueve ids de widget distintos entre los valores por defecto:
`header`, `cpu`, `memory`, `storage`, `network`, `processes`, `disk_io` más
las llegadas UX8.4 `summary` y `sensors` (usadas por los preajustes de
detalle; son nombres simples para este crate — la resolución ocurre en
tiempo de render). Ninguno de los valores por defecto pone un `size` en la
raíz.

Los diseños de modo comparten la misma forma: un `header` de 3 filas, el
widget enfocado (más una columna compañera para `Network Focus`) tomando la
mayor parte del medio, y la lista `processes` llenando el resto (ver
`docs/authoring.md`).

Los tres extras de preajuste muestran `options` por widget (sección
"`options` de widget") y siguen las reglas de embaldosado de arriba (sección
"Reglas de embaldosado"): el widget `processes` ejercita las claves de base
`cpu` (`"total"`/`"both"`), `detail_dashboard` le da a `cpu` las claves
`cores` y `show_freq`, `detail_network` le da a `network` la clave `ifaces`,
y los nuevos widgets densos `summary` y `sensors` (adiciones al registro
UX8.4) llenan las columnas cargadas de contenido de los preajustes
rediseñados (UX8.5). Esas claves son solo refinamientos de visualización —
los archivos son diseños válidos sin ellas, y los renderizadores que aún no
reconocen una clave la ignoran.
