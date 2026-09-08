# Guía de autoría: diseños personalizados

Guía paso a paso para escribir un diseño personalizado para xtop,
validarlo y ponerlo a disposición — localmente o como diseño de la
comunidad. La descripción autoritativa del formato es `docs/layout-schema.md`;
esta guía se centra en el flujo de trabajo y en los ids, modos y el flujo de
instalación/validación tal como se implementan en el kernel
(`xtop/src/commands/layout.rs`, `xtop/src/ui/layout/engine.rs`,
`xtop/src/ui/screen.rs`).

## 1. Dónde viven los diseños

El crate embebe diez diseños por defecto (`layouts/default/*.jsonc`): primero
los siete valores por defecto ligados a modos (ranuras de paleta 0–6), luego
tres extras de preajuste (`detail_dashboard`, `detail_network`,
`detail_processes` — ranuras 7–9, DR-UX6). Desde UX8.5 los extras son
páginas densas de cobertura completa: `Detail Dashboard` es la página de
monitor completo (`cpu` alto con columna lateral de `summary`/`sensors` +
`processes` de ancho completo), `Detail Network` enfoca la caja de `network`
por interfaz con una columna lateral de `summary`/`disk_io`/`memory` y una
tira inferior de `processes`, y `Detail Processes` es una tira compacta de
estadísticas (`summary` + `cpu`/`memory`/`storage`/`network`) sobre una
tabla de `processes` de altura completa. Los diseños personalizados se cargan
desde el **directorio de diseños del usuario** al iniciarse
(`xtop/src/commands/share/bootstrap.rs` fusiona los valores por defecto con
todo lo que `load_layouts_from_dir` encuentra allí):

| Plataforma | Directorio de configuración del usuario | Directorio de diseños del usuario |
|---|---|---|
| Linux | `$XDG_CONFIG_HOME/xtop`, si no, `~/.config/xtop` | `<config>/layouts` |
| macOS | `~/Library/Application Support/xtop` | `<config>/layouts` |
| Windows | `%APPDATA%\xtop` | `<config>\layouts` |

El crate `xtop-layout` en sí nunca toca los directorios de diseño del
sistema de archivos de los usuarios; el kernel es dueño de las rutas de
arriba (`xtop/src/config/platform/`).

## 2. Escribir un diseño

Crea un archivo `.jsonc` que contenga exactamente un diseño:

```jsonc
{
  // My Layout: header, CPU chart and process list stacked
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

Reglas prácticas (gramática completa: `docs/layout-schema.md`):

- `"name"` debe ser único. La fusión es por nombre exacto y sensible a
  mayúsculas: un archivo cuyo nombre iguala a un valor por defecto
  *sustituye a ese valor por defecto en su lugar* (misma ranura de paleta);
  cualquier otro archivo se añade después de los valores por defecto. Los
  valores por defecto embebidos están ordenados de modo que los primeros
  siete nombres son los diseños ligados a modos y los tres extras de
  preajuste (`Detail Dashboard`, `Detail Network`, `Detail Processes`)
  vienen justo después — nunca renumeres los primeros siete, y los nuevos
  extras embebidos deben añadirse al final (ver `docs/layout-schema.md`,
  "Valores por defecto embebidos").
- Usa un widget `header` de 3 filas arriba, como todos los valores por
  defecto.
- En una división `"vertical"` los hijos se apilan de arriba a abajo; en
  `"horizontal"` se sientan lado a lado. Los porcentajes se refieren a la
  división contenedora.
- Comenta libremente con `//` o `/* */`; **las comas finales no se
  aceptan**.
- Cada instancia de widget puede tomar un objeto `options` opcional que
  ajusta cómo se dibuja *esa instancia* — p. ej.
  `{ "widget": "processes", "options": { "cpu": "total" } }`. Las opciones
  son de paso directo (passthrough): el crate de diseño solo las almacena y
  las reenvía, los renderizadores las interpretan (gramática y ejemplos:
  `docs/layout-schema.md`, sección "`options` de widget"). Sin `options`
  significa el comportamiento por defecto del widget.
- Valida el archivo antes de publicarlo (siguiente sección).

### Guía de densidad: sin bandas huérfanas, sin cajas famélicas

