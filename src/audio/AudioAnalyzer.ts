import { computeBandValues } from './FrequencyBands';
import type { AudioAnalysis } from '../types';
import { EMPTY_ANALYSIS } from '../types';

export interface AudioAnalyzerInitOptions {
  audioContext?: AudioContext;
  connectToDestination?: boolean;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaSource: AudioNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private mediaStream: MediaStream | null = null;
  private ownsContext = false;
  private connectedElement: HTMLMediaElement | null = null;

  private prepareContext(context?: AudioContext): AudioContext {
    if (this.audioContext) {
      return this.audioContext;
    }
    this.audioContext = context ?? new AudioContext();
    this.ownsContext = !context;
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.62;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    return this.audioContext;
  }

  async initFromMicrophone(options: AudioAnalyzerInitOptions = {}): Promise<void> {
    this.disconnectSource();
    const context = this.prepareContext(options.audioContext);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    this.mediaSource = context.createMediaStreamSource(stream);
    this.mediaSource.connect(this.analyser!);
    if (options.connectToDestination === true) {
      this.analyser!.connect(context.destination);
    }
  }

  initFromAudioElement(element: HTMLAudioElement, options: AudioAnalyzerInitOptions = {}): void {
    if (this.connectedElement === element && this.mediaSource) {
      return;
    }
    this.disconnectSource();
    const context = this.prepareContext(options.audioContext);
    this.mediaSource = context.createMediaElementSource(element);
    this.connectedElement = element;
    this.mediaSource.connect(this.analyser!);
    if (options.connectToDestination !== false) {
      this.analyser!.connect(context.destination);
    }
  }

  initFromNode(node: AudioNode, options: AudioAnalyzerInitOptions = {}): void {
    this.disconnectSource();
    this.prepareContext(options.audioContext ?? node.context as AudioContext);
    this.mediaSource = node;
    this.mediaSource.connect(this.analyser!);
    if (options.connectToDestination === true) {
      this.analyser!.connect(this.audioContext!.destination);
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  update(): AudioAnalysis {
    if (!this.analyser || !this.frequencyData) {
      return EMPTY_ANALYSIS;
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    return computeBandValues(this.frequencyData, sampleRate, this.analyser.fftSize);
  }

  private disconnectSource(): void {
    try {
      this.mediaSource?.disconnect();
    } catch {
      // Already disconnected.
    }
    try {
      this.analyser?.disconnect();
    } catch {
      // Already disconnected.
    }
    this.mediaSource = null;
    this.connectedElement = null;
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }
  }

  async dispose(): Promise<void> {
    this.disconnectSource();
    this.frequencyData = null;
    this.analyser = null;
    if (this.ownsContext && this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.ownsContext = false;
  }
}
