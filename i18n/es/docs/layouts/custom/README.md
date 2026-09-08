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
