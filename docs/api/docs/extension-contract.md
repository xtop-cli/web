# Extension contract — `xtop-extension-api`

`xtop-extension-api` (`api/crates/extension-api/`) is the shared extension
protocol (DR-4). Extensions are optional behaviors the kernel can host —
today that means **servers**: long-running integrations (the MCP server in
`xtop-extension-mcp`) that the kernel starts on demand and that drive the
app through an `ExtensionHost` view.

The crate is deliberately minimal and standalone: it declares **zero
dependencies** and never depends on the kernel. Its crate doc anticipates
that extensions may also use `xtop-plugin-api` for the shared data model,
but no extension needs it yet, so no such dependency exists in the manifest.

Public surface (all re-exported at the root): `Extension`,
`ExtensionHost`, `ExtensionContext`, `ExtensionManifest`, `ExtensionError`.

## The model as it exists today — server-style

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

Only `manifest` is required; `run_server` defaults to an `Unknown` error, so
an extension that declares a server must override it. The kernel wires
concrete extensions: for MCP it dispatches the `xtop mcp` subcommand into
`run_server("mcp", ...)` (kernel `commands/mcp.rs`), which blocks for the
lifetime of the server loop (in MCP's case: a JSON-RPC 2.0 read-eval-print
loop over stdio).

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

The `servers` vector is what a host would consult to discover which
`server_id` values the extension accepts; `run_server` is the entry point
for exactly those ids.

## What an extension may drive — `ExtensionHost` / `ExtensionContext`

The kernel implements `ExtensionHost` for its live application state
(`impl ExtensionHost for AppState` in the kernel's
`xtop/src/plugins/extension_host.rs`) and hands extensions an
`ExtensionContext` over it. Extensions act through the context — never on
kernel types:

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

Design intent, stated in the `ExtensionHost` docs: **plugins remain the unit
of domain behavior**; extensions act through them with `execute_plugin`
rather than re-implementing domain logic. The MCP extension follows this:
every MCP tool call maps onto a `(plugin_id, action, params)` tuple that is
executed against the hosted `samurai` plugin, after an optional `ctx.tick()`
to refresh data (`extensions/extensions/xtop-extension-mcp/src/lib.rs`).

The kernel's mapping of plugin errors to extension errors
(`map_plugin_error` in `xtop/src/plugins/extension_host.rs`) is the
reference for cross-contract error behavior: `Recoverable`/`Fatal` map
one-to-one, `UnknownAction` becomes a `Recoverable` message.

## `ExtensionError`

```rust
pub enum ExtensionError {
    Recoverable(String), // e.g. invalid params, resource busy
    Fatal(String),       // extension should be disabled
    Unknown(String),     // server or action not understood
}
```

`Display`: verbatim message for `Recoverable`, `FATAL: <msg>` for `Fatal`,
`unknown: <msg>` for `Unknown`. Implements `std::error::Error`. The MCP
server maps its own failures onto these variants (`Fatal` for stdio
read/write failures, `Recoverable` for malformed JSON-RPC).

## Honest scope note — hooks are future work

The crate doc describes two extension flavors: **hooks** that touch config,
theme, layout or rendering ("designed as they are needed") and **servers**.
Only the server flavor exists today: there is no hook trait, no hook
registration, and `ExtensionManifest` carries no hook metadata. The
hook-style surface will be added to this crate when a real consumer (kernel
feature) needs it — until then it stays out of the contract on purpose (no
speculative surface, same rule as decision D4 for effects).

## Implementing an extension

An extension implements `Extension` and runs its server loop against the
context. The pattern, mirroring `McpExtension`:

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

The kernel side is already demonstrated by the MCP command: create the
extension, create `ExtensionContext::new(&mut state)` over the live app
state, call `run_server(server_id, &mut ctx)`, and map the error up.
Extensions consume `xtop-extension-api` as a git dependency from the
`extensions` repo (see [architecture.md](architecture.md) for the temporary
path-dep pattern).
