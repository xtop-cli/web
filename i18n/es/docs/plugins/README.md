# Plugins de xtop

Repositorio oficial de los plugins nativos y comunitarios de Xtop.

## Workspace

Cada plugin vive en su propia carpeta bajo `plugins/`:

```
plugins/
  xtop-plugin-<name>/
    Cargo.toml
    src/
    README.md
```

## Cómo funcionan los plugins

- Cada plugin se publica/instala de forma independiente y se integra en el
  kernel a través de `xtop-plugin-api`.
- El kernel habilita los plugins de forma opcional (feature flags para los
  integrados, descubrimiento en tiempo de ejecución para los externos). Una
  compilación normal de `xtop` nunca requiere este repositorio.
- Instala un plugin desde el kernel con: `xtop plugin install <name>`
  (fuente por defecto: https://github.com/xtop-cli/plugins)

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
