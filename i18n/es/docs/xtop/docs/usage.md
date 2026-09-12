<h1>Uso</h1>

<hr>

<h2 id="table-of-contents">Índice</h2>

<ul>
  <li><a href="#keybindings">Keybindings</a></li>
  <li><a href="#modules">Módulos</a></li>
  <li><a href="#help-overlay">Superposición de ayuda</a></li>
  <li><a href="#command-palette">Paleta de comandos</a></li>
  <li><a href="#full-screen-mode">Modo de pantalla completa</a></li>
  <li><a href="#responsive-layouts">Layouts adaptativos</a></li>
  <li><a href="#command-line-commands">Comandos de terminal</a></li>
</ul>

<hr>

<h2 id="keybindings">Keybindings</h2>

<table>
  <thead>
    <tr>
      <th>Tecla</th>
      <th>Acción</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><kbd>q</kbd></td>
      <td>Salir de la aplicación (guarda la configuración)</td>
    </tr>
    <tr>
      <td><kbd>?</kbd></td>
      <td>Alternar la superposición de ayuda</td>
    </tr>
    <tr>
      <td><kbd>t</kbd></td>
      <td>Siguiente tema de color</td>
    </tr>
    <tr>
      <td><kbd>T</kbd></td>
      <td>Tema de color anterior</td>
    </tr>
    <tr>
      <td><kbd>l</kbd></td>
      <td>Siguiente layout (recorre los modos de layout, los presets Detail y después los layouts personalizados)</td>
    </tr>
    <tr>
      <td><kbd>f</kbd></td>
      <td>Alternar el modo de pantalla completa del widget actual</td>
    </tr>
    <tr>
      <td><kbd>F</kbd></td>
      <td>Recorrer el foco de pantalla completa por todos los widgets disponibles</td>
    </tr>
    <tr>
      <td><kbd>/</kbd></td>
      <td>Abrir la búsqueda / el filtro de procesos</td>
    </tr>
    <tr>
      <td><kbd>Enter</kbd></td>
      <td>Confirmar el filtro de búsqueda</td>
    </tr>
    <tr>
      <td><kbd>Backspace</kbd></td>
      <td>Borrar un carácter en el campo de búsqueda</td>
    </tr>
    <tr>
      <td><kbd>Esc</kbd></td>
      <td>Cancelar la búsqueda / cerrar la superposición de ayuda</td>
    </tr>
  </tbody>
</table>

<hr>

<h2 id="modules">Módulos</h2>

<ol>
  <li>
    <p><strong>Header</strong> -- Muestra el tiempo de actividad del sistema, la carga media, el nombre del tema actual y el modo de layout activo.</p>
  </li>
  <li>
    <p><strong>CPU</strong> -- Barras de uso horizontales para cada núcleo de la CPU. Si hay sensores de hardware disponibles, muestra la temperatura máxima de la CPU.</p>
  </li>
  <li>
    <p><strong>Memory</strong> -- Medidores de uso de RAM y Swap, más un gráfico de líneas que muestra el uso de RAM a lo largo de una ventana de histórico configurable.</p>
  </li>
  <li>
    <p><strong>Storage</strong> -- Medidores de uso de disco por punto de montaje que muestran la capacidad y el espacio usado.</p>
  </li>
  <li>
    <p><strong>Network</strong> -- Datos totales descargados (RX) y subidos (TX) por interfaz, con las tasas de transferencia actuales.</p>
  </li>
  <li>
    <p><strong>Disk I/O</strong> -- Velocidades de lectura y escritura por dispositivo de disco en bytes por segundo.</p>
  </li>
  <li>
    <p><strong>Processes</strong> -- Lista desplazable de procesos ordenados por uso de CPU (los 200 primeros por defecto; se puede cambiar con <code>XTOP_MAX_PROCESSES</code>), con búsqueda en vivo que filtra por nombre de proceso.</p>
  </li>
  <li>
    <p><strong>GPU</strong> -- Medidores de uso de GPU (disponible en hardware compatible).</p>
  </li>
  <li>
    <p><strong>Battery</strong> -- Medidores de nivel de carga de la batería (disponible en hardware compatible).</p>
  </li>
</ol>

<hr>

<h2 id="help-overlay">Superposición de ayuda</h2>

<p>Pulsa <kbd>?</kbd> en cualquier momento para ver en pantalla la lista completa de
keybindings disponibles. Vuelve a pulsar <kbd>?</kbd> o pulsa <kbd>Esc</kbd> para
cerrar la superposición.</p>

<hr>

<h2 id="process-search">Búsqueda de procesos</h2>

<p>La búsqueda filtra la lista de procesos en tiempo real:</p>

<ul>
  <li>Pulsa <kbd>/</kbd> para abrir la barra de búsqueda en la parte superior de la lista de procesos.</li>
  <li>Escribe cualquier consulta: los resultados se filtran al instante por nombre de proceso.</li>
  <li>Pulsa <kbd>Enter</kbd> para confirmar el filtro, <kbd>Esc</kbd> para cancelarlo y <kbd>Backspace</kbd> para borrar caracteres.</li>
  <li>Una superposición centrada con un indicador <code>/query_</code> muestra la entrada de búsqueda actual.</li>
</ul>

<hr>

<h2 id="command-palette">Paleta de comandos</h2>

