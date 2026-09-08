# Decisiones de diseño

Registro breve de las decisiones que dan forma a este crate y al formato de
los archivos de diseño. Basado en el código de este repositorio y en las
fuentes del kernel referenciadas abajo.

## D-1 — Los diseños viven en un crate independiente y libre de UI (DR-3)

**Decisión (ROADMAP DR-3).** El modelo de diseño, el loader y los modos
viven solo en `xtop-layout`; el kernel no tiene modelo de diseño ni loader
internos. El crate no tiene dependencia de ratatui ni dependencia de ningún
crate de contrato `xtop-*`: es puro dato + serde (docs del módulo en
`src/lib.rs`). El kernel lo consume como una dependencia de git y traduce el
árbol a restricciones concretas de UI en tiempo de render
(`xtop/src/ui/layout/engine.rs` mapea los valores de `LayoutConstraint` a
restricciones de ratatui).

**Por qué.** El kernel se mantiene como un host fino; la autoría de
diseños, los valores por defecto y las reglas de degradación son probables
sin terminal ni el ecosistema de packs de widgets; el formato de diseño es
una superficie de intercambio estable entre repositorios que nunca necesita
el registro de widgets en tiempo de compilación. Consecuencias aceptadas:

- El esquema del formato es implícito en el modelo serde + el visitor manual
  de `src/model.rs` — documentado formalmente en `docs/layout-schema.md` en
  lugar de un `.schema.json` generado (nada consume hoy un archivo de JSON
  Schema).
- Los ids de widget son cadenas opacas (siguiente entrada), y nada en este
  repositorio puede verificarlos contra los repositorios de widgets o
  plugins.
- El contrato de orden de la paleta (valores por defecto ligados a modos en
  las ranuras 0–6, orden fijo, extras de preajuste/usuario añadidos después)
  se hace cumplir por el orden de `DEFAULT_LAYOUT_SOURCES` +
  `mode_from_layout_index` + la semántica de `merge_layouts` y se fija con
  pruebas unitarias (ver `docs/authoring.md` §6).

## D-2 — Los ids de widget son cadenas no validadas; la resolución es en tiempo de ejecución

**Decisión.** Los archivos de diseño nombran los widgets como cadenas
simples (`LayoutNode::Widget { name }` en `src/model.rs`). El crate no lleva
una lista blanca: no tiene dependencia de los repositorios de widgets/
plugins, así que no puede saber qué ids son válidos para una compilación
dada del kernel (qué packs están compilados, qué plugins están habilitados).

**Consecuencia, tal como se implementa en el kernel actual.** Los ids de
widget se resuelven en tiempo de render contra, en orden: los widgets de
plugin (p. ej. `samurai`), luego el pack elegido por el estilo, luego el
pack base (`xtop/src/ui/layout/engine.rs`, `render_named`). Si nada
coincide, el id **no renderiza nada** — la zona de diseño queda en blanco;
el kernel informa de los nombres desconocidos una vez por proceso en stderr
(`warn_unknown_widgets`, `engine.rs`) y la ruta de pantalla completa
muestra `No widget registered for '<name>'` (`xtop/src/ui/screen.rs`). El
propio informe de este repositorio se limita a saltarse los archivos
estructuralmente inválidos en stderr (`load_layouts_from_dir`); un archivo
con forma válida pero un id de widget desconocido se analiza sin problema.

**Por qué se mantiene así.** La validación en tiempo de compilación
acoplaría este repositorio al registro de widgets y a cada combinación de
flags de feature del kernel; la resolución en tiempo de ejecución mantiene
los diseños portables entre compilaciones del kernel. La red de seguridad
estructural que *sí* existe es `xtop layout check` (kernel
`commands/layout.rs`), que valida los archivos con `parse_layout_err` de
este crate.

## D-3 — Fusión por nombre, preservando la ranura

**Decisión.** La fusión es por el campo `"name"` del diseño con igualdad
exacta y sensible a mayúsculas (`merge_layouts` en `src/loader.rs`): un
archivo de usuario que sustituye a un valor por defecto conserva la ranura
de paleta del valor por defecto; los nombres nuevos se añaden después de los
valores por defecto. `mode_from_layout_index` mapea solo las ranuras 0–6 a
modos; todo lo que las supere (los tres extras de preajuste `detail_*`
embebidos en las ranuras 7–9 y los diseños de usuario) se aborda por nombre,
y el kernel persiste/restaura los diseños por nombre
(`config.layout_name`).

**Por qué.** El orden de paleta y el acoplamiento modo ↔ diseño deben
permanecer estables mientras los usuarios personalizan libremente; ver
`docs/authoring.md` §6 para el contrato que esto impone a los
colaboradores (nombres únicos, orden de valores por defecto nunca
renumerado).

## Estado

- Crate: `xtop-layout` v0.1.0, `rust-version = "1.87"`, edición 2021, MIT,
  sin dependencias de terceros más allá de serde/serde_json.
- Decisiones D-1..D-3 registradas el 2026-09-04 como parte del hito M6
  (documentación del esquema implícito).
