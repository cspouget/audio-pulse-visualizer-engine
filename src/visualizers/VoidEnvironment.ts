import * as THREE from 'three';
import type { ReactiveState, VisualizerOptions } from '../types';
import { DEFAULT_VISUALIZER_OPTIONS } from '../types';
import { disposeScene, type VisualizerEnvironment } from './Environment';
import { APV_MIDNIGHT, setSpectralColor } from './SpectralPalette';

export class VoidEnvironment implements VisualizerEnvironment {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(52, 1, 0.1, 1000);
  private readonly root = new THREE.Group();
  private readonly shellMaterial: THREE.MeshStandardMaterial;
  private readonly haloMaterial: THREE.MeshBasicMaterial;
  private readonly particleMaterial: THREE.PointsMaterial;
  private readonly shell: THREE.Mesh;
  private readonly halo: THREE.Mesh;
  private readonly particles: THREE.Points;
  private options: VisualizerOptions = { ...DEFAULT_VISUALIZER_OPTIONS };
  private time = 0;

  readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });

  constructor(options: Partial<VisualizerOptions> = {}) {
    this.setOptions(options);
    this.renderer.setSize(1, 1, false);
    this.renderer.setClearColor(APV_MIDNIGHT.background);
    this.scene.add(this.root);
    this.camera.position.set(0, 0.5, 7);

    const ambient = new THREE.AmbientLight('#6d72ff', 0.85);
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(4, 4, 6);
    this.scene.add(ambient, key);

    this.shellMaterial = new THREE.MeshStandardMaterial({
      color: '#8a7dff', emissive: '#241052', metalness: 0.58, roughness: 0.22,
      transparent: true, opacity: 0.94,
    });
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 2), this.shellMaterial);
    this.root.add(this.shell);

    this.haloMaterial = new THREE.MeshBasicMaterial({
      color: '#35f2ff', transparent: true, opacity: 0.34, side: THREE.DoubleSide,
    });
    this.halo = new THREE.Mesh(new THREE.TorusKnotGeometry(2.2, 0.28, 140, 24), this.haloMaterial);
    this.halo.rotation.x = Math.PI / 2.4;
    this.root.add(this.halo);

    const particleGeometry = new THREE.BufferGeometry();
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMaterial = new THREE.PointsMaterial({ color: '#f7f8ff', size: 0.045, transparent: true, opacity: 0.76 });
    this.particles = new THREE.Points(particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
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
    this.shell.rotation.x += dt * motion * (0.22 + reactivity.mid * 1.4);
    this.shell.rotation.y += dt * motion * (0.42 + reactivity.highMid * 1.2);
    this.shell.scale.setScalar(1 + motion * (reactivity.bass * 0.68 + reactivity.sub * 0.42 + events.kick * 0.15));
    this.shell.position.z = -0.25 + motion * state.motion.impact * 1.1;

    this.halo.scale.setScalar(1 + motion * (state.motion.pressure * 0.55 + events.drop * 0.65));
    this.halo.rotation.z += dt * motion * (0.18 + state.motion.flow * 1.7);
    this.particles.rotation.y += dt * motion * (0.035 + state.motion.shimmer * 0.42);

    const cameraDepth = 7 - motion * (events.kick * 0.45 + events.drop * 0.8);
    this.camera.position.z += (cameraDepth - this.camera.position.z) * 0.1;
    this.camera.position.x += (((state.motion.flow - 0.45) * 0.9 * motion) - this.camera.position.x) * 0.05;
    this.camera.position.y += (((state.motion.pressure - 0.42) * 0.65 * motion + 0.3) - this.camera.position.y) * 0.05;
    this.camera.lookAt(0, 0, 0);

    if (this.options.palette === 'rainbow') {
      const phase = this.time * 0.018 + reactivity.high * 0.08;
      setSpectralColor(this.shellMaterial.color, phase + 0.72);
      setSpectralColor(this.shellMaterial.emissive, phase + 0.84).multiplyScalar(0.3 + events.drop * 0.18);
      setSpectralColor(this.haloMaterial.color, phase + 0.48);
      setSpectralColor(this.particleMaterial.color, phase + 0.92);
    }

    this.haloMaterial.opacity = 0.16 + energy.smoothed * 0.2 + events.snare * 0.16;
    this.particleMaterial.opacity = 0.28 + reactivity.high * 0.45 + events.snare * 0.18;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    disposeScene(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
