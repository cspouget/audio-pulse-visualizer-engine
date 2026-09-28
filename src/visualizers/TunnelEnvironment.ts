import * as THREE from 'three';
import type { ReactiveState, VisualizerOptions } from '../types';
import { DEFAULT_VISUALIZER_OPTIONS } from '../types';
import { disposeScene, type VisualizerEnvironment } from './Environment';

export class TunnelEnvironment implements VisualizerEnvironment {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  private readonly root = new THREE.Group();
  private readonly tunnel: THREE.Mesh;
  private readonly rings = new THREE.Group();
  private readonly particles: THREE.Points;
  private readonly tunnelMaterial: THREE.MeshStandardMaterial;
  private readonly ringMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly particleMaterial: THREE.PointsMaterial;
  private options: VisualizerOptions = { ...DEFAULT_VISUALIZER_OPTIONS };
  private time = 0;

  readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

  constructor(options: Partial<VisualizerOptions> = {}) {
    this.setOptions(options);
    this.renderer.setSize(1, 1, false);
    this.renderer.setClearColor('#010104');
    this.scene.add(this.root);

    this.scene.add(new THREE.AmbientLight('#615cff', 0.85));
    const spot = new THREE.SpotLight('#66f5ff', 2.6);
    spot.position.set(0, 0, 20);
    spot.target.position.set(0, 0, -50);
    this.scene.add(spot, spot.target);

    this.tunnelMaterial = new THREE.MeshStandardMaterial({
      color: '#151b54', emissive: '#090b24', metalness: 0.36, roughness: 0.34,
      transparent: true, opacity: 0.86, side: THREE.DoubleSide,
    });
    this.tunnel = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 100, 32, 24), this.tunnelMaterial);
    this.tunnel.rotation.x = Math.PI / 2;
    this.root.add(this.tunnel);

    for (let i = 0; i < 12; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: '#4bd8ff', emissive: '#35145f', metalness: 0.62, roughness: 0.18,
        transparent: true, opacity: 0.72,
      });
      this.ringMaterials.push(material);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.14, 12, 72), material);
      ring.position.z = i * -8;
      this.rings.add(ring);
    }
    this.root.add(this.rings);

    const geometry = new THREE.BufferGeometry();
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.75 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = Math.random() * -100;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMaterial = new THREE.PointsMaterial({ color: '#ff56c7', size: 0.055, transparent: true, opacity: 0.62 });
    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.root.add(this.particles);
  }

  setOptions(options: Partial<VisualizerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  resize(width: number, height: number, pixelRatio = window.devicePixelRatio): void {
    const safeHeight = Math.max(1, height);
    this.camera.aspect = Math.max(1, width) / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(pixelRatio, this.options.complexity > 1 ? 2 : 1.5));
    this.renderer.setSize(Math.max(1, width), safeHeight, false);
  }

  update(state: ReactiveState, dt: number): void {
    this.time += dt;
    const motion = this.options.reducedMotion ? this.options.motionIntensity * 0.28 : this.options.motionIntensity;
    const { reactivity, energy, events } = state;

    const tunnelScale = 1 + motion * (reactivity.bass * 0.2 + reactivity.sub * 0.16);
    this.tunnel.scale.set(tunnelScale, tunnelScale, 1);
    this.tunnel.position.z += ((-events.kick * 1.4 * motion) - this.tunnel.position.z) * 0.16;

    const targetZ = energy.smoothed * 7 * motion + events.drop * 4 * motion;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.065;
    this.camera.position.x += (((state.motion.flow - 0.45) * 0.9 * motion) - this.camera.position.x) * 0.05;
    this.camera.position.y += (((state.motion.pressure - 0.45) * 0.8 * motion) - this.camera.position.y) * 0.05;
    this.camera.fov += ((60 + events.kick * 4 * motion + events.drop * 7 * motion) - this.camera.fov) * 0.16;
    this.camera.updateProjectionMatrix();

    for (let i = 0; i < this.rings.children.length; i += 1) {
      const ring = this.rings.children[i] as THREE.Mesh;
      const phase = i / this.rings.children.length;
      ring.scale.setScalar(1 + motion * (reactivity.highMid * 0.12 + events.snare * 0.11 * (1 - phase)));
      ring.rotation.z += dt * motion * (0.04 + reactivity.mid * 0.14);
      if (this.options.palette === 'rainbow') {
        this.ringMaterials[i].color.setHSL((this.time * 0.025 + phase * 0.32 + 0.5) % 1, 0.9, 0.58);
        this.ringMaterials[i].emissive.setHSL((this.time * 0.02 + phase * 0.32 + 0.68) % 1, 0.76, 0.16);
      }
    }

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const speed = (2 + energy.smoothed * 16 + events.drop * 22) * motion;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += speed * dt;
      if (positions[i + 2] > 2) positions[i + 2] = -100;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    if (this.options.palette === 'rainbow') {
      const hue = (this.time * 0.02 + reactivity.high * 0.1) % 1;
      this.tunnelMaterial.color.setHSL((hue + 0.65) % 1, 0.7, 0.2);
      this.tunnelMaterial.emissive.setHSL((hue + 0.75) % 1, 0.72, 0.09 + events.drop * 0.08);
      this.particleMaterial.color.setHSL((hue + 0.92) % 1, 0.95, 0.66);
    }
    this.particleMaterial.opacity = 0.2 + reactivity.high * 0.34 + events.snare * 0.2;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    disposeScene(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
