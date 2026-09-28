import type { AudioAnalysis, BandName } from '../types';

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
      sum += value * value;
      count += 1;
    }
    bandValues[band] = count > 0 ? clamp(Math.sqrt(sum / count)) : 0;
  }

  const overallRms = clamp(Math.sqrt(
    frequencyData.reduce((sum, current) => sum + (current / 255) ** 2, 0) / Math.max(1, frequencyData.length),
  ));
  const peak = clamp(frequencyData.reduce((max, value) => Math.max(max, value / 255), 0));

  const sub = bandValues.sub ?? 0;
  const bass = bandValues.bass ?? 0;
  const lowMid = bandValues.lowMid ?? 0;
  const mid = bandValues.mid ?? 0;
  const highMid = bandValues.highMid ?? 0;
  const high = bandValues.high ?? 0;

  const spectralEnergy = clamp(
    lowMid * 0.18 + mid * 0.24 + highMid * 0.22 + high * 0.14 + overallRms * 0.22,
  );
  const onsetStrength = clamp(peak * 0.48 + spectralEnergy * 0.52);
  const transient = clamp(peak * 0.52 + onsetStrength * 0.34 + highMid * 0.14);

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
    transient,
    kickLikelihood: clamp(sub * 0.7 + bass * 0.55 + peak * 0.15),
    snareLikelihood: clamp(lowMid * 0.35 + mid * 0.35 + highMid * 0.42 + transient * 0.18),
    onsetStrength,
  };
}
