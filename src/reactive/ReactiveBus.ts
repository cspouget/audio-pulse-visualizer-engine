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
    reactivity: {
      sub: 0,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      high: 0,
      overall: 0,
    },
    events: {
      kick: 0,
      snare: 0,
      transient: 0,
      drop: 0,
      energyIncrease: 0,
      energyDecrease: 0,
      quiet: 0,
      highEnergy: 0,
      buildup: 0,
    },
    energy: {
      current: 0,
      smoothed: 0,
      delta: 0,
    },
    motion: {
      impact: 0,
      pressure: 0,
      flow: 0,
      shimmer: 0,
    },
    fps: 60,
  };

  update(analysis: AudioAnalysis, dt: number): ReactiveState {
    const normalized = this.normalizer.normalize(analysis);
    const reactiveBands = buildReactiveBands(normalized);
    const energy = this.energyTracker.update(normalized.overallRms, dt);
    const transient = this.transientDetector.detect(normalized);
    const events = this.beatDetector.detect(normalized, transient);

    const overall = clamp((normalized.sub + normalized.bass + normalized.mid + normalized.high) / 4);

    this.state.reactivity = {
      ...reactiveBands,
      overall,
    };

    this.state.energy = energy;
    this.state.events = { ...events };
    this.state.motion = {
      impact: clamp((events.kick + transient) * 0.9),
      pressure: clamp((normalized.bass + normalized.lowMid) * 0.85),
      flow: clamp((normalized.mid + normalized.highMid) * 0.85),
      shimmer: clamp(normalized.high * 1.2 + transient * 0.35),
    };

    this.state.fps = this.calculateFps(dt);
    return this.state;
  }

  private calculateFps(dt: number) {
    const fps = 1 / Math.max(dt, 0.016);
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > 30) {
      this.fpsSamples.shift();
    }
    const average = this.fpsSamples.reduce((sum, value) => sum + value, 0) / this.fpsSamples.length;
    return clamp(average / 60, 0, 1) * 60;
  }
}
