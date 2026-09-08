# xtop effects

Efectos de frame y transiciones para xtop. Cada efecto es un añadido visual
que se enchufa al pipeline de renderizado del kernel a través del crate de
contrato compartido `xtop-effect-api` (en el repo `api`): recibe el buffer de
ratatui totalmente renderizado de un frame más el tiempo transcurrido desde
que el efecto empezó, y reescribe el buffer en el sitio antes del flush del
terminal.

## Estructura del workspace

```
effects/
  Cargo.toml           workspace root
  xtop-effect-fade/    Fade: fades a rendered frame in from black (500 ms)
  docs/                effect authoring guide + effect catalog
```

Cada efecto vive en su propio crate `xtop-effect-<name>/`. Los helpers de
efecto compartidos vivirían en un crate `effects-lib/` — ese crate solo
aparece cuando un segundo efecto comparte realmente código con uno existente,
así que no se crea vacío.

## Efectos

| Crate | Efecto | Id del manifest | Comportamiento |
|-------|--------|-------------|----------|
| `xtop-effect-fade` | Fade | `fade` | Funde el frame renderizado desde negro en 500 ms; determinista, cero config |

## Documentación

- `docs/write-effect.md` — cómo implementar un efecto contra
  `xtop-effect-api` (recapitulación del trait, contrato del host, patrón de
  testing).
- `docs/effects.md` — catálogo de los efectos integrados y la nota de
  integración con el kernel.

## Desarrollo

Desde la raíz de este repo:

```bash
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo check --workspace
cargo test --workspace
cargo doc --workspace --no-deps
```

Durante el desarrollo activo todos los repos viven lado a lado. La forma
confirmada de `xtop-effect-api` es una dependencia git flotante
(`{ git = "https://github.com/xtop-cli/api" }`, `[workspace.dependencies]`
compartido). Para compilar contra el checkout local de `api` en su lugar —
necesario hasta que se haga push del repo `api` — apunta temporalmente esa
dependencia a `../api/crates/effect-api` (una ruta relativa a este repo),
ejecuta los comandos anteriores y restaura después la forma git y borra el
`Cargo.lock` generado (el repo lo ignora por diseño).

## CI local

```bash
./scripts/ci.sh            # run every stage
./scripts/ci.sh fmt        # run one stage
```

Etapas: `fmt` | `clippy` | `check` | `test`.

## Licencia

MIT
