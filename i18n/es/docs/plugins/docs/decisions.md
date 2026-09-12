# Decisiones de diseño

Registro breve de las decisiones que dan forma a este repo y a sus crates.
Basado en el código de este repo y en las fuentes del kernel referenciadas
abajo.

## ADR-001 — Hosts de widgets en tiempo de ejecución: WASM opt-in y procesos externos tras un único contrato de lista de dibujo

**Estado.** Aceptada. Implementada en este repo; el kernel consume los dos
hosts detrás de las features no por defecto `plugin-wasm` y `plugin-external`. No
sustituye nada; la alternativa diferida (descubrimiento por ABI nativa de
`xtop-plugin-*` en los directorios de configuración) permanece en el ROADMAP
del kernel §7.

### Contexto

El ecosistema es de tiempo de compilación por diseño: los plugins, los packs de
widgets, las extensiones y los efectos son features de Cargo más dependencias
git flotantes, y una compilación normal de `xtop` nunca requiere ningún repo
hermano. Por tanto, el código de widgets de terceros necesita editar el
`Cargo.toml` del kernel y recompilar — un listón aceptable para el trabajo
propio, un muro infranqueable para autores de widgets en otros lenguajes.

Restricciones vigentes:

- Kernel de un solo crate; ratatui `0.30.2`; `rust-version = "1.87"`; edition
  2021; sin tokio/clap/chrono.
- Los contratos viven solo en el repo `api` (DR-1..DR-5); el kernel nunca
  depende de repos hermanos en tiempo de ejecución.
- Los layouts direccionan widgets por nombres de cadena no validados; la
  resolución es en tiempo de ejecución: primero los widgets de plugins, luego
  el pack elegido, luego el pack base (`layouts/docs/decisions.md` D-2, kernel
  `ui/layout/engine.rs`).
- CI solo local; las deps git de los consumidores siguen flotantes este ciclo;
  las deps de path temporales se permiten durante el desarrollo y deben
  revertirse antes del push (`xtop/docs/multi-repo.md`).

**Problema.** Permitir que terceros distribuyan widgets sin recompilar el
kernel, sin romper la precedencia de widgets de plugins ni el contrato de
nombres de layout, y sin obligar a cada usuario a pagar por un motor en tiempo
de ejecución.

**Alternativas evaluadas**

| # | Alternativa | Pros | Contras |
|---|---|---|---|
| 1 | Seguir solo en tiempo de compilación | Cero coste en tiempo de ejecución; modelo de amenazas más simple | Cada widget se distribuye en la compilación; los terceros deben hacer fork/editar y recompilar |
| 2 | Un único host WASM en proceso | Sandbox fuerte; portable; un solo motor | Necesita un toolchain wasm; sin acceso al SO; dependencia de wasmi incluso sin usarse |
| 3 | Un único host de procesos externos | Cualquier lenguaje/runtime; contención de caídas; sin nuevas deps del kernel | Latencia de IPC por tick + timeouts; ciclo de vida del proceso; se ejecuta con privilegios del usuario |
| 4 | Carga dinámica nativa (dlopen/ABI) | Velocidad nativa; mínima sobrecarga | Carga de ABI/versionado y seguridad ante caídas; cargador específico de plataforma; diferida por el roadmap |
| 5 | **Dos hosts tras un contrato compartido** | Lo mejor de 2+3; una ruta de registro y un formato de intercambio; opt-in | Dos protocolos y dos modos de fallo que mantener y documentar |

### Decisión

Se adopta la alternativa 5.

- Dos features del kernel **opcionales y no por defecto**: `plugin-wasm`
  (wasmi 2, en proceso) y `plugin-external` (un proceso auxiliar por widget,
  JSON delimitado por líneas por stdin/stdout). La compilación por defecto no
  cambia.
- Ambos hosts se registran por la ruta normal de plugins
  (`xtop_plugin_api::Plugin` / `PluginWidget`), así que los widgets en tiempo de
  ejecución tienen precedencia sobre cualquier pack compilado y se referencian
  por nombre en los layouts. Descubrimiento: `<config dir>/wasm/*.wasm` y
  `<config dir>/external/*.json`, anulables con `XTOP_WASM_DIR` /
  `XTOP_EXTERNAL_DIR`; ante nombres duplicados gana la primera ruta por orden
  lexicográfico.
- Contrato compartido en `xtop-wasm-contract` (`Manifest`, `State`, operaciones
  de `DrawList`: block/text/gauge/bar/sparkline/chart, ABI `"1"`); reproducción
  en el host en `xtop-widget-replay`; SDK de guest en Rust en
  `xtop-wasm-guest` (`export_widget!`). Los cambios del contrato deben seguir
  siendo retrocompatibles.
- Sandbox WASM: 100M de fuel por secuencia de llamada host→guest, tope de
  64 MiB de memoria lineal, solo el import `host.log` enlazado, recorte de
  rects, recarga en caliente por mtime con caché de la última versión buena.
  Los guests renderizan una vez por tick; los frames reproducen la lista
  cacheada.
- Protocolo externo: peticiones `manifest`/`render`/`shutdown`, respuestas
  `draw`/`log`; timeout por respuesta acotado a 100–60000 ms (por defecto
  2000); sin recarga en caliente; el apagado mata y recolecta el hijo. El
  proceso **no** está en sandbox (documentado).
- Límite del payload por tick: `max_processes` (por defecto 50, acotado a
  1–4096), orden descendente por CPU antes del truncado.
- Distribución: los hosts viven en este repo; el kernel los consume como
  dependencias git (`xtop-cli/plugins`), así que un checkout limpio del kernel
  compila sin repos hermanos.

### Consecuencias

**Positivas**

- Widgets de terceros en Rust/WASM, C, Lua, Python o Node sin recompilar el
  kernel; `cargo build --no-default-features` sigue siendo el núcleo puro.
- Reutilización: una ruta de registro de widgets, un contrato de estado/dibujo,
  una implementación de reproducción; sin cambios en el formato de layout.
- Seguridad y robustez: los guests WASM no pueden tocar los tipos del kernel,
  ratatui ni la terminal; las caídas externas quedan contenidas fuera del
  kernel; los fallos recaen en la última lista de dibujo buena y registran un
  log una vez.
- Capacidad de prueba: los guests se ejecutan sin el kernel
  (`cargo run -p xtop-plugin-wasm --example inspect`), con etapas opcionales
  `wasm` / `external` en `scripts/ci.sh`.

**Negativas / compromisos**

- Rendimiento: un `render` del guest se ejecuta dentro del tick y puede
  retrasarlo (acotado por el fuel para WASM, por el timeout para externos); los
  frames nunca llaman a los guests, así que el renderizado no puede bloquearse.
- Seguridad: los widgets externos se ejecutan con privilegios del usuario
  (explícitamente no es un sandbox); WASM comparte el proceso del host, así que
  los límites de fuel/memoria/imports son barandillas, no una frontera de
  seguridad.
- Mantenimiento: dos protocolos más la ABI v1 que versionar, una política de
  nombres duplicados, recarga en caliente solo para WASM; el contrato de dibujo
  se convierte en una superficie de compatibilidad.
- Operaciones: descubrimiento en el directorio de configuración, anulaciones por
  variables de entorno, y `--all-features` ahora arrastra wasmi y lanzamiento
  de procesos (los docs de instalación lo indican).
- Release: el kernel consume ambos hosts como dependencias git
  (`https://github.com/xtop-cli/plugins`); no hay ventana de deps de path que
  revertir.
