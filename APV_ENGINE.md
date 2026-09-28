# Audio Pulse Visualizer Engine

This repository contains the modular foundation for an audio-reactive rendering engine designed to sit alongside an existing application without replacing its current behavior.

## Architecture

The engine is structured as a layered pipeline:

Audio -> Analysis -> Normalization -> Musical Events -> Reactive Signals -> Motion Physics -> Visual Parameters -> Renderer

Core modules are intentionally separated to keep the audio pipeline, reactive system, and rendering layer independent.

## Signal ranges

The engine operates on normalized 0–1 signals derived from frequency analysis rather than raw FFT bins. Frequency energy is grouped into:

- sub: 20–60Hz
- bass: 60–180Hz
- lowMid: 180–500Hz
- mid: 500–2000Hz
- highMid: 2000–6000Hz
- high: 6000–20000Hz

Each band produces a normalized reactive signal that is later tuned by adaptive gain, attack, decay, and response curves.

## Event behavior

Events are semantic and not just amplitude triggers. The engine seeks for:

- kicks
- snares
- strong transients
- energy increase and decrease
- quiet sections
- high-energy sections
- possible build-up and drop moments

Events are weighted on a 0–1 scale and used to trigger larger motion behavior without forcing every visual parameter to react at once.

## Visual mapping

The visual layer consumes semantic data from a central bus rather than each visualizer re-implementing its own analysis logic.

Recommended mapping from the bus:

- reactivity.sub: large geometry, low-frequency motion
- reactivity.bass: environment scale and impact
- reactivity.mid: surface motion, camera drift
- reactivity.high: detail, sparkle, grain, shimmer
- events.kick: impact shockwave and camera push
- events.snare: directional flashes and local contrast
- events.transient: sudden acceleration and detail bursts
- energy.smoothed: overall scene intensity
- motion.impact / pressure / flow / shimmer: physics state values for motion layers

## Performance strategy

- keep animation state outside React state
- use requestAnimationFrame for all time steps
- avoid per-frame allocations in hot loops
- reuse geometry/material instances where possible
- favor instanced particle systems and a single shared renderer
- perform debug metrics in a lightweight overlay
- keep the render graph deliberate and GPU-aware

## How to create another visualizer

1. Implement a class that follows the same update contract: `update(reactiveState, dt)`.
2. Keep world transforms in scene graph local state rather than React props.
3. Use semantic bus values instead of raw FFT bins.
4. Use a visual hierarchy: background, midground, foreground.
5. Drive only the properties that match the signal domain.

## Integration guidance

This module is intentionally designed to be dropped into an existing application as a reusable engine layer instead of a full app replacement.

The engine should be mounted in a client-only canvas or WebGL container and connected to the host app's media source via `AudioContext` or an existing audio element.

---

This is the v1 foundation layer. It establishes the architecture, the normalized reactive signal conventions, and the modular entry points for a larger APV visual system.
