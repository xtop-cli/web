# Referencia de widgets

Cada widget del pack base es **su propio crate** (`xtop-widget-<name>`), que
comparte los módulos del motor en `xtop-widget-core` (ver `README.md` para
la estructura). Ambos packs dibujan dentro de un marco estándar: título,
`Borders::ALL`, el conjunto de bordes resuelto desde la configuración de
bordes por widget a través del mapeo canónico
`xtop_widget_api::glyph::border_for`, y los colores fg/bg del tema. Con la
configuración por defecto (`WidgetBorders::Native`) cada widget usa el marco
estándar de una línea con box-drawing de ratatui (`border::PLAIN`) — la
apariencia de bordes por widget es una elección de configuración, no una
elección de pack.

## Opciones de glifos (UX7.4)

Cada nodo de diseño que nombra un widget puede llevar un objeto JSON
`options`. Dos claves son reconocidas por **todos** los widgets de ambos
packs, con una precedencia fija — **opción de nodo de diseño > valor de la
configuración de estilo > valor por defecto del contrato**:

| Clave | Valores | Efecto |
|---|---|---|
| `charset` | `"braille"` \| `"dot"` \| `"block"` \| `"half_block"` \| `"bar"` | Glifos de gráfico del widget (nombres serde del enum del contrato). Cuando el nodo no establece nada, gana la configuración de estilo (`state.charset(widget)`, global o por widget `style.widgets.<name>`); el valor por defecto de la configuración es `braille`. |
| `borders` | `"native"` \| `"rounded"` \| `"double"` \| `"plain"` \| `"ascii"` | El conjunto de bordes del marco del widget. Cuando el nodo no establece nada, gana la configuración de estilo (`state.borders(widget)`); el valor por defecto de la configuración es `native`. |

La resolución se ejecuta una vez por render de widget en el helper
compartido (`xtop-widget-core/src/util.rs`
`resolved_charset`/`resolved_borders`, consumido por cada crate de widget y
por el pack de bloques). Un valor de opción malformado o desconocido se
ignora — entonces se aplica el valor de la configuración.

## Opciones de diseño por widget (DR-UX1 + UX7)

Las tablas siguientes son la lista completa de claves reconocidas. Reglas:

- Las claves desconocidas y los valores malformados se **ignoran** (se aplica
  el valor por defecto documentado); un widget nunca rompe el renderizado
  por una opción errónea.
- Cuando una opción filtra elementos (núcleos, interfaces, montajes) y nada
  coincide, el widget vuelve a *todos* los elementos para que nunca quede en
  blanco.
- Todos los colores provienen de la paleta del tema a través del canónico
  `xtop_widget_api::glyph::to_color`; los índices de paleta son roles
  semánticos (DR-UX3). La tabla de roles vive al principio de
  `xtop-widget-core/src/util.rs` y refleja la tabla de roles de
  `docs/customization.md` del kernel: 0 bg, 1 alert, 2 good, 3 warn, 4
  lectura/descarga (RX), 5 escritura/subida (TX), 6 acento, 7 fg, 8
  dim/separadores, 9–15 la rampa de series múltiples.

### `cpu`

| Clave | Valores | Por defecto | Efecto |
|---|---|---|---|
| `chart` | `"average"` \| `"per-core"` | `"average"` | Zona de historial: el promedio de toda la máquina, o la vista por núcleo — cada columna toma el color del núcleo mostrado que alcanza su pico allí, desde la rampa de series del tema (ranuras 9..15 en ciclo). |
| `cores` | `"all"` \| especificación de subconjunto | `"all"` | Restringir los núcleos mostrados: `"0,2,4-7"` (ids/intervalos, ascendentes). Se aplica a las filas de núcleos y al gráfico por núcleo. |
| `show_freq` | `bool` | `false` | Añade la frecuencia por núcleo (dim, alineada a la derecha, `2.40GHz`) siempre que un núcleo mostrado informe de una. El modelo lleva `CpuInfo.frequency` (MHz); las filas degradan con elegancia cuando todas las frecuencias son 0. |
| `show_temp` | `bool` \| `"auto"` | `"auto"` | Celda de temperatura por núcleo (`47°`, a la derecha del todo, en negrita) **y** la marca braille de calor por núcleo: `"auto"` las muestra siempre que la instantánea lleve una temperatura por núcleo (`CpuInfo.temp_c`, Linux); `true` las fuerza a aparecer, `false` las oculta. Las temperaturas **nunca se fabrican**: sin ninguna temperatura `Some` en ningún sitio las celdas permanecen ocultas incluso bajo `true`. |