<p>Pulsa <kbd>ctrl+p</kbd> para abrir la paleta de comandos, una lista de acciones
buscable (también se puede abrir con el keybinding <code>command_palette</code>).
La paleta tiene tres páginas: <strong>Main</strong> (ir a temas/layouts, alternar
o recorrer la pantalla completa, buscar, ayuda, recorrer la ordenación de los
procesos, tema aleatorio, salir), <strong>Themes</strong> (saltar a cualquier
tema cargado) y <strong>Layouts</strong> (saltar a cualquier layout). Escribe
para filtrar, usa <kbd>up</kbd>/<kbd>down</kbd> para moverte, <kbd>Enter</kbd>
para ejecutar la acción seleccionada y <kbd>Esc</kbd> para cerrar.</p>

<hr>

<h2 id="full-screen-mode">Modo de pantalla completa</h2>

<ul>
  <li>Pulsa <kbd>f</kbd> para alternar el modo de pantalla completa del widget con foco actual. El widget se expande hasta ocupar toda el área de la terminal (menos la barra de cabecera).</li>
  <li>Pulsa <kbd>F</kbd> para recorrer el foco de pantalla completa por los widgets en secuencia: CPU, Memory, Storage, Network, Processes, Disk I/O, GPU, Battery, y después salir.</li>
</ul>

<hr>

<h2 id="responsive-layouts">Layouts adaptativos</h2>

<p>La interfaz se adapta automáticamente al tamaño de la terminal:</p>

<table>
  <thead>
    <tr>
      <th>Tamaño de la terminal</th>
      <th>Comportamiento</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Modo Dashboard, 100+ columnas y 28+ filas</td>
      <td>Layout de dashboard completo con 2 columnas</td>
    </tr>
    <tr>
      <td>Modo Dashboard, 80&ndash;99 columnas o menos de 28 filas</td>
      <td>Layout compacto</td>
    </tr>
    <tr>
      <td>Modo Dashboard, con menos de 80 columnas</td>
      <td>Layout apilado en vertical</td>
    </tr>
    <tr>
      <td>Otros modos</td>
      <td>El layout del modo solicitado (Vertical, Horizontal, CPU/Memory/Network/Process Focus)</td>
    </tr>
    <tr>
      <td>Menos de 60 columnas o menos de 14 filas</td>
      <td>Layout mínimo: solo CPU, Memoria y Procesos</td>
    </tr>
    <tr>
      <td>Menos de 40 x 8</td>
      <td>Se muestra un mensaje de advertencia (terminal demasiado pequeña)</td>
    </tr>
  </tbody>
</table>

<hr>

<h2 id="command-line-commands">Comandos de terminal</h2>

<p>Además de la TUI, <code>xtop</code> incluye subcomandos de gestión (ejecuta
<code>xtop --help</code> para ver la misma lista):</p>

<table>
  <thead>
    <tr><th>Comando</th><th>Descripción</th></tr>
  </thead>
  <tbody>
    <tr><td><code>xtop mcp</code></td><td>Inicia el servidor MCP (transporte stdio) para agentes de IA</td></tr>
    <tr><td><code>xtop --ct &lt;theme&gt;</code></td><td>Cambia el tema activo (se persiste; las instancias en ejecución lo siguen en un tick)</td></tr>
    <tr><td><code>xtop plugin list</code></td><td>Enumera los plugins cableados en el <code>Cargo.toml</code> del kernel</td></tr>
    <tr><td><code>xtop plugin install &lt;name|url&gt;</code></td><td>Instala un plugin (automodifica el manifest del kernel)</td></tr>
    <tr><td><code>xtop plugin scaffold &lt;name&gt;</code></td><td>Crea una plantilla de crate de plugin en <code>plugins-dev/</code></td></tr>
    <tr><td><code>xtop widget list</code></td><td>Enumera los packs de widgets cableados en el kernel (features de Cargo + tabla de packs)</td></tr>
    <tr><td><code>xtop widget install &lt;name|url|path&gt;</code></td><td>Instala un pack de widgets (automodifica el manifest + la tabla de packs)</td></tr>
    <tr><td><code>xtop widget scaffold &lt;name&gt;</code></td><td>Crea una plantilla de crate de pack de un solo widget en <code>widgets-dev/</code></td></tr>
    <tr><td><code>xtop layout check &lt;file&gt;</code></td><td>Valida un fichero de layout JSONC</td></tr>
    <tr><td><code>xtop layout install &lt;name&gt;</code></td><td>Instala un layout de la comunidad desde <code>github.com/xtop-cli/layouts</code></td></tr>
  </tbody>
</table>

<p>Los plugins y los packs de widgets se integran en tiempo de compilación: los
comandos registran crates y feature flags en los fuentes del kernel; habilita
una feature en la lista por defecto de <code>[features]</code> (o compila con
<code>--features &lt;name&gt;</code>) y recompila para incluirla. Los detalles de
los packs de widgets viven en <a href="customization.md#widget-packs">customization.md
(&ldquo;Widget Packs&rdquo;)</a>, los de los plugins en
<a href="plugin.md">plugin.md</a>. Los widgets también pueden proporcionarse en
tiempo de ejecución, sin recompilar el kernel: compila con
<code>--features plugin-wasm,plugin-external</code> y coloca módulos
<code>.wasm</code> o descriptores de procesos auxiliares en el directorio de
configuración — consulta <a href="customization.md#runtime-widgets">customization.md
(&ldquo;Runtime Widgets&rdquo;)</a>.</p>

<hr>

<p align="center">
  <a href="../README.md">Volver al README</a>
</p>
