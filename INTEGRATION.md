# Integration Guide

## Purpose

This document explains how another developer or AI coding agent can integrate the APV engine into an existing application without rebuilding the app or replacing any current experience.

## Integration model

Treat the engine as a modular visualization layer that accepts audio data and publishes semantic visual values. The host app remains in charge of application state, authentication, routing, content, and layouts.

## Required integration steps

1. Create a canvas or WebGL mount point in the target app.
2. Initialize the engine from the host app's audio source:
   - Audio element
   - microphone input
   - a shared `MediaStream`
   - an existing audio graph already used by the app
3. Connect the host audio graph to `AudioAnalyzer`.
4. Create a `ReactiveBus` instance and feed it the analyzer output.
5. Create one or more visualizer classes and bind them to the shared reactive state.
6. Keep render state in the engine internals rather than host React state.

## Recommended API contracts

The main boundary is simple:

- `AudioAnalyzer.update()` returns normalized analysis values
- `ReactiveBus.update(analysis, dt)` produces semantic reactive state
- visualizers subscribe to that state and update scene objects only

Do not let each visualizer re-run FFT math or build its own independent audio pipeline.

## App responsibilities

The host app should continue to own:

- user interface
- navigation
- content management
- analytics or logging
- playback controls
- any non-visual business logic

The engine should own:

- audio analysis
- adaptive normalization
- event detection
- reactive state bus
- render loop
- visual scene management
- debug overlay

## Minimal adapter example

```ts
import { AudioAnalyzer } from './audio/AudioAnalyzer';
import { ReactiveBus } from './reactive/ReactiveBus';
import { VoidEnvironment } from './visualizers/VoidEnvironment';

const audio = new AudioAnalyzer();
const bus = new ReactiveBus();
const scene = new VoidEnvironment();

await audio.initFromAudioElement(existingAudioElement);

function frame() {
  const analysis = audio.update();
  const reactiveState = bus.update(analysis, 1 / 60);
  scene.update(reactiveState, 1 / 60);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

## Constraints

- keep all render state local to the visual engine
- never expose raw FFT bins to visualizers
- use semantic values such as `reactivity.bass`, `events.kick`, `motion.impact`
- keep performance debug overlays enabled during integration testing
- avoid forcing all visualizers to animate at the same intensity all the time

## Safety rules

- if host playback is paused, visualizers should gracefully reduce motion
- if audio permissions are denied, fallback behavior should still render a calm preview state
- if the host app changes layout or DOM size, resize the renderer and scene camera

This module is intended for high-quality integration, not app replacement.