Renderizado (UX9.5): una fila normalizada por núcleo — celda `label cell`
(anchura fija), celda `percent` (alineada a la derecha, coloreada por rol),
celda opcional `frequency` (dim), luego la barra de gradiente que rellena
el resto de la columna, y a la derecha la **marca de calor por núcleo** (un
glifo braille/bloque cuya altura es la parte de la temperatura del anclaje
de 80 °C, coloreado por la rampa de calor) más la celda opcional
`temperature` (`47°`, coloreada por la rampa, a la derecha del todo)
cuando la fila informa de una temperatura. Solo se usan dos columnas cuando
cada columna conserva su anchura mínima de fila (etiqueta + porcentaje +
barra ≥ 4 celdas, más los extras cuando están habilitados); las zonas más
estrechas vuelven a una columna. Cuando ambos extras dejarían la barra
famélica, el bloque de temperatura cede primero, luego la frecuencia. Las
filas que no caben en la altura se recortan (ganan los núcleos superiores,
en orden de columnas).

**Título** (UX9.5): el nombre del modelo de CPU (saneado, truncado) se
añade entre paréntesis cuando el kernel informa de uno — `CPU (AMD Ryzen 7
5800X …) — Max 48°C` — junto con el sufijo existente de temperatura máxima;
sin modelo, el clásico `CPU (Max: 47.5°C)` permanece byte-idéntico. Los
títulos largos se cortan a la anchura de la zona con `…`.

**Fila unificada de uso+temp+potencia** (UX9.5): cuando la rejilla deja al
menos dos filas, la primera fila sobrante es un medidor compuesto de una
línea: `usage 42% ▂▄▆▆  temp 47° ▅▆▅▆  power 38.4W ▂▃▄▅` — tokens de
palabra con valores reales intercalados con porciones coloreadas (la fila es
su propia leyenda, así que no se necesita una clave separada). Cada porción
es una parte honesta: el uso de su escala de 100% (gradiente de medidor), la
temp del anclaje caliente de 80 °C (rampa de calor), la potencia de un techo
de visualización documentado de 200 W (gradiente de medidor, aviso al 50 %,
alerta al 90 % del techo). Los segmentos aparecen **solo** para datos que
son `Some`: el segmento de temp necesita al menos una temperatura por núcleo
(y la preferencia de visualización `show_temp`), el segmento de potencia el
lector de paquete del kernel (`SystemInfo.package_power_w` — RAPL en
Linux). Con solo datos de uso la fila es la barra promedio clásica
(`Avg: NN%` + barra de gradiente). Cuando no existe historial dibujable, la línea
resumen numérica arrastra la potencia del paquete (`Avg: 42%  Pkg 38.4W`)
para que la potencia nunca quede oculta. La fila nunca dibuja basura vacía:
no se fabrican segmentos.

**Línea de especificación de historial** (UX9.5): la fila braille de
historial anónima inferior ahora se autodescribe — su divisor lleva la
etiqueta dim `history: cpu %` cuando la anchura lo permite.

Debajo de las filas la zona de historial usa el motor de gráficos (ver
"Motor de gráficos" más abajo). Cuando el motor no puede dibujar (zona más
estrecha que 12 columnas, o menos de dos muestras de historial) la fila
sobrante muestra un resumen numérico compacto en lugar de basura:
`Avg: NN%` (con los recuentos de núcleos mostrados/total cuando un
subconjunto `cores` oculta núcleos, y el lector `Pkg` de arriba).

```json
{ "chart": "per-core", "cores": "0,2,4-7", "show_freq": true, "show_temp": "auto" }
```

### `processes`

| Clave | Valores | Por defecto | Efecto |
|---|---|---|---|
| `cpu` | `"core"` \| `"total"` \| `"both"` | `"core"` | Base de la columna CPU. `core` = fracción de un núcleo lógico, celdas como `12.5%`. `total` = `cpu_usage / logical_core_count()` (la parte de la CPU de toda la máquina), estilo parte-de-máquina: un decimal por debajo de 10 (`0.7`), un entero en/por encima de 10 (`34`). `both` muestra las dos columnas lado a lado (`CPU` por núcleo + `CPU%` total). El `cpu_usage` por proceso subyacente nunca cambia. |
| `columns.memory` | `bool` | `true` | Mostrar la columna Mem (la columna también se elimina automáticamente cuando la zona es demasiado estrecha). |
| `columns.user` | `bool` | `true` | Mostrar la columna User (misma regla de eliminación automática). |
| `columns.cmd` | `bool` | `true` | Mostrar la columna Command (misma regla de eliminación automática). |
| `zebra` | `bool` | `true` | Fondos dim alternados en las filas impares. |

Diseño fijo (UX7.3 + UX9.4): PID (alineado a la derecha, 7), Name
(alineado a la izquierda, flexible, truncado con `…`), la **chispa de cpu**
(ver más abajo), CPU% (derecha, 6; dos columnas bajo `both`), Mem (derecha,
10), User (izquierda, 9) y Command (izquierda, flexible) — separados por un
dim `│`. Las columnas Name y Command comparten la anchura flexible de la
fila (Name conserva como máximo 24 caracteres, Command el resto); las
columnas numéricas están alineadas a la derecha; la fila de cabecera es de
acento-negrita; el marcador de ordenación (▼/▲ de `process_sort_desc`) se
renderiza **solo** en la celda de cabecera de la columna ordenada. Las
columnas se eliminan de derecha a izquierda a medida que la zona se
estrecha: Command, luego User, luego Mem, luego la columna CPU de base
total, luego la chispa; por debajo del mínimo solo queda `PID | CPU%`. Las
filas son líneas lógicas únicas — nada se envuelve o colisiona.

