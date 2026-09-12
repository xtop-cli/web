<h1 id="customization-guide">Guía de personalización</h1>

<p>xtop permite personalizar en tiempo de ejecución los temas de color y los modos de layout mediante ficheros JSONC externos. Esta guía explica cómo crear y gestionar tus propios temas y layouts.</p>

<hr>

<h2 id="table-of-contents">Índice</h2>

<ul>
  <li><a href="#themes">Temas</a>
    <ul>
      <li><a href="#theme-location">Ubicación</a></li>
      <li><a href="#theme-format">Formato</a></li>
      <li><a href="#palette-reference">Referencia de la paleta</a></li>
      <li><a href="#starter-themes">Temas iniciales</a></li>
      <li><a href="#loading-order">Orden de carga</a></li>
      <li><a href="#theme-tips">Consejos</a></li>
    </ul>
  </li>
  <li><a href="#layouts">Layouts</a>
    <ul>
      <li><a href="#layout-location">Ubicación</a></li>
      <li><a href="#layout-format">Formato</a></li>
      <li><a href="#size-constraints">Restricciones de tamaño</a></li>
      <li><a href="#available-widgets">Widgets disponibles</a></li>
      <li><a href="#layout-examples">Ejemplos</a></li>
      <li><a href="#starter-layouts">Layouts iniciales</a></li>
      <li><a href="#cycling-order">Orden de ciclo</a></li>
      <li><a href="#layout-notes">Notas</a></li>
    </ul>
  </li>
  <li><a href="#widget-packs">Packs de widgets</a></li>
  <li><a href="#runtime-widgets">Widgets en tiempo de ejecución (WASM / procesos externos)</a></li>
</ul>

<hr>

<h2 id="themes">Temas</h2>

<h3 id="theme-location">Ubicación</h3>

<p>Los ficheros de tema viven en la subcarpeta <code>themes/</code> del directorio de
configuración de la plataforma (el mismo árbol que <code>config.json</code> y los
layouts):</p>

<pre><code>~/.config/xtop/themes/*.jsonc                (Linux)
~/Library/Application Support/xtop/themes/   (macOS)
%APPDATA%\xtop\themes\                       (Windows)
</code></pre>

<p>El directorio y los ficheros de tema incluidos se crean automáticamente en el
primer arranque; no hace falta copiar nada a mano.</p>

<h3 id="theme-format">Formato</h3>

<p>Cada fichero de tema define un <code>name</code>, un par explícito de
<code>background</code>/<code>foreground</code> y una <code>palette</code> de 16
entradas (formato v2, UX8.1). Los colores son cadenas hexadecimales con un
prefijo <code>#</code> opcional. Los comentarios (<code>//</code> y <code>/* */</code>)
se admiten en ficheros JSONC. Las claves <code>background</code>/<code>foreground</code>
son opcionales para ficheros de terceros escritos contra el antiguo formato de
16 ranuras: las claves ausentes caen a <code>palette[0]</code> /
<code>palette[7]</code>. Las entradas de la paleta no son colores arbitrarios:
cada ranura tiene un <strong>rol</strong> fijo (ver la
<a href="#palette-reference">Referencia de la paleta</a>), de modo que los temas
siguen siendo intercambiables y cada renderer — los packs de widgets y el chrome
del kernel por igual — elige los colores por rol, nunca por gusto.</p>

<pre><code>{
    // my-custom-theme -- Dark background, warm accents
    "name": "my-custom-theme",
    "background": "#1a1b1c", // screen/frame background (role bg)
    "foreground": "#abb2bf", // primary text (role fg)
    "palette": [
        "#1a1b1c", //  0: legacy background alias (ROLE_BG)
        "#e06c75", //  1: alert red (high fills, avg cpu line)
        "#98c379", //  2: good green (normal fills, RAM line)
        "#e5c07b", //  3: warn yellow (gradient mid stop)
        "#d19a66", //  4: read / RX (network RX, disk reads)
        "#c678dd", //  5: write / TX / GPU (network TX, disk writes)
        "#56b6c2", //  6: accent (titles, headers, selection)
        "#abb2bf", //  7: legacy foreground alias (ROLE_FG)
        "#3e4451", //  8: dim (zebra rows, separators, dividers)
        "#e06c75", //  9..15: bright series ramp (multi-series charts)
        "#98c379",
        "#e5c07b",
        "#d19a66",
        "#c678dd",
        "#56b6c2",
        "#abb2bf"
    ]
}</code></pre>

