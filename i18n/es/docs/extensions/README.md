# Extensiones de xtop

Repositorio oficial de las extensiones de xtop: comportamientos opcionales
que el kernel puede alojar. Hoy esto significa **extensiones de tipo
servidor**: integraciones de larga duración que el kernel arranca bajo
demanda y que dirigen la aplicación a través del contrato de host en
`xtop-extension-api`.

El crate del contrato ofrece hoy exactamente una forma: una extensión
implementa el trait `Extension` (`manifest()` + `run_server(server_id,
ctx)`) y actúa a través de una vista `ExtensionHost` que ofrece `tick()` y
`execute_plugin()`: las extensiones acceden a las funciones del kernel a
través de plugins, no mediante hooks directos. El kernel funciona por
completo sin ninguna extensión.

**Trabajo futuro**: las extensiones de tipo hook que afectan a la
configuración, el tema, el layout o el renderizado (hooks de pre/post
renderizado, transformaciones de configuración, nuevos comandos) se diseñan
a medida que se necesiten — nada en `xtop-extension-api` las implementa
todavía.

## Workspace

Cada extensión vive en su propia carpeta bajo `extensions/`:

```
extensions/
  xtop-extension-<name>/
    Cargo.toml
    src/
    README.md
```

## Extensión actual: xtop-extension-mcp

- Servidor MCP (Model Context Protocol) sobre JSON-RPC 2.0 por stdio,
  lanzado por el kernel como `xtop mcp`.
- Expone el plugin samurai (repositorio de plugins) como 12 herramientas
  MCP; la tabla de herramientas se genera a partir de las constantes
  exportadas `PLUGIN_ID` + `actions::*` del plugin, por lo que la extensión
  depende del repositorio de plugins en tiempo de compilación.
- [README del crate](extensions/xtop-extension-mcp/README.md) · protocolo y
  mapeo de herramientas en [docs/mcp-protocol.md](docs/mcp-protocol.md) ·
  arquitectura de la extensión en [docs/architecture.md](docs/architecture.md).

## Para empezar (desarrollo)

Desde la raíz de este repositorio:

```bash
cargo build --workspace
```

Durante el desarrollo activo, todos los repositorios conviven lado a lado y
usan dependencias por ruta local:

```
xtop/           kernel
api/            API crates
plugins/
effects/
extensions/     this repo
```

## Licencia

MIT