**Nombres de usuario** (UX9.4): la columna User muestra el nombre de inicio
de sesión resuelto mediante `state.uid_to_name(uid)` (el kernel lee
`/etc/passwd`); cuando el kernel no tiene un mapeo (cuenta desconocida o no
local) se muestra el uid numérico — los nombres son un mapeo de
visualización, nunca fabricados.

**Command** (UX9.4): cada fila muestra la línea de comando completa — el
vector de argumentos del kernel (`cmd_full`, unido) cuando está poblado,
cayendo al único `cmd`, luego la ruta del ejecutable, luego `?` — junto al
`name` corto del programa.

**Chispa de cpu** (UX9.4): una pequeña chispa braille por fila (4 celdas,
degradando a 2 en filas estrechas) de las muestras recientes de CPU del
proceso (`state.process_cpu_history(pid)`, de la más antigua a la más
nueva, un glifo por cubo, picos de cubo preservados). Cada celda se colorea
por uso a través de la rampa de calor — los procesos inactivos pintan
glifos pequeños y bajos, los que martillean celdas completas `⣿` en el
color de alerta. El charset braille pinta glifos braille (`⣀⣰⣶⣿`), los
charsets de bloque la rampa de bloques de 8 niveles (la opción `charset` se
aplica). Un historial vacío (pid visto recientemente) dibuja un marcador de
posición dim `·` — las muestras nunca se fabrican.

**Desplazamiento de viewport.** El `process_view()` del kernel devuelve la
lista completa ordenada (filtrada por búsqueda); la selección se ancla por
PID. El widget deriva el índice seleccionado de la posición del PID en esa
lista y renderiza una ventana alrededor suyo — la selección siempre está
visible, la ventana comienza en la fila 0 mientras la selección esté cerca
de la parte superior, y los saltos conservan aproximadamente media pantalla
de contexto. Cada proceso de la lista es alcanzable con las teclas de
arriba/abajo existentes; una barra de desplazamiento dim (pulgar de acento)
aparece en el borde derecho cuando la lista es más larga que la zona. No se
necesitó ningún cambio en el kernel (el kernel ya mueve la selección sobre
la lista completa ordenada).

Búsqueda (pre-filtro del kernel): la subcadena de la consulta en la columna
Name se resalta (fondo de acento, negrita). La selección conserva el estilo
de fila de acento; el resaltado de confirmación de kill necesitaría una
bandera "kill pendiente" en el contrato del widget, que no existe —
señalada como una dependencia del lado del kernel.

```json
{ "cpu": "both", "columns": { "memory": true, "user": true, "cmd": true }, "zebra": true }
```

### `network`

| Clave | Valores | Por defecto | Efecto |
|---|---|---|---|
| `ifaces` | `"all"` \| `["eth0", ...]` | `"all"` | Qué interfaces cubren las filas y las líneas agregadas. |

Las filas son líneas lógicas únicas (nunca envueltas). Niveles de anchura
(anchura interna): `>= 60` filas por interfaz con nombre, barra de actividad
(escalada a la interfaz visible más rápida, coloreada por su dirección
dominante), velocidades RX y TX en sus roles de dirección, y totales
acumulados dim; `>= 41` elimina los totales; `>= 26` elimina también la
barra; por debajo de 26 el widget muestra dos líneas agregadas
(`RX rate tot bytes` / `TX …`) sobre la selección, truncadas con `…`. Una
pista dim `+N more` sustituye a la cola cuando la lista de interfaces
desborda la caja.

El gráfico de historial RX/TX de toda la máquina (el contrato solo
registra un historial de red por dirección, nunca por interfaz) se dibuja
debajo de las filas cuando la caja tiene al menos 16 columnas de ancho y
ambos historiales llevan ≥ 2 muestras; usa el motor de gráficos con el
coloreado fijo de rol RX (4) / TX (5) y consume cada fila sobrante. Mientras
el historial está vacío el widget expande las filas de interfaces a toda la
caja y — cuando la lista es corta — añade líneas RX/TX agregadas en vivo
para que no queden filas muertas entre el contenido y el marco.

```json
{ "ifaces": ["eth0", "wlan0"] }
```

### `storage`

| Clave | Valores | Por defecto | Efecto |
|---|---|---|---|
| `disks` | `"all"` \| `["/", "/boot"]` | `"all"` | Qué montajes mostrar (coincidencia por `mount_point` exacto). |

