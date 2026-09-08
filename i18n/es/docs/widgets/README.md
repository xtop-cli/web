# xtop-widgets

**Paquete de widgets** base para la TUI [xtop](https://github.com/xtop-cli/xtop).

Los widgets son renderizadores puros: dibujan dentro de un `Rect` recibiendo
únicamente el contrato de solo lectura [`xtop-widget-api`](https://github.com/xtop-cli/api)
`WidgetState` — nunca tipos del kernel. El kernel resuelve `(pack, name)` en
tiempo de render, de modo que cualquier pack puede sustituir a un widget
integrado por nombre.

## Estructura (UX9.3: un crate por widget)

```
xtop-cli/widgets/
  xtop-widget-core/              shared engine for every widget crate
                                 (chart.rs, options.rs, util.rs: formatting,
                                 palette roles, frames, the Painter; the
                                 `testkit` cargo feature carries the
                                 WidgetState test double)
  xtop-widget-header/            the widget crates — the installable unit a
  xtop-widget-cpu/               user designs: each depends on the contract
  xtop-widget-memory/            crates + xtop-widget-core and exposes
  xtop-widget-storage/             `pub fn render(f, state, area)`
  xtop-widget-network/
  xtop-widget-processes/
  xtop-widget-disk_io/
  xtop-widget-battery/
  xtop-widget-gpu/
  xtop-widget-summary/
  xtop-widget-sensors/
  xtop-widget-blocks/            alternate pack (ascii blocks look for
                                 cpu/memory/processes/network/storage/disk_io
                                 + summary/sensors), consuming the same
                                 xtop-widget-core engine
  src/                           xtop-widgets — the aggregator pack: depends
                                 on the 11 widget crates and builds the
                                 registry the kernel uses (same 11 names)
  custom/                        community packs (see custom/README.md)
  docs/                          authoring guide + widget reference
```

## Nombres de widget (diseños por defecto)

`header`, `cpu`, `memory`, `storage`, `network`, `processes`, `disk_io`,
`summary`, `sensors`, `battery`, `gpu`. Los diseños referencian los widgets
por estos nombres; el agregador registra los crates de widget bajo los
mismos nombres. `battery` y `gpu` no forman parte de los diseños por
defecto — el kernel llega a ellos mediante el modo de pantalla completa.
`summary` (cargas/medidores/recuentos de procesos agregados) y `sensors`
(temperaturas por núcleo; estado vacío honesto sin datos de sensores) son
las adiciones de UX8.4 para los diseños densos.

## Selección de un pack en el kernel

```json
{
  "style": {
    "pack": "blocks",
    "widgets": { "cpu": { "pack": "default" } }
  }
}
```

- El `style.pack` global se aplica a todo nombre sin una anulación por
  widget.
- El `style.widgets.<name>.pack` por widget gana sobre la elección global.
- Los nombres ausentes en un pack elegido vuelven al pack base.
- Los widgets de plugins conservan precedencia sobre cualquier pack.

Los packs se integran en el binario como features de Cargo (como los
plugins). La feature `widget-blocks` habilita el pack de bloques ASCII
(`xtop-widget-blocks`, un hermano de los crates por widget para que los
consumidores de git resuelvan su dependencia de `xtop-widget-core`).

## Diseñar un widget

1. Copia un crate de widget (`xtop-widget-<name>/`) o usa el
   `widget scaffold` del kernel — el crate es la unidad
   diseñable/instalable.
2. Implementa `pub fn render(f, state, area)` en `src/lib.rs` contra
   `xtop-widget-core` (marco, roles, gráficos) y el contrato.
3. Registra el crate bajo un nombre de widget (el agregador para los
   integrados; la tabla de packs para los crates de la comunidad) — el
   comando `widget install` del kernel gestiona el cableado.
4. Escribe pruebas junto al widget con el doble `testkit`.

El mapeo de glifos (colores, bordes, marcadores de gráfico) proviene de los
helpers canónicos en `xtop_widget_api::glyph` — ver
[`docs/authoring.md`](docs/authoring.md) para el recorrido completo del
contrato.

## Documentación

- [`docs/authoring.md`](docs/authoring.md) — cómo se construye y registra un
  crate de widget: `render`, `registry()`, `WidgetRenderer`/`WidgetRegistration`,
  la vista `WidgetState`, el motor compartido, los helpers canónicos de
  glifos, la semántica de selección de pack y el flujo de instalación del
  kernel.
- [`docs/widgets.md`](docs/widgets.md) — referencia de cada nombre de
  widget registrado (pack base + extras solo de pantalla completa), el
  esquema completo de opciones de diseño por widget (claves, valores por
  defecto, ejemplos, reglas de fallback) y en qué difiere el pack de
  bloques.
