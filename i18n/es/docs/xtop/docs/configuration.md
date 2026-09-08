<h1>Configuración</h1>

<p>xtop guarda su configuración automáticamente al salir. El fichero es
<code>config.json</code> en el directorio de configuración de la plataforma,
junto a las carpetas <code>themes/</code> y <code>layouts/</code>:</p>

<pre><code>~/.config/xtop/config.json                (Linux)
~/Library/Application Support/xtop/       (macOS)
%APPDATA%\xtop\                           (Windows)
</code></pre>

<p>En Linux puedes cambiar el directorio base con
<code>$XDG_CONFIG_HOME</code>.</p>

<hr>

<h2 id="keys">Claves</h2>

<table>
  <thead>
    <tr>
      <th>Clave</th>
      <th>Tipo</th>
      <th>Valor por defecto</th>
      <th>Descripción</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>theme</code></td>
      <td>string</td>
      <td><code>"x"</code></td>
      <td>Nombre del tema de color seleccionado actualmente (uno de los 12 incluidos o un tema de usuario).</td>
    </tr>
    <tr>
      <td><code>layout_mode</code></td>
      <td>string</td>
      <td><code>"Dashboard"</code></td>
      <td>Modo de layout integrado. Uno de <code>Dashboard</code>, <code>Vertical</code>, <code>Horizontal</code>, <code>CpuFocus</code>, <code>MemoryFocus</code>, <code>NetworkFocus</code>, <code>ProcessFocus</code>. Se ignora mientras <code>layout_name</code> nombre un layout personalizado válido.</td>
    </tr>
    <tr>
      <td><code>layout_name</code></td>
      <td>string</td>
      <td><code>""</code></td>
      <td>Nombre del layout activo cuando es personalizado (no integrado). Cuando no está vacío y se encuentra, tiene prioridad sobre <code>layout_mode</code>.</td>
    </tr>
    <tr>
      <td><code>update_interval_ms</code></td>
      <td>integer</td>
      <td><code>1000</code></td>
      <td>Intervalo de muestreo en milisegundos. Se limita a 100&ndash;3.600.000 al cargar.</td>
    </tr>
    <tr>
      <td><code>history_points</code></td>
      <td>integer</td>
      <td><code>100</code></td>
      <td>Puntos de datos conservados para los gráficos históricos.</td>
    </tr>
    <tr>
      <td><code>alerts</code></td>
      <td>object</td>
      <td>ver abajo</td>
      <td>Umbrales de alerta; consulta <a href="#alert-thresholds">Umbrales de alerta</a>.</td>
    </tr>
    <tr>
      <td><code>keybindings</code></td>
      <td>object</td>
      <td>ver abajo</td>
      <td>Keybindings por acción; consulta <a href="#keybindings">Keybindings</a>.</td>
    </tr>
    <tr>
      <td><code>style</code></td>
      <td>object</td>
      <td>ver abajo</td>
      <td>Estilo de glifos de los widgets (charset de gráficos, bordes, packs); consulta <a href="#style">Estilo</a>.</td>
    </tr>
    <tr>
      <td><code>effect</code></td>
      <td>string (opcional)</td>
      <td>ausente</td>
      <td>Efecto de frame aplicado a cada frame renderizado: <code>"fade"</code> activa el fundido de entrada integrado (solo en compilaciones hechas con la feature <code>effects</code>). Cualquier otro valor desactiva los efectos.</td>
    </tr>
  </tbody>
</table>

<h3 id="example">Ejemplo</h3>

<pre><code>{
  "theme": "miami",
  "layout_mode": "Dashboard",
  "layout_name": "",
  "update_interval_ms": 1000,
  "history_points": 100,
  "alerts": {
    "cpu_high": 90.0,
    "mem_high": 90.0,
    "disk_high": 90.0
  },
  "keybindings": {
    "quit": ["q"],
    "help": ["?"],
    "next_theme": ["t"],
    "prev_theme": ["T"],
    "next_layout": ["l"],
    "toggle_fullscreen": ["f"],
    "cycle_fullscreen": ["F"],
    "search": ["/"],
    "command_palette": ["ctrl+p", "ctrl+P"],
    "cancel": ["escape"],
    "kill_process": ["k"],
    "process_up": ["up"],
    "process_down": ["down"],
    "cycle_sort": ["s"]
  },
  "style": {
    "charset": "braille",
    "borders": "native",
    "pack": null,
    "widgets": {}
  }
}</code></pre>

<p>Las claves desconocidas y las claves opcionales ausentes se ignoran; un
fichero que no se pueda analizar cae a los valores por defecto de arriba.</p>

<hr>

<h2 id="alert-thresholds">Umbrales de alerta</h2>

<p>Cuando una métrica supera su umbral configurado, el widget correspondiente
cambia a color rojo y muestra un indicador de advertencia en su título.</p>