<h3 id="contrast-normalization">Normalización de contraste (UX8.2)</h3>

<p>Cada tema se normaliza una vez, justo después de analizarse, contra su
<code>background</code> explícito. El motor mide la razón de contraste WCAG de
cada rol y eleva automáticamente los colores que no alcanzan su mínimo, de forma
determinista y preservando el tono (los colores se mueven hacia el blanco sobre
fondos oscuros y hacia el negro sobre los claros, en pasos pequeños hasta
superar el mínimo):</p>

<table>
  <thead>
    <tr><th>Rol</th><th>Mínimo</th><th>Fuente</th></tr>
  </thead>
  <tbody>
    <tr><td>texto de primer plano</td><td>4.5:1</td><td><code>foreground</code> explícito (ficheros heredados: ranura 7)</td></tr>
    <tr><td>accent</td><td>3.0:1</td><td>ranura 6</td></tr>
    <tr><td>dim</td><td>3.0:1</td><td>ranura 8</td></tr>
    <tr><td>texto de filas cebra</td><td>3.0:1</td><td>primer plano pintado sobre la banda dim (las ranuras comparten la 8)</td></tr>
    <tr><td>rampa de series / acentos</td><td>2.0:1</td><td>ranuras 1–5, 7, 9–15 (marcas de color sobre el fondo)</td></tr>
  </tbody>
</table>

<p>El mínimo de dim y el del texto de filas cebra comparten la ranura 8, así que
no pueden cumplirse ambos en paletas cuyo primer plano está cerca del fondo:
el texto de filas cebra siempre gana, y dim conserva el valor más alto que
sigue superándolo (para las paletas incluidas <code>helsinki</code>/<code>oslo</code>
no es posible elevarlo en absoluto y dim conserva su valor canónico). Los valores
elevados sustituyen a las entradas de la paleta en memoria, de modo que los
renderers siguen leyendo <code>theme_palette()</code> y los accesores de rol sin
cambios — los <strong>ficheros incluidos/de usuario nunca se reescriben</strong>:
la normalización ocurre solo al cargar.</p>

<h3 id="palette-reference">Referencia de la paleta</h3>

<p>Esta tabla es la única referencia fiable de roles: los accesores de tema del
kernel (<code>bg()</code>/<code>fg()</code>/<code>accent()</code>/<code>dim()</code> en
<code>src/theme/model.rs</code>) y las constantes <code>ROLE_*</code> de los packs de
widgets (repo widgets, <code>src/util.rs</code>) se corresponden exactamente con
estas ranuras, y la columna de uso refleja lo que el código pinta hoy realmente.
Si un renderer necesita un color, lo toma de aquí — no hay índice de paleta sin
documentar. El texto se dibuja con el par explícito de
<code>foreground</code>/<code>background</code>
(<code>theme_fg()</code>/<code>theme_bg()</code> en el contrato de widgets);
las ranuras de la paleta alimentan las marcas de color.</p>

