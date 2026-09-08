# Lenguaje de diseño de Xtop

Nota de alcance para quien lea: este documento expone las reglas de diseño
visual con las que renderiza xtop (el kernel 0.1.0 y los packs de widgets en
su estado de trabajo de UX, 2026-09-04): roles de tema, conjuntos de glifos,
opciones de visualización por widget, respaldos de ancho mínimo y reglas de
color de los gráficos. Las afirmaciones del lado de los widgets se contrastan
con el árbol de trabajo del repo de widgets a la misma fecha; el informe final
del agente de widgets (`tmp/ux2-4-widgets-report.md`, si está presente) es la
autoridad para los detalles por widget y prevalece sobre las afirmaciones
resumidas de aquí.

El lenguaje se inspira en los monitores de recursos de la clase de btop; las
notas de referencia recogidas durante la investigación UX0 viven bajo `tmp/`
en la raíz del workspace.

## Reglas

| Regla | Dónde está implementada |
|---|---|
| El chrome viene solo de los roles del tema (DR-UX3): una única tabla de roles en `docs/customization.md` / `docs/colors.md`; el chrome del kernel (popups de ayuda/paleta/búsqueda) usa títulos/bordes de accent y separadores de dim, y respeta el conjunto de bordes configurado (`style.borders`, incluido el ASCII puro `+-|`); los marcos de los widgets dibujan los roles accent/dim (`widgets/src`, `ROLE_*`) | Kernel `src/ui/overlay/*`, `src/ui/screen.rs`; packs de widgets |
| El estado de ordenación siempre es visible: la columna de procesos que ordena lleva un marcador de color, una pulsación invierte la dirección (`▼` ↔ `▲`), la siguiente pulsación avanza CPU% → Mem → PID → Name (arranque por defecto = CPU% descendente, orden clásico conservado) | Kernel `AppState::cycle_sort` + `process_sort_desc()` en `WidgetState`; el widget de procesos pinta el marcador desde ese estado |
| La discriminación visual por widget se guía por datos desde el fichero de layout (`options` en los nodos de widget, DR-UX1), no solo desde la configuración global: dos instancias del mismo widget en una misma pantalla pueden renderizarse distinto | Repo layouts (`docs/layout-schema.md`, "Widget `options`"); kernel `WidgetState::widget_options`; claves reconocidas por widget en los docs del repo de widgets |
| La selección de fila sobrevive a los reordenamientos: la fila de proceso seleccionada está anclada por PID y resaltada (fondo accent / fila invertida); las filas cebra y los separadores de columna usan el rol dim | Widget de procesos (`widgets/`) + estado de selección del kernel |
| Los marcadores de los gráficos y los bordes respetan el conjunto de glifos elegido por widget (charset: braille/dot/block/half_block/bar; borders: native/rounded/double/plain/ascii), con valores globales por defecto y anulaciones por widget en `config.json` bajo `style`; las `options` por nodo de layout pueden refinarlos por instancia | `ChartCharset`/`border_for` en el contrato de widget-api; packs de widgets; el kernel pasa `style.widgets.<name>` |
| Las series de datos reciben colores emparejados por rol: las filas por núcleo usan un relleno degradado, los roles alert/warn/good dirigen el color de estado, y las líneas de varias series (RX/TX, lectura/escritura) usan el par de ranuras documentado (RX = ranura 4, TX = ranura 5) | Packs de widgets; leyenda de roles en `docs/colors.md` |
| Las terminales pequeñas degradan limpiamente en lugar de envolverse: los modos de layout caen según el tamaño (por debajo de 60×14 → medidores mínimos + lista de procesos; Dashboard se compacta por debajo de 100×28 y se vuelve vertical por debajo de 80 columnas), con un suelo duro de 40×8 | `xtop-layout` `mode.rs` (`detect_effective_layout`), kernel `ui/screen.rs` |
| Las opciones de visualización nunca inventan datos: cada opción refina cómo se dibujan las métricas existentes (bases, columnas, núcleos, interfaces, discos, unidades); las métricas subyacentes son siempre reales | Packs de widgets + data providers |
| Los presets de layout son extras con nombre, no modos: siete layouts ligados a modos conservan las ranuras de modo fijas; los presets `Detail Dashboard`, `Detail Network` y `Detail Processes` (`detail_*.jsonc` en el repo layouts) los siguen en el orden de ciclo, y luego van los layouts de usuario/comunidad (DR-UX6) | Repo layouts `src/loader.rs`; ciclo de layouts del kernel + `xtop layout install` |

## Claves de opción reconocidas por widget

