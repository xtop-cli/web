# Effect contract — `xtop-effect-api`

`xtop-effect-api` (`api/crates/effect-api/src/lib.rs`) defines the shared
effect contract (DR-5). Effects are **stateful, full-buffer visual
transitions** that the kernel applies to every rendered frame — intro
animations, fade-ins, wipes, post-processing over the whole terminal
picture.

The crate is minimal on purpose (decision D4): exactly two public items —
`Effect` and `EffectManifest`. No registration glue type exists yet; one is
added when the kernel wiring (M5) needs it. The crate depends only on
ratatui (for the `Buffer` type) and never on the kernel.

## The contract

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

`EffectManifest` is plain `'static` data (ids/names are compile-time
constants), so manifests compare equal across copies of the same effect —
the in-crate tests assert `PartialEq` on them. `Effect` requires `Send +
Sync` (the kernel may host it behind a shared handle) and gives the effect
full ownership of its own state: everything an effect needs to remember
lives on `self`.

## Host contract (who calls what, when)

The crate docs define the host side precisely, and the kernel (M5.3, feature
gated) is expected to implement exactly this:

1. **`on_frame` runs on every rendered frame**, after widgets and layout
   have been drawn into the ratatui buffer and **before** the terminal
   flush. The effect may rewrite any cell of `buffer`.
2. **`elapsed` is the time since the effect started** — not the frame
   delta. An effect that must converge after e.g. 800 ms keys off
   `elapsed >= 800ms`, regardless of how many frames it took.
3. **Effects are stateful across frames**: they keep whatever progress they
   need on `self` between calls; the host does not persist any state for
   them.
4. **The host does not pace frames**: it ticks at ~1 s cadence plus ad-hoc
   repaints (key presses, layout changes). Visual transitions must therefore
   advance by wall-clock time (`elapsed`), **never by frame count alone** —
   a frame-count-based fade would crawl or jump depending on repaint luck.

There is no renderer contract beyond the buffer: the effect sees the final
composed picture (overlays included, once drawn) and rewrites it in place.

## Implementing an effect

An effect is a struct implementing the trait, holding its progress, and a
test that drives fake frames. The in-crate test doubles
(`FrameCounter`) is the reference pattern: a struct with plain state, a
`const` manifest, and a body that mutates `self` per call.

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

Drive it with synthetic frames in tests — hand the effect a
`Buffer::empty(Rect::new(0, 0, w, h))` and increasing `Duration`s, then
assert on buffer convergence or on your own counters (the in-crate
`FrameCounter` test is the pattern). Never depend on real frame pacing in
tests or in the effect itself.

## Status

- **Contract**: done in this crate (M1.6), with crate docs stating the host
  contract above.
- **Implementations**: none yet. The `effects` repo is a live repo with no
  crates; the first real effect (`xtop-effect-fade`) and the kernel's
  feature-gated `EffectHost` wiring are milestone M5.
- **Consumers**: none in the wild yet — the crate is validated by its own
  tests until M5. No effect may assume a pacing guarantee beyond the host
  contract above.