Una fila por montaje, nunca envuelta. Las filas anchas (UX9.6) son
`mount …bar…  NN%  used 50 GB · free 200 GB` — las cantidades usadas Y
libres (free = `total_space − used_space`, honesto: el kernel mapea
`used_space` exactamente así); la cantidad libre se colorea por la rampa de
medidor de lo usado (mucho espacio libre se lee como good, un disco casi
lleno se lee como alert) y, en filas muy anchas, una **barra braille de
parte libre** sigue al detalle (altura = la parte libre actual, color = la
misma rampa de margen — `DiskInfo` no lleva historial de capacidad, así que
no hay serie temporal que chispear; la barra es una lectura braille
instantánea honesta). Por debajo de la anchura amplia los niveles degradan:
`mount NN%` más la barra (la etiqueta cede espacio a la barra), por debajo
de 11 columnas texto plano `mount NN%`. Cuando la caja da a cada montaje al
menos dos filas (height/n >= 2, height >= 4, width `>= 18`) cada montaje se
renderiza como un bloque de medidor — línea de montaje (etiqueta + porciento
alineado a la derecha + cantidades usada/libre), luego la barra de usada
`U`, más la barra de disponible `A` (`DiskInfo.available_space`, reflejada a
través de la rampa de usada invertida) cuando existe una tercera fila — así
las barras por disco escalan con la altura de la caja. Solo viven aquí las
métricas de capacidad — las velocidades de E/S por dispositivo están en
`disk_io` (que no tiene campos de capacidad en el modelo, así que los
indicadores libres pertenecen solo a este widget).

```json
{ "disks": ["/", "/boot"] }
```

### `memory`

| Clave | Valores | Por defecto | Efecto |
|---|---|---|---|
| `sections` | `["memory", "available", "swap"]` | las tres | Qué filas de medidor dibujar (RAM, luego la fila available, luego swap). Una lista vacía/desconocida conserva las tres. |

Una fila de medidor por sección, nunca envuelta: `label` (negrita), una
celda de porcentaje alineada a la derecha (coloreada por rol), luego la
barra de gradiente. Las filas anchas muestran las cantidades **usada Y
libre** (UX9.6): `RAM 50% ██████  used 8.0 GB · free 7.0 GB ⣿⣶⣰` — la
cantidad libre (`MemoryInfo.free` del kernel para RAM, `swap.free` para
swap) se colorea a través de la rampa de margen (good mientras haya margen
de sobra, warn/alert a medida que la máquina se aprieta), y la fila RAM
arrastra una **chispa braille de la parte libre a lo largo del tiempo**
derivada honestamente del historial de porcentaje usado del kernel
(`free = 100 − used` por muestra; el kernel solo registra el porcentaje
usado). Cada celda de la chispa se colorea por la escasez de la parte libre,
así que una máquina que se ahoga pinta glifos rojos bajos. La fila available (`AVL`)
se renderiza solo cuando la instantánea puede derivarla
(`MemoryInfo.available`, total no nulo) — su barra se rellena con la parte
*available*, coloreada por la misma rampa de medidor invertida
(`gauge(100 − avail%)`), así que se vuelve roja de alerta cuando la máquina
se queda sin margen; swap se vuelve rojo de alerta pasando el umbral de
memoria. Por debajo de 10 columnas internas todo el widget colapsa a una
línea resumen (`RAM 50% AVL 50% SWP 13%`). El gráfico de historial de RAM se
dibuja debajo de las filas cuando la zona tiene al menos 14 columnas de
ancho y el historial tiene ≥ 2 muestras; el gráfico consume **cada fila
sobrante** (ver "Motor de gráficos") — el gráfico *es* el historial de RAM,
nunca por sección.

```json
{ "sections": ["memory", "available", "swap"] }
```

### `disk_io`

Una fila de una sola línea por dispositivo, nunca envuelta: las filas anchas
muestran `name`, las velocidades de lectura y escritura (roles de dirección
4/5) más pequeñas barras de velocidad escaladas al dispositivo más rápido de
la vista; por debajo de la anchura compacta las filas vuelven a
`name R rate W rate` con unidades sin espacios en cajas muy estrechas,
truncadas con `…` como último recurso. `No disk I/O data` cuando la
instantánea no lleva ningún dispositivo.

Cuando la caja tiene al menos 16 columnas de ancho y el contrato registra
los historiales de disco agregados de toda la máquina (`disk_read_history()`
/ `disk_write_history()`, ambos ≥ 2 muestras), las filas reservan dos filas
de texto y las filas sobrantes alojan el gráfico dual de lectura/escritura —
lecturas rol 4, escrituras rol 5, eje y el pico visible de ambas series
(misma geometría que el gráfico de red; las filas son por dispositivo
mientras que los historiales son agregados de toda la máquina, exactamente
como las filas de red frente a su historial agregado). Una pista dim
`+N more` sustituye a la cola de dispositivos que no cabe. Sin historiales
las filas simplemente se expanden a toda la caja (fallback solo de texto).
`DiskIOInfo` expone solo velocidades y contadores de bytes — sin capacidad —
así que los indicadores usado/libre de UX9.6 viven en `storage` (`DiskInfo`
por montaje).

