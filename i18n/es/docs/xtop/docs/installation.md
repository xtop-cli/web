<h1>Guía de instalación</h1>

<hr>

<h2 id="table-of-contents">Índice</h2>

<ul>
  <li><a href="#quick-install-linux">Instalación rápida (Linux)</a></li>
  <li><a href="#quick-install-windows">Instalación rápida (Windows)</a></li>
  <li><a href="#macos">macOS</a></li>
  <li><a href="#installer-options">Opciones del instalador</a></li>
  <li><a href="#build-from-source">Compilar desde el código fuente</a></li>
  <li><a href="#uninstall">Desinstalación</a></li>
  <li><a href="#supported-distributions">Distribuciones compatibles</a></li>
</ul>

<hr>

<h2 id="quick-install-linux">Instalación rápida (Linux)</h2>

<p>El script de instalación detecta la distribución y su gestor de paquetes,
instala los prerrequisitos de compilación (git y, si falta, el toolchain de Rust
vía rustup), clona el repositorio, lo compila en modo release e instala el
binario en <code>/usr/local/bin</code>.</p>

<h3>Con curl</h3>

<pre><code>curl -fsSL https://raw.githubusercontent.com/xtop-cli/xtop/main/install.sh | bash</code></pre>

<h3>Con wget</h3>

<pre><code>wget -qO- https://raw.githubusercontent.com/xtop-cli/xtop/main/install.sh | bash</code></pre>

<hr>

<h2 id="quick-install-windows">Instalación rápida (Windows)</h2>

<p>Requiere <a href="https://rustup.rs/">Rust (Cargo)</a> instalado. Ejecuta en PowerShell:</p>

<pre><code>irm https://raw.githubusercontent.com/xtop-cli/xtop/main/install.ps1 | iex</code></pre>

<hr>

<h2 id="macos">macOS</h2>

<p><code>install.sh</code> está pensado para los gestores de paquetes de Linux y no tiene
rama para macOS. Instala con cargo (necesita el toolchain de Rust de rustup):</p>

<pre><code>cargo install --git https://github.com/xtop-cli/xtop --all-features</code></pre>

<p>El binario acaba en <code>~/.cargo/bin</code>; asegúrate de que esté en tu PATH.
<code>--all-features</code> habilita el plugin Samurai, la extensión MCP, el pack de
widgets blocks, el módulo de efectos y los dos hosts de widgets en tiempo de
ejecución (WASM en sandbox y procesos externos).</p>

<hr>

<h2 id="installer-options">Opciones del instalador</h2>

<p>Puedes ejecutar el script de instalación con banderas adicionales para tener
más control:</p>

<pre><code># Check dependencies without installing
./install.sh --check-deps

# Install only dependencies (Rust, build tools)
./install.sh --install-deps

# Install with the runtime widget hosts enabled (sandboxed .wasm widgets
# and helper processes in any language)
./install.sh --with-runtime-widgets

# Show help
./install.sh --help</code></pre>

<p>En Windows el mismo opt-in es un switch del instalador:</p>

<pre><code>.\install.ps1 -RuntimeWidgets</code></pre>

<h3>Distribuciones compatibles</h3>

<ul>
  <li>Arch Linux y derivados</li>
  <li>Debian / Ubuntu y derivados</li>
  <li>Fedora / RHEL y derivados</li>
  <li>openSUSE y derivados</li>
  <li>Alpine Linux y derivados</li>
</ul>

<hr>

<h2 id="build-from-source">Compilar desde el código fuente</h2>

<ol>
  <li>
    <p>Clona el repositorio:</p>
    <pre><code>git clone https://github.com/xtop-cli/xtop.git
cd xtop</code></pre>
  </li>
  <li>
    <p>Compila y ejecuta con optimizaciones de release:</p>
    <pre><code>cargo run --release</code></pre>
  </li>
</ol>

<hr>

<h2 id="uninstall">Desinstalación</h2>

<p>Los desinstaladores eliminan solo el binario; la configuración de usuario bajo
el directorio de configuración se conserva.</p>

<h3>Linux</h3>

<pre><code>curl -fsSL https://raw.githubusercontent.com/xtop-cli/xtop/main/install.sh | bash -s -- --uninstall</code></pre>

<h3>Windows</h3>

<pre><code>irm https://raw.githubusercontent.com/xtop-cli/xtop/main/uninstall.ps1 | iex</code></pre>

<hr>

<p align="center">
  <a href="../README.md">Volver al README</a>
</p>
