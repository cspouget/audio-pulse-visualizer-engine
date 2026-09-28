import { BAND_NAMES, type AudioAnalysis, type BandName } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class AdaptiveNormalizer {
  private peaks = new Map<BandName, number>();
  private floors = new Map<BandName, number>();
  private overallPeak = 0.12;

  reset(): void {
    this.peaks.clear();
    this.floors.clear();
    this.overallPeak = 0.12;
  }

  normalize(analysis: AudioAnalysis): AudioAnalysis {
    const next = { ...analysis };

    for (const band of BAND_NAMES) {
      const current = analysis[band];
      const previousPeak = this.peaks.get(band) ?? 0.18;
      const previousFloor = this.floors.get(band) ?? 0.01;

      const peak = Math.max(current, previousPeak * 0.9975);
      const floorTarget = Math.min(current, previousFloor + 0.002);
      const floor = previousFloor * 0.995 + floorTarget * 0.005;

      this.peaks.set(band, peak);
      this.floors.set(band, floor);

      if (current < 0.004) {
        next[band] = 0;
        continue;
      }

      const usableRange = Math.max(0.045, peak - floor);
      const normalized = clamp((current - floor) / usableRange);
      next[band] = clamp(normalized * 0.82 + current * 0.18);
    }

    this.overallPeak = Math.max(analysis.overallRms, this.overallPeak * 0.998);
    const loudnessScale = Math.max(0.06, this.overallPeak);
    // Preserve a true silence floor. Adaptive gain should rescue quiet masters,
    // but it must not turn near-silence into sustained medium energy.
    next.overallRms = analysis.overallRms < 0.045
      ? clamp(analysis.overallRms * 2)
      : clamp(analysis.overallRms / loudnessScale);
    next.peak = clamp(analysis.peak / Math.max(0.1, this.overallPeak * 1.15));
    next.spectralEnergy = clamp(
      next.lowMid * 0.18 + next.mid * 0.24 + next.highMid * 0.22 + next.high * 0.14 + next.overallRms * 0.22,
    );
    next.kickLikelihood = clamp(next.sub * 0.72 + next.bass * 0.58 + next.peak * 0.12);
    next.snareLikelihood = clamp(next.lowMid * 0.3 + next.mid * 0.35 + next.highMid * 0.45 + next.transient * 0.15);
    next.onsetStrength = clamp(next.peak * 0.45 + next.spectralEnergy * 0.55);
    next.transient = clamp(next.peak * 0.5 + next.onsetStrength * 0.35 + next.highMid * 0.15);

    return next;
  }
}