### `summary`

Panel compacto siempre lleno de números agregados; sin opciones específicas
de widget (solo claves de glifos). Filas de contenido (cada una una única
línea lógica, truncada con `…`, nunca envuelta):

1. `Load 2.81 2.30 2.42` — valores coloreados por su parte de los núcleos
   lógicos (`logical_core_count()`), misma regla de medidor que el header.
2. Fila de medidor `CPU` — uso promedio de la máquina: celda de porcentaje,
   barra de gradiente coloreada por rol, recuento de núcleos dim en filas
   anchas.
3. Fila de medidor `Mem` — porcentaje usado + barra; detalle `used/total`
   en filas anchas.
4. `Procs 264 Run 2 Sleep 211 …` — el recuento de procesos de la
   instantánea más los recuentos por estado (cubos por subcadena sin
   distinción de mayúsculas de `ProcessInfo.state`: Run/Sleep/Zombie/Idle/
   Stop, cualquier otra cosa se pliega en "Other"); cuando cada cadena de
   estado está vacía solo se muestra el total. Los recuentos nunca fabrican
   un cubo.
5. `Uptime 0d 7h 27m 9s`.

Las cajas más altas que las cinco filas de contenido dibujan el gráfico de
historial de promedios de carga (`load_history()`) en las filas sobrantes —
autoescalado al pico de la ventana visible (una vista de tendencia,
coloreada con el rol good, la misma escala y color que la chispa en línea);
con muy poca altura para el gráfico (o sin historial) la fila de carga
arrastra una chispa en línea de rampa de bloques cuando la anchura lo
permite. Con altura 4 el widget muestra las filas de contenido superiores y
aun así llena la caja.

### `sensors`

Panel de temperatura por núcleo; sin opciones específicas de widget (solo
claves de glifos). Cuando cualquier núcleo expone `CpuInfo.temp_c` (Linux),
el widget renderiza una rejilla en orden de columnas de celdas `CPU0 47°` —
cada valor coloreado por la rampa de temperatura (interpolada entre los
roles good/warn/alert del tema, ver "Rampa de temperatura") con una barra
`#`/de gradiente escalada al anclaje de 80 °C en filas de una sola columna;
el título lleva la temperatura máxima (`snapshot().cpu_temp`, cayendo al
valor máximo por núcleo). Las filas que desbordan la altura se recortan en
silencio (como la rejilla de cpu).

Cuando **no** existen datos de temperatura en ningún sitio (`temp_c` es
`None` en cada núcleo — macOS, Windows, hosts sin sensores), la caja
renderiza la línea honesta `no temperature data` más los promedios de carga
(coloreados por rol como en el header) — nunca vacía, nunca fabricada. Las
filas sobrantes bajo la rejilla (o las líneas de estado vacío) alojan el
gráfico de historial de promedios de carga cuando el kernel lo registra y la
anchura lo permite.

### `header`, `battery`, `gpu`

No se reconocen opciones específicas de widget (las claves desconocidas se
ignoran; se aplican los valores por defecto). Las claves de glifos
`charset`/`borders` de la tabla superior se aplican a cada widget, incluidos
estos.

## Motor de gráficos (UX7.1 + UX8.4)

`xtop-widget-core/src/chart.rs` implementa el trazador coloreado por celda
usado por las zonas de historial de cpu/memory/network/disk_io/summary/
sensors y los helpers de chispa de una fila
(`spark_cells`/`spark_glyph`/`spark_levels`) usados por las chispas braille
por fila (chispas de cpu de procesos, chispas de memoria libre, barras
braille de parte libre de storage). Modelo:

- Una serie es una lista de muestras `(x, y)` (ordenadas por x, espaciadas
  uniformemente — los historiales del contrato lo están). Las columnas
  muestrean un interpolante lineal por tramos en su índice central; las
  muestras que comparten columna también contribuyen con su máximo
  (preservación de picos).
- Las columnas se rellenan **desde la línea base cero** a la resolución
  vertical: `braille` = 4 sub-filas por fila de texto (puntos `⣀ ⣰ ⣶ ⣿`
  para 1–4 sub-filas encendidas), `block`/`half_block` = 8 sub-filas por
  fila de texto vía la rampa de bloques `▁▂▃▄▅▆▇█`. **Una zona de gráfico
  de altura H renderiza H filas de texto** — el motor nunca colapsa: los
  widgets le entregan todo el rect sobrante, así que una caja estilo
  100×34 de memory/network/disk_io con cinco filas sobrantes dibuja un
  trazado braille de cinco filas (un valor de 25% enciende la(s) fila(s)
  inferior(es) por completo más una celda superior parcial). Un trazado de
  altura 1 es una **sparkline** y siempre usa la rampa de bloques de 8
  niveles — una fila de texto no puede alojar más de 4 niveles braille, que
  es exactamente el braille de una línea apretada que este motor sustituye.
