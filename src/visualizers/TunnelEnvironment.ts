import * as THREE from 'three';
import type { ReactiveState } from '../types';

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export class TunnelEnvironment {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  private readonly root = new THREE.Group();

  public readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

  private tunnel: THREE.Mesh;
  private rings: THREE.Group;
  private particles: THREE.Points;

  constructor() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new THREE.Color('#020408'));

    this.scene.add(this.root);
    this.camera.position.z = 0;

    const ambientLight = new THREE.AmbientLight('#5a8ac4', 0.9);
    const spotLight = new THREE.SpotLight('#7db4ff', 2.5);
    spotLight.position.set(0, 0, 20);
    spotLight.target.position.set(0, 0, -50);

    this.scene.add(ambientLight, spotLight, spotLight.target);

    const tunnelGeometry = new THREE.CylinderGeometry(3.2, 3.2, 100, 32, 32);
    const tunnelMaterial = new THREE.MeshStandardMaterial({
      color: '#1a3a5c',
      emissive: '#0d1f3d',
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    this.tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    this.tunnel.rotation.x = Math.PI / 2;
    this.root.add(this.tunnel);

    this.rings = new THREE.Group();
    for (let i = 0; i < 12; i += 1) {
      const ringGeometry = new THREE.TorusGeometry(3.2, 0.15, 16, 100);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: '#4db8e8',
        emissive: '#1a5a7a',
        metalness: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = i * -8;
      this.rings.add(ring);
    }
    this.root.add(this.rings);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.8 + Math.random() * 0.4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = Math.random() * -100;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: '#b3e5fc',
      size: 0.06,
      transparent: true,
      opacity: 0.6,
    });
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.root.add(this.particles);

    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(state: ReactiveState, dt: number) {
    const { reactivity, energy, motion, events } = state;

    const tunnelScale = 1 + reactivity.bass * 0.4 + reactivity.sub * 0.3;
    this.tunnel.scale.set(tunnelScale, tunnelScale, 1);
    this.tunnel.position.z = -motion.impact * 3.2;

    this.camera.position.z += (energy.smoothed * 15 + motion.impact * 2 - this.camera.position.z) * 0.08;
    this.camera.position.x = motion.flow * 1.2;
    this.camera.position.y = motion.pressure * 1.2;
    this.camera.fov = 60 + events.kick * 8;
    this.camera.updateProjectionMatrix();

    for (let i = 0; i < this.rings.children.length; i += 1) {
      const ring = this.rings.children[i] as THREE.Mesh;
      ring.scale.setScalar(1 + reactivity.highMid * 0.3 + motion.shimmer * 0.2);
      ring.rotation.z += dt * (0.1 + reactivity.mid * 0.2);
    }

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += energy.smoothed * 20 * dt + motion.impact * 5;
      if (positions[i + 2] > 0) {
        positions[i + 2] = -100;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}
