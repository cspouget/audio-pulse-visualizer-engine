import { AdaptiveNormalizer } from '../audio/AdaptiveNormalizer';
import { BeatDetector, EnergyTracker, TransientDetector, buildReactiveBands } from '../audio/BeatDetector';
import type { AudioAnalysis, ReactiveState } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class ReactiveBus {
  private normalizer = new AdaptiveNormalizer();
  private energyTracker = new EnergyTracker();
  private transientDetector = new TransientDetector();
  private beatDetector = new BeatDetector();
  private fpsSamples: number[] = [];

  private state: ReactiveState = {
    reactivity: { sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0, overall: 0 },
    events: {
      kick: 0, snare: 0, transient: 0, drop: 0, energyIncrease: 0,
      energyDecrease: 0, quiet: 0, highEnergy: 0, buildup: 0,
    },
    energy: { current: 0, smoothed: 0, delta: 0 },
    motion: { impact: 0, pressure: 0, flow: 0, shimmer: 0 },
    fps: 60,
  };

  reset(): void {
    this.normalizer.reset();
    this.beatDetector.reset();
    this.fpsSamples = [];
  }

  update(analysis: AudioAnalysis, dt: number): ReactiveState {
    const normalized = this.normalizer.normalize(analysis);
    const reactiveBands = buildReactiveBands(normalized);
    const energy = this.energyTracker.update(normalized.overallRms, dt);
    const transient = this.transientDetector.detect(normalized);
    const events = this.beatDetector.detect(normalized, transient, dt);
    const overall = clamp(
      normalized.sub * 0.18 + normalized.bass * 0.2 + normalized.lowMid * 0.14 +
      normalized.mid * 0.18 + normalized.highMid * 0.16 + normalized.high * 0.14,
    );

    this.state.reactivity = { ...reactiveBands, overall };
    this.state.energy = energy;
    this.state.events = events;
    this.state.motion = {
      impact: clamp(events.kick * 0.68 + events.transient * 0.25 + events.drop * 0.42),
      pressure: clamp(normalized.sub * 0.35 + normalized.bass * 0.5 + events.drop * 0.2),
      flow: clamp(normalized.mid * 0.45 + normalized.highMid * 0.35 + energy.smoothed * 0.18),
      shimmer: clamp(normalized.high * 0.72 + normalized.highMid * 0.2 + events.snare * 0.25),
    };
    this.state.fps = this.calculateFps(dt);
    return this.state;
  }

  private calculateFps(dt: number) {
    const fps = 1 / Math.max(dt, 0.001);
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > 30) this.fpsSamples.shift();
    const average = this.fpsSamples.reduce((sum, value) => sum + value, 0) / this.fpsSamples.length;
    return Math.min(120, average);
  }
}