- Las **mini chispas** de una fila son diferentes: las muestras discretas se
  mapean a celdas discretas, así que los charsets braille pintan glifos
  braille (`⣀⣰⣶⣿` — una celda braille ya lleva 4 sub-niveles) y los
  charsets de bloque la rampa de 8 niveles. Los colores por celda provienen
  de un mapeo de roles proporcionado por el llamador (reglas de calor para
  el uso, reglas de escasez para las partes libres). Las series más cortas
  que el recuento de celdas pintan solo sus muestras (las celdas restantes
  quedan vacías).
- Los charsets `dot`/`bar` conservan la ruta clásica `Chart` de ratatui
  (marcador vía el canónico `marker_for`), incluidas sus etiquetas de eje —
  el motor nunca las dibuja.

Regla de color (determinista, por celda):

- Series de rol fijo (cpu por núcleo, network RX/TX, disk_io R/W): la celda
  toma el color de rol de la serie cuya sub-fila encendida más alta esté más
  arriba; los empates se resuelven a la serie **listada primero** (network
  pasa RX antes que TX, así que los empates se leen como RX; disk_io pasa
  las lecturas antes que las escrituras).
- Calor (serie única promedio/RAM/carga): la sub-fila encendida más alta se
  mapea a `gauge_gradient(level/total_subrows * 100, alert_at)` en las
  mismas ranuras de rol que usan los medidores — las celdas bajo el 50% del
  eje son `good`, del 50% al umbral de alerta `warn`, en/sobre él `alert`.
  CPU usa `alerts().cpu_high`, RAM `alerts().mem_high`; los gráficos de
  carga de summary/sensors usan el recuento de núcleos lógicos como eje y
  `alerts().cpu_high` como umbral (la misma semántica que el coloreado de
  carga del header); los gráficos de network/disco siempre están coloreados
  por rol.

Las zonas de historial muestran un divisor dim `─` cuando hay al menos tres
filas disponibles y el trazado inferior tiene al menos dos filas de alto (el
divisor de cpu lleva la etiqueta dim `history: cpu %` cuando la anchura lo
permite — UX9.5). Anchuras mínimas de gráfico: cpu 12, memory 14, network
16, disk_io 16, carga de summary/sensors 12 columnas — las zonas más
estrechas vuelven al resumen numérico descrito por widget.

## Rampa de temperatura (UX8.4)

La UI de temperatura (la celda `show_temp` de cpu + las marcas de calor por
núcleo, la rejilla del widget sensors, el segmento de temp de la barra
unificada de cpu) se colorea por una rampa derivada de los propios roles de
medidor del tema — **no se inventa ninguna ranura nueva de paleta**, así
que la tabla de roles se mantiene consistente y los colores de rol de bajo
contraste que el kernel eleva al cargar el tema se propagan a la rampa.
Puntos finales (documentados en `xtop-widget-core/src/util.rs`):

- en/bajo 45 °C la rampa es el color de rol `good` (ranura 2),
- a 60 °C pasa el color de rol `warn` (ranura 3),
- en/sobre 80 °C es el color de rol `alert` (ranura 1),

con los colores intermedios interpolados por canal entre los colores de rol
(`util::temp_color`).

## Pack base (`xtop-widgets`)

`registry()` registra 11 nombres: `header`, `cpu`, `memory`, `storage`,
`network`, `processes`, `disk_io`, `battery`, `gpu`, `summary`, `sensors`.
`header`, `cpu`, `memory`, `storage`, `network`, `processes`, `disk_io`,
`summary` y `sensors` son los nombres que referencian los diseños por
defecto del kernel; `battery` y `gpu` no forman parte de ningún diseño por
defecto y son alcanzables a través del modo de pantalla completa del kernel
(`FullScreenWidget::Battery/Gpu` mapean a los nombres `"battery"`/`"gpu"`
en `ui/screen.rs` del kernel). Todos los renderizadores devuelven pronto
cuando la instantánea es `None` (pre-primer-tick), así que cada widget es
seguro con un estado vacío.

