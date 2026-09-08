<h1>Sistema de plugins</h1>

<p>xtop aloja <strong>plugins</strong>: funcionalidad adicional distribuida como crates
separados que implementan el contrato de <code>xtop-plugin-api</code> (un crate del
repo <code>xtop-cli/api</code>). Los plugins se integran en tiempo de compilación: el
kernel los cablea mediante dependencias git de Cargo y feature flags, nunca mediante
descubrimiento en tiempo de ejecución. El plugin integrado es <code>xtop-plugin-samurai</code>
(consulta <a href="multi-repo.md">multi-repo.md</a> para ver la estructura del ecosistema).</p>

<p>Puedes compilar xtop sin ningún plugin ni extensión:</p>

<pre><code>cargo build --release --no-default-features</code></pre>

<p>O con el conjunto por defecto (plugin samurai + extensión MCP):</p>

<pre><code>cargo build --release</code></pre>

<hr>

<h2 id="architecture">Arquitectura</h2>

<p>El sistema de plugins tiene cuatro componentes del kernel:</p>

<table>
  <thead>
    <tr><th>Componente</th><th>Ubicación en el kernel</th><th>Finalidad</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>trait <code>Plugin</code> + tipos del contrato</td>
      <td><code>xtop_plugin_api</code> (crate, externo)</td>
      <td>Interfaz que implementa cada plugin; manifest, capacidades, errores, modelo de datos</td>
    </tr>
    <tr>
      <td><code>PluginManager</code></td>
      <td><code>src/plugins/manager.rs</code></td>
      <td>Registra plugins, ejecuta sus ticks y les despacha eventos</td>
    </tr>
    <tr>
      <td>impl de <code>HostState</code></td>
      <td><code>src/plugins/host.rs</code></td>
      <td>Vista del lado del kernel del estado en vivo que los plugins pueden tocar</td>
    </tr>
    <tr>
      <td><code>CompositeProvider</code></td>
      <td><code>src/providers/composite.rs</code></td>
      <td>Fusiona el provider del kernel con los data providers de los plugins</td>
    </tr>
  </tbody>
</table>

<p>Los plugins nunca dependen del kernel: solo ven el estado a través de
<code>PluginContext</code>, que se construye sobre el trait <code>HostState</code>.
Los widgets de plugins se renderizan sobre <code>&amp;dyn HostState</code> mediante
<code>xtop_plugin_api::PluginWidget</code> (distinto del registro de packs de
widgets en <code>xtop-widget-api</code>, que dibuja sobre
<code>WidgetState</code>).</p>

<hr>

<h2 id="the-plugin-trait">El trait <code>Plugin</code></h2>

<pre><code>pub trait Plugin: Debug + Send {
    fn manifest(&amp;self) -&gt; PluginManifest;
    fn on_enable(&amp;mut self, ctx: &amp;mut PluginContext) -&gt; Result&lt;(), PluginError&gt;;
    fn on_disable(&amp;mut self, ctx: &amp;mut PluginContext) -&gt; Result&lt;(), PluginError&gt;;
    fn on_tick(&amp;mut self, ctx: &amp;mut PluginContext) -&gt; Result&lt;(), PluginError&gt;;
    fn on_key(&amp;mut self, ctx: &amp;mut PluginContext, key: &amp;str) -&gt; Result&lt;bool, PluginError&gt;;
    fn data_provider(&amp;self) -&gt; Option&lt;Box&lt;dyn SystemDataProvider&gt;&gt;;
    fn widget(&amp;self) -&gt; Option&lt;PluginWidget&gt;;
    fn execute(&amp;mut self, ctx: &amp;mut PluginContext, action: &amp;str, params: &amp;str)
        -&gt; Result&lt;String, PluginError&gt;;
}</code></pre>

<p>Todos los métodos excepto <code>manifest()</code> tienen implementaciones por
defecto, así que un plugin mínimo solo declara su manifest.</p>

