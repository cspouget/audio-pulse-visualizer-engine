import type { BandName, AudioAnalysis } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class AdaptiveNormalizer {
  private baseline = new Map<BandName, number>();

  normalize(analysis: AudioAnalysis): AudioAnalysis {
    const next = { ...analysis };

    const bandNames: BandName[] = ['sub', 'bass', 'lowMid', 'mid', 'highMid', 'high'];

    for (const band of bandNames) {
      const previous = this.baseline.get(band) ?? 0.14;
      const current = analysis[band];
      const smoothed = previous * 0.96 + current * 0.04;
      this.baseline.set(band, smoothed);

      const adaptiveGain = 1 + Math.max(0, analysis.overallRms - 0.14) * 2.4;
      const centered = (current - smoothed * 0.72) * adaptiveGain;
      next[band] = clamp(centered * 1.4 + current * 0.25);
    }

    const energyBoost = 1 + Math.max(0, analysis.overallRms - 0.12) * 2.4;
    next.overallRms = clamp(analysis.overallRms * energyBoost);
    next.peak = clamp(analysis.peak * 1.2);
    next.spectralEnergy = clamp(analysis.spectralEnergy * 1.18);
    next.kickLikelihood = clamp((analysis.kickLikelihood + next.sub * 0.6) * 0.9);
    next.snareLikelihood = clamp((analysis.snareLikelihood + next.mid * 0.45) * 0.9);
    next.onsetStrength = clamp((analysis.onsetStrength + next.highMid * 0.35) * 0.9);

    return next;
  }
}
