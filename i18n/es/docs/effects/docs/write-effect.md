# Escribir un efecto para xtop

Cómo implementar un efecto nuevo contra el crate de contrato compartido
`xtop-effect-api`, que vive en el repositorio `api` y es la única fuente de
verdad del contrato de efectos (DR-5 en el ROADMAP del ecosistema). La
implementación de referencia en este repositorio es `xtop-effect-fade`.

## El contrato

Dos elementos públicos, y deliberadamente nada más:

```rust
// xtop-effect-api
pub struct EffectManifest {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
}

pub trait Effect: Send + Sync {
    fn manifest(&self) -> EffectManifest;
    fn on_frame(&mut self, buffer: &mut ratatui::buffer::Buffer,
                elapsed: std::time::Duration);
}
```

No hay registro ni tipo de pegamento: un efecto es solo un tipo `Send + Sync`
que implementa `Effect`. El kernel mantiene los efectos concretos detrás de
una feature opcional y llama al trait.

## Contrato de invocación del host

El kernel (`xtop`) es el host. Sus obligaciones, tal como documentan los
docs del crate `xtop-effect-api`, son:

- `Effect::on_frame` se llama en **cada frame renderizado**, después de que
  los widgets y el layout se hayan dibujado en el buffer de ratatui y
  **antes** del flush del terminal.
- `elapsed` es el tiempo desde que el efecto empezó — una edad absoluta,
  **no** un delta de frame.
- Los efectos **tienen estado entre frames**: cualquier progreso que un
  efecto necesite se conserva en `self` entre llamadas.
- El host **no** marca el ritmo de los frames (hace tick a una cadencia de
  aproximadamente un segundo más repintados ad-hoc). Una transición debe por
  tanto avanzar según el tiempo de pared (`elapsed`), nunca contando frames.

Un efecto nunca depende del kernel; solo usa `xtop-effect-api` y el tipo de
buffer de ratatui.

## Qué debe garantizar el lado del efecto

1. `manifest()` devuelve metadatos estáticos y estables: un `id` corto
   (usado para seleccionar el efecto), un `name` legible por humanos y una
   `description` de una línea.
2. `on_frame` puede reescribir cualquier celda del frame totalmente
   renderizado en el sitio.
3. Una vez transcurrida la ventana de un efecto debe convertirse en un no-op:
   los frames posteriores siguen siendo byte-idénticos al buffer renderizado
   por el host.
4. El mismo par `(buffer, elapsed)` debe producir la misma salida. El
   determinismo es lo que hace que los efectos sean comprobables sin una
   fuente de tiempo.

## El patrón de función pura

Mantén el progreso fuera del efecto cuando la semántica lo permita.
`elapsed` es absoluto, así que un efecto puede ser una función pura de
`(buffer, elapsed)` — la implementación siguiente es exactamente lo que hace
`xtop-effect-fade`:

```rust
use std::time::Duration;
use ratatui::buffer::Buffer;
use ratatui::style::Color;
use xtop_effect_api::{Effect, EffectManifest};

pub const WINDOW: Duration = Duration::from_millis(500);

pub struct MyEffect;

impl Effect for MyEffect {
    fn manifest(&self) -> EffectManifest {
        EffectManifest {
            id: "my-effect",
            name: "My effect",
            description: "What it does, and over what window",
        }
    }

    fn on_frame(&mut self, buffer: &mut Buffer, elapsed: Duration) {
        if elapsed >= WINDOW {
            return; // done: leave the frame byte-identical
        }
        // derive everything from `elapsed`; no timers, no frame counters
        for cell in &mut buffer.content {
            // rewrite only what must change (e.g. RGB colors, per the
            // reference effect); keep Color::Reset and modifiers intact
            let _ = &cell.fg; // Cell fields fg/bg/modifier/symbol are public
        }
    }
}
```

Solo acude al estado de `self` cuando lo visual necesite genuinamente un
historial que `elapsed` no pueda expresar. Con estado o sin él, el tipo debe
seguir siendo `Send + Sync`.

## Patrón de testing

Como el efecto es una función pura de `(buffer, elapsed)`, los tests no
necesitan terminal, ni fuente de tiempo, ni host:

- Construye un buffer con `ratatui::buffer::Buffer::empty(Rect::new(0, 0, w, h))`
  y pinta unas pocas celdas de interés a través del campo público `content`.
- Llama a `effect.on_frame(&mut buffer, some_duration)`.
- Afirma sobre `buffer.content()` — los campos de celda (`fg`, `bg`,
  `modifier`, `symbol`) implementan todos `PartialEq`, así que los buffers
  enteros se comparan con `assert_eq!(a.content(), b.content())`.

El conjunto de tests de `xtop-effect-fade` cubre los casos límite que todo
efecto debería comprobar: `elapsed == 0` (estado inicial), un valor a mitad
de ventana, exactamente la ventana, llamadas repetidas después de la ventana
(estabilidad) y un buffer vacío. `Buffer: Clone` reduce las comprobaciones de
identidad de bytes a una línea:

```rust
let before = buffer.clone();
effect.on_frame(&mut buffer, WINDOW);
assert_eq!(before.content(), buffer.content());
```

## Aterrizar un efecto nuevo en este repositorio

1. Crea `xtop-effect-<name>/` con un manifest que herede los campos del
   workspace (`version.workspace`, `edition.workspace`, ...), dependiendo de
   `ratatui` y de `xtop-effect-api` a través de `[workspace.dependencies]`.
2. Añade el crate a `members` en el `Cargo.toml` raíz.
3. Implementa `Effect`, refleja el patrón de testing anterior y documenta la
   semántica visual exacta en los docs del crate.
4. Añade una entrada de catálogo en `docs/effects.md` y una fila en la tabla
   del README.

El código de helper compartido pertenece a un crate `effects-lib/` — pero
solo cuando un segundo efecto comparta realmente código con uno existente. No
lo crees vacío.