<table>
  <thead>
    <tr>
      <th>Índice</th>
      <th>Rol</th>
      <th>Uso real (kernel + packs de widgets)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>0</code></td>
      <td>alias de fondo heredado (<code>ROLE_BG</code>)</td>
      <td>Fondo de terminal/bloque de los marcos de los packs; la propia pantalla pinta la clave <code>background</code> explícita (<code>Theme::bg()</code>)</td>
    </tr>
    <tr>
      <td><code>1</code></td>
      <td>alert (<code>ROLE_ALERT</code>)</td>
      <td>Rellenos rojos/de nivel alto: medidores de CPU/mem/swap por encima de su umbral de alerta, la línea media del gráfico de CPU, el medidor de CPU de la vista mínima</td>
    </tr>
    <tr>
      <td><code>2</code></td>
      <td>good (<code>ROLE_GOOD</code>)</td>
      <td>Rellenos verdes/normales: parada baja del degradado, línea del histórico de RAM, relleno de la batería, medidor de memoria de la vista mínima</td>
    </tr>
    <tr>
      <td><code>3</code></td>
      <td>warn (<code>ROLE_WARN</code>)</td>
      <td>Rellenos amarillos: parada media del degradado para CPU/mem/storage/swap al 50% o más pero por debajo del umbral de alerta</td>
    </tr>
    <tr>
      <td><code>4</code></td>
      <td>read/RX (<code>ROLE_RX</code>)</td>
      <td>Métricas de descarga/lectura: totales/líneas RX de red, medidores de lectura de disk_io</td>
    </tr>
    <tr>
      <td><code>5</code></td>
      <td>write/TX (<code>ROLE_TX</code>)</td>
      <td>Métricas de subida/escritura: totales/líneas TX de red, medidores de escritura de disk_io, relleno de GPU</td>
    </tr>
    <tr>
      <td><code>6</code></td>
      <td>accent (<code>ROLE_ACCENT</code>)</td>
      <td>Acentos: cabecera/selección de la tabla de procesos, spans de teclas de la ayuda, títulos/bordes de superposiciones; <code>Theme::accent()</code></td>
    </tr>
    <tr>
      <td><code>7</code></td>
      <td>alias de primer plano heredado (<code>ROLE_FG</code>)</td>
      <td>Ancla casi blanca de la familia de tono base; puede legítimamente igualar el fondo (París: ranura 7 == su fondo — los renderers dibujan el texto con el <code>foreground</code> explícito, <code>Theme::fg()</code>)</td>
    </tr>
    <tr>
      <td><code>8</code></td>
      <td>dim (<code>ROLE_DIM</code>)</td>
      <td>Atenuado/secundario: fondos de filas cebra, separadores de columna, divisores de gráficos, notas apagadas; <code>Theme::dim()</code></td>
    </tr>
    <tr>
      <td><code>9</code>–<code>15</code></td>
      <td>rampa brillante de series (<code>ROLE_SERIES_START</code>..<code>ROLE_SERIES_END</code>)</td>
      <td>Siete variantes brillantes para gráficos de varias series (líneas de histórico por núcleo, ciclan por índice de serie)</td>
    </tr>
  </tbody>
</table>

<p>Los temas incluidos repiten la familia de tono base en las ranuras 9–15
(variantes brillantes de las ranuras 1–7 en el mismo orden), que es lo que hace
que la rampa de series se vea coherente. Mantén esa convención al escribir un
tema: las ranuras 9–15 deben distinguirse entre sí y de las ranuras 1–8.</p>

<h3 id="starter-themes">Temas iniciales</h3>

<p>xtop incluye <strong>12 temas</strong>. La paleta <code>x</code> (fondo casi
negro, acentos púrpura-rosa) está compilada en el binario como respaldo de
arranque; las 12 definiciones — incluida <code>x</code> y <code>miami</code> —
están incrustadas en el binario como plantillas de siembra. El primer arranque
las escribe en el directorio de temas de arriba, de modo que cada tema incluido
está disponible sin copiar nada.</p>

<p>Si quieres restaurarlos más tarde, cópialos desde el repositorio:</p>

