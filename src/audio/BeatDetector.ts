import { BAND_NAMES, type AudioAnalysis } from '../types';

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
      delta: clamp(delta * 2.4),
    };
  }
}

export class TransientDetector {
  private previousRms = 0;

  detect(analysis: AudioAnalysis) {
    const delta = Math.max(0, analysis.overallRms - this.previousRms);
    const onset = clamp(analysis.onsetStrength * 0.78 + delta * 2.6 + analysis.peak * 0.7);
    this.previousRms = analysis.overallRms;
    return onset;
  }
}

export class BeatDetector {
  detect(analysis: AudioAnalysis, transient: number) {
    const kick = clamp(analysis.kickLikelihood * 1.3 + analysis.sub * 0.45 + transient * 0.25);
    const snare = clamp(analysis.snareLikelihood * 1.25 + analysis.mid * 0.5 + transient * 0.2);
    const energyIncrease = clamp(Math.max(0, analysis.overallRms - 0.35) * 1.8 + transient * 0.55);
    const energyDecrease = clamp(Math.max(0, 0.5 - analysis.overallRms) * 2.2);
    const quiet = clamp(1 - Math.min(1, analysis.overallRms * 1.8 + analysis.spectralEnergy * 0.8));
    const highEnergy = clamp(analysis.overallRms * 1.4 + analysis.spectralEnergy * 0.9);
    const buildup = clamp((analysis.sub + analysis.bass + analysis.lowMid) * 0.5 - quiet * 0.7 + transient * 0.25);
    const drop = clamp((analysis.high * 0.35 + (1 - analysis.overallRms) * 0.9) * 1.1);

    return {
      kick,
      snare,
      transient: clamp(transient),
      drop,
      energyIncrease,
      energyDecrease,
      quiet,
      highEnergy,
      buildup,
      kickEnergy: kick,
      snareEnergy: snare,
    };
  }
}

export function buildReactiveBands(analysis: AudioAnalysis) {
  const reactive: Record<(typeof BAND_NAMES)[number], number> = {
    sub: clamp(analysis.sub * 1.2),
    bass: clamp(analysis.bass * 1.15),
    lowMid: clamp(analysis.lowMid * 1.12),
    mid: clamp(analysis.mid * 1.08),
    highMid: clamp(analysis.highMid * 1.12),
    high: clamp(analysis.high * 1.2),
  };

  return reactive;
}
