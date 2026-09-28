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
  private previousRawEnergy = 0;
  private previousRawSub = 0;
  private previousRawBass = 0;
  private slowRawEnergy = 0;
  private buildupMemory = 0;

  reset(): void {
    this.previousRawEnergy = 0;
    this.previousRawSub = 0;
    this.previousRawBass = 0;
    this.slowRawEnergy = 0;
    this.buildupMemory = 0;
  }

  detect(analysis: AudioAnalysis, transient: number, dt = 1 / 60, rawAnalysis: AudioAnalysis = analysis): EventState {
    const normalizedEnergy = clamp(analysis.overallRms * 0.58 + analysis.spectralEnergy * 0.42);
    const rawEnergy = clamp(rawAnalysis.overallRms * 0.62 + rawAnalysis.spectralEnergy * 0.38);
    const rawDelta = rawEnergy - this.previousRawEnergy;
    const subJump = Math.max(0, rawAnalysis.sub - this.previousRawSub);
    const bassJump = Math.max(0, rawAnalysis.bass - this.previousRawBass);

    const slowAlpha = 1 - Math.exp(-dt * 0.9);
    this.slowRawEnergy += (rawEnergy - this.slowRawEnergy) * slowAlpha;
    const trendAboveBaseline = Math.max(0, rawEnergy - this.slowRawEnergy);

    const kick = clamp(analysis.kickLikelihood * 0.72 + analysis.sub * 0.35 + transient * 0.22);
    const snare = clamp(analysis.snareLikelihood * 0.74 + analysis.highMid * 0.22 + transient * 0.3);
    const quiet = clamp((0.2 - normalizedEnergy) * 5);
    const highEnergy = clamp((normalizedEnergy - 0.48) * 1.9 + analysis.bass * 0.25);
    const energyIncrease = clamp(Math.max(0, rawDelta) * 8 + transient * 0.18 + trendAboveBaseline * 1.8);
    const energyDecrease = clamp(Math.max(0, -rawDelta) * 8 + quiet * 0.2);

    const buildInput = clamp(
      trendAboveBaseline * 2.9 +
      Math.max(0, rawDelta) * 4.2 +
      analysis.highMid * 0.18 +
      analysis.high * 0.15 +
      analysis.mid * 0.1 -
      quiet * 0.42,
    );
    const buildupAlpha = 1 - Math.exp(-dt * (buildInput > this.buildupMemory ? 2.8 : 0.7));
    this.buildupMemory += (buildInput - this.buildupMemory) * buildupAlpha;

    const transition = clamp(
      Math.max(0, rawDelta) * 8.5 +
      (subJump + bassJump) * 1.65 +
      rawAnalysis.transient * 0.18 +
      kick * 0.12,
    );
    const drop = clamp(transition * (0.18 + this.buildupMemory * 1.25));

    this.previousRawEnergy = rawEnergy;
    this.previousRawSub = rawAnalysis.sub;
    this.previousRawBass = rawAnalysis.bass;

    if (drop > 0.68) {
      this.buildupMemory *= 0.22;
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
