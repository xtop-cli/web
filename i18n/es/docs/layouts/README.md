# xtop-layouts

Definiciones de **diseño** (layout) dirigidas por datos para el monitor de
sistema TUI [xtop](https://github.com/xtop-cli/xtop).

Este crate (`xtop-layout`) es dueño de todo lo relacionado con los diseños
para que el kernel se mantenga fino:

- `model` — árbol de diseño (`LayoutDef` → divisiones de zonas → hojas de
  widget), serializable desde JSON/JSONC, sin dependencias de UI.
- `default/` — 10 **diseños por defecto** embebidos que se envían con el
  crate: los siete diseños ligados a modos (`Dashboard`, `Vertical`,
  `Horizontal`, `CPU Focus`, `Memory Focus`, `Network Focus`, `Process
  Focus`) más tres extras de preajuste — `Detail Dashboard`, `Detail
  Network`, `Detail Processes` (`detail_*.jsonc`) — que se sitúan tras los
  modos en el orden de archivos y muestran `options` por widget (DR-UX6).

  Tabla de preajustes (UX8.5: páginas densas de monitor completo sin filas
  huérfanas en tamaños comunes — cada división es exacta en porcentaje o
  absorbida por Fill, ver `docs/authoring.md` "Guía de densidad"):

  | Archivo | `"name"` | Composición a 100x34 (31 filas de cuerpo) | Widgets |
  |---|---|---|---|
  | `detail_dashboard.jsonc` | `Detail Dashboard` | header → banda de monitor de 18 filas (cpu a la izquierda, columna lateral del 36% de summary/sensors) → procesos de ancho completo de 13 filas | header, cpu, summary, sensors, processes |
  | `detail_network.jsonc` | `Detail Network` | header → banda de 22 filas (caja de network por interfaz + columna de summary/disk_io/memory) → procesos de 9 filas | header, network, disk_io, summary, memory, processes |
  | `detail_processes.jsonc` | `Detail Processes` | header → tira de estadísticas de 8 filas (summary/cpu/memory/storage/network) → procesos de altura completa de 23 filas | header, summary, cpu, memory, storage, network, processes |

  `summary` (panel de carga/uptime/recuento de procesos) y `sensors` (vista
  de calor de temperatura por núcleo) son las llegadas de la ola de widgets
  UX8.4 colocadas por los preajustes UX8.5; los nombres se resuelven en
  tiempo de render como cualquier otro id de widget. Al iniciarse, el kernel
  los escribe como plantillas editables en el directorio de diseños de la
  configuración del usuario cuando inicializa sus recursos (nunca
  sobrescribiendo archivos que el usuario ya haya editado).
- `custom/` — **diseños de la comunidad**: extras instalables, compartidos
  mediante PRs. Nunca viajan en el binario; el `xtop layout install <name>`
  del kernel obtiene esta carpeta y copia el diseño al directorio de diseños
  de la configuración del usuario (o copia el archivo tú mismo, p. ej.
  `~/.config/xtop/layouts/` en Linux).
- `loader` — carga/análisis de archivos JSONC y fusión con anulaciones del
  usuario.
- `mode` — modos de diseño integrados y reglas de degradación por tamaño de
  terminal.

## Estructura del diseño

```
xtop-cli/layouts/
  src/                  xtop-layout crate (model, loader, mode)
  layouts/
    default/            built-in defaults (embedded in the binary)
    custom/             community layouts (installable, via PR)
```

## Uso

```toml
[dependencies]
xtop-layout = { git = "https://github.com/xtop-cli/layouts" }
```

```rust
use xtop_layout::{default_layouts, merge_layouts, load_layouts_from_dir};

let defaults = default_layouts();
let custom = load_layouts_from_dir(&user_layouts_dir); // ~/.config/xtop/layouts
let all = merge_layouts(defaults, custom); // user wins by name
```

Los archivos de diseño son JSON/JSONC:

```jsonc
{
  "name": "My Layout",
  "root": {
    "direction": "vertical",
    "areas": [
      { "widget": "header", "size": 3 },
      { "widget": "cpu", "size": "45%" },
      { "widget": "processes", "size": "*" }
    ]
  }
}
```

`size` acepta un número fijo de filas/columnas, un porcentaje (`"45%"`) o
`"*"`/omisión para el espacio restante. Los widgets se referencian por
nombre; el kernel decide a qué renderizador se mapea cada nombre.

## Documentación

- `docs/layout-schema.md` — esquema formal de diseño JSONC (estructura del
  documento, gramática de zonas, sintaxis de restricciones, dialecto de
  comentarios, valores por defecto embebidos).
- `docs/authoring.md` — guía paso a paso: escribir, validar e instalar
  diseños, ids de widget, modos y umbrales de tamaño de terminal.
- `docs/decisions.md` — registro de decisiones de diseño (DR-3, ids de
  widget no validados, fusión por nombre).

## Modelo de personalización

1. **Valores por defecto** se compilan en el binario y se copian como
   plantillas a `~/.config/xtop/layouts/` en el primer arranque (primero los
   siete diseños ligados a modos, luego los extras de preajuste `detail_*` —
   el orden es parte del contrato de ranuras de modo, ver `docs/authoring.md`
   §6).
2. **Anulaciones**: edita un archivo cuyo `"name"` coincide con un valor por
   defecto → sustituye a ese valor por defecto en su lugar (misma posición
   de paleta, sin duplicados).
3. **Diseños nuevos**: cualquier archivo extra aparece como un diseño
   adicional.
4. **Comunidad**: comparte diseños mediante PR a `layouts/custom/`; los
   usuarios los copian o los instalan en su directorio de configuración.