Los preajustes UX8.5 son densos: cada fila de diseño está cubierta por una
caja y cada caja es bastante alta para que su contenido crezca (los
gráficos/listas llenan su caja — la ola de widgets UX8.4). El motor de
renderizado (`xtop/src/ui/layout/engine.rs`) alimenta las restricciones a
ratatui, donde los porcentajes miden la división **completa** y Fill toma el
sobrante, así que escribe divisiones que embaldosan por construcción:

- **Pilas de porcentaje puro**: hijos con tamaño `"p1%"`, `"p2%"`, ... con
  `p1 + p2 + ... = 100` embaldosan la división exactamente en cada tamaño de
  terminal (no se necesita Fill).
- **Cabecera fija + Fill**: pon una cabecera fija `size: 3` (o una tira
  `size: 8`) junto a un hermano `"*"`/Fill, nunca junto a un porcentaje —
  los porcentajes medirían la división completa (incluidas las filas de la
  cabecera) y se pasarían de reclamar. Por eso cada raíz por defecto es
  `header (3)` + cuerpo `"*"`, con los porcentajes de embaldosado viviendo
  *dentro* del cuerpo.
- **Fill junto a porcentajes**: bien cuando los porcentajes suman menos de
  100 — el Fill absorbe el resto (p. ej. una columna `"*"` de cpu junto a
  una columna lateral `"36%"`). Mantén la demanda de porcentajes bajo 100 o
  el Fill muere de hambre.
- Una división sin hermano Fill ni porcentajes que sumen 100 deja una banda
  huérfana; las pruebas del loader
  (`test_detail_presets_split_coverage_full_tiling`) hacen cumplir la regla
  en cada división de cada preajuste de detalle.

Presupuesto de filas en los tamaños comunes (cuerpo = filas de terminal − 3
filas de cabecera):

| Widget | Contenido que absorbe filas con | Caja cómoda (filas) | Mantener bajo |
|---|---|---|---|
| `cpu` | rejilla de núcleos + freq/temp por núcleo + historial de varias filas | 12–22 | — |
| `processes` | lista de procesos | 9–30 | — |
| `summary` | líneas de carga/uptime/recuento de proc + sparklines | 6–9 | ~10 |
| `sensors` | vista de calor de temperatura por núcleo (fallback de una línea sin temps) | 7–12 | ~14 |
| `memory` | filas RAM/SWP + secciones + gráfico de historial | 6–10 | ~12 |
| `network` | filas por interfaz + gráfico dual agregado | 6–26 | — |
| `disk_io` | filas por disco + gráfico r/w | 6–12 | — |
| `storage` | barras por disco | 5–9 | ~10 |

Números aproximados a 100x34 (31 filas de cuerpo): `Detail Dashboard` =
banda de monitor de 18 filas (cpu 64 cols × 18 filas, summary 8 filas,
sensors 10 filas) sobre 13 filas de procesos; `Detail Network` = caja de
network de 22 filas + columna lateral de summary/disk_io/memory de 7/8/7
sobre 9 filas de procesos; `Detail Processes` = tira de 8 filas sobre una
tabla de procesos de 23 filas. Los mismos árboles dan a 80x24 (21 filas de
cuerpo) divisiones 12/9, 15/6 y 8/13 y a 120x40 (37) 21/16, 26/11 y 8/29 —
siempre cobertura completa, porque cada división es exacta en porcentaje o
absorbida por Fill.

## 3. Validación

El kernel expone `xtop layout check` (`xtop/src/commands/layout.rs`), que
ejecuta el analizador exacto de este crate (`parse_layout_err`):

```sh
xtop layout check my_layout.jsonc
# OK  my_layout.jsonc -> layout "My Layout" is valid
# (invalid files fail with an "Error: INVALID <path> -> <reason>" line
#  and a non-zero exit code)
```

Las funciones subyacentes del crate también son públicas: `parse_layout(source) ->
Option<LayoutDef>` y `parse_layout_err(source) -> Result<LayoutDef, String>`
(la última es la que evalúa `check`).

