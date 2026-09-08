# Contrato de extensiones — `xtop-extension-api`

`xtop-extension-api` (`api/crates/extension-api/`) es el protocolo de
extensiones compartido (DR-4). Las extensiones son comportamientos opcionales
que el kernel puede alojar — hoy eso significa **servidores**: integraciones
de larga duración (el servidor MCP en `xtop-extension-mcp`) que el kernel
arranca bajo demanda y que dirigen la aplicación a través de una vista
`ExtensionHost`.

El crate es deliberadamente mínimo e independiente: declara **cero
dependencias** y nunca depende del kernel. Su doc de crate prevé que las
extensiones puedan usar también `xtop-plugin-api` para el modelo de datos
compartido, pero ninguna extensión lo necesita todavía, así que no existe esa
dependencia en el manifest.

Superficie pública (toda re-exportada en la raíz): `Extension`,
`ExtensionHost`, `ExtensionContext`, `ExtensionManifest`, `ExtensionError`.

## El modelo tal como existe hoy — estilo servidor

```rust
/// The core trait every extension must implement.
pub trait Extension: Debug + Send {
    fn manifest(&self) -> ExtensionManifest;

    /// Run one of the servers declared in the manifest until it ends.
    /// The kernel dispatches `xtop <server>` style commands to this method.
    fn run_server(&mut self, server_id: &str, _ctx: &mut ExtensionContext)
        -> Result<(), ExtensionError> {
        Err(ExtensionError::Unknown(format!(
            "server '{server_id}' is not provided by this extension"
        )))
    }
}
```

Solo `manifest` es obligatorio; `run_server` tiene por defecto un error
`Unknown`, así que una extensión que declara un servidor debe sobrescribirlo.
El kernel cablea extensiones concretas: para MCP despacha el subcomando
`xtop mcp` a `run_server("mcp", ...)` (kernel `commands/mcp.rs`), que
bloquea durante toda la vida del bucle del servidor (en el caso de MCP: un
bucle JSON-RPC 2.0 de leer-evaluar-imprimir sobre stdio).

`ExtensionManifest`:

```rust
pub struct ExtensionManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    /// Server ids this extension can run (e.g. "mcp").
    pub servers: Vec<String>,
}
```

El vector `servers` es lo que consultaría un host para descubrir qué valores
de `server_id` acepta la extensión; `run_server` es el punto de entrada para
exactamente esos ids.

## Qué puede dirigir una extensión — `ExtensionHost` / `ExtensionContext`

El kernel implementa `ExtensionHost` para su estado de aplicación vivo
(`impl ExtensionHost for AppState` en el
`xtop/src/plugins/extension_host.rs` del kernel) y entrega a las extensiones
un `ExtensionContext` sobre él. Las extensiones actúan a través del
contexto — nunca sobre tipos del kernel:

```rust
pub trait ExtensionHost {
    /// Advance the monitoring tick (also ticks hosted plugins).
    fn tick(&mut self);

    /// Execute a named action on a hosted plugin (`plugin_id`).
    /// Returns the plugin's JSON-ish string response.
    fn execute_plugin(&mut self, plugin_id: &str, action: &str, params: &str)
        -> Result<String, ExtensionError>;
}

pub struct ExtensionContext<'a> { /* wraps &'a mut dyn ExtensionHost */ }

impl<'a> ExtensionContext<'a> {
    pub fn new(host: &'a mut dyn ExtensionHost) -> Self;
    pub fn tick(&mut self);
    pub fn execute_plugin(&mut self, plugin_id: &str, action: &str, params: &str)
        -> Result<String, ExtensionError>;
}
```

Intención de diseño, enunciada en los docs de `ExtensionHost`: **los plugins
siguen siendo la unidad del comportamiento de dominio**; las extensiones
actúan a través de ellos con `execute_plugin` en lugar de reimplementar la
lógica de dominio. La extensión MCP sigue esto: cada llamada a una tool de
MCP se corresponde con una tupla `(plugin_id, action, params)` que se ejecuta
contra el plugin `samurai` alojado, tras un `ctx.tick()` opcional para
refrescar los datos (`extensions/extensions/xtop-extension-mcp/src/lib.rs`).

El mapeo del kernel de errores de plugin a errores de extensión
(`map_plugin_error` en `xtop/src/plugins/extension_host.rs`) es la referencia
del comportamiento de error entre contratos: `Recoverable`/`Fatal` se mapean
uno a uno, `UnknownAction` se convierte en un mensaje `Recoverable`.

## `ExtensionError`

```rust
pub enum ExtensionError {
    Recoverable(String), // e.g. invalid params, resource busy
    Fatal(String),       // extension should be disabled
    Unknown(String),     // server or action not understood
}
```

`Display`: mensaje verbatim para `Recoverable`, `FATAL: <msg>` para `Fatal`,
`unknown: <msg>` para `Unknown`. Implementa `std::error::Error`. El servidor
MCP mapea sus propios fallos a estas variantes (`Fatal` para los fallos de
lectura/escritura de stdio, `Recoverable` para JSON-RPC malformado).

## Nota honesta de alcance — los hooks son trabajo futuro

El doc del crate describe dos sabores de extensión: **hooks** que tocan la
config, el tema, el layout o el renderizado ("diseñados según se necesiten")
y **servidores**. Hoy solo existe el sabor de servidor: no hay ningún trait
de hook, ningún registro de hooks, y `ExtensionManifest` no porta metadatos
de hook. La superficie de estilo hook se añadirá a este crate cuando un
consumidor real (feature del kernel) la necesite — hasta entonces se queda
fuera del contrato a propósito (sin superficie especulativa, la misma regla
que la decisión D4 para los efectos).

## Implementar una extensión

Una extensión implementa `Extension` y ejecuta su bucle de servidor contra el
contexto. El patrón, siguiendo a `McpExtension`:

```rust
use xtop_extension_api::{Extension, ExtensionContext, ExtensionError, ExtensionManifest};

#[derive(Debug, Default)]
pub struct MyServer; // long-running integration, e.g. over stdio

impl Extension for MyServer {
    fn manifest(&self) -> ExtensionManifest {
        ExtensionManifest {
            id: "my-server".to_string(),
            name: "My server extension".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            description: "exposes xtop through my protocol".to_string(),
            servers: vec!["my-server".to_string()],
        }
    }

    fn run_server(
        &mut self,
        server_id: &str,
        ctx: &mut ExtensionContext,
    ) -> Result<(), ExtensionError> {
        if server_id != "my-server" {
            return Err(ExtensionError::Unknown(format!(
                "server '{server_id}' is not provided by this extension"
            )));
        }
        // Serve until the transport ends: tick the host and forward client
        // requests as plugin actions.
        loop {
            // ... read a request, then:
            ctx.tick();
            let response = ctx.execute_plugin("samurai", "system.summary", "")?;
            // ... write the response
        }
    }
}
```

El lado del kernel ya lo demuestra el comando MCP: crear la extensión, crear
`ExtensionContext::new(&mut state)` sobre el estado de la aplicación vivo,
llamar a `run_server(server_id, &mut ctx)` y propagar el error hacia arriba.
Las extensiones consumen `xtop-extension-api` como dependencia git desde el
repo `extensions` (ver [architecture.md](architecture.md) para el patrón
temporal de path-dep).