El paso opaco `options` del layout lo interpretan los renderers de widgets;
cada widget documenta las claves que reconoce en el repo de widgets
(`docs/widgets.md`). Los presets `detail_*` incluidos ejercitan la primera
oleada en los widgets `processes`, `cpu` y `network` (consulta el doc de
esquema del repo layouts para los objetos exactos que llevan).

## Diferido (deliberadamente no modelado)

Estas características de los monitores de referencia no tienen aún equivalente
en xtop; cada línea indica la razón de datos o de arquitectura, de modo que
nada de esto está simulado con stubs:

- Panel de detalle por proceso (gráficos, estado, E/S, padre, cmd, …): el
  histórico de *CPU* por proceso existe desde UX9.1
  (`WidgetState::process_cpu_history`, un ring acotado por pid alimentado
  desde la lista de procesos visible), así que una pequeña chispa de CPU por
  fila es dibujable; aún no existen buffers de histórico de estado/E/S/padre.
  Los metadatos del proceso (estado, padre, cmd, nº de hilos, ficheros
  abiertos, bytes de disco) ya están en el modelo y disponibles para vistas
  futuras.
- Vista de árbol de procesos con prefijos expandir/contraer: sin semántica de
  árbol en el contrato de la vista de procesos; el anclaje por PID asume una
  lista plana y ordenable. Necesita una decisión de modelo antes del trabajo
  de UI.
- Modo de seguimiento + banners de pausa/seguimiento: no existe el concepto
  de follow en la máquina de estados del kernel (`InputMode` es
  Normal/Searching/CommandPalette). Los banners requerirían añadidos al
  estado de la vista.
- Temperaturas por núcleo: desde UX8.3 el provider recoge temperaturas por
  núcleo en Linux (`CpuInfo::temp_c`, sensores coretemp) cuando los sensores
  se corresponden con los núcleos lógicos; las máquinas sin correspondencia
  legible conservan solo el máximo agregado (`cpu_temp`), así que allí no se
  dibuja ninguna fila de temperatura por núcleo.
- Rampas de degradado de 101 pasos por familia de métricas: la paleta de 16
  ranuras no puede alojar rampas de 101 pasos por familia. xtop usa un
  degradado documentado de 3 paradas (roles alert/warn/good) y la rampa
  brillante para las líneas de varias series.
- Leyendas superpuestas en los gráficos (uptime en el gráfico de CPU, texto de
  escala de red): el uptime/la carga viven en el widget header; las escalas
  del gráfico se dibujan en el eje del gráfico. Las leyendas superpuestas
  necesitarían un rol de estilo de texto-sobre-gráfico que la paleta no
  define.
- Fondo transparente y downconvert a 16 colores: el rol de fondo de la paleta
  siempre se pinta; no existe una ruta SGR de 16 colores. Ambos son
  características del modo de color del kernel, diferidas.
- Chips manejados con ratón / botones de atajo inline: la entrada es
  primero-teclado (superposición de ayuda con `?`); el soporte de ratón se
  limita al scroll con rueda de la lista de procesos.
- Conmutadores de mostrar/ocultar por caja en ejecución: el cambio de layout
  cubre la selección de cajas (`l`, paleta, config), pero los conmutadores de
  mostrar/ocultar por caja en ejecución no están modelados en el motor de
  layouts.
- Techos fijos de los gráficos de red: los gráficos se autoescalan al máximo
  muestreado; los techos fijos configurables no están implementados.
- Diálogo de confirmación de kill: `k` mata directamente la selección anclada
  por PID; no existe diálogo/banner (el feedback visual es que la fila
  desaparece).

## Dónde va más lejos xtop

- Los packs de widgets son intercambiables por nombre de widget y por instancia
  de layout (`style.widgets.<name>.pack`), así que un único binario puede
  incluir varios lenguajes visuales para la misma métrica.
- La discriminación visual se guía por datos desde el fichero de layout
  (`options` en los nodos de widget), no solo desde la configuración global:
  dos instancias del mismo widget en una misma pantalla pueden renderizarse
  distinto.
- El kernel se guía por providers; los datos vienen del provider de sysinfo y
  de los plugins, así que las vistas de detalle solo se construyeron donde los
  datos existen de verdad.

## Documentos relacionados

- `docs/colors.md` — paletas de temas + leyenda de roles; `docs/customization.md`
  — la única tabla de roles, `options` por widget, presets de layout.
- Repo de widgets — `docs/widgets.md`: claves de opción reconocidas por widget.
- Repo de layouts — `docs/layout-schema.md`: los presets `detail_*` y la
  gramática del paso opaco `options`.