Mientras desarrollas, prefiere un directorio que el kernel ya lee, o llama
al crate desde una prueba de borrador — pero recuerda cómo se manejan los
archivos *inválidos*: `load_layouts_from_dir` se salta cualquier archivo que
falle al analizarse e imprime
`[xtop-layout] skipping invalid layout file: <path>` en stderr, así que un
archivo roto nunca mata a la aplicación — simplemente no aparece en la
paleta. Es fácil pasarlo por alto, por eso existe `xtop layout check`.

## 4. Ponerlo en activo

- **Diseño personal**: pon el archivo directamente en el directorio de
  diseños del usuario (tabla superior). El directorio se lee una vez al
  iniciarse, así que reinicia xtop (o inícialo) para recoger los cambios;
  recorre la paleta con `l`, o selecciona el diseño por nombre desde la
  paleta de comandos. El nombre del diseño activo se persiste en la
  configuración y se restaura en la siguiente ejecución.
- **Valores por defecto sembrados**: al iniciarse el kernel siembra copias
  de las diez plantillas `.jsonc` por defecto en el directorio de diseños
  del usuario (archivo marcador `.xtop_initialized`, versión `4` desde que
  los extras de preajuste se renombraron a `detail_*` y el conjunto sembrado
  se actualizó; los archivos que ya existen nunca se sobrescriben —
  `xtop/src/commands/share/assets.rs`). Editar una copia sembrada es la
  forma soportada de ajustar un valor por defecto integrado; como las
  anulaciones coinciden por `"name"`, el archivo editado sustituye al valor
  por defecto en su ranura habitual de paleta. Las copias sembradas de
  plantillas *renombradas* tampoco se eliminan nunca: tras una actualización
  que renombra una plantilla, los archivos nuevos se siembran junto a las
  copias antiguas, y cualquier copia antigua cuyo `"name"` ya no coincida
  con un valor integrado se comporta como un diseño de usuario (un extra al
  final de la paleta). Elimina tú mismo las copias antiguas cuando no las
  hayas editado.
- **Anulaciones frente a diseños nuevos**: mismo nombre → sustitución en su
  lugar (ranura preservada, sin duplicado). Nombre nuevo → añadido como un
  diseño extra.

## 5. Ids de widget

Los archivos de diseño referencian widgets por ids de cadena simples; no hay
lista blanca en tiempo de compilación, la resolución ocurre en tiempo de
render (`xtop/src/ui/layout/engine.rs`). Lo que referencian los preajustes
hoy:

| Id | Dónde | Notas |
|---|---|---|
| `header`, `cpu`, `memory`, `storage`, `network`, `processes`, `disk_io` | Pack base (registro de `xtop-widgets`) | Usados por cada valor por defecto (diseños de modo y preajustes de detalle); siempre disponibles |
| `summary`, `sensors` | Registro del pack base (adiciones UX8.4) | Referenciados por los preajustes de detalle desde UX8.5: `summary` es el panel de carga/uptime/recuento de procesos con sparklines, `sensors` la vista de calor de temperatura por núcleo (fallback honesto de una línea cuando no hay datos de temp). Se resuelven en tiempo de render como cualquier otro nombre — un archivo de diseño es válido antes de que llegue el pack, solo que no renderiza nada para un nombre que ningún renderizador proporciona |
| `battery`, `gpu` | Registro del pack base | Renderizadores registrados; seleccionables en modo de pantalla completa, no usados por ningún valor por defecto. Sus proveedores de datos dependen de la plataforma, así que espera valores vacíos donde no exista fuente |
| `samurai` (widgets de plugin) | Plugins con la capacidad `RenderWidgets` (kernel `plugins/manager.rs`) | Referenciable cuando el kernel se compila con el plugin habilitado (p. ej. `plugin-samurai`). Los renderizadores de plugin tienen precedencia sobre los renderizadores de pack para el mismo nombre |

Orden de referencia en tiempo de render: primero los widgets de plugin,
luego el pack elegido por la configuración de estilo, cayendo al pack base.
Un id con errores tipográficos o no disponible **no renderiza nada** en esa
zona (la zona queda en blanco); el kernel imprime una advertencia única en
stderr por nombre desconocido (`xtop: layout '<name>' references unknown
widget '<name>'` — `xtop/src/ui/layout/engine.rs`), y la vista de pantalla
completa muestra `No widget registered for '<name>'` en su lugar. Por eso,
`xtop layout check` es solo validación estructural: no puede saber si un id
se resolverá.

