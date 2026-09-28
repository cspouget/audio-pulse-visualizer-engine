import * as THREE from 'three';
import type { ReactiveState } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class LiquidEnvironment {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 1000);
  private readonly root = new THREE.Group();

  public readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

  private surface: THREE.Mesh;
  private surfaceGeometry: THREE.IcosahedronGeometry;
  private fluidPlane: THREE.Mesh;
  private ripples: THREE.Points;

  constructor() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new THREE.Color('#0a1628'));

    this.scene.add(this.root);
    this.camera.position.set(0, 3, 8);

    const ambientLight = new THREE.AmbientLight('#7db4ff', 1.2);
    const keyLight = new THREE.DirectionalLight('#a8d5ff', 1.8);
    keyLight.position.set(5, 6, 4);

    this.scene.add(ambientLight, keyLight);

    this.surfaceGeometry = new THREE.IcosahedronGeometry(2.4, 3);
    const surfaceMaterial = new THREE.MeshStandardMaterial({
      color: '#4db8e8',
      emissive: '#1a3a4d',
      metalness: 0.4,
      roughness: 0.24,
      transparent: true,
      opacity: 0.88,
    });

    this.surface = new THREE.Mesh(this.surfaceGeometry, surfaceMaterial);
    this.root.add(this.surface);

    const fluidGeometry = new THREE.PlaneGeometry(18, 18, 32, 32);
    const fluidMaterial = new THREE.MeshStandardMaterial({
      color: '#2ba8d8',
      emissive: '#0d2a3d',
      metalness: 0.35,
      roughness: 0.3,
      transparent: true,
      opacity: 0.65,
    });

    this.fluidPlane = new THREE.Mesh(fluidGeometry, fluidMaterial);
    this.fluidPlane.rotation.x = -Math.PI / 2.2;
    this.fluidPlane.position.y = -1.2;
    this.root.add(this.fluidPlane);

    const rippleGeometry = new THREE.BufferGeometry();
    const rippleCount = 400;
    const ripplePositions = new Float32Array(rippleCount * 3);
    for (let i = 0; i < rippleCount; i += 1) {
      ripplePositions[i * 3] = (Math.random() - 0.5) * 16;
      ripplePositions[i * 3 + 1] = -1 + Math.random() * 0.2;
      ripplePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    rippleGeometry.setAttribute('position', new THREE.BufferAttribute(ripplePositions, 3));
    const rippleMaterial = new THREE.PointsMaterial({
      color: '#b3e5fc',
      size: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    this.ripples = new THREE.Points(rippleGeometry, rippleMaterial);
    this.root.add(this.ripples);

    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(state: ReactiveState, dt: number) {
    const { reactivity, energy, motion, events } = state;

    this.surface.rotation.x += dt * (0.2 + reactivity.mid * 0.8);
    this.surface.rotation.y += dt * (0.4 + reactivity.bass * 1.2);
    this.surface.scale.setScalar(1 + reactivity.bass * 0.8 + motion.pressure * 0.6);
    this.surface.position.y = 0.2 + motion.impact * 1.4;

    this.fluidPlane.scale.setScalar(1 + reactivity.lowMid * 0.5 + motion.flow * 0.7);
    this.fluidPlane.rotation.z += dt * (0.08 + reactivity.mid * 0.3);
    this.fluidPlane.position.y = -1.2 + energy.smoothed * 0.6;

    this.ripples.rotation.y += dt * (0.12 + motion.shimmer * 0.4);
    this.ripples.position.y = -1 + events.transient * 0.8;

    const cameraDist = 8 - motion.impact * 1.2;
    this.camera.position.z += (cameraDist - this.camera.position.z) * 0.06;
    this.camera.position.x = motion.flow * 2.4;
    this.camera.position.y = 3 + motion.pressure * 0.8;
    this.camera.lookAt(0, 0.5, 0);

    this.renderer.render(this.scene, this.camera);
  }
}