<pre><code>cp -r assets/themes/* ~/.config/xtop/themes/   # Linux
# macOS: ~/Library/Application Support/xtop/themes/
</code></pre>

<p><strong>Temas disponibles:</strong> <code>x</code>, <code>berlin</code>, <code>bogota</code>,
<code>helsinki</code>, <code>lahabana</code>, <code>london</code>, <code>madrid</code>,
<code>miami</code>, <code>oslo</code>, <code>paris</code>, <code>praha</code>,
<code>tokio</code>.</p>

<p>Todas las paletas de los temas están documentadas en <a href="colors.md"><code>colors.md</code></a>.</p>

<h3 id="loading-order">Orden de carga</h3>

<ol>
  <li>La paleta <code>x</code> compilada (respaldo de arranque, índice 0).</li>
  <li>Los temas del directorio de temas (sembrados en el primer arranque) cargan
      encima; un fichero que reutilice el nombre <code>x</code> anula la paleta
      compilada en su sitio.</li>
  <li>Si un tema personalizado tiene el mismo nombre que uno incluido, lo <strong>reemplaza</strong>;
      los nombres nuevos se añaden después del conjunto incluido.</li>
</ol>

<h3 id="theme-tips">Consejos</h3>

<ul>
  <li>Prueba los temas en escala de grises (<code>london</code>, <code>berlin</code>) como base y añade tus propios colores de acento.</li>
  <li>Prefiere escribir las claves explícitas <code>background</code>/<code>foreground</code>: el respaldo (ranura 0/ranura 7) es solo para ficheros heredados, y un primer plano en la ranura 7 puede igualar el fondo (la paleta París incluida conserva esa rareza a propósito — el par explícito es el anclaje de los roles).</li>
  <li>No luches contra el normalizador de contraste: los roles por debajo de su mínimo se elevan al cargar. Escribe la paleta que quieras; el motor garantiza los mínimos en memoria mientras el fichero permanece canónico.</li>
  <li>Las ranuras 9–15 son la rampa brillante de series: haz que cada entrada sea una variante más brillante de las ranuras 1–7 en orden para que los gráficos de varias series sigan siendo distinguibles.</li>
  <li>Nunca reaproveches una ranura: los renderers eligen los colores según la tabla de roles de arriba, así que un tema que reordene los roles rompe todos los widgets que los leen.</li>
</ul>

<hr>

<h2 id="layouts">Layouts</h2>

<h3 id="layout-location">Ubicación</h3>

<p>Coloca los ficheros de layout en el directorio de layouts de la plataforma
(directorio de configuración + <code>layouts</code>):</p>

<pre><code>~/.config/xtop/layouts/*.jsonc          (Linux)
~/Library/Application Support/xtop/layouts/*.jsonc   (macOS)
%APPDATA%\xtop\layouts\*.jsonc          (Windows)
</code></pre>

<p>Se aceptan las extensiones <code>.jsonc</code> y <code>.json</code>.</p>

<h3 id="layout-format">Formato</h3>

<p>Un layout es un árbol recursivo de <strong>divisiones</strong> (splits) y
<strong>widgets</strong>:</p>

<pre><code>LayoutDef
 ├── name: string
 └── root: Area
      ├── direction: "horizontal" | "vertical"
      ├── size: constraint (optional, defaults to "*")
      └── areas: [Area, ...]
           ├── Area with "widget" → leaf node (renders a widget)
           └── Area with "direction" → nested split
</code></pre>

<h3 id="size-constraints">Restricciones de tamaño</h3>

<table>
  <thead>
    <tr>
      <th>Sintaxis</th>
      <th>Significado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>"*"</code> u omitida</td>
      <td>Rellenar el espacio restante</td>
    </tr>
    <tr>
      <td><code>3</code> (número)</td>
      <td><em>n</em> filas/columnas fijas</td>
    </tr>
    <tr>
      <td><code>"45%"</code></td>
      <td>Porcentaje del padre</td>
    </tr>
  </tbody>
</table>

<h3 id="available-widgets">Widgets disponibles</h3>

<table>
  <thead>
    <tr>
      <th>Widget</th>
      <th>Descripción</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>header</code></td>
      <td>Barra de información del sistema (uptime, carga, teclas)</td>
    </tr>
    <tr>
      <td><code>cpu</code></td>
      <td>Medidores de uso de CPU por núcleo</td>
    </tr>
    <tr>
      <td><code>memory</code></td>
      <td>Medidores de RAM + Swap + gráfico del histórico de RAM</td>
    </tr>
    <tr>
      <td><code>storage</code></td>
      <td>Medidores de uso de disco por punto de montaje</td>
    </tr>
    <tr>
      <td><code>network</code></td>
      <td>Totales de red RX/TX y velocidades</td>
    </tr>
    <tr>
      <td><code>processes</code></td>
      <td>Tabla de procesos con filtro de búsqueda</td>
    </tr>
    <tr>
      <td><code>disk_io</code></td>
      <td>Velocidades de lectura/escritura de disco</td>
    </tr>
    <tr>
      <td><code>battery</code></td>
      <td>Medidores de carga de la batería</td>
    </tr>
    <tr>
      <td><code>gpu</code></td>
      <td>Medidores de uso de GPU</td>
    </tr>
  </tbody>
</table>

<h3 id="layout-examples">Ejemplos</h3>

<h4>Layout personalizado simple</h4>

<p>Un layout mínimo de tres filas: cabecera, CPU y procesos.</p>

<pre><code>{
    // "monitor" — CPU top-half, processes bottom-half
    "name": "monitor",
    "root": {
        "direction": "vertical",
        "areas": [
            { "widget": "header", "size": 3 },
            { "widget": "cpu", "size": "55%" },
            { "widget": "processes", "size": "*" }
        ]
    }
}</code></pre>

<h4>Layout anidado complejo</h4>

<p>Un dashboard completo con una división horizontal en la sección central:</p>

<pre><code>{
    "name": "my-dashboard",
    "root": {
        "direction": "vertical",
        "areas": [
            { "widget": "header", "size": 3 },
            {
                "direction": "horizontal",
                "size": "50%",
                "areas": [
                    { "widget": "cpu", "size": "60%" },
                    {
                        "direction": "vertical",
                        "size": "40%",
                        "areas": [
                            { "widget": "network", "size": "50%" },
                            { "widget": "disk_io", "size": "50%" }
                        ]
                    }
                ]
            },
            { "widget": "processes", "size": "*" }
        ]
    }
}</code></pre>

<h3 id="starter-layouts">Layouts iniciales</h3>

<p>Los 10 layouts integrados se distribuyen en el crate <code>xtop-layout</code>
(<code>github.com/xtop-cli/layouts</code>, carpeta <code>layouts/default/</code>) y quedan incrustados en el
binario. Al arrancar, sus fuentes JSONC se copian al directorio de layouts de
la plataforma (ver <a href="#layout-location">Ubicación</a>) como plantillas editables. Los layouts de la comunidad
viven en <code>layouts/custom/</code> del mismo repo;
instala uno con <code>xtop layout install &lt;name&gt;</code> (o copia el fichero al
directorio de layouts de tu plataforma). Valida un fichero local con <code>xtop layout check &lt;file&gt;</code>.</p>

<p>Un fichero de layout cuyo <code>name</code> coincida con un layout integrado <strong>lo anula</strong> (p. ej.
edita <code>dashboard.jsonc</code> para personalizar el Dashboard). Los ficheros con nombres nuevos
aparecen como layouts extra.</p>

<p><strong>Layouts de modo:</strong> <code>dashboard</code>, <code>vertical</code>, <code>horizontal</code>, <code>cpu_focus</code>, <code>memory_focus</code>, <code>network_focus</code>, <code>process_focus</code> — estos siete se corresponden con los modos de layout.</p>

<p><strong>Extras de preset:</strong> <code>detail_dashboard</code>, <code>detail_network</code>, <code>detail_processes</code> — layouts centrados en el detalle añadidos después de los modos (no son modos en sí; se seleccionan por nombre). Ejercitan las opciones de visualización por widget (base de CPU en <code>processes</code>, <code>cores</code>/<code>show_freq</code> en <code>cpu</code>, <code>ifaces</code> en <code>network</code>); consulta la sección de opciones por widget más abajo.</p>

<h3 id="cycling-order">Orden de ciclo</h3>

<ol>
  <li>Layouts de modo (Dashboard → Vertical → Horizontal → CPU Focus → Memory Focus → Network Focus → Process Focus)</li>
  <li>Extras de preset (<code>Detail Dashboard</code> → <code>Detail Network</code> → <code>Detail Processes</code>)</li>
  <li>Cualquier layout personalizado del directorio de layouts de la plataforma con un nombre nuevo (orden del sistema de ficheros)</li>
  <li>Los ficheros personalizados que reutilizan un <code>name</code> integrado lo anulan en su sitio (sin duplicados)</li>
  <li>Vuelve al Dashboard</li>
</ol>

<p>Pulsa <kbd>l</kbd> para avanzar por todos los layouts disponibles.</p>

<h3 id="layout-notes">Notas</h3>

<ul>
  <li>Si un nombre de widget de tu layout no coincide con ningún widget disponible, esa área se omite y xtop imprime una advertencia única en stderr (<code>xtop: layout '&lt;layout&gt;' references unknown widget '&lt;name&gt;'</code>).</li>
  <li>Las divisiones anidadas pueden ser arbitrariamente profundas, pero el anidamiento muy profundo puede desbordar terminales pequeñas.</li>
  <li>La terminal debe tener al menos 40×8 para que cualquier layout se renderice; las terminales más pequeñas muestran una advertencia.</li>
  <li>Las terminales muy pequeñas (menos de 60×14) caen a un layout mínimo fijo en el código (medidores de CPU + Memoria + lista de procesos).</li>
</ul>

<h3 id="glyph-style">Estilo de glifos de los widgets</h3>

<p>Los gráficos (CPU/Memoria/Red) y los bordes de los widgets se dibujan con
estilos de glifos que puedes cambiar en <code>config.json</code> bajo la clave
<code>style</code> (ver <a href="configuration.md">configuration.md</a>):</p>

<pre><code>{
  "theme": "x",
  "style": {
    "charset": "block",
    "borders": "ascii",
    "widgets": {
      "cpu": { "charset": "bar" },
      "network": { "borders": "double" }
    }
  }
}</code></pre>

<ul>
  <li><code>charset</code>: <code>braille</code> (por defecto), <code>dot</code>, <code>block</code>, <code>half_block</code>, <code>bar</code>.</li>
  <li><code>borders</code>: <code>native</code> (por defecto; el marco clásico de una línea con box-drawing), <code>rounded</code>, <code>double</code>, <code>plain</code> y <code>ascii</code> (tanto plain como ascii dibujan un marco ASCII puro <code>+-|</code>).</li>
  <li><code>widgets</code>: anulaciones por widget. Las claves son los nombres de
      widget que usan los layouts: <code>header</code>, <code>cpu</code>, <code>memory</code>, <code>storage</code>,
      <code>network</code>, <code>processes</code>, <code>disk_io</code>, <code>battery</code>, <code>gpu</code>.
      Cada entrada acepta <code>charset</code>, <code>borders</code> y un <code>pack</code>
      opcional (pack de widgets con el que renderizar ese nombre, p. ej. <code>"blocks"</code>).
      Un <code>style.pack</code> global fija el pack de cada widget sin
      anulación por widget.</li>
</ul>

<p>Los estilos de glifos solo cambian la apariencia: los datos detrás de cada
widget los dibujan los packs de widgets (ver <a href="plugin.md">plugin.md</a>
para saber cómo un plugin añade renderers completamente nuevos, que tienen
prioridad sobre los packs).</p>

<h3 id="per-widget-display-options">Opciones de visualización por widget</h3>

<p>Más allá del estilo de glifos, cada <em>instancia</em> de widget en un fichero
de layout puede llevar un objeto JSON <code>options</code> que refina cómo dibuja
esa instancia sus datos. El formato de layout lo acepta en los nodos de widget
como paso opaco (ver el repo de layouts, <code>docs/layout-schema.md</code>,
sección "Widget <code>options</code>"):</p>

<pre><code>{
  "name": "My Layout",
  "root": {
    "direction": "vertical",
    "areas": [
      { "widget": "header", "size": 3 },
      { "widget": "cpu", "size": "60%", "options": { "cores": "all" } },
      { "widget": "processes", "size": "*" }
    ]
  }
}</code></pre>

<ul>
  <li>El kernel reenvía el objeto <code>options</code> de cada nodo al
      renderer del widget mientras esa instancia se dibuja (vía
      <code>WidgetState::widget_options</code> en el contrato de widget-api).
      Varias instancias del mismo widget en un layout pueden llevar
      opciones distintas.</li>
  <li>Sin clave <code>options</code> (o con <code>null</code>) el widget se
      renderiza exactamente igual que antes de esta funcionalidad: los valores
      por defecto conservan el comportamiento actual byte a byte. Solo las
      claves documentadas refinan un widget; las claves desconocidas se
      ignoran.</li>
  <li>Las claves reconocidas se documentan por widget en el repo de widgets
      (<code>docs/widgets.md</code>) según llegan los hitos de UX. Los
      presets Detail incluidos muestran la primera oleada: la
      base de CPU de <code>processes</code>
      (<code>cpu</code>: <code>"total"</code>/<code>"both"</code>),
      las claves de núcleo/frecuencia de <code>cpu</code>
      (<code>cores</code>, <code>show_freq</code>) y la
      lista de interfaces de <code>network</code> (<code>ifaces</code>). Hasta
      que un widget documente una clave, esa clave es inerte (valores por
      defecto DR-UX2).</li>
  <li>Las vistas de pantalla completa y mínima buscan las opciones por nombre de
      widget en el layout actual (primer nodo que coincide); cuando el layout no
      tiene ese nodo usan los valores por defecto.</li>
  <li>Los renderers de widgets de plugins ven el <code>HostState</code> del
      plugin, no <code>WidgetState</code>: las <code>options</code> del layout no
      se reenvían a los plugins.</li>
</ul>

<hr>

<h2 id="widget-packs">Packs de widgets</h2>

<p>Los packs de widgets son la unidad instalable de código de widgets: cada pack
es un crate separado (<code>xtop-widget-&lt;name&gt;</code>) que registra
renderers por nombre de widget contra el contrato <code>xtop-widget-api</code>.
El kernel incluye dos packs de serie: el pack base
(<code>default</code>, siempre compilado) y el pack <code>blocks</code>
(detrás de la feature Cargo <code>widget-blocks</code>) — y los lista
en un único catálogo en tiempo de compilación
(<code>src/ui/layout/pack_table.rs</code>, una fila
<code>(feature, label)</code> por pack), que comparten el motor de render y
<code>xtop widget list</code>.</p>

<p>La gestión de packs de widgets replica el flujo de trabajo de los plugins:</p>

<table>
  <thead>
    <tr><th>Comando</th><th>Descripción</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>xtop widget list</code></td>
      <td>Enumera los packs de widgets cableados en el kernel (filas de la tabla de packs cuya feature Cargo está declarada en el <code>Cargo.toml</code> raíz)</td>
    </tr>
    <tr>
      <td><code>xtop widget scaffold &lt;name&gt;</code></td>
      <td>Crea una plantilla compilable de pack de un solo widget en <code>widgets-dev/xtop-widget-&lt;name&gt;/</code> (ignorada por git)</td>
    </tr>
    <tr>
      <td><code>xtop widget install &lt;name&gt;</code></td>
      <td>Instala un pack por nombre desde <code>github.com/xtop-cli/widgets</code></td>
    </tr>
    <tr>
      <td><code>xtop widget install &lt;url|path&gt;</code></td>
      <td>Instala un pack desde cualquier URL git o un directorio local de crate</td>
    </tr>
  </tbody>
</table>

<p><code>xtop widget install</code> es un flujo de trabajo que automodifica el
fuente (en el mismo espíritu que <code>xtop plugin install</code>): añade una
dependencia opcional + una feature flag <code>widget-&lt;name&gt;</code> al
<code>Cargo.toml</code> raíz, añade una fila <code>(feature, label)</code> y su
brazo de vinculación al registro en el catálogo de packs de
<code>src/ui/layout/pack_table.rs</code>, y ejecuta <code>cargo check</code>.
El pack <strong>no se habilita por defecto</strong>: añade
<code>widget-&lt;name&gt;</code> a la lista por defecto de <code>[features]</code>
(o compila con <code>--features widget-&lt;name&gt;</code>) y recompila.
Una vez habilitado, selecciona el pack por widget con <code>style.pack</code> (todos
los widgets) o <code>style.widgets.&lt;name&gt;.pack</code> (un widget), y
coloca sus nombres de widget en un fichero de layout. La guía de autoría (el
contrato del pack, cómo registran los packs sus renderers, las opciones de los
renderers) vive en la documentación del repo de widgets
(<code>docs/authoring.md</code>, <code>docs/widgets.md</code>).</p>

<hr>

<h2 id="runtime-widgets">Widgets en tiempo de ejecución (WASM / procesos externos)</h2>

<p>Además de los packs compilados, xtop puede alojar <strong>widgets en tiempo
de ejecución</strong>: código que no está compilado en el kernel y que se carga
desde el directorio de configuración del usuario al arrancar. Existen dos hosts
opcionales, ambos desactivados por defecto:</p>

<table>
  <thead>
    <tr><th>Feature</th><th>Origen</th><th>Directorio</th><th>Aislamiento</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>plugin-wasm</code></td>
      <td>módulos <code>.wasm</code> cargados con wasmi</td>
      <td><code>wasm/</code> (anular con <code>XTOP_WASM_DIR</code>)</td>
      <td>Sandbox en proceso: presupuesto de fuel por llamada, tope de memoria de 64&nbsp;MiB, sin más imports del host que <code>host.log</code></td>
    </tr>
    <tr>
      <td><code>plugin-external</code></td>
      <td>un proceso auxiliar por widget (Lua, Python, Node, cualquier lenguaje)</td>
      <td><code>external/</code> (anular con <code>XTOP_EXTERNAL_DIR</code>)</td>
      <td>La propia frontera de proceso (permisos del usuario); cada respuesta está acotada por <code>timeout_ms</code></td>
    </tr>
  </tbody>
</table>

<p>Compila con los hosts habilitados:</p>

<pre><code>cargo build --release --features plugin-wasm,plugin-external</code></pre>

<p>Los widgets en tiempo de ejecución se registran por la ruta de widgets de
plugins, así que mantienen precedencia sobre cualquier pack y pueden reemplazar
cualquier nombre de widget. Los layouts los referencian por el <code>name</code>
del manifest del guest (por ejemplo <code>wasm-clock</code>). Un guest se llama
una vez por tick y su lista de dibujo (draw list) se cachea y se reproduce en
tiempo de render, de modo que un guest lento nunca puede bloquear un frame; los
módulos WASM se recargan en caliente cuando cambia su fichero y los procesos
auxiliares conservan su último frame bueno cuando expiran o fallan.</p>

<p>Se incluyen ejemplos funcionales en el repo plugins: guests WASM de Rust en
<code>examples/wasm/</code> (reloj, medidor de CPU + sparkline, tabla de
procesos) y widgets auxiliares en Lua/Python/Node en
<code>examples/external/</code>. Los contratos completos — ABI del guest,
operaciones de la lista de dibujo, campos del snapshot de estado y el formato de
descriptor externo — viven en <code>docs/wasm-widgets.md</code> y
<code>docs/external-widgets.md</code> de ese repo. El workspace incluye una demo
autocontenida que compila e instala todo en <code>temp/xtop-demo/</code> y lanza
xtop contra ella: <code>./temp/xtop-demo/run-demo.sh</code>.</p>

<hr>

<p align="center">
  <a href="../README.md">← Volver al README</a>
</p>