| Nombre | Dibuja | Datos de | Opciones |
|---|---|---|---|
| `header` | Una línea resumen (`area.width >= 80`) o dos: segmentos con código de color — host (fg en negrita) \| tema (acento) \| diseño (ranura de rampa 9) \| uptime \| promedios de carga coloreados por su parte de los núcleos lógicos; añade `[Full: …]` y marcadores `[/] Search` cuando están activos. El bloque pertenece a un `Paragraph`. | `sys_info().hostname`, `layout_name()`, `snapshot().uptime`/`load_avg`, `fullscreen_label()`, `is_searching()`, `logical_core_count()` | solo claves de glifos |
| `cpu` | Una fila por núcleo (etiqueta/porcentaje/freq/marca-de-calor/temp/barra, ver arriba), 2 columnas cuando es bastante ancho; la fila unificada de uso+temp+potencia y el gráfico de historial etiquetado debajo cuando la zona lo permite. Título: modelo + temperatura máxima. | `snapshot().cpus` (incl. `temp_c`), `sys_info().cpu_model`/`package_power_w`, `cpu_history()`, `alerts().cpu_high` | `chart`, `cores`, `show_freq`, `show_temp`, claves de glifos |
| `memory` | Filas de medidor RAM/AVL/SWP (cantidades usada/libre + chispa de parte libre de RAM en filas anchas) más el gráfico de historial de RAM cuando la zona es bastante ancha y alta; el título gana un marcador ⚠ sobre el umbral de memoria. | `snapshot().memory`/`swap`, `mem_history()`, `alerts().mem_high` | `sections`, claves de glifos |
| `storage` | Una fila de una sola línea por disco montado (etiqueta, porcentaje, barra de gradiente; cantidades usada/libre en filas anchas + barra braille libre cuando es muy ancha); las cajas altas renderizan bloques de medidor de tres líneas por disco (`mount` + barra `U` usada + barra `A` available) para que las barras por disco escalen con la altura de la caja. | `snapshot().disks`, `alerts().disk_high` | `disks`, claves de glifos |
| `network` | Filas de velocidad de una sola línea por interfaz (o líneas RX/TX agregadas cuando es estrecho); gráfico de historial RX/TX debajo cuando es bastante ancho y alto (líneas en vivo agregadas llenan el hueco mientras el historial está vacío). | `snapshot().networks`, `net_rx_history()`, `net_tx_history()` | `ifaces`, claves de glifos |
| `processes` | Tabla de columnas fijas con PID / Name / chispa-de-cpu / CPU% / Mem / User / Command, separadores dim `│`, cabecera de acento con el marcador de ordenación solo en la columna ordenada, filas zebra, fila de selección, ventana de desplazamiento de viewport con barra de desplazamiento en el borde derecho; nombres de usuario resueltos a través del mapa de uids del kernel, comandos desde el argv completo, chispas braille de cpu por proceso. | `process_view()`, `uid_to_name()`, `process_cpu_history()`, `process_sort_label()`, `process_sort_desc()`, `search_query()` | `cpu`, `columns`, `zebra`, claves de glifos |
| `disk_io` | Una fila de una sola línea por dispositivo: nombre, velocidades R/W en los roles de dirección (las filas anchas añaden barras de velocidad); gráfico de historial dual lectura/escritura en las filas sobrantes cuando el contrato registra los historiales de disco agregados; "No disk I/O data" cuando está vacío. | `snapshot().disk_io`, `disk_read_history()`, `disk_write_history()` | solo claves de glifos |
| `battery` | Un medidor por batería: nombre, %, estado, minutos para lleno/vacío cuando corresponda; "No battery data available" cuando está vacío. | `snapshot().batteries` | solo claves de glifos |
| `gpu` | Un medidor por GPU: nombre, %, memoria usada/total, temperatura; "No GPU data available" cuando está vacío. | `snapshot().gpus` | solo claves de glifos |
| `summary` | Promedios de carga (coloreados por rol según la parte de núcleos) + medidores CPU/Mem + recuentos de procesos + uptime; gráfico de historial de promedios de carga en las filas sobrantes (chispa en línea en la fila de carga con alturas pequeñas). | `snapshot().load_avg`/`uptime`/`processes`/`memory`/`cpus`, `load_history()`, `logical_core_count()` | solo claves de glifos |
| `sensors` | Rejilla de temperatura por núcleo coloreada por la rampa de temperatura (el título lleva la máxima); "no temperature data" + promedios de carga cuando no existe ningún `temp_c` en ningún sitio; el gráfico de carga llena las filas sobrantes. | `snapshot().cpus` (`temp_c`) /`load_avg`, `cpu_temp`, `load_history()` | solo claves de glifos |

Los historiales los dibuja el motor de gráficos descrito arriba (charsets
braille/block/half-block, colores por celda), conservándose la ruta clásica
`Chart` de ratatui para los charsets `dot`/`bar`.

## Pack de bloques (`xtop-widget-blocks`)

Registra `cpu`, `memory`, `processes`, `network`, `storage`, `disk_io`,
`summary` y `sensors`; cualquier otro nombre vuelve al pack base (contrato
del kernel, ver `docs/authoring.md`). Actívalo con la feature `widget-blocks`
del kernel y selecciona el pack por widget o globalmente. El pack de bloques
consume el mismo motor compartido que los crates de widget
(`xtop-widget-core`): los roles de paleta, los analizadores de opciones, la
resolución de glifos, el motor de gráficos y los helpers de chispa son
canónicos — el pack conserva su identidad ASCII (rellenos `#`) y su
composición de filas/tablas en su propio código.

En qué difiere del pack base:

- Identidad ASCII: las barras y los rellenos son caracteres `#` en lugar de
  glifos de bloque; el marco y los glifos de gráfico siguen el charset y los
  bordes resueltos exactamente igual que el pack base. Las chispas braille
  por fila y las marcas de calor usan los mismos helpers de glifos que el
  pack base (resueltos por charset).
