# Contrato de efectos — `xtop-effect-api`

`xtop-effect-api` (`api/crates/effect-api/src/lib.rs`) define el contrato de
efectos compartido (DR-5). Los efectos son **transiciones visuales de buffer
completo y con estado** que el kernel aplica a cada frame renderizado —
animaciones de intro, fundidos de entrada, cortinillas, post-procesado sobre
toda la imagen del terminal.

El crate es mínimo a propósito (decisión D4): exactamente dos elementos
públicos — `Effect` y `EffectManifest`. Todavía no existe ningún tipo de
pegamento de registro; se añadirá uno cuando el cableado del kernel (M5) lo
necesite. El crate depende solo de ratatui (por el tipo `Buffer`) y nunca del
kernel.

## El contrato

```rust
pub struct EffectManifest {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
}
// derives Debug, Clone, PartialEq, Eq

pub trait Effect: Send + Sync {
    /// Static metadata about this effect.
    fn manifest(&self) -> EffectManifest;

    /// Transform the next rendered frame.
    fn on_frame(&mut self, buffer: &mut ratatui::buffer::Buffer, elapsed: std::time::Duration);
}
```

`EffectManifest` son datos `'static` planos (los ids/nombres son constantes
de tiempo de compilación), así que los manifests se comparan iguales entre
copias del mismo efecto — los tests dentro del crate afirman `PartialEq`
sobre ellos. `Effect` exige `Send + Sync` (el kernel puede alojarlo tras un
handle compartido) y otorga al efecto la propiedad completa de su propio
estado: todo lo que un efecto necesita recordar vive en `self`.

## Contrato del host (quién llama a qué, y cuándo)

Los docs del crate definen con precisión el lado del host, y se espera que el
kernel (M5.3, tras una feature) implemente exactamente esto:

1. **`on_frame` se ejecuta en cada frame renderizado**, después de que los
   widgets y el layout se hayan dibujado en el buffer de ratatui y **antes**
   del flush del terminal. El efecto puede reescribir cualquier celda de
   `buffer`.
2. **`elapsed` es el tiempo desde que el efecto empezó** — no el delta de
   frame. Un efecto que deba converger después de p. ej. 800 ms se rige por
   `elapsed >= 800ms`, sin importar cuántos frames haya hecho falta.
3. **Los efectos tienen estado entre frames**: conservan en `self` todo el
   progreso que necesiten entre llamadas; el host no persiste ningún estado
   por ellos.
4. **El host no marca el ritmo de los frames**: hace tick a una cadencia de
   ~1 s más repintados ad-hoc (pulsaciones de tecla, cambios de layout). Las
   transiciones visuales deben por tanto avanzar según el tiempo de
   pared (`elapsed`), **nunca solo por el número de frames** — un fundido
   basado en el recuento de frames se arrastraría o saltaría según la suerte
   de los repintados.

No hay contrato de renderizado más allá del buffer: el efecto ve la imagen
final compuesta (superposiciones incluidas, una vez dibujadas) y la
reescribe en el sitio.

## Implementar un efecto

Un efecto es un struct que implementa el trait, conserva su progreso, y un
test que impulsa frames falsos. El doble de test dentro del crate
(`FrameCounter`) es el patrón de referencia: un struct con estado simple, un
manifest `const`, y un cuerpo que muta `self` por llamada.

```rust
use std::time::Duration;
use ratatui::buffer::Buffer;
use ratatui::style::Color;
use xtop_effect_api::{Effect, EffectManifest};

/// Fade the frame content toward the background color over ~800 ms.
pub struct FadeIn {
    started: Option<Duration>,
}

impl Default for FadeIn {
    fn default() -> Self {
        Self { started: None }
    }
}

impl Effect for FadeIn {
    fn manifest(&self) -> EffectManifest {
        EffectManifest {
            id: "fade-in",
            name: "Fade in",
            description: "fades the first rendered frames in",
        }
    }

    fn on_frame(&mut self, buffer: &mut Buffer, elapsed: Duration) {
        // Wall-clock progress since this effect started (first call seen).
        let start = *self.started.get_or_insert(elapsed);
        let t = (elapsed.saturating_sub(start).as_secs_f32() / 0.8).clamp(0.0, 1.0);

        for cell in buffer.content.iter_mut() {
            // Blend each RGB foreground toward the cell's background.
            if let (Color::Rgb(fr, fg, fb), Color::Rgb(br, bg, bb)) = (cell.fg, cell.bg) {
                let mix = |a: u8, b: u8| (a as f32 + (b as f32 - a as f32) * t) as u8;
                cell.fg = Color::Rgb(mix(fr, br), mix(fg, bg), mix(fb, bb));
            }
        }
    }
}
```

Impúlsalo con frames sintéticos en los tests — pásale al efecto un
`Buffer::empty(Rect::new(0, 0, w, h))` y `Duration`s crecientes, y luego
afirma sobre la convergencia del buffer o sobre tus propios contadores (el
test `FrameCounter` dentro del crate es el patrón). Nunca dependas del ritmo
real de frames en los tests ni en el propio efecto.

## Estado

- **Contrato**: hecho en este crate (M1.6), con los docs del crate
  estableciendo el contrato del host anterior.
- **Implementaciones**: ninguna todavía. El repo `effects` es un repo vivo
  sin crates; el primer efecto real (`xtop-effect-fade`) y el `EffectHost`
  del kernel detrás de una feature son el hito M5.
- **Consumidores**: ninguno en la naturaleza todavía — el crate se valida con
  sus propios tests hasta M5. Ningún efecto puede asumir una garantía de
  ritmo más allá del contrato del host anterior.
