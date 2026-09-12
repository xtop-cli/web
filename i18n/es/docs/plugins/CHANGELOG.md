# Registro de cambios

## [0.1.0] - 2026-09-12

Nota de política de versiones: el ecosistema sigue en una fase temprana — todo
está en 0.1.0. Esta entrada registra el trabajo de widgets en tiempo de
ejecución que se incorporó al repo sobre el crate `xtop-plugin-samurai`
existente.

### Hosts de widgets en tiempo de ejecución (opt-in)

- Nuevo crate **`xtop-plugin-wasm`** (`xtop-plugin-wasm`, feature `plugin-wasm`
  en el kernel): carga widgets `*.wasm` en sandbox en proceso con wasmi.
  Descubrimiento en `<config dir>/wasm/` (anular con `XTOP_WASM_DIR`), recarga
  en caliente por mtime, acciones de depuración `status`/`render`/`reload`, y un
  arnés `examples/inspect.rs` que ejecuta un módulo sin el kernel. Límites del
  sandbox: 100M de fuel por secuencia de llamada host→guest, 64 MiB de memoria
  lineal, solo el import `host.log` enlazado.
- Nuevo crate **`xtop-plugin-external`** (`xtop-plugin-external`, feature
  `plugin-external`): un proceso auxiliar por widget sobre JSON delimitado por
  líneas. Descriptores en `<config dir>/external/*.json` (anular con
  `XTOP_EXTERNAL_DIR`), timeout por respuesta, última lista de dibujo buena ante
  fallos, apagado limpio. Cualquier lenguaje con un runtime puede implementar un
  widget.
- Nuevos crates compartidos:
  - **`xtop-wasm-contract`** — contrato serializable `Manifest`/`State`/`DrawList`
    más el protocolo externo `Request`/`Response` (ABI `"1"`).
  - **`xtop-widget-replay`** — reproducción en el host de listas de dibujo sobre
    un frame de ratatui y la conversión de contexto de plugin → contrato
    `State`.
  - **`xtop-wasm-guest`** — SDK de guest en Rust (macro `export_widget!`,
    exports de ABI, uso de `host.log`) para construir widgets para
    `wasm32-unknown-unknown`.
- La integración en el kernel es aditiva y opt-in: los dos hosts son features
  no por defecto, se registran por la ruta existente de widgets de plugins
  (precedencia sobre los packs compilados) y dejan intacto el sistema de
  plugins/packs compilados. Ver `docs/decisions.md` (ADR-001).

### Ejemplos

- `examples/wasm/` — guests de Rust `clock`, `cpu`, `procs` y `load-stats`
  (estadística: EMA, z-score), más guests de C autónomos `c-ticker` y
  `c-cpu-avg` compilados con clang + wasm-ld y sin libc/WASI.
- `examples/external/` — widgets auxiliares de Lua (`lua-clock`,
  `lua-histogram`), Python (`python-cpu`, `python-cpu-chart`,
  `python-mem-regression`) y Node (`node-clock`), todos sin dependencias.

### Herramientas

- `scripts/build-examples.sh` — compila cada guest (Rust wasm32 + C) y puede
  hacerles una prueba de humo a través del cargador real del host.
- `scripts/test-wasm-e2e.sh`, `scripts/test-external-e2e.sh` — comprobaciones
  de extremo a extremo de ambas vías (se saltan los runtimes que no están
  instalados).
- `scripts/ci.sh` — nuevas etapas opcionales `wasm` y `external`; las etapas
  por defecto (`fmt`, `clippy`, `check`, `test`) no cambian.

### Documentación

- `docs/wasm-widgets.md` — host WASM: ABI, límites del sandbox, operaciones de
  la lista de dibujo, recarga en caliente, guía de autoría.
- `docs/external-widgets.md` — host externo: descriptores, protocolo,
  ciclo de vida, timeouts.
- `docs/decisions.md` — ADR-001 (hosts de widgets en tiempo de ejecución).
- `examples/wasm/README.md`, `examples/external/README.md` — instrucciones de
  compilación/ejecución por ejemplo.

### Compatibilidad

- Sin cambios disruptivos en `xtop-plugin-samurai` ni en el contrato
  `xtop-plugin-api`. Los nuevos crates son miembros aditivos del workspace.
- La ABI de cara al guest está versionada (`"1"`); los guests que declaran un
  valor `api` distinto se cargan con una advertencia.
