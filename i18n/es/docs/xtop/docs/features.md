<h1>Características</h1>

<p>Desglose detallado de las capacidades de monitorización e interfaz de xtop.</p>

<hr>

<h2 id="system-monitoring">Monitorización del sistema</h2>

<h3 id="cpu">CPU</h3>

<ul>
  <li>Porcentaje de uso por núcleo y por hilo, mostrado como medidores horizontales.</li>
  <li>Lectura de la temperatura máxima de la CPU cuando hay sensores de hardware disponibles.</li>
  <li>Barras codificadas por color que indican visualmente los niveles de carga.</li>
</ul>

<h3 id="memory">Memoria</h3>

<ul>
  <li>Medidor de uso de RAM que muestra la usada, la total y el porcentaje.</li>
  <li>Medidor de uso de Swap.</li>
  <li>Gráfico de líneas histórico que sigue el uso de RAM a lo largo del tiempo.</li>
  <li>Número de puntos de datos históricos configurable.</li>
</ul>

<h3 id="network">Red</h3>

<ul>
  <li>Seguimiento en tiempo real de la subida (TX) y la descarga (RX) por interfaz de red.</li>
  <li>Datos totales transferidos mostrados junto a las velocidades de transferencia actuales.</li>
</ul>

<h3 id="storage">Almacenamiento</h3>

<ul>
  <li>Medidores de uso de disco por punto de montaje que muestran el espacio usado, el disponible y el total.</li>
  <li>Barras de porcentaje visuales para cada sistema de ficheros montado.</li>
</ul>

<h3 id="disk-io">E/S de disco</h3>

<ul>
  <li>Seguimiento de la velocidad de lectura y escritura por dispositivo de disco.</li>
  <li>Mostrado en bytes por segundo con escalado automático de unidades.</li>
</ul>

<h3 id="processes">Procesos</h3>

<ul>
  <li>Lista desplazable de los procesos en ejecución ordenados por uso de CPU.</li>
  <li>Búsqueda en vivo que filtra por nombre de proceso.</li>
  <li>Muestra el nombre del proceso, el uso de CPU y el uso de memoria.</li>
</ul>

<h3 id="gpu">GPU</h3>

<ul>
  <li>Medidores de uso de GPU: datos reales en Linux (NVIDIA mediante <code>nvidia-smi</code>, AMD/Intel mediante <code>/sys/class/drm</code>); NVIDIA también se detecta mediante <code>nvidia-smi</code> en macOS y Windows. Las GPU AMD/Intel y las GPU de Apple no exponen una API pública de utilización, así que el widget permanece vacío para ellas (sin lecturas inventadas).</li>
</ul>

<h3 id="battery">Batería</h3>

<ul>
  <li>Medidores de nivel de carga de la batería: datos reales en Linux (<code>/sys/class/power_supply</code>), macOS (<code>pmset</code>) y Windows (<code>GetSystemPowerStatus</code>, batería agregada). Los equipos sin batería muestran el estado vacío honesto.</li>
</ul>

<hr>

<h2 id="theming">Temas</h2>

<ul>
  <li>12 esquemas de color: 12 ficheros de tema JSONC se distribuyen en <code>assets/themes/</code> y quedan incrustados en el binario como plantillas de siembra del primer arranque.</li>
  <li>Temas personalizados definidos como ficheros JSONC con un par explícito de fondo/primer plano y una paleta de 16 colores hexadecimales (los ficheros heredados de solo 16 ranuras siguen cargando).</li>
  <li>Temas siempre legibles: cada tema se normaliza en contraste al cargarse (mínimos WCAG para los roles de texto y marcas, UX8.2); los ficheros distribuidos se mantienen canónicos.</li>
  <li>Cambio instantáneo de tema con <kbd>t</kbd> (siguiente) y <kbd>T</kbd> (anterior).</li>
  <li>Referencia de paletas en <a href="colors.md">colors.md</a>.</li>
</ul>

<hr>

<h2 id="layouts">Layouts</h2>

<ul>
  <li>7 modos de layout integrados: Dashboard, Vertical, Horizontal, CPU Focus, Memory Focus, Network Focus y Process Focus, más 3 layouts de preset Detail (<code>Detail Dashboard</code>, <code>Detail Network</code>, <code>Detail Processes</code>) que se suceden después de los modos y muestran las opciones de visualización por widget.</li>
  <li>Layouts personalizados definidos como ficheros JSONC con un árbol recursivo de divisiones/widgets; cada instancia de widget puede llevar un objeto <code>options</code> (base de CPU, núcleos, interfaces, ...) controlado desde el fichero de layout.</li>
  <li>Modo de pantalla completa para cualquier widget, activado con <kbd>f</kbd>.</li>
  <li>Diseño adaptativo que se ajusta automáticamente al ancho y al alto de la terminal.</li>
  <li>Layout mínimo de respaldo para terminales muy pequeñas.</li>
</ul>

<hr>

<h2 id="alert-thresholds">Umbrales de alerta</h2>

<ul>
  <li>Avisos visuales cuando el uso de CPU, memoria o disco supera los límites configurables.</li>
  <li>Cambios de color a rojo e indicadores de advertencia en los títulos de los widgets.</li>
</ul>

<hr>

<h2 id="persistence">Persistencia</h2>

<ul>
  <li>El tema, el layout, el intervalo de actualización, los puntos de histórico, los umbrales de alerta y el estilo de glifos actuales se guardan automáticamente al salir.</li>
  <li>La configuración se almacena como <code>config.json</code> en el directorio de configuración de la plataforma: <code>~/.config/xtop/</code> en Linux, <code>~/Library/Application Support/xtop/</code> en macOS, <code>%APPDATA%\xtop</code> en Windows.</li>
</ul>

<hr>

<h2 id="extensibility">Extensibilidad</h2>

<ul>
  <li>Los plugins, los packs de widgets, las extensiones y los efectos se integran en tiempo de compilación (features de Cargo + dependencias git); una compilación normal no necesita ninguno.</li>
  <li>Los widgets en tiempo de ejecución (features opcionales <code>plugin-wasm</code> y <code>plugin-external</code>) cargan widgets que no están compilados en el kernel: módulos <code>.wasm</code> en sandbox (wasmi, límites de fuel y memoria) o un proceso auxiliar por widget en cualquier lenguaje mediante JSON delimitado por líneas. Se registran por la ruta de plugins, mantienen precedencia sobre los packs y se referencian en los layouts por nombre — consulta <a href="customization.md#runtime-widgets">customization.md</a>.</li>
  <li>Las herramientas externas de cambio de tema pueden cambiar el tema activo con <code>xtop --ct &lt;theme&gt;</code>; las instancias en ejecución siguen el cambio persistido dentro de un tick.</li>
</ul>

<hr>

<p align="center">
  <a href="../README.md">Volver al README</a>
</p>