<table>
  <thead>
    <tr><th>Método</th><th>Por defecto</th><th>Cuándo se invoca</th></tr>
  </thead>
  <tbody>
    <tr><td><code>manifest()</code></td><td>obligatorio</td><td>Siempre que se necesiten metadatos</td></tr>
    <tr><td><code>on_enable()</code></td><td>sin operación</td><td>El plugin se registra al arrancar</td></tr>
    <tr><td><code>on_disable()</code></td><td>sin operación</td><td>Cuando xtop se apaga</td></tr>
    <tr><td><code>on_tick()</code></td><td>sin operación</td><td>Cada ciclo de actualización (~1 s por defecto)</td></tr>
    <tr><td><code>on_key()</code></td><td><code>false</code></td><td>Pulsación de tecla en modo Normal (devuelve <code>true</code> para consumirla)</td></tr>
    <tr><td><code>data_provider()</code></td><td><code>None</code></td><td>Al arrancar (se fusiona en el CompositeProvider)</td></tr>
    <tr><td><code>widget()</code></td><td><code>None</code></td><td>Después de cada tick (refresca el mapa de widgets del plugin)</td></tr>
    <tr><td><code>execute()</code></td><td><code>UnknownAction</code></td><td>Un agente externo (IA, CLI, MCP) invoca un comando</td></tr>
  </tbody>
</table>

<h3 id="pluginmanifest">PluginManifest</h3>

<p>Cada plugin declara su identidad y sus necesidades en
<code>manifest().capabilities</code>:</p>

<ul>
  <li><code>ReadSystemInfo</code> -- leer métricas del sistema</li>
  <li><code>KillProcesses</code> -- terminar procesos</li>
  <li><code>ModifyConfig</code> -- cambiar temas, layouts, umbrales e intervalos</li>
  <li><code>RenderWidgets</code> -- registrar widgets TUI personalizados</li>
  <li><code>Custom(String)</code> -- cualquier cosa no cubierta arriba</li>
</ul>

<h3 id="plugincontext">PluginContext</h3>

<p>Acceso seguro y limitado al estado de la aplicación. Las lecturas restringidas
por capacidad devuelven <code>Result</code>; las escrituras requieren la capacidad
correspondiente y, si no la tienen, fallan con
<code>PluginError::Recoverable</code>:</p>

<pre><code>ctx.snapshot()?                 // Full SystemSnapshot (needs ReadSystemInfo)
ctx.top_processes(n)?           // Top n processes by CPU, sorted desc
ctx.system_info()?              // Hostname, OS, kernel (needs ReadSystemInfo)
ctx.kill_process(pid)?          // Kill process by PID (needs KillProcesses)
ctx.set_alert_thresholds(cpu, mem, disk)?  // (needs ModifyConfig)
ctx.set_theme_by_name("tokio")? // (needs ModifyConfig)
ctx.set_layout_by_name("CPU Focus")?       // (needs ModifyConfig)
ctx.set_update_interval(500)?   // (needs ModifyConfig)
ctx.alerts()                    // Current alert thresholds
ctx.config()                    // Theme, layout, interval, hostname
ctx.data_dir()                  // Host-provided plugin data dir</code></pre>

<hr>

<h2 id="data-providers">Data providers</h2>

<p>El kernel muestrea el sistema con su propio provider
(<code>SysinfoProvider</code> en <code>src/providers/sysinfo/</code>) y compone
los providers de los plugins mediante <code>CompositeProvider</code>:</p>

<ul>
  <li><code>refresh_all()</code> refresca el provider principal y cada uno de los extra</li>
  <li><code>snapshot()</code> delega en el principal</li>
  <li><code>disk_io()</code>, <code>batteries()</code>, <code>gpu_info()</code> y
      <code>system_info()</code> usan el resultado del principal cuando no está vacío;
      en caso contrario, el primer resultado no vacío de un provider extra</li>
  <li><code>kill_process()</code> intenta primero con el principal y luego con los extra</li>
