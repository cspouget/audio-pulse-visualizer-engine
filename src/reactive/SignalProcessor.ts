import { Envelope } from './Envelope';
import { Spring } from './Spring';
import type { ResponseMode } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

interface SignalConfig {
  attack?: number;
  hold?: number;
  decay?: number;
  release?: number;
  threshold?: number;
  gain?: number;
  springStiffness?: number;
  springDamping?: number;
  responseMode?: ResponseMode;
  smoothing?: number;
}

export class SignalProcessor {
  private envelope: Envelope;
  private spring: Spring;
  private smoothing: number;
  private responseMode: ResponseMode;
  private smoothedValue = 0;

  constructor(config: SignalConfig = {}) {
    this.envelope = new Envelope(
      config.attack ?? 0.08,
      config.hold ?? 0.12,
      config.decay ?? 0.22,
      config.release ?? 0.28,
      config.threshold ?? 0.08,
      config.gain ?? 1.0,
    );

    this.spring = new Spring(config.springStiffness ?? 38, config.springDamping ?? 12);
    this.smoothing = config.smoothing ?? 0.92;
    this.responseMode = config.responseMode ?? 'smooth';
  }

  process(input: number, dt: number): number {
    let value = this.envelope.update(input, dt);

    switch (this.responseMode) {
      case 'punchy': {
        value = Math.pow(value, 1.4);
        break;
      }
      case 'heavy': {
        value = Math.pow(value, 0.65);
        break;
      }
      case 'elastic': {
        value = this.spring.update(value, dt);
        break;
      }
      case 'liquid': {
        this.smoothedValue = this.smoothedValue * 0.88 + value * 0.12;
        value = this.smoothedValue;
        break;
      }
      case 'glitch': {
        value = Math.round(value * 8) / 8 + (Math.random() - 0.5) * 0.08;
        break;
      }
      case 'smooth':
      default: {
        this.smoothedValue = this.smoothedValue * this.smoothing + value * (1 - this.smoothing);
        value = this.smoothedValue;
      }
    }

    return clamp(value);
  }
}
