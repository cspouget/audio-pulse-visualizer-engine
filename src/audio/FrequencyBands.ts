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

  const onsetStrength = clamp((peak + spectralEnergy * 0.62) / 1.8);
  const transient = clamp((peak * 0.65 + onsetStrength * 0.7 + spectralEnergy * 0.55) / 1.9);

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
    transient,
    kickLikelihood: clamp((sub * 0.85 + bass * 0.65) * 1.2),
    snareLikelihood: clamp((lowMid * 0.55 + mid * 0.45 + highMid * 0.3) * 1.4),
    onsetStrength,
  };
}