</ul>

<hr>

<h2 id="widget-registration">Widgets de plugins</h2>

<p>Un plugin puede registrar un widget personalizado mediante <code>widget()</code>. La
closure de render recibe la vista de plugin del estado (<code>&amp;dyn HostState</code>)
y dibuja con ratatui plano:</p>

<pre><code>fn widget(&amp;self) -&gt; Option&lt;PluginWidget&gt; {
    Some(PluginWidget {
        name: "samurai".to_string(),
        render: Arc::new(|f, state, area| {
            // Draw using ratatui; `state` is &amp;dyn HostState.
        }),
    })
}</code></pre>

<p>Los widgets personalizados se colocan en los layouts por nombre en ficheros de
layout JSONC:</p>

<pre><code>{
    "name": "my-layout",
    "root": {
        "direction": "vertical",
        "areas": [
            { "widget": "header", "size": 3 },
            { "widget": "samurai", "size": "30%" },
            { "widget": "processes", "size": "*" }
        ]
    }
}</code></pre>

<p>Los widgets de plugins tienen prioridad sobre los widgets de packs con el mismo
nombre (el kernel resuelve primero los widgets de plugins al renderizar). Un layout
que referencia un nombre que ni un pack ni un plugin proporcionan imprime una
advertencia única en stderr.</p>

<hr>

<h2 id="cli-commands">Comandos CLI</h2>

<table>
  <thead>
    <tr><th>Comando</th><th>Descripción</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>xtop plugin list</code></td>
      <td>Enumera los plugins cableados en el <code>Cargo.toml</code> del kernel (entradas de feature con <code>dep:&lt;name&gt;</code>)</td>
    </tr>
    <tr>
      <td><code>xtop plugin install &lt;name&gt;</code></td>
      <td>Instala un plugin por nombre desde <code>github.com/xtop-cli/plugins</code></td>
    </tr>
    <tr>
      <td><code>xtop plugin install &lt;url&gt;</code></td>
      <td>Instala un plugin desde cualquier URL git</td>
    </tr>
    <tr>
      <td><code>xtop plugin scaffold &lt;name&gt;</code></td>
      <td>Crea una plantilla de crate de plugin en <code>plugins-dev/</code> (ignorada por git)</td>
    </tr>
  </tbody>
</table>

<h3 id="install-flow">Flujo de instalación (comportamiento real)</h3>

<p><code>xtop plugin install</code> <strong>no</strong> descarga un binario y
<strong>no</strong> registra nada en tiempo de ejecución. Edita el propio
<code>Cargo.toml</code> del kernel (un flujo de trabajo que automodifica el fuente):</p>

<ol>
  <li>Resuelve el repo fuente: <code>github.com/xtop-cli/plugins</code> para un nombre, o la URL dada</li>
  <li>Lo clona (shallow, sparse) en un directorio temporal</li>
  <li>Localiza el crate <code>xtop-plugin-&lt;name&gt;</code> dentro del clon
      (la raíz del repo, o las subcarpetas <code>plugins/</code>/<code>crates/</code>)</li>
  <li>Añade una dependencia git opcional + una feature flag al
      <code>Cargo.toml</code> raíz del kernel (el mismo patrón que usa el
      <code>xtop-plugin-samurai</code> integrado)</li>
  <li>Ejecuta <code>cargo check</code> para verificar que el manifest se resuelve, y luego limpia</li>
</ol>

<p>El plugin queda registrado pero <strong>no habilitado por defecto</strong>. Para
habilitarlo, añade su feature a la lista <code>default</code> de <code>[features]</code> del
<code>Cargo.toml</code> del kernel (o compila con <code>--features &lt;name&gt;</code>) y
recompila. Cada plugin instalado necesita además una línea de registro en
<code>src/commands/share/bootstrap.rs</code> bajo su feature flag.</p>

