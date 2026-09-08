<h1 align="center">Xtop</h1>

<div align="center">

![Rust](https://img.shields.io/badge/Rust-1.87%2B-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-lightgrey)
![ratatui](https://img.shields.io/badge/built%20with-ratatui-red)

Monitor de sistema TUI multiplataforma escrito en Rust. Usa ratatui para la interfaz de terminal y sysinfo para obtener métricas del sistema en tiempo real.

</div>

<p align="center"><img src="https://raw.githubusercontent.com/xscriptor/xassets/main/xrepos/apps/xtop/logo.svg" width="60" alt="XTop logo" /></p>

<hr>

<h2>Contenidos</h2>

<ul>
  <li><a href="#features">Características</a></li>
  <li><a href="#previews">Capturas</a></li>
  <li><a href="#quick-install">Instalación rápida</a></li>
  <li><a href="#quick-start">Inicio rápido</a></li>
  <li><a href="#documentation">Documentación</a></li>
  <li><a href="#contributing">Contribución</a></li>
  <li><a href="#license">Licencia</a></li>
  <li><a href="#x">X</a></li>
</ul>

<hr>

<h2 id="features">Características</h2>

<ul>
  <li>Uso de CPU por núcleo con detección de temperatura</li>
  <li>Monitorización de RAM y Swap con gráfico histórico</li>
  <li>Seguimiento de red RX/TX por interfaz</li>
  <li>Visualización de almacenamiento y E/S de disco</li>
  <li>Lista de procesos con búsqueda en vivo y ordenación por CPU/Memoria/PID/Nombre con conmutación de dirección ▲/▼</li>
  <li>Monitorización de la batería (sondas reales en Linux, macOS y Windows)</li>
  <li>Monitorización de la GPU (NVIDIA mediante <code>nvidia-smi</code> en cualquier plataforma; AMD/Intel mediante sondas sysfs de Linux)</li>
  <li>12 temas de color con soporte de temas personalizados mediante JSONC</li>
  <li>7 modos de layout integrados + 3 layouts de preset Detail, con soporte de layouts personalizados mediante JSONC</li>
  <li>Modo de pantalla completa para cualquier widget</li>
  <li>Umbrales de alerta configurables</li>
  <li>Configuración persistente</li>
</ul>

<p>Consulta <a href="docs/features.md">docs/features.md</a> para un desglose detallado de las funcionalidades.</p>

<hr>

<h2 id="previews">Capturas</h2>

<p align="center">
  <a href="./assets/previews/preview1.png">
    <img src="./assets/previews/preview1.png" alt="Vista previa principal" width="850"/>
  </a>
</p>

<p align="center">
  <a href="./assets/previews">Ver más capturas</a>
</p>

<hr>

<h2 id="quick-install">Instalación rápida</h2>

<h3>Linux</h3>

<pre><code>curl -fsSL https://raw.githubusercontent.com/xtop-cli/xtop/main/install.sh | bash</code></pre>

<h3>Windows (PowerShell)</h3>

<pre><code>irm https://raw.githubusercontent.com/xtop-cli/xtop/main/install.ps1 | iex</code></pre>

<h3>macOS y otras plataformas</h3>

<p><code>install.sh</code> está pensado para los gestores de paquetes de Linux. En macOS (o cualquier
otra plataforma) instala con cargo:</p>

<pre><code>cargo install --git https://github.com/xtop-cli/xtop --all-features</code></pre>

<p>o compila desde el código fuente (ver más abajo).</p>

<h3>Compilar desde el código fuente</h3>

<pre><code>git clone https://github.com/xtop-cli/xtop.git
cd xtop
cargo run --release</code></pre>

<p>Para instrucciones de instalación detalladas, consulta <a href="docs/installation.md">docs/installation.md</a>.</p>

<hr>

<h2 id="quick-start">Inicio rápido</h2>

<p>Ejecuta <code>xtop</code> después de la instalación. Controles principales:</p>

<table>
  <thead>
    <tr><th>Tecla</th><th>Acción</th></tr>
  </thead>
  <tbody>
    <tr><td><kbd>q</kbd></td><td>Salir (guarda la configuración)</td></tr>
    <tr><td><kbd>?</kbd></td><td>Alternar la superposición de ayuda</td></tr>
    <tr><td><kbd>t</kbd> / <kbd>T</kbd></td><td>Siguiente / tema anterior</td></tr>
    <tr><td><kbd>l</kbd></td><td>Siguiente modo de layout</td></tr>
    <tr><td><kbd>f</kbd> / <kbd>F</kbd></td><td>Alternar / recorrer la pantalla completa</td></tr>
    <tr><td><kbd>/</kbd></td><td>Buscar procesos</td></tr>
  </tbody>
</table>

<p>Para todos los detalles de uso, consulta <a href="docs/usage.md">docs/usage.md</a>.</p>

<hr>

<h2 id="documentation">Documentación</h2>

<ul>
  <li><a href="docs/features.md">Características</a> — desglose detallado de las funcionalidades</li>
  <li><a href="docs/installation.md">Instalación</a> — guía completa de instalación y desinstalación</li>
  <li><a href="docs/usage.md">Uso</a> — keybindings, módulos, superposición de ayuda</li>
  <li><a href="docs/configuration.md">Configuración</a> — referencia del fichero de configuración y sus ajustes</li>
  <li><a href="docs/customization.md">Personalización</a> — temas y layouts personalizados</li>
  <li><a href="docs/colors.md">Colores</a> — referencia de paletas de los 12 temas incluidos</li>
  <li><a href="docs/plugin.md">Plugins</a> — arquitectura de plugins y su creación</li>
  <li><a href="docs/multi-repo.md">Arquitectura multi-repo</a> — RFC y estructura del ecosistema</li>
  <li><a href="ROADMAP.md">Roadmap</a></li>
  <li><a href="CHANGELOG.md">Registro de cambios</a></li>
  <li><a id="contributing" href="CONTRIBUTING.md">Contribución</a></li>
  <li><a id="license" href="LICENSE">Licencia</a></li>
</ul>

<hr>

<div id="x" align="center">
<h2>X</h2>

<a href="https://www.xscriptor.io">Dev</a>
 & 
<a href="https://github.com/xscriptor">Perfil de GitHub</a>
 & 
<a href="https://www.xscriptor.com">Xscriptor</a>
