import { computeBandValues } from './FrequencyBands';
import type { AudioAnalysis } from '../types';
import { EMPTY_ANALYSIS } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private demoOscillators: OscillatorNode[] = [];
  private demoGain: GainNode | null = null;

  async initFromMicrophone(): Promise<void> {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaSource = this.audioContext.createMediaStreamAudioSource(stream);
    this.mediaSource.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  initFromAudioElement(element: HTMLAudioElement): void {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.mediaSource = this.audioContext.createMediaElementAudioSource(element);
    this.mediaSource.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  startDemoSource(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

    this.demoGain = this.audioContext.createGain();
    this.demoGain.gain.value = 0.15;
    this.demoGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    const time = this.audioContext.currentTime;

    const subOsc = this.audioContext.createOscillator();
    subOsc.frequency.value = 45;
    subOsc.type = 'sine';
    const subGain = this.audioContext.createGain();
    subGain.gain.value = 0.08;
    subOsc.connect(subGain);
    subGain.connect(this.demoGain);
    subOsc.start();
    this.demoOscillators.push(subOsc);

    const bassOsc = this.audioContext.createOscillator();
    bassOsc.frequency.value = 110;
    bassOsc.type = 'sine';
    const bassGain = this.audioContext.createGain();
    bassGain.gain.value = 0.12;
    bassOsc.connect(bassGain);
    bassGain.connect(this.demoGain);
    bassOsc.start();
    this.demoOscillators.push(bassOsc);

    const kickEnv = this.audioContext.createGain();
    kickEnv.gain.setValueAtTime(0.2, time);
    kickEnv.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    setTimeout(
      () => {
        kickEnv.gain.setValueAtTime(0.2, this.audioContext!.currentTime);
        kickEnv.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.08);
      },
      1600,
    );

    const kickOsc = this.audioContext.createOscillator();
    kickOsc.frequency.setValueAtTime(220, time);
    kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.15);
    kickOsc.connect(kickEnv);
    kickEnv.connect(this.demoGain);
    kickOsc.start();
    this.demoOscillators.push(kickOsc);
  }

  update(): AudioAnalysis {
    if (!this.analyser || !this.frequencyData) {
      return EMPTY_ANALYSIS;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    const analysis = computeBandValues(this.frequencyData, sampleRate, this.analyser.fftSize);

    return analysis;
  }
}