<pre><code># Build xtop with samurai plugin enabled (default already includes it)
cargo build --release --features plugin-samurai

# Build xtop with samurai + another plugin
cargo build --release --features "plugin-samurai,plugin-mything"</code></pre>

<hr>

<h2 id="extensions-mcp">Extensiones: el servidor MCP</h2>

<p>Las extensiones son los hooks estilo servidor del kernel (contrato:
<code>xtop-extension-api</code>). La extensión incluida es el servidor MCP
(Model Context Protocol) del repo <code>xtop-cli/extensions</code>
(<code>xtop-extension-mcp</code>), que expone las acciones de los plugins alojados
como herramientas MCP sobre stdio. Se compila cuando la feature
<code>mcp-extension</code> está activa (forma parte de las features por defecto).</p>

<pre><code>xtop mcp</code></pre>

<p>Las herramientas MCP se ejecutan contra el plugin samurai, así que la
feature <code>plugin-samurai</code> también es necesaria. Entre los clientes
compatibles están Claude Desktop, Cline, Cursor y Continue.dev.</p>

<h3>Configuración de Claude Desktop</h3>

<pre><code>{
  "mcpServers": {
    "xtop": {
      "command": "xtop",
      "args": ["mcp"]
    }
  }
}</code></pre>

<h3>Pruebas interactivas</h3>

<pre><code># Single command
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"system_summary","arguments":{}}}' | xtop mcp

# Interactive session
xtop mcp</code></pre>

<p>La extensión MCP depende de <code>xtop-plugin-samurai</code> en tiempo de compilación:
el id del plugin y los 12 nombres de acción son constantes de fuente única
(<code>PLUGIN_ID</code>, <code>actions::*</code>), de modo que la tabla de herramientas
nunca puede desviarse de la implementación del plugin.</p>

<hr>

<h2 id="adding-a-plugin-manually">Añadir un plugin manualmente</h2>

<ol>
  <li>
    <p>Crea el andamiaje del crate (o escríbelo a mano en tu propio repo):</p>
    <pre><code>xtop plugin scaffold mything   # creates plugins-dev/xtop-plugin-mything/</code></pre>
  </li>
  <li>
    <p>Conviértelo en un repo git y súbelo (el crate debe vivir en la raíz del repo o bajo
    <code>plugins/</code>/<code>crates/</code>, p. ej. <code>github.com/you/xtop-plugin-mything</code>).</p>
  </li>
  <li>
    <p>Instálalo en el kernel (añade una dependencia git opcional + feature flag en el <code>Cargo.toml</code> raíz):</p>
    <pre><code>xtop plugin install https://github.com/you/xtop-plugin-mything</code></pre>
    <p>Edición manual equivalente:</p>
    <pre><code>[dependencies]
xtop-plugin-mything = { git = "https://github.com/you/xtop-plugin-mything", optional = true }

[features]
plugin-mything = ["dep:xtop-plugin-mything"]</code></pre>
  </li>
  <li>
    <p>Regístralo bajo la feature flag en <code>src/commands/share/bootstrap.rs</code>:</p>
    <pre><code>#[cfg(feature = "plugin-mything")]
use xtop_plugin_mything::MythingPlugin;

// In register_plugins():
#[cfg(feature = "plugin-mything")]
{
    let plugin = Box::new(MythingPlugin::new());
    if let Err(e) = mgr.register(plugin, state) {
        eprintln!("[xtop] failed to load mything plugin: {e}");
    }
}</code></pre>
  </li>
</ol>

<p>Los detalles del contrato para autores de plugins (manifest, capacidades, tipos de
error, widgets) viven en la documentación del repo api; el plugin samurai de
<code>xtop-cli/plugins</code> es la implementación de referencia.</p>

<hr>

<p align="center">
  <a href="../README.md">Volver al README</a>
</p>