- `cpu` — titulado "CPU BLOCKS" (+ el modelo y la temp máxima): una fila de
  una sola línea por núcleo (etiqueta, porcentaje, frecuencia opcional,
  marca de calor por núcleo, temperatura y barra `#`), respetando `cores`,
  `show_freq`, `show_temp`; cuando la rejilla deja una fila, la línea
  unificada de uso+temp+potencia (porciones `#`, paridad UX9.5) se dibuja
  debajo.
- `memory` — titulado "Memory (blocks)": filas de medidor RAM/AVL/SWP con
  barras `#`, cantidades usada/libre en filas anchas y la chispa braille de
  parte libre de RAM, más el gráfico de historial de RAM a través del motor
  (braille por defecto; los conjuntos de glifos `block`/`half_block` se
  alcanzan por widget), respetando `sections`.
- `processes` — titulado "Processes (blocks)": una tabla ASCII separada por
  `|` (PID / Name / chispa-de-cpu / CPU… / Mem / User / Command) con la
  política de eliminación de columnas del pack base, nombres de usuario
  resueltos, líneas de comando completas, chispas braille de cpu por
  proceso, marcador de ordenación en la columna ordenada, filas zebra y la
  misma ventana de desplazamiento de viewport; respetando `cpu`, `columns`,
  `zebra`.
- `network` — titulado "Network (blocks)": filas de barra `#` por interfaz
  (o líneas agregadas cuando es estrecho) con los mismos niveles de anchura
  y el gráfico dual RX/TX del motor en las filas sobrantes, respetando
  `ifaces`.
- `storage` — titulado "Storage (blocks)": una fila de relleno `#` por
  montaje con cantidades usada/libre en filas anchas (+ la barra braille de
  parte libre cuando es muy ancha), respetando `disks` y el umbral de alerta
  de disco; las cajas altas renderizan los bloques de medidor de tres líneas
  por disco (`mount` + barras `U` + `A`).
- `disk_io` — titulado "Disk I/O (blocks)": líneas R/W por dispositivo con
  barras `#` y unidades compactas en cajas estrechas más el gráfico dual
  lectura/escritura del motor en las filas sobrantes cuando existen los
  historiales agregados.
- `summary` — titulado "Summary (blocks)": las mismas filas de contenido con
  barras de medidor `#` y el gráfico de promedios de carga del motor en las
  filas sobrantes.
- `sensors` — titulado "Sensors (blocks)": rejilla de temperatura por núcleo
  con barras de calor `#` (mismos colores de rampa) y el mismo estado vacío
  honesto.

## Notas de comportamiento

- Todos los widgets son defensivos con zonas pequeñas: las secciones de
  gráfico solo se renderizan cuando la zona es bastante ancha/alta, las
  filas de texto son líneas lógicas únicas (truncadas con `…` donde un
  nivel no puede alojarlas), y los widgets de listas dejan de añadir filas
  cuando la zona se agota. Las pruebas de humo renderizan cada widget
  registrado de ambos packs a 100x34, 100x30, 80x24, 60x20, 40x15 y 20x10
  con estado vacío y muestreado, verifican que cada fila permanece dentro
  del marco (sin detección de envoltura) y que los gráficos producen glifos
  de varias filas cuando el trazado tiene al menos dos filas de alto (ver
  `src/lib.rs` de `xtop-widgets`, `mod tests`, y
  `xtop-widget-blocks/src/lib.rs`, `mod tests`; ambas suites de pruebas
  comparten el testkit de `xtop-widget-core` — el doble de `WidgetState`
  detrás de la feature de cargo `testkit`).
- Los widgets nunca mutan estado y nunca tocan tipos del kernel; las
  entradas de renderizado son la vista `WidgetState` más el
  `SystemSnapshot` por tick.
- Los datos de historial de CPU (`cpu_history()`) son por núcleo y están
  alineados por índice con `snapshot().cpus`; el gráfico por núcleo lo lee a
  través del `cpu_id` de los núcleos mostrados. Los historiales de red son
  velocidades de toda la máquina (bytes/s), así que el eje y del gráfico de
  red es el máximo visible de ambas series. La misma forma se aplica a los
  historiales de disco agregados (`disk_read_history()` /
  `disk_write_history()`, bytes/s) y a `load_history()` (promedio de carga
  de 1 minuto) — los tres son la superficie aditiva UX8.3 de `WidgetState`
  con valores por defecto vacíos, consumida solo cuando no está vacía. UX9.4
  añade el mapa uid→nombre (`uid_to_name`, por defecto `None`) y el
  historial de cpu por proceso acotado (`process_cpu_history`, por defecto
  vacío) a esa superficie aditiva.
- Cada color que pinta una cantidad, segmento o chispa está dirigido por el
  tema a través de las reglas documentadas de rol/rampa; nada nuevo se
  inventa cuando los datos son `None` — los widgets muestran el fallback
  honesto (uid numérico, `?`, `·`, segmento oculto, barra clásica) en su
  lugar.