<table>
  <thead>
    <tr>
      <th>Clave</th>
      <th>Descripción</th>
      <th>Valor por defecto</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>cpu_high</code></td>
      <td>Porcentaje de uso de CPU que dispara una advertencia</td>
      <td>90.0</td>
    </tr>
    <tr>
      <td><code>mem_high</code></td>
      <td>Porcentaje de uso de memoria que dispara una advertencia</td>
      <td>90.0</td>
    </tr>
    <tr>
      <td><code>disk_high</code></td>
      <td>Porcentaje de uso de disco que dispara una advertencia</td>
      <td>90.0</td>
    </tr>
  </tbody>
</table>

<hr>

<h2 id="keybindings">Keybindings</h2>

<p>Cada acción acepta una lista de cadenas de tecla; gana la primera coincidencia.
Las teclas se escriben como: caracteres simples (<code>"q"</code>, <code>"/"</code>, <code>"?"</code>),
caracteres en mayúscula (<code>"T"</code>, <code>"F"</code>), teclas con modificador
(<code>"ctrl+p"</code>, <code>"alt+x"</code>) y teclas con nombre
(<code>"escape"</code>, <code>"enter"</code>, <code>"backspace"</code>, <code>"tab"</code>,
<code>"up"</code>, <code>"down"</code>, <code>"left"</code>, <code>"right"</code>,
<code>"delete"</code>, <code>"home"</code>, <code>"end"</code>, <code>"pageup"</code>,
<code>"pagedown"</code>).</p>

<table>
  <thead>
    <tr>
      <th>Clave (acción)</th>
      <th>Vinculación por defecto</th>
      <th>Acción</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>quit</code></td><td><code>["q"]</code></td><td>Guardar la configuración y salir</td></tr>
    <tr><td><code>help</code></td><td><code>["?"]</code></td><td>Alternar la superposición de ayuda</td></tr>
    <tr><td><code>next_theme</code></td><td><code>["t"]</code></td><td>Siguiente tema</td></tr>
    <tr><td><code>prev_theme</code></td><td><code>["T"]</code></td><td>Tema anterior</td></tr>
    <tr><td><code>next_layout</code></td><td><code>["l"]</code></td><td>Siguiente layout</td></tr>
    <tr><td><code>toggle_fullscreen</code></td><td><code>["f"]</code></td><td>Alternar la vista de pantalla completa</td></tr>
    <tr><td><code>cycle_fullscreen</code></td><td><code>["F"]</code></td><td>Recorrer el widget en pantalla completa</td></tr>
    <tr><td><code>search</code></td><td><code>["/"]</code></td><td>Iniciar la búsqueda de procesos</td></tr>
    <tr><td><code>command_palette</code></td><td><code>["ctrl+p", "ctrl+P"]</code></td><td>Abrir la paleta de comandos (ctrl+p también funciona como respaldo fijo en el código)</td></tr>
    <tr><td><code>cancel</code></td><td><code>["escape"]</code></td><td>Cancelar la búsqueda / cerrar superposiciones</td></tr>
    <tr><td><code>kill_process</code></td><td><code>["k"]</code></td><td>Terminar el proceso seleccionado (comprobación de seguridad de mismo usuario)</td></tr>
    <tr><td><code>process_up</code></td><td><code>["up"]</code></td><td>Mover la selección de procesos hacia arriba</td></tr>
    <tr><td><code>process_down</code></td><td><code>["down"]</code></td><td>Mover la selección de procesos hacia abajo</td></tr>
    <tr><td><code>cycle_sort</code></td><td><code>["s"]</code></td><td>Recorrer la columna de ordenación de procesos (CPU% → Memory → PID → Name)</td></tr>
  </tbody>
</table>

<hr>

<h2 id="style">Estilo</h2>

<p>El objeto <code>style</code> controla los glifos de los widgets. Los valores son
los enums comunes del ecosistema de <code>xtop-widget-api</code>:</p>

<ul>
  <li><code>charset</code>: <code>braille</code> (por defecto), <code>dot</code>, <code>block</code>, <code>half_block</code>, <code>bar</code> &mdash; marcadores de gráfico usados por los gráficos históricos.</li>
  <li><code>borders</code>: <code>native</code> (por defecto, marco clásico de una línea), <code>rounded</code>, <code>double</code>, <code>plain</code>, <code>ascii</code> (<code>plain</code>/<code>ascii</code> dibujan un marco ASCII puro <code>+-|</code>).</li>
  <li><code>pack</code>: pack de widgets usado para cada widget sin anulación por widget (<code>"default"</code> o <code>"blocks"</code> cuando se compila con la feature <code>widget-blocks</code>).</li>
  <li><code>widgets</code>: mapa de anulaciones por nombre de widget, cada una acepta <code>charset</code>, <code>borders</code> y <code>pack</code>.</li>
</ul>

<p>Consulta <a href="customization.md#glyph-style">customization.md</a> para un
ejemplo y la semántica completa por widget.</p>

<hr>

<h2 id="custom-themes-and-layouts">Temas y layouts personalizados</h2>

<p>Para temas y layouts personalizados, consulta la <a href="customization.md">guía de personalización</a>.</p>

<hr>

<p align="center">
  <a href="../README.md">Volver al README</a>
</p>
