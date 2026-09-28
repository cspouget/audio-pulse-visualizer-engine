import { BAND_NAMES, type AudioAnalysis, type EventState } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class EnergyTracker {
  private smoothed = 0;
  private previous = 0;

  update(value: number, dt: number) {
    const alpha = 1 - Math.exp(-dt * 8.5);
    this.smoothed = this.smoothed * (1 - alpha) + value * alpha;
    const delta = value - this.previous;
    this.previous = value;
    return {
      current: clamp(value),
      smoothed: clamp(this.smoothed),
      delta: Math.max(-1, Math.min(1, delta * 3)),
    };
  }
}

export class TransientDetector {
  private previousRms = 0;

  detect(analysis: AudioAnalysis) {
    const delta = Math.max(0, analysis.overallRms - this.previousRms);
    const onset = clamp(analysis.onsetStrength * 0.55 + delta * 2.4 + analysis.transient * 0.45);
    this.previousRms = analysis.overallRms;
    return onset;
  }
}

export class BeatDetector {
  private previousEnergy = 0;
  private buildupMemory = 0;

  reset(): void {
    this.previousEnergy = 0;
    this.buildupMemory = 0;
  }

  detect(analysis: AudioAnalysis, transient: number, dt = 1 / 60): EventState {
    const energy = clamp(analysis.overallRms * 0.58 + analysis.spectralEnergy * 0.42);
    const delta = energy - this.previousEnergy;
    this.previousEnergy = energy;

    const kick = clamp(analysis.kickLikelihood * 0.72 + analysis.sub * 0.35 + transient * 0.22);
    const snare = clamp(analysis.snareLikelihood * 0.74 + analysis.highMid * 0.22 + transient * 0.3);
    const quiet = clamp((0.2 - energy) * 5);
    const highEnergy = clamp((energy - 0.48) * 1.9 + analysis.bass * 0.25);
    const energyIncrease = clamp(Math.max(0, delta) * 7 + transient * 0.24);
    const energyDecrease = clamp(Math.max(0, -delta) * 7 + quiet * 0.2);

    const buildInput = clamp(
      Math.max(0, delta) * 5 +
      analysis.highMid * 0.34 +
      analysis.high * 0.26 +
      transient * 0.2 -
      analysis.sub * 0.18 -
      quiet * 0.35,
    );
    const buildupAlpha = 1 - Math.exp(-dt * (buildInput > this.buildupMemory ? 4.2 : 1.25));
    this.buildupMemory += (buildInput - this.buildupMemory) * buildupAlpha;

    const drop = clamp(
      this.buildupMemory * 0.55 +
      Math.max(0, delta) * 5.5 +
      analysis.sub * 0.5 +
      kick * 0.38 -
      quiet * 0.8,
    );

    if (drop > 0.72) {
      this.buildupMemory *= 0.35;
    }

    return {
      kick,
      snare,
      transient: clamp(transient),
      drop,
      energyIncrease,
      energyDecrease,
      quiet,
      highEnergy,
      buildup: clamp(this.buildupMemory),
    };
  }
}

export function buildReactiveBands(analysis: AudioAnalysis) {
  const reactive: Record<(typeof BAND_NAMES)[number], number> = {
    sub: clamp(analysis.sub * 1.06),
    bass: clamp(analysis.bass * 1.04),
    lowMid: clamp(analysis.lowMid),
    mid: clamp(analysis.mid),
    highMid: clamp(analysis.highMid * 1.02),
    high: clamp(analysis.high * 1.08),
  };
  return reactive;
}