## 6. Modos y umbrales

El crate calcula cómo degrada el modo solicitado con el tamaño de terminal
(`src/mode.rs`, `detect_effective_layout`). Umbrales exactos:

| Modo solicitado | Tamaño de terminal | Diseño efectivo |
|---|---|---|
| cualquiera | ancho < 60 **o** alto < 14 | `Minimal` (renderizador mínimo, sin archivo de diseño) |
| `Dashboard` | ancho < 80 | `Vertical` |
| `Dashboard` | 80 ≤ ancho < 100 **o** alto < 28 | `Compact` (visuales de Dashboard, menos padding) |
| `Dashboard` | ancho ≥ 100 y alto ≥ 28 | `Dashboard` |
| `Vertical` / `Horizontal` / modos de enfoque | ≥ 60×14 | el propio modo solicitado |

(Piso de UI del kernel: por debajo de 40×8 la pantalla muestra un aviso de
"Terminal too small" antes de que corra cualquier lógica de diseño —
`xtop/src/ui/screen.rs`.)

Acoplamiento modo ↔ paleta (por qué importa el orden):

- Los siete modos integrados se mapean por *etiqueta* a las siete primeras
  ranuras de paleta. El orden de ranuras lo fija `DEFAULT_LAYOUT_SOURCES` en
  `src/loader.rs`: `dashboard, vertical, horizontal, cpu_focus,
  memory_focus, network_focus, process_focus` → nombres
  `Dashboard, Vertical, Horizontal, CPU Focus, Memory Focus, Network Focus,
  Process Focus`. Una prueba unitaria fija este orden.
- `mode_from_layout_index` mapea las ranuras 0–6 de vuelta a su modo y por
  defecto a `Dashboard` para cualquier cosa ≥ 7, así que el ciclo de `l` del
  kernel depende de que los valores por defecto conserven esas ranuras: una
  anulación con el mismo nombre conserva su ranura, los diseños extra — los
  preajustes `detail_*` embebidos en las ranuras 7–9 y cualquier archivo de
  usuario — se añaden *después* de ellos y se abordan solo por nombre. El
  kernel recorre la lista completa en orden y da la vuelta, así que `l`
  alcanza los preajustes justo después de `Process Focus` y una pulsación
  más vuelve a `Dashboard`.
- El kernel restaura un diseño por `config.layout_name` primero y cae a
  `layout_index_from_mode(config.layout_mode, ...)` cuando el nombre
  guardado desapareció (p. ej. se eliminó un archivo de anulación).

## 7. Compartir un diseño (flujo de la comunidad)

El kernel instala diseños de la comunidad **desde la carpeta
`layouts/custom/` de este repositorio**, obtenida mediante git:

```sh
xtop layout install <name>
```

Lo que hace el kernel (`xtop/src/commands/layout.rs`, `cmd_install`):

1. Ejecuta `git clone --depth 1 --filter=blob:none --sparse
   https://github.com/xtop-cli/layouts` en un directorio temporal (git debe
   estar en `PATH`), luego `git sparse-checkout set layouts/custom`.
2. Escanea `layouts/custom/` en busca de archivos `*.json`/`*.jsonc` y elige
   el primero cuyo nombre de archivo *o* `"name"` analizado sea igual a
   `<name>` (sin distinción de mayúsculas).
3. Copia ese archivo al directorio de diseños del usuario **bajo su nombre
   de archivo original**; se niega a sobrescribir un destino existente
   (edita en su lugar) y da error cuando nada coincide o git falla.

Así que para compartir un diseño: pon `my_layout.jsonc` en `layouts/custom/`
de este repositorio (`"name"` único, validado con `xtop layout check`), abre
un PR, y después de que aterrice cualquiera puede
`xtop layout install <name>`.

Igualmente puedes saltarte el repositorio: copia el archivo tú mismo al
directorio de diseños del usuario — la aplicación lo carga en el siguiente
arranque de cualquier manera. El kernel no lee los archivos de la comunidad
de este repositorio en tiempo de ejecución; solo se vuelven vivos después de
la instalación (o de una copia manual).
