import * as THREE from 'three';
import type { ReactiveState, VisualizerOptions } from '../types';
import { DEFAULT_VISUALIZER_OPTIONS } from '../types';
import { disposeScene, type VisualizerEnvironment } from './Environment';
import { APV_MIDNIGHT, setSpectralColor } from './SpectralPalette';

export class LiquidEnvironment implements VisualizerEnvironment {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 1000);
  private readonly root = new THREE.Group();
  private readonly surface: THREE.Mesh;
  private readonly fluidPlane: THREE.Mesh;
  private readonly ripples: THREE.Points;
  private readonly surfaceMaterial: THREE.MeshStandardMaterial;
  private readonly fluidMaterial: THREE.MeshStandardMaterial;
  private readonly rippleMaterial: THREE.PointsMaterial;
  private options: VisualizerOptions = { ...DEFAULT_VISUALIZER_OPTIONS };
  private time = 0;

  readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

  constructor(options: Partial<VisualizerOptions> = {}) {
    this.setOptions(options);
    this.renderer.setSize(1, 1, false);
    this.renderer.setClearColor(APV_MIDNIGHT.background);
    this.scene.add(this.root);
    this.camera.position.set(0, 2.6, 8);

    this.scene.add(new THREE.AmbientLight('#5f7dff', 1.1));
    const key = new THREE.DirectionalLight('#d9fbff', 1.9);
    key.position.set(5, 6, 4);
    this.scene.add(key);

    this.surfaceMaterial = new THREE.MeshStandardMaterial({
      color: '#4bd8ff', emissive: '#12205f', metalness: 0.48, roughness: 0.18,
      transparent: true, opacity: 0.9,
    });
    this.surface = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 3), this.surfaceMaterial);
    this.root.add(this.surface);

    this.fluidMaterial = new THREE.MeshStandardMaterial({
      color: '#7b35ff', emissive: '#160d3d', metalness: 0.4, roughness: 0.26,
      transparent: true, opacity: 0.58, side: THREE.DoubleSide,
    });
    this.fluidPlane = new THREE.Mesh(new THREE.PlaneGeometry(18, 18, 32, 32), this.fluidMaterial);
    this.fluidPlane.rotation.x = -Math.PI / 2.2;
    this.fluidPlane.position.y = -1.2;
    this.root.add(this.fluidPlane);

    const geometry = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = -1 + Math.random() * 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rippleMaterial = new THREE.PointsMaterial({ color: '#ff63d8', size: 0.075, transparent: true, opacity: 0.66 });
    this.ripples = new THREE.Points(geometry, this.rippleMaterial);
    this.root.add(this.ripples);
  }

  setOptions(options: Partial<VisualizerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  resize(width: number, height: number, pixelRatio = window.devicePixelRatio): void {
    const safeHeight = Math.max(1, height);
    this.camera.aspect = Math.max(1, width) / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(pixelRatio, this.options.complexity > 1 ? 2 : 1.6));
    this.renderer.setSize(Math.max(1, width), safeHeight, false);
  }

  update(state: ReactiveState, dt: number): void {
    this.time += dt;
    const baseMotion = this.options.reducedMotion ? this.options.motionIntensity * 0.28 : this.options.motionIntensity;
    const { reactivity, energy, events } = state;
    const motion = baseMotion * (1 - events.quiet * 0.72);

    this.surface.rotation.x += dt * motion * (0.12 + reactivity.mid * 0.55);
    this.surface.rotation.y += dt * motion * (0.2 + reactivity.bass * 0.8);
    this.surface.scale.setScalar(1 + motion * (reactivity.bass * 0.42 + reactivity.sub * 0.26));
    this.surface.position.y += ((0.2 + events.kick * 0.5 * motion) - this.surface.position.y) * 0.14;

    this.fluidPlane.scale.setScalar(1 + motion * (reactivity.lowMid * 0.22 + state.motion.flow * 0.28));
    this.fluidPlane.rotation.z += dt * motion * (0.025 + reactivity.mid * 0.16);
    this.fluidPlane.position.y = -1.2 + energy.smoothed * 0.28;
    this.ripples.position.y = -1 + events.transient * 0.35 * motion;
    this.ripples.rotation.y += dt * motion * (0.05 + reactivity.high * 0.24);

    const cameraDist = 8 - events.drop * 0.75 * motion;
    this.camera.position.z += (cameraDist - this.camera.position.z) * 0.07;
    this.camera.position.x += (((state.motion.flow - 0.45) * 1.25 * motion) - this.camera.position.x) * 0.04;
    this.camera.lookAt(0, 0.35, 0);

    if (this.options.palette === 'rainbow') {
      const phase = this.time * 0.014 + reactivity.mid * 0.07;
      setSpectralColor(this.surfaceMaterial.color, phase + 0.5);
      setSpectralColor(this.surfaceMaterial.emissive, phase + 0.67).multiplyScalar(0.28 + events.drop * 0.16);
      setSpectralColor(this.fluidMaterial.color, phase + 0.77);
      setSpectralColor(this.rippleMaterial.color, phase + 0.92);
    }

    this.rippleMaterial.opacity = 0.24 + reactivity.high * 0.36 + events.snare * 0.22;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    disposeScene(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
