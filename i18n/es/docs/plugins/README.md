# Plugins de xtop

Repositorio oficial de los plugins nativos y comunitarios de Xtop.

## Workspace

Cada crate vive bajo `plugins/`:

```
plugins/
  xtop-plugin-samurai/     native plugin (compile-time, xtop-plugin-api)
  xtop-plugin-wasm/        runtime widget host: sandboxed WASM modules
  xtop-plugin-external/    runtime widget host: helper processes
  xtop-wasm-contract/      serializable state/draw-list contract
  xtop-widget-replay/      host-side draw-list replay + state conversion
  xtop-wasm-guest/         Rust guest SDK for wasm32 widgets
```

Los ejemplos viven bajo `examples/` (`wasm/` y `external/`). Los cambios se
registran en [CHANGELOG.md](CHANGELOG.md); las decisiones de diseño en
[docs/decisions.md](docs/decisions.md).

## Cómo funcionan los plugins

- Cada plugin se publica/instala de forma independiente y se integra en el
  kernel a través de `xtop-plugin-api`.
- El kernel habilita los plugins de forma opcional (feature flags para los
  integrados, descubrimiento en tiempo de ejecución para los externos). Una
  compilación normal de `xtop` nunca requiere este repositorio.
- Instala un plugin desde el kernel con: `xtop plugin install <name>`
  (fuente por defecto: https://github.com/xtop-cli/plugins)

## Widgets en tiempo de ejecución

Dos features opcionales del kernel abren la superficie de widgets a código que
**no** está compilado en el kernel. Ambos registran widgets por la ruta normal
de plugins, así que un widget en tiempo de ejecución tiene precedencia sobre
cualquier pack compilado:

- `xtop-plugin-wasm` (`--features plugin-wasm`) carga módulos `*.wasm` en
  sandbox en proceso con wasmi. Los widgets se descubren en `wasm/` bajo el
  directorio de configuración del usuario (o `XTOP_WASM_DIR`). Consulta
  [docs/wasm-widgets.md](docs/wasm-widgets.md).
- `xtop-plugin-external` (`--features plugin-external`) lanza procesos
  auxiliares que hablan JSON delimitado por líneas por stdin/stdout. Los widgets
  se descubren en `external/` bajo el directorio de configuración del usuario
  (o `XTOP_EXTERNAL_DIR`). Consulta
  [docs/external-widgets.md](docs/external-widgets.md).

Ninguna de las dos features forma parte de la compilación por defecto de `xtop`.
Hay ejemplos funcionales en [`examples/`](examples/): guests WASM de Rust en
[`examples/wasm/`](examples/wasm/) y procesos auxiliares en Lua/Python/Node en
[`examples/external/`](examples/external/). La justificación y los compromisos
están registrados en [docs/decisions.md](docs/decisions.md) (ADR-001).

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
plugins/        this repo
effects/
extensions/
```

## Licencia

MIT
