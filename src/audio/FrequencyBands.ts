import type { BandName, AudioAnalysis } from '../types';

export const FREQUENCY_BANDS: Record<BandName, { min: number; max: number }> = {
  sub: { min: 20, max: 60 },
  bass: { min: 60, max: 180 },
  lowMid: { min: 180, max: 500 },
  mid: { min: 500, max: 2000 },
  highMid: { min: 2000, max: 6000 },
  high: { min: 6000, max: 20000 },
};

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export function getBinIndexForFrequency(frequency: number, sampleRate: number, fftSize: number) {
  const nyquist = sampleRate / 2;
  return Math.min(fftSize / 2 - 1, Math.max(0, (frequency / nyquist) * (fftSize / 2)));
}

export function computeBandValues(frequencyData: Uint8Array, sampleRate: number, fftSize: number): AudioAnalysis {
  const bandValues: Partial<Record<BandName, number>> = {};

  for (const band of Object.keys(FREQUENCY_BANDS) as BandName[]) {
    const { min, max } = FREQUENCY_BANDS[band];
    const minBin = Math.floor(getBinIndexForFrequency(min, sampleRate, fftSize));
    const maxBin = Math.ceil(getBinIndexForFrequency(max, sampleRate, fftSize));

    let sum = 0;
    let count = 0;

    for (let i = minBin; i <= maxBin; i += 1) {
      const value = frequencyData[i] / 255;
      sum += value;
      count += 1;
    }

    const average = count > 0 ? sum / count : 0;
    bandValues[band] = clamp(average * 1.25);
  }

  const overallRms = clamp(
    frequencyData.reduce((sum, current) => sum + (current / 255) ** 2, 0) / frequencyData.length,
  );
  const peak = clamp(
    frequencyData.reduce((max, value) => Math.max(max, value / 255), 0),
  );

  const spectralEnergy = clamp(
    (bandValues.lowMid ?? 0) * 0.2 +
      (bandValues.mid ?? 0) * 0.26 +
      (bandValues.highMid ?? 0) * 0.22 +
      (bandValues.high ?? 0) * 0.14 +
      overallRms * 0.18,
  );

  const sub = bandValues.sub ?? 0;
  const bass = bandValues.bass ?? 0;
  const lowMid = bandValues.lowMid ?? 0;
  const mid = bandValues.mid ?? 0;
  const highMid = bandValues.highMid ?? 0;
  const high = bandValues.high ?? 0;

  return {
    sub,
    bass,
    lowMid,
    mid,
    highMid,
    high,
    overallRms,
    peak,
    spectralEnergy,
    transient: 0,
    kickLikelihood: (sub * 0.85 + bass * 0.65) * 1.2,
    snareLikelihood: (lowMid * 0.55 + mid * 0.45 + highMid * 0.3) * 1.4,
    onsetStrength: clamp((peak + spectralEnergy * 0.62) / 1.8),
  };
}
