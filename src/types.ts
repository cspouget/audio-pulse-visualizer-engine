export const BAND_NAMES = ['sub', 'bass', 'lowMid', 'mid', 'highMid', 'high'] as const;

export type BandName = (typeof BAND_NAMES)[number];
export type ResponseMode = 'smooth' | 'punchy' | 'heavy' | 'elastic' | 'liquid' | 'glitch';

export interface AudioAnalysis {
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  high: number;
  overallRms: number;
  peak: number;
  spectralEnergy: number;
  transient: number;
  kickLikelihood: number;
  snareLikelihood: number;
  onsetStrength: number;
}

export interface EnergyState {
  current: number;
  smoothed: number;
  delta: number;
}

export interface EventState {
  kick: number;
  snare: number;
  transient: number;
  drop: number;
  energyIncrease: number;
  energyDecrease: number;
  quiet: number;
  highEnergy: number;
  buildup: number;
}

export interface ReactiveState {
  reactivity: Record<BandName, number> & { overall: number };
  events: EventState;
  energy: EnergyState;
  motion: {
    impact: number;
    pressure: number;
    flow: number;
    shimmer: number;
  };
  fps: number;
}

export const EMPTY_ANALYSIS: AudioAnalysis = {
  sub: 0,
  bass: 0,
  lowMid: 0,
  mid: 0,
  highMid: 0,
  high: 0,
  overallRms: 0,
  peak: 0,
  spectralEnergy: 0,
  transient: 0,
  kickLikelihood: 0,
  snareLikelihood: 0,
  onsetStrength: 0,
};
