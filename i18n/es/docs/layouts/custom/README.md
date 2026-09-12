# Diseños de la comunidad (instalables)

Los diseños de esta carpeta **no se compilan en el binario**: son diseños
extra que cualquiera puede instalar o compartir. Esta carpeta es exactamente
lo que el kernel obtiene para `xtop layout install` (hace sparse-clone de
`layouts/custom/` de este repositorio), así que cada archivo aquí es un
diseño de la comunidad instalable.

- Suelta un archivo de diseño aquí y abre un PR para compartirlo con todos.
- Cada archivo debe seguir el formato de diseño (ver el `README.md` raíz y
  el esquema formal en `docs/layout-schema.md`) y usar un `"name"` único (no
  colisiones con los nombres de `default/` ni con otros archivos de aquí).
- Convención de nombres de archivo: `my_layout.jsonc` (el nombre dentro del
  archivo es lo que muestra la TUI; `xtop layout install` acepta cualquiera
  como clave de búsqueda).
- Valida antes de compartir: `xtop layout check <file>`.

## Usar un diseño de la comunidad

El kernel instala los diseños de la comunidad en el directorio de
configuración del usuario. De cualquier manera el archivo aterriza en la
carpeta de diseños del usuario y se carga en el siguiente arranque de la TUI
(y pasa a formar parte de la paleta de diseños `l`):

```sh
# 1. Fetch and install from this repo's layouts/custom/ (needs git):
xtop layout install <name>

# 2. ...or copy the file yourself:
mkdir -p ~/.config/xtop/layouts          # Linux; see docs/authoring.md for macOS/Windows
cp my_layout.jsonc ~/.config/xtop/layouts/
```

`xtop layout install` hace coincidir un archivo por su nombre de archivo o
por el `"name"` del diseño dentro (sin distinción de mayúsculas), conserva
el nombre de archivo original y se niega a sobrescribir un archivo existente
en el directorio de diseños del usuario — edita ese archivo en su lugar. Los
archivos personalizados anulan un diseño integrado reutilizando su `"name"`
(misma posición de paleta) o aparecen como diseños extra con un `"name"`
nuevo; ver `docs/authoring.md` para el flujo completo.

## Layouts de widgets en tiempo de ejecución

Algunos layouts de esta carpeta usan **widgets en tiempo de ejecución**
(módulos WASM en sandbox o procesos auxiliares) en lugar de packs compilados:

| Archivo | Nombre del layout | Widgets necesarios |
|---|---|---|
| `wasm_demo.jsonc` | WASM Demo | `wasm-clock`, `wasm-cpu`, `wasm-procs`, `lua-clock`, `py-cpu` |
| `polyglot_dashboard.jsonc` | Polyglot Dashboard | los anteriores más `c-ticker`, más los packs `header`/`network`/`storage` |
| `wasm_procs_focus.jsonc` | WASM Procs Focus | `wasm-cpu`, `py-cpu`, `wasm-procs` |
| `cpu_stats.jsonc` | CPU Stats | `py-cpu-chart`, `py-cpu`, `wasm-cpu`, `wasm-procs` |
| `math_lab.jsonc` | Math Lab | `py-mem-regression`, `lua-histogram`, `wasm-load-stats`, `c-cpu-avg` |

Necesitan un kernel compilado con las features opcionales `plugin-wasm` /
`plugin-external` y los widgets de ejemplo del repo
[`xtop-cli/plugins`](https://github.com/xtop-cli/plugins)
(`examples/wasm/` y `examples/external/`), instalados en los directorios de
configuración del usuario (`wasm/` y `external/`). Sin esos widgets los
nombres referenciados dejan áreas vacías y el kernel avisa una vez por cada
nombre desconocido; consulta la documentación del repo plugins
(`docs/wasm-widgets.md`, `docs/external-widgets.md`).
