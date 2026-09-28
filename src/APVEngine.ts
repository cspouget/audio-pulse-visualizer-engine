import { AudioAnalyzer, type AudioAnalyzerInitOptions } from './audio/AudioAnalyzer';
import { ReactiveBus } from './reactive/ReactiveBus';
import { EMPTY_ANALYSIS, DEFAULT_VISUALIZER_OPTIONS, type AudioAnalysis, type SceneName, type VisualizerOptions } from './types';
import { LiquidEnvironment, TunnelEnvironment, VoidEnvironment, type VisualizerEnvironment } from './visualizers';

export interface APVEngineOptions extends Partial<VisualizerOptions> {
  scene?: SceneName;
  sensitivity?: number;
}

export class APVEngine {
  private readonly analyzer = new AudioAnalyzer();
  private readonly bus = new ReactiveBus();
  private environment: VisualizerEnvironment;
  private sceneName: SceneName;
  private options: VisualizerOptions;
  private sensitivity: number;
  private animationFrame: number | null = null;
  private lastTime = 0;
  private resizeObserver: ResizeObserver | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private destroyed = false;

  constructor(private readonly mountElement: HTMLElement, options: APVEngineOptions = {}) {
    this.sceneName = options.scene ?? 'void';
    this.options = { ...DEFAULT_VISUALIZER_OPTIONS, ...options };
    this.sensitivity = options.sensitivity ?? 1;
    this.environment = this.createEnvironment(this.sceneName);
    this.mountElement.appendChild(this.environment.renderer.domElement);
    this.observeSize();
    this.resize();
  }

  attachAudioElement(element: HTMLAudioElement, options: AudioAnalyzerInitOptions = {}): void {
    this.audioElement = element;
    this.analyzer.initFromAudioElement(element, options);
    this.bus.reset();
  }

  attachAudioNode(node: AudioNode, options: AudioAnalyzerInitOptions = {}): void {
    this.audioElement = null;
    this.analyzer.initFromNode(node, options);
    this.bus.reset();
  }

  async resumeAudio(): Promise<void> {
    await this.analyzer.resume();
  }

  start(): void {
    if (this.animationFrame !== null || this.destroyed) return;
    this.lastTime = performance.now();
    const frame = (time: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (time - this.lastTime) / 1000));
      this.lastTime = time;
      const paused = this.audioElement ? this.audioElement.paused : false;
      const analysis = paused ? EMPTY_ANALYSIS : this.scaleAnalysis(this.analyzer.update());
      const state = this.bus.update(analysis, dt);
      this.environment.update(state, dt);
      this.animationFrame = requestAnimationFrame(frame);
    };
    this.animationFrame = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setScene(scene: SceneName): void {
    if (scene === this.sceneName) return;
    this.environment.dispose();
    this.sceneName = scene;
    this.environment = this.createEnvironment(scene);
    this.mountElement.appendChild(this.environment.renderer.domElement);
    this.resize();
  }

  setOptions(options: APVEngineOptions): void {
    if (options.sensitivity !== undefined) this.sensitivity = Math.max(0.1, Math.min(3, options.sensitivity));
    if (options.scene && options.scene !== this.sceneName) this.setScene(options.scene);
    this.options = { ...this.options, ...options };
    this.environment.setOptions(this.options);
    this.resize();
  }

  getCanvas(): HTMLCanvasElement {
    return this.environment.renderer.domElement;
  }

  private scaleAnalysis(analysis: AudioAnalysis): AudioAnalysis {
    const scale = this.sensitivity;
    const scaled = { ...analysis };
    for (const key of ['sub','bass','lowMid','mid','highMid','high','overallRms','peak','spectralEnergy','transient','kickLikelihood','snareLikelihood','onsetStrength'] as const) {
      scaled[key] = Math.min(1, analysis[key] * scale);
    }
    return scaled;
  }

  private createEnvironment(scene: SceneName): VisualizerEnvironment {
    if (scene === 'liquid') return new LiquidEnvironment(this.options);
    if (scene === 'tunnel') return new TunnelEnvironment(this.options);
    return new VoidEnvironment(this.options);
  }

  private observeSize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mountElement);
  }

  private resize(): void {
    const rect = this.mountElement.getBoundingClientRect();
    this.environment.resize(rect.width || 1, rect.height || 1);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.environment.dispose();
    await this.analyzer.dispose();
  }
}
